/**
 * popup/components/Button.js
 *
 * Factory for the main "Summarize Page" action button.
 */

/**
 * @param {Function} onClick
 * @returns {HTMLButtonElement}
 */
export function createSummarizeButton(onClick) {
  const btn = document.createElement('button');
  btn.id        = 'summarize-btn';
  btn.className = 'btn btn--primary btn--full';
  btn.setAttribute('aria-label', 'Summarize the current page using AI');
  btn.innerHTML = `
    <span class="btn__icon" aria-hidden="true">⚡</span>
    <span class="btn__label">Summarize Page</span>
  `;
  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * Set the button into a loading / disabled state.
 * @param {HTMLButtonElement} btn
 * @param {boolean}           loading
 */
export function setButtonLoading(btn, loading) {
  btn.disabled = loading;
  const label = btn.querySelector('.btn__label');
  const icon  = btn.querySelector('.btn__icon');
  if (loading) {
    if (label) label.textContent = 'Summarizing…';
    if (icon)  icon.textContent  = '⏳';
  } else {
    if (label) label.textContent = 'Summarize Page';
    if (icon)  icon.textContent  = '⚡';
  }
}
