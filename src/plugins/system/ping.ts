import { CommandPlugin } from '../../types/index.js';

const plugin: CommandPlugin = {
  name: 'ping',
  category: 'system',
  description: 'Check response latency',
  usage: '.ping',
  aliases: [],
  execute: async (ctx) => {
    const start = Date.now();
    const msg = await ctx.sock.sendMessage(ctx.chat, { text: '🏓 PING' }, { quoted: ctx.message });
    const ping = Date.now() - start;
    
    if (msg.key.id) {
      await ctx.sock.sendMessage(ctx.chat, { 
        text: `🏓 PONG\n\nLatency: ${ping} ms` 
      }, { quoted: msg });
    }
  }
};

export default plugin;
