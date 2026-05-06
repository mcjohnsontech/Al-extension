/**
 * popup/components/SummaryView.js
 *
 * Renders the structured AI summary:
 *  - Page title
 *  - Reading time badge
 *  - Key bullets list
 *  - Insights list
 *  - Cache badge (if result is from cache)
 *  - Highlight toggle button
 *
 * All user-derived data is escaped before rendering.
 */

import { escapeHtml } from '../../content/sanitizer.js';

/**
 * @param {object}   summary
 * @param {string}   summary.title
 * @param {string[]} summary.bullets
 * @param {string[]} summary.insights
 * @param {number}   summary.readingTime
 * @param {boolean}  fromCache
 * @param {object}   callbacks
 * @param {Function} callbacks.onHighlight   Called with the phrases array.
 * @param {Function} callbacks.onClearHighlight
 * @param {Function} callbacks.onClear       Called when "Clear" is clicked.
 * @returns {HTMLElement}
 */
export function createSummaryView(summary, fromCache, { onHighlight, onClearHighlight, onClear }) {
  const { title, bullets = [], insights = [], readingTime } = summary;

  const wrapper = document.createElement('div');
  wrapper.id        = 'summary-view';
  wrapper.className = 'summary-view';

  // Build bullet items safely
  const bulletItems = bullets
    .map((b) => `<li class="summary-view__bullet">${escapeHtml(b)}</li>`)
    .join('');

  const insightItems = insights
    .map((i) => `<li class="summary-view__insight">${escapeHtml(i)}</li>`)
    .join('');

  const cacheTag = fromCache
    ? `<span class="badge badge--cache" title="Loaded from cache">Cached</span>`
    : '';

  wrapper.innerHTML = `
    <header class="summary-view__header">
      <h2 class="summary-view__title" title="${escapeHtml(title)}">${escapeHtml(title)}</h2>
      <div class="summary-view__meta">
        <span class="badge badge--time">⏱ ${readingTime} min read</span>
        ${cacheTag}
      </div>
    </header>

    <section class="summary-view__section" aria-labelledby="bullets-heading">
      <h3 id="bullets-heading" class="summary-view__section-title">Key Points</h3>
      <ul class="summary-view__list" id="bullets-list">
        ${bulletItems || '<li class="summary-view__empty">No key points extracted.</li>'}
      </ul>
    </section>

    <section class="summary-view__section" aria-labelledby="insights-heading">
      <h3 id="insights-heading" class="summary-view__section-title">Insights</h3>
      <ul class="summary-view__list summary-view__list--insights" id="insights-list">
        ${insightItems || '<li class="summary-view__empty">No insights available.</li>'}
      </ul>
    </section>
  `;

  // Action buttons (built via DOM to keep event wiring clean)
  const actions = document.createElement('div');
  actions.className = 'summary-view__actions';

  const highlightBtn = document.createElement('button');
  highlightBtn.id        = 'highlight-btn';
  highlightBtn.className = 'btn btn--highlight';
  highlightBtn.textContent = '✨ Highlight on Page';
  highlightBtn.addEventListener('click', () => {
    console.log('[SummaryView] Highlight button clicked');
    console.log('[SummaryView] Bullets:', bullets);
    console.log('[SummaryView] Insights:', insights);
    const phrases = [...bullets, ...insights];
    console.log('[SummaryView] Total phrases to highlight:', phrases.length, phrases);
    onHighlight(phrases);
    highlightBtn.textContent = '✅ Highlighted';
    highlightBtn.disabled = true;
    clearHighlightBtn.disabled = false;
  });

  const clearHighlightBtn = document.createElement('button');
  clearHighlightBtn.id        = 'clear-highlight-btn';
  clearHighlightBtn.className = 'btn btn--ghost';
  clearHighlightBtn.textContent = 'Clear Highlights';
  clearHighlightBtn.disabled = true;
  clearHighlightBtn.addEventListener('click', () => {
    onClearHighlight();
    highlightBtn.textContent = '✨ Highlight on Page';
    highlightBtn.disabled = false;
    clearHighlightBtn.disabled = true;
  });

  const clearBtn = document.createElement('button');
  clearBtn.id        = 'clear-summary-btn';
  clearBtn.className = 'btn btn--ghost';
  clearBtn.textContent = '🗑 Clear Summary';
  clearBtn.addEventListener('click', onClear);

  actions.append(highlightBtn, clearHighlightBtn, clearBtn);
  wrapper.appendChild(actions);

  return wrapper;
}
