/**
 * content/index.js  ←  compiled to dist/content.js (service worker entry)
 *
 * Content script entry point.
 * Responsibilities:
 *  1. Listen for EXTRACT_CONTENT messages from the background worker.
 *  2. Return extracted page content.
 *  3. Listen for HIGHLIGHT_PHRASES / CLEAR_HIGHLIGHTS from the popup.
 */

import { MESSAGE_TYPES }           from '../shared/messaging/types.js';
import { extractPageContent }      from './extractors/mainExtractor.js';
import { highlightPhrases, clearHighlights } from './highlighter/highlight.js';
import { logger }                  from '../shared/utils/logger.js';

/**
 * Validate that an incoming message has a recognised type field.
 * Defensive guard against rogue page messages.
 *
 * @param {any} message
 * @returns {boolean}
 */
function isValidMessage(message) {
  return (
    message !== null &&
    typeof message === 'object' &&
    typeof message.type === 'string' &&
    Object.values(MESSAGE_TYPES).includes(message.type)
  );
}

// ---------------------------------------------------------------------------
// Message listener — must return `true` for async responses
// ---------------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isValidMessage(message)) {
    logger.warn('Content script received unknown message:', message);
    return false;
  }

  switch (message.type) {
    case MESSAGE_TYPES.EXTRACT_CONTENT: {
      try {
        const payload = extractPageContent();
        sendResponse({ success: true, payload });
      } catch (err) {
        logger.error('Content extraction failed:', err);
        sendResponse({ success: false, error: err.message });
      }
      return false; // synchronous response
    }

    case MESSAGE_TYPES.HIGHLIGHT_PHRASES: {
      const phrases = Array.isArray(message.phrases) ? message.phrases : [];
      try {
        highlightPhrases(phrases);
        sendResponse({ success: true });
      } catch (err) {
        logger.error('Highlight failed:', err);
        sendResponse({ success: false, error: err.message });
      }
      return false;
    }

    case MESSAGE_TYPES.CLEAR_HIGHLIGHTS: {
      try {
        clearHighlights();
        sendResponse({ success: true });
      } catch (err) {
        logger.error('Clear highlights failed:', err);
        sendResponse({ success: false, error: err.message });
      }
      return false;
    }

    default:
      return false;
  }
});

logger.info('Content script initialised');
