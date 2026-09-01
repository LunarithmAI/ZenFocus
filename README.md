# ZenFocus - AI Pomodoro

A high-fidelity Pomodoro timer with themes, embedded media, and AI-assisted task breakdown (Gemini).

## Summary

ZenFocus is a Pomodoro-style productivity timer built with React and Vite. It provides customizable themes and backgrounds, embedded media support (Spotify/YouTube/SoundCloud), and AI task breakdown through the Gemini REST API.

## Features

- Configurable Pomodoro timer and short/long breaks
- Customizable themes and background media
- Embedded media panel for Spotify, YouTube, and SoundCloud playlists (`components/MediaPanel.tsx:1`)
- AI task breakdown using Gemini (`services/geminiService.ts:1`)
- Minimal, fast UI with React + Vite
- Installable PWA with an offline app shell and bundled background themes

## Quick start

1. Install dependencies

   - Using npm: `npm install`
   - Using yarn: `yarn`
   - Using pnpm: `pnpm install`

2. Copy environment variables

   - Copy `.env.example` to `.env` and fill in any required keys: `./.env.example:1`

3. Run development server

   - `npm run dev`

4. Build for production

   - `npm run build`

5. Preview production build locally

   - `npm run preview`

6. Verify the production PWA assets

   - `npm run verify:pwa`

## Environment & API keys

This project can call Google’s Gemini REST API directly. The credential handling is implemented in `services/geminiService.ts:1`. Do not commit secret keys to the repository — use local `.env` files and CI secrets.

Recommended `.env` entries (example, may differ depending on implementation):

- `GEMINI_API_KEY` for Gemini task breakdown
- Any OAuth/client secrets for embedded media (if used)

Keep `.env` files out of source control — see the `.gitignore` suggestions below.

The timer, task list, settings, notification sound, and bundled themes work offline after the first successful load. AI task breakdown and embedded Spotify, YouTube, or SoundCloud media still require a network connection.

## Contributing

- Open an issue to discuss larger changes.
- Prefer small, focused PRs with clear intent.
- Add tests where appropriate and keep the style consistent with existing code.

## License

This project is licensed under the MIT License
