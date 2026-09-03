const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'smug ?(.*)',
  aliases: ['smugface'],
  description: 'Look smug at someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'smug',
      captionTemplate: '{sender} looked smug at {target} 😏'
    });
  }
};
