/**
 * Game Lobby Manager - Handles multiplayer game lobbies and invites
 * Supports invite system and join system for different game types
 */

import { logger } from './logger.js';

class GameLobbyManager {
  constructor() {
    // Active lobbies: key = chatId_lobbyId, value = lobbyState
    this.activeLobbies = new Map();
    
    // Pending invites: key = inviteKey (chatId_inviter_invitee), value = inviteState
    this.pendingInvites = new Map();
    
    // Configuration
    this.lobbyTimeout = 10 * 60 * 1000; // 10 minutes to fill lobby
    this.inviteTimeout = 2 * 60 * 1000; // 2 minutes to accept invite
    
    // Start cleanup job
    this.startCleanupJob();
  }
  
  /**
   * Create a new game lobby
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Type of game
   * @param {string} creatorJid - Creator's JID
   * @param {Object} options - Lobby options (maxPlayers, minPlayers, etc.)
   * @returns {Object} - { success, lobby, error }
   */
  createLobby(chatId, gameType, creatorJid, options = {}) {
    const lobbyId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lobbyKey = `${chatId}_${lobbyId}`;
    
    // Check if creator already has an active lobby in this chat
    for (const [key, lobby] of this.activeLobbies.entries()) {
      if (key.startsWith(`${chatId}_`) && lobby.creator === creatorJid) {
        return {
          success: false,
          error: 'You already have an active lobby in this chat',
          existingLobby: lobby
        };
      }
    }
    
    const lobby = {
      lobbyKey,
      lobbyId,
      chatId,
      gameType,
      creator: creatorJid,
      players: [creatorJid],
      status: 'waiting', // waiting, starting, started, cancelled
      options: {
        maxPlayers: options.maxPlayers || 2,
        minPlayers: options.minPlayers || 2,
        allowSpectators: options.allowSpectators || false,
        ...options
      },
      createdAt: Date.now(),
      lastActivity: Date.now(),
      spectators: []
    };
    
    this.activeLobbies.set(lobbyKey, lobby);
    
    logger.info(`[GameLobby] Created ${gameType} lobby in chat ${chatId} by ${creatorJid.split('@')[0]}`);
    
    return { success: true, lobby };
  }
  
  /**
   * Join an existing lobby
   * @param {string} chatId - Chat ID
   * @param {string} lobbyId - Lobby ID (or null to find creator's lobby)
   * @param {string} playerJid - Player's JID
   * @returns {Object} - { success, lobby, error }
   */
  joinLobby(chatId, lobbyId, playerJid) {
    let lobby = null;
    let lobbyKey = null;
    
    // Find the lobby
    if (lobbyId) {
      lobbyKey = `${chatId}_${lobbyId}`;
      lobby = this.activeLobbies.get(lobbyKey);
    } else {
      // Find any open lobby for this game type that player can join
      for (const [key, l] of this.activeLobbies.entries()) {
        if (key.startsWith(`${chatId}_`) && 
            l.status === 'waiting' && 
            l.players.length < l.options.maxPlayers &&
            !l.players.includes(playerJid)) {
          lobby = l;
          lobbyKey = key;
          break;
        }
      }
    }
    
    if (!lobby) {
      return { success: false, error: 'No active lobby found' };
    }
    
    // Check if lobby is full
    if (lobby.players.length >= lobby.options.maxPlayers) {
      return { success: false, error: 'Lobby is full' };
    }
    
    // Check if player already in lobby
    if (lobby.players.includes(playerJid)) {
      return { success: false, error: 'You are already in this lobby' };
    }
    
    // Add player to lobby
    lobby.players.push(playerJid);
    lobby.lastActivity = Date.now();
    this.activeLobbies.set(lobbyKey, lobby);
    
    logger.info(`[GameLobby] ${playerJid.split('@')[0]} joined ${lobby.gameType} lobby`);
    
    return { success: true, lobby };
  }
  
  /**
   * Leave a lobby
   * @param {string} chatId - Chat ID
   * @param {string} lobbyId - Lobby ID
   * @param {string} playerJid - Player's JID
   * @returns {Object} - { success, lobby, error }
   */
  leaveLobby(chatId, lobbyId, playerJid) {
    const lobbyKey = `${chatId}_${lobbyId}`;
    const lobby = this.activeLobbies.get(lobbyKey);
    
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }
    
    // Creator leaving cancels the lobby
    if (lobby.creator === playerJid) {
      this.cancelLobby(chatId, lobbyId, 'Creator left');
      return { success: true, cancelled: true };
    }
    
    // Remove player from lobby
    lobby.players = lobby.players.filter(p => p !== playerJid);
    lobby.lastActivity = Date.now();
    
    // If no players left, cancel lobby
    if (lobby.players.length === 0) {
      this.activeLobbies.delete(lobbyKey);
      return { success: true, cancelled: true };
    }
    
    this.activeLobbies.set(lobbyKey, lobby);
    
    return { success: true, lobby };
  }
  
  /**
   * Start the game (creator only)
   * @param {string} chatId - Chat ID
   * @param {string} lobbyId - Lobby ID
   * @param {string} creatorJid - Creator's JID
   * @returns {Object} - { success, lobby, error }
   */
  startLobby(chatId, lobbyId, creatorJid) {
    const lobbyKey = `${chatId}_${lobbyId}`;
    const lobby = this.activeLobbies.get(lobbyKey);
    
    if (!lobby) {
      return { success: false, error: 'Lobby not found' };
    }
    
    if (lobby.creator !== creatorJid) {
      return { success: false, error: 'Only the lobby creator can start the game' };
    }
    
    if (lobby.players.length < lobby.options.minPlayers) {
      return { 
        success: false, 
        error: `Need at least ${lobby.options.minPlayers} players to start (currently ${lobby.players.length})` 
      };
    }
    
    lobby.status = 'started';
    lobby.startedAt = Date.now();
    this.activeLobbies.set(lobbyKey, lobby);
    
    logger.info(`[GameLobby] Started ${lobby.gameType} game with ${lobby.players.length} players`);
    
    return { success: true, lobby };
  }
  
  /**
   * Cancel a lobby
   * @param {string} chatId - Chat ID
   * @param {string} lobbyId - Lobby ID
   * @param {string} reason - Reason for cancellation
   * @returns {Object|null}
   */
  cancelLobby(chatId, lobbyId, reason = 'Cancelled') {
    const lobbyKey = `${chatId}_${lobbyId}`;
    const lobby = this.activeLobbies.get(lobbyKey);
    
    if (!lobby) {
      return null;
    }
    
    lobby.status = 'cancelled';
    lobby.cancelledAt = Date.now();
    lobby.cancelReason = reason;
    
    this.activeLobbies.delete(lobbyKey);
    
    logger.info(`[GameLobby] Cancelled ${lobby.gameType} lobby: ${reason}`);
    
    return lobby;
  }
  
  /**
   * Get lobby info
   * @param {string} chatId - Chat ID
   * @param {string} lobbyId - Lobby ID
   * @returns {Object|null}
   */
  getLobby(chatId, lobbyId) {
    const lobbyKey = `${chatId}_${lobbyId}`;
    return this.activeLobbies.get(lobbyKey);
  }
  
  /**
   * Get all active lobbies in a chat
   * @param {string} chatId - Chat ID
   * @returns {Array}
   */
  getAllLobbies(chatId) {
    const lobbies = [];
    for (const [key, lobby] of this.activeLobbies.entries()) {
      if (key.startsWith(`${chatId}_`) && lobby.status === 'waiting') {
        lobbies.push(lobby);
      }
    }
    return lobbies;
  }
  
  /**
   * Send game invite to a player
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Type of game
   * @param {string} inviterJid - Inviter's JID
   * @param {string} inviteeJid - Invitee's JID
   * @param {Object} options - Game options
   * @returns {Object} - { success, inviteKey, error }
   */
  sendInvite(chatId, gameType, inviterJid, inviteeJid, options = {}) {
    const inviteKey = `${chatId}_${inviterJid}_${inviteeJid}`;
    
    // Check for existing pending invite
    const existingInvite = this.pendingInvites.get(inviteKey);
    if (existingInvite) {
      return { 
        success: false, 
        error: 'An invite is already pending for this player' 
      };
    }
    
    const invite = {
      inviteKey,
      chatId,
      gameType,
      inviter: inviterJid,
      invitee: inviteeJid,
      options,
      createdAt: Date.now(),
      status: 'pending'
    };
    
    this.pendingInvites.set(inviteKey, invite);
    
    // Set timeout to auto-expire invite
    setTimeout(() => {
      const currentInvite = this.pendingInvites.get(inviteKey);
      if (currentInvite && currentInvite.status === 'pending') {
        this.pendingInvites.delete(inviteKey);
        logger.info(`[GameLobby] Invite from ${inviterJid.split('@')[0]} to ${inviteeJid.split('@')[0]} expired`);
      }
    }, this.inviteTimeout);
    
    logger.info(`[GameLobby] Sent ${gameType} invite from ${inviterJid.split('@')[0]} to ${inviteeJid.split('@')[0]}`);
    
    return { success: true, invite };
  }
  
  /**
   * Accept an invite
   * @param {string} chatId - Chat ID
   * @param {string} inviterJid - Inviter's JID
   * @param {string} acceptorJid - Acceptor's JID (should match invitee)
   * @returns {Object} - { success, invite, error }
   */
  acceptInvite(chatId, inviterJid, acceptorJid) {
    const inviteKey = `${chatId}_${inviterJid}_${acceptorJid}`;
    const invite = this.pendingInvites.get(inviteKey);
    
    if (!invite) {
      return { success: false, error: 'No pending invite found' };
    }
    
    if (invite.invitee !== acceptorJid) {
      return { success: false, error: 'This invite was not sent to you' };
    }
    
    invite.status = 'accepted';
    this.pendingInvites.delete(inviteKey);
    
    logger.info(`[GameLobby] ${acceptorJid.split('@')[0]} accepted ${invite.gameType} invite from ${inviterJid.split('@')[0]}`);
    
    return { success: true, invite };
  }
  
  /**
   * Decline an invite
   * @param {string} chatId - Chat ID
   * @param {string} inviterJid - Inviter's JID
   * @param {string} declinerJid - Decliner's JID
   * @returns {Object} - { success, invite, error }
   */
  declineInvite(chatId, inviterJid, declinerJid) {
    const inviteKey = `${chatId}_${inviterJid}_${declinerJid}`;
    const invite = this.pendingInvites.get(inviteKey);
    
    if (!invite) {
      return { success: false, error: 'No pending invite found' };
    }
    
    invite.status = 'declined';
    this.pendingInvites.delete(inviteKey);
    
    logger.info(`[GameLobby] ${declinerJid.split('@')[0]} declined ${invite.gameType} invite from ${inviterJid.split('@')[0]}`);
    
    return { success: true, invite };
  }
  
  /**
   * Get pending invites for a user
   * @param {string} chatId - Chat ID
   * @param {string} userId - User's JID
   * @returns {Array}
   */
  getPendingInvites(chatId, userId) {
    const invites = [];
    for (const [key, invite] of this.pendingInvites.entries()) {
      if (invite.chatId === chatId && invite.invitee === userId && invite.status === 'pending') {
        invites.push(invite);
      }
    }
    return invites;
  }
  
  /**
   * Cleanup expired lobbies and invites
   */
  cleanupExpired() {
    const now = Date.now();
    
    // Cleanup expired lobbies
    for (const [key, lobby] of this.activeLobbies.entries()) {
      const age = now - lobby.lastActivity;
      if (age > this.lobbyTimeout) {
        lobby.status = 'expired';
        this.activeLobbies.delete(key);
        logger.info(`[GameLobby] Expired ${lobby.gameType} lobby (inactive for ${Math.round(age/60000)} min)`);
      }
    }
    
    // Cleanup old invites (already handled by timeout, but double-check)
    for (const [key, invite] of this.pendingInvites.entries()) {
      const age = now - invite.createdAt;
      if (age > this.inviteTimeout) {
        this.pendingInvites.delete(key);
      }
    }
  }
  
  /**
   * Start periodic cleanup job
   */
  startCleanupJob() {
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000); // Run every minute
    
    logger.info('[GameLobby] Cleanup job started (runs every minute)');
  }
}

// Singleton instance
export const gameLobbyManager = new GameLobbyManager();

export default gameLobbyManager;
