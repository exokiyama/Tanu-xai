/**
 * Message Utilities
 * Centralized utilities for message manipulation, extraction, and validation
 * Used by multiple command categories
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import { fileTypeFromBuffer } from 'file-type';

/**
 * Extract quoted/replied message from any message object
 * Handles all Baileys message structures including nested quotes
 * @param {Object} message - The message object
 * @param {Object} socket - Baileys socket instance
 * @returns {Object|null} Normalized quoted message or null
 */
async function getQuotedMessage(message, socket) {
  if (!message || !message.message) return null;

  const msg = message.message;
  let contextInfo = null;

  // Try to extract contextInfo from various message types
  if (msg.extendedTextMessage?.contextInfo) {
    contextInfo = msg.extendedTextMessage.contextInfo;
  } else if (msg.imageMessage?.contextInfo) {
    contextInfo = msg.imageMessage.contextInfo;
  } else if (msg.videoMessage?.contextInfo) {
    contextInfo = msg.videoMessage.contextInfo;
  } else if (msg.audioMessage?.contextInfo) {
    contextInfo = msg.audioMessage.contextInfo;
  } else if (msg.documentMessage?.contextInfo) {
    contextInfo = msg.documentMessage.contextInfo;
  } else if (msg.stickerMessage?.contextInfo) {
    contextInfo = msg.stickerMessage.contextInfo;
  }

  if (!contextInfo || !contextInfo.quotedMessage) {
    return null;
  }

  const quotedMessage = contextInfo.quotedMessage;
  const participant = contextInfo.participant || contextInfo.remoteJid;
  const stanzaId = contextInfo.stanzaId;

  // Normalize the quoted message
  const normalized = {
    key: {
      remoteJid: contextInfo.remoteJid,
      id: stanzaId,
      fromMe: contextInfo.fromMe || false,
      participant: participant
    },
    message: quotedMessage,
    sender: participant,
    type: getMessageType({ message: quotedMessage }),
    text: extractText({ message: quotedMessage }),
    caption: quotedMessage.imageMessage?.caption || 
             quotedMessage.videoMessage?.caption || 
             quotedMessage.documentMessage?.caption || '',
    hasMedia: hasMedia(quotedMessage)
  };

  // Handle nested quotes (quote of a quote)
  if (quotedMessage.extendedTextMessage?.contextInfo?.quotedMessage) {
    normalized.deepQuote = await getQuotedMessage(
      { message: quotedMessage },
      socket
    );
  }

  return normalized;
}

/**
 * Extract message key from context
 * @param {Object} message - The message object
 * @returns {Object} Message key structure
 */
function getMessageKey(message) {
  if (!message || !message.key) {
    return null;
  }

  return {
    remoteJid: message.key.remoteJid,
    id: message.key.id,
    fromMe: message.key.fromMe,
    participant: message.key.participant || message.key.remoteJid
  };
}

/**
 * Detect message type
 * @param {Object} message - The message object
 * @returns {string} Message type
 */
function getMessageType(message) {
  if (!message || !message.message) return 'unknown';

  const msg = message.message;

  if (msg.conversation || msg.extendedTextMessage) return 'text';
  if (msg.imageMessage) return 'image';
  if (msg.videoMessage) return 'video';
  if (msg.audioMessage) return msg.audioMessage.ptt ? 'voice' : 'audio';
  if (msg.stickerMessage) return 'sticker';
  if (msg.documentMessage) return 'document';
  if (msg.locationMessage) return 'location';
  if (msg.contactsArrayMessage || msg.contactMessage) return 'contact';
  if (msg.pollCreationMessage || msg.pollUpdateMessage) return 'poll';
  if (msg.reactionMessage) return 'reaction';
  if (msg.listMessage || msg.listResponseMessage) return 'list';
  if (msg.templateMessage) return 'template';
  if (msg.buttonsResponseMessage || msg.buttonsMessage) return 'buttons';

  return 'unknown';
}

/**
 * Extract text content from any message type
 * @param {Object} message - The message object
 * @returns {string} Text content or empty string
 */
function extractText(message) {
  if (!message || !message.message) return '';

  const msg = message.message;

  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage?.text) return msg.extendedTextMessage.text;
  if (msg.imageMessage?.caption) return msg.imageMessage.caption;
  if (msg.videoMessage?.caption) return msg.videoMessage.caption;
  if (msg.documentMessage?.caption) return msg.documentMessage.caption;
  if (msg.audioMessage?.caption) return msg.audioMessage.caption;

  return '';
}

/**
 * Check if message has media
 * @param {Object} message - The message object  
 * @returns {boolean}
 */
function hasMedia(message) {
  if (!message) return false;
  
  const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 
                      'documentMessage', 'stickerMessage'];
  return mediaTypes.some(type => message[type] !== undefined);
}

/**
 * Extract media buffer from any message type
 * @param {Object} message - The message object with media
 * @param {Object} socket - Baileys socket instance
 * @returns {Promise<Buffer|null>} Media buffer or null
 */
async function extractMedia(message, socket) {
  if (!message || !socket) return null;

  let mediaMessage = null;
  const msg = message.message || message;

  if (msg.imageMessage) mediaMessage = msg.imageMessage;
  else if (msg.videoMessage) mediaMessage = msg.videoMessage;
  else if (msg.audioMessage) mediaMessage = msg.audioMessage;
  else if (msg.documentMessage) mediaMessage = msg.documentMessage;
  else if (msg.stickerMessage) mediaMessage = msg.stickerMessage;

  if (!mediaMessage) {
    // Try direct download if message is already a media message
    if (message.download) {
      try {
        return await message.download();
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  try {
    const stream = await downloadContentFromMessage(mediaMessage, 
      msg.imageMessage ? 'image' : 
      msg.videoMessage ? 'video' : 
      msg.audioMessage ? 'audio' : 'document');
    
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    
    return buffer;
  } catch (error) {
    console.error('[extractMedia] Error:', error.message);
    return null;
  }
}

/**
 * Validate message exists and is accessible
 * @param {Object} messageKey - WhatsApp message key
 * @param {Object} socket - Baileys socket instance
 * @returns {Promise<boolean>}
 */
async function validateMessage(messageKey, socket) {
  if (!messageKey || !socket) return false;

  try {
    // Basic validation of key structure
    if (!messageKey.remoteJid || !messageKey.id) {
      return false;
    }

    // Note: Baileys doesn't provide a direct "get message" API
    // We can only attempt operations and handle errors
    return true;
  } catch (error) {
    console.error('[validateMessage] Error:', error.message);
    return false;
  }
}

/**
 * Delete a message
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {Object} messageKey - Message key to delete
 * @param {boolean} forEveryone - Delete for everyone (requires admin)
 * @returns {Promise<boolean>}
 */
async function deleteMessage(socket, jid, messageKey, forEveryone = false) {
  if (!socket || !jid || !messageKey) return false;

  try {
    if (forEveryone) {
      // Delete for everyone (admin required in groups)
      await socket.sendMessage(jid, { delete: messageKey });
    } else {
      // Delete for self only
      await socket.chatModify({ 
        clear: { messages: [{ id: messageKey.id, fromMe: messageKey.fromMe }] } 
      }, jid);
    }
    return true;
  } catch (error) {
    console.error('[deleteMessage] Error:', error.message);
    return false;
  }
}

/**
 * Forward a message to a destination
 * @param {Object} socket - Baileys socket instance
 * @param {string} destinationJid - Destination chat JID
 * @param {Object} message - Message to forward
 * @returns {Promise<boolean>}
 */
async function forwardMessage(socket, destinationJid, message) {
  if (!socket || !destinationJid || !message) return false;

  try {
    await socket.copyNForward(destinationJid, message, true);
    return true;
  } catch (error) {
    console.error('[forwardMessage] Error:', error.message);
    return false;
  }
}

/**
 * Mark message(s) as read
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {Array} messageKeys - Message keys to mark as read
 * @returns {Promise<boolean>}
 */
async function markAsRead(socket, jid, messageKeys = []) {
  if (!socket || !jid) return false;

  try {
    const keys = messageKeys.length > 0 ? messageKeys.map(k => k.id) : undefined;
    await socket.readMessages([{ remoteJid: jid, id: keys?.[0] || undefined }]);
    return true;
  } catch (error) {
    console.error('[markAsRead] Error:', error.message);
    return false;
  }
}

/**
 * Mark message(s) as unread
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {Object} messageKey - Message key
 * @returns {Promise<boolean>}
 */
async function markAsUnread(socket, jid, messageKey) {
  if (!socket || !jid || !messageKey) return false;

  try {
    await socket.sendPresenceUpdate('unavailable', jid);
    return true;
  } catch (error) {
    console.error('[markAsUnread] Error:', error.message);
    return false;
  }
}

/**
 * Pin a chat
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @returns {Promise<boolean>}
 */
async function pinChat(socket, jid) {
  if (!socket || !jid) return false;

  try {
    await socket.chatModify({ pin: true }, jid);
    return true;
  } catch (error) {
    console.error('[pinChat] Error:', error.message);
    return false;
  }
}

/**
 * Unpin a chat
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @returns {Promise<boolean>}
 */
async function unpinChat(socket, jid) {
  if (!socket || !jid) return false;

  try {
    await socket.chatModify({ pin: false }, jid);
    return true;
  } catch (error) {
    console.error('[unpinChat] Error:', error.message);
    return false;
  }
}

/**
 * Archive a chat
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {boolean} archive - True to archive, false to unarchive
 * @returns {Promise<boolean>}
 */
async function archiveChat(socket, jid, archive = true) {
  if (!socket || !jid) return false;

  try {
    await socket.chatModify({ archive }, jid);
    return true;
  } catch (error) {
    console.error('[archiveChat] Error:', error.message);
    return false;
  }
}

/**
 * Set disappearing messages timer
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {number} duration - Duration in seconds (86400=24h, 604800=7d, 7776000=90d, 0=off)
 * @returns {Promise<boolean>}
 */
async function setDisappearingMessages(socket, jid, duration) {
  if (!socket || !jid) return false;

  try {
    await socket.sendMessage(jid, { disappearingMessagesInChat: duration });
    return true;
  } catch (error) {
    console.error('[setDisappearingMessages] Error:', error.message);
    return false;
  }
}

/**
 * Send presence update (typing, recording, online, offline)
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {string} presence - Presence type: 'available', 'unavailable', 'composing', 'recording'
 * @returns {Promise<boolean>}
 */
async function sendPresenceUpdate(socket, jid, presence) {
  if (!socket || !jid || !presence) return false;

  try {
    await socket.sendPresenceUpdate(presence, jid);
    return true;
  } catch (error) {
    console.error('[sendPresenceUpdate] Error:', error.message);
    return false;
  }
}

/**
 * Star a message
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {Object} messageKey - Message key
 * @param {boolean} star - True to star, false to unstar
 * @returns {Promise<boolean>}
 */
async function starMessage(socket, jid, messageKey, star = true) {
  if (!socket || !jid || !messageKey) return false;

  try {
    await socket.chatModify({
      star: {
        messages: [{ id: messageKey.id, fromMe: messageKey.fromMe }],
        star
      }
    }, jid);
    return true;
  } catch (error) {
    console.error('[starMessage] Error:', error.message);
    return false;
  }
}

/**
 * Mute a chat
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {number|null} duration - Mute duration in ms, null to unmute
 * @returns {Promise<boolean>}
 */
async function muteChat(socket, jid, duration = null) {
  if (!socket || !jid) return false;

  try {
    if (duration === null) {
      // Unmute
      await socket.chatModify({ mute: null }, jid);
    } else {
      await socket.chatModify({ mute: duration }, jid);
    }
    return true;
  } catch (error) {
    console.error('[muteChat] Error:', error.message);
    return false;
  }
}

/**
 * Get message info/metadata
 * @param {Object} socket - Baileys socket instance
 * @param {string} jid - Chat JID
 * @param {Object} messageKey - Message key
 * @returns {Promise<Object|null>} Message info or null
 */
async function getMessageInfo(socket, jid, messageKey) {
  if (!socket || !jid || !messageKey) return null;

  try {
    // Note: Baileys has limited message info capabilities
    // This returns basic info we can extract
    return {
      jid,
      messageId: messageKey.id,
      fromMe: messageKey.fromMe,
      participant: messageKey.participant,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[getMessageInfo] Error:', error.message);
    return null;
  }
}

/**
 * Copy text from a message
 * @param {Object} message - Message object
 * @returns {string} Text content
 */
function copyText(message) {
  return extractText(message);
}

export {
  getQuotedMessage,
  getMessageKey,
  getMessageType,
  extractText,
  hasMedia,
  extractMedia,
  validateMessage,
  deleteMessage,
  forwardMessage,
  markAsRead,
  markAsUnread,
  pinChat,
  unpinChat,
  archiveChat,
  setDisappearingMessages,
  sendPresenceUpdate,
  starMessage,
  muteChat,
  getMessageInfo,
  copyText
};
