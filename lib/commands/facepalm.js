const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'facepalm ?(.*)',
  aliases: ['facepalm', 'fm'],
  description: 'Facepalm at someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'facepalm',
      captionTemplate: '{sender} facepalmed at {target} 🤦'
    });
  }
};
