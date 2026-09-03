/**
 * Rank Command - View user's rank and stats
 */

import { getUserProfile, getBalance, getInventory } from '../utils/rpg.js';
import { query } from '../database/index.js';

export const command = {
  pattern: 'rank',
  aliases: ['stats', 'profile', 'me'],
  description: 'View your rank and statistics',
  category: 'rpg',
  usage: 'rank [@user]',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      let userId = message.sender;
      
      // Check for mentioned user or reply
      if (message.quoted) {
        userId = message.quoted.sender;
      } else if (args.length > 0 && args[0].includes('@')) {
        const mentionMatch = args[0].match(/@(\d+)/);
        if (mentionMatch) {
          userId = `${mentionMatch[1]}@s.whatsapp.net`;
        }
      }
      
      const [profile, balance, inventory] = await Promise.all([
        getUserProfile(userId),
        getBalance(userId),
        getInventory(userId)
      ]);
      
      if (!profile) {
        await sock.sendMessage(message.chat, {
          text: '❌ User profile not found. They may need to register first.'
        });
        return;
      }
      
      // Calculate global rank
      let rankResult;
      try {
        rankResult = await query(
          `SELECT COUNT(*) as total_users FROM users WHERE xp > $1`,
          [profile.xp]
        );
      } catch (error) {
        console.error('[Rank] Error calculating rank:', error.message);
      }
      
      const rankPosition = rankResult?.rows?.[0]?.total_users 
        ? parseInt(rankResult.rows[0].total_users) + 1 
        : 'Unknown';
      
      const itemCount = Object.values(inventory).reduce((sum, qty) => sum + qty, 0);
      
      // Calculate XP progress
      const xpForNextLevel = profile.level * 1000;
      const xpCurrentLevel = (profile.level - 1) * 1000;
      const xpProgress = profile.xp - xpCurrentLevel;
      const xpNeeded = xpForNextLevel - xpCurrentLevel;
      const progressBar = '█'.repeat(Math.floor((xpProgress / xpNeeded) * 10)) + 
                         '░'.repeat(10 - Math.floor((xpProgress / xpNeeded) * 10));
      
      let response = `📊 *${profile.displayName || 'User'}'s Profile*\n\n`;
      response += `*Level:* ${profile.level}\n`;
      response += `*Rank:* #${rankPosition} globally\n`;
      response += `*XP:* ${profile.xp.toLocaleString()} / ${xpForNextLevel.toLocaleString()}\n`;
      response += `[${progressBar}] ${(Math.floor((xpProgress / xpNeeded) * 100))}%\n\n`;
      response += `*Coins:* 🪙 ${balance.toLocaleString()}\n`;
      response += `*Items:* 🎒 ${Object.keys(inventory).length} types (${itemCount} total)\n\n`;
      
      // Registration date
      if (profile.registeredAt) {
        const regDate = new Date(profile.registeredAt);
        response += `*Registered:* ${regDate.toLocaleDateString()}\n`;
      }
      
      // Last activities
      const lastDaily = profile.lastDaily ? new Date(profile.lastDaily).toLocaleDateString() : 'Never';
      const lastWork = profile.lastWork ? new Date(profile.lastWork).toLocaleDateString() : 'Never';
      const lastCrime = profile.lastCrime ? new Date(profile.lastCrime).toLocaleDateString() : 'Never';
      
      response += `\n*Last Daily:* ${lastDaily}\n`;
      response += `*Last Work:* ${lastWork}\n`;
      response += `*Last Crime:* ${lastCrime}\n`;
      
      await sock.sendMessage(message.chat, {
        text: response,
        contextInfo: { mentionedJid: [userId] }
      });
    } catch (error) {
      console.error('[Rank] Error:', error.message);
      await sock.sendMessage(message.chat, {
        text: '❌ Failed to fetch rank. Please try again.'
      });
    }
  }
};

export default command;
