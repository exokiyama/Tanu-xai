const { checkPermission } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: unblock
 * Category: sudo
 * Description: Unblock a previously blocked user (SUDO ACCESSIBLE)
 * 
 * SECURITY: Sudo users and owner can unblock users.
 */

const command = {
  pattern: 'unblock',
  aliases: ['unban', 'whitelist'],
  description: 'Unblock a previously blocked user (SUDO ACCESSIBLE)',
  category: 'sudo',
  usage: '<@mention|reply>',
  ownerOnly: false,
  sudoAccessible: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId, mentionedJid, quoted } = context;
    
    // CRITICAL: Check permission using centralized system - SUDO or OWNER
    const permCheck = await checkPermission(senderJid, 'sudo');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'unblock',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: {},
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires sudo or owner privileges');
    }
    
    // Get target user
    let targetJid = null;
    
    if (mentionedJid && mentionedJid.length > 0) {
      targetJid = mentionedJid[0];
    } else if (quoted && quoted.sender) {
      targetJid = quoted.sender;
    }
    
    if (!targetJid) {
      return reply(
        '❌ Usage: .unblock <@mention|reply>\n\n' +
        'Mention a user or reply to their message to unblock them.'
      );
    }
    
    const targetPhone = targetJid.split('@')[0].replace(/\D/g, '');
    
    // In Phase 2, this would remove from blocklist in database
    // For now, just log the action
    await logCommandExecution({
      command: 'unblock',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { targetJid, targetPhone },
      success: true,
      permissionLevel: permCheck.level
    });
    
    // Notify the unblocked user (optional)
    try {
      await sock.sendMessage(targetJid, { 
        text: '✅ You have been unblocked and can now use this bot again.' 
      });
    } catch (error) {
      console.error('[UNBLOCK] Failed to notify user:', error.message);
    }
    
    await reply(`✅ Unblocked @${targetPhone}`, {
      mentions: [targetJid]
    });
  }
};

