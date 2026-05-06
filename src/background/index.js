/**
 * background/index.js  ←  compiled to dist/background.js (service worker)
 *
 * Service worker entry point.
 * Bootstraps all background modules exactly once.
 */

import { registerMessageHandler } from './messageHandler.js';
import { logger }                 from '../shared/utils/logger.js';

// ── Initialise ───────────────────────────────────────────────────────────────

registerMessageHandler();

// Log when the service worker activates (useful for debugging MV3 lifecycle)
self.addEventListener('activate', () => {
  logger.info('Service worker activated');
});

logger.info('Background service worker initialised');
