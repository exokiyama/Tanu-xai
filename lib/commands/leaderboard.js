/**
 * Leaderboard Command - View top players
 */

const { getLeaderboard } = require('../utils/rpg.js');
const command = {
  pattern: 'leaderboard',
  aliases: ['top', 'lb', 'ranklist'],
  description: 'View the global leaderboard',
  category: 'rpg',
  usage: 'leaderboard [xp|coins|level] [limit]',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const orderBy = args[0]?.toLowerCase() || 'xp';
      const limit = Math.min(parseInt(args[1]) || 10, 50);
      
      const validOrders = ['xp', 'coins', 'level'];
      const orderField = validOrders.includes(orderBy) ? orderBy : 'xp';
      
      const leaderboard = await getLeaderboard(limit, orderField);
      
      if (leaderboard.length === 0) {
        await sock.sendMessage(message.chat, {
          text: '📊 *Leaderboard*\n\nNo players yet! Be the first to start earning XP and coins.'
        });
        return;
      }
      
      const orderEmojis = {
        xp: '⭐',
        coins: '🪙',
        level: '📊'
      };
      
      let response = `🏆 *Global Leaderboard*\n\n`;
      response += `Sorted by: ${orderEmojis[orderField]} ${orderBy.toUpperCase()}\n`;
      response += `Showing: Top ${leaderboard.length}\n\n`;
      
      for (const player of leaderboard) {
        const rankEmoji = player.rank === 1 ? '🥇' : 
                         player.rank === 2 ? '🥈' : 
                         player.rank === 3 ? '🥉' : `#${player.rank}`;
        
        response += `${rankEmoji} @${player.displayName.split('@')[0]}\n`;
        response += `   Level ${player.level} | ⭐ ${player.xp.toLocaleString()}`;
        
        if (orderField === 'coins') {
          response += ` | 🪙 ${player.coins?.toLocaleString() || '0'}`;
        }
        response += '\n';
      }
      
      response += `\nUse: \`.lb ${validOrders.join('|')} [1-50]\` to customize`;
      
      await sock.sendMessage(message.chat, {
        text: response,
        contextInfo: {
          mentionedJid: leaderboard.map(p => p.id)
        }
      });
    } catch (error) {
      console.error('[Leaderboard] Error:', error.message);
      await sock.sendMessage(message.chat, {
        text: '❌ Failed to fetch leaderboard. Please try again.'
      });
    }
  }
};

