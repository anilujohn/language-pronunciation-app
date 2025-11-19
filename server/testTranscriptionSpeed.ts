import { GoogleGenerativeAI } from "@google/generative-ai";
import { convertWebMToWAV } from "./audioConverter";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Load environment variables
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Test reference text
const referenceText = "आज सुबह मैंने गरम चाय और बिस्कुट खाए।";
const language = "hindi";
const languageName = "Hindi";
const scriptName = "Devanagari";

// OLD PROMPT (full analysis with word scores and tips)
const oldPrompt = `You are a ${languageName} pronunciation coach. The student was supposed to say: "${referenceText}"

Listen to the audio recording and analyze their pronunciation. For each word, provide:
1. A pronunciation accuracy score from 0-100
2. SIMPLE TIPS: Plain language explanations that anyone can understand, using everyday comparisons and examples
3. TRANSCRIPTION: What you actually heard the student say (word-for-word in ${scriptName} script)

Return ONLY a JSON object (no markdown, no code blocks) with this structure:
{
  "transcription": "what you heard in ${scriptName} script",
  "wordScores": [
    {
      "word": "word in original script",
      "transliteration": "word in English letters",
      "score": 85
    }
  ],
  "simpleTips": [
    "Easy-to-understand tip using everyday language and analogies",
    "Another practical tip with simple examples"
  ]
}

For SIMPLE TIPS:
- Use everyday language and avoid technical terms like "aspirated", "retroflex", "dental" etc.
- Use comparisons to familiar English sounds or common experiences
- Give practical "how-to" instructions
- Use analogies
- Focus on what to DO, not just what's wrong
- Be encouraging and supportive

Keep tips concise and actionable for learners who are just starting to learn the language.`;

// NEW PROMPT (simplified transcription only)
const newPrompt = `You are a ${languageName} transcription expert. Listen to the audio and transcribe exactly what was spoken.

The student was supposed to say: "${referenceText}"

Your task:
1. Transcribe exactly what you heard in ${scriptName} script
2. Provide the transliteration (English letters) of what you heard

Return ONLY a JSON object (no markdown, no code blocks) with this structure:
{
  "transcription": "what you heard in ${scriptName} script",
  "transcriptionTransliteration": "what you heard in English letters"
}

Important:
- Transcribe EXACTLY what was spoken, even if it differs from the reference
- Use accurate phonetic transliteration`;

async function testWithPrompt(promptName: string, prompt: string, wavBuffer: Buffer): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${promptName}`);
  console.log(`${"=".repeat(60)}`);

  const model = "gemini-2.5-flash-lite";
  const genModel = genAI.getGenerativeModel({ model });

  const startTime = Date.now();

  try {
    const result = await genModel.generateContent([
      prompt,
      {
        inlineData: {
          data: wavBuffer.toString("base64"),
          mimeType: "audio/wav",
        },
      },
    ]);

    const elapsedTime = Date.now() - startTime;
    const response = result.response;
    const text = response.text();

    // Extract token usage
    const usageMetadata: any = response.usageMetadata;
    const promptDetails = usageMetadata?.promptTokensDetails || [];
    const textInputTokens = promptDetails.find((d: any) => d.modality === 'TEXT')?.tokenCount || 0;
    const audioInputTokens = promptDetails.find((d: any) => d.modality === 'AUDIO')?.tokenCount || 0;
    const candidatesTokens = usageMetadata?.candidatesTokenCount || 0;
    const thinkingTokens = usageMetadata?.thoughtsTokenCount || 0;
    const outputTokens = candidatesTokens + thinkingTokens;
    const totalTokens = usageMetadata?.totalTokenCount || 0;

    console.log(`\n⏱️  Time: ${elapsedTime}ms`);
    console.log(`📊 Tokens:`);
    console.log(`   Text input: ${textInputTokens}`);
    console.log(`   Audio input: ${audioInputTokens}`);
    console.log(`   Output: ${outputTokens} (candidates: ${candidatesTokens}, thinking: ${thinkingTokens})`);
    console.log(`   Total: ${totalTokens}`);
    console.log(`\n📝 Response length: ${text.length} characters`);

    // Parse and show transcription
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log(`✅ Transcription: "${parsed.transcription}"`);
    }

  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log("🔬 Transcription Speed Test");
  console.log("Comparing OLD (full analysis) vs NEW (transcription only) prompts\n");

  // Check for test audio file
  const testAudioPath = path.join(__dirname, "test-audio.webm");

  if (!fs.existsSync(testAudioPath)) {
    console.log("⚠️  No test audio file found at:", testAudioPath);
    console.log("\nTo run this test:");
    console.log("1. Record audio in the app");
    console.log("2. Save the WebM file as server/test-audio.webm");
    console.log("3. Run: npx tsx server/testTranscriptionSpeed.ts");

    // Create a dummy test with minimal audio
    console.log("\n🔄 Running test with minimal placeholder (results won't be meaningful)...\n");

    // Create a tiny WAV buffer for testing
    const dummyWav = Buffer.alloc(1000);

    // Test both prompts
    await testWithPrompt("OLD PROMPT (full analysis)", oldPrompt, dummyWav);
    await testWithPrompt("NEW PROMPT (transcription only)", newPrompt, dummyWav);

    return;
  }

  // Load and convert audio
  console.log("📂 Loading test audio...");
  const webmBuffer = fs.readFileSync(testAudioPath);
  console.log(`   WebM size: ${webmBuffer.length} bytes`);

  console.log("🔄 Converting to WAV...");
  const wavBuffer = await convertWebMToWAV(webmBuffer);
  console.log(`   WAV size: ${wavBuffer.length} bytes`);

  // Run tests
  console.log("\n🚀 Starting comparison tests...");

  // Test 1: Old prompt
  await testWithPrompt("OLD PROMPT (full analysis)", oldPrompt, wavBuffer);

  // Wait a bit between tests
  console.log("\n⏳ Waiting 2 seconds before next test...");
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: New prompt
  await testWithPrompt("NEW PROMPT (transcription only)", newPrompt, wavBuffer);

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("TEST COMPLETE");
  console.log(`${"=".repeat(60)}`);
}

main().catch(console.error);
