import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'cuelance' }));
app.post('/api/transcription/session', (_req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Transcription is not configured on this server.' });
  }
  res.status(501).json({ error: 'Add the OpenAI ephemeral session exchange here.' });
});

const dist = path.resolve(__dirname, '../dist');
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, 'index.html')));

const port = process.env.PORT || 8787;
app.listen(port, () => console.log(`Cuelance server listening on http://localhost:${port}`));
