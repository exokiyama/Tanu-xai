import { checkPermission } from '../utils/permissions.js';
import { resetConfig, hasKey, DEFAULT_CONFIG } from '../utils/config-manager.js';
import { logCommandExecution } from '../utils/audit-log.js';

/**
 * Command: resetvar
 * Category: configuration
 * Description: Reset a configuration variable to default (OWNER ONLY)
 */

export const command = {
  pattern: 'resetvar',
  aliases: ['resetconfig', 'defaultvar'],
  description: 'Reset a configuration variable to its default value (OWNER ONLY)',
  category: 'configuration',
  usage: '<KEY>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'resetvar',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { key: args[0] },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    if (args.length < 1) {
      return reply(
        '❌ Usage: .resetvar <KEY>\n\n' +
        'Examples:\n' +
        '.resetvar PREFIX\n' +
        '.resetvar BOT_NAME\n' +
        '.resetvar BOT_MODE\n\n' +
        'Use .settings to view all settings.'
      );
    }
    
    const key = args[0].toUpperCase();
    
    // Validate key exists
    if (!hasKey(key)) {
      return reply(
        `❌ Unknown configuration key: ${key}\n\n` +
        'Available keys include:\n' +
        'PREFIX, BOT_NAME, WATERMARK, LANGUAGE, ALIVE_MSG,\n' +
        'STICKER_PACKNAME, STICKER_AUTHOR, BOT_MODE, AUTO_READ,\n' +
        'AUTO_ONLINE, AUTO_STATUS, and more.\n\n' +
        'Use .settings to see all available settings.'
      );
    }
    
    // Check if it's already at default
    const currentValue = DEFAULT_CONFIG[key]?.value;
    if (currentValue === undefined) {
      return reply(`❌ Configuration key not found: ${key}`);
    }
    
    // Reset the configuration
    const result = await resetConfig(key);
    
    if (!result.success) {
      await logCommandExecution({
        command: 'resetvar',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { key },
        success: false,
        error: result.error,
        permissionLevel: 'owner'
      });
      return reply(`❌ Failed to reset ${key}: ${result.error}`);
    }
    
    await logCommandExecution({
      command: 'resetvar',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { key },
      success: true,
      permissionLevel: 'owner'
    });
    
    const metadata = DEFAULT_CONFIG[key];
    const hotReloadInfo = metadata.hotReload 
      ? '⚡ Change applied immediately.' 
      : '🔄 This change requires a bot restart to take effect.';
    
    return reply(
      `✅ Successfully reset *${key}* to default value\n\n` +
      `Default: ${currentValue}\n\n` +
      hotReloadInfo
    );
  }
};

export default command;
