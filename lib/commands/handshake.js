const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'handshake ?(.*)',
  aliases: ['shakehands', 'greet'],
  description: 'Shake hands with someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'handshake',
      captionTemplate: '{sender} shook hands with {target} 🤝'
    });
  }
};
