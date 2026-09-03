const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'pat ?(.*)',
  aliases: ['pet', 'stroke'],
  description: 'Pat someone with a cute GIF',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'pat',
      captionTemplate: '{sender} patted {target} 🐱'
    });
  }
};
