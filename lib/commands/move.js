/**
 * Command: move
 * Category: game
 * Description: Make a move in an active game (tic-tac-toe, etc.)
 */

import { gameManager } from '../utils/game-manager.js';
import { gameAI } from '../utils/game-ai.js';
import { rpgUtils } from '../utils/rpg.js';
import { logger } from '../utils/logger.js';

export const command = {
  pattern: 'move',
  aliases: ['play', 'tttmove'],
  description: 'Make a move in an active game',
  category: 'game',
  usage: '<row> <col> (for tic-tac-toe) or answer (for trivia)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Check for active tictactoe game
      const game = gameManager.getActiveGame(chatId, 'tictactoe');
      
      if (!game) {
        await sock.sendMessage(chatId, { 
          text: '❌ No active tic-tac-toe game found. Use `.tictactoe @player` or `.tictactoe bot` to start one.'
        });
        return;
      }
      
      // Validate it's user's turn
      const turnValidation = gameManager.validateTurn(game, userId);
      if (!turnValidation.valid) {
        await sock.sendMessage(chatId, { text: turnValidation.message });
        return;
      }
      
      // Parse move coordinates
      const row = parseInt(args[0]) - 1;
      const col = parseInt(args[1]) - 1;
      
      if (isNaN(row) || isNaN(col) || row < 0 || row > 2 || col < 0 || col > 2) {
        await sock.sendMessage(chatId, { 
          text: '❌ Invalid move! Use `.move <row> <col>` where row and col are 1-3.\nExample: `.move 2 2` for center'
        });
        return;
      }
      
      // Check if cell is empty
      if (game.board[row][col]) {
        await sock.sendMessage(chatId, { 
          text: `❌ Cell (${row + 1}, ${col + 1}) is already occupied! Choose an empty cell.`
        });
        return;
      }
      
      // Get player's symbol
      const playerSymbol = game.options.playerSymbol || 'X';
      const botSymbol = game.options.botSymbol || 'O';
      const currentSymbol = game.currentTurn === userId ? playerSymbol : botSymbol;
      
      // Make the move
      game.board[row][col] = currentSymbol;
      game.turnHistory.push({ player: userId, row, col, symbol: currentSymbol });
      
      // Check for winner
      const result = checkWinner(game.board);
      
      if (result) {
        // Game ended
        let endMessage = '';
        let winner = null;
        
        if (result.winner === 'draw') {
          endMessage = `🎮 *Tic-Tac-Toe: Draw!*\n\nThe game ended in a draw!\n\n${renderBoard(game.board)}`;
          await gameManager.endGame(chatId, 'tictactoe', { result: 'draw' });
        } else {
          // Someone won
          const winnerJid = result.winner === playerSymbol ? userId : (game.options.vsBot ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : game.currentTurn);
          winner = winnerJid;
          
          if (game.options.vsBot && result.winner === playerSymbol) {
            // Player beat the bot
            endMessage = `🎉 *Tic-Tac-Toe: You Win!* 🎉\n\n@${userId.split('@')[0]} defeated the bot!\nWinning line: ${result.line}\n\n${renderBoard(game.board)}\n\n+50 coins reward!`;
            await rpgUtils.updateBalance(userId, 50, 'game_win');
            await gameManager.endGame(chatId, 'tictactoe', { winner: userId, loser: 'bot' });
          } else if (game.options.vsBot && result.winner === botSymbol) {
            // Bot won
            endMessage = `😢 *Tic-Tac-Toe: Bot Wins!*\n\nThe bot defeated you!\nWinning line: ${result.line}\n\n${renderBoard(game.board)}\n\nBetter luck next time!`;
            await gameManager.endGame(chatId, 'tictactoe', { winner: 'bot', loser: userId });
          } else {
            // PvP
            endMessage = `🎉 *Tic-Tac-Toe: Victory!* 🎉\n\n@${winnerJid.split('@')[0]} wins!\nWinning line: ${result.line}\n\n${renderBoard(game.board)}\n\n+50 coins to the winner!`;
            await rpgUtils.updateBalance(winnerJid, 50, 'game_win');
            await gameManager.endGame(chatId, 'tictactoe', { winner: winnerJid });
          }
        }
        
        await sock.sendMessage(chatId, { text: endMessage }, { mentions: [userId] });
        return;
      }
      
      // Game continues - switch turns
      const nextPlayer = game.currentTurn === userId 
        ? (game.options.vsBot ? sock.user.id.split(':')[0] + '@s.whatsapp.net' : game.players.find(p => p !== userId))
        : userId;
      
      gameManager.updateGameState(chatId, 'tictactoe', {
        board: game.board,
        currentTurn: nextPlayer,
        turnHistory: game.turnHistory
      });
      
      // Send updated board
      let messageText = `🎮 *Tic-Tac-Toe*\n\n${renderBoard(game.board)}\n\n`;
      
      if (game.options.vsBot && nextPlayer !== userId) {
        // Bot's turn
        messageText += `⏳ Bot is thinking...`;
        await sock.sendMessage(chatId, { text: messageText });
        
        // Bot makes move after delay
        await gameAI.think(1000, 2500);
        
        const botMove = gameAI.getTicTacToeMove(game.board, botSymbol, game.options.difficulty);
        if (botMove) {
          game.board[botMove.row][botMove.col] = botSymbol;
          
          // Check for winner after bot move
          const botResult = checkWinner(game.board);
          
          if (botResult) {
            if (botResult.winner === 'draw') {
              await sock.sendMessage(chatId, { 
                text: `🎮 *Tic-Tac-Toe: Draw!*\n\nThe game ended in a draw!\n\n${renderBoard(game.board)}`
              });
              await gameManager.endGame(chatId, 'tictactoe', { result: 'draw' });
            } else {
              // Bot won
              await sock.sendMessage(chatId, { 
                text: `😢 *Tic-Tac-Toe: Bot Wins!*\n\nThe bot defeated you!\nWinning line: ${botResult.line}\n\n${renderBoard(game.board)}\n\nBetter luck next time!`
              });
              await gameManager.endGame(chatId, 'tictactoe', { winner: 'bot', loser: userId });
            }
            return;
          }
          
          // Continue game
          gameManager.updateGameState(chatId, 'tictactoe', {
            board: game.board,
            currentTurn: userId
          });
          
          await sock.sendMessage(chatId, { 
            text: `🎮 *Tic-Tac-Toe*\n\n${renderBoard(game.board)}\n\nYour turn! Use \`.move <row> <col>\``
          });
        }
      } else {
        // Human opponent's turn
        messageText += `@${nextPlayer.split('@')[0]}'s turn! Use \`.move <row> <col>\``;
        await sock.sendMessage(chatId, { text: messageText }, { mentions: [nextPlayer] });
      }
      
    } catch (error) {
      logger.error('[Move] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while processing your move.' });
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
