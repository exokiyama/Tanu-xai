/**
 * Command: trivia
 * Category: game
 * Description: Start a trivia quiz game
 */

const { gameManager } = require('../utils/game-manager.js');
const { gameAI } = require('../utils/game-ai.js');
const { rpgUtils } = require('../utils/rpg.js');
const { logger } = require('../utils/logger.js');
const command = {
  pattern: 'trivia',
  aliases: ['quiz', 'triviagame'],
  description: 'Start a trivia quiz game',
  category: 'game',
  usage: '[category] (optional: geography, science, history, etc.)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Check if there's already an active trivia game
      const existingGame = gameManager.getActiveGame(chatId, 'trivia');
      if (existingGame && existingGame.status === 'active') {
        await sock.sendMessage(chatId, { 
          text: '❌ A trivia game is already in progress! Wait for it to finish.'
        });
        return;
      }
      
      // Parse category
      const category = args[0]?.toLowerCase() || null;
      
      // Create trivia game
      const result = gameManager.createGame(chatId, 'trivia', [userId], {
        category,
        difficulty: args[1]?.toLowerCase() || 'mixed',
        questionTimeLimit: 30000, // 30 seconds per question
        totalQuestions: 5
      });
      
      if (!result.success) {
        await sock.sendMessage(chatId, { text: `❌ ${result.error}` });
        return;
      }
      
      const gameState = result.gameState;
      gameState.score = {};
      gameState.currentQuestion = 0;
      gameState.questionTimer = null;
      
      // Initialize scores for all players
      gameState.players.forEach(p => {
        gameState.score[p] = 0;
      });
      
      gameManager.updateGameState(chatId, 'trivia', gameState);
      
      // Get first question
      const question = gameAI.getTriviaQuestion(category);
      gameState.currentQuestionData = question;
      
      gameManager.updateGameState(chatId, 'trivia', {
        currentQuestionData: question
      });
      
      // Format options with letters
      const optionsText = question.options.map((opt, i) => 
        `${String.fromCharCode(65 + i)}. ${opt}`
      ).join('\n');
      
      await sock.sendMessage(chatId, { 
        text: `🎮 *Trivia Quiz Started!* 🎓\n\n` +
              `Category: *${question.category}*\n` +
              `Difficulty: *${question.difficulty}*\n` +
              `Questions: ${gameState.options.totalQuestions}\n\n` +
              `*Question ${gameState.currentQuestion + 1}:*\n` +
              `${question.question}\n\n` +
              `${optionsText}\n\n` +
              `Reply with \`.answer A/B/C/D\` within 30 seconds!\n\n` +
              `_Players: ${gameState.players.map(p => '@' + p.split('@')[0]).join(', ')}_`,
        mentions: gameState.players
      });
      
      // Start timer
      startTriviaTimer(sock, chatId, gameState);
      
    } catch (error) {
      logger.error('[Trivia] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while starting trivia.' });
    }
  }
};

async function startTriviaTimer(sock, chatId, gameState) {
  // Clear any existing timer
  if (gameState.questionTimer) {
    clearTimeout(gameState.questionTimer);
  }
  
  gameState.questionTimer = setTimeout(async () => {
    // Time's up!
    const correctAnswer = gameState.currentQuestionData.answer;
    
    await sock.sendMessage(chatId, { 
      text: `⏰ *Time's Up!*\n\nThe correct answer was: *${correctAnswer}*`
    });
    
    // Move to next question or end game
    await nextQuestionOrEnd(sock, chatId, gameState);
  }, gameState.options.questionTimeLimit);
  
  gameManager.updateGameState(chatId, 'trivia', { questionTimer: gameState.questionTimer });
}

async function nextQuestionOrEnd(sock, chatId, gameState) {
  gameState.currentQuestion++;
  
  if (gameState.currentQuestion >= gameState.options.totalQuestions) {
    // End game - determine winner
    await endTriviaGame(sock, chatId, gameState);
    return;
  }
  
  // Get next question
  const question = gameAI.getTriviaQuestion(gameState.options.category);
  gameState.currentQuestionData = question;
  
  const optionsText = question.options.map((opt, i) => 
    `${String.fromCharCode(65 + i)}. ${opt}`
  ).join('\n');
  
  gameManager.updateGameState(chatId, 'trivia', {
    currentQuestion: gameState.currentQuestion,
    currentQuestionData: question
  });
  
  await sock.sendMessage(chatId, { 
    text: `📝 *Question ${gameState.currentQuestion + 1}/${gameState.options.totalQuestions}*\n\n` +
          `${question.question}\n\n` +
          `${optionsText}\n\n` +
          `Reply with \`.answer A/B/C/D\` within 30 seconds!`,
  });
  
  startTriviaTimer(sock, chatId, gameState);
}

async function endTriviaGame(sock, chatId, gameState) {
  // Calculate winner
  let maxScore = 0;
  let winners = [];
  
  for (const [player, score] of Object.entries(gameState.score)) {
    if (score > maxScore) {
      maxScore = score;
      winners = [player];
    } else if (score === maxScore) {
      winners.push(player);
    }
  }
  
  let resultMessage = `🏁 *Trivia Game Complete!* 🏁\n\n*Final Scores:*\n`;
  
  for (const [player, score] of Object.entries(gameState.score)) {
    resultMessage += `@${player.split('@')[0]}: ${score} points\n`;
  }
  
  if (winners.length === 1) {
    const winner = winners[0];
    resultMessage += `\n🎉 *Winner:* @${winner.split('@')[0]} with ${maxScore} points!\n+${50 + maxScore * 5} coins reward!`;
    
    await rpgUtils.updateBalance(winner, 50 + maxScore * 5, 'trivia_win');
    await gameManager.endGame(chatId, 'trivia', { winner, scores: gameState.score });
  } else if (winners.length > 1) {
    resultMessage += `\n🤝 *Draw!* Multiple winners with ${maxScore} points:\n`;
    winners.forEach(w => {
      resultMessage += `@${w.split('@')[0]}\n`;
    });
    resultMessage += `+25 coins each!`;
    
    for (const winner of winners) {
      await rpgUtils.updateBalance(winner, 25, 'trivia_draw');
    }
    await gameManager.endGame(chatId, 'trivia', { winners, scores: gameState.score });
  } else {
    resultMessage += `\nNo one scored any points. Better luck next time!`;
    await gameManager.endGame(chatId, 'trivia', { result: 'no_winner' });
  }
  
  await sock.sendMessage(chatId, { 
    text: resultMessage,
    mentions: Object.keys(gameState.score)
  });
}

// Missing module.exports fixed
module.exports = command;
