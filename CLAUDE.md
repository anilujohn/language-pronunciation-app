# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered language learning application for Hindi and Kannada pronunciation practice. Users record themselves speaking practice sentences and receive detailed AI-powered pronunciation analysis with word-level scores and coaching feedback.

## Development Commands

```bash
# Development server (runs both backend and frontend with HMR)
npm run dev

# Type checking (run before commits)
npm run check

# Production build (bundles both client and server)
npm run build

# Production server
npm start

# Database schema push (Drizzle ORM)
npm run db:push
```

## Architecture

### Monorepo Structure

This is a TypeScript monorepo with shared code between client and server:

- `client/` - React + Vite frontend (root for Vite build)
- `server/` - Express.js backend
- `shared/` - Shared TypeScript types and schemas (Zod + Drizzle)

**Important Path Aliases:**
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

Both tsconfig.json and vite.config.ts must be updated if aliases change.

### Full-Stack Request Flow

**Sentence Generation:**
1. Frontend (home.tsx) → POST `/api/sentences/generate` with `{ language }`
2. Backend (routes.ts) → calls `generatePracticeSentence()` from gemini.ts
3. Gemini AI generates sentence in original script + transliteration
4. Response validated with Zod schema (validation.ts)
5. Frontend displays sentence and enables audio playback via SpeechSynthesis API

**Pronunciation Analysis:**
1. Frontend records audio using MediaRecorder (audioRecorder.ts) → creates WebM Blob
2. FormData sent to POST `/api/pronunciation/analyze` with:
   - `audio`: WebM file
   - `referenceText`: original script text
   - `language`: hindi/kannada
   - `model`: AI model selection (pro/flash/flash-lite)
3. Backend receives file via Multer (memory storage)
4. **Audio Conversion:** WebM → WAV using FFmpeg (audioConverter.ts)
   - Gemini AI requires WAV format for reliable audio processing
   - Conversion happens server-side to avoid FFmpeg in browser
5. Gemini multimodal AI analyzes audio + reference text
6. AI returns word scores + dual feedback (simple tips + detailed analysis)
7. Frontend color-codes results (green=excellent, yellow=good, orange=needs work, red=poor)

### Audio Processing Pipeline

**Critical Implementation Detail:** The app converts WebM to WAV before sending to Gemini AI.

- Browser records in WebM (MediaRecorder default format)
- Server converts to WAV using FFmpeg (see `server/audioConverter.ts`)
- WAV provides better compatibility with Gemini's audio processing
- Conversion adds ~100-200ms but significantly improves accuracy

If you modify audio processing, ensure the format conversion remains in place.

### AI Integration (Replit AI Integrations)

This project uses **Replit's AI Integrations service** (not direct Google AI API):

```typescript
const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
  },
});
```

**Key Differences from Standard Google AI:**
- Environment variables use `AI_INTEGRATIONS_*` prefix
- Custom base URL provided by Replit
- API response format: `response.text` is a property, not a method
- No need to manage API keys manually (handled by Replit)

**Available Models:**
- `gemini-2.5-pro` - Most accurate, slower, higher cost
- `gemini-2.5-flash` - Balanced (default recommended)
- `gemini-2.5-flash-lite` - Fastest, most affordable

User selects model via `ModelSelector` component, passed through request chain.

### Dual Feedback System

The app generates **two versions of feedback** in a single AI call:

1. **Simple Tips** (`simpleTips[]`) - Plain language for beginners
   - "When saying 'ख', breathe out a little puff of air like blowing out a candle"

2. **Detailed Feedback** (`detailedFeedback[]`) - Technical linguistic analysis
   - "Focus on the aspiration in 'ख' (kha) - ensure you produce a clear puff of air after the velar stop"

**Implementation:**
- AI prompt in `gemini.ts` explicitly requests both formats
- Zod schema validates both arrays are present
- Frontend displays in tabbed UI (FeedbackSection.tsx)
- Both generated simultaneously (no additional API cost)

When modifying feedback generation, maintain both arrays in responses.

### Type Safety and Validation

**Shared Schema (`shared/schema.ts`):**
- Central source of truth for types
- Defines `Language`, `AIModel`, `PracticeSentence`, `WordScore`, `PronunciationResult`
- Imported by both client and server

**Zod Validation (`server/validation.ts`):**
- All AI responses validated with Zod before returning to client
- Prevents malformed AI output from breaking frontend
- Schemas: `practiceSentenceSchema`, `pronunciationResultSchema`

If you add new AI-powered features, always validate responses with Zod.

### Browser API Usage

**Audio Recording (client/src/lib/audioRecorder.ts):**
- Uses MediaRecorder Web API
- Requests microphone permission via `getUserMedia()`
- Records to WebM format (browser-native)
- Properly releases microphone resources on stop

**Text-to-Speech (client/src/lib/speechSynthesis.ts):**
- Uses Web Speech API (SpeechSynthesis)
- Language-specific voices: `hi-IN` for Hindi, `kn-IN` for Kannada
- Rate set to 0.85 for learner comprehension

Both are browser-native APIs with no external dependencies.

## Common Development Scenarios

### Adding a New Language

1. Update `Language` type in `shared/schema.ts`
2. Add language option to `LanguageSelector.tsx`
3. Update prompt engineering in `gemini.ts` (languageName, scriptName)
4. Add fallback sentence in `home.tsx`
5. Configure SpeechSynthesis locale in `speechSynthesis.ts`

### Modifying AI Prompts

All AI prompts in `server/gemini.ts`:
- `generatePracticeSentence()` - Sentence generation prompt
- `analyzePronunciation()` - Pronunciation analysis prompt

**Prompt Engineering Guidelines:**
- Always request JSON-only responses (no markdown)
- Include "Return ONLY a JSON object" instruction
- Specify exact structure with example
- For analysis: emphasize both simple and detailed feedback
- Test with multiple languages

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

Components install to `client/src/components/ui/`. Configuration in `components.json`.

### Debugging Audio Issues

**Common Problems:**
1. "Microphone permission denied" - Check browser settings, must be HTTPS or localhost
2. "Failed to analyze" - Likely audio format issue, verify WAV conversion in logs
3. Empty audio buffer - MediaRecorder might not have data, check recording duration

**Logging:**
- Server logs show audio buffer sizes (WebM and WAV)
- Server logs show model selection and analysis timing
- Console.log statements in `gemini.ts` trace full request flow

### Database Schema (Currently Minimal)

Database defined in `shared/schema.ts` with Drizzle ORM:
- `users` table exists but authentication not currently used
- Practice sessions are NOT persisted (in-memory only)
- Configuration: `drizzle.config.ts`

If adding persistence, use Drizzle migrations and update schema.

## Important Constraints

- **Port:** Must use `process.env.PORT` (default 5000) - other ports firewalled on Replit
- **Audio Format:** Always convert to WAV before sending to Gemini AI
- **AI Response Parsing:** Use regex `text.match(/\{[\s\S]*\}/)` to extract JSON (handles markdown)
- **Multer:** Uses memory storage (not disk) - files in `req.file.buffer`
- **Vite Root:** Set to `client/` directory, not project root
- **Environment Variables:** Replit AI Integrations uses special prefixed vars

## UI/UX Principles

From `design_guidelines.md`:
- Material Design approach (clarity over decoration)
- Multilingual typography with Noto Sans fonts
- Color-coded scoring: green (80-100%), yellow (60-79%), orange (40-59%), red (0-39%)
- Touch-friendly buttons (min 48x48px)
- Single-page app (no complex navigation)

Avoid decorative imagery - this is a functional learning tool focused on text and audio.

## Testing Pronunciation Analysis

Manual testing workflow:
1. Start dev server: `npm run dev`
2. Select language (Hindi/Kannada)
3. Click "New Sentence" - verify sentence displays
4. Click "Listen" - verify TTS plays with correct accent
5. Click "Record" → speak → "Stop Recording"
6. Check console for:
   - Audio buffer sizes (WebM → WAV conversion)
   - Model selection log
   - API timing
7. Verify results show:
   - Word-level scores with colors
   - Both simple tips and detailed feedback tabs

If analysis fails, check server logs for Gemini API errors.
