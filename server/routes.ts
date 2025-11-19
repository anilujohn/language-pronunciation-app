import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generatePracticeSentence, analyzePronunciation, transcribeAudio, getPronunciationTips } from "./gemini";
import { calculateLevenshteinScores } from "./levenshteinAnalysis";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate a new practice sentence
  app.post("/api/sentences/generate", async (req, res) => {
    try {
      const { language, model } = req.body;

      if (!language || (language !== "hindi" && language !== "kannada")) {
        return res.status(400).json({ error: "Invalid language. Must be 'hindi' or 'kannada'" });
      }

      // Validate and default the model
      const validModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
      const selectedModel = model && validModels.includes(model) ? model : "gemini-2.5-flash";

      console.log(`📝 Generating sentence - Language: ${language}, Model: ${selectedModel}`);

      const sentence = await generatePracticeSentence(language, selectedModel);
      res.json(sentence);
    } catch (error: any) {
      console.error("Error generating sentence:", error);
      res.status(500).json({ error: "Failed to generate sentence" });
    }
  });

  // NEW: Analyze pronunciation with 2-stage cost-effective approach
  // Stage 1: Transcribe audio with Flash-Lite
  // Stage 2: Levenshtein scoring (local computation, no API cost)
  // Stage 3: Get tips for problem words (<70% score) with Flash-Lite (text-only)
  app.post("/api/pronunciation/analyze-v2", upload.single("audio"), async (req, res) => {
    try {
      console.log(`📥 Received v2 analysis request (2-stage approach)`);

      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { referenceText, transliteration, language } = req.body;

      if (!referenceText || !language || !transliteration) {
        return res.status(400).json({ error: "Missing referenceText, transliteration, or language" });
      }

      if (language !== "hindi" && language !== "kannada") {
        return res.status(400).json({ error: "Invalid language. Must be 'hindi' or 'kannada'" });
      }

      console.log(`✅ Starting 2-stage analysis:`);
      console.log(`   Language: ${language}`);
      console.log(`   Audio file size: ${req.file.buffer.length} bytes`);
      console.log(`   Reference text: "${referenceText.substring(0, 50)}..."`);

      const audioBuffer = req.file.buffer;

      // Save audio file for testing purposes
      const testAudioPath = path.join(__dirname, "test-audio.webm");
      fs.writeFileSync(testAudioPath, audioBuffer);
      console.log(`💾 Saved test audio to: ${testAudioPath}`);

      // Stage 1: Transcribe audio with Flash-Lite
      console.log(`\n🎙️ === STAGE 1: TRANSCRIPTION ===`);
      const stage1Start = Date.now();
      const transcriptionResult = await transcribeAudio(audioBuffer, referenceText, language);
      const stage1Time = Date.now() - stage1Start;
      console.log(`⏱️ Stage 1 completed in ${stage1Time}ms`);

      // Stage 2: Levenshtein scoring (local computation)
      console.log(`\n📊 === STAGE 2: LEVENSHTEIN SCORING ===`);
      const stage2Start = Date.now();
      const levenshteinResult = calculateLevenshteinScores(
        transcriptionResult.transcription,
        referenceText
      );
      const stage2Time = Date.now() - stage2Start;
      console.log(`⏱️ Stage 2 completed in ${stage2Time}ms (local computation, no API cost)`);

      // Build word scores using original transliteration from sentence generation
      // Split both native script and transliteration into words and pair them
      const nativeWords = referenceText
        .normalize('NFC')
        .replace(/[।,\.!?;:\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0);

      const translitWords = transliteration
        .replace(/[,\.!?;:\-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(/\s+/)
        .filter((w: string) => w.length > 0);

      // Create arrays for direct index lookup (more reliable than Map with Unicode)
      const nativeWordsNormalized = nativeWords.map(w => w.normalize('NFC').toLowerCase());

      const wordScores = levenshteinResult.wordScores.map(ws => {
        // For extra/missing markers, keep as-is
        let transliterationDisplay: string;
        if (ws.word === "(extra)") {
          transliterationDisplay = ws.word;
        } else {
          // Find the index of this word in the reference
          const normalizedWord = ws.word.normalize('NFC').toLowerCase();
          const wordIndex = nativeWordsNormalized.indexOf(normalizedWord);

          if (wordIndex !== -1 && translitWords[wordIndex]) {
            transliterationDisplay = translitWords[wordIndex];
          } else {
            // Fallback: try to find a partial match or use the native word
            transliterationDisplay = ws.word;
          }
        }
        return {
          word: ws.word,
          transliteration: transliterationDisplay,
          transcribedWord: ws.transcribedWord,
          score: ws.score
        };
      });

      // Identify problem words (score < 70%)
      const problemWords = wordScores
        .filter(ws => ws.score < 70 && ws.word !== "(extra)")
        .map(ws => ({
          word: ws.word,
          transliteration: ws.transliteration,
          spokenWord: ws.transcribedWord,
          score: ws.score
        }));

      // Stage 3: Get tips for problem words (text-only, no audio cost)
      let tipsResult = { tips: [] as Array<{ word: string; transliteration: string; tip: string }>, tokenUsage: { textInputTokens: 0, audioInputTokens: 0, outputTokens: 0, totalTokens: 0 } };
      let stage3Time = 0;

      if (problemWords.length > 0) {
        console.log(`\n💡 === STAGE 3: PRONUNCIATION TIPS ===`);
        console.log(`   ${problemWords.length} problem words identified`);
        const stage3Start = Date.now();
        tipsResult = await getPronunciationTips(problemWords, language);
        stage3Time = Date.now() - stage3Start;
        console.log(`⏱️ Stage 3 completed in ${stage3Time}ms`);
      } else {
        console.log(`\n💡 === STAGE 3: SKIPPED (no problem words) ===`);
      }

      // Calculate total cost breakdown
      const totalTime = stage1Time + stage2Time + stage3Time;

      console.log(`\n✅ === ANALYSIS COMPLETE ===`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Overall score: ${levenshteinResult.overallScore}%`);

      // Return structured response
      res.json({
        // Transcription results
        transcription: transcriptionResult.transcription,
        transcriptionTransliteration: transcriptionResult.transcriptionTransliteration,

        // Word-level scores with color coding data
        wordScores,
        overallScore: levenshteinResult.overallScore,

        // Tips for problem words
        tips: tipsResult.tips,

        // Timing
        timing: {
          stage1: stage1Time,
          stage2: stage2Time,
          stage3: stage3Time,
          total: totalTime
        },

        // Cost breakdown by stage
        costBreakdown: {
          stage1: {
            name: "Transcription (with audio)",
            tokenUsage: transcriptionResult.tokenUsage
          },
          stage2: {
            name: "Levenshtein Scoring (local)",
            tokenUsage: { textInputTokens: 0, audioInputTokens: 0, outputTokens: 0, totalTokens: 0 }
          },
          stage3: {
            name: "Pronunciation Tips (text-only)",
            tokenUsage: tipsResult.tokenUsage
          },
          total: {
            textInputTokens: transcriptionResult.tokenUsage.textInputTokens + tipsResult.tokenUsage.textInputTokens,
            audioInputTokens: transcriptionResult.tokenUsage.audioInputTokens,
            outputTokens: transcriptionResult.tokenUsage.outputTokens + tipsResult.tokenUsage.outputTokens,
            totalTokens: transcriptionResult.tokenUsage.totalTokens + tipsResult.tokenUsage.totalTokens
          }
        }
      });
    } catch (error: any) {
      console.error("❌ Error in /api/pronunciation/analyze-v2 endpoint:");
      console.error("   Error name:", error.name);
      console.error("   Error message:", error.message);
      res.status(500).json({
        error: "Failed to analyze pronunciation",
        details: error.message
      });
    }
  });

  // DEPRECATED: Analyze pronunciation using ALL models in parallel
  // This endpoint runs all 3 Gemini models simultaneously and returns all results
  app.post("/api/pronunciation/analyze-all-models", upload.single("audio"), async (req, res) => {
    try {
      console.log(`📥 Received parallel analysis request`);
      console.log(`   Has file: ${!!req.file}`);
      console.log(`   Body keys: ${Object.keys(req.body).join(', ')}`);

      if (!req.file) {
        console.log(`❌ No audio file provided`);
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { referenceText, language } = req.body;

      if (!referenceText || !language) {
        console.log(`❌ Missing required fields - referenceText: ${!!referenceText}, language: ${!!language}`);
        return res.status(400).json({ error: "Missing referenceText or language" });
      }

      if (language !== "hindi" && language !== "kannada") {
        console.log(`❌ Invalid language: ${language}`);
        return res.status(400).json({ error: "Invalid language. Must be 'hindi' or 'kannada'" });
      }

      console.log(`✅ Running parallel analysis with ALL models:`);
      console.log(`   Language: ${language}`);
      console.log(`   Audio file size: ${req.file.buffer.length} bytes`);
      console.log(`   Reference text: "${referenceText.substring(0, 50)}..."`);

      const audioBuffer = req.file.buffer;

      // Track time for each analysis
      const startTimes = {
        flashLite: Date.now(),
        flash: Date.now(),
        pro: Date.now(),
      };

      // Run all 3 Gemini models in parallel
      console.log(`🚀 Starting parallel analysis with all 3 models...`);
      const [flashLiteResult, flashResult, proResult] = await Promise.all([
        analyzePronunciation(audioBuffer, referenceText, language, "gemini-2.5-flash-lite")
          .then(result => {
            const elapsed = Date.now() - startTimes.flashLite;
            console.log(`✅ Flash-Lite completed in ${elapsed}ms`);
            return { ...result, timeMs: elapsed };
          }),
        analyzePronunciation(audioBuffer, referenceText, language, "gemini-2.5-flash")
          .then(result => {
            const elapsed = Date.now() - startTimes.flash;
            console.log(`✅ Flash completed in ${elapsed}ms`);
            return { ...result, timeMs: elapsed };
          }),
        analyzePronunciation(audioBuffer, referenceText, language, "gemini-2.5-pro")
          .then(result => {
            const elapsed = Date.now() - startTimes.pro;
            console.log(`✅ Pro completed in ${elapsed}ms`);
            return { ...result, timeMs: elapsed };
          }),
      ]);

      console.log(`✅ All models completed successfully`);

      // Calculate Levenshtein using Flash transcription (middle-ground quality)
      const levenshteinStart = Date.now();
      const levenshteinResult = calculateLevenshteinScores(
        flashResult.transcription,
        referenceText
      );
      const levenshteinTime = Date.now() - levenshteinStart;
      console.log(`✅ Levenshtein completed in ${levenshteinTime}ms (local computation)`);

      // Return all results
      res.json({
        flashLite: {
          wordScores: flashLiteResult.wordScores,
          simpleTips: flashLiteResult.simpleTips,
          tokenUsage: flashLiteResult.tokenUsage,
          timeMs: flashLiteResult.timeMs,
        },
        flash: {
          wordScores: flashResult.wordScores,
          simpleTips: flashResult.simpleTips,
          tokenUsage: flashResult.tokenUsage,
          timeMs: flashResult.timeMs,
        },
        pro: {
          wordScores: proResult.wordScores,
          simpleTips: proResult.simpleTips,
          tokenUsage: proResult.tokenUsage,
          timeMs: proResult.timeMs,
        },
        levenshtein: {
          ...levenshteinResult,
          timeMs: levenshteinTime,
        },
      });
    } catch (error: any) {
      console.error("❌ Error in /api/pronunciation/analyze-all-models endpoint:");
      console.error("   Error name:", error.name);
      console.error("   Error message:", error.message);

      if (error.response) {
        console.error("   API Response:", error.response);
      }
      if (error.code) {
        console.error("   Error code:", error.code);
      }

      res.status(500).json({
        error: "Failed to analyze pronunciation with all models",
        details: error.message
      });
    }
  });

  // Analyze pronunciation from audio recording
  // This endpoint makes ONE Gemini API call and returns BOTH analyses:
  // 1. AI-powered pronunciation analysis with feedback
  // 2. Levenshtein distance-based analysis (using transcription from #1)
  app.post("/api/pronunciation/analyze", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { referenceText, language, model } = req.body;

      if (!referenceText || !language) {
        return res.status(400).json({ error: "Missing referenceText or language" });
      }

      if (language !== "hindi" && language !== "kannada") {
        return res.status(400).json({ error: "Invalid language. Must be 'hindi' or 'kannada'" });
      }

      // Validate and default the model
      const validModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
      const selectedModel = model && validModels.includes(model) ? model : "gemini-2.5-flash";

      console.log(`📥 Received pronunciation analysis request:`);
      console.log(`   Model requested: ${model || 'not specified'}`);
      console.log(`   Model selected: ${selectedModel}`);
      console.log(`   Language: ${language}`);
      console.log(`   Audio file size: ${req.file.buffer.length} bytes`);

      // Single API call gets both pronunciation analysis AND transcription
      const aiResult = await analyzePronunciation(
        req.file.buffer,
        referenceText,
        language,
        selectedModel
      );

      console.log(`✅ Successfully analyzed pronunciation with ${selectedModel}`);

      // Use the transcription from AI analysis for Levenshtein calculation (local, no API call)
      const levenshteinResult = calculateLevenshteinScores(
        aiResult.transcription,
        referenceText
      );

      // Return both results
      res.json({
        // AI-powered analysis
        wordScores: aiResult.wordScores,
        simpleTips: aiResult.simpleTips,
        tokenUsage: aiResult.tokenUsage,

        // Levenshtein analysis (computed locally from the same transcription)
        levenshteinAnalysis: levenshteinResult
      });
    } catch (error: any) {
      console.error("❌ Error in /api/pronunciation/analyze endpoint:");
      console.error("   Error name:", error.name);
      console.error("   Error message:", error.message);

      // Log additional error details if available
      if (error.response) {
        console.error("   API Response:", error.response);
      }
      if (error.code) {
        console.error("   Error code:", error.code);
      }

      res.status(500).json({
        error: "Failed to analyze pronunciation",
        details: error.message
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
