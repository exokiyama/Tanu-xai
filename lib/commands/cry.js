const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'cry ?(.*)',
  aliases: ['crying', 'sad'],
  description: 'Cry because of someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'cry',
      captionTemplate: '{sender} cried because of {target} 😢'
    });
  }
};
