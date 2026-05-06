/**
 * background/messageHandler.js
 *
 * Central dispatcher for all messages arriving at the service worker.
 * Listens for SUMMARIZE_PAGE, orchestrates:
 *   1. Tab content extraction (via content script, auto-injected if needed)
 *   2. Cache check
 *   3. AI call (if no cache hit)
 *   4. Cache write
 *   5. Response back to popup
 */

import { MESSAGE_TYPES }      from '../shared/messaging/types.js';
import { sendToTab }          from '../shared/messaging/sendMessage.js';
import { summarizeWithAI }    from './aiClient.js';
import { checkRateLimit }     from './rateLimiter.js';
import { getCachedSummary, cacheSummary } from '../shared/storage/storageService.js';
import { logger }             from '../shared/utils/logger.js';

/** Patterns for pages where content scripts can never run. */
const UNSUPPORTED_URL = /^(chrome|chrome-extension|devtools|about|data|blob):/i;

/**
 * Register the background message listener.
 * Call once from index.js.
 */
export function registerMessageHandler() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== MESSAGE_TYPES.SUMMARIZE_PAGE) {
      return false; // not our message
    }

    // Kick off the async pipeline and keep the message channel open
    handleSummarizePage(message, sender, sendResponse);
    return true; // REQUIRED to keep sendResponse valid for async use
  });

  logger.info('Message handler registered');
}

/**
 * Attempt to send EXTRACT_CONTENT to the content script.
 * If the content script is not loaded yet (common on pre-existing tabs),
 * inject it programmatically via chrome.scripting, then retry once.
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<object>} Extracted page content payload.
 */
async function extractContentFromTab(tab) {
  const CONNECTION_ERRORS = [
    'receiving end does not exist',
    'could not establish connection',
    'no tab with id',
  ];

  const isConnectionError = (msg) =>
    CONNECTION_ERRORS.some((s) => msg.toLowerCase().includes(s));

  try {
    // First attempt — content script may already be running
    const response = await sendToTab(tab.id, { type: MESSAGE_TYPES.EXTRACT_CONTENT });
    if (!response?.success) {
      throw new Error(response?.error || 'Content extraction returned no data.');
    }
    return response.payload;
  } catch (err) {
    if (!isConnectionError(err.message)) {
      throw err; // some other error — propagate immediately
    }

    // Content script not present — inject it now using the scripting API
    logger.info('Content script not found — injecting programmatically into tab', tab.id);
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files:  ['content.js'],
      });
    } catch (injectErr) {
      throw new Error(
        `Cannot inject content script into this page: ${injectErr.message}`
      );
    }

    // Give the script a moment to register its message listener
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Retry the extraction
    const retryResponse = await sendToTab(tab.id, { type: MESSAGE_TYPES.EXTRACT_CONTENT });
    if (!retryResponse?.success) {
      throw new Error(retryResponse?.error || 'Content extraction failed after injection.');
    }
    return retryResponse.payload;
  }
}

/**
 * Full summarization pipeline for a SUMMARIZE_PAGE request.
 *
 * @param {object}   message      The incoming message.
 * @param {object}   sender       chrome.runtime.MessageSender
 * @param {Function} sendResponse Callback to send the result back.
 */
async function handleSummarizePage(message, sender, sendResponse) {
  // --- Determine the active tab ---
  let tab;
  try {
    [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab found.');
  } catch (err) {
    logger.error('Tab query failed:', err);
    return sendResponse({ error: 'Could not determine the active tab.' });
  }

  // Guard: content scripts cannot run on chrome:// or browser-internal pages
  if (UNSUPPORTED_URL.test(tab.url || '')) {
    return sendResponse({
      error: 'AI Page Summarizer cannot run on browser internal pages. Please navigate to a regular website first.',
    });
  }

  const tabUrl = tab.url || '';

  // --- Step 1: Check cache ---
  try {
    const cached = await getCachedSummary(tabUrl);
    if (cached) {
      logger.info('Returning cached summary');
      return sendResponse({ success: true, summary: cached, fromCache: true });
    }
  } catch (err) {
    logger.warn('Cache read failed, proceeding to live fetch:', err);
  }

  // --- Step 2: Rate limit check ---
  if (!checkRateLimit()) {
    return sendResponse({
      error: 'Rate limit reached. Please wait a moment before summarizing again.',
    });
  }

  // --- Step 3: Extract content from the page (with auto-injection fallback) ---
  let pageContent;
  try {
    pageContent = await extractContentFromTab(tab);
    logger.info('Content extracted, word count:', pageContent.wordCount);
  } catch (err) {
    logger.error('Content extraction failed:', err);
    return sendResponse({
      error: `Could not extract page content: ${err.message}`,
    });
  }

  // --- Step 4: Call AI ---
  let summary;
  try {
    summary = await summarizeWithAI(pageContent);
  } catch (err) {
    logger.error('AI call failed:', err);
    return sendResponse({ error: err.message });
  }

  // Enrich summary with page metadata
  summary.title       = pageContent.title;
  summary.url         = pageContent.url;
  summary.extractedAt = new Date().toISOString();

  // --- Step 5: Cache the result ---
  try {
    await cacheSummary(tabUrl, summary);
  } catch (err) {
    logger.warn('Failed to cache summary:', err); // non-fatal
  }

  sendResponse({ success: true, summary, fromCache: false });
}
