/**
 * Command: eventloop
 * Category: developer (hidden)
 * Description: Shows event loop lag and performance diagnostics
 * Owner-only, hidden from menu
 */

const { performance } = require('perf_hooks');
const redactor = require('../utils/redactor');
const formatter = require('../utils/debug-formatter');
const { isOwner } = require('../utils/permissions.js');

module.exports = {
  name: 'eventloop',
  pattern: 'eventloop',
  aliases: ['cpustat', 'slowquery', 'profiler'],
  category: 'developer',
  description: 'Shows event loop lag and performance diagnostics',
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
      
      let output = formatter.createHeader('⚡ EVENT LOOP DIAGNOSTICS');
      
      // Measure event loop lag
      const lagMeasurements = [];
      const measureLag = () => {
        return new Promise((resolve) => {
          const start = performance.now();
          setTimeout(() => {
            const end = performance.now();
            const lag = end - start - 0; // Expected delay is 0 for immediate timeout
            resolve(lag);
          }, 0);
        });
      };
      
      // Take multiple measurements
      for (let i = 0; i < 5; i++) {
        const lag = await measureLag();
        lagMeasurements.push(lag);
      }
      
      const avgLag = lagMeasurements.reduce((a, b) => a + b, 0) / lagMeasurements.length;
      const maxLag = Math.max(...lagMeasurements);
      const minLag = Math.min(...lagMeasurements);
      
      output += `\n📊 Event Loop Lag\n`;
      output += formatter.formatKeyValue('Average', `${avgLag.toFixed(2)}ms`);
      output += formatter.formatKeyValue('Minimum', `${minLag.toFixed(2)}ms`);
      output += formatter.formatKeyValue('Maximum', `${maxLag.toFixed(2)}ms`, true);
      
      // CPU usage
      const cpuUsage = process.cpuUsage();
      const userSec = (cpuUsage.user / 1000000).toFixed(2);
      const systemSec = (cpuUsage.system / 1000000).toFixed(2);
      
      output += `\n🖥️ CPU Usage (since startup)\n`;
      output += formatter.formatKeyValue('User Time', `${userSec}s`);
      output += formatter.formatKeyValue('System Time', `${systemSec}s`, true);
      
      // Handle count
      const handleCount = process.getActiveResourcesInfo ? 
        Object.values(process.getActiveResourcesInfo()).reduce((a, b) => a + b, 0) : 'N/A';
      
      output += `\n🔗 Active Resources\n`;
      output += formatter.formatKeyValue('Handles', handleCount);
      output += formatter.formatKeyValue('Listeners', process.listenerCount('message'), true);
      
      // Performance assessment
      output += `\n🏥 Performance Health\n`;
      if (avgLag < 50) {
        output += formatter.formatKeyValue('Status', '✅ Excellent - Event loop is responsive');
      } else if (avgLag < 200) {
        output += formatter.formatKeyValue('Status', '⚠️ Fair - Some blocking detected');
      } else {
        output += formatter.formatKeyValue('Status', '❌ Poor - Significant blocking operations');
      }
      
      // Recommendations
      if (avgLag >= 200) {
        output += `\n\n💡 Recommendations:\n`;
        output += `   • Check for synchronous file operations\n`;
        output += `   • Review database queries for blocking\n`;
        output += `   • Consider using worker threads for heavy tasks\n`;
      }
      
      // Slow query info (if database available)
      const db = context.db || global.db;
      if (db && typeof db.getSlowQueries === 'function') {
        try {
          const slowQueries = db.getSlowQueries();
          if (slowQueries && slowQueries.length > 0) {
            output += `\n\n🐌 Recent Slow Queries (>100ms)\n`;
            for (let i = 0; i < Math.min(slowQueries.length, 5); i++) {
              const q = slowQueries[i];
              const isLast = i === Math.min(slowQueries.length, 5) - 1;
              output += formatter.formatKeyValue(
                `#${i + 1}`, 
                `${q.duration}ms - ${q.query?.substring(0, 40) || 'Unknown'}`, 
                isLast
              );
            }
          }
        } catch (e) {
          // Silent fail for slow queries
        }
      }
      
      // Redact any sensitive data before sending
      output = redactor.redactString(output);
      
      await sock.sendMessage(jid, { text: output });
      
    } catch (error) {
      console.error('[EVENTLOOP] Error executing eventloop command:', error);
      await sock.sendMessage(message.key.remoteJid, { 
        text: '❌ Event loop diagnostics failed. Check logs for details.' 
      });
    }
  }
};
