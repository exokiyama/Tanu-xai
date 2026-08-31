import { CommandPlugin } from '../../types/index.js';

const plugin: CommandPlugin = {
  name: 'gjid',
  category: 'tools',
  description: 'Get group JID (in groups)',
  usage: '.gjid',
  aliases: ['groupjid'],
  groupOnly: true,
  execute: async (ctx) => {
    await ctx.sock.sendMessage(ctx.chat, {
      text: `🆔 GROUP JID\n\n${ctx.chat}`
    });
  }
};

export default plugin;
