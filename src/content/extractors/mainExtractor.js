/**
 * content/extractors/mainExtractor.js
 *
 * Orchestrates the extraction pipeline:
 *   1. Try scored Readability candidate
 *   2. Fall back to heuristic selectors
 *   3. Fall back to paragraph collection
 *   4. Ultimate fallback: document.body.innerText
 *
 * Returns a clean, trimmed plain-text string ready to send to the AI.
 */

import { findMainContent }                         from './readability.js';
import { extractByHeuristics, extractParagraphs }  from './heuristics.js';
import { MAX_CONTENT_CHARS }                        from '../../shared/constants.js';
import { logger }                                   from '../../shared/utils/logger.js';

/**
 * Collapse excessive whitespace and remove very short lines (e.g. single
 * words from nav items that leaked through).
 * @param {string} raw
 * @returns {string}
 */
function cleanText(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 10)       // drop nav-like single words
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')               // max two blank lines
    .trim();
}

/**
 * Extract the most meaningful readable text from the current page.
 *
 * @returns {{ text: string, title: string, url: string, wordCount: number }}
 */
export function extractPageContent() {
  const title = document.title?.trim() || '';
  const url   = window.location.href;

  let raw = '';

  // --- Strategy 1: Readability scorer ---
  try {
    const el = findMainContent();
    if (el) {
      raw = el.innerText || '';
      logger.debug('Extraction via readability scorer');
    }
  } catch (err) {
    logger.warn('Readability scorer failed:', err);
  }

  // --- Strategy 2: Heuristic selectors ---
  if (!raw || raw.length < 200) {
    try {
      raw = extractByHeuristics() || '';
      if (raw) logger.debug('Extraction via heuristic selectors');
    } catch (err) {
      logger.warn('Heuristic extraction failed:', err);
    }
  }

  // --- Strategy 3: All <p> tags ---
  if (!raw || raw.length < 200) {
    try {
      raw = extractParagraphs();
      if (raw) logger.debug('Extraction via paragraph collection');
    } catch (err) {
      logger.warn('Paragraph extraction failed:', err);
    }
  }

  // --- Strategy 4: Body fallback ---
  if (!raw || raw.length < 100) {
    raw = document.body?.innerText || '';
    logger.debug('Extraction via body fallback');
  }

  const text      = cleanText(raw).slice(0, MAX_CONTENT_CHARS);
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  logger.info(`Extracted ${wordCount} words from "${title}"`);

  return { text, title, url, wordCount };
}
