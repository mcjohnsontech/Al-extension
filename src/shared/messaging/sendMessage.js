/**
 * shared/messaging/sendMessage.js
 *
 * Promise-based wrappers around chrome.runtime.sendMessage and
 * chrome.tabs.sendMessage. Centralises error handling so callers
 * never need to touch lastError directly.
 */

/**
 * Send a message to the background service worker.
 * @param {object} message  Must contain a `type` field from MESSAGE_TYPES.
 * @returns {Promise<any>}  Resolves with the response payload.
 */
export function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response?.error) {
        return reject(new Error(response.error));
      }
      resolve(response);
    });
  });
}

/**
 * Send a message to a specific tab's content script.
 * @param {number} tabId
 * @param {object} message
 * @returns {Promise<any>}
 */
export function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    console.log(`[sendToTab] Sending ${message.type} to tab ${tabId}`);
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error(`[sendToTab] Error: ${chrome.runtime.lastError.message}`);
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (response?.error) {
        console.error(`[sendToTab] Response error: ${response.error}`);
        return reject(new Error(response.error));
      }
      console.log(`[sendToTab] Success, response:`, response);
      resolve(response);
    });
  });
}
