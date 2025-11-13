# Language Pronunciation Evaluation App

AI-powered language learning application for Hindi and Kannada pronunciation practice.

## Features

- **Dual Language Support**: Practice Hindi and Kannada pronunciation
- **AI-Powered Feedback**: Get detailed pronunciation analysis using Google Gemini AI
- **Three AI Model Options**:
  - Flash Lite (Fastest - Experimental)
  - Flash (Recommended - Balanced speed and accuracy)
  - Pro (Most Accurate - Detailed analysis)
- **Dual Feedback System**:
  - Simple Tips: Plain language guidance for beginners
  - Detailed Analysis: Technical linguistic feedback for advanced learners
- **Practice Sentences**: 12-15 word sentences with original script and transliteration
- **Audio Playback**: Listen to native pronunciation via text-to-speech
- **Voice Recording**: Record your pronunciation attempts
- **Word-by-Word Scoring**: Color-coded feedback for each word

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **UI**: shadcn/ui + Tailwind CSS
- **AI**: Google Gemini (via Replit AI Integrations)
- **Audio**: Web Audio API + Speech Synthesis API
- **Audio Processing**: FFmpeg for WebM to WAV conversion

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development server: `npm run dev`
4. Open browser to view the app

## Environment Variables

The app uses Replit AI Integrations which handles API keys automatically.

## License

MIT
