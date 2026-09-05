/**
 * Daily Command - Claim daily reward
 */

const { getBalance, updateBalance, checkCooldown, setCooldown, addXP } = require('../utils/rpg.js');
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in ms
const DAILY_REWARD = 500;
const DAILY_XP = 100;

const command = {
  pattern: 'daily',
  aliases: ['day', 'claim'],
  description: 'Claim your daily reward of coins and XP',
  category: 'rpg',
  usage: 'daily',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      // Check cooldown
      const cooldownCheck = await checkCooldown(userId, 'daily', DAILY_COOLDOWN);
      
      if (!cooldownCheck.ready) {
        const hours = Math.floor(cooldownCheck.remainingMs / (60 * 60 * 1000));
        const minutes = Math.floor((cooldownCheck.remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        
        await sock.sendMessage(message.chat, {
          text: `⏰ *Daily Reward Cooldown*\n\nYou've already claimed your daily reward!\nCome back in ${hours}h ${minutes}m.`
        });
        return;
      }
      
      // Grant rewards with transaction
      const balanceResult = await updateBalance(userId, DAILY_REWARD, 'daily');
      
      if (!balanceResult.success) {
        await sock.sendMessage(message.chat, {
          text: `❌ Failed to claim daily reward: ${balanceResult.message}`
        });
        return;
      }
      
      // Set cooldown
      await setCooldown(userId, 'daily');
      
      // Add XP
      const xpResult = await addXP(userId, DAILY_XP);
      
      let response = `🎁 *Daily Reward Claimed!*\n\n`;
      response += `+ 🪙 ${DAILY_REWARD} coins\n`;
      response += `+ ⭐ ${DAILY_XP} XP\n\n`;
      response += `New Balance: 🪙 ${balanceResult.balance.toLocaleString()}\n`;
      
      if (xpResult?.leveledUp) {
        response += `\n🎉 *LEVEL UP!* You are now level ${xpResult.level}!\n`;
      }
      
      await sock.sendMessage(message.chat, { 
        text: response,
        contextInfo: {
          mentionedJid: [userId]
        }
      });
    } catch (error) {
      console.error('[Daily] Error:', error.message);
      await sock.sendMessage(message.chat, { 
        text: '❌ Failed to claim daily reward. Please try again.' 
      });
    }
  }
};

