/**
 * shared/storage/storageService.js
 *
 * Abstraction over chrome.storage.local.
 * All storage reads/writes go through here — never call
 * chrome.storage directly from popup or content scripts.
 */

import { CACHE_TTL_MS } from '../constants.js';
import { logger } from '../utils/logger.js';

/** Build the cache key for a given URL. */
const cacheKey = (url) => `summary::${url}`;

/**
 * Retrieve a cached summary for a URL.
 * Returns null if the cache is missing or expired.
 *
 * @param {string} url
 * @returns {Promise<object|null>}
 */
export async function getCachedSummary(url) {
  try {
    const key = cacheKey(url);
    const result = await chrome.storage.local.get(key);
    const entry = result[key];

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL_MS) {
      logger.info('Cache expired for', url);
      await chrome.storage.local.remove(key);
      return null;
    }

    logger.info('Cache hit for', url);
    return entry.summary;
  } catch (err) {
    logger.error('getCachedSummary failed:', err);
    return null;
  }
}

/**
 * Persist a summary for a URL with the current timestamp.
 *
 * @param {string} url
 * @param {object} summary
 */
export async function cacheSummary(url, summary) {
  try {
    const key = cacheKey(url);
    await chrome.storage.local.set({
      [key]: { summary, timestamp: Date.now() },
    });
    logger.info('Cached summary for', url);
  } catch (err) {
    logger.error('cacheSummary failed:', err);
  }
}

/**
 * Remove the cached summary for a specific URL.
 *
 * @param {string} url
 */
export async function clearCachedSummary(url) {
  try {
    await chrome.storage.local.remove(cacheKey(url));
    logger.info('Cleared cache for', url);
  } catch (err) {
    logger.error('clearCachedSummary failed:', err);
  }
}

/**
 * Wipe all cached summaries (useful for a "clear all" settings action).
 */
export async function clearAllCache() {
  try {
    const all = await chrome.storage.local.get(null);
    const keys = Object.keys(all).filter((k) => k.startsWith('summary::'));
    if (keys.length) await chrome.storage.local.remove(keys);
    logger.info(`Cleared ${keys.length} cached summaries`);
  } catch (err) {
    logger.error('clearAllCache failed:', err);
  }
}
