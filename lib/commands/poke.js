const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'poke ?(.*)',
  aliases: ['pok', 'boop'],
  description: 'Poke someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'poke',
      captionTemplate: '{sender} poked {target} 👆'
    });
  }
};
