/**
 * Command: forward
 * Category: 💬 Message
 * Description: Forward a message to another chat or the current chat
 */

const { getQuotedMessage, forwardMessage } = require('../utils/message.js');
const { checkRateLimit } = require('../utils/rate-limiter.js');
const command = {
  name: 'forward',
  pattern: 'forward',
  aliases: ['resend', 'f'],
  category: '💬 Message',
  description: 'Forward a message to another chat or the current chat',
  usage: '.forward [jid] (reply to a message)',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, senderJid } = context;

    // Rate limit: 5 forwards per minute per user
    const rateLimitKey = `forward:${senderJid}`;
    if (!checkRateLimit(rateLimitKey, 5, 60)) {
      return reply('⏱️ Please wait before forwarding more messages. Rate limit: 5 per minute.');
    }

    // Get quoted message
    const quoted = await getQuotedMessage(message, sock);

    if (!quoted || !quoted.message) {
      return reply(
        '📤 *Forward Message*\n\n' +
        'Forward a message to another chat or resend it here.\n\n' +
        '*Usage:*\n' +
        '• `.forward` - Resend in current chat\n' +
        '• `.forward <jid>` - Forward to specific chat\n\n' +
        'Example: `.forward 1234567890@s.whatsapp.net`\n\n' +
        '_Reply to a message to forward it._'
      );
    }

    try {
      const destinationJid = args[0] || chatId;

      // Validate JID format if provided
      if (args[0]) {
        const jidRegex = /^[0-9]{5,16}@[sg]\.whatsapp\.net$/;
        if (!jidRegex.test(destinationJid)) {
          return reply('❌ Invalid JID format. Use: `1234567890@s.whatsapp.net` or `1234567890@g.us`');
        }
      }

      // Build message object for forwarding
      const messageToForward = {
        key: quoted.key,
        message: quoted.message
      };

      // Add delay to prevent spam detection
      await new Promise(resolve => setTimeout(resolve, 1000));

      const success = await forwardMessage(sock, destinationJid, messageToForward);

      if (success) {
        if (args[0]) {
          return reply(`✅ Message forwarded to \`${destinationJid}\``);
        } else {
          // When forwarding to same chat, don't send confirmation to avoid clutter
          return;
        }
      } else {
        return reply('❌ Failed to forward message. The destination may be invalid or inaccessible.');
      }

    } catch (error) {
      console.error('[Forward] Error:', error.message);
      return reply('❌ Failed to forward message. Make sure you\'re replying to a valid message.');
    }
  }
};

// Missing module.exports fixed
module.exports = command;
