import { GoogleGenerativeAI } from "@google/generative-ai";
import { practiceSentenceSchema, pronunciationResultSchema, transcriptionResultSchema, pronunciationTipsResultSchema } from "./validation";
import { convertWebMToWAV } from "./audioConverter";

// Initialize Google AI with standard API key
// For local development, set GEMINI_API_KEY in your .env file
const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "";
console.log("🔑 Initializing Gemini AI with API key:", apiKey ? `Yes (length: ${apiKey.length})` : "NO KEY FOUND!");

if (!apiKey) {
  console.error("❌ No API key found! Please set GEMINI_API_KEY in your .env file");
}

const genAI = new GoogleGenerativeAI(apiKey);

// Google AI API supports these model names directly
// No mapping needed - use the names as-is

export async function generatePracticeSentence(
  language: "hindi" | "kannada",
  model: "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" = "gemini-2.5-flash"
): Promise<{
  originalScript: string;
  transliteration: string;
  tokenUsage: {
    textInputTokens: number;
    audioInputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}> {
  const languageName = language === "hindi" ? "Hindi" : "Kannada";
  const scriptName = language === "hindi" ? "Devanagari" : "Kannada";
  
  const prompt = `Generate a practice sentence in ${languageName} for language learners to practice pronunciation. 

IMPORTANT REQUIREMENTS:
- The sentence should be approximately 12-15 words long
- If a single sentence feels too short, create TWO related sentences to reach 12-15 words total
- Use natural, conversational language with common everyday vocabulary
- Include a variety of sounds to test pronunciation thoroughly
- Make it meaningful and contextual (not just random words)

Good topics: daily routines, family interactions, shopping, weather, travel, food, hobbies, or simple conversations.

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "originalScript": "sentence or two sentences in ${scriptName} script (12-15 words total)",
  "transliteration": "phonetic transliteration in English letters"
}

Example length: "I go to the market every morning to buy fresh vegetables and fruits for my family" (16 words - aim for similar length)`;

  try {
    console.log(`🤖 Generating sentence with model: ${model}`);

    const genModel = genAI.getGenerativeModel({ model: model });
    const result = await genModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      console.error("Empty response from Gemini AI");
      throw new Error("Empty response from AI");
    }

    // Extract JSON from response, handling potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Failed to find JSON in response:", text);
      throw new Error("Failed to parse response from AI");
    }

    const rawResult = JSON.parse(jsonMatch[0]);

    // Extract token usage for sentence generation
    const usageMetadata: any = result.response.usageMetadata; // Use 'any' as SDK types don't include new fields yet

    // Parse promptTokensDetails to get modality-specific breakdown
    const promptDetails = usageMetadata?.promptTokensDetails || [];
    const textInputTokens = promptDetails.find((d: any) => d.modality === 'TEXT')?.tokenCount || 0;
    const audioInputTokens = 0; // No audio for sentence generation

    // Output tokens include thinking tokens (as per Gemini pricing: "output price including thinking tokens")
    const candidatesTokens = usageMetadata?.candidatesTokenCount || 0;
    const thinkingTokens = usageMetadata?.thoughtsTokenCount || 0;
    const outputTokens = candidatesTokens + thinkingTokens;

    const totalTokens = usageMetadata?.totalTokenCount || 0;

    console.log(`🎫 Token usage for sentence generation:`);
    console.log(`   📝 Text input tokens: ${textInputTokens}`);
    console.log(`   📤 Output tokens: ${outputTokens} (candidates: ${candidatesTokens} + thinking: ${thinkingTokens})`);
    console.log(`   📊 Total tokens: ${totalTokens}`);

    // Validate with zod schema
    const validationResult = practiceSentenceSchema.safeParse(rawResult);
    if (!validationResult.success) {
      console.error("Invalid response structure:", rawResult, validationResult.error);
      throw new Error("Invalid response structure from AI");
    }

    return {
      ...validationResult.data,
      tokenUsage: {
        textInputTokens,
        audioInputTokens: 0, // No audio input for sentence generation
        outputTokens,
        totalTokens,
      },
    };
  } catch (error) {
    console.error("Error generating sentence:", error);
    throw error;
  }
}

export async function analyzePronunciation(
  audioBuffer: Buffer,
  referenceText: string,
  language: "hindi" | "kannada",
  model: "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" = "gemini-2.5-flash"
): Promise<{
  wordScores: Array<{ word: string; transliteration: string; score: number }>;
  simpleTips: string[];
  transcription: string;
  tokenUsage: {
    textInputTokens: number;
    audioInputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}> {
  const languageName = language === "hindi" ? "Hindi" : "Kannada";
  const scriptName = language === "hindi" ? "Devanagari" : "Kannada";

  const prompt = `You are a ${languageName} pronunciation coach. The student was supposed to say: "${referenceText}"

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
    "Easy-to-understand tip using everyday language and analogies (e.g., 'Try saying this sound like you're whispering the letter h before it')",
    "Another practical tip with simple examples anyone can follow"
  ]
}

For SIMPLE TIPS:
- Use everyday language and avoid technical terms like "aspirated", "retroflex", "dental" etc.
- Use comparisons to familiar English sounds or common experiences
- Give practical "how-to" instructions (e.g., "Put your tongue here...", "Breathe out like...")
- Use analogies (e.g., "like blowing out a candle", "like the 'a' in father")
- Focus on what to DO, not just what's wrong
- Be encouraging and supportive

Keep tips concise and actionable for learners who are just starting to learn the language.`;

  try {
    console.log(`🎙️ Starting pronunciation analysis with model: ${model}`);
    console.log(`📝 Reference text: "${referenceText}"`);
    console.log(`🌐 Language: ${languageName}`);
    console.log(`📊 Audio buffer size (WebM): ${audioBuffer.length} bytes`);
    
    // Convert WebM to WAV for better compatibility
    const wavBuffer = await convertWebMToWAV(audioBuffer);
    console.log(`🎵 Audio format: WAV (converted from WebM)`);
    console.log(`📊 WAV buffer size: ${wavBuffer.length} bytes`);
    
    const startTime = Date.now();

    // Use the model name directly
    console.log(`🤖 Using AI model: ${model}`);
    const genModel = genAI.getGenerativeModel({ model: model });

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
    console.log(`⏱️ API call completed in ${elapsedTime}ms`);

    const apiResponse = result.response;
    const text = apiResponse.text();

    // Extract token usage from Gemini API response
    const usageMetadata: any = apiResponse.usageMetadata; // Use 'any' as SDK types don't include new fields yet

    console.log(`📤 Response received (${text.length} characters)`);

    // Parse promptTokensDetails to get modality-specific breakdown
    const promptDetails = usageMetadata?.promptTokensDetails || [];
    const textInputTokens = promptDetails.find((d: any) => d.modality === 'TEXT')?.tokenCount || 0;
    const audioInputTokens = promptDetails.find((d: any) => d.modality === 'AUDIO')?.tokenCount || 0;

    // Output tokens include thinking tokens (as per Gemini pricing: "output price including thinking tokens")
    const candidatesTokens = usageMetadata?.candidatesTokenCount || 0;
    const thinkingTokens = usageMetadata?.thoughtsTokenCount || 0;
    const outputTokens = candidatesTokens + thinkingTokens;

    const totalTokens = usageMetadata?.totalTokenCount || 0;

    console.log(`🎫 Token usage for pronunciation analysis:`);
    console.log(`   📝 Text input tokens: ${textInputTokens}`);
    console.log(`   🎵 Audio input tokens: ${audioInputTokens}`);
    console.log(`   📤 Output tokens: ${outputTokens} (candidates: ${candidatesTokens} + thinking: ${thinkingTokens})`);
    console.log(`   📊 Total tokens: ${totalTokens}`);

    if (!text) {
      console.error("❌ Empty response from Gemini AI");
      throw new Error("Empty response from AI");
    }

    // Extract JSON from response, handling potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ Failed to find JSON in response. Full response:", text.substring(0, 500));
      throw new Error("Failed to parse pronunciation analysis");
    }

    const rawResult = JSON.parse(jsonMatch[0]);
    console.log(`✅ Successfully parsed JSON response`);

    // Validate with zod schema
    const validationResult = pronunciationResultSchema.safeParse(rawResult);
    if (!validationResult.success) {
      console.error("❌ Invalid response structure:", rawResult);
      console.error("Validation errors:", validationResult.error);
      throw new Error("Invalid response structure from AI");
    }

    console.log(`✅ Pronunciation analysis completed successfully with ${model}`);
    console.log(`📝 Transcription: "${validationResult.data.transcription}"`);

    return {
      ...validationResult.data,
      tokenUsage: {
        textInputTokens,
        audioInputTokens,
        outputTokens,
        totalTokens,
      },
    };
  } catch (error) {
    console.error(`❌ Error analyzing pronunciation with ${model}:`);
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    
    // Log full error object for debugging
    if (error instanceof Error && 'response' in error) {
      console.error("API Response error:", JSON.stringify(error, null, 2));
    }
    
    // Log stack trace for debugging
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }

    throw error;
  }
}

// Stage 1: Transcribe audio (new 2-stage architecture)
// This function only transcribes - Levenshtein will handle the scoring
export async function transcribeAudio(
  audioBuffer: Buffer,
  referenceText: string,
  language: "hindi" | "kannada"
): Promise<{
  transcription: string;
  transcriptionTransliteration: string;
  tokenUsage: {
    textInputTokens: number;
    audioInputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}> {
  const languageName = language === "hindi" ? "Hindi" : "Kannada";
  const scriptName = language === "hindi" ? "Devanagari" : "Kannada";

  const prompt = `You are a ${languageName} transcription expert. Listen to the audio and transcribe exactly what was spoken.

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

  try {
    console.log(`🎙️ Stage 1: Transcribing audio with Flash-Lite`);
    console.log(`📝 Reference text: "${referenceText}"`);
    console.log(`🌐 Language: ${languageName}`);

    // Convert WebM to WAV for better compatibility
    const wavBuffer = await convertWebMToWAV(audioBuffer);
    console.log(`🎵 Audio converted: ${audioBuffer.length} bytes WebM → ${wavBuffer.length} bytes WAV`);

    const startTime = Date.now();

    // Always use Flash-Lite for transcription (cost-effective)
    const model = "gemini-2.5-flash-lite";
    console.log(`🤖 Using model: ${model}`);
    const genModel = genAI.getGenerativeModel({ model });

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
    console.log(`⏱️ Transcription completed in ${elapsedTime}ms`);

    const apiResponse = result.response;
    const text = apiResponse.text();

    // Extract token usage
    const usageMetadata: any = apiResponse.usageMetadata;
    const promptDetails = usageMetadata?.promptTokensDetails || [];
    const textInputTokens = promptDetails.find((d: any) => d.modality === 'TEXT')?.tokenCount || 0;
    const audioInputTokens = promptDetails.find((d: any) => d.modality === 'AUDIO')?.tokenCount || 0;
    const candidatesTokens = usageMetadata?.candidatesTokenCount || 0;
    const thinkingTokens = usageMetadata?.thoughtsTokenCount || 0;
    const outputTokens = candidatesTokens + thinkingTokens;
    const totalTokens = usageMetadata?.totalTokenCount || 0;

    console.log(`🎫 Stage 1 Token usage:`);
    console.log(`   📝 Text input: ${textInputTokens}, 🎵 Audio input: ${audioInputTokens}`);
    console.log(`   📤 Output: ${outputTokens}, 📊 Total: ${totalTokens}`);

    if (!text) {
      throw new Error("Empty response from AI");
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ Failed to find JSON in response:", text.substring(0, 500));
      throw new Error("Failed to parse transcription");
    }

    const rawResult = JSON.parse(jsonMatch[0]);

    // Validate with zod schema
    const validationResult = transcriptionResultSchema.safeParse(rawResult);
    if (!validationResult.success) {
      console.error("❌ Invalid transcription structure:", rawResult);
      console.error("Validation errors:", validationResult.error);
      throw new Error("Invalid transcription structure from AI");
    }

    console.log(`✅ Transcription: "${validationResult.data.transcription}"`);
    console.log(`✅ Transliteration: "${validationResult.data.transcriptionTransliteration}"`);

    return {
      ...validationResult.data,
      tokenUsage: {
        textInputTokens,
        audioInputTokens,
        outputTokens,
        totalTokens,
      },
    };
  } catch (error) {
    console.error(`❌ Error in transcription:`, error);
    throw error;
  }
}

// Stage 2: Get pronunciation tips for problem words (text-only, no audio cost)
export async function getPronunciationTips(
  problemWords: Array<{ word: string; transliteration: string; spokenWord: string; score: number }>,
  language: "hindi" | "kannada"
): Promise<{
  tips: Array<{ word: string; transliteration: string; tip: string }>;
  tokenUsage: {
    textInputTokens: number;
    audioInputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}> {
  const languageName = language === "hindi" ? "Hindi" : "Kannada";

  // Format the problem words for the prompt
  const problemWordsList = problemWords.map(pw =>
    `- "${pw.word}" (${pw.transliteration}): spoken as "${pw.spokenWord}", score: ${pw.score}%`
  ).join('\n');

  const prompt = `You are a ${languageName} pronunciation coach. The student needs help with these words they struggled to pronounce correctly:

${problemWordsList}

For each word, provide a SIMPLE, practical tip to help them improve. Use everyday language - avoid technical terms like "aspirated", "retroflex", "dental".

Return ONLY a JSON object (no markdown, no code blocks) with this structure:
{
  "tips": [
    {
      "word": "word in original script",
      "transliteration": "word in English letters",
      "tip": "Simple, actionable pronunciation tip using everyday language"
    }
  ]
}

Guidelines for tips:
- Use comparisons to familiar English sounds
- Give "how-to" instructions (e.g., "Put your tongue...", "Breathe out like...")
- Use analogies (e.g., "like blowing out a candle")
- Focus on what to DO, not just what's wrong
- Keep each tip to 1-2 sentences
- Be encouraging`;

  try {
    console.log(`💡 Stage 2: Getting pronunciation tips for ${problemWords.length} problem words`);

    const startTime = Date.now();

    // Use Flash-Lite for tips (text-only, very affordable)
    const model = "gemini-2.5-flash-lite";
    console.log(`🤖 Using model: ${model}`);
    const genModel = genAI.getGenerativeModel({ model });

    const result = await genModel.generateContent(prompt);

    const elapsedTime = Date.now() - startTime;
    console.log(`⏱️ Tips generated in ${elapsedTime}ms`);

    const apiResponse = result.response;
    const text = apiResponse.text();

    // Extract token usage
    const usageMetadata: any = apiResponse.usageMetadata;
    const promptDetails = usageMetadata?.promptTokensDetails || [];
    const textInputTokens = promptDetails.find((d: any) => d.modality === 'TEXT')?.tokenCount || 0;
    const audioInputTokens = 0; // No audio for tips
    const candidatesTokens = usageMetadata?.candidatesTokenCount || 0;
    const thinkingTokens = usageMetadata?.thoughtsTokenCount || 0;
    const outputTokens = candidatesTokens + thinkingTokens;
    const totalTokens = usageMetadata?.totalTokenCount || 0;

    console.log(`🎫 Stage 2 Token usage:`);
    console.log(`   📝 Text input: ${textInputTokens}, 📤 Output: ${outputTokens}, 📊 Total: ${totalTokens}`);

    if (!text) {
      throw new Error("Empty response from AI");
    }

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("❌ Failed to find JSON in response:", text.substring(0, 500));
      throw new Error("Failed to parse tips");
    }

    const rawResult = JSON.parse(jsonMatch[0]);

    // Validate with zod schema
    const validationResult = pronunciationTipsResultSchema.safeParse(rawResult);
    if (!validationResult.success) {
      console.error("❌ Invalid tips structure:", rawResult);
      console.error("Validation errors:", validationResult.error);
      throw new Error("Invalid tips structure from AI");
    }

    console.log(`✅ Generated ${validationResult.data.tips.length} tips`);

    return {
      ...validationResult.data,
      tokenUsage: {
        textInputTokens,
        audioInputTokens,
        outputTokens,
        totalTokens,
      },
    };
  } catch (error) {
    console.error(`❌ Error generating tips:`, error);
    throw error;
  }
}
