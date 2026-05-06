/**
 * popup/components/Loader.js
 *
 * Renders an animated loading state with a progress message.
 * Returns a DOM element — no innerHTML from external data.
 */

/**
 * Create and return the loader element.
 * @returns {HTMLElement}
 */
export function createLoader() {
  const wrapper = document.createElement('div');
  wrapper.id        = 'loader';
  wrapper.className = 'loader';
  wrapper.setAttribute('aria-live', 'polite');
  wrapper.setAttribute('aria-label', 'Summarizing page…');

  wrapper.innerHTML = `
    <div class="loader__spinner" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <p class="loader__text">Analyzing page content…</p>
  `;

  return wrapper;
}

/**
 * Update the loader's status message.
 * @param {HTMLElement} loaderEl
 * @param {string}      text
 */
export function updateLoaderText(loaderEl, text) {
  const p = loaderEl.querySelector('.loader__text');
  if (p) p.textContent = text;
}
