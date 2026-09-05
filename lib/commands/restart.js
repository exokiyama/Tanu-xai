const { checkPermission } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: restart
 * Category: owner
 * Description: Restart the bot (OWNER ONLY)
 * 
 * SECURITY: Only permanent owner can restart the bot.
 */

const command = {
  pattern: 'restart',
  aliases: ['reboot', 'reload'],
  description: 'Restart the bot (OWNER ONLY)',
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
        command: 'restart',
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
    
    // Log the restart attempt
    await logCommandExecution({
      command: 'restart',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: {},
      success: true,
      permissionLevel: 'owner'
    });
    
    await reply('🔄 Restarting bot... Please wait a moment.');
    
    // Delay to allow message to be sent
    setTimeout(() => {
      console.log('[RESTART] Bot restart initiated by owner');
      process.exit(0);
    }, 2000);
  }
};

