/**
 * Command: math
 * Category: game
 * Description: Play a math quiz game
 */

const { gameManager } = require('../utils/game-manager.js');
const { gameAI } = require('../utils/game-ai.js');
const { rpgUtils } = require('../utils/rpg.js');
const { logger } = require('../utils/logger.js');
const command = {
  pattern: 'math',
  aliases: ['mathquiz', 'mathgame'],
  description: 'Play a math quiz game with random problems',
  category: 'game',
  usage: '[difficulty] (easy/medium/hard)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Check if there's already an active math game
      const existingGame = gameManager.getActiveGame(chatId, 'math');
      if (existingGame && existingGame.status === 'active') {
        await sock.sendMessage(chatId, { 
          text: '❌ A math quiz is already in progress! Use `.answer <number>` to submit your answer.'
        });
        return;
      }
      
      // Parse difficulty
      const difficulty = (args[0] || 'medium').toLowerCase();
      
      // Generate problem
      const problem = gameAI.generateMathProblem(difficulty);
      
      // Create game
      const result = gameManager.createGame(chatId, 'math', [userId], {
        difficulty,
        correctAnswer: problem.answer,
        question: problem.question,
        timeLimit: 60000 // 1 minute
      });
      
      if (!result.success) {
        await sock.sendMessage(chatId, { text: `❌ ${result.error}` });
        return;
      }
      
      const gameState = result.gameState;
      gameState.attempts = 0;
      gameState.startTime = Date.now();
      
      gameManager.updateGameState(chatId, 'math', gameState);
      
      await sock.sendMessage(chatId, { 
        text: `🧮 *Math Quiz!* ➕➖✖️\n\n` +
              `Difficulty: *${difficulty}*\n\n` +
              `*Problem:* ${problem.question}\n\n` +
              `Use \`.answer <number>\` to submit your answer!\n\n` +
              `_You have 1 minute_`
      });
      
      // Start timer
      setTimeout(async () => {
        const currentGame = gameManager.getActiveGame(chatId, 'math');
        if (currentGame && currentGame.status === 'active' && !currentGame.solved) {
          await sock.sendMessage(chatId, { 
            text: `⏰ *Time's Up!*\n\nThe correct answer was: *${problem.answer}*`
          });
          await gameManager.endGame(chatId, 'math', { result: 'timeout', answer: problem.answer });
        }
      }, 60000);
      
    } catch (error) {
      logger.error('[Math] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while starting the math quiz.' });
    }
  }
};

// Missing module.exports fixed
module.exports = command;
