const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'bite ?(.*)',
  aliases: ['nom'],
  description: 'Bite someone with a cute GIF',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'bite',
      captionTemplate: '{sender} bit {target} 🦷'
    });
  }
};
