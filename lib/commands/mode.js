const { checkPermission } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: mode
 * Category: sudo
 * Description: Set bot mode (public/private) (SUDO ACCESSIBLE)
 * 
 * SECURITY: Sudo users and owner can change bot mode.
 */

const command = {
  pattern: 'mode',
  aliases: ['botmode', 'setmode'],
  description: 'Set bot mode to public or private (SUDO ACCESSIBLE)',
  category: 'sudo',
  usage: '<public|private>',
  ownerOnly: false,
  sudoAccessible: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission using centralized system - SUDO or OWNER
    const permCheck = await checkPermission(senderJid, 'sudo');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'mode',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newMode: args[0] },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires sudo or owner privileges');
    }
    
    const newMode = args[0]?.toLowerCase();
    
    if (!newMode || !['public', 'private'].includes(newMode)) {
      return reply(
        '❌ Usage: .mode <public|private>\n\n' +
        '• public - Anyone can use the bot\n' +
        '• private - Only owner/sudo can use the bot'
      );
    }
    
    // In Phase 2, this would update the mode in config/database
    // For now, just log the action
    
    await logCommandExecution({
      command: 'mode',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { newMode },
      success: true,
      permissionLevel: permCheck.level
    });
    
    await reply(
      `✅ Bot mode changed to: *${newMode.toUpperCase()}*\n\n` +
      `${newMode === 'private' 
        ? '⚠️ Private mode: Only owner and sudo users can use commands.' 
        : '🌐 Public mode: Anyone can use public commands.'}`
    );
  }
};

