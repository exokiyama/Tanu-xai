/**
 * Pay Command - Transfer coins to another user
 */

const { getBalance, transferCoins } = require('../utils/rpg.js');
const command = {
  pattern: 'pay',
  aliases: ['give', 'transfer', 'send'],
  description: 'Transfer coins to another user',
  category: 'rpg',
  usage: 'pay @user <amount>',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      // Parse mentions and amount
      let targetUser = null;
      let amount = 0;
      
      // Check for mentioned user
      if (message.quoted) {
        targetUser = message.quoted.sender;
        amount = parseInt(args[0]) || 0;
      } else if (args.length >= 2 && args[0].includes('@')) {
        const mentionMatch = args[0].match(/@(\d+)/);
        if (mentionMatch) {
          targetUser = `${mentionMatch[1]}@s.whatsapp.net`;
          amount = parseInt(args[1]) || 0;
        }
      } else if (args.length >= 1 && !args[0].includes('@')) {
        // If no mention, assume paying the quoted user or fail
        if (!message.quoted) {
          await sock.sendMessage(message.chat, {
            text: '❌ Please mention a user or reply to their message.\n\nUsage: .pay @user <amount>'
          });
          return;
        }
        targetUser = message.quoted.sender;
        amount = parseInt(args[0]) || 0;
      }
      
      // Validate inputs
      if (!targetUser) {
        await sock.sendMessage(message.chat, {
          text: '❌ Could not find the recipient. Please mention them or reply to their message.'
        });
        return;
      }
      
      if (targetUser === userId) {
        await sock.sendMessage(message.chat, {
          text: '❌ You cannot pay yourself!'
        });
        return;
      }
      
      if (isNaN(amount) || amount <= 0) {
        await sock.sendMessage(message.chat, {
          text: '❌ Please specify a valid amount greater than 0.'
        });
        return;
      }
      
      // Check sender balance first
      const currentBalance = await getBalance(userId);
      
      if (currentBalance < amount) {
        await sock.sendMessage(message.chat, {
          text: `❌ Insufficient funds!\nYou have: 🪙 ${currentBalance}\nNeed: 🪙 ${amount}`
        });
        return;
      }
      
      // Execute transfer with transaction safety
      const result = await transferCoins(userId, targetUser, amount);
      
      if (!result.success) {
        await sock.sendMessage(message.chat, {
          text: `❌ Transfer failed: ${result.message}`
        });
        return;
      }
      
      let response = `💸 *Payment Successful!*\n\n`;
      response += `Sent: 🪙 ${amount} to @${targetUser.split('@')[0]}\n`;
      response += `Your new balance: 🪙 ${result.newBalance.toLocaleString()}\n`;
      
      await sock.sendMessage(message.chat, {
        text: response,
        contextInfo: {
          mentionedJid: [userId, targetUser]
        }
      });
    } catch (error) {
      console.error('[Pay] Error:', error.message);
      await sock.sendMessage(message.chat, {
        text: '❌ Payment failed. Please try again.'
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;
