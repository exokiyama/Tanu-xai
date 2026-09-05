const { checkPermission } = require('../utils/permissions.js');
const { setConfig, hasKey, getKeyMetadata } = require('../utils/config-manager.js');
const { logCommandExecution } = require('../utils/audit-log.js');
const { generateSingleSettingDisplay } = require('../utils/config-display.js');
/**
 * Command: setvar
 * Category: configuration
 * Description: Set a configuration variable (OWNER ONLY)
 */

const command = {
  pattern: 'setvar',
  aliases: ['setconfig', 'setsetting'],
  description: 'Set a configuration variable (OWNER ONLY)',
  category: 'configuration',
  usage: '<KEY> <value>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'setvar',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { key: args[0], valuePreview: args[1] ? '[HIDDEN]' : undefined },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    if (args.length < 2) {
      return reply(
        '❌ Usage: .setvar <KEY> <value>\n\n' +
        'Examples:\n' +
        '.setvar PREFIX !\n' +
        '.setvar BOT_NAME MyBot\n' +
        '.setvar STICKER_PACKNAME MyStickers\n' +
        '.setvar BOT_MODE private\n\n' +
        'Use .getvar <KEY> to view current settings\n' +
        'Use .settings to view all settings'
      );
    }
    
    const key = args[0].toUpperCase();
    const value = args.slice(1).join(' ');
    
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
    
    // Get metadata for type-specific parsing
    const metadata = getKeyMetadata(key);
    let parsedValue = value;
    
    // Type conversion
    if (metadata.type === 'boolean') {
      parsedValue = value.toLowerCase() === 'true' || value.toLowerCase() === 'on' || value === '1';
    } else if (metadata.type === 'number') {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return reply(`❌ ${key} must be a number, got: ${value}`);
      }
      parsedValue = num;
    } else if (metadata.type === 'enum') {
      if (!metadata.values.includes(value)) {
        return reply(
          `❌ Invalid value for ${key}\n` +
          `Valid values: ${metadata.values.join(', ')}`
        );
      }
      parsedValue = value;
    }
    
    // Set the configuration
    const result = await setConfig(key, parsedValue, { validate: true });
    
    if (!result.success) {
      await logCommandExecution({
        command: 'setvar',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { key, valuePreview: value.substring(0, 50) },
        success: false,
        error: result.error,
        permissionLevel: 'owner'
      });
      return reply(`❌ Failed to set ${key}: ${result.error}`);
    }
    
    await logCommandExecution({
      command: 'setvar',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { key, valuePreview: value.substring(0, 50) },
      success: true,
      permissionLevel: 'owner'
    });
    
    let response = `✅ Successfully set *${key}* to: ${parsedValue}\n\n`;
    
    if (result.requiresRestart) {
      response += '⚠️ *This change requires a bot restart to take effect.*\n';
      response += 'Use .restart to apply the changes.';
    } else {
      response += '⚡ Change applied immediately (hot reload).';
    }
    
    return reply(response);
  }
};

