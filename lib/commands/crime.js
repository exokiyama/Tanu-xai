/**
 * Crime Command - Risky way to earn coins
 */

import { getBalance, updateBalance, checkCooldown, setCooldown, addXP } from '../utils/rpg.js';

const CRIME_COOLDOWN = 2 * 60 * 60 * 1000; // 2 hours in ms
const CRIME_TYPES = [
  { name: 'Pickpocket', risk: 0.3, rewardMin: 50, rewardMax: 150 },
  { name: 'Burglary', risk: 0.5, rewardMin: 100, rewardMax: 300 },
  { name: 'Bank Robbery', risk: 0.7, rewardMin: 500, rewardMax: 1500 },
  { name: 'Casino Heist', risk: 0.8, rewardMin: 1000, rewardMax: 3000 }
];

export const command = {
  pattern: 'crime',
  aliases: ['rob', 'steal'],
  description: 'Commit a crime to earn coins (risky!)',
  category: 'rpg',
  usage: 'crime',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      // Check cooldown
      const cooldownCheck = await checkCooldown(userId, 'crime', CRIME_COOLDOWN);
      
      if (!cooldownCheck.ready) {
        const hours = Math.floor(cooldownCheck.remainingMs / (60 * 60 * 1000));
        const minutes = Math.floor((cooldownCheck.remainingMs % (60 * 60 * 1000)) / (60 * 1000));
        
        await sock.sendMessage(message.chat, {
          text: `⏰ *Crime Cooldown*\n\nThe heat is still on! Wait ${hours}h ${minutes}m before committing another crime.`
        });
        return;
      }
      
      // Get user level to determine available crimes
      const profile = await context.rpg?.getUserProfile?.(userId) || 
                      (await import('../utils/rpg.js')).getUserProfile(userId);
      const userLevel = profile?.level || 1;
      
      // Higher levels unlock riskier crimes
      const maxCrimeIndex = Math.min(Math.floor((userLevel - 1) / 25), CRIME_TYPES.length - 1);
      const availableCrimes = CRIME_TYPES.slice(0, maxCrimeIndex + 1);
      
      // Pick random crime
      const crime = availableCrimes[Math.floor(Math.random() * availableCrimes.length)];
      
      // Determine success or failure
      const roll = Math.random();
      const success = roll >= crime.risk;
      
      if (success) {
        // Successful crime - grant reward
        const coinReward = Math.floor(crime.rewardMin + Math.random() * (crime.rewardMax - crime.rewardMin));
        const xpReward = Math.floor(coinReward / 5);
        
        const balanceResult = await updateBalance(userId, coinReward, 'crime');
        
        if (!balanceResult.success) {
          await sock.sendMessage(message.chat, {
            text: `❌ Failed to collect your earnings: ${balanceResult.message}`
          });
          return;
        }
        
        await setCooldown(userId, 'crime');
        const xpResult = await addXP(userId, xpReward);
        
        let response = `🦹 *Crime Successful!*\\n\\n`;
        response += `Crime: ${crime.name}\\n`;
        response += `+ 🪙 ${coinReward} coins\\n`;
        response += `+ ⭐ ${xpReward} XP\\n\\n`;
        response += `New Balance: 🪙 ${balanceResult.balance.toLocaleString()}\\n`;
        
        if (xpResult?.leveledUp) {
          response += `\\n🎉 *LEVEL UP!* You are now level ${xpResult.level}!\\n`;
        }
        
        await sock.sendMessage(message.chat, { 
          text: response,
          contextInfo: { mentionedJid: [userId] }
        });
      } else {
        // Failed crime - penalty
        const currentBalance = await getBalance(userId);
        const penalty = Math.min(currentBalance, Math.floor((crime.rewardMin + crime.rewardMax) / 4));
        
        if (penalty > 0) {
          await updateBalance(userId, -penalty, 'crime_penalty');
        }
        
        await setCooldown(userId, 'crime');
        
        const outcomes = [
          'You got caught by the police!',
          'Your plan went terribly wrong!',
          'Someone spotted you!',
          'You tripped the alarm!',
          'The cops were waiting for you!'
        ];
        
        let response = `🚔 *Crime Failed!*\\n\\n`;
        response += `${outcomes[Math.floor(Math.random() * outcomes.length)]}\\n\\n`;
        response += `Crime: ${crime.name}\\n`;
        
        if (penalty > 0) {
          response += `- 🪙 ${penalty} coins (fine)\\n`;
        }
        
        response += `\\nYou're now wanted by the police! Lay low for a while.`;
        
        await sock.sendMessage(message.chat, { 
          text: response,
          contextInfo: { mentionedJid: [userId] }
        });
      }
    } catch (error) {
      console.error('[Crime] Error:', error.message);
      await sock.sendMessage(message.chat, { 
        text: '❌ Crime operation failed. Please try again.' 
      });
    }
  }
};

export default command;
