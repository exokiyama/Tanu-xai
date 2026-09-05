const { checkPermission, removeSudoUser, getSudoUsers } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: removesudo
 * Category: sudo
 * Description: Remove a sudo user (OWNER ONLY)
 * 
 * SECURITY: Only permanent owner can remove sudo users.
 */

const command = {
  pattern: 'removesudo',
  aliases: ['sudoremove', 'delsudo', 'removeadmin'],
  description: 'Remove a sudo user (OWNER ONLY)',
  category: 'sudo',
  usage: '<phone-number>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission using centralized system - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'removesudo',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { targetNumber: args[0] },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: Only the permanent owner can remove sudo users');
    }
    
    const sudoNumber = args[0]?.replace(/\D/g, '');
    
    if (!sudoNumber || sudoNumber.length < 10) {
      return reply(
        '❌ Usage: .removesudo <phone-number>\n\n' +
        'Example: .removesudo 917023968416'
      );
    }
    
    // Remove the sudo user
    removeSudoUser(sudoNumber);
    
    // Log the action
    await logCommandExecution({
      command: 'removesudo',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { removedUser: sudoNumber },
      success: true,
      permissionLevel: 'owner'
    });
    
    await reply(`✅ Removed ${sudoNumber} from sudo users\n\nThey can no longer use sudo-accessible commands.`);
  }
};

