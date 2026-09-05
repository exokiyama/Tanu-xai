const { checkPermission } = require('../utils/permissions.js');
const { setConfig, getConfig } = require('../utils/config-manager.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: stickerpack
 * Category: configuration
 * Description: Set or view sticker pack name (OWNER ONLY)
 */

const command = {
  pattern: 'stickerpack',
  aliases: ['setpackname', 'packname', 'stickerpackname'],
  description: 'Set or view sticker pack name (OWNER ONLY)',
  category: 'configuration',
  usage: '[newPackname]',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'stickerpack',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newPackname: args.join(' ') },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    // Get current packname
    const currentPackname = await getConfig('STICKER_PACKNAME');
    
    // If no argument, show current packname
    if (args.length === 0) {
      return reply(
        `╭───「 Sticker Pack Name 」───⊷\n` +
        `│ Current packname: *${currentPackname}*\n` +
        `│ Status: ⚡ Hot reload (applies immediately)\n` +
        `╰────────────────────────────⊷\n\n` +
        `Usage: .stickerpack <name>\n` +
        `Example: .stickerpack Tanu XAI Stickers`
      );
    }
    
    const newPackname = args.join(' ').trim();
    
    // Validate packname length
    if (newPackname.length === 0) {
      return reply('❌ Sticker pack name cannot be empty.');
    }
    
    if (newPackname.length > 100) {
      return reply('❌ Sticker pack name must be 100 characters or less.');
    }
    
    // Set the new packname
    const result = await setConfig('STICKER_PACKNAME', newPackname, { validate: true });
    
    if (!result.success) {
      await logCommandExecution({
        command: 'stickerpack',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newPackname },
        success: false,
        error: result.error,
        permissionLevel: 'owner'
      });
      return reply(`❌ Failed to set sticker pack name: ${result.error}`);
    }
    
    await logCommandExecution({
      command: 'stickerpack',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { newPackname, oldPackname: currentPackname },
      success: true,
      permissionLevel: 'owner'
    });
    
    return reply(
      `✅ Sticker pack name changed successfully!\n\n` +
      `Previous: ${currentPackname}\n` +
      `New: *${newPackname}*\n\n` +
      `⚡ Change applied immediately (hot reload).`
    );
  }
};

// Missing module.exports fixed
module.exports = command;
