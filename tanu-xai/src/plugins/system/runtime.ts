import { CommandPlugin } from '../../types/index.js';

const startTime = Date.now();

const plugin: CommandPlugin = {
  name: 'runtime',
  category: 'system',
  description: 'Show bot uptime',
  usage: '.runtime',
  aliases: ['uptime'],
  execute: async (ctx) => {
    const uptimeMs = Date.now() - startTime;
    const seconds = Math.floor(uptimeMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const runtime = `⏱️ TANU XAI RUNTIME\n\nDays: ${days}\nHours: ${hours % 24}\nMinutes: ${minutes % 60}\nSeconds: ${seconds % 60}`;
    
    await ctx.sock.sendMessage(ctx.chat, { text: runtime }, { quoted: ctx.message });
  }
};

export default plugin;
