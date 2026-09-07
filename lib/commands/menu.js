'use strict';

const { generateMenu } = require('../menu/builder');

async function deliverMenu(sock, message, context, menu) {
  const chat = message.key.remoteJid;
  if (menu.type === 'image' && menu.image?.url) {
    return sock.sendMessage(chat, { image: { url: menu.image.url }, caption: menu.text }, { quoted: message });
  }
  if (menu.type === 'image-button' && menu.image?.url) {
    return sock.sendMessage(chat, {
      image: { url: menu.image.url }, caption: menu.text,
      buttons: menu.buttons, headerType: 4
    }, { quoted: message });
  }
  if (menu.type === 'button' && menu.buttons?.length) {
    return sock.sendMessage(chat, { text: menu.text, buttons: menu.buttons, headerType: 1 }, { quoted: message });
  }
  return context.reply(menu.text);
}

module.exports = {
  name: 'menu', pattern: 'menu', aliases: ['help', 'commands', 'h'], category: '📊 Info',
  description: 'Show the command menu', usage: '<normal|button|image|image-button|image-link|category|command>', permissions: [],
  async execute(sock, message, args, context) {
    const commands = context.registry.getAllCommands();
    const query = args.join(' ').toLowerCase().trim();
    const isOwner = context.isOwner;

    if (query && ['normal', 'button', 'image', 'image-button', 'image-link'].includes(query)) {
      return deliverMenu(sock, message, context, generateMenu(commands, query, isOwner));
    }

    if (query) {
      const categoryCommands = commands.filter(c => String(c.category || '').toLowerCase().includes(query));
      if (categoryCommands.length) return deliverMenu(sock, message, context, generateMenu(categoryCommands, 'normal', isOwner));
      const cmd = context.registry.getCommand(query.replace(/^\./, ''));
      if (cmd) return context.reply(require('../menu/builder').getCommandHelp(cmd).text);
    }

    return deliverMenu(sock, message, context, generateMenu(commands, 'normal', isOwner));
  }
};
