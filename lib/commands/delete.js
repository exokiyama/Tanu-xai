/**
 * Command: delete
 * Category: 💬 Message
 * Description: Delete messages (own or others' with admin permission)
 */

import { getQuotedMessage, getMessageKey, deleteMessage } from '../utils/message.js';
import { isAdmin, isBotAdmin } from '../utils/group.js';
import { checkRateLimit } from '../utils/rate-limiter.js';

export const command = {
  name: 'delete',
  pattern: 'delete',
  aliases: ['del', 'd'],
  category: '💬 Message',
  description: 'Delete messages (own or others\' with admin permission)',
  usage: '.delete (reply to a message)',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, senderJid, isGroup, isOwner } = context;

    // Rate limit: 10 deletions per minute per user
    const rateLimitKey = `delete:${senderJid}`;
    if (!checkRateLimit(rateLimitKey, 10, 60)) {
      return reply('⏱️ Please wait before deleting more messages. Rate limit: 10 per minute.');
    }

    // Get quoted message
    const quoted = await getQuotedMessage(message, sock);
    
    if (!quoted) {
      return reply(
        '🗑️ *Delete Message*\n\n' +
        'Delete a message by replying to it.\n\n' +
        '*Permissions:*\n' +
        '• Your own messages: Anyone can delete\n' +
        '• Others\' messages in groups: Requires bot admin + your admin\n' +
        '• Others\' messages in DM: Cannot delete (WhatsApp limitation)\n\n' +
        '*Usage:* `.delete` (reply to a message)'
      );
    }

    try {
      const messageKey = quoted.key;
      const isFromBot = messageKey.fromMe;
      const isFromSender = messageKey.participant === senderJid || messageKey.remoteJid === senderJid;

      // Determine if we can delete
      let canDelete = false;
      let deleteForEveryone = false;

      if (isFromBot || isFromSender) {
        // Can always delete own messages or bot's messages
        canDelete = true;
        deleteForEveryone = true; // Delete for everyone since it's our message
      } else if (isGroup) {
        // In group, need bot admin AND user admin to delete others' messages
        const [userIsAdmin, botIsAdmin] = await Promise.all([
          isAdmin(sock, chatId, senderJid),
          isBotAdmin(sock, chatId)
        ]);

        if (botIsAdmin && userIsAdmin) {
          canDelete = true;
          deleteForEveryone = true;
        } else if (!botIsAdmin) {
          return reply('❌ Bot must be an admin to delete other users\' messages.');
        } else {
          return reply('❌ You must be an admin to delete other users\' messages.');
        }
      } else {
        // In DM, cannot delete others' messages
        return reply('❌ Cannot delete other users\' messages in private chats.');
      }

      if (!canDelete) {
        return reply('❌ Unable to delete this message.');
      }

      // Perform deletion
      const success = await deleteMessage(sock, chatId, messageKey, deleteForEveryone);

      if (success) {
        return reply(`✅ Message deleted ${deleteForEveryone ? 'for everyone' : 'for you'}.`);
      } else {
        return reply('❌ Failed to delete message. It may have been already deleted.');
      }

    } catch (error) {
      console.error('[Delete] Error:', error.message);
      return reply('❌ Failed to delete message. Make sure you\'re replying to a valid message.');
    }
  }
};

export default command;
