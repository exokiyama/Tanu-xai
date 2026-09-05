/**
 * Command: accept
 * Category: game
 * Description: Accept a game invite
 */

const { gameLobbyManager } = require('../utils/game-lobby.js');
const { gameManager } = require('../utils/game-manager.js');
const { logger } = require('../utils/logger.js');
const command = {
  pattern: 'accept',
  aliases: ['yes', 'join'],
  description: 'Accept a game invite',
  category: 'game',
  usage: '(reply to an invite message)',
  ownerOnly: false,
  groupOnly: true,

  async execute(sock, message, args, context) {
    const chatId = message.key.remoteJid;
    const userId = message.key.participant || message.key.remoteJid;
    
    try {
      // Get pending invites for this user
      const invites = gameLobbyManager.getPendingInvites(chatId, userId);
      
      if (invites.length === 0) {
        await sock.sendMessage(chatId, { 
          text: '❌ No pending game invites found. Someone needs to challenge you first!'
        });
        return;
      }
      
      // Accept the most recent invite
      const invite = invites[0];
      const result = gameLobbyManager.acceptInvite(chatId, invite.inviter, userId);
      
      if (!result.success) {
        await sock.sendMessage(chatId, { text: `❌ ${result.error}` });
        return;
      }
      
      // Start the game based on type
      switch (invite.gameType) {
        case 'tictactoe':
          await startTicTacToeGame(sock, chatId, invite.inviter, userId);
          break;
        default:
          await sock.sendMessage(chatId, { 
            text: `🎮 Game type "${invite.gameType}" accepted! Starting game...`
          });
          break;
      }
      
    } catch (error) {
      logger.error('[Accept] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while accepting the invite.' });
    }
  }
};

async function startTicTacToeGame(sock, chatId, player1, player2) {
  const players = [player1, player2];
  const result = gameManager.createGame(chatId, 'tictactoe', players, {
    vsBot: false,
    playerSymbol: 'X',
    opponentSymbol: 'O'
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
  
  gameManager.updateGameState(chatId, 'tictactoe', gameState);
  
  await sock.sendMessage(chatId, { 
    text: `🎮 *Tic-Tac-Toe: PvP Match!*\n\n` +
          `@${player1.split('@')[0]} (X) vs @${player2.split('@')[0]} (O)\n\n` +
          `${renderBoard(gameState.board)}\n\n` +
          `@${player1.split('@')[0]}'s turn! Use \`.move <row> <col>\`\n\n` +
          `*Grid Guide:*\n` +
          `Row 1: .move 1 1 | .move 1 2 | .move 1 3\n` +
          `Row 2: .move 2 1 | .move 2 2 | .move 2 3\n` +
          `Row 3: .move 3 1 | .move 3 2 | .move 3 3`,
    mentions: [player1, player2]
  });
}

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

