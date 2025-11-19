# Pronunciation Evaluation App - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [3-Stage Pronunciation Analysis](#3-stage-pronunciation-analysis)
3. [Greedy Best-Match Algorithm](#greedy-best-match-algorithm)
4. [Token Cost Tracking](#token-cost-tracking)
5. [Frontend Architecture](#frontend-architecture)
6. [Backend Architecture](#backend-architecture)
7. [Audio Processing Pipeline](#audio-processing-pipeline)
8. [API Reference](#api-reference)

---

## Architecture Overview

This is a full-stack TypeScript application for Hindi and Kannada pronunciation practice. It uses a cost-effective 3-stage analysis approach combining AI transcription with local Levenshtein distance scoring.

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite (build tool and dev server)
- shadcn/ui components (Radix UI + Tailwind CSS)
- Wouter for routing

**Backend:**
- Express.js with TypeScript
- Google Gemini AI (Flash-Lite model for cost efficiency)
- FFmpeg for audio conversion (WebM → WAV)
- Multer for file uploads
- Zod for validation

**Browser APIs:**
- Web Audio API (MediaRecorder) for audio recording
- Web Speech API (SpeechSynthesis) for text-to-speech

### Key Design Principles

1. **Cost Efficiency**: Minimize API costs by using local computation where possible
2. **Speed**: Flash-Lite model for fast transcription (~2-4 seconds)
3. **Accuracy**: Levenshtein distance for objective word-level scoring
4. **User Experience**: Original sentence transliteration for consistent display

---

## 3-Stage Pronunciation Analysis

The app uses a cost-effective 3-stage approach that separates transcription from scoring:

### Stage 1: Audio Transcription (Gemini Flash-Lite)

**Purpose**: Convert spoken audio to text
**Cost**: Audio input tokens + minimal output tokens
**Time**: ~2-4 seconds

```typescript
// server/gemini.ts
export async function transcribeAudio(
  audioBuffer: Buffer,
  referenceText: string,
  language: "hindi" | "kannada"
): Promise<{
  transcription: string;
  transcriptionTransliteration: string;
  tokenUsage: TokenUsage;
}>
```

**AI Prompt**:
```
You are a ${languageName} transcription expert. Listen to the audio and transcribe exactly what was spoken.

The student was supposed to say: "${referenceText}"

Your task:
1. Transcribe exactly what you heard in ${scriptName} script
2. Provide the transliteration (English letters) of what you heard

Return ONLY a JSON object:
{
  "transcription": "what you heard in ${scriptName} script",
  "transcriptionTransliteration": "what you heard in English letters"
}
```

**Output Example**:
```json
{
  "transcription": "आज मैं बाज़ार में जाकर",
  "transcriptionTransliteration": "aaj main bazaar mein jaakar"
}
```

### Stage 2: Levenshtein Scoring (Local Computation)

**Purpose**: Calculate word-level similarity scores
**Cost**: Zero (runs locally)
**Time**: <5ms

```typescript
// server/levenshteinAnalysis.ts
export function calculateLevenshteinScores(
  transcription: string,
  referenceText: string
): {
  transcription: string;
  wordScores: Array<{ word: string; transcribedWord: string; score: number }>;
  overallScore: number;
  method: string;
}
```

**How It Works**:
1. Split both texts into words
2. Use Greedy Best-Match algorithm to align words
3. Calculate character-level Levenshtein distance for each pair
4. Convert distance to similarity percentage (0-100)

**Output Example**:
```json
{
  "wordScores": [
    { "word": "आज", "transcribedWord": "आज", "score": 100 },
    { "word": "बाज़ार", "transcribedWord": "बाजारी", "score": 67 },
    { "word": "ताज़ी", "transcribedWord": "(missing)", "score": 0 }
  ],
  "overallScore": 79
}
```

### Stage 3: Pronunciation Tips (Gemini Flash-Lite, Text-Only)

**Purpose**: Generate coaching tips for problem words
**Cost**: Text input tokens only (no audio)
**Time**: ~1-2 seconds

```typescript
// server/gemini.ts
export async function getPronunciationTips(
  problemWords: Array<{ word: string; transliteration: string; spokenWord: string; score: number }>,
  language: "hindi" | "kannada"
): Promise<{
  tips: Array<{ word: string; transliteration: string; tip: string }>;
  tokenUsage: TokenUsage;
}>
```

**Trigger Condition**: Only runs if there are words with score < 70%

**AI Prompt**:
```
You are a ${languageName} pronunciation coach. Provide ONE simple, actionable tip for each problem word.

Problem words:
${problemWords.map(w => `- "${w.word}" (${w.transliteration}) - User said: "${w.spokenWord}" - Score: ${w.score}%`).join('\n')}

Rules for tips:
- Use everyday language, no technical terms
- Give practical "how-to" instructions
- Use comparisons to familiar English sounds
- Focus on what to DO, not what's wrong

Return ONLY a JSON object:
{
  "tips": [
    { "word": "word", "transliteration": "translit", "tip": "practical tip" }
  ]
}
```

### Why 3 Stages?

| Approach | API Calls | Audio Processed | Cost |
|----------|-----------|-----------------|------|
| **Old (Single Call)** | 1 | Yes (full analysis) | High |
| **New (3 Stages)** | 2 | Stage 1 only | ~60% lower |

**Cost Savings**:
- Stage 1: Audio tokens (required)
- Stage 2: Zero cost (local)
- Stage 3: Text tokens only (much cheaper than audio)

---

## Greedy Best-Match Algorithm

### Overview

The algorithm aligns reference words with spoken words to handle:
- Word reordering (user says words in different order)
- Missing words (user skips a word)
- Extra words (user adds a word)
- Similar but different words (pronunciation variations)

### Algorithm Steps

**File**: `server/levenshteinAnalysis.ts`

```typescript
const MIN_SIMILARITY_THRESHOLD = 30;

function alignWords(
  referenceWords: string[],
  spokenWords: string[]
): Array<{ refWord: string; spokenWord: string; similarity: number }>
```

#### Step 1: Build Similarity Matrix

Calculate Levenshtein similarity for ALL pairs of words:

```
Reference: [मैं, आज, बाज़ार]
Spoken:    [आज, मैं, बाजारी]

Matrix:
         आज    मैं   बाजारी
मैं      0%   100%    0%
आज     100%    0%     0%
बाज़ार   0%    0%    67%
```

#### Step 2: Greedy Matching

Sort all pairs by similarity (highest first) and match greedily:

```typescript
// Sort by similarity descending
allPairs.sort((a, b) => b.similarity - a.similarity);

// Greedily select best matches
for (const pair of allPairs) {
  if (!matchedRef.has(pair.refIdx) && !matchedSpoken.has(pair.spokenIdx)) {
    // Only accept matches above threshold
    if (pair.similarity >= MIN_SIMILARITY_THRESHOLD) {
      matches.push(pair);
      matchedRef.add(pair.refIdx);
      matchedSpoken.add(pair.spokenIdx);
    }
  }
}
```

**Matching Order**:
1. मैं ↔ मैं (100%) ✓
2. आज ↔ आज (100%) ✓
3. बाज़ार ↔ बाजारी (67%) ✓

#### Step 3: Handle Missing/Extra Words

```typescript
// Mark unmatched reference words as missing
for (let i = 0; i < m; i++) {
  const match = matches.find(m => m.refIdx === i);
  if (!match) {
    alignment.push({
      refWord: referenceWords[i],
      spokenWord: "(missing)",
      similarity: 0
    });
  }
}

// Mark unmatched spoken words as extra
for (let j = 0; j < n; j++) {
  if (!matchedSpoken.has(j)) {
    alignment.push({
      refWord: "(extra)",
      spokenWord: spokenWords[j],
      similarity: 0
    });
  }
}
```

### Minimum Similarity Threshold (30%)

**Problem**: When both arrays have equal length, the algorithm forces all matches even when they're poor (e.g., 13%).

**Solution**: Reject matches below 30% similarity. These become missing/extra instead.

**Example**:
```
Reference: [ಇಂದು, ಬೆಳಿಗ್ಗೆ, ನಾನು, ...]  (8 words)
Spoken:    [ಇಂದು, ನಾನು, ..., ಇದೆ]        (8 words)

Without threshold:
  ಬೆಳಿಗ್ಗೆ ↔ ಇದೆ (13%)  ← Bad match forced

With threshold:
  ಬೆಳಿಗ್ಗೆ → (missing)    ← Correctly identified
  ಇದೆ → (extra)           ← Correctly identified
```

### Word Score Calculation

```typescript
function calculateWordSimilarity(word1: string, word2: string): number {
  const distance = levenshtein.get(word1, word2);
  const maxLength = Math.max(word1.length, word2.length);

  if (maxLength === 0) return 100;

  // Convert distance to similarity percentage
  const similarity = Math.max(0, (1 - distance / maxLength) * 100);
  return Math.round(similarity);
}
```

**Examples**:
- "बाज़ार" vs "बाज़ार" → 0 edits → 100%
- "बाज़ार" vs "बाजारी" → 2 edits / 7 chars → 67%
- "ताज़ी" vs "ताज़ा" → 1 edit / 5 chars → 80%

---

## Token Cost Tracking

### Overview

The app tracks token usage for each stage to help users understand API costs.

### Token Usage Structure

```typescript
// server/validation.ts
export const tokenUsageSchema = z.object({
  textInputTokens: z.number().min(0),
  audioInputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  totalTokens: z.number().min(0),
});
```

### Extracting Token Usage from Gemini

```typescript
// server/gemini.ts
const usageMetadata: any = response.usageMetadata;
const promptDetails = usageMetadata?.promptTokensDetails || [];

const tokenUsage = {
  textInputTokens: promptDetails.find((d: any) => d.modality === 'TEXT')?.tokenCount || 0,
  audioInputTokens: promptDetails.find((d: any) => d.modality === 'AUDIO')?.tokenCount || 0,
  outputTokens: (usageMetadata?.candidatesTokenCount || 0) + (usageMetadata?.thoughtsTokenCount || 0),
  totalTokens: usageMetadata?.totalTokenCount || 0
};
```

### Cost Breakdown Response

The API returns detailed cost breakdown per stage:

```json
{
  "costBreakdown": {
    "stage1": {
      "name": "Transcription (with audio)",
      "tokenUsage": {
        "textInputTokens": 162,
        "audioInputTokens": 360,
        "outputTokens": 66,
        "totalTokens": 588
      }
    },
    "stage2": {
      "name": "Levenshtein Scoring (local)",
      "tokenUsage": {
        "textInputTokens": 0,
        "audioInputTokens": 0,
        "outputTokens": 0,
        "totalTokens": 0
      }
    },
    "stage3": {
      "name": "Pronunciation Tips (text-only)",
      "tokenUsage": {
        "textInputTokens": 255,
        "audioInputTokens": 0,
        "outputTokens": 176,
        "totalTokens": 431
      }
    },
    "total": {
      "textInputTokens": 417,
      "audioInputTokens": 360,
      "outputTokens": 242,
      "totalTokens": 1019
    }
  }
}
```

### Frontend Display

**File**: `client/src/components/CostBreakdown.tsx`

Displays:
- Per-stage token usage and timing
- Total token count
- Visual breakdown of text vs audio tokens

**File**: `client/src/components/TokenUsageDisplay.tsx`

Shows token usage for sentence generation with cost estimation.

---

## Frontend Architecture

### Component Structure

```
client/src/
├── pages/
│   └── home.tsx                    # Main application page
├── components/
│   ├── LanguageSelector.tsx        # Language toggle (Hindi/Kannada)
│   ├── SentenceDisplay.tsx         # Shows practice sentence
│   ├── AudioControls.tsx           # Listen/Record buttons
│   ├── PronunciationResultsV2.tsx  # Word scores with missing/extra
│   ├── CostBreakdown.tsx           # Token usage per stage
│   ├── TokenUsageDisplay.tsx       # Sentence generation cost
│   └── LoadingSpinner.tsx          # Loading states
└── lib/
    ├── audioRecorder.ts            # Audio recording logic
    ├── speechSynthesis.ts          # Text-to-speech logic
    ├── tokenCost.ts                # Cost calculation utilities
    └── queryClient.ts              # React Query configuration
```

### State Management

**File**: `client/src/pages/home.tsx`

```typescript
export default function Home() {
  const [language, setLanguage] = useState<Language>("hindi");
  const [currentSentence, setCurrentSentence] = useState<PracticeSentence | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingSentence, setIsLoadingSentence] = useState(false);

  // Analysis result (new 3-stage architecture)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
}
```

### Analysis Result Interface

```typescript
interface AnalysisResult {
  transcription: string;
  transcriptionTransliteration: string;
  wordScores: WordScore[];
  overallScore: number;
  tips: WordTip[];
  timing: {
    stage1: number;
    stage2: number;
    stage3: number;
    total: number;
  };
  costBreakdown: {
    stage1: StageCost;
    stage2: StageCost;
    stage3: StageCost;
    total: TokenUsage;
  };
}
```

### PronunciationResultsV2 Component

**File**: `client/src/components/PronunciationResultsV2.tsx`

Displays:
1. **Overall Score**: Large percentage with color coding
2. **What You Said**: Transcription in transliteration and native script
3. **Word-by-Word Scores**: Color-coded badges with percentages
4. **Missing Words**: Red badges for skipped words
5. **Extra Words**: Yellow badges for added words
6. **Tips to Improve**: Coaching tips for problem words

**Score Color Coding**:
```typescript
function getScoreColor(score: number): string {
  if (score >= 90) return "bg-green-500/20 text-green-700";
  if (score >= 70) return "bg-green-500/15 text-green-600";
  if (score >= 50) return "bg-orange-500/20 text-orange-700";
  return "bg-red-500/20 text-red-700";
}
```

### Transliteration Display

The app uses the **original sentence transliteration** for all word displays:

```typescript
// server/routes.ts
const nativeWordsNormalized = nativeWords.map(w => w.normalize('NFC').toLowerCase());

const wordScores = levenshteinResult.wordScores.map(ws => {
  if (ws.word === "(extra)") {
    return { ...ws, transliteration: ws.word };
  }

  // Find index in reference and use corresponding transliteration
  const normalizedWord = ws.word.normalize('NFC').toLowerCase();
  const wordIndex = nativeWordsNormalized.indexOf(normalizedWord);

  const transliterationDisplay = (wordIndex !== -1 && translitWords[wordIndex])
    ? translitWords[wordIndex]
    : ws.word;

  return { ...ws, transliteration: transliterationDisplay };
});
```

**Why This Approach**:
- Consistent with sentence display
- No additional AI calls for transliteration
- Handles Unicode normalization correctly

---

## Backend Architecture

### API Endpoints

**File**: `server/routes.ts`

#### POST /api/sentences/generate

Generates a new practice sentence.

**Request**:
```json
{
  "language": "hindi" | "kannada",
  "model": "gemini-2.5-flash-lite"
}
```

**Response**:
```json
{
  "originalScript": "मैं आज बाज़ार जाकर...",
  "transliteration": "Main aaj bazaar jaakar...",
  "tokenUsage": {
    "textInputTokens": 213,
    "audioInputTokens": 0,
    "outputTokens": 62,
    "totalTokens": 275
  }
}
```

#### POST /api/pronunciation/analyze-v2

The main 3-stage analysis endpoint.

**Request** (FormData):
- `audio`: WebM audio file
- `referenceText`: Original script text
- `transliteration`: Original transliteration
- `language`: "hindi" | "kannada"

**Response**:
```json
{
  "transcription": "आज मैं बाज़ार में जाकर...",
  "transcriptionTransliteration": "aaj main bazaar mein jaakar...",
  "wordScores": [
    {
      "word": "मैं",
      "transliteration": "main",
      "transcribedWord": "मैं",
      "score": 100
    }
  ],
  "overallScore": 83,
  "tips": [
    {
      "word": "बाज़ार",
      "transliteration": "bazaar",
      "tip": "Emphasize the 'z' sound more clearly..."
    }
  ],
  "timing": {
    "stage1": 2981,
    "stage2": 4,
    "stage3": 1864,
    "total": 4849
  },
  "costBreakdown": { ... }
}
```

### Validation Schemas

**File**: `server/validation.ts`

```typescript
// Transcription result (Stage 1)
export const transcriptionResultSchema = z.object({
  transcription: z.string().min(1),
  transcriptionTransliteration: z.string().min(1),
});

// Pronunciation tips result (Stage 3)
export const wordTipSchema = z.object({
  word: z.string().min(1),
  transliteration: z.string().min(1),
  tip: z.string().min(1),
});

export const pronunciationTipsResultSchema = z.object({
  tips: z.array(wordTipSchema),
});
```

---

## Audio Processing Pipeline

### Recording Flow

1. **Browser**: MediaRecorder captures audio in WebM format
2. **Frontend**: Collects audio chunks into Blob
3. **Upload**: FormData with audio file sent to server
4. **Server**: Multer receives file in memory buffer

### Audio Conversion (WebM → WAV)

**File**: `server/audioConverter.ts`

Gemini AI processes WAV more reliably than WebM:

```typescript
export async function convertWebMToWAV(webmBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i', 'pipe:0',           // Input from stdin
      '-acodec', 'pcm_s16le',   // PCM 16-bit little-endian
      '-ar', '16000',           // 16kHz sample rate
      '-ac', '1',               // Mono
      '-f', 'wav',              // WAV format
      'pipe:1'                  // Output to stdout
    ]);

    // ... stream handling
  });
}
```

**Conversion Details**:
- Input: WebM (variable codec)
- Output: WAV (PCM, 16-bit, 16kHz, mono)
- Time: ~100-200ms overhead

### Audio File Saving (Development)

For testing purposes, audio is saved to disk:

```typescript
// server/routes.ts
const testAudioPath = path.join(__dirname, "test-audio.webm");
fs.writeFileSync(testAudioPath, audioBuffer);
console.log(`💾 Saved test audio to: ${testAudioPath}`);
```

This enables running the test script:
```bash
npx tsx server/testTranscriptionSpeed.ts
```

---

## API Reference

### Gemini AI Integration

**File**: `server/gemini.ts`

The app uses Google Gemini AI through environment variables:

```typescript
const apiKey = process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);
```

### Available Functions

#### generatePracticeSentence

```typescript
export async function generatePracticeSentence(
  language: "hindi" | "kannada",
  model: string = "gemini-2.5-flash-lite"
): Promise<{
  originalScript: string;
  transliteration: string;
  tokenUsage: TokenUsage;
}>
```

#### transcribeAudio

```typescript
export async function transcribeAudio(
  audioBuffer: Buffer,
  referenceText: string,
  language: "hindi" | "kannada"
): Promise<{
  transcription: string;
  transcriptionTransliteration: string;
  tokenUsage: TokenUsage;
}>
```

#### getPronunciationTips

```typescript
export async function getPronunciationTips(
  problemWords: Array<{
    word: string;
    transliteration: string;
    spokenWord: string;
    score: number;
  }>,
  language: "hindi" | "kannada"
): Promise<{
  tips: Array<{ word: string; transliteration: string; tip: string }>;
  tokenUsage: TokenUsage;
}>
```

#### calculateLevenshteinScores

```typescript
export function calculateLevenshteinScores(
  transcription: string,
  referenceText: string
): {
  transcription: string;
  wordScores: Array<{ word: string; transcribedWord: string; score: number }>;
  overallScore: number;
  method: string;
}
```

---

## Summary

This pronunciation evaluation app uses a modern, cost-effective architecture:

1. **3-Stage Analysis**: Separates transcription from scoring for cost efficiency
2. **Greedy Best-Match Algorithm**: Handles word reordering with 30% threshold
3. **Levenshtein Distance**: Objective word-level scoring without AI bias
4. **Token Cost Tracking**: Full visibility into API usage
5. **Original Transliteration**: Consistent display from sentence generation
6. **Audio Conversion**: WebM to WAV for reliable AI processing

### Key Innovations

- **60% cost reduction** by using local Levenshtein scoring
- **Missing/Extra word detection** with minimum similarity threshold
- **Per-stage timing** for performance monitoring
- **Text-only tips generation** to avoid audio costs in Stage 3

### Performance Characteristics

| Stage | Time | Cost | Notes |
|-------|------|------|-------|
| Stage 1 (Transcription) | 2-4s | Medium | Audio tokens |
| Stage 2 (Levenshtein) | <5ms | Zero | Local computation |
| Stage 3 (Tips) | 1-2s | Low | Text-only, conditional |
| **Total** | **4-7s** | **~40% of old approach** | |
