/**
 * shared/utils/estimateReadingTime.js
 *
 * Returns a human-readable estimated reading time string
 * for a given body of text.
 */

import { READING_SPEED_WPM } from '../constants.js';

/**
 * @param {string} text  Plain text content.
 * @returns {number}     Estimated reading time in minutes (minimum 1).
 */
export function estimateReadingTime(text) {
  if (!text || typeof text !== 'string') return 1;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / READING_SPEED_WPM));
}
