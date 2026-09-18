# Cuelance

> A calm, local-first teleprompter for natural talking-head videos.

Cuelance keeps your script close to the lens while you speak. The prompt follows your voice, highlights the current word, and stays easy to correct when you pause, improvise, repeat yourself, or skip ahead.

Made with 💛 in Vienna by [Matthias Grabner](mailto:hello@grabner.tech).

## What works today

- Responsive script editor with local persistence
- Camera and microphone preview using browser media APIs
- Fullscreen prompting mode with inline cue navigation and prompt-size slider
- Karaoke-style word highlighting from browser speech recognition when available
- Graceful demo-following fallback when speech recognition is unavailable
- Local OpenAI key entry and clear missing-key status for local development
- Native browser recording with review and download
- Bright/dark mode and prompt font/color controls

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:4173](http://localhost:4173).

For the production-style Node server:

```bash
npm run build
npm run start
```

The server listens on `http://localhost:8787` by default.

## OpenAI transcription

The UI includes a local-only OpenAI key field and status indicator. The key is stored in this browser and is never bundled into the frontend. The server-side session route is scaffolded at `POST /api/transcription/session`; wire the OpenAI ephemeral WebRTC exchange there before enabling hosted transcription.

Until that connection is completed, Cuelance uses browser speech recognition where supported and a local demo-following fallback otherwise.

## Privacy

Scripts and recordings stay on the device. Camera video is not uploaded. When a transcription provider is connected, microphone audio is sent to that provider for live transcription. Camera and microphone access require a secure context in deployed environments (HTTPS).

## Project structure

```text
src/main.tsx       React application and recording flow
src/styles.css     Responsive visual system and fullscreen controls
server/index.js    Small Node server and transcription-session boundary
```

## License

MIT — see [LICENSE](LICENSE).
