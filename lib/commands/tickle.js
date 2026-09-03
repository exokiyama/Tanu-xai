const { sendReaction } = require('../utils/reaction');

module.exports = {
  pattern: 'tickle ?(.*)',
  aliases: ['tickling'],
  description: 'Tickle someone',
  category: 'reaction',
  usage: '@user or reply to message',
  async execute(sock, message, args, context) {
    await sendReaction(sock, message, {
      action: 'tickle',
      captionTemplate: '{sender} tickled {target} 😄'
    });
  }
};
