const { checkPermission, getSudoUsers } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: listsudo
 * Category: sudo
 * Description: List all sudo users (OWNER ONLY)
 * 
 * SECURITY: Only permanent owner can view sudo user list.
 */

const command = {
  pattern: 'listsudo',
  aliases: ['sudolist', 'showsudo', 'adminlist'],
  description: 'List all sudo users (OWNER ONLY)',
  category: 'sudo',
  usage: '',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission using centralized system - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'listsudo',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: {},
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: Only the permanent owner can view sudo user list');
    }
    
    const sudoUsers = getSudoUsers();
    const sudoArray = Array.from(sudoUsers);
    
    // Log the access
    await logCommandExecution({
      command: 'listsudo',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { count: sudoArray.length },
      success: true,
      permissionLevel: 'owner'
    });
    
    if (sudoArray.length === 0) {
      return reply('📋 *Sudo Users*\n\nNo sudo users configured.\n\nUse .addsudo <number> to add one.');
    }
    
    const listText = sudoArray.map((num, i) => `${i + 1}. ${num}`).join('\n');
    
    await reply(
      `📋 *Sudo Users* (${sudoArray.length})\n\n` +
      `${listText}\n\n` +
      `Use .removesudo <number> to remove a sudo user.`
    );
  }
};

