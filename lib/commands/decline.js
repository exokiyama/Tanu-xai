/**
 * Command: decline
 * Category: game
 * Description: Decline a game invite
 */

import { gameLobbyManager } from '../utils/game-lobby.js';
import { logger } from '../utils/logger.js';

export const command = {
  pattern: 'decline',
  aliases: ['no', 'reject'],
  description: 'Decline a game invite',
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
          text: '❌ No pending game invites found.'
        });
        return;
      }
      
      // Decline the most recent invite
      const invite = invites[0];
      const result = gameLobbyManager.declineInvite(chatId, invite.inviter, userId);
      
      if (!result.success) {
        await sock.sendMessage(chatId, { text: `❌ ${result.error}` });
        return;
      }
      
      await sock.sendMessage(chatId, { 
        text: `❌ @${userId.split('@')[0]} declined the ${invite.gameType} challenge from @${invite.inviter.split('@')[0]}.`,
        mentions: [userId, invite.inviter]
      });
      
    } catch (error) {
      logger.error('[Decline] Error:', error.message);
      await sock.sendMessage(chatId, { text: '❌ An error occurred while declining the invite.' });
    }
  }
};

export default command;
