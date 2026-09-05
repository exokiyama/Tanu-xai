const { checkPermission } = require('../utils/permissions.js');
const { setConfig, getConfig } = require('../utils/config-manager.js');
const { logCommandExecution } = require('../utils/audit-log.js');
/**
 * Command: watermark
 * Category: configuration
 * Description: Set or view the bot watermark (OWNER ONLY)
 */

const command = {
  pattern: 'watermark',
  aliases: ['setwatermark', 'wm'],
  description: 'Set or view the bot watermark (OWNER ONLY)',
  category: 'configuration',
  usage: '[newWatermark]',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'watermark',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newWatermark: args.join(' ') },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    // Get current watermark
    const currentWatermark = await getConfig('WATERMARK');
    
    // If no argument, show current watermark
    if (args.length === 0) {
      return reply(
        `╭───「 Watermark 」───⊷\n` +
        `│ Current watermark: *${currentWatermark}*\n` +
        `│ Status: ⚡ Hot reload (applies immediately)\n` +
        `╰────────────────────────────⊷\n\n` +
        `Usage: .watermark <text>\n` +
        `Example: .watermark Made by Tanu XAI`
      );
    }
    
    const newWatermark = args.join(' ').trim();
    
    // Validate watermark length
    if (newWatermark.length === 0) {
      return reply('❌ Watermark cannot be empty.');
    }
    
    if (newWatermark.length > 100) {
      return reply('❌ Watermark must be 100 characters or less.');
    }
    
    // Set the new watermark
    const result = await setConfig('WATERMARK', newWatermark, { validate: true });
    
    if (!result.success) {
      await logCommandExecution({
        command: 'watermark',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { newWatermark },
        success: false,
        error: result.error,
        permissionLevel: 'owner'
      });
      return reply(`❌ Failed to set watermark: ${result.error}`);
    }
    
    await logCommandExecution({
      command: 'watermark',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { newWatermark, oldWatermark: currentWatermark },
      success: true,
      permissionLevel: 'owner'
    });
    
    return reply(
      `✅ Watermark changed successfully!\n\n` +
      `Previous: ${currentWatermark}\n` +
      `New: *${newWatermark}*\n\n` +
      `⚡ Change applied immediately (hot reload).`
    );
  }
};

// Missing module.exports fixed
module.exports = command;
