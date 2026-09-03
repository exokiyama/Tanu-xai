/**
 * Command: answer
 * Category: game
 * Description: Answer a trivia question or make a guess in a game
 */

import { gameManager } from '../utils/game-manager.js';
import { rpgUtils } from '../utils/rpg.js';
import { logger } from '../utils/logger.js';

export const command = {
  pattern: 'answer',
  aliases: ['ans', 'guess'],
  description: 'Answer a trivia question or make a guess',
  category: 'game',
  usage: '<A/B/C/D> (for trivia) or <number> (for guess the number)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Check for active trivia game
      const triviaGame = gameManager.getActiveGame(chatId, 'trivia');
      if (triviaGame && triviaGame.status === 'active') {
        await handleTriviaAnswer(sock, chatId, userId, triviaGame, args);
        return;
      }
      
      // Check for active guess-the-number game
      const guessGame = gameManager.getActiveGame(chatId, 'guess');
      if (guessGame && guessGame.status === 'active') {
        await handleGuessAnswer(sock, chatId, userId, guessGame, args);
        return;
      }
      
      // No active games found
      await sock.sendMessage(chatId, { 
        text: '❌ No active game that accepts answers. Use `.trivia` to start a quiz or `.guess` to play guess the number.'
      });
      
    } catch (error) {
      logger.error('[Answer] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while processing your answer.' });
    }
  }
};

async function handleTriviaAnswer(sock, chatId, userId, gameState, args) {
  const answerInput = (args[0] || '').toUpperCase();
  
  // Validate answer format
  if (!['A', 'B', 'C', 'D'].includes(answerInput)) {
    await sock.sendMessage(chatId, { 
      text: '❌ Invalid answer! Please use `.answer A`, `.answer B`, `.answer C`, or `.answer D`'
    });
    return;
  }
  
  // Clear timer
  if (gameState.questionTimer) {
    clearTimeout(gameState.questionTimer);
  }
  
  const question = gameState.currentQuestionData;
  const correctOptionIndex = question.options.indexOf(question.answer);
  const correctLetter = String.fromCharCode(65 + correctOptionIndex);
  
  let pointsEarned = 0;
  
  if (answerInput === correctLetter) {
    // Correct answer!
    pointsEarned = 10;
    gameState.score[userId] = (gameState.score[userId] || 0) + pointsEarned;
    
    await sock.sendMessage(chatId, { 
      text: `✅ *Correct!* @${userId.split('@')[0]} earns ${pointsEarned} points!\n\nThe answer was: *${question.answer}*`,
      mentions: [userId]
    });
  } else {
    // Wrong answer
    await sock.sendMessage(chatId, { 
      text: `❌ *Wrong!* The correct answer was: *${question.answer}*`,
    });
  }
  
  // Move to next question or end game
  gameState.currentQuestion++;
  
  if (gameState.currentQuestion >= gameState.options.totalQuestions) {
    await endTriviaGame(sock, chatId, gameState);
  } else {
    // Get next question
    const gameAI = await import('../utils/game-ai.js');
    const question = gameAI.gameAI.getTriviaQuestion(gameState.options.category);
    gameState.currentQuestionData = question;
    
    const optionsText = question.options.map((opt, i) => 
      `${String.fromCharCode(65 + i)}. ${opt}`
    ).join('\n');
    
    gameManager.updateGameState(chatId, 'trivia', {
      currentQuestion: gameState.currentQuestion,
      currentQuestionData: question,
      score: gameState.score
    });
    
    await sock.sendMessage(chatId, { 
      text: `📝 *Question ${gameState.currentQuestion + 1}/${gameState.options.totalQuestions}*\n\n` +
            `${question.question}\n\n` +
            `${optionsText}\n\n` +
            `Reply with \`.answer A/B/C/D\` within 30 seconds!`,
    });
    
    // Restart timer
    const { startTriviaTimer } = await import('./trivia.js');
    // Note: We need to inline this since we can't easily import internal functions
    gameState.questionTimer = setTimeout(async () => {
      await sock.sendMessage(chatId, { 
        text: `⏰ *Time's Up!*\\n\\nThe correct answer was: *${question.answer}*`
      });
      gameState.currentQuestion++;
      if (gameState.currentQuestion >= gameState.options.totalQuestions) {
        await endTriviaGame(sock, chatId, gameState);
      } else {
        // Continue with more questions...
      }
    }, gameState.options.questionTimeLimit);
  }
}

async function handleGuessAnswer(sock, chatId, userId, gameState, args) {
  const guess = parseInt(args[0]);
  
  if (isNaN(guess)) {
    await sock.sendMessage(chatId, { 
      text: '❌ Invalid guess! Please use `.guess <number>` where number is between 1 and 100.'
    });
    return;
  }
  
  gameState.attempts = (gameState.attempts || 0) + 1;
  
  if (guess === gameState.targetNumber) {
    // Correct guess!
    const baseReward = 100;
    const attemptBonus = Math.max(0, (20 - gameState.attempts) * 2);
    const totalReward = baseReward + attemptBonus;
    
    await rpgUtils.updateBalance(userId, totalReward, 'guess_win');
    
    await sock.sendMessage(chatId, { 
      text: `🎉 *Congratulations!* 🎉\n\n@${userId.split('@')[0]} guessed the number correctly!\n\nTarget: *${gameState.targetNumber}*\nAttempts: *${gameState.attempts}*\n\nReward: +${totalReward} coins!`,
      mentions: [userId]
    });
    
    await gameManager.endGame(chatId, 'guess', { 
      winner: userId, 
      targetNumber: gameState.targetNumber,
      attempts: gameState.attempts 
    });
  } else if (guess < gameState.targetNumber) {
    await sock.sendMessage(chatId, { 
      text: `📈 *Higher!* The number is greater than ${guess}.\n\nAttempts: ${gameState.attempts}`
    });
  } else {
    await sock.sendMessage(chatId, { 
      text: `📉 *Lower!* The number is less than ${guess}.\n\nAttempts: ${gameState.attempts}`
    });
  }
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

export default command;
