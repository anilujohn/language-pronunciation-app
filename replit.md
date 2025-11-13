# Language Pronunciation Evaluation App

## Overview

This is an AI-powered language learning application that helps users practice and improve their pronunciation in Hindi and Kannada. Users can generate practice sentences, listen to native pronunciation via text-to-speech, record their own attempts, and receive detailed AI-powered feedback on their pronunciation accuracy with word-by-word scoring and coaching tips.

**New Features (Nov 2025):**

1. **AI Model Selection** - Users can choose between three Gemini AI models:
   - **Gemini 2.5 Flash Lite** - Fastest analysis for quick feedback
   - **Gemini 2.5 Flash** - Balanced speed and accuracy (recommended)
   - **Gemini 2.5 Pro** - Most detailed and accurate analysis

2. **Dual Feedback System** - Pronunciation coaching now provides two versions:
   - **Simple Tips** - Plain language guidance using everyday examples and analogies (default)
   - **Detailed Analysis** - Technical linguistic feedback for advanced learners
   - Users can switch between tabs to see both versions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool and development server.

**UI Component Library**: shadcn/ui built on Radix UI primitives with Tailwind CSS for styling. The design follows Material Design principles with a focus on clarity and accessibility for multilingual content display.

**State Management**: React Query (@tanstack/react-query) for server state management and API data fetching. Local component state using React hooks for UI interactions (recording state, playback state, etc.).

**Routing**: Wouter for lightweight client-side routing with a simple single-page application structure.

**Typography System**: Google Fonts integration for multilingual support:
- Noto Sans Devanagari for Hindi script
- Noto Sans Kannada for Kannada script  
- Roboto for UI text
- Material Design hierarchy with varying font weights and sizes for information hierarchy

**Key Design Decisions**:
- Material Design approach chosen for educational utility requiring clarity and accessibility
- High-contrast design optimized for script readability
- Responsive layout with max-width constraints (max-w-4xl) for optimal reading
- Consistent spacing using Tailwind units (4, 6, 8, 12)

**Key Components**:
- `LanguageSelector` - Tabs for switching between Hindi and Kannada
- `ModelSelector` - Radio buttons for choosing AI model (Flash Lite, Flash, Pro)
- `SentenceDisplay` - Shows practice sentence in original script and transliteration
- `AudioControls` - Listen and Record buttons
- `PronunciationResults` - Color-coded word scores
- `FeedbackSection` - Tabbed interface displaying both simple tips and detailed analysis

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript.

**API Design**: RESTful API with two main endpoints:
- `POST /api/sentences/generate` - Generates practice sentences using AI
  - Request: `{ language: "hindi" | "kannada" }`
  - Response: `{ originalScript: string, transliteration: string }`
- `POST /api/pronunciation/analyze` - Analyzes audio recordings and provides feedback
  - Request: FormData with `audio`, `referenceText`, `language`, `model`
  - Response: `{ wordScores: WordScore[], feedback: string[] }`
  - Supports three Gemini models: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`

**File Upload Handling**: Multer middleware for processing audio file uploads (stored in memory as buffers).

**Development Setup**: Custom Vite integration for HMR (Hot Module Replacement) in development mode with middleware-based SSR support.

**Error Handling**: Centralized error handling with structured JSON responses and appropriate HTTP status codes.

### Data Storage

**Database**: PostgreSQL via Neon serverless driver (@neondatabase/serverless) with Drizzle ORM for type-safe database operations.

**Schema Design**: 
- User authentication system with username/password (though not actively used in current implementation)
- Practice sentences and pronunciation results are generated dynamically and not persisted

**Session Management**: In-memory storage implementation (MemStorage class) for user data, with provision for database-backed storage.

**Migration Strategy**: Drizzle Kit for database schema migrations with configuration in `drizzle.config.ts`.

### External Dependencies

**AI Service**: Google Gemini AI (via Replit's AI Integrations service) for:
- Generating contextual practice sentences in Hindi/Kannada with transliterations
- Analyzing pronunciation from audio recordings
- Providing word-level scoring and dual-level coaching feedback (simple + detailed)
- Three model options: gemini-2.5-flash-lite, gemini-2.5-flash (default), gemini-2.5-pro
- Single AI call generates both simple tips and detailed analysis simultaneously

**Browser APIs**:
- **Web Audio API**: MediaRecorder for capturing user audio (WebM format)
- **Speech Synthesis API**: Browser-native text-to-speech for playing reference pronunciation
- Language codes: hi-IN (Hindi), kn-IN (Kannada)
- Configured with slower rate (0.85) for learning purposes

**Third-Party Services**:
- Google Fonts CDN for typography assets
- Material Icons for UI iconography

**Audio Processing Flow**:
1. User requests sentence generation → Gemini AI generates sentence with transliteration
2. User clicks "Listen" → Browser Speech Synthesis API speaks the sentence
3. User clicks "Record" → MediaRecorder captures audio as WebM blob
4. Audio sent to backend → Gemini AI analyzes against reference text
5. Results displayed with word scores and feedback tips

**API Integration Pattern**: 
- Environment variables for API keys and base URLs
- Custom HTTP options for Replit's AI Integrations proxy
- JSON response parsing with error handling for malformed AI responses
- Zod schema validation for all AI responses (see `server/validation.ts`)

### Error Handling & Resilience

**Fallback Mechanisms**:
- Default sentences provided when AI generation fails (prevents stuck UI states)
- Browser feature detection for Speech Synthesis API
- Comprehensive error messages guiding users to supported browsers

**Loading States**:
- Inline loading indicators during sentence generation
- Buttons disabled during loading/processing states
- Clear visual feedback for all async operations

**Production Readiness**:
- All critical user flows tested end-to-end
- Graceful degradation when browser features unavailable
- Schema validation prevents malformed AI responses from breaking the app