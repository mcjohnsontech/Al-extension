/**
 * shared/utils/logger.js
 *
 * Lightweight structured logger that prefixes all output with the
 * extension name and respects a production-mode silent flag.
 */

const PREFIX = '[AI Summarizer]';
const IS_DEV = typeof process !== 'undefined'
  ? process.env.NODE_ENV !== 'production'
  : true; // always verbose inside extension context

export const logger = {
  info:  (...args) => IS_DEV && console.info(PREFIX, ...args),
  warn:  (...args) => IS_DEV && console.warn(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args), // always log errors
  debug: (...args) => IS_DEV && console.debug(PREFIX, ...args),
};
