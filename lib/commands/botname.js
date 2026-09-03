import { checkPermission } from '../utils/permissions.js';
import { setConfig, getConfig } from '../utils/config-manager.js';
import { logCommandExecution } from '../utils/audit-log.js';

/**
 * Command: botname
 * Category: configuration
 * Description: Set or view the bot name (OWNER ONLY)
 */

export const command = {
  pattern: 'botname',
  aliases: ['setbotname', 'name'],
  description: 'Set or view the bot name (OWNER ONLY)',
  category: 'configuration',
  usage: '[newName]',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'botname',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newName: args.join(' ') },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    // Get current name
    const currentName = await getConfig('BOT_NAME');
    
    // If no argument, show current name
    if (args.length === 0) {
      return reply(
        `╭───「 Bot Name 」───⊷\n` +
        `│ Current name: *${currentName}*\n` +
        `│ Status: ⚡ Hot reload (applies immediately)\n` +
        `╰────────────────────────────⊷\n\n` +
        `Usage: .botname <name>\n` +
        `Example: .botname Tanu XAI`
      );
    }
    
    const newName = args.join(' ').trim();
    
    // Validate name length
    if (newName.length === 0) {
      return reply('❌ Bot name cannot be empty.');
    }
    
    if (newName.length > 50) {
      return reply('❌ Bot name must be 50 characters or less.');
    }
    
    // Set the new name
    const result = await setConfig('BOT_NAME', newName, { validate: true });
    
    if (!result.success) {
      await logCommandExecution({
        command: 'botname',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newName },
        success: false,
        error: result.error,
        permissionLevel: 'owner'
      });
      return reply(`❌ Failed to set bot name: ${result.error}`);
    }
    
    await logCommandExecution({
      command: 'botname',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { newName, oldName: currentName },
      success: true,
      permissionLevel: 'owner'
    });
    
    return reply(
      `✅ Bot name changed successfully!\n\n` +
      `Previous: ${currentName}\n` +
      `New: *${newName}*\n\n` +
      `⚡ Change applied immediately (hot reload).`
    );
  }
};

export default command;
