const command = {
  pattern: 'statussave',
  aliases: ['savestatus', 'statusdl'],
  description: 'Save replied status media manually',
  category: 'status',
  usage: '(reply to a status message)',
  ownerOnly: false,
  groupOnly: false,

  async handler(sock, message, args, context) {
    const { reply, isOwner } = context;

    // Check if replying to a message
    const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    
    if (!quotedMsg) {
      return reply(
        '💾 *Save Status*\\n\\n' +
        'Reply to a status message to save its media.\\n\\n' +
        '*Usage:* Reply to a status with `.statussave`'
      );
    }

    try {
      // Determine media type
      const msgType = Object.keys(quotedMsg)[0];
      
      let mediaConfig;
      let caption = '';

      switch (msgType) {
        case 'imageMessage':
          caption = quotedMsg.imageMessage.caption || '';
          mediaConfig = {
            image: quotedMsg.imageMessage,
            caption: `*Saved Status*\\n${caption}`
          };
          break;

        case 'videoMessage':
          caption = quotedMsg.videoMessage.caption || '';
          mediaConfig = {
            video: quotedMsg.videoMessage,
            caption: `*Saved Status*\\n${caption}`
          };
          break;

        case 'audioMessage':
          mediaConfig = {
            audio: quotedMsg.audioMessage,
            mimetype: 'audio/mp4',
            ptt: quotedMsg.audioMessage.ptt || false
          };
          break;

        case 'documentMessage':
          mediaConfig = {
            document: quotedMsg.documentMessage,
            fileName: quotedMsg.documentMessage.fileName,
            mimetype: quotedMsg.documentMessage.mimetype
          };
          break;

        default:
          return reply('❌ Unsupported media type in the replied message');
      }

      // Send the saved media to the user's PM or current chat
      await sock.sendMessage(message.key.remoteJid, mediaConfig);

      return reply('✅ Status media saved successfully!');

    } catch (error) {
      console.error('[StatusSave] Error:', error.message);
      return reply('❌ Failed to save status media. Please try again.');
    }
  }
};

// Missing module.exports fixed
module.exports = command;
