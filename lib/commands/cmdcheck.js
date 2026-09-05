/**
 * Command: cmdcheck
 * Category: developer (hidden)
 * Description: Shows command registry status and detects issues
 * Owner-only, hidden from menu
 */

const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

module.exports = {
  name: 'cmdcheck',
  pattern: 'cmdcheck',
  aliases: ['cmdlist', 'cmdstats', 'cmdregistry'],
  category: 'developer',
  description: 'Shows command registry status and detects issues',
  usage: '<command>',
  ownerOnly: true,
  groupOnly: false,
  hidden: true,
  
  async execute(sock, message, args, context) {
    const { registry, senderJid } = context;
    
    // CRITICAL: Only permanent owner can access debug commands (no sudo)
    if (!isOwner(senderJid)) {
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ This command is restricted to the permanent owner only.' 
      });
      return;
    }
    
    try {
      const jid = message.key.remoteJid;
      
      let output = formatter.createHeader('📦 COMMAND REGISTRY CHECK');
      
      // Get all commands
      const allCommands = registry.getAllCommands();
      
      // Count by status
      const loaded = allCommands.length;
      const failed = registry.getFailedCommands ? registry.getFailedCommands().length : 0;
      
      output += `\n📊 Registry Overview\n`;
      output += formatter.formatKeyValue('Total Commands', loaded);
      output += formatter.formatKeyValue('Failed to Load', failed);
      
      // Detect duplicates
      const patterns = new Map();
      const aliases = new Map();
      const duplicates = [];
      const conflicts = [];
      
      for (const cmd of allCommands) {
        // Check pattern duplicates
        if (patterns.has(cmd.pattern)) {
          duplicates.push(`Duplicate pattern: '${cmd.pattern}' in ${cmd.name} and ${patterns.get(cmd.pattern)}`);
        } else {
          patterns.set(cmd.pattern, cmd.name);
        }
        
        // Check alias conflicts
        if (cmd.aliases && Array.isArray(cmd.aliases)) {
          for (const alias of cmd.aliases) {
            if (aliases.has(alias)) {
              conflicts.push(`Alias conflict: '${alias}' used by ${cmd.name} and ${aliases.get(alias)}`);
            } else {
              aliases.set(alias, cmd.name);
            }
          }
        }
      }
      
      // Check for missing metadata
      const missingMetadata = [];
      for (const cmd of allCommands) {
        if (!cmd.category) {
          missingMetadata.push(`${cmd.name}: missing category`);
        }
        if (!cmd.description) {
          missingMetadata.push(`${cmd.name}: missing description`);
        }
      }
      
      // Report issues
      const allIssues = [...duplicates, ...conflicts];
      if (allIssues.length > 0 || missingMetadata.length > 0) {
        output += formatter.formatIssues(allIssues, 'Registry Issues');
        if (missingMetadata.length > 0) {
          output += formatter.formatIssues(missingMetadata, 'Missing Metadata');
        }
      } else {
        output += '\n✅ No registry issues detected\n';
      }
      
      // Commands by category
      const byCategory = {};
      for (const cmd of allCommands) {
        const cat = cmd.category || 'Uncategorized';
        if (!byCategory[cat]) {
          byCategory[cat] = 0;
        }
        byCategory[cat]++;
      }
      
      output += `\n📋 Commands by Category\n`;
      const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
      for (let i = 0; i < categories.length; i++) {
        const [cat, count] = categories[i];
        const isLast = i === categories.length - 1;
        output += formatter.formatKeyValue(cat, `${count} commands`, isLast);
      }
      
      // Show all command names (limited)
      output += `\n📝 Command List\n`;
      const cmdNames = allCommands.map(c => c.pattern).sort();
      if (cmdNames.length <= 50) {
        output += `   ${cmdNames.join(', ')}\n`;
      } else {
        output += `   ${cmdNames.slice(0, 50).join(', ')}\n`;
        output += `   ... and ${cmdNames.length - 50} more\n`;
      }
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[CMDCHECK] Error executing cmdcheck command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Command check failed. Check logs for details.' 
      });
    }
  }
};
