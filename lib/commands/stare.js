const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'stare ?(.*)',
  aliases: ['looking', 'watch'],
  description: 'Stare at someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'stare',
      captionTemplate: '{sender} stared at {target} 👀'
    });
  }
};
