/**
 * background/aiClient.js
 *
 * Handles all outbound AI API requests.
 * The API key NEVER lives here — it lives on the server (server/index.js).
 * This module calls our own secure proxy server which forwards to the AI.
 *
 * Returned summary shape:
 * {
 *   bullets:     string[]   — key bullet-point summary sentences
 *   insights:    string[]   — notable takeaways / unique observations
 *   readingTime: number     — estimated minutes to read the full article
 * }
 */

import { SERVER_BASE_URL }      from '../shared/constants.js';
import { estimateReadingTime }  from '../shared/utils/estimateReadingTime.js';
import { logger }               from '../shared/utils/logger.js';

const SUMMARIZE_ENDPOINT = `${SERVER_BASE_URL}/api/summarize`;

/** Timeout for AI requests (ms). */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Call the secure proxy server to summarise page content.
 *
 * @param {{ text: string, title: string, url: string, wordCount: number }} pageContent
 * @returns {Promise<{ bullets: string[], insights: string[], readingTime: number }>}
 */
export async function summarizeWithAI(pageContent) {
  const { text, title, wordCount } = pageContent;

  if (!text || text.length < 50) {
    throw new Error('Page content is too short to summarize.');
  }

  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    logger.info(`Sending ${wordCount} words to AI for "${title}"`);

    const response = await fetch(SUMMARIZE_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, title }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Server error ${response.status}: ${body}`);
    }

    const data = await response.json();

    // Validate and normalise the server response
    const bullets    = Array.isArray(data.bullets)   ? data.bullets.map(String)   : [];
    const insights   = Array.isArray(data.insights)  ? data.insights.map(String)  : [];
    const readingTime = typeof data.readingTime === 'number'
      ? data.readingTime
      : estimateReadingTime(text);

    if (!bullets.length && !insights.length) {
      throw new Error('AI returned an empty summary. Please try again.');
    }

    return { bullets, insights, readingTime };

  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server may be unavailable.');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
