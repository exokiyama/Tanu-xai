/**
 * Work Command - Earn coins by working
 */

const { getBalance, updateBalance, checkCooldown, setCooldown, addXP } = require('../utils/rpg.js');
const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour in ms
const JOBS = [
  { name: 'Miner', baseReward: 50, xpReward: 20 },
  { name: 'Lumberjack', baseReward: 60, xpReward: 25 },
  { name: 'Farmer', baseReward: 70, xpReward: 30 },
  { name: 'Fisher', baseReward: 80, xpReward: 35 },
  { name: 'Blacksmith', baseReward: 100, xpReward: 45 },
  { name: 'Merchant', baseReward: 120, xpReward: 50 },
  { name: 'Teacher', baseReward: 150, xpReward: 60 },
  { name: 'Doctor', baseReward: 200, xpReward: 80 },
  { name: 'Engineer', baseReward: 250, xpReward: 100 },
  { name: 'CEO', baseReward: 500, xpReward: 200 }
];

const command = {
  pattern: 'work',
  aliases: ['job', 'labour'],
  description: 'Work to earn coins and XP',
  category: 'rpg',
  usage: 'work',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      // Check cooldown
      const cooldownCheck = await checkCooldown(userId, 'work', WORK_COOLDOWN);
      
      if (!cooldownCheck.ready) {
        const minutes = Math.floor(cooldownCheck.remainingMs / (60 * 1000));
        
        await sock.sendMessage(message.chat, {
          text: `⏰ *Work Cooldown*\n\nYou're still working! Rest for ${minutes} more minutes.`
        });
        return;
      }
      
      // Get user level to determine job availability
      const profile = await context.rpg?.getUserProfile?.(userId) || 
                      (await import('../utils/rpg.js')).getUserProfile(userId);
      const userLevel = profile?.level || 1;
      
      // Select job based on level (higher levels unlock better jobs)
      const maxJobIndex = Math.min(Math.floor((userLevel - 1) / 10), JOBS.length - 1);
      const availableJobs = JOBS.slice(0, maxJobIndex + 1);
      
      // Pick random job from available ones
      const job = availableJobs[Math.floor(Math.random() * availableJobs.length)];
      
      // Calculate reward with some randomness (+-20%)
      const variance = 0.8 + Math.random() * 0.4;
      const coinReward = Math.floor(job.baseReward * variance);
      const xpReward = Math.floor(job.xpReward * variance);
      
      // Grant rewards
      const balanceResult = await updateBalance(userId, coinReward, 'work');
      
      if (!balanceResult.success) {
        await sock.sendMessage(message.chat, {
          text: `❌ Failed to receive payment: ${balanceResult.message}`
        });
        return;
      }
      
      // Set cooldown
      await setCooldown(userId, 'work');
      
      // Add XP
      const xpResult = await addXP(userId, xpReward);
      
      let response = `💼 *Work Complete!*\n\n`;
      response += `Job: ${job.name}\n`;
      response += `+ 🪙 ${coinReward} coins\n`;
      response += `+ ⭐ ${xpReward} XP\n\n`;
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
      console.error('[Work] Error:', error.message);
      await sock.sendMessage(message.chat, { 
        text: '❌ Failed to work. Please try again.' 
      });
    }
  }
};

