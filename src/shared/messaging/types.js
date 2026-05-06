/**
 * shared/messaging/types.js
 *
 * Central registry of all message type constants used between
 * popup, content script, and background service worker.
 * Never use raw strings for message types — always import from here.
 */

export const MESSAGE_TYPES = Object.freeze({
  // Popup → Background: trigger the full summarize pipeline
  SUMMARIZE_PAGE: 'SUMMARIZE_PAGE',

  // Background → Content: request page content extraction
  EXTRACT_CONTENT: 'EXTRACT_CONTENT',

  // Content → Background: extracted page content payload
  CONTENT_EXTRACTED: 'CONTENT_EXTRACTED',

  // Background → Popup: final summary result
  SUMMARY_RESULT: 'SUMMARY_RESULT',

  // Background → Popup: error during processing
  SUMMARY_ERROR: 'SUMMARY_ERROR',

  // Popup → Content: trigger phrase highlighting
  HIGHLIGHT_PHRASES: 'HIGHLIGHT_PHRASES',

  // Popup → Content: remove all highlights
  CLEAR_HIGHLIGHTS: 'CLEAR_HIGHLIGHTS',

  // Background → Popup: indicate AI call is in progress
  LOADING: 'LOADING',
});
