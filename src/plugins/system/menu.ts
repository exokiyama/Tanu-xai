import { CommandPlugin } from '../../types/index.js';
import { config } from '../../core/config/index.js';

const plugin: CommandPlugin = {
  name: 'menu',
  category: 'system',
  description: 'Show bot menu',
  usage: '.menu',
  aliases: ['help'],
  execute: async (ctx) => {
    const menu = `╭━━━『 🩷 ${config.botName} 』━━━╮
┃
┃ 👑 OWNER
┃   • .setprefix <symbol>
┃   • .setmode public|private
┃   • .setname <name>
┃   • .setsudo @user
┃   • .delsudo @user
┃   • .getsudo
┃
┃ 🛡️ GROUP
┃   • .promote @user
┃   • .demote @user
┃   • .kick @user
┃   • .add 923xxxxxxxxx
┃
┃ 🔐 PROTECTION
┃   Coming Soon
┃
┃ 📱 STATUS
┃   • .alive
┃   • .ping
┃   • .runtime
┃
┃ 📥 DOWNLOAD
┃   Coming Soon
┃
┃ 🎨 STICKER
┃   Coming Soon
┃
┃ 🖼️ MEDIA
┃   Coming Soon
┃
┃ ❤️ REACTIONS
┃   Coming Soon
┃
┃ 😂 FUN
┃   Coming Soon
┃
┃ 🎮 GAMES
┃   Coming Soon
┃
┃ 💰 ECONOMY
┃   Coming Soon
┃
┃ 🤖 AI
┃   Coming Soon
┃
┃ 🔎 SEARCH
┃   Coming Soon
┃
┃ 🧰 TOOLS
┃   • .jid
┃   • .gjid
┃   • .whois @user
┃
┃ ⚙️ SETTINGS
┃   Coming Soon
┃
┃ 🔌 PLUGINS
┃   Coming Soon
┃
╰━━━━━━━━━━━━━━━━━━━━━━╯

🩷 Tanu XAI V1
Mode: Public
Prefix: ${config.prefix}
`;

    await ctx.sock.sendMessage(ctx.chat, { text: menu }, { quoted: ctx.message });
  }
};

export default plugin;
