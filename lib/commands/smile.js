const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'smile ?(.*)',
  aliases: ['happy', 'grin'],
  description: 'Smile at someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'smile',
      captionTemplate: '{sender} smiled at {target} 😊'
    });
  }
};
