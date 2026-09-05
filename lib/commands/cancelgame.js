/**
 * Command: cancelgame
 * Category: game
 * Description: Cancel/forfeit an active game
 */

const { gameManager } = require('../utils/game-manager.js');
const { logger } = require('../utils/logger.js');
const command = {
  pattern: 'cancelgame',
  aliases: ['forfeit', 'endgame', 'quitgame'],
  description: 'Cancel or forfeit an active game',
  category: 'game',
  usage: '[gameType] (e.g., tictactoe, trivia)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      let gameType = args[0]?.toLowerCase();
      
      // If no game type specified, find any game the user is in
      if (!gameType) {
        const userGame = gameManager.getActiveGame(chatId, null, userId);
        if (userGame) {
          gameType = userGame.gameType;
        } else {
          await sock.sendMessage(chatId, { 
            text: '❌ No active game found that you are participating in.\nUse `.cancelgame <gameType>` to cancel a specific game.'
          });
          return;
        }
      }
      
      // Get the game
      const game = gameManager.getActiveGame(chatId, gameType);
      
      if (!game) {
        await sock.sendMessage(chatId, { 
          text: `❌ No active ${gameType} game found in this chat.`
        });
        return;
      }
      
      // Check if user is in the game
      if (!game.players.includes(userId)) {
        await sock.sendMessage(chatId, { 
          text: `❌ You are not participating in this ${gameType} game.`
        });
        return;
      }
      
      // Cancel the game
      const result = await gameManager.cancelGame(chatId, gameType, `Forfeited by @${userId.split('@')[0]}`);
      
      if (result) {
        // Determine opponent (if any)
        const opponent = game.players.find(p => p !== userId);
        
        let messageText = `🏳️ *Game Forfeited!*\n\n@${userId.split('@')[0]} forfeited the ${gameType} game.`;
        
        if (opponent && !game.options.vsBot) {
          messageText += `\n\n@${opponent.split('@')[0]} wins by forfeit! +25 coins`;
          // Award consolation prize to opponent
          const rpgUtils = await import('../utils/rpg.js');
          await rpgUtils.rpgUtils.updateBalance(opponent, 25, 'game_forfeit_win');
        }
        
        await sock.sendMessage(chatId, { 
          text: messageText,
          mentions: [userId, opponent].filter(Boolean)
        });
      }
      
    } catch (error) {
      logger.error('[CancelGame] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while cancelling the game.' });
    }
  }
};

