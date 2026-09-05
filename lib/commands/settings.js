const { checkPermission } = require('../utils/permissions.js');
const { getAllConfigWithMetadata, getCategories } = require('../utils/config-manager.js');
const { logCommandExecution } = require('../utils/audit-log.js');
const { generateSettingsDisplay } = require('../utils/config-display.js');
/**
 * Command: settings
 * Category: configuration
 * Description: Display all bot configuration settings (OWNER ONLY)
 */

const command = {
  pattern: 'settings',
  aliases: ['config', 'allsettings', 'allvars'],
  description: 'Display all bot configuration settings (OWNER ONLY)',
  category: 'configuration',
  usage: '',
  ownerOnly: true,
  groupOnly: false,
  
  async handler(sock, message, args, context) {
    const { reply, senderJid, chatId } = context;
    
    // CRITICAL: Check permission - OWNER ONLY
    const permCheck = await checkPermission(senderJid, 'owner');
    if (!permCheck.allowed) {
      await logCommandExecution({
        command: 'settings',
        senderJid,
        chatId,
        isGroup: chatId.endsWith('@g.us'),
        parameters: {},
        success: false,
        error: 'Unauthorized access attempt',
        permissionLevel: 'denied'
      });
      return reply('❌ ACCESS DENIED: This command requires owner privileges');
    }
    
    // Get all configuration with metadata
    const configWithMetadata = await getAllConfigWithMetadata();
    
    await logCommandExecution({
      command: 'settings',
      senderJid,
      chatId,
      isGroup: chatId.endsWith('@g.us'),
      parameters: {},
      success: true,
      permissionLevel: 'owner'
    });
    
    // Generate formatted display
    const displayText = generateSettingsDisplay(configWithMetadata);
    
    // Send in chunks if too long
    const maxLength = 4000; // WhatsApp message limit
    if (displayText.length <= maxLength) {
      return reply(displayText);
    }
    
    // Split into multiple messages
    const categories = getCategories();
    let currentText = '╭───「 Bot Configuration 」───⊷\n';
    currentText += '│ 📋 Complete Settings Overview\n';
    currentText += '╰────────────────────────────⊷\n\n';
    
    const messages = [];
    
    for (const [catKey, catName] of Object.entries(categories)) {
      const catSettings = Object.entries(configWithMetadata)
        .filter(([key, meta]) => meta.category === catKey);
      
      if (catSettings.length === 0) continue;
      
      let catText = `*━━━━━━━━━━━━━━━━━━━━━━━*\n`;
      catText += `*  ${catName}*\n`;
      catText += `*━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
      
      for (const [key, meta] of catSettings) {
        const valueDisplay = meta.sensitive && meta.value && meta.value !== '' 
          ? '[REDACTED]' 
          : String(meta.value ?? 'Not set');
        const statusIcon = meta.isSet ? '🔧' : '⚙️';
        
        catText += `${statusIcon} *${key}*: ${valueDisplay}\n`;
      }
      
      catText += '\n';
      
      if (currentText.length + catText.length > maxLength) {
        messages.push(currentText);
        currentText = catText;
      } else {
        currentText += catText;
      }
    }
    
    // Add legend to last message
    currentText += `\n*Legend:*\n`;
    currentText += `⚡ Hot reload (applies immediately)\n`;
    currentText += `🔄 Restart required\n`;
    currentText += `🔧 Custom value set\n`;
    currentText += `⚙️ Using default\n`;
    currentText += `[REDACTED] Sensitive data\n`;
    
    messages.push(currentText);
    
    // Send all messages
    for (const msg of messages) {
      await reply(msg);
    }
  }
};

