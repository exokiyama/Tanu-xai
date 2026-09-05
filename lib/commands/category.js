const { checkPermission } = require('../utils/permissions.js');
const { getConfigByCategory, getCategories, getKeyMetadata, hasKey } = require('../utils/config-manager.js');
const { logCommandExecution } = require('../utils/audit-log.js');
const { generateCategoryDisplay } = require('../utils/config-display.js');
/**
 * Command: category
 * Category: configuration
 * Description: Display settings for a specific category (OWNER ONLY)
 */

const command = {
  pattern: 'category',
  aliases: ['cat', 'settingscat'],
  description: 'Display settings for a specific category (OWNER ONLY)',
  category: 'configuration',
  usage: '<category>',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'category',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: { category: args[0] },
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    const categories = getCategories();
    
    if (args.length < 1) {
      let text = '╭───「 Settings Categories 」───⊷\n';
      text += '│ Available categories:\n';
      text += '╰────────────────────────────⊷\n\n';
      
      for (const [key, name] of Object.entries(categories)) {
        text += `• ${name} (${key})\n`;
      }
      
      text += '\nUsage: .category <name>\n';
      text += 'Example: .category core\n';
      
      return reply(text);
    }
    
    const categoryKey = args[0].toLowerCase();
    
    // Validate category exists
    if (!categories[categoryKey]) {
      let validCategories = Object.keys(categories).join(', ');
      return reply(
        `❌ Unknown category: ${categoryKey}\n\n` +
        `Valid categories: ${validCategories}`
      );
    }
    
    // Get settings for this category
    const categoryConfig = await getConfigByCategory(categoryKey);
    
    // Build metadata for display
    const categoryData = {
      name: categories[categoryKey],
      settings: []
    };
    
    for (const [key, value] of Object.entries(categoryConfig)) {
      const metadata = getKeyMetadata(key);
      if (metadata) {
        categoryData.settings.push({
          key,
          value,
          ...metadata,
          isSet: value !== metadata.default
        });
      }
    }
    
    await logCommandExecution({
      command: 'category',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: { category: categoryKey },
      success: true,
      permissionLevel: 'owner'
    });
    
    const displayText = generateCategoryDisplay(categoryKey, categoryData);
    return reply(displayText);
  }
};

// Missing module.exports fixed
module.exports = command;
