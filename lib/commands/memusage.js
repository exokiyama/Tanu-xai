/**
 * Command: memusage
 * Category: developer (hidden)
 * Description: Shows Node.js memory usage statistics
 * Owner-only, hidden from menu
 */

const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

module.exports = {
  name: 'memusage',
  pattern: 'memusage',
  aliases: ['memdump', 'heapstat'],
  category: 'developer',
  description: 'Shows Node.js memory usage statistics',
  usage: '<command>',
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
      
      let output = formatter.createHeader('💾 MEMORY USAGE DIAGNOSTICS');
      
      // Get memory usage
      const memUsage = process.memoryUsage();
      const heapStats = v8.getHeapStatistics ? v8.getHeapStatistics() : null;
      
      // RSS (Resident Set Size)
      output += `\n📊 Memory Overview\n`;
      output += formatter.formatKeyValue('RSS (Total)', formatter.formatMemory(memUsage.rss, memUsage.rss));
      output += formatter.formatKeyValue('Heap Used', formatter.formatMemory(memUsage.heapUsed, memUsage.heapTotal));
      output += formatter.formatKeyValue('Heap Total', formatter.formatMemory(memUsage.heapTotal, memUsage.heapTotal), true);
      
      // Detailed breakdown
      output += `\n📋 Detailed Breakdown\n`;
      output += formatter.formatKeyValue('Stack Size', `${(memUsage.stackBytes / 1024 / 1024).toFixed(2)} MB`);
      output += formatter.formatKeyValue('External Memory', `${(memUsage.external / 1024 / 1024).toFixed(2)} MB`);
      output += formatter.formatKeyValue('Array Buffers', `${(memUsage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`, true);
      
      // Heap statistics if available
      if (heapStats) {
        output += `\n🗂️ Heap Statistics\n`;
        output += formatter.formatKeyValue('Total Heap Size', formatter.formatMemory(heapStats.total_heap_size, heapStats.total_heap_size));
        output += formatter.formatKeyValue('Used Heap Size', formatter.formatMemory(heapStats.used_heap_size, heapStats.total_heap_size));
        output += formatter.formatKeyValue('Heap Size Limit', formatter.formatMemory(heapStats.heap_size_limit, heapStats.heap_size_limit));
        output += formatter.formatKeyValue('Malloced Memory', `${(heapStats.malloced_memory / 1024 / 1024).toFixed(2)} MB`, true);
        
        // Garbage collection info
        output += `\n♻️ Garbage Collection\n`;
        output += formatter.formatKeyValue('GC Runs', heapStats.number_of_gc || 0);
        output += formatter.formatKeyValue('GC Time', `${((heapStats.total_gc_duration || 0) / 1000000).toFixed(2)} ms`, true);
      }
      
      // Trigger GC if requested (Node.js with --expose-gc flag)
      if (args.includes('--gc') || args.includes('gc')) {
        if (global.gc) {
          global.gc();
          output += `\n✅ Garbage collection triggered.\n`;
        } else {
          output += `\n⚠️ GC not available. Start Node.js with --expose-gc flag to enable manual GC.\n`;
        }
      }
      
      // Memory health assessment
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      output += `\n🏥 Memory Health\n`;
      if (heapUsagePercent < 50) {
        output += formatter.formatKeyValue('Status', '✅ Healthy', true);
      } else if (heapUsagePercent < 80) {
        output += formatter.formatKeyValue('Status', '⚠️ Moderate usage', true);
      } else {
        output += formatter.formatKeyValue('Status', '❌ High usage - consider restart', true);
      }
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[MEMUSAGE] Error executing memusage command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Memory usage check failed. Check logs for details.' 
      });
    }
  }
};

// Load v8 module
const v8 = require('v8');
