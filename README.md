# Web Sách Nói - Quick Deploy
This is a minimal Vite + React project that implements a client-side audiobook web app:
- Upload audio files and play them
- Paste text and use browser SpeechSynthesis to read (Vietnamese voices when available)
- Save books to localStorage

## How to run locally
1. Install Node.js (v18+)
2. In project folder:
   ```
   npm install
   npm run dev
   ```
3. Open the local URL shown by Vite (usually http://localhost:5173)

## Deploy
Recommended: push to GitHub and import the repo on Vercel (Vite framework, build `npm run build`, output `dist`).
