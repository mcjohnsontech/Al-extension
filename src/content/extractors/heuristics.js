/**
 * content/extractors/heuristics.js
 *
 * Rule-based fallback heuristics for common page patterns.
 * Tried after readability scoring returns a low-confidence result.
 */

/**
 * Try common structural selectors in priority order.
 * @returns {string|null}  Extracted text, or null if nothing found.
 */
export function extractByHeuristics() {
  const selectors = [
    '[itemprop="articleBody"]',
    '[itemprop="description"]',
    '.post-content',
    '.entry-content',
    '.article-body',
    '.story-body',
    '.content-body',
    '#main-content',
    '#content',
    '.content',
    'main',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      const text = (el.innerText || '').trim();
      if (text.length > 150) return text;
    }
  }

  return null;
}

/**
 * Collect all <p> tags from the document and join them.
 * Last-resort before falling back to document.body.
 * @returns {string}
 */
export function extractParagraphs() {
  const paragraphs = Array.from(document.querySelectorAll('p'))
    .map((p) => (p.innerText || '').trim())
    .filter((t) => t.length > 40); // skip tiny captions / labels

  return paragraphs.join('\n\n');
}
