const { checkPermission } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: shutdown
 * Category: owner
 * Description: Shutdown the bot (OWNER ONLY)
 * 
 * SECURITY: Only permanent owner can shutdown the bot.
 */

const command = {
  pattern: 'shutdown',
  aliases: ['off', 'stop', 'poweroff'],
  description: 'Shutdown the bot (OWNER ONLY)',
  category: 'owner',
  usage: '',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission using centralized system
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'shutdown',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: {},
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command can only be used by the permanent owner');
    }
    
    // Log the shutdown attempt
    await logCommandExecution({
      command: 'shutdown',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: {},
      success: true,
      permissionLevel: 'owner'
    });
    
    await reply('🛑 Shutting down bot... Goodbye!');
    
    // Delay to allow message to be sent
    setTimeout(() => {
      console.log('[SHUTDOWN] Bot shutdown initiated by owner');
      process.exit(0);
    }, 2000);
  }
};

// Missing module.exports fixed
module.exports = command;
