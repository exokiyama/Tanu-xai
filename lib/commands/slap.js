const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'slap ?(.*)',
  aliases: ['hit'],
  description: 'Slap someone with a GIF',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'slap',
      captionTemplate: '{sender} slapped {target} 👋'
    });
  }
};
