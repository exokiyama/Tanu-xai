const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'yeet ?(.*)',
  aliases: ['throw'],
  description: 'Yeet someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'yeet',
      captionTemplate: '{sender} yeeted {target} 🚀'
    });
  }
};
