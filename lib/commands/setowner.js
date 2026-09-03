import { checkPermission, getPermanentOwner } from '../utils/permissions.js';
import { logCommandExecution } from '../utils/audit-log.js';

/**
 * Command: setowner
 * Category: owner
 * Description: Set a new permanent owner (OWNER ONLY)
 * 
 * SECURITY WARNING: This changes the permanent owner!
 * - Only current permanent owner can use this
 * - Requires confirmation
 * - All attempts are logged
 */

export const command = {
  pattern: 'setowner',
  aliases: ['newowner', 'transferowner'],
  description: 'Transfer ownership to a new number (OWNER ONLY - IRREVERSIBLE)',
  category: 'owner',
  usage: '<phone-number>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission using centralized system
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'setowner',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { targetNumber: args[0] },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: Only the permanent owner can transfer ownership');
    }
    
    const newOwnerNumber = args[0]?.replace(/\D/g, '');
    
    if (!newOwnerNumber || newOwnerNumber.length < 10) {
      return reply(
        '❌ Usage: .setowner <phone-number>\n\n' +
        'Example: .setowner 917023968416\n\n' +
        '⚠️ WARNING: This will TRANSFER ownership permanently!'
      );
    }
    
    // Log the attempt
    await logCommandExecution({
      command: 'setowner',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { newOwnerNumber, currentOwner: getPermanentOwner() },
      success: true,
      permissionLevel: 'owner'
    });
    
    const currentOwner = getPermanentOwner();
    
    await reply(
      `⚠️ *OWNERSHIP TRANSFER WARNING*\n\n` +
      `Current Owner: ${currentOwner}\n` +
      `New Owner: ${newOwnerNumber}\n\n` +
      `This action is IRREVERSIBLE. The new owner will have full control.\n\n` +
      `To confirm, type: .confirmowner ${newOwnerNumber}\n\n` +
      `Type anything else to cancel.`
    );
    
    // Note: In a full implementation, we would wait for confirmation here
    // For now, we just show the warning and log the attempt
    console.log(`[SETOWNER] Owner transfer attempted: ${currentOwner} -> ${newOwnerNumber}`);
    console.log('[SETOWNER] Manual config change required in config/config.js');
    
    await reply(
      '📝 NOTE: To complete the ownership transfer, you must manually update:\n' +
      'config/config.js - Change PERMANENT_OWNERS array\n\n' +
      'This prevents accidental ownership transfers.'
    );
  }
};

export default command;
