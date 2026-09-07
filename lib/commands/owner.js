'use strict';

const fs = require('fs');
const path = require('path');
const { config } = require('../../config/config.js');
const { getBotOwner, getBotMode } = require('../utils/permissions.js');

function vcard(name, number) {
  return [
    'BEGIN:VCARD', 'VERSION:3.0', `FN:${name}`,
    `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`, 'END:VCARD'
  ].join('\n');
}

module.exports = {
  name: 'owner', pattern: 'owner', aliases: ['creator', 'dev', 'developer', 'o'],
  category: '👑 Owner', description: 'Show the developer, owner and wife information', usage: '', permissions: [],
  async execute(sock, message, args, context) {
    const botOwner = getBotOwner();
    const caption = [
      '╭━━━〔 👑 TANU XAI OWNER 〕━━━╮',
      `┃ 👨‍💻 *Developer:* ${config.ownerName}`,
      `┃ 💍 *Owner / Wife:* ${config.wifeName}`,
      `┃ 🤖 *Bot:* ${config.botName}`,
      `┃ 🔐 *Mode:* ${getBotMode().toUpperCase()}`,
      `┃ ⚡ *Bot Account:* ${botOwner ? '+' + botOwner : 'Connected account'}`,
      `┃ 📝 *Watermark:* ${config.watermark}`,
      '╰━━━━━━━━━━━━━━━━━━━━━━╯'
    ].join('\n');

    const cardPath = path.join(process.cwd(), 'assets', 'owner-card.mp4');
    if (fs.existsSync(cardPath)) {
      await sock.sendMessage(message.key.remoteJid, {
        video: fs.readFileSync(cardPath),
        caption,
        gifPlayback: true
      }, { quoted: message });
    } else {
      await context.reply(caption);
    }

    await sock.sendMessage(message.key.remoteJid, {
      contacts: {
        displayName: config.ownerName,
        contacts: [{ vcard: vcard(config.ownerName, config.ownerNumber) }]
      }
    });

    await sock.sendMessage(message.key.remoteJid, {
      contacts: {
        displayName: config.wifeName,
        contacts: [{ vcard: vcard(config.wifeName, config.wifeNumber) }]
      }
    });
  }
};
