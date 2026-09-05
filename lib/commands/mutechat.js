/**
 * Command: mutechat
 * Category: 💬 Message
 * Description: Mute or unmute the current chat
 */

const { muteChat } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'mutechat',
  pattern: 'mutechat',
  aliases: ['mute', 'mc'],
  category: '💬 Message',
  description: 'Mute or unmute the current chat',
  usage: '.mutechat [duration|off]',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId } = context;

    // Parse duration argument
    const durationArg = (args[0] || '').toLowerCase();
    
    let duration = null;
    let durationText = '';

    if (!durationArg || durationArg === 'off' || durationArg === 'unmute') {
      duration = null; // Unmute
      durationText = 'unmuted';
    } else {
      // Parse duration in hours
      const hours = parseInt(durationArg);
      if (isNaN(hours) || hours <= 0) {
        return reply(
          formatBox('MUTE CHAT', [
            'Mute or unmute notifications for this chat.',
            '',
            '*Usage:* `.mutechat [option]`',
            '',
            '*Options:*',
            '• `1` - Mute for 1 hour',
            '• `8` - Mute for 8 hours',
            '• `24` - Mute for 24 hours',
            '• `7d` or `168` - Mute for 7 days',
            '• `off` or `.unmute` - Unmute chat',
            '',
            '_Without argument: Shows this help_'
          ])
        );
      }

      // Handle day notation
      let hoursValue = hours;
      if (durationArg.includes('d')) {
        hoursValue = hours * 24;
      }

      duration = hoursValue * 60 * 60 * 1000; // Convert to milliseconds
      durationText = `${hoursValue} hours`;
    }

    try {
      const success = await muteChat(sock, chatId, duration);

      if (success) {
        if (duration === null) {
          return reply('✅ Chat has been *unmuted*. You will receive notifications.');
        } else {
          return reply(`✅ Chat muted for *${durationText}*.\n\n_You won't receive notifications during this period._`);
        }
      } else {
        return reply('❌ Failed to mute/unmute chat.');
      }

    } catch (error) {
      console.error('[MuteChat] Error:', error.message);
      return reply('❌ Failed to change mute status. Make sure you have access to this chat.');
    }
  }
};

