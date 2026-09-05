/**
 * Command: msginfo
 * Category: 💬 Message
 * Description: Show detailed information about a message
 */

const { getQuotedMessage, getMessageKey, getMessageType, extractText } = require('../utils/message.js');
const { formatBox } = require('../utils/format.js');
const command = {
  name: 'msginfo',
  pattern: 'msginfo',
  aliases: ['messageinfo', 'minfo', 'mi'],
  category: '💬 Message',
  description: 'Show detailed information about a message',
  usage: '.msginfo (reply to a message)',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const { reply, chatId, isGroup } = context;

    // Get quoted message or use current message
    const quoted = await getQuotedMessage(message, sock);
    const targetMessage = quoted || message;

    if (!targetMessage || !targetMessage.message) {
      return reply(
        formatBox('MESSAGE INFO', [
          'Get detailed information about a message.',
          '',
          'Usage: .msginfo (reply to a message)',
          '',
          'Shows:',
          '• Message type and ID',
          '• Sender information',
          '• Chat information',
          '• Content preview',
          '• Timestamp'
        ])
      );
    }

    try {
      const key = getMessageKey(targetMessage);
      const type = getMessageType(targetMessage);
      const text = extractText(targetMessage);
      
      // Format timestamp
      const timestamp = targetMessage.messageTimestamp 
        ? new Date(targetMessage.messageTimestamp * 1000).toLocaleString()
        : 'Unknown';

      // Build info display
      let output = formatBox('MESSAGE INFORMATION', [
        `📧 Type: ${type}`,
        `🆔 ID: ${key?.id || 'Unknown'}`,
        `👤 From Me: ${key?.fromMe ? 'Yes' : 'No'}`,
        `💬 Chat: ${key?.remoteJid ? key.remoteJid.split('@')[0] : 'Unknown'}`,
        `⏰ Time: ${timestamp}`,
        ''
      ]);

      // Add sender info for group messages
      if (isGroup && !key?.fromMe && quoted) {
        const senderNum = quoted.sender?.split('@')[0] || 'Unknown';
        output += `👤 Sender: @${senderNum}\n\n`;
      }

      // Add content preview
      if (text && text.length > 0) {
        const preview = text.length > 300 ? text.substring(0, 300) + '...' : text;
        output += `📝 *Content:*\n\`\`\`${preview}\`\`\`\n\n`;
      }

      // Add media info
      const hasMedia = ['image', 'video', 'audio', 'document', 'sticker'].includes(type);
      if (hasMedia) {
        output += `📷 Has Media: Yes (${type})\n\n`;
      }

      // Add chat type info
      output += isGroup ? '🏢 Chat Type: Group' : '👤 Chat Type: Private';

      // Send with mentions if in group
      if (isGroup && quoted?.sender) {
        await reply(output, { mentions: [quoted.sender] });
      } else {
        await reply(output);
      }

    } catch (error) {
      console.error('[MsgInfo] Error:', error.message);
      return reply('❌ Failed to get message information.');
    }
  }
};

// Missing module.exports fixed
module.exports = command;
