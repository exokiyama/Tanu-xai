const { checkPermission } = require('../utils/permissions.js');
const { setConfig, getConfig } = require('../utils/config-manager.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: prefix
 * Category: configuration
 * Description: Set or view the bot prefix (OWNER ONLY)
 */

const command = {
  pattern: 'prefix',
  aliases: ['setprefix', 'changeprefix'],
  description: 'Set or view the bot prefix (OWNER ONLY)',
  category: 'configuration',
  usage: '[newPrefix]',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'prefix',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newPrefix: args[0] },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    // Get current prefix
    const currentPrefix = await getConfig('PREFIX');
    
    // If no argument, show current prefix
    if (args.length === 0) {
      return reply(
        `╭───「 Prefix Settings 」───⊷\n` +
        `│ Current prefix: *${currentPrefix || '(none)'}*\n` +
        `│ Status: ⚡ Hot reload (applies immediately)\n` +
        `╰────────────────────────────⊷\n\n` +
        `Usage: .prefix <character>\n` +
        `Example: .prefix !\n\n` +
        `Note: Use an empty string to disable prefix.`
      );
    }
    
    const newPrefix = args.join(' ');
    
    // Validate prefix length
    if (newPrefix.length > 1) {
      return reply(
        '❌ Prefix must be a single character or empty string.\n\n' +
        'Examples:\n' +
        '.prefix !\n' +
        '.prefix .\n' +
        '.prefix / \n' +
        '.prefix  (empty to disable)'
      );
    }
    
    // Set the new prefix
    const result = await setConfig('PREFIX', newPrefix, { validate: true });
    
    if (!result.success) {
      await logCommandExecution({
        command: 'prefix',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newPrefix },
        success: false,
        error: result.error,
        permissionLevel: 'owner'
      });
      return reply(`❌ Failed to set prefix: ${result.error}`);
    }
    
    await logCommandExecution({
      command: 'prefix',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { newPrefix, oldPrefix: currentPrefix },
      success: true,
      permissionLevel: 'owner'
    });
    
    const displayPrefix = newPrefix === '' ? '(disabled)' : `"${newPrefix}"`;
    
    return reply(
      `✅ Bot prefix changed successfully!\n\n` +
      `Previous: ${currentPrefix || '(none)'}\n` +
      `New: ${displayPrefix}\n\n` +
      `⚡ Change applied immediately (hot reload).`
    );
  }
};

