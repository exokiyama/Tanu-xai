/**
 * Command: guess
 * Category: game
 * Description: Play guess the number game
 */

const { gameManager } = require('../utils/game-manager.js');
const { gameAI } = require('../utils/game-ai.js');
const { logger } = require('../utils/logger.js');
const command = {
  pattern: 'guess',
  aliases: ['guessnumber', 'numbergame'],
  description: 'Play guess the number game (bot picks a number, you guess it)',
  category: 'game',
  usage: '[min] [max] (default: 1-100)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Check if there's already an active guess game
      const existingGame = gameManager.getActiveGame(chatId, 'guess');
      if (existingGame && existingGame.status === 'active') {
        await sock.sendMessage(chatId, { 
          text: '❌ A guess-the-number game is already in progress! Use `.answer <number>` to make your guess.'
        });
        return;
      }
      
      // Parse range
      let min = 1;
      let max = 100;
      
      if (args.length >= 2) {
        const parsedMin = parseInt(args[0]);
        const parsedMax = parseInt(args[1]);
        if (!isNaN(parsedMin) && !isNaN(parsedMax) && parsedMin < parsedMax) {
          min = parsedMin;
          max = parsedMax;
        }
      }
      
      // Pick random number
      const targetNumber = gameAI.pickRandomNumber(min, max);
      
      // Create game
      const result = gameManager.createGame(chatId, 'guess', [userId], {
        min,
        max,
        targetNumber
      });
      
      if (!result.success) {
        await sock.sendMessage(chatId, { text: `❌ ${result.error}` });
        return;
      }
      
      const gameState = result.gameState;
      gameState.attempts = 0;
      
      gameManager.updateGameState(chatId, 'guess', gameState);
      
      await sock.sendMessage(chatId, { 
        text: `🎮 *Guess the Number!* 🔢\n\n` +
              `I'm thinking of a number between *${min}* and *${max}*.\n\n` +
              `Try to guess it! Use \`.answer <number>\` or \`.guess <number>\`\n\n` +
              `_Hint: I'll tell you if your guess is higher or lower_`
      });
      
    } catch (error) {
      logger.error('[Guess] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while starting the game.' });
    }
  }
};

// Missing module.exports fixed
module.exports = command;
