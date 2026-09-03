const { getAvailableReactions } = require('../utils/reaction');

module.exports = {
  pattern: 'reactions ?(.*)',
  aliases: ['reactlist', 'reactionlist', 'emojis'],
  description: 'List all available reaction commands',
  category: 'reaction',
  usage: 'reactions',
  async execute(sock, message, args, context) {
    const reactions = getAvailableReactions();
    
    let text = `🎭 *AVAILABLE REACTIONS*\n\n`;
    text += `Total: ${reactions.length} reactions\n\n`;
    
    // Group reactions alphabetically
    const grouped = {};
    reactions.forEach(r => {
      const firstLetter = r.charAt(0).toUpperCase();
      if (!grouped[firstLetter]) grouped[firstLetter] = [];
      grouped[firstLetter].push(r);
    });
    
    for (const [letter, items] of Object.entries(grouped).sort()) {
      text += `*${letter}:* ${items.join(', ')}\n`;
    }
    
    text += `\nUse: .<reaction> @user`;
    
    await sock.sendMessage(message.chat || message.key?.remoteJid, { 
      text: text 
    }, { quoted: message });
  }
};
