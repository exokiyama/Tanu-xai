import { checkPermission, addSudoUser, removeSudoUser, getSudoUsers } from '../utils/permissions.js';
import { logCommandExecution } from '../utils/audit-log.js';

/**
 * Command: addsudo
 * Category: sudo
 * Description: Add a sudo user (OWNER ONLY)
 * 
 * SECURITY: Only permanent owner can add sudo users.
 */

export const command = {
  pattern: 'addsudo',
  aliases: ['sudoadd', 'addadmin'],
  description: 'Add a sudo user (OWNER ONLY)',
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
        command: 'addsudo',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { targetNumber: args[0] },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: Only the permanent owner can add sudo users');
    }
    
    const sudoNumber = args[0]?.replace(/\D/g, '');
    
    if (!sudoNumber || sudoNumber.length < 10) {
      return reply(
        '❌ Usage: .addsudo <phone-number>\n\n' +
        'Example: .addsudo 917023968416\n\n' +
        'Sudo users can access sudo-level commands.'
      );
    }
    
    // Add the sudo user
    addSudoUser(sudoNumber);
    
    // Log the action
    await logCommandExecution({
      command: 'addsudo',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { addedUser: sudoNumber },
      success: true,
      permissionLevel: 'owner'
    });
    
    await reply(`✅ Added ${sudoNumber} as a sudo user\n\nThey can now use sudo-accessible commands.`);
  }
};

export default command;
