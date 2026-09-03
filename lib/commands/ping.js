/**
 * Command: ping
 * Category: 📊 Info
 * Description: Check bot response time (latency)
 */

module.exports = {
  name: 'ping',
  pattern: 'ping',
  aliases: ['pong', 'speed', 'p'],
  category: '📊 Info',
  description: 'Check bot response time (latency)',
  usage: '',
  permissions: [],
  
  async execute(sock, message, args, context) {
    const startTime = Date.now();
    
    // Send initial message to measure round-trip time
    const sentMessage = await sock.sendMessage(message.key.remoteJid, { 
      text: '📶 Pinging...' 
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    let emoji = '🟢';
    if (latency > 500) emoji = '🔴';
    else if (latency > 200) emoji = '🟡';
    
    const text = `╭───「 Ping Test 」───⊷\n` +
      `│ ${emoji} Latency: *${latency}ms*\n` +
      `│ Server Time: ${new Date().toISOString()}\n` +
      `╰────────────────────⊷`;
    
    // Edit the message with actual latency
    await sock.sendMessage(message.key.remoteJid, { 
      text,
      edit: sentMessage.key 
    });
  }
};
