const { config } = require('../../config/config.js');
const { getBotOwner } = require('../utils/permissions.js');

function vcard(name, number) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `TEL;type=CELL;type=VOICE;waid=${number}:+${number}`,
    'END:VCARD'
  ].join('\\n');
}

module.exports = {
  name: 'owner',
  pattern: 'owner',
  aliases: ['creator', 'dev', 'developer', 'o'],
  category: '📊 Info',
  description: 'Show main owner and bot owner information',
  usage: '',
  permissions: [],

  async execute(sock, message, args, context) {
    const botOwner = getBotOwner();
    const text =
      `╭───「 👑 OWNER INFO 」───⊷\n` +
      `│ Main Owner: *${config.ownerName}*\n` +
      `│ Contact: +${config.ownerNumber}\n` +
      `│ Secondary/Bot Owner: ${botOwner ? `+${botOwner}` : 'Not detected'}\n` +
      `│ Bot: *${config.botName}*\n` +
      `│ Mode: *${require('../utils/permissions.js').getBotMode().toUpperCase()}*\n` +
      `╰────────────────────⊷`;

    await context.reply(text);

    // Send the permanent main-owner contact card so tapping the owner
    // opens the WhatsApp contact information.
    await sock.sendMessage(message.key.remoteJid, {
      contacts: {
        displayName: config.ownerName,
        contacts: [{ vcard: vcard(config.ownerName, config.ownerNumber) }]
      }
    });
  }
};
