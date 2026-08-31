import { CommandPlugin } from '../../types/index.js';

const startTime = Date.now();

const plugin: CommandPlugin = {
  name: 'alive',
  category: 'system',
  description: 'Check bot status',
  usage: '.alive',
  aliases: ['status'],
  execute: async (ctx) => {
    const uptimeMs = Date.now() - startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const uptime = `Days: ${days}\nHours: ${hours % 24}\nMinutes: ${minutes % 60}\nSeconds: ${seconds % 60}`;
    
    const pingStart = Date.now();
    const msg = await ctx.sock.sendMessage(ctx.chat, { text: '🏓 PING' }, { quoted: ctx.message });
    const ping = Date.now() - pingStart;
    
    if (msg.key.id) {
      await ctx.sock.sendMessage(ctx.chat, { 
        text: `🩷 TANU XAI\n\nStatus: Online 🟢\nUptime: ${uptime}\nPing: ${ping} ms\nMode: Public\nVersion: V1` 
      }, { quoted: msg });
    }
  }
};

export default plugin;
