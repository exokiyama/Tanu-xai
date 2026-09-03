const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'blush ?(.*)',
  aliases: ['embarrassed', 'shy'],
  description: 'Blush at someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'blush',
      captionTemplate: '{sender} blushed at {target} 😊'
    });
  }
};
