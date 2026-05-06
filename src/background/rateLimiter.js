/**
 * background/rateLimiter.js
 *
 * Simple in-memory rate limiter for AI API calls.
 * Prevents accidental spam if the user clicks rapidly.
 *
 * Uses a token-bucket approach: allows MAX_CALLS calls
 * within WINDOW_MS, then rejects until the window resets.
 */

const MAX_CALLS  = 5;          // max requests per window
const WINDOW_MS  = 60_000;     // 1 minute

let calls     = 0;
let windowEnd = Date.now() + WINDOW_MS;

/**
 * Returns true if this call is allowed, false if rate-limited.
 * @returns {boolean}
 */
export function checkRateLimit() {
  const now = Date.now();

  if (now > windowEnd) {
    // Reset the window
    calls     = 0;
    windowEnd = now + WINDOW_MS;
  }

  if (calls >= MAX_CALLS) {
    return false;
  }

  calls++;
  return true;
}

/**
 * Remaining allowed calls in the current window.
 * @returns {number}
 */
export function remainingCalls() {
  return Math.max(0, MAX_CALLS - calls);
}
