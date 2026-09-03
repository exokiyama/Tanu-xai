const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'bonk ?(.*)',
  aliases: ['bonkhead'],
  description: 'Bonk someone with a GIF',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'bonk',
      captionTemplate: '{sender} bonked {target} 🔨'
    });
  }
};
