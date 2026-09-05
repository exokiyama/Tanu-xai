/**
 * Command: cachestat
 * Category: developer (hidden)
 * Description: Shows cache statistics and information
 * Owner-only, hidden from menu
 */

const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');
const cache = require('../utils/cache');

module.exports = {
  name: 'cachestat',
  pattern: 'cachestat',
  aliases: ['cacheinfo', 'cacheclear'],
  category: 'developer',
  description: 'Shows cache statistics and information',
  usage: '<command> [--confirm] (for clear)',
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
      
      // Check if user wants to clear cache
      if (args.includes('clear') || args.includes('--clear')) {
        if (!args.includes('--confirm')) {
          await sock.sendMessage(jid, { 
            text: '⚠️ This will clear ALL cached data. Type `.cachestat clear --confirm` to proceed.' 
          });
          return;
        }
        
        // Clear the cache
        cache.clearCache();
        await sock.sendMessage(jid, { 
          text: '✅ Cache cleared successfully.' 
        });
        console.log('[CACHESTAT] Cache cleared by owner');
        return;
      }
      
      let output = formatter.createHeader('💾 CACHE STATISTICS');
      
      // Get cache stats
      const stats = cache.getCacheStats();
      
      output += formatter.formatSection('Overview', {
        'Total Entries': stats.total,
        'Active Entries': stats.active,
        'Expired Entries': stats.expired,
        'Hit Rate': 'N/A (tracking not enabled)'
      });
      
      // Memory estimate (rough)
      const estimatedMemory = (stats.active * 0.5).toFixed(2); // Rough estimate in KB
      output += `\n💽 Memory Usage\n`;
      output += formatter.formatKeyValue('Estimated', `${estimatedMemory} KB`, true);
      
      // Note about cache
      output += `\nℹ️ Cache auto-cleanup runs every 5 minutes.\n`;
      output += `   Use \`.cachestat clear --confirm\` to manually clear all cache.\n`;
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[CACHESTAT] Error executing cachestat command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Cache statistics check failed. Check logs for details.' 
      });
    }
  }
};
