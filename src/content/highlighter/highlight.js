/**
 * content/highlighter/highlight.js
 *
 * Highlights key phrases within the visible page text using safe,
 * non-destructive DOM manipulation (text node splitting).
 *
 * Key design decisions:
 *  - Never uses innerHTML to avoid XSS
 *  - Stores originals so highlights can be fully reverted
 *  - Skips script/style nodes
 *  - Limits total highlights to prevent performance degradation
 */

import { isValidPhrase } from '../sanitizer.js';
import { HIGHLIGHT_COLOR } from '../../shared/constants.js';
import { logger } from '../../shared/utils/logger.js';

/** DOM attribute used to identify injected highlight spans. */
const HIGHLIGHT_ATTR = 'data-ai-highlight';

/** Max number of individual phrase instances highlighted to avoid DOM thrash. */
const MAX_HIGHLIGHTS = 80;

/** Store references to highlighted nodes for clean removal. */
let highlightedSpans = [];

/**
 * Inject a <style> tag once for the highlight appearance.
 */
function ensureStyles() {
  const id = 'ai-summarizer-highlight-style';
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = `
    [${HIGHLIGHT_ATTR}] {
      background-color: ${HIGHLIGHT_COLOR};
      color: #1a1a1a;
      border-radius: 2px;
      padding: 0 2px;
      font-weight: 600;
      transition: background-color 0.2s ease;
    }
    [${HIGHLIGHT_ATTR}]:hover {
      background-color: #ffd700;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Walk text nodes inside an element, splitting them to wrap matching phrases.
 *
 * @param {Element}  root
 * @param {RegExp}   pattern
 * @param {number[]} counter   Pass-by-reference counter [currentCount].
 */
function highlightInElement(root, pattern, counter) {
  // TreeWalker is more efficient than recursive querySelectorAll for text nodes
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        // Skip invisible or script/style content
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.hasAttribute(HIGHLIGHT_ATTR)) {
          return NodeFilter.FILTER_REJECT; // already highlighted
        }
        if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodesToProcess = [];
  let node;
  while ((node = walker.nextNode())) {
    nodesToProcess.push(node);
  }

  for (const textNode of nodesToProcess) {
    if (counter[0] >= MAX_HIGHLIGHTS) break;

    const text = textNode.textContent;
    pattern.lastIndex = 0;

    if (!pattern.test(text)) continue;
    pattern.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIndex  = 0;
    let match;

    while ((match = pattern.exec(text)) !== null && counter[0] < MAX_HIGHLIGHTS) {
      // Text before the match
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      // The highlighted span
      const span = document.createElement('mark');
      span.setAttribute(HIGHLIGHT_ATTR, 'true');
      span.textContent = match[0];
      fragment.appendChild(span);
      highlightedSpans.push(span);

      lastIndex = match.index + match[0].length;
      counter[0]++;
    }

    // Remaining text after last match
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(fragment, textNode);
  }
}

/**
 * Highlight an array of key phrases on the current page.
 *
 * @param {string[]} phrases
 */
export function highlightPhrases(phrases) {
  clearHighlights(); // remove any previous run
  ensureStyles();

  const valid = phrases.filter(isValidPhrase);
  if (!valid.length) {
    logger.warn('No valid phrases to highlight');
    return;
  }

  // Build a single regex that matches any of the phrases (case-insensitive)
  const escaped = valid.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');

  const counter = [0];
  try {
    logger.info(`Starting highlight with ${valid.length} phrases:`, valid);
    highlightInElement(document.body, pattern, counter);
    logger.info(`Highlighted ${counter[0]} instances across ${valid.length} phrases`);
    if (counter[0] === 0) {
      logger.warn('No matches found on the page. Phrases may not match page content.');
    }
  } catch (err) {
    logger.error('Highlight error:', err);
  }
}

/**
 * Remove all injected highlights and restore original text nodes.
 */
export function clearHighlights() {
  for (const span of highlightedSpans) {
    try {
      const parent = span.parentNode;
      if (!parent) continue;
      parent.replaceChild(document.createTextNode(span.textContent), span);
      parent.normalize(); // merge adjacent text nodes
    } catch (_) {
      // Node may already have been removed by page JS — safe to ignore
    }
  }
  highlightedSpans = [];
  logger.info('Highlights cleared');
}
