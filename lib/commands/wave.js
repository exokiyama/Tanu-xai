const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'wave ?(.*)',
  aliases: ['waving', 'bye'],
  description: 'Wave at someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'wave',
      captionTemplate: '{sender} waved at {target} 👋'
    });
  }
};
