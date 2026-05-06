/**
 * content/sanitizer.js
 *
 * Sanitises strings before they are injected into the DOM.
 * Never call innerHTML with unsanitised data — use these helpers instead.
 */

/**
 * Escape HTML special characters in a string.
 * Safe for insertion into element.innerHTML as text content.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;');
}

/**
 * Strip all HTML tags from a string, returning plain text.
 * Useful when an AI response unexpectedly contains markup.
 *
 * @param {string} html
 * @returns {string}
 */
export function stripTags(html) {
  if (typeof html !== 'string') return '';
  // Use a detached div to leverage the browser parser safely
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * Validate that a phrase is a non-empty, reasonable string for highlighting.
 * Rejects strings that are too long or contain suspicious patterns.
 *
 * @param {string} phrase
 * @returns {boolean}
 */
export function isValidPhrase(phrase) {
  if (typeof phrase !== 'string') return false;
  const trimmed = phrase.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return false;
  // Reject anything that looks like a script injection attempt
  if (/<script|javascript:|on\w+=/i.test(trimmed)) return false;
  return true;
}
