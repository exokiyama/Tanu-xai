/**
 * Command: copytext
 * Category: 💬 Message
 * Description: Copy text content from any message type
 */

const { getQuotedMessage, extractText, copyText } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'copytext',
  pattern: 'copytext',
  aliases: ['copy', 'gettext', 'ct'],
  category: '💬 Message',
  description: 'Copy text content from any message type',
  usage: '.copytext (reply to a message)',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, senderJid } = context;

    // Get quoted message
    const quoted = await getQuotedMessage(message, sock);

    if (!quoted) {
      return reply(
        formatBox('COPY TEXT', [
          'Extract and copy text from any message.',
          '',
          'Works with:',
          '• Text messages',
          '• Images/Videos with captions',
          '• Documents with captions',
          '',
          'Usage: .copytext (reply to a message)'
        ])
      );
    }

    try {
      // Extract text using the utility
      const text = copyText({ message: quoted.message });

      if (!text || text.trim().length === 0) {
        return reply('❌ No text content found in this message.');
      }

      // Send text in a code block for easy copying
      const maxLength = 4000; // WhatsApp limit for code blocks
      if (text.length > maxLength) {
        await reply(`📋 *Text Content* (${text.length} chars)\n\n_Part 1 of ${Math.ceil(text.length / maxLength)}:_\n\n\`\`\`${text.substring(0, maxLength)}\`\`\``);
        
        // Send remaining parts
        for (let i = maxLength; i < text.length; i += maxLength) {
          const part = Math.floor(i / maxLength) + 1;
          const total = Math.ceil(text.length / maxLength);
          await reply(`_Part ${part} of ${total}:_\n\n\`\`\`${text.substring(i, i + maxLength)}\`\`\``);
        }
      } else {
        await reply(`📋 *Text Content* (${text.length} chars)\n\n\`\`\`${text}\`\`\``);
      }

    } catch (error) {
      console.error('[CopyText] Error:', error.message);
      return reply('❌ Failed to extract text from message.');
    }
  }
};

