# Local Development Setup Guide

This guide helps you migrate the app from Replit to your local VS Code environment.

## Prerequisites

### 1. Install FFmpeg (Required for Audio Conversion)

**For WSL/Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
ffmpeg -version  # Verify installation
```

**For macOS:**
```bash
brew install ffmpeg
```

**For Windows (if not using WSL):**
Download from https://ffmpeg.org/download.html and add to PATH

### 2. Get Google Gemini API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the API key (starts with `AIza...`)

## Setup Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment Variables

Open the `.env` file and add your Gemini API key:

```bash
# Edit .env file
GEMINI_API_KEY=AIzaXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Note:** The `.env` file has already been created for you. Just add your API key.

### Step 3: Verify TypeScript Configuration

Run type checking to ensure everything compiles:

```bash
npm run check
```

### Step 4: Start Development Server

```bash
npm run dev
```

The app will be available at: http://localhost:5000

## What Changed from Replit?

### 1. AI Integration (`server/gemini.ts`)
- **Before:** Used Replit's AI Integrations service with special environment variables
- **After:** Uses standard Google Gemini AI SDK with `GEMINI_API_KEY`

### 2. Environment Variables (`.env`)
- **Before:** Replit managed environment variables automatically
- **After:** Added `.env` file with `dotenv` package to load variables locally

### 3. FFmpeg
- **Before:** Installed automatically via Replit's Nix packages
- **After:** Must install manually on your system

### 4. Database (Optional)
- **Note:** The app currently uses **in-memory storage** (`MemStorage` in `server/storage.ts`)
- PostgreSQL is configured but not actively used
- You can skip database setup unless you plan to implement persistent storage

## Troubleshooting

### Issue: "Cannot find FFmpeg"
**Solution:**
```bash
# Check if FFmpeg is installed
ffmpeg -version

# If not installed:
sudo apt install ffmpeg  # For WSL/Linux
brew install ffmpeg      # For macOS
```

### Issue: "AI API Error" or "Invalid API Key"
**Solution:**
- Verify your API key in `.env` file
- Ensure there are no extra spaces or quotes
- Check that your API key is valid at https://aistudio.google.com/app/apikey

### Issue: "Port 5000 already in use"
**Solution:**
```bash
# Change port in .env file
PORT=3000

# Or kill the process using port 5000
lsof -ti:5000 | xargs kill -9  # On Linux/macOS
```

### Issue: Audio recording not working
**Solution:**
- Browser must use HTTPS or localhost for microphone access
- Check browser permissions for microphone
- Ensure you're accessing via `localhost:5000` not `127.0.0.1:5000`

### Issue: Type errors about 'process' or 'Buffer'
**Solution:**
These are false positive diagnostics. The app uses `@types/node` which is already installed. You can ignore these or restart VS Code's TypeScript server:
- Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
- Type "TypeScript: Restart TS Server"

## Development Workflow

### Running the app
```bash
npm run dev          # Start development server (backend + frontend with HMR)
npm run check        # Type check without building
npm run build        # Production build
npm start            # Run production build
```

### Testing pronunciation analysis
1. Open http://localhost:5000
2. Select language (Hindi or Kannada)
3. Click "New Sentence" to generate practice text
4. Click "Listen" to hear native pronunciation
5. Click "Record" → speak → "Stop Recording"
6. View word scores and feedback

### Checking logs
Server logs appear in the terminal where you ran `npm run dev`. Look for:
- `🔄 Converting WebM to WAV...` - Audio conversion
- `🎙️ Starting pronunciation analysis with model: gemini-2.5-flash` - AI analysis start
- `✅ Pronunciation analysis completed successfully` - Success

## API Key Costs

Google Gemini AI has a free tier:
- **Free tier:** 15 requests per minute, 1500 requests per day
- **Paid tier:** Available if you need more

For typical testing and personal use, the free tier is sufficient.

## Next Steps

Once everything is working:
1. Try different AI models (Flash Lite, Flash, Pro) via the model selector
2. Test with both Hindi and Kannada
3. Explore the dual feedback system (Simple Tips vs Detailed Analysis)
4. Review `TECHNICAL_DOCUMENTATION.md` for architecture details
5. Check `CLAUDE.md` for development guidance

## Additional Resources

- **Gemini AI Documentation:** https://ai.google.dev/docs
- **FFmpeg Documentation:** https://ffmpeg.org/documentation.html
- **Web Audio API:** https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- **Vite Documentation:** https://vitejs.dev/guide/

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs in the terminal
3. Check browser console for frontend errors
4. Verify all prerequisites are installed correctly
