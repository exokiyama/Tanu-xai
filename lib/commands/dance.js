const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'dance ?(.*)',
  aliases: ['dancing'],
  description: 'Dance with someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'dance',
      captionTemplate: '{sender} danced with {target} 💃'
    });
  }
};
