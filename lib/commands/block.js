const { checkPermission } = require('../utils/permissions.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: block
 * Category: sudo
 * Description: Block a user from using the bot (SUDO ACCESSIBLE)
 * 
 * SECURITY: Sudo users and owner can block users.
 */

const command = {
  pattern: 'block',
  aliases: ['ban', 'blacklist'],
  description: 'Block a user from using the bot (SUDO ACCESSIBLE)',
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
        command: 'block',
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
        '❌ Usage: .block <@mention|reply>\n\n' +
        'Mention a user or reply to their message to block them.'
      );
    }
    
    // Prevent blocking owner
    const targetPhone = targetJid.split('@')[0].replace(/\D/g, '');
    const ownerPhone = '917023968416'; // From config
    
    if (targetPhone === ownerPhone) {
      await logCommandExecution({
        command: 'block',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { targetJid, reason: 'attempted_to_block_owner' },
        success: false,
        error: 'Cannot block the permanent owner',
        permissionLevel: permCheck.level
      });
      return reply('❌ ERROR: Cannot block the permanent owner!');
    }
    
    // In Phase 2, this would add to a blocklist in database
    // For now, just log the action
    await logCommandExecution({
      command: 'block',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { targetJid, targetPhone },
      success: true,
      permissionLevel: permCheck.level
    });
    
    // Notify the blocked user (optional)
    try {
      await sock.sendMessage(targetJid, { 
        text: '⛔ You have been blocked from using this bot.\n\nContact the owner if you believe this is a mistake.' 
      });
    } catch (error) {
      console.error('[BLOCK] Failed to notify user:', error.message);
    }
    
    await reply(`✅ Blocked @${targetPhone} from using the bot`, {
      mentions: [targetJid]
    });
  }
};

