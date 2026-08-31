import { CommandPlugin } from '../../types/index.js';

const plugin: CommandPlugin = {
  name: 'ping',
  category: 'system',
  description: 'Check response latency',
  usage: '.ping',
  aliases: [],
  execute: async (ctx) => {
    const start = Date.now();
    const sentMsg = await ctx.sock.sendMessage(ctx.chat, { text: '🏓 PING' });
    const ping = Date.now() - start;

    await ctx.sock.sendMessage(ctx.chat, {
      text: `🏓 PONG\n\nLatency: ${ping} ms`
    });
  }
};

export default plugin;
