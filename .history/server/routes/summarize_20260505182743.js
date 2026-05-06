/**
 * server/routes/summarize.js
 *
 * POST /api/summarize
 *
 * Receives page content from the extension, validates it,
 * calls the AI service, and returns a structured summary.
 */

import express             from 'express';
import { summarizePage }   from '../services/aiService.js';
import { MAX_CONTENT_CHARS } from './constants.js';

export const summarizeRouter = express.Router();

/** Simple in-memory rate limiter (per IP, max 10 req/min). */
const rateLimitMap = new Map();
const RATE_WINDOW  = 60_000;
const RATE_MAX     = 10;

function ipRateLimit(req, res, next) {
  const ip  = req.ip;
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, windowEnd: now + RATE_WINDOW };

  if (now > entry.windowEnd) {
    entry.count     = 0;
    entry.windowEnd = now + RATE_WINDOW;
  }

  if (entry.count >= RATE_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }

  entry.count++;
  rateLimitMap.set(ip, entry);
  next();
}

summarizeRouter.post('/', ipRateLimit, async (req, res) => {
  const { text, title } = req.body || {};

  // ── Input validation ──────────────────────────────────────────
  if (typeof text !== 'string' || text.trim().length < 50) {
    return res.status(400).json({ error: 'Content too short to summarize.' });
  }
  if (typeof title !== 'string') {
    return res.status(400).json({ error: 'Missing page title.' });
  }

  const sanitizedText  = text.trim().slice(0, MAX_CONTENT_CHARS);
  const sanitizedTitle = title.trim().slice(0, 300);

  // ── AI call ──────────────────────────────────────────────────
  try {
    const summary = await summarizePage({ text: sanitizedText, title: sanitizedTitle });
    return res.json(summary);
  } catch (err) {
    console.error('[/api/summarize]', err.message);
    return res.status(502).json({ error: 'AI service unavailable. Please try again.' });
  }
});
