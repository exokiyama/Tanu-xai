/**
 * Group utility functions for WhatsApp bot
 * Provides reusable logic for group management operations
 */

/**
 * Parse mentions from text message
 * @param {string} text - Message text containing @mentions
 * @returns {string[]} Array of JIDs
 */
function parseMentions(text) {
  if (!text) return [];
  const regex = /@([0-9]{5,16}|0)/g;
  const matches = text.match(regex) || [];
  return matches.map(match => match.replace('@', '') + '@s.whatsapp.net');
}

/**
 * Get user JID from quoted message or text mentions
 * @param {object} message - WhatsApp message object
 * @param {string} text - Message text
 * @returns {string|null} User JID or null
 */
function getUserFromContext(message, text) {
  // Check if message is a reply
  if (message.quoted && message.quoted.sender) {
    return message.quoted.sender;
  }
  
  // Parse mentions from text
  const mentions = parseMentions(text);
  if (mentions.length > 0) {
    return mentions[0];
  }
  
  return null;
}

/**
 * Get all user JIDs from context (quoted or multiple mentions)
 * @param {object} message - WhatsApp message object
 * @param {string} text - Message text
 * @returns {string[]} Array of user JIDs
 */
function getUsersFromContext(message, text) {
  // Check if message is a reply
  if (message.quoted && message.quoted.sender) {
    return [message.quoted.sender];
  }
  
  // Parse all mentions from text
  return parseMentions(text);
}

/**
 * Check if bot is admin in group
 * @param {Array} participants - Group participants array
 * @param {string} botJid - Bot's JID
 * @returns {boolean} True if bot is admin
 */
function isBotAdmin(participants, botJid) {
  if (!participants || !botJid) return false;
  const bot = participants.find(p => p.id === botJid);
  return bot && (bot.admin === 'admin' || bot.admin === 'superadmin');
}

/**
 * Check if user is admin in group
 * @param {Array} participants - Group participants array
 * @param {string} userJid - User's JID
 * @returns {boolean} True if user is admin
 */
function isAdmin(participants, userJid) {
  if (!participants || !userJid) return false;
  const user = participants.find(p => p.id === userJid);
  return user && (user.admin === 'admin' || user.admin === 'superadmin');
}

/**
 * Normalize phone number to JID format
 * @param {string} number - Phone number
 * @returns {string} JID format
 */
function normalizeJid(number) {
  const cleaned = number.replace(/\D/g, '');
  if (cleaned.endsWith('@s.whatsapp.net') || cleaned.endsWith('@g.us')) {
    return cleaned;
  }
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Format JID to display name (remove @s.whatsapp.net)
 * @param {string} jid - User JID
 * @returns {string} Display name
 */
function formatJid(jid) {
  return jid.split('@')[0];
}

/**
 * Tag all members in a group
 * @param {object} sock - WhatsApp socket
 * @param {string} chatId - Group chat ID
 * @param {Array} participants - Group participants
 * @param {string} message - Message to send
 */
async function tagAllMembers(sock, chatId, participants, message = '') {
  const mentionedJid = participants.map(p => p.id);
  
  let text = `乂 *GROUP TAG ALL*\n\n`;
  text += `*Total Members:* ${participants.length}\n\n`;
  
  if (message) {
    text += `${message}\n\n`;
  }
  
  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    text += `*${i + 1}.* @${formatJid(p.id)}\n`;
  }
  
  await sock.sendMessage(chatId, {
    text: text,
    mentions: mentionedJid
  });
}

/**
 * Get group metadata safely
 * @param {object} sock - WhatsApp socket
 * @param {string} chatId - Group chat ID
 * @returns {object|null} Group metadata or null
 */
async function getGroupMetadata(sock, chatId) {
  try {
    if (!chatId.endsWith('@g.us')) {
      return null;
    }
    return await sock.groupMetadata(chatId);
  } catch (error) {
    console.error('[GroupUtils] Error fetching group metadata:', error.message);
    return null;
  }
}

/**
 * Validate users are in group and not admins (for kick/demote)
 * @param {Array} users - Array of user JIDs
 * @param {Array} participants - Group participants
 * @returns {object} Validation result with valid/invalid users
 */
function validateUsersForAction(users, participants, excludeAdmins = true) {
  const valid = [];
  const invalid = [];
  const alreadyAdmin = [];
  const notInGroup = [];
  
  for (const user of users) {
    const participant = participants.find(p => p.id === user);
    
    if (!participant) {
      notInGroup.push(user);
      invalid.push(user);
    } else if (excludeAdmins && participant.admin) {
      alreadyAdmin.push(user);
      invalid.push(user);
    } else {
      valid.push(user);
    }
  }
  
  return { valid, invalid, alreadyAdmin, notInGroup };
}

module.exports = {
  parseMentions,
  getUserFromContext,
  getUsersFromContext,
  isBotAdmin,
  isAdmin,
  normalizeJid,
  formatJid,
  tagAllMembers,
  getGroupMetadata,
  validateUsersForAction
};
