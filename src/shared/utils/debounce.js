/**
 * shared/utils/debounce.js
 *
 * Standard debounce utility — delays invoking `fn` until after
 * `delay` ms have passed since the last invocation.
 */

/**
 * @param {Function} fn
 * @param {number}   delay  Milliseconds to wait.
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timerId;
  return function (...args) {
    clearTimeout(timerId);
    timerId = setTimeout(() => fn.apply(this, args), delay);
  };
}
