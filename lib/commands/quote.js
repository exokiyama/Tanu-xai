/**
 * Command: quote
 * Category: 💬 Message
 * Description: Generate a quoted message block or get quoted message info
 */

import { getQuotedMessage, extractText, getMessageType } from '../utils/message.js';
import { formatBox } from '../utils/format.js';

export const command = {
  name: 'quote',
  pattern: 'quote',
  aliases: ['getquoted', 'q'],
  category: '💬 Message',
  description: 'Get information about a quoted/replied message',
  usage: '.quote (reply to a message with a quote)',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, senderJid } = context;

    // Get the deeply nested quoted message
    const quoted = await getQuotedMessage(message, sock);

    if (!quoted || !quoted.message) {
      return reply(
        formatBox('QUOTE COMMAND', [
          'Get information about a quoted message.',
          '',
          'Usage: .quote (reply to a message that has a quote)',
          '',
          'This extracts the original message that was quoted.'
        ])
      );
    }

    try {
      // Build detailed quote information
      let output = formatBox('QUOTED MESSAGE INFO', [
        `📧 Type: ${quoted.type}`,
        `👤 Sender: @${quoted.sender?.split('@')[0] || 'Unknown'}`,
        `📝 ID: ${quoted.key?.id || 'Unknown'}`,
        ''
      ]);

      // Add text content if available
      const text = quoted.text || extractText({ message: quoted.message });
      if (text && text.length > 0) {
        const preview = text.length > 200 ? text.substring(0, 200) + '...' : text;
        output += `\n💬 *Content:*\n\`\`\`${preview}\`\`\``;
      }

      // Add caption if available
      if (quoted.caption && quoted.caption.length > 0) {
        const captionPreview = quoted.caption.length > 100 
          ? quoted.caption.substring(0, 100) + '...' 
          : quoted.caption;
        output += `\n\n📎 *Caption:* _${captionPreview}_`;
      }

      // Add media info
      if (quoted.hasMedia) {
        output += '\n\n📷 *Has Media:* Yes';
      }

      // Check for deep quote (quote of a quote)
      if (quoted.deepQuote) {
        output += '\n\n🔄 *Nested Quote:* Yes (quote of a quote)';
        const deepText = quoted.deepQuote.text || '';
        if (deepText) {
          const deepPreview = deepText.length > 100 
            ? deepText.substring(0, 100) + '...' 
            : deepText;
          output += `\n   Content: _${deepPreview}_`;
        }
      }

      // Mention the original sender
      output += '\n\n@' + (quoted.sender?.split('@')[0] || 'unknown');

      await reply(output, { mentions: [quoted.sender].filter(Boolean) });

    } catch (error) {
      console.error('[Quote] Error:', error.message);
      return reply('❌ Failed to extract quoted message information.');
    }
  }
};

export default command;
