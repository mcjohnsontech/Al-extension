/**
 * shared/constants.js
 *
 * Application-wide constants shared across all layers.
 */

/** Base URL of the secure summarization proxy server. */
export const SERVER_BASE_URL = 'http://localhost:3000';

/** Maximum characters of page text sent to the AI (prevents huge tokens). */
export const MAX_CONTENT_CHARS = 12000;

/** Cache TTL: summaries are considered fresh for 30 minutes. */
export const CACHE_TTL_MS = 30 * 60 * 1000;

/** Average reading speed (words per minute) for time estimation. */
export const READING_SPEED_WPM = 200;

/** Highlight colour injected into the page (CSS custom property fallback). */
export const HIGHLIGHT_COLOR = '#ffe066';
