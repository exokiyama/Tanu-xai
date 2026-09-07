'use strict';

const {
  downloadContentFromMessage,
} = require('@whiskeysockets/baileys');

/**
 * ============================================================
 * MESSAGE UTILITIES
 * Tanu XAI
 * ============================================================
 *
 * Common helper functions for WhatsApp/Baileys messages.
 *
 * NOTE:
 * - file-type is intentionally NOT imported here.
 * - The previous file imported fileTypeFromBuffer but did not
 *   actually use it.
 * - This keeps the project compatible with CommonJS.
 * ============================================================
 */

/**
 * Safely get quoted message.
 */
function getQuotedMessage(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const contextInfo =
    message?.extendedTextMessage?.contextInfo ||
    message?.imageMessage?.contextInfo ||
    message?.videoMessage?.contextInfo ||
    message?.documentMessage?.contextInfo ||
    message?.audioMessage?.contextInfo ||
    message?.stickerMessage?.contextInfo ||
    null;

  return contextInfo?.quotedMessage || null;
}

/**
 * Get message key.
 */
function getMessageKey(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  return message.key || null;
}

/**
 * Get sender JID.
 */
function getSender(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  return (
    message?.key?.participant ||
    message?.key?.remoteJid ||
    null
  );
}

/**
 * Get remote JID.
 */
function getRemoteJid(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  return message?.key?.remoteJid || null;
}

/**
 * Detect whether message is from a group.
 */
function isGroupMessage(message) {
  const jid = getRemoteJid(message);

  return Boolean(
    jid &&
    (
      jid.endsWith('@g.us') ||
      jid.endsWith('@broadcast')
    )
  );
}

/**
 * Get message type.
 */
function getMessageType(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const messageContent = message.message;

  if (!messageContent || typeof messageContent !== 'object') {
    return null;
  }

  const types = Object.keys(messageContent);

  if (!types.length) {
    return null;
  }

  return types[0];
}

/**
 * Extract text from a WhatsApp message.
 */
function extractText(message) {
  if (!message || typeof message !== 'object') {
    return '';
  }

  const msg = message.message || message;

  if (!msg || typeof msg !== 'object') {
    return '';
  }

  // Conversation text
  if (typeof msg.conversation === 'string') {
    return msg.conversation;
  }

  // Extended text
  if (typeof msg.extendedTextMessage?.text === 'string') {
    return msg.extendedTextMessage.text;
  }

  // Image caption
  if (typeof msg.imageMessage?.caption === 'string') {
    return msg.imageMessage.caption;
  }

  // Video caption
  if (typeof msg.videoMessage?.caption === 'string') {
    return msg.videoMessage.caption;
  }

  // Document caption
  if (typeof msg.documentMessage?.caption === 'string') {
    return msg.documentMessage.caption;
  }

  // Buttons response
  if (
    typeof msg.buttonsResponseMessage?.selectedButtonId === 'string'
  ) {
    return msg.buttonsResponseMessage.selectedButtonId;
  }

  // List response
  if (
    typeof msg.listResponseMessage?.singleSelectReply?.selectedRowId ===
      'string'
  ) {
    return msg.listResponseMessage.singleSelectReply.selectedRowId;
  }

  // Template button
  if (
    typeof msg.templateButtonReplyMessage?.selectedId === 'string'
  ) {
    return msg.templateButtonReplyMessage.selectedId;
  }

  // Interactive response
  const interactiveId =
    msg?.interactiveResponseMessage?.nativeFlowResponseMessage
      ?.paramsJson;

  if (typeof interactiveId === 'string') {
    try {
      const parsed = JSON.parse(interactiveId);

      return (
        parsed?.id ||
        parsed?.button_id ||
        parsed?.selected_id ||
        ''
      );
    } catch {
      return interactiveId;
    }
  }

  return '';
}

/**
 * Check whether message contains media.
 */
function hasMedia(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const msg = message.message || message;

  if (!msg || typeof msg !== 'object') {
    return false;
  }

  return Boolean(
    msg.imageMessage ||
    msg.videoMessage ||
    msg.audioMessage ||
    msg.documentMessage ||
    msg.stickerMessage
  );
}

/**
 * Extract media information.
 */
function extractMedia(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }

  const msg = message.message || message;

  if (!msg || typeof msg !== 'object') {
    return null;
  }

  if (msg.imageMessage) {
    return {
      type: 'image',
      message: msg.imageMessage,
    };
  }

  if (msg.videoMessage) {
    return {
      type: 'video',
      message: msg.videoMessage,
    };
  }

  if (msg.audioMessage) {
    return {
      type: 'audio',
      message: msg.audioMessage,
    };
  }

  if (msg.documentMessage) {
    return {
      type: 'document',
      message: msg.documentMessage,
    };
  }

  if (msg.stickerMessage) {
    return {
      type: 'sticker',
      message: msg.stickerMessage,
    };
  }

  return null;
}

/**
 * Download media from a message.
 *
 * @param {Object} mediaMessage
 * @param {String} mediaType
 * @returns {Promise<Buffer>}
 */
async function downloadMedia(mediaMessage, mediaType) {
  if (!mediaMessage || !mediaType) {
    throw new Error('Media message and media type are required');
  }

  const stream = await downloadContentFromMessage(
    mediaMessage,
    mediaType
  );

  const chunks = [];

  for await (const chunk of stream) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Download media directly from a WhatsApp message.
 */
async function downloadMessageMedia(message) {
  const media = extractMedia(message);

  if (!media) {
    throw new Error('Message does not contain downloadable media');
  }

  return downloadMedia(media.message, media.type);
}

/**
 * Validate basic WhatsApp message structure.
 */
function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (!message.key) {
    return false;
  }

  if (!message.message) {
    return false;
  }

  return true;
}

/**
 * Check whether message was sent by the bot itself.
 */
function isFromMe(message) {
  return Boolean(message?.key?.fromMe);
}

/**
 * Get participant number from JID.
 */
function jidToNumber(jid) {
  if (!jid || typeof jid !== 'string') {
    return null;
  }

  const user = jid.split('@')[0];

  if (!user) {
    return null;
  }

  return user.split(':')[0];
}

/**
 * Get message ID.
 */
function getMessageId(message) {
  return message?.key?.id || null;
}

/**
 * Get message timestamp.
 */
function getMessageTimestamp(message) {
  return message?.messageTimestamp || null;
}

/**
 * Delete a message.
 */
async function deleteMessage(sock, message) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  const key = message?.key || message;

  if (!key?.remoteJid || !key?.id) {
    throw new Error('Invalid message key');
  }

  return sock.sendMessage(
    key.remoteJid,
    {
      delete: key,
    }
  );
}

/**
 * Forward a message.
 */
async function forwardMessage(sock, jid, message) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  if (!jid) {
    throw new Error('Destination JID is required');
  }

  if (!message) {
    throw new Error('Message is required');
  }

  return sock.sendMessage(jid, {
    forward: message,
  });
}

/**
 * Mark message as read.
 */
async function markAsRead(sock, message) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  const key = message?.key || message;

  if (!key?.remoteJid || !key?.id) {
    throw new Error('Invalid message key');
  }

  return sock.readMessages([key]);
}

/**
 * Mark message/chat as unread.
 */
async function markAsUnread(sock, jid) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  if (!jid) {
    throw new Error('JID is required');
  }

  return sock.chatModify(
    {
      markRead: false,
    },
    jid
  );
}

/**
 * Pin a chat.
 */
async function pinChat(sock, jid) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  if (!jid) {
    throw new Error('JID is required');
  }

  return sock.chatModify(
    {
      pin: true,
    },
    jid
  );
}

/**
 * Unpin a chat.
 */
async function unpinChat(sock, jid) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  if (!jid) {
    throw new Error('JID is required');
  }

  return sock.chatModify(
    {
      pin: false,
    },
    jid
  );
}

/**
 * Archive a chat.
 */
async function archiveChat(sock, jid) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  if (!jid) {
    throw new Error('JID is required');
  }

  return sock.chatModify(
    {
      archive: true,
    },
    jid
  );
}

/**
 * Set disappearing messages.
 */
async function setDisappearingMessages(
  sock,
  jid,
  duration
) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  if (!jid) {
    throw new Error('JID is required');
  }

  return sock.sendMessage(jid, {
    disappearingMessagesInChat: {
      ephemeralExpiration: duration,
    },
  });
}

/**
 * Send presence update.
 */
async function sendPresenceUpdate(
  sock,
  presence,
  jid
) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  return sock.sendPresenceUpdate(
    presence,
    jid
  );
}

/**
 * Star or unstar a message.
 */
async function starMessage(
  sock,
  message,
  star = true
) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  const key = message?.key || message;

  if (!key?.remoteJid || !key?.id) {
    throw new Error('Invalid message key');
  }

  return sock.chatModify(
    {
      star: {
        messages: [
          {
            id: key.id,
            fromMe: Boolean(key.fromMe),
          },
        ],
        star,
      },
    },
    key.remoteJid
  );
}

/**
 * Mute a chat.
 *
 * @param {Object} sock
 * @param {String} jid
 * @param {Number} duration
 */
async function muteChat(
  sock,
  jid,
  duration
) {
  if (!sock) {
    throw new Error('WhatsApp socket is required');
  }

  if (!jid) {
    throw new Error('JID is required');
  }

  return sock.chatModify(
    {
      mute: duration,
    },
    jid
  );
}

/**
 * Get useful message information.
 */
function getMessageInfo(message) {
  if (!message || typeof message !== 'object') {
    return {
      valid: false,
      id: null,
      jid: null,
      sender: null,
      type: null,
      text: '',
      isGroup: false,
      fromMe: false,
      hasMedia: false,
      timestamp: null,
    };
  }

  const jid = getRemoteJid(message);
  const sender = getSender(message);
  const type = getMessageType(message);

  return {
    valid: validateMessage(message),
    id: getMessageId(message),
    jid,
    sender,
    senderNumber: jidToNumber(sender),
    type,
    text: extractText(message),
    isGroup: isGroupMessage(message),
    fromMe: isFromMe(message),
    hasMedia: hasMedia(message),
    timestamp: getMessageTimestamp(message),
    quoted: Boolean(getQuotedMessage(message)),
  };
}

/**
 * Copy text from message.
 */
function copyText(message) {
  return extractText(message);
}

/**
 * Normalize a JID.
 */
function normalizeJid(jid) {
  if (!jid || typeof jid !== 'string') {
    return null;
  }

  return jid.trim();
}

/**
 * Get quoted message key.
 */
function getQuotedMessageKey(message) {
  const contextInfo =
    message?.message?.extendedTextMessage?.contextInfo ||
    message?.message?.imageMessage?.contextInfo ||
    message?.message?.videoMessage?.contextInfo ||
    message?.message?.documentMessage?.contextInfo ||
    message?.message?.audioMessage?.contextInfo ||
    message?.message?.stickerMessage?.contextInfo;

  return contextInfo?.stanzaId
    ? {
        remoteJid: contextInfo.remoteJid,
        id: contextInfo.stanzaId,
        participant: contextInfo.participant,
      }
    : null;
}

/**
 * Check whether message has a quoted message.
 */
function hasQuotedMessage(message) {
  return Boolean(getQuotedMessage(message));
}

/**
 * Safely parse JSON.
 */
function safeJsonParse(value, fallback = null) {
  if (typeof value !== 'string') {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

/**
 * Get command prefix/text.
 */
function getCommandText(message, prefixes = ['!']) {
  const text = extractText(message);

  if (!text) {
    return {
      isCommand: false,
      prefix: null,
      command: '',
      args: [],
      text: '',
    };
  }

  const prefixList = Array.isArray(prefixes)
    ? prefixes
    : [prefixes];

  const matchedPrefix = prefixList.find(
    (prefix) =>
      typeof prefix === 'string' &&
      text.startsWith(prefix)
  );

  if (!matchedPrefix) {
    return {
      isCommand: false,
      prefix: null,
      command: '',
      args: [],
      text,
    };
  }

  const body = text
    .slice(matchedPrefix.length)
    .trim();

  if (!body) {
    return {
      isCommand: false,
      prefix: matchedPrefix,
      command: '',
      args: [],
      text,
    };
  }

  const parts = body.split(/\s+/);
  const command = parts.shift().toLowerCase();

  return {
    isCommand: true,
    prefix: matchedPrefix,
    command,
    args: parts,
    text,
  };
}

/**
 * ============================================================
 * MODULE EXPORTS
 * ============================================================
 */

module.exports = {
  getQuotedMessage,
  getQuotedMessageKey,
  hasQuotedMessage,

  getMessageKey,
  getMessageId,
  getMessageTimestamp,

  getSender,
  getRemoteJid,
  jidToNumber,
  normalizeJid,

  isGroupMessage,
  isFromMe,

  getMessageType,
  extractText,
  copyText,

  hasMedia,
  extractMedia,

  downloadMedia,
  downloadMessageMedia,

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

  safeJsonParse,
  getCommandText,
};
