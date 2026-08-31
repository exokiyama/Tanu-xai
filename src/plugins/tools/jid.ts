import { CommandPlugin } from '../../types/index.js';

const plugin: CommandPlugin = {
  name: 'jid',
  category: 'tools',
  description: 'Get current chat JID',
  usage: '.jid',
  aliases: [],
  execute: async (ctx) => {
    await ctx.sock.sendMessage(ctx.chat, { 
      text: `🆔 CHAT JID\n\n${ctx.chat}` 
    }, { quoted: ctx.message });
  }
};

export default plugin;
