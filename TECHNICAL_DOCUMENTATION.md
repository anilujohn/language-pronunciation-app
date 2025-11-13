# Pronunciation Evaluation App - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Frontend-Backend Interaction](#frontend-backend-interaction)
5. [Business Logic Distribution](#business-logic-distribution)
6. [Pronunciation Assessment System](#pronunciation-assessment-system)
7. [AI Model Selection](#ai-model-selection)

---

## Architecture Overview

This is a full-stack TypeScript application built with React (frontend) and Express.js (backend), designed to help users practice and improve their pronunciation in Hindi and Kannada languages.

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool and dev server)
- shadcn/ui components (Radix UI + Tailwind CSS)
- React Query for state management
- Wouter for routing

**Backend:**
- Express.js with TypeScript
- Google Gemini AI (via Replit AI Integrations)
- Multer for file uploads
- Zod for validation

**Browser APIs:**
- Web Audio API (MediaRecorder) for audio recording
- Web Speech API (SpeechSynthesis) for text-to-speech

---

## Frontend Architecture

### Component Structure

The frontend follows a component-based architecture with clear separation of concerns:

```
client/src/
├── pages/
│   └── home.tsx                    # Main application page
├── components/
│   ├── LanguageSelector.tsx        # Language toggle (Hindi/Kannada)
│   ├── ModelSelector.tsx           # AI model selection (NEW)
│   ├── SentenceDisplay.tsx         # Shows practice sentence
│   ├── AudioControls.tsx           # Listen/Record buttons
│   ├── PronunciationResults.tsx    # Word scores display
│   ├── FeedbackSection.tsx         # Dual feedback display (simple + detailed)
│   └── LoadingSpinner.tsx          # Loading states
└── lib/
    ├── audioRecorder.ts            # Audio recording logic
    ├── speechSynthesis.ts          # Text-to-speech logic
    └── queryClient.ts              # React Query configuration
```

### State Management

The main application state is managed in `client/src/pages/home.tsx`:

```typescript
export default function Home() {
  const [language, setLanguage] = useState<Language>("hindi");
  const [currentSentence, setCurrentSentence] = useState<PracticeSentence | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);
  const [wordScores, setWordScores] = useState<WordScore[]>([]);
  const [feedback, setFeedback] = useState<string[]>([]);
  // ...
}
```

**State Variables:**
- `language`: Current selected language (hindi/kannada)
- `currentSentence`: The practice sentence data (original script + transliteration)
- `isPlaying`: Whether text-to-speech is currently playing
- `isRecording`: Whether the microphone is recording
- `isProcessing`: Whether pronunciation analysis is in progress
- `isLoadingSentence`: Whether a new sentence is being fetched
- `wordScores`: Array of word-level pronunciation scores
- `feedback`: Array of coaching tips from AI

### Audio Recording System

**File:** `client/src/lib/audioRecorder.ts`

The `AudioRecorder` class wraps the Web Audio API's MediaRecorder:

```typescript
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async startRecording(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);
    this.audioChunks = [];

    this.mediaRecorder.ondataavailable = (event) => {
      this.audioChunks.push(event.data);
    };

    this.mediaRecorder.start();
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error("Recording not started");
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: "audio/webm" });
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
      // Stop all tracks to release microphone
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    });
  }
}
```

**Key Features:**
- Requests microphone access via `getUserMedia()`
- Records audio in WebM format (browser native)
- Collects audio chunks in memory
- Returns audio as Blob when stopped
- Properly releases microphone resources

### Text-to-Speech System

**File:** `client/src/lib/speechSynthesis.ts`

The `SpeechSynthesizer` class wraps the Web Speech API:

```typescript
export class SpeechSynthesizer {
  speak(text: string, language: "hindi" | "kannada"): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "hindi" ? "hi-IN" : "kn-IN";
      utterance.rate = 0.85; // Slower for learning

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(event.error);

      window.speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    window.speechSynthesis.cancel();
  }
}
```

**Key Features:**
- Uses browser's native TTS engine
- Configures language-specific voice (hi-IN for Hindi, kn-IN for Kannada)
- Slower speech rate (0.85x) for better comprehension
- Promise-based API for easy async handling

---

## Backend Architecture

### API Endpoints

**File:** `server/routes.ts`

The backend exposes two main REST endpoints:

```typescript
export function registerRoutes(app: Express) {
  // Generate practice sentence
  app.post("/api/sentences/generate", async (req, res) => {
    try {
      const { language } = req.body;
      
      if (!language || !["hindi", "kannada"].includes(language)) {
        return res.status(400).json({ 
          error: "Invalid language. Must be 'hindi' or 'kannada'" 
        });
      }

      const sentence = await generatePracticeSentence(language);
      res.json(sentence);
    } catch (error) {
      console.error("Error generating sentence:", error);
      res.status(500).json({ error: "Failed to generate sentence" });
    }
  });

  // Analyze pronunciation
  app.post(
    "/api/pronunciation/analyze",
    upload.single("audio"),
    async (req, res) => {
      try {
        const audioFile = req.file;
        const { referenceText, language } = req.body;

        if (!audioFile || !referenceText || !language) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await analyzePronunciation(
          audioFile.buffer,
          referenceText,
          language
        );
        
        res.json(result);
      } catch (error) {
        console.error("Error analyzing pronunciation:", error);
        res.status(500).json({ error: "Failed to analyze pronunciation" });
      }
    }
  );
}
```

**Endpoint 1: POST /api/sentences/generate**
- **Input:** `{ language: "hindi" | "kannada" }`
- **Output:** `{ originalScript: string, transliteration: string }`
- **Purpose:** Generates a new practice sentence using Gemini AI

**Endpoint 2: POST /api/pronunciation/analyze**
- **Input:** FormData with audio file, referenceText, and language
- **Output:** `{ wordScores: WordScore[], feedback: string[] }`
- **Purpose:** Analyzes recorded audio and provides pronunciation feedback

### File Upload Handling

**File:** `server/routes.ts`

```typescript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});
```

Multer is configured to:
- Store files in memory (not disk) as buffers
- Limit file size to 10MB
- Only accept audio files

### Schema Validation

**File:** `server/validation.ts`

All API responses are validated using Zod schemas:

```typescript
import { z } from "zod";

// Schema for practice sentence generation
export const practiceSentenceSchema = z.object({
  originalScript: z.string().min(1, "Original script is required"),
  transliteration: z.string().min(1, "Transliteration is required"),
});

// Schema for word score
export const wordScoreSchema = z.object({
  word: z.string().min(1),
  transliteration: z.string().min(1),
  score: z.number().min(0).max(100),
});

// Schema for pronunciation analysis result
export const pronunciationResultSchema = z.object({
  wordScores: z.array(wordScoreSchema).min(1),
  feedback: z.array(z.string()).min(1),
});
```

This ensures type safety and prevents malformed AI responses from breaking the app.

---

## Frontend-Backend Interaction

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Language    │───>│   Sentence   │───>│    Audio     │  │
│  │  Selection   │    │   Display    │    │   Controls   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │         │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          │ POST              │ TTS (Browser)      │ POST
          │ /generate         │                    │ /analyze
          ↓                    │                    ↓
┌─────────────────────────────────────────────────────────────┐
│                         Backend                              │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Gemini AI  │<───│   Sentence   │    │ Pronunciation│  │
│  │  Integration │    │  Generation  │    │   Analysis   │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │         │
│         │                    │                    │         │
│         └────────────────────┴────────────────────┘         │
│                     AI Processing                            │
└─────────────────────────────────────────────────────────────┘
```

### Interaction Flow 1: Generate New Sentence

**Frontend Code:** `client/src/pages/home.tsx`

```typescript
const loadNewSentence = async (languageToUse?: Language) => {
  const targetLanguage = languageToUse || language;
  setIsLoadingSentence(true);
  setWordScores([]);
  setFeedback([]);
  
  try {
    const response = await fetch("/api/sentences/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: targetLanguage }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate sentence");
    }

    const sentence = await response.json();
    setCurrentSentence(sentence);
  } catch (error) {
    console.error("Error loading sentence:", error);
    
    // Fallback sentences if API fails
    const fallbackSentences = {
      hindi: {
        originalScript: "नमस्ते, आप कैसे हैं?",
        transliteration: "Namaste, aap kaise hain?",
      },
      kannada: {
        originalScript: "ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?",
        transliteration: "Namaskara, neevu hegiddiri?",
      },
    };
    
    setCurrentSentence(fallbackSentences[targetLanguage]);
    
    toast({
      title: "Error",
      description: "Failed to load a new sentence. Showing a default sentence instead.",
      variant: "destructive",
    });
  } finally {
    setIsLoadingSentence(false);
  }
};
```

**Backend Code:** `server/gemini.ts`

```typescript
export async function generatePracticeSentence(
  language: "hindi" | "kannada"
): Promise<{ originalScript: string; transliteration: string }> {
  const languageName = language === "hindi" ? "Hindi" : "Kannada";
  const scriptName = language === "hindi" ? "Devanagari" : "Kannada";
  
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  const prompt = `Generate a simple practice sentence in ${languageName} (under 15 words) for language learners.
Return ONLY a JSON object with this exact structure:
{
  "originalScript": "sentence in ${scriptName} script",
  "transliteration": "English transliteration"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse response from AI");
  }

  const rawResult = JSON.parse(jsonMatch[0]);
  
  // Validate with zod schema
  const validationResult = practiceSentenceSchema.safeParse(rawResult);
  if (!validationResult.success) {
    throw new Error("Invalid response structure from AI");
  }

  return validationResult.data;
}
```

**Flow:**
1. User clicks "New Sentence" or changes language
2. Frontend sets loading state and clears previous results
3. Frontend sends POST request with language parameter
4. Backend calls Gemini AI with language-specific prompt
5. AI generates sentence in original script + transliteration
6. Backend validates response with Zod schema
7. Backend returns JSON to frontend
8. Frontend updates UI with new sentence
9. If error occurs, frontend shows fallback sentence

### Interaction Flow 2: Analyze Pronunciation

**Frontend Code:** `client/src/pages/home.tsx`

```typescript
const handleStopRecording = async () => {
  setIsRecording(false);
  setIsProcessing(true);

  try {
    const audioBlob = await audioRecorder.current.stopRecording();

    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("referenceText", currentSentence!.originalScript);
    formData.append("language", language);

    const response = await fetch("/api/pronunciation/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to analyze pronunciation");
    }

    const result = await response.json();
    setWordScores(result.wordScores || []);
    setFeedback(result.feedback || []);
    
    toast({
      title: "Analysis Complete",
      description: "Your pronunciation has been analyzed!",
    });
  } catch (error) {
    console.error("Error analyzing pronunciation:", error);
    toast({
      title: "Error",
      description: "Failed to analyze your pronunciation. Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsProcessing(false);
  }
};
```

**Backend Code:** `server/gemini.ts`

```typescript
export async function analyzePronunciation(
  audioBuffer: Buffer,
  referenceText: string,
  language: "hindi" | "kannada"
): Promise<{ wordScores: WordScore[]; feedback: string[] }> {
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  
  const prompt = `Analyze this ${language} pronunciation recording...
Reference text: "${referenceText}"
Return ONLY a JSON object with word-by-word scores and feedback.`;

  const result = await model.generateContent([
    { text: prompt },
    {
      inlineData: {
        data: audioBuffer.toString("base64"),
        mimeType: "audio/webm",
      },
    },
  ]);

  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse pronunciation analysis");
  }

  const rawResult = JSON.parse(jsonMatch[0]);
  
  // Validate with zod schema
  const validationResult = pronunciationResultSchema.safeParse(rawResult);
  if (!validationResult.success) {
    throw new Error("Invalid response structure from AI");
  }

  return validationResult.data;
}
```

**Flow:**
1. User clicks "Stop Recording"
2. Frontend stops MediaRecorder and gets audio Blob
3. Frontend creates FormData with audio file, reference text, and language
4. Frontend sends POST request to /api/pronunciation/analyze
5. Backend receives audio buffer via Multer
6. Backend sends audio + reference text to Gemini AI
7. AI analyzes pronunciation and returns word scores + feedback
8. Backend validates response with Zod schema
9. Backend returns JSON to frontend
10. Frontend displays word scores and coaching tips

---

## Business Logic Distribution

### Frontend Business Logic

The frontend handles:

1. **User Interface Logic** (`client/src/pages/home.tsx`)
   - State management for UI interactions
   - Form handling and validation
   - Loading states and error handling
   - User feedback (toasts)

2. **Browser API Integration**
   - Audio recording (`client/src/lib/audioRecorder.ts`)
   - Text-to-speech (`client/src/lib/speechSynthesis.ts`)
   - Microphone access management

3. **UI Presentation Logic**
   - Color-coded word scores (green to red based on score)
   - Responsive layout and accessibility
   - Language-specific typography

**Example - Word Score Color Coding:**

`client/src/components/PronunciationResults.tsx`
```typescript
const getScoreColor = (score: number): string => {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 40) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};
```

### Backend Business Logic

The backend handles:

1. **AI Integration** (`server/gemini.ts`)
   - Gemini AI API calls
   - Prompt engineering for sentence generation
   - Audio analysis with multimodal AI

2. **Data Validation** (`server/validation.ts`)
   - Request validation
   - Response schema validation
   - Type safety enforcement

3. **Error Handling** (`server/routes.ts`)
   - HTTP error responses
   - Logging and debugging
   - Graceful degradation

4. **File Processing** (`server/routes.ts`)
   - Audio file upload handling
   - MIME type validation
   - Buffer management

---

## Pronunciation Assessment System

### How It Works: Step-by-Step

#### Step 1: Sentence Generation

**AI Prompt Engineering:**

```typescript
const prompt = `Generate a simple practice sentence in ${languageName} (under 15 words) for language learners.

Requirements:
- Use common, everyday vocabulary
- Include words that showcase typical pronunciation challenges in ${languageName}
- Make it conversational and natural
- Keep it under 15 words

Return ONLY a JSON object with this exact structure:
{
  "originalScript": "sentence in ${scriptName} script",
  "transliteration": "English transliteration using standard romanization"
}

Do not include any other text or explanation.`;
```

**Key Design Decisions:**
- Limit to 15 words for manageable practice
- Request common vocabulary for beginners
- Ask for pronunciation challenges to make practice effective
- Strict JSON format for reliable parsing

**Example Output:**
```json
{
  "originalScript": "मैं आज बाजार जा रहा हूं।",
  "transliteration": "Main aaj bazaar ja raha hoon."
}
```

#### Step 2: Audio Recording

**Recording Process:**

1. User clicks "Record" button
2. Frontend requests microphone permission
3. MediaRecorder starts capturing audio
4. Audio chunks are collected in memory
5. User clicks "Stop Recording"
6. All chunks are combined into single WebM Blob

**Code:** `client/src/pages/home.tsx`
```typescript
const handleRecord = async () => {
  try {
    await audioRecorder.current.startRecording();
    setIsRecording(true);
  } catch (error: any) {
    console.error("Error starting recording:", error);
    toast({
      title: "Recording Failed",
      description: error.message || "Failed to access microphone.",
      variant: "destructive",
    });
  }
};
```

#### Step 3: Pronunciation Analysis

**AI Prompt for Analysis:**

```typescript
const prompt = `You are an expert ${language} language teacher. Analyze this pronunciation recording.

Reference text (what the user should have said): "${referenceText}"

Instructions:
1. Listen to the audio and transcribe what you hear
2. Compare it to the reference text
3. For EACH word, provide:
   - The word from reference text
   - English transliteration
   - Score from 0-100 based on accuracy
4. Provide 2-3 specific, actionable feedback tips

Scoring criteria:
- 90-100: Perfect pronunciation
- 70-89: Good with minor issues
- 50-69: Understandable but needs work
- Below 50: Significant pronunciation errors

Return ONLY a JSON object:
{
  "wordScores": [
    {
      "word": "original word",
      "transliteration": "romanized",
      "score": 85
    }
  ],
  "feedback": [
    "Specific tip about pronunciation",
    "Another helpful suggestion"
  ]
}`;
```

**Multimodal AI Processing:**

The Gemini AI model receives both text and audio:

```typescript
const result = await model.generateContent([
  { text: prompt },
  {
    inlineData: {
      data: audioBuffer.toString("base64"),
      mimeType: "audio/webm",
    },
  },
]);
```

**How AI Analyzes Pronunciation:**

1. **Speech Recognition:** AI transcribes the audio to text
2. **Phonetic Comparison:** Compares user's pronunciation to reference
3. **Word-Level Scoring:** Evaluates each word individually
   - Checks vowel sounds
   - Checks consonant sounds
   - Checks tone and stress
   - Checks word boundaries
4. **Feedback Generation:** Identifies specific areas for improvement

**Example Analysis Output:**
```json
{
  "wordScores": [
    {
      "word": "मैं",
      "transliteration": "Main",
      "score": 95
    },
    {
      "word": "आज",
      "transliteration": "aaj",
      "score": 75
    },
    {
      "word": "बाजार",
      "transliteration": "bazaar",
      "score": 60
    }
  ],
  "feedback": [
    "Great job with 'मैं' (Main)! Your pronunciation is nearly perfect.",
    "For 'आज' (aaj), try to elongate the 'aa' sound slightly more.",
    "In 'बाजार' (bazaar), emphasize the 'z' sound more clearly."
  ]
}
```

#### Step 4: Results Display

**Frontend Rendering:**

`client/src/components/PronunciationResults.tsx`
```typescript
export default function PronunciationResults({ wordScores }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pronunciation Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {wordScores.map((wordScore, index) => (
            <div
              key={index}
              className="flex flex-col items-center gap-1"
              data-testid={`word-score-${index}`}
            >
              <div className={`text-xl font-semibold ${getScoreColor(wordScore.score)}`}>
                {wordScore.word}
              </div>
              <div className="text-sm text-muted-foreground">
                {wordScore.transliteration}
              </div>
              <div className="text-xs font-medium">
                {wordScore.score}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

**Visual Feedback System:**
- **Green (80-100%):** Excellent pronunciation
- **Yellow (60-79%):** Good, minor improvements needed
- **Orange (40-59%):** Needs practice
- **Red (0-39%):** Significant issues

### Error Handling and Fallbacks

**1. Network Errors:**
```typescript
catch (error) {
  // Frontend shows fallback sentence
  setCurrentSentence(fallbackSentences[targetLanguage]);
  toast({
    title: "Error",
    description: "Failed to load a new sentence. Showing a default sentence instead.",
    variant: "destructive",
  });
}
```

**2. Browser Compatibility:**
```typescript
// Check for speech synthesis support
if (!('speechSynthesis' in window)) {
  throw new Error("Text-to-speech is not supported in your browser");
}
```

**3. Microphone Access:**
```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
} catch (error) {
  toast({
    title: "Recording Failed",
    description: "Failed to access microphone. Please grant permission.",
    variant: "destructive",
  });
}
```

**4. AI Response Validation:**
```typescript
// Validate AI response with Zod
const validationResult = pronunciationResultSchema.safeParse(rawResult);
if (!validationResult.success) {
  console.error("Invalid response structure:", rawResult, validationResult.error);
  throw new Error("Invalid response structure from AI");
}
```

### Performance Considerations

1. **Audio Format:** WebM chosen for browser compatibility and efficient encoding
2. **Memory Storage:** Audio stored in memory buffers (not disk) for faster processing
3. **File Size Limit:** 10MB maximum to prevent memory issues
4. **Loading States:** Immediate feedback for all async operations
5. **Fallback Content:** Pre-defined sentences prevent UI blocking

### Privacy and Security

1. **No Audio Storage:** Audio files are processed in memory and not saved
2. **Client-Side Recording:** Audio capture happens entirely in browser
3. **Temporary Buffers:** Audio buffers are cleared after analysis
4. **API Key Management:** Gemini API key stored as environment variable
5. **No User Data Persistence:** Practice sessions are not saved to database

---

---

## AI Model Selection

### Overview

Users can choose between three different Gemini AI models for pronunciation analysis, each optimized for different priorities:

1. **Gemini 2.5 Flash Lite** - Fastest and most cost-effective
2. **Gemini 2.5 Flash** - Balanced (default, recommended)
3. **Gemini 2.5 Pro** - Most accurate and detailed

### Model Specifications

**File:** `shared/schema.ts`

```typescript
export type AIModel = "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite";
```

| Model | Speed | Accuracy | Cost | Best For |
|-------|-------|----------|------|----------|
| **Flash Lite** | Fastest | Good | Lowest | High-volume practice, quick feedback |
| **Flash** ⭐ | Fast | Very Good | Medium | Most users, balanced experience |
| **Pro** | Slower | Excellent | Highest | Detailed analysis, advanced learners |

### Frontend Implementation

**File:** `client/src/components/ModelSelector.tsx`

The `ModelSelector` component provides a visual interface for model selection:

```typescript
interface ModelSelectorProps {
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => void;
}

const modelInfo: Record<AIModel, { 
  name: string; 
  description: string; 
  icon: typeof Zap; 
  badge?: string 
}> = {
  "gemini-2.5-flash-lite": {
    name: "Flash Lite",
    description: "Fastest & most affordable. Best for quick feedback.",
    icon: Zap,
    badge: "Fastest"
  },
  "gemini-2.5-flash": {
    name: "Flash",
    description: "Balanced speed and accuracy. Recommended for most users.",
    icon: Gauge,
    badge: "Recommended"
  },
  "gemini-2.5-pro": {
    name: "Pro",
    description: "Most accurate and detailed analysis. Slower but thorough.",
    icon: Crown,
    badge: "Most Accurate"
  }
};
```

**UI Features:**
- Radio button selection with visual feedback
- Each option shows:
  - Icon (Zap/Gauge/Crown)
  - Model name
  - Badge (Fastest/Recommended/Most Accurate)
  - Description explaining use case
- Selected model has highlighted border and background
- Hover effects for better interactivity

### State Management

**File:** `client/src/pages/home.tsx`

```typescript
export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AIModel>("gemini-2.5-flash");
  
  // Model is passed to backend during pronunciation analysis
  const handleStopRecording = async () => {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("referenceText", currentSentence.originalScript);
    formData.append("language", language);
    formData.append("model", selectedModel); // ← Model selection sent here
    
    const response = await fetch("/api/pronunciation/analyze", {
      method: "POST",
      body: formData,
    });
  };
}
```

### Backend Processing

**File:** `server/routes.ts`

The backend validates and uses the selected model:

```typescript
app.post("/api/pronunciation/analyze", upload.single("audio"), async (req, res) => {
  const { referenceText, language, model } = req.body;
  
  // Validate and default the model
  const validModels = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
  const selectedModel = model && validModels.includes(model) 
    ? model 
    : "gemini-2.5-flash"; // Default fallback
  
  const result = await analyzePronunciation(
    req.file.buffer,
    referenceText,
    language,
    selectedModel // ← Model passed to AI function
  );
  
  res.json(result);
});
```

**File:** `server/gemini.ts`

The AI analysis function accepts the model parameter:

```typescript
export async function analyzePronunciation(
  audioBuffer: Buffer,
  referenceText: string,
  language: "hindi" | "kannada",
  model: "gemini-2.5-pro" | "gemini-2.5-flash" | "gemini-2.5-flash-lite" = "gemini-2.5-flash"
): Promise<{ wordScores: WordScore[]; feedback: string[] }> {
  
  console.log(`Using AI model: ${model} for pronunciation analysis`);
  
  const response = await ai.models.generateContent({
    model: model, // ← Selected model used here
    contents: [{
      role: "user",
      parts: [
        { text: prompt },
        { 
          inlineData: { 
            mimeType: "audio/webm",
            data: audioBuffer.toString("base64") 
          } 
        }
      ]
    }]
  });
  
  // ... rest of analysis
}
```

### Model Selection Flow

```
1. User Interface
   └─> User selects model via radio buttons in ModelSelector
        │
        ├─> State updated: setSelectedModel("gemini-2.5-pro")
        │
        └─> Selection saved in component state

2. Recording & Analysis
   └─> User records pronunciation
        │
        ├─> Clicks "Stop Recording"
        │
        └─> handleStopRecording() function executes
             │
             ├─> Creates FormData with:
             │   - audio: Blob
             │   - referenceText: string
             │   - language: string
             │   - model: selectedModel ← Included here
             │
             └─> POST to /api/pronunciation/analyze

3. Backend Processing
   └─> Express route receives request
        │
        ├─> Validates model parameter
        │   - Checks if in validModels array
        │   - Falls back to "gemini-2.5-flash" if invalid
        │
        └─> Calls analyzePronunciation() with selected model
             │
             ├─> Gemini AI API called with specific model
             │
             └─> Analysis results returned to frontend

4. Results Display
   └─> Frontend receives pronunciation scores
        │
        └─> Displays word-level scores and feedback
            (Analysis quality varies by model)
```

### Performance Considerations

**Model Characteristics:**

1. **Flash Lite**
   - Response time: ~1-2 seconds
   - Best for: Rapid iteration, beginners
   - Trade-off: Slightly less detailed feedback

2. **Flash (Default)**
   - Response time: ~2-4 seconds
   - Best for: Most users
   - Trade-off: Balanced approach

3. **Pro**
   - Response time: ~4-8 seconds
   - Best for: Advanced learners, detailed analysis
   - Trade-off: Slower but most comprehensive

### Cost Implications

The app uses Replit's AI Integrations service, which bills based on:
- Model used (Pro > Flash > Flash Lite)
- Request frequency
- Audio file size

**Best Practices:**
- Flash Lite: Practice sessions with many iterations
- Flash: Normal daily practice
- Pro: Final assessments, detailed review sessions

---

## Dual Feedback System

### Overview

To make pronunciation coaching accessible to both beginners and advanced learners, the app generates **two versions of feedback** in a single AI analysis:

1. **Simple Tips** - Plain language guidance for everyday users
2. **Detailed Analysis** - Technical linguistic feedback for advanced learners

### Why Two Versions?

**The Problem:** Technical terms like "aspirated consonants," "retroflex sounds," and "vowel length" are helpful for linguistics students but confusing for most learners.

**The Solution:** Generate both beginner-friendly and advanced feedback simultaneously, letting users choose their preferred level of detail.

### Backend Implementation

**Modified AI Prompt** (`server/gemini.ts`):

The prompt explicitly instructs the AI to generate two distinct feedback types:

```typescript
const prompt = `You are a ${languageName} pronunciation coach...

2. TWO types of feedback:
   - SIMPLE TIPS: Plain language explanations that anyone can understand, using everyday comparisons and examples
   - DETAILED FEEDBACK: Technical linguistic analysis for advanced learners

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
```

**Response Structure:**

```json
{
  "wordScores": [
    {
      "word": "मैं",
      "transliteration": "main",
      "score": 85
    }
  ],
  "simpleTips": [
    "When saying 'ख' (kha), breathe out a little puff of air - like gently blowing out a birthday candle",
    "The sound 'आ' (aa) should be held longer than 'अ' (a) - like the difference between 'cat' and 'father'"
  ],
  "detailedFeedback": [
    "Focus on the aspiration in 'ख' (kha) - ensure you produce a clear puff of air after the velar stop",
    "Pay attention to vowel length distinctions: 'आ' requires a longer duration than the short vowel 'अ'"
  ]
}
```

### Validation Schema

**File:** `server/validation.ts`

```typescript
export const pronunciationResultSchema = z.object({
  wordScores: z.array(wordScoreSchema).min(1, "At least one word score is required"),
  simpleTips: z.array(z.string()).min(1, "At least one simple tip is required"),
  detailedFeedback: z.array(z.string()).min(1, "At least one detailed feedback item is required"),
});
```

Both feedback arrays are **required** to ensure the dual system always works.

### Frontend Implementation

**State Management** (`client/src/pages/home.tsx`):

```typescript
const [simpleTips, setSimpleTips] = useState<string[]>([]);
const [detailedFeedback, setDetailedFeedback] = useState<string[]>([]);

// After analysis
const result = await response.json();
setSimpleTips(result.simpleTips || []);
setDetailedFeedback(result.detailedFeedback || []);
```

**Tabbed UI Component** (`client/src/components/FeedbackSection.tsx`):

The component uses shadcn's `Tabs` component to display both feedback versions:

```typescript
<Tabs defaultValue="simple" className="w-full">
  <TabsList>
    <TabsTrigger value="simple">
      <Lightbulb className="h-4 w-4 mr-1.5" />
      Simple Tips
    </TabsTrigger>
    <TabsTrigger value="detailed">
      <GraduationCap className="h-4 w-4 mr-1.5" />
      Detailed Analysis
    </TabsTrigger>
  </TabsList>

  <TabsContent value="simple">
    {/* Simple tips displayed here */}
  </TabsContent>

  <TabsContent value="detailed">
    {/* Detailed feedback displayed here */}
  </TabsContent>
</Tabs>
```

**UI Features:**
- **Default Tab:** "Simple Tips" opens by default (most users need this)
- **Icons:** Lightbulb for simple, GraduationCap for advanced
- **Descriptions:** Each tab includes a subtitle explaining its purpose
- **Bullet Points:** Both versions use easy-to-scan list format

### Example Comparison

**For the Hindi word "ख" (kha):**

| Simple Tips | Detailed Analysis |
|-------------|-------------------|
| "When saying 'ख', breathe out a little puff of air - like gently blowing out a birthday candle" | "Focus on the aspiration in 'ख' (kha) - ensure you produce a clear puff of air after the velar stop consonant" |
| "Try whispering an 'h' sound right before saying 'k'" | "This is an aspirated velar plosive /kʰ/ requiring post-release airflow" |

### Benefits

1. **Accessibility:** Beginners get actionable advice without confusion
2. **Depth:** Advanced learners can study technical details
3. **Efficiency:** Single AI call generates both versions (cost-effective)
4. **Consistency:** Both feedbacks analyze the same recording
5. **User Choice:** Learners can switch based on their needs

### Cost Efficiency

Despite generating twice the feedback content, the system remains efficient:
- ✅ **Single API call** - No additional latency or cost
- ✅ **Same analysis** - AI processes audio once, explains it two ways
- ✅ **Cached results** - Both versions stored in frontend state

---

## Summary

This pronunciation evaluation app uses a modern full-stack architecture that:

1. **Separates Concerns:** Frontend handles UI/UX, backend handles AI integration
2. **Leverages Browser APIs:** Uses native audio recording and text-to-speech
3. **AI-Powered Analysis:** Gemini multimodal AI for accurate pronunciation assessment
4. **Flexible Model Selection:** Users choose speed vs. accuracy based on their needs
5. **Dual Feedback System:** Provides both beginner-friendly and advanced coaching
6. **Robust Error Handling:** Fallbacks at every level for production reliability
7. **Type-Safe:** TypeScript + Zod validation throughout the stack
8. **User-Friendly:** Clear visual feedback with color-coded scores and actionable tips

The core innovations are:
- Using Gemini's multimodal capabilities to analyze audio recordings in context
- Generating both accessible and technical feedback in a single AI call
- Giving users control over model selection and feedback complexity
