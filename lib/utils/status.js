import { getProtection, updateProtection } from '../utils/protection.js';

/**
 * Status utilities for WhatsApp status operations
 */

/**
 * Check if a message is a status message
 * @param {Object} message - Baileys message object
 * @returns {boolean}
 */
export async function isStatusMessage(message) {
  if (!message || !message.key) return false;
  return message.key.remoteJid === 'status@broadcast';
}

/**
 * Extract media from a status message
 * @param {Object} message - Baileys message object
 * @returns {Promise<Object>} Media data
 */
export async function extractStatusMedia(message) {
  // This is a wrapper around the StatusHandler method
  // The actual implementation is in status-handler.js
  throw new Error('Use StatusHandler.extractStatusMedia() instead');
}

/**
 * Save status media to storage
 * @param {Buffer} buffer - Media buffer
 * @param {Object} metadata - Metadata
 * @returns {Promise<string>} File path
 */
export async function saveStatusMedia(buffer, metadata) {
  throw new Error('Use StatusHandler.saveStatusMedia() instead');
}

/**
 * Get status configuration for a user
 * @param {string} userId - User JID
 * @returns {Promise<Object>}
 */
export async function getStatusConfig(userId) {
  throw new Error('Use StatusHandler.getStatusConfig() instead');
}

/**
 * Set status configuration for a user
 * @param {string} userId - User JID
 * @param {Object} config - Configuration
 * @returns {Promise<boolean>}
 */
export async function setStatusConfig(userId, config) {
  throw new Error('Use StatusHandler.setStatusConfig() instead');
}

/**
 * Cleanup old status files
 * @param {number} maxAgeMs - Maximum age in ms
 * @returns {Promise<number>}
 */
export async function cleanupOldStatus(maxAgeMs = 48 * 60 * 60 * 1000) {
  throw new Error('Use StatusHandler.cleanupOldStatus() instead');
}

/**
 * Parse status feature argument
 * @param {string} arg - Argument string
 * @returns {Object} Parsed action
 */
export function parseStatusAction(arg) {
  if (!arg) return { action: 'help' };
  
  const lowerArg = arg.toLowerCase();
  
  if (lowerArg === 'on' || lowerArg === 'enable') {
    return { action: 'enable' };
  }
  
  if (lowerArg === 'off' || lowerArg === 'disable') {
    return { action: 'disable' };
  }
  
  if (lowerArg === 'contacts' || lowerArg === 'contact') {
    return { action: 'contacts' };
  }
  
  if (lowerArg === 'all') {
    return { action: 'all' };
  }
  
  // Check for JID pattern
  const jidRegex = /^[0-9]{5,16}@[sg]\.whatsapp\.net$/;
  if (jidRegex.test(lowerArg)) {
    return { action: 'jid', jid: lowerArg };
  }
  
  return { action: 'invalid', original: arg };
}

export default {
  isStatusMessage,
  parseStatusAction
};
