const command = {
  pattern: 'statusforward',
  aliases: ['forwardstatus', 'sforward'],
  description: 'Forward status to a specific chat/JID',
  category: 'status',
  usage: '<jid> (reply to a status message)',
  ownerOnly: true,
  groupOnly: false,

  async handler(sock, message, args, context) {
    const { reply, isOwner } = context;

    // Check if replying to a message
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMsg) {
      return reply(
        '📤 *Forward Status*\\n\\n' +
        'Forward a status to a specific chat or JID.\\n\\n' +
        '*Usage:* `.statusforward <jid>` (reply to status)\\n' +
        'Example: `.statusforward 1234567890@s.whatsapp.net`'
      );
    }

    const destinationJid = args[0];
    
    if (!destinationJid) {
      return reply('❌ Please provide a destination JID.\\n\\nExample: `.statusforward 1234567890@s.whatsapp.net`');
    }

    // Validate JID format
    const jidRegex = /^[0-9]{5,16}@[sg]\.whatsapp\.net$/;
    if (!jidRegex.test(destinationJid)) {
      return reply('❌ Invalid JID format. Use format: `1234567890@s.whatsapp.net` or `1234567890@g.us`');
    }

    try {
      // Forward the message to the destination
      await sock.copyNForward(destinationJid, {
        key: quotedMsg.contextInfo?.stanzaId ? {
          remoteJid: message.key.remoteJid,
          fromMe: false,
          id: quotedMsg.contextInfo.stanzaId
        } : message.key,
        message: quotedMsg
      }, true);

      return reply(`✅ Status forwarded to \\`${destinationJid}\\``);

    } catch (error) {
      console.error('[StatusForward] Error:', error.message);
      return reply('❌ Failed to forward status. Make sure the JID is valid and the bot has access to that chat.');
    }
  }
};

