/**
 * Balance Command - Check user's current balance
 */

import { getBalance, getUserProfile } from '../utils/rpg.js';

export const command = {
  pattern: 'balance',
  aliases: ['bal', 'money', 'coins'],
  description: 'Check your current coin balance',
  category: 'rpg',
  usage: 'balance',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      const [balance, profile] = await Promise.all([
        getBalance(userId),
        getUserProfile(userId)
      ]);
      
      let response = `💰 *Your Balance*\n\n`;
      response += `Coins: 🪙 ${balance.toLocaleString()}\n`;
      response += `Level: 📊 ${profile?.level || 1}\n`;
      response += `XP: ⭐ ${profile?.xp || 0}\n`;
      
      await sock.sendMessage(message.chat, { 
        text: response,
        contextInfo: {
          mentionedJid: [userId]
        }
      });
    } catch (error) {
      console.error('[Balance] Error:', error.message);
      await sock.sendMessage(message.chat, { 
        text: '❌ Failed to fetch balance. Please try again.' 
      });
    }
  }
};

export default command;
