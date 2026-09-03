const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'highfive ?(.*)',
  aliases: ['high5', 'hfive'],
  description: 'High-five someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'highfive',
      captionTemplate: '{sender} high-fived {target} ✋'
    });
  }
};
