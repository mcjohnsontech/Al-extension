import './popup.css';

/**
 * popup/popup.js  ←  entry point compiled to dist/popup.js
 *
 * Orchestrates the popup UI:
 *  - Renders the idle state with "Summarize Page" button
 *  - Sends SUMMARIZE_PAGE to the background service worker
 *  - Shows loading / summary / error states
 *  - Forwards highlight commands to the content script
 */

import { MESSAGE_TYPES }          from '../shared/messaging/types.js';
import { sendToBackground }       from '../shared/messaging/sendMessage.js';
import { logger }                 from '../shared/utils/logger.js';
import { clearCachedSummary }     from '../shared/storage/storageService.js';
import { createSummarizeButton, setButtonLoading } from './components/Button.js';
import { createLoader }           from './components/Loader.js';
import { createErrorState }       from './components/ErrorState.js';
import { createSummaryView }      from './components/SummaryView.js';

// ── DOM references ──────────────────────────────────────────────────────────
const root = document.getElementById('app-root');

// ── State ────────────────────────────────────────────────────────────────────
let summarizeBtn = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clear and re-render the dynamic content area. */
function setContent(el) {
  const area = document.getElementById('content-area');
  if (!area) return;
  area.innerHTML = '';
  if (el) area.appendChild(el);
}

/** Show an inline notification banner (non-blocking). */
function showBanner(message, type = 'info') {
  const banner = document.getElementById('banner');
  if (!banner) return;
  banner.textContent  = message;
  banner.className    = `banner banner--${type}`;
  banner.hidden       = false;
  setTimeout(() => { banner.hidden = true; }, 4000);
}

// ── States ────────────────────────────────────────────────────────────────────

function renderIdle() {
  setButtonLoading(summarizeBtn, false);
  summarizeBtn.hidden = false;
  setContent(null);
}

function renderLoading() {
  setButtonLoading(summarizeBtn, true);
  summarizeBtn.hidden = false;
  setContent(createLoader());
}

function renderError(message) {
  setButtonLoading(summarizeBtn, false);
  summarizeBtn.hidden = false;
  setContent(createErrorState(message, handleSummarize));
}

function renderSummary(summary, fromCache) {
  summarizeBtn.hidden = true;
  setContent(
    createSummaryView(summary, fromCache, {
      onHighlight:      handleHighlight,
      onClearHighlight: handleClearHighlight,
      onClear:          handleClearSummary,
    })
  );
  if (fromCache) showBanner('Loaded from cache', 'info');
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleSummarize() {
  renderLoading();
  try {
    const response = await sendToBackground({ type: MESSAGE_TYPES.SUMMARIZE_PAGE });
    if (response?.success) {
      renderSummary(response.summary, response.fromCache);
    } else {
      renderError(response?.error || 'An unknown error occurred.');
    }
  } catch (err) {
    logger.error('Summarize failed:', err);
    renderError(err.message || 'Failed to reach the background service.');
  }
}

async function handleHighlight(phrases) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, {
      type: MESSAGE_TYPES.HIGHLIGHT_PHRASES,
      phrases,
    });
    showBanner('Key phrases highlighted on the page', 'success');
  } catch (err) {
    logger.warn('Highlight failed:', err);
    showBanner('Could not highlight — try refreshing the page', 'warn');
  }
}

async function handleClearHighlight() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.CLEAR_HIGHLIGHTS });
  } catch (err) {
    logger.warn('Clear highlight failed:', err);
  }
}

async function handleClearSummary() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) await clearCachedSummary(tab.url);
  } catch (err) {
    logger.warn('Clear cache failed:', err);
  }
  renderIdle();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function init() {
  // Inject the summarize button into the header action area
  const btnArea = document.getElementById('btn-area');
  summarizeBtn  = createSummarizeButton(handleSummarize);
  if (btnArea) btnArea.appendChild(summarizeBtn);

  // Display current page title
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    const titleEl = document.getElementById('page-title');
    if (titleEl && tab?.title) {
      titleEl.textContent = tab.title;
      titleEl.title       = tab.title;
    }
  });

  logger.info('Popup initialised');
}

document.addEventListener('DOMContentLoaded', init);
