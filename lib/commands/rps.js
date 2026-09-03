/**
 * Command: rps
 * Category: game
 * Description: Play rock-paper-scissors against the bot
 */

import { gameAI } from '../utils/game-ai.js';
import { rpgUtils } from '../utils/rpg.js';
import { logger } from '../utils/logger.js';

export const command = {
  pattern: 'rps',
  aliases: ['rockpaperscissors', 'roshambo'],
  description: 'Play rock-paper-scissors against the bot',
  category: 'game',
  usage: '<rock|paper|scissors>',
  ownerOnly: false,
  groupOnly: false,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Parse player's choice
      const choice = (args[0] || '').toLowerCase();
      
      if (!['rock', 'paper', 'scissors'].includes(choice)) {
        await sock.sendMessage(chatId, { 
          text: `❌ Invalid choice! Use \`.rps rock\`, \`.rps paper\`, or \`.rps scissors\``
        });
        return;
      }
      
      // Bot makes choice
      const botChoice = gameAI.getRPSChoice();
      
      // Determine winner
      const result = gameAI.determineRPSWinner(choice, botChoice);
      
      const emojis = {
        rock: '🪨',
        paper: '📄',
        scissors: '✂️'
      };
      
      let messageText = `🎮 *Rock Paper Scissors!* 🎮\n\n`;
      messageText += `You chose: ${emojis[choice]} *${choice}*\n`;
      messageText += `Bot chose: ${emojis[botChoice]} *${botChoice}*\n\n`;
      
      if (result === 'draw') {
        messageText += `🤝 *Draw!* No one wins.`;
      } else if (result === 'player') {
        messageText += `🎉 *You Win!* +25 coins!`;
        await rpgUtils.updateBalance(userId, 25, 'rps_win');
      } else {
        messageText += `😢 *Bot Wins!* Better luck next time!`;
      }
      
      await sock.sendMessage(chatId, { text: messageText });
      
    } catch (error) {
      logger.error('[RPS] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while playing.' });
    }
  }
};

export default command;
