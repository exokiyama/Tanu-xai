const { getProtection, updateProtection } = require('../utils/protection.js');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const fs = require('fs/promises');
const path = require('path');

/**
 * StatusHandler - Centralized handler for WhatsApp Status events
 *
 * This class manages all status-related features:
 * - Auto-view statuses
 * - Auto-download status media
 * - Status forwarding
 *
 * IMPORTANT: This should be registered ONLY ONCE in index.js
 */
class StatusHandler {
  constructor(sock, config, db) {
    this.sock = sock;
    this.config = config;
    this.db = db;
    this.listeners = [];
    this.statusStoragePath = './tmp/statuses';

    // Ensure storage directory exists
    this.ensureStorageDirectory();
  }

  /**
   * Ensure status storage directory exists
   */
  async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.statusStoragePath, { recursive: true });
    } catch (error) {
      console.error('[StatusHandler] Failed to create storage directory:', error.message);
    }
  }

  /**
   * Register a listener for status events
   * @param {string} featureName - Name of the feature (e.g., 'autoview', 'autodl')
   * @param {Function} callback - Async function to handle status messages
   */
  registerListener(featureName, callback) {
    // Prevent duplicate registration
    if (this.listeners.find(l => l.name === featureName)) {
      console.log(`[StatusHandler] Listener '${featureName}' already registered, skipping`);
      return;
    }

    this.listeners.push({ name: featureName, callback });
    console.log(`[StatusHandler] Registered listener: ${featureName}`);
  }

  /**
   * Check if a message is a status update
   * @param {Object} message - Baileys message object
   * @returns {boolean}
   */
  isStatusMessage(message) {
    if (!message || !message.key) return false;

    // Status messages come from status@broadcast
    const remoteJid = message.key.remoteJid;
    return remoteJid === 'status@broadcast';
  }

  /**
   * Extract sender JID from status message
   * @param {Object} message - Baileys message object
   * @returns {string|null}
   */
  getStatusSender(message) {
    if (!message || !message.key) return null;
    return message.key.participant || null;
  }

  /**
   * Handle incoming status message
   * Fans out to all registered listeners
   * @param {Object} message - Baileys message object
   */
  async handleStatusMessage(message) {
    if (!this.isStatusMessage(message)) {
      return;
    }

    const sender = this.getStatusSender(message);
    console.log(`[StatusHandler] Received status from: ${sender}`);

    // Fan out to all registered listeners
    for (const listener of this.listeners) {
      try {
        await listener.callback(message, this.sock, this.config, this.db);
      } catch (error) {
        console.error(`[StatusHandler] Listener '${listener.name}' error:`, error.message);
        // Continue processing other listeners even if one fails
      }
    }
  }

  /**
   * Extract media from status message
   * @param {Object} message - Baileys message object
   * @returns {Promise<{buffer: Buffer, type: string, caption?: string}>}
   */
  async extractStatusMedia(message) {
    if (!message || !message.message) {
      throw new Error('No message content');
    }

    const msgType = Object.keys(message.message)[0];

    // Handle different status types
    let mediaType;
    let content;

    switch (msgType) {
      case 'imageMessage':
        mediaType = 'image';
        content = message.message.imageMessage;
        break;
      case 'videoMessage':
        mediaType = 'video';
        content = message.message.videoMessage;
        break;
      case 'audioMessage':
        mediaType = 'audio';
        content = message.message.audioMessage;
        break;
      case 'documentMessage':
        mediaType = 'document';
        content = message.message.documentMessage;
        break;
      case 'conversation':
        mediaType = 'text';
        return {
          buffer: Buffer.from(message.message.conversation),
          type: 'text',
          caption: message.message.conversation
        };
      case 'extendedTextMessage':
        mediaType = 'text';
        return {
          buffer: Buffer.from(message.message.extendedTextMessage.text),
          type: 'text',
          caption: message.message.extendedTextMessage.text
        };
      default:
        throw new Error(`Unsupported status media type: ${msgType}`);
    }

    // Download media content
    try {
      const stream = await downloadContentFromMessage(content, mediaType);
      const chunks = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      return {
        buffer,
        type: mediaType,
        caption: content.caption || ''
      };
    } catch (error) {
      throw new Error(`Failed to download status media: ${error.message}`);
    }
  }

  /**
   * Save status media to storage
   * @param {Buffer} buffer - Media buffer
   * @param {Object} metadata - Status metadata
   * @returns {Promise<string>} Path to saved file
   */
  async saveStatusMedia(buffer, metadata) {
    const timestamp = Date.now();
    const ext = this.getExtensionForType(metadata.type);
    const filename = `${timestamp}_${metadata.sender}_${ext}`;
    const filepath = path.join(this.statusStoragePath, filename);

    await fs.writeFile(filepath, buffer);

    // Store metadata in database if available
    if (this.db) {
      try {
        await this.db.insert('status_media', {
          filename,
          filepath,
          sender: metadata.sender,
          type: metadata.type,
          caption: metadata.caption,
          timestamp,
          received_at: new Date().toISOString()
        });
      } catch (error) {
        console.error('[StatusHandler] Failed to store status metadata:', error.message);
      }
    }

    return filepath;
  }

  /**
   * Get file extension for media type
   */
  getExtensionForType(type) {
    const extensions = {
      image: 'jpg',
      video: 'mp4',
      audio: 'mp3',
      document: 'bin',
      text: 'txt'
    };
    return extensions[type] || 'bin';
  }

  /**
   * Get status configuration for a user
   * @param {string} userId - User JID
   * @returns {Promise<Object>}
   */
  async getStatusConfig(userId) {
    // Try to get from database first
    if (this.db) {
      try {
        const config = await this.db.findOne('status_config', { userId });
        if (config) {
          return config;
        }
      } catch (error) {
        console.error('[StatusHandler] Failed to get status config:', error.message);
      }
    }

    // Default configuration
    return {
      userId,
      autoview: false,
      autodl: false,
      statusforward: null,
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Set status configuration for a user
   * @param {string} userId - User JID
   * @param {Object} config - Configuration object
   * @returns {Promise<boolean>}
   */
  async setStatusConfig(userId, config) {
    if (!this.db) {
      console.warn('[StatusHandler] Database not available, config not persisted');
      return false;
    }

    try {
      config.updated_at = new Date().toISOString();

      const existing = await this.db.findOne('status_config', { userId });

      if (existing) {
        await this.db.update('status_config', { userId }, config);
      } else {
        config.userId = userId;
        await this.db.insert('status_config', config);
      }

      return true;
    } catch (error) {
      console.error('[StatusHandler] Failed to set status config:', error.message);
      return false;
    }
  }

  /**
   * Cleanup old status files
   * @param {number} maxAgeMs - Maximum age in milliseconds
   * @returns {Promise<number>} Number of files cleaned up
   */
  async cleanupOldStatus(maxAgeMs = 48 * 60 * 60 * 1000) { // Default 48 hours
    try {
      const files = await fs.readdir(this.statusStoragePath);
      const now = Date.now();
      let cleaned = 0;

      for (const file of files) {
        const filepath = path.join(this.statusStoragePath, file);
        const stats = await fs.stat(filepath);

        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filepath);
          cleaned++;

          // Also remove from database
          if (this.db) {
            await this.db.delete('status_media', { filename: file });
          }
        }
      }

      if (cleaned > 0) {
        console.log(`[StatusHandler] Cleaned up ${cleaned} old status files`);
      }

      return cleaned;
    } catch (error) {
      console.error('[StatusHandler] Cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Mark status as viewed (auto-view)
   * @param {string} senderJid - Status sender JID
   */
  async markStatusAsViewed(senderJid) {
    try {
      // Use Baileys sendReceipt to acknowledge status view
      await this.sock.sendReceipt(
        'status@broadcast',
        senderJid,
        ['read'] // or appropriate receipt type
      );
      console.log(`[StatusHandler] Auto-viewed status from ${senderJid}`);
    } catch (error) {
      console.error(`[StatusHandler] Failed to mark status as viewed: ${error.message}`);
    }
  }

  /**
   * Forward status to configured destination
   * @param {Object} message - Original status message
   * @param {string} destinationJid - Destination JID
   */
  async forwardStatus(message, destinationJid) {
    try {
      if (!destinationJid) {
        console.warn('[StatusHandler] No destination configured for status forwarding');
        return;
      }

      // Forward the status message to destination
      await this.sock.copyNForward(
        destinationJid,
        message,
        true // Force update
      );

      console.log(`[StatusHandler] Forwarded status to ${destinationJid}`);
    } catch (error) {
      console.error(`[StatusHandler] Failed to forward status: ${error.message}`);
    }
  }
}

// Export singleton instance creator
function createStatusHandler(sock, config, db) {
  return new StatusHandler(sock, config, db);
}

module.exports = {
  StatusHandler,
  createStatusHandler
};
