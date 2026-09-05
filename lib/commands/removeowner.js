const { checkPermission, getPermanentOwner } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: removeowner  
 * Category: owner
 * Description: Display current owner information (OWNER ONLY)
 * 
 * This command shows the current permanent owner configuration.
 * Note: Actual owner removal requires manual config change for security.
 */

const command = {
  pattern: 'removeowner',
  aliases: ['delowner', 'showowner'],
  description: 'Show current permanent owner configuration (OWNER ONLY)',
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
        command: 'removeowner',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: {},
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: Only the permanent owner can view this information');
    }
    
    const currentOwner = getPermanentOwner();
    
    // Log the access
    await logCommandExecution({
      command: 'removeowner',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: {},
      success: true,
      permissionLevel: 'owner'
    });
    
    await reply(
      `👑 *Permanent Owner Configuration*\n\n` +
      `Current Owner Number: \`${currentOwner}\`\n\n` +
      `⚠️ *Security Notice:*\n` +
      `The permanent owner cannot be removed via command.\n` +
      `To change ownership, you must:\n` +
      `1. Use .setowner <new-number> to initiate transfer\n` +
      `2. Manually edit config/config.js\n` +
      `3. Update the PERMANENT_OWNERS array\n\n` +
      `This prevents unauthorized ownership changes.`
    );
  }
};

// Missing module.exports fixed
module.exports = command;
