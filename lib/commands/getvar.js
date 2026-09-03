import { checkPermission } from '../utils/permissions.js';
import { getConfig, hasKey, getKeyMetadata } from '../utils/config-manager.js';
import { logCommandExecution } from '../utils/audit-log.js';
import { generateSingleSettingDisplay } from '../utils/config-display.js';

/**
 * Command: getvar
 * Category: configuration
 * Description: Get a specific configuration variable (OWNER ONLY)
 */

export const command = {
  pattern: 'getvar',
  aliases: ['getconfig', 'getsetting', 'showvar'],
  description: 'Get a specific configuration variable (OWNER ONLY)',
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
        command: 'getvar',
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
        '❌ Usage: .getvar <KEY>\n\n' +
        'Examples:\n' +
        '.getvar PREFIX\n' +
        '.getvar BOT_NAME\n' +
        '.getvar BOT_MODE\n\n' +
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
    
    // Get current value and metadata
    const value = await getConfig(key);
    const metadata = getKeyMetadata(key);
    
    // Add current value to metadata for display
    metadata.value = value;
    metadata.isSet = value !== metadata.default;
    
    await logCommandExecution({
      command: 'getvar',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { key },
      success: true,
      permissionLevel: 'owner'
    });
    
    const displayText = generateSingleSettingDisplay(key, metadata);
    return reply(displayText);
  }
};

export default command;
