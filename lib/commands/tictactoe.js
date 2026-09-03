/**
 * Command: tictactoe
 * Category: game
 * Description: Play tic-tac-toe against a player or the bot
 */

import { gameManager } from '../utils/game-manager.js';
import { gameLobbyManager } from '../utils/game-lobby.js';
import { gameAI } from '../utils/game-ai.js';
import { rpgUtils } from '../utils/rpg.js';
import { logger } from '../utils/logger.js';

export const command = {
  pattern: 'tictactoe',
  aliases: ['ttt', 'tt'],
  description: 'Play tic-tac-toe against a player or the bot',
  category: 'game',
  usage: '@mention (to challenge player) or "bot" (to play vs bot)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Parse arguments
      const mention = message.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
      const arg = args[0]?.toLowerCase();
      
      let opponent = null;
      let isBotGame = false;
      
      if (arg === 'bot' || arg === 'cpu' || arg === 'ai') {
        isBotGame = true;
        opponent = sock.user.id.split(':')[0] + '@s.whatsapp.net'; // Bot's JID
      } else if (mention) {
        opponent = mention;
        if (opponent === userId) {
          await sock.sendMessage(chatId, { text: '❌ You cannot play against yourself!' });
          return;
        }
      } else {
        await sock.sendMessage(chatId, { 
          text: `❌ Please mention a player to challenge or use \`.tictactoe bot\` to play against the bot.\n\nUsage: .tictactoe @mention | .tictactoe bot`
        });
        return;
      }
      
      // Check if there's already an active tictactoe game in this chat
      const existingGame = gameManager.getActiveGame(chatId, 'tictactoe');
      if (existingGame) {
        await sock.sendMessage(chatId, { 
          text: '❌ A tic-tac-toe game is already active in this chat. Wait for it to finish or use `.cancelgame tictactoe` to cancel it.'
        });
        return;
      }
      
      // If playing against bot, start game immediately
      if (isBotGame) {
        const players = [userId, opponent];
        const result = gameManager.createGame(chatId, 'tictactoe', players, {
          vsBot: true,
          difficulty: args[1]?.toLowerCase() || 'medium',
          playerSymbol: 'X',
          botSymbol: 'O'
        });
        
        if (!result.success) {
          await sock.sendMessage(chatId, { text: `❌ ${result.error}` });
          return;
        }
        
        const gameState = result.gameState;
        gameState.board = [
          [null, null, null],
          [null, null, null],
          [null, null, null]
        ];
        gameState.winner = null;
        
        gameManager.updateGameState(chatId, 'tictactoe', gameState);
        
        await sock.sendMessage(chatId, { 
          text: `🎮 *Tic-Tac-Toe: You vs Bot*\n\n` +
                `You are: *X*\n` +
                `Bot is: *O*\n` +
                `Difficulty: *${gameState.options.difficulty}*\n\n` +
                `Your turn! Use \`.move <row> <col>\` to place your mark.\n\n` +
                renderBoard(gameState.board) +
                `\n\n*Grid Guide:*\n` +
                `Row 1: .move 1 1 | .move 1 2 | .move 1 3\n` +
                `Row 2: .move 2 1 | .move 2 2 | .move 2 3\n` +
                `Row 3: .move 3 1 | .move 3 2 | .move 3 3`
        });
        return;
      }
      
      // Player vs Player - send invite
      const inviteResult = gameLobbyManager.sendInvite(chatId, 'tictactoe', userId, opponent);
      
      if (!inviteResult.success) {
        await sock.sendMessage(chatId, { text: `❌ ${inviteResult.error}` });
        return;
      }
      
      await sock.sendMessage(chatId, { 
        text: `🎮 *Tic-Tac-Toe Challenge!*\n\n` +
              `@${userId.split('@')[0]} challenges @${opponent.split('@')[0]}!\n\n` +
              `@${opponent.split('@')[0]}, reply with \`.accept\` to accept the challenge or \`.decline\` to decline.\n\n` +
              `_Invite expires in 2 minutes_`
      }, { mentions: [userId, opponent] });
      
    } catch (error) {
      logger.error('[TicTacToe] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while starting the game.' });
    }
  }
};

/**
 * Render the tic-tac-toe board
 */
function renderBoard(board) {
  const emojis = {
    'X': '❌',
    'O': '⭕',
    null: '⬜'
  };
  
  let output = '╔═══╦═══╦═══╗\n';
  for (let r = 0; r < 3; r++) {
    output += '║ ';
    for (let c = 0; c < 3; c++) {
      output += `${board[r][c] ? emojis[board[r][c]] : emojis.null} ║ `;
    }
    if (r < 2) output += '\n╠═══╬═══╬═══╣\n';
  }
  output += '\n╚═══╩═══╩═══╝';
  
  return output;
}

/**
 * Check for winner
 */
function checkWinner(board) {
  const size = 3;
  
  // Check rows
  for (let r = 0; r < size; r++) {
    if (board[r][0] && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
      return { winner: board[r][0], line: `row ${r + 1}` };
    }
  }
  
  // Check columns
  for (let c = 0; c < size; c++) {
    if (board[0][c] && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
      return { winner: board[0][c], line: `column ${c + 1}` };
    }
  }
  
  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return { winner: board[0][0], line: 'diagonal' };
  }
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return { winner: board[0][2], line: 'diagonal' };
  }
  
  // Check for draw
  let isFull = true;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!board[r][c]) {
        isFull = false;
        break;
      }
    }
  }
  
  if (isFull) {
    return { winner: 'draw' };
  }
  
  return null;
}

export default command;
