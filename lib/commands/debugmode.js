/**
 * Command: debugmode
 * Category: developer (hidden)
 * Description: Toggles verbose debug logging
 * Owner-only, hidden from menu
 */

const fs = require('fs');
const path = require('path');
const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

// Config file for debug mode setting
const CONFIG_PATH = path.join(process.cwd(), 'data', 'debug-config.json');

module.exports = {
  name: 'debugmode',
  pattern: 'debugmode',
  aliases: ['debug', 'verbose'],
  category: 'developer',
  description: 'Toggles verbose debug logging on/off',
  usage: '<on|off|status>',
  ownerOnly: true,
  groupOnly: false,
  hidden: true,
  
  async execute(sock, message, args, context) {
    const { senderJid } = context;
    
    // CRITICAL: Only permanent owner can access debug commands (no sudo)
    if (!isOwner(senderJid)) {
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ This command is restricted to the permanent owner only.' 
      });
      return;
    }
    
    try {
      const jid = message.key.remoteJid;
      
      let output = formatter.createHeader('🔧 DEBUG MODE CONTROL');
      
      // Load current settings
      let debugConfig = { enabled: false };
      try {
        if (fs.existsSync(CONFIG_PATH)) {
          const content = fs.readFileSync(CONFIG_PATH, 'utf8');
          debugConfig = JSON.parse(content);
        }
      } catch (e) {
        console.error('[DEBUGMODE] Error loading config:', e);
      }
      
      // Parse command
      const action = args[0]?.toLowerCase();
      
      if (action === 'on' || action === 'enable') {
        debugConfig.enabled = true;
        debugConfig.enabledAt = new Date().toISOString();
        saveDebugConfig(debugConfig);
        
        output += '\n✅ Debug mode ENABLED\n\n';
        output += '⚠️ WARNING: This will generate extensive logs.\n';
        output += '   All incoming messages, command executions, and DB queries will be logged.\n\n';
        output += 'ℹ️ Use `.debugmode off` to disable when done debugging.\n';
        
        console.log('[DEBUGMODE] Enabled by owner');
        
      } else if (action === 'off' || action === 'disable') {
        debugConfig.enabled = false;
        saveDebugConfig(debugConfig);
        
        output += '\n✅ Debug mode DISABLED\n\n';
        output += 'ℹ️ Normal logging resumed.\n';
        
        console.log('[DEBUGMODE] Disabled by owner');
        
      } else if (action === 'status' || !action) {
        output += '\n📊 Current Status\n';
        output += formatter.formatKeyValue('Mode', debugConfig.enabled ? '🔴 ENABLED' : '🟢 DISABLED');
        
        if (debugConfig.enabledAt) {
          const enabledAt = new Date(debugConfig.enabledAt);
          output += formatter.formatKeyValue('Enabled At', enabledAt.toLocaleString());
          
          if (debugConfig.enabled) {
            const duration = Date.now() - enabledAt.getTime();
            const hours = Math.floor(duration / 3600000);
            const minutes = Math.floor((duration % 3600000) / 60000);
            output += formatter.formatKeyValue('Duration', `${hours}h ${minutes}m`, true);
          }
        }
        
        output += '\n\nℹ️ Use `.debugmode on` to enable or `.debugmode off` to disable.\n';
        
      } else {
        output += '\n⚠️ Invalid option\n\n';
        output += 'Usage:\n';
        output += '  `.debugmode on` - Enable verbose logging\n';
        output += '  `.debugmode off` - Disable verbose logging\n';
        output += '  `.debugmode status` - Show current status\n';
      }
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[DEBUGMODE] Error executing debugmode command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Debug mode control failed. Check logs for details.' 
      });
    }
  }
};

/**
 * Save debug configuration
 * @param {object} config - Debug configuration
 */
function saveDebugConfig(config) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[DEBUGMODE] Error saving config:', e);
  }
}

/**
 * Check if debug mode is enabled
 * @returns {boolean}
 */
function isDebugEnabled() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf8');
      const config = JSON.parse(content);
      return config.enabled === true;
    }
  } catch (e) {
    // Ignore errors
  }
  return false;
}

// Export for use by other modules
module.exports.isDebugEnabled = isDebugEnabled;
