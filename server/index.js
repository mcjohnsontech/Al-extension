/**
 * server/index.js
 *
 * Express server entry point.
 * Handles CORS so only the extension can call it,
 * parses JSON, mounts routes, and starts listening.
 *
 * Environment variables (create a .env file):
 *   PORT           = 3000
 *   OPENAI_API_KEY = sk-...
 *   ALLOWED_ORIGIN = chrome-extension://<your-extension-id>
 */

import 'dotenv/config';
import express                from 'express';
import cors                   from 'cors';
import { summarizeRouter }    from './routes/summarize.js';

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS — only allow requests from the Chrome extension ──────────────────
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'; // restrict in production!

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (e.g. curl, Postman during dev) OR the extension
    if (!origin || origin === ALLOWED_ORIGIN || ALLOWED_ORIGIN === '*') {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ['POST'],
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Health check ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/summarize', summarizeRouter);

// ── 404 fallback ──────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[AI Summarizer Server] Listening on http://localhost:${PORT}`);
});
