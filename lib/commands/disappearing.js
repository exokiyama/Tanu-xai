/**
 * Command: disappearing
 * Category: 💬 Message
 * Description: Set disappearing messages timer for chat
 */

import { setDisappearingMessages } from '../utils/message.js';
import { formatBox } from '../utils/format.js';
import { isAdmin, isBotAdmin } from '../utils/group.js';

export const command = {
  name: 'disappearing',
  pattern: 'disappearing',
  aliases: ['ephemeral', 'disappear', 'dm'],
  category: '💬 Message',
  description: 'Set disappearing messages timer for the chat',
  usage: '.disappearing [24h|7d|90d|off]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, isGroup, senderJid } = context;

    // Parse duration argument
    const durationArg = (args[0] || '').toLowerCase();
    
    let duration = null;
    let durationText = '';

    switch (durationArg) {
      case '24h':
      case '1d':
      case 'day':
      case 'days':
        duration = 86400; // 24 hours in seconds
        durationText = '24 hours';
        break;
      case '7d':
      case 'week':
      case 'weeks':
        duration = 604800; // 7 days in seconds
        durationText = '7 days';
        break;
      case '90d':
      case '3months':
        duration = 7776000; // 90 days in seconds
        durationText = '90 days';
        break;
      case 'off':
      case 'disable':
      case '0':
        duration = 0;
        durationText = 'disabled';
        break;
      default:
        return reply(
          formatBox('DISAPPEARING MESSAGES', [
            'Set disappearing messages timer for this chat.',
            '',
            '*Usage:* `.disappearing [option]`',
            '',
            '*Options:*',
            '• `24h` - Messages disappear after 24 hours',
            '• `7d` - Messages disappear after 7 days',
            '• `90d` - Messages disappear after 90 days',
            '• `off` - Disable disappearing messages',
            '',
            '_In groups: Requires bot to be admin_'
          ])
        );
    }

    try {
      // Check permissions for groups
      if (isGroup) {
        const [userIsAdmin, botIsAdmin] = await Promise.all([
          isAdmin(sock, chatId, senderJid),
          isBotAdmin(sock, chatId)
        ]);

        if (!botIsAdmin) {
          return reply('❌ Bot must be an admin to change disappearing messages in groups.');
        }
        
        if (!userIsAdmin) {
          return reply('❌ You must be an admin to change disappearing messages in groups.');
        }
      }

      // Set disappearing messages
      const success = await setDisappearingMessages(sock, chatId, duration);

      if (success) {
        if (duration === 0) {
          return reply('✅ Disappearing messages have been *disabled* for this chat.');
        } else {
          return reply(`✅ Disappearing messages set to *${durationText}* for this chat.\n\n_Messages sent after this will automatically disappear._`);
        }
      } else {
        return reply('❌ Failed to set disappearing messages.');
      }

    } catch (error) {
      console.error('[Disappearing] Error:', error.message);
      return reply('❌ Failed to set disappearing messages. Make sure the bot has necessary permissions.');
    }
  }
};

export default command;
