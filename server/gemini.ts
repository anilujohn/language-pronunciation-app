import { GoogleGenerativeAI } from "@google/generative-ai";
import { practiceSentenceSchema, pronunciationResultSchema } from "./validation";
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
): Promise<{ originalScript: string; transliteration: string }> {
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
    
    // Validate with zod schema
    const validationResult = practiceSentenceSchema.safeParse(rawResult);
    if (!validationResult.success) {
      console.error("Invalid response structure:", rawResult, validationResult.error);
      throw new Error("Invalid response structure from AI");
    }

    return validationResult.data;
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
): Promise<{ wordScores: Array<{ word: string; transliteration: string; score: number }>; simpleTips: string[]; detailedFeedback: string[] }> {
  const languageName = language === "hindi" ? "Hindi" : "Kannada";
  
  const prompt = `You are a ${languageName} pronunciation coach. The student was supposed to say: "${referenceText}"

Listen to the audio recording and analyze their pronunciation. For each word, provide:
1. A pronunciation accuracy score from 0-100
2. TWO types of feedback:
   - SIMPLE TIPS: Plain language explanations that anyone can understand, using everyday comparisons and examples
   - DETAILED FEEDBACK: Technical linguistic analysis for advanced learners

Return ONLY a JSON object (no markdown, no code blocks) with this structure:
{
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
  ],
  "detailedFeedback": [
    "Technical linguistic analysis (e.g., aspirated consonants, vowel length, retroflex sounds)",
    "Another detailed technical tip for advanced learners"
  ]
}

For SIMPLE TIPS:
- Use everyday language and avoid technical terms like "aspirated", "retroflex", "dental" etc.
- Use comparisons to familiar English sounds or common experiences
- Give practical "how-to" instructions (e.g., "Put your tongue here...", "Breathe out like...")
- Use analogies (e.g., "like blowing out a candle", "like the 'a' in father")
- Focus on what to DO, not just what's wrong

For DETAILED FEEDBACK:
- Use proper linguistic terminology
- Reference specific phonetic features (aspiration, retroflex articulation, vowel length, nasalization, etc.)
- Analyze common challenges for English speakers learning ${languageName}
- Provide technical accuracy for learners who want deeper understanding

Be encouraging in both versions. Make sure both sets of tips are helpful but targeted to different audiences.`;

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
    console.log(`📤 Response received (${text.length} characters)`);

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
    return validationResult.data;
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
