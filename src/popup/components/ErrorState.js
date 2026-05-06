/**
 * popup/components/ErrorState.js
 *
 * Renders an error card with the error message and a retry button.
 */

import { escapeHtml } from '../../content/sanitizer.js';

/**
 * @param {string}   message    Human-readable error description.
 * @param {Function} onRetry    Callback when the user clicks "Try Again".
 * @returns {HTMLElement}
 */
export function createErrorState(message, onRetry) {
  const wrapper = document.createElement('div');
  wrapper.id        = 'error-state';
  wrapper.className = 'error-state';
  wrapper.setAttribute('role', 'alert');

  const safeMsg = escapeHtml(message || 'An unexpected error occurred.');

  wrapper.innerHTML = `
    <div class="error-state__icon" aria-hidden="true">⚠️</div>
    <h3 class="error-state__title">Something went wrong</h3>
    <p class="error-state__message">${safeMsg}</p>
  `;

  const retryBtn = document.createElement('button');
  retryBtn.id        = 'retry-btn';
  retryBtn.className = 'btn btn--secondary';
  retryBtn.textContent = 'Try Again';
  retryBtn.addEventListener('click', onRetry);

  wrapper.appendChild(retryBtn);
  return wrapper;
}
