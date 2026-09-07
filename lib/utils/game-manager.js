/**
 * Game Manager - Centralized Game State Management
 * Handles all game state across ALL game commands
 * Provides in-memory cache with optional database persistence
 */

const pkg = require('pg');
const { Pool } = pkg;

const { query, getClient, is_connected } = require('../database/index.js');
const { logger } = require('./logger.js');
class GameManager {
  constructor() {
    // Active games in memory: key = chatId_gameType_instanceId, value = gameState
    this.activeGames = new Map();
    
    // Configuration
    this.defaultTimeout = 60 * 60 * 1000; // 1 hour default
    this.cleanupInterval = 5 * 60 * 1000; // Cleanup every 5 minutes
    
    // Start cleanup job
    this.startCleanupJob();
    
    // Load persisted games on startup
    this.loadPersistedGames();
  }
  
  /**
   * Generate unique game key
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Type of game (tictactoe, trivia, etc.)
   * @param {string} instanceId - Unique instance identifier
   * @returns {string} - Composite key
   */
  generateGameKey(chatId, gameType, instanceId = 'default') {
    return `${chatId}_${gameType}_${instanceId}`;
  }
  
  /**
   * Create a new game instance
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Type of game
   * @param {Array} players - Array of player JIDs
   * @param {Object} options - Game-specific options
   * @returns {Object|null} - Game instance or null if duplicate exists
   */
  createGame(chatId, gameType, players, options = {}) {
    const instanceId = options.instanceId || Date.now().toString();
    const gameKey = this.generateGameKey(chatId, gameType, instanceId);
    
    // Check for duplicate game in same chat (same type)
    for (const [key, game] of this.activeGames.entries()) {
      if (key.startsWith(`${chatId}_${gameType}_`)) {
        // A game of this type already exists in this chat
        return { 
          success: false, 
          error: 'A game of this type is already active in this chat',
          existingGame: game
        };
      }
    }
    
    // Check if any player is already in another game in this chat
    for (const [key, game] of this.activeGames.entries()) {
      if (key.startsWith(`${chatId}_`) && game.players) {
        for (const player of players) {
          if (game.players.includes(player)) {
            return {
              success: false,
              error: `${player.split('@')[0]} is already in an active game in this chat`
            };
          }
        }
      }
    }
    
    const gameState = {
      gameKey,
      chatId,
      gameType,
      instanceId,
      players,
      options,
      status: 'active',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      currentTurn: players[0], // First player starts
      turnHistory: [],
      metadata: {}
    };
    
    this.activeGames.set(gameKey, gameState);
    
    // Persist to database if available
    this.persistGame(gameState);
    
    logger.info(`[GameManager] Created ${gameType} game in chat ${chatId}`);
    
    return { success: true, gameState };
  }
  
  /**
   * Get active game in chat
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Type of game (optional, searches all if not provided)
   * @param {string} playerJid - Player JID to find their game (optional)
   * @returns {Object|null} - Game state or null
   */
  getActiveGame(chatId, gameType = null, playerJid = null) {
    // If gameType provided, look for specific game
    if (gameType) {
      for (const [key, game] of this.activeGames.entries()) {
        if (key.startsWith(`${chatId}_${gameType}_`)) {
          return game;
        }
      }
      return null;
    }
    
    // If playerJid provided, find game containing that player
    if (playerJid) {
      for (const [key, game] of this.activeGames.entries()) {
        if (key.startsWith(`${chatId}_`) && game.players && game.players.includes(playerJid)) {
          return game;
        }
      }
      return null;
    }
    
    // Return first active game in chat
    for (const [key, game] of this.activeGames.entries()) {
      if (key.startsWith(`${chatId}_`)) {
        return game;
      }
    }
    
    return null;
  }
  
  /**
   * Get all active games in a chat
   * @param {string} chatId - Chat ID
   * @returns {Array} - Array of game states
   */
  getAllActiveGames(chatId) {
    const games = [];
    for (const [key, game] of this.activeGames.entries()) {
      if (key.startsWith(`${chatId}_`)) {
        games.push(game);
      }
    }
    return games;
  }
  
  /**
   * Update game state
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Game type
   * @param {Object} newState - New state properties to merge
   * @returns {Object|null} - Updated game state or null
   */
  updateGameState(chatId, gameType, newState) {
    const game = this.getActiveGame(chatId, gameType);
    if (!game) {
      return null;
    }
    
    // Merge new state
    Object.assign(game, newState);
    game.lastActivity = Date.now();
    
    // Update in memory
    this.activeGames.set(game.gameKey, game);
    
    // Persist to database
    this.persistGame(game);
    
    return game;
  }
  
  /**
   * Validate turn for turn-based games
   * @param {Object} gameState - Current game state
   * @param {string} senderJid - Player attempting to make move
   * @returns {Object} - { valid: boolean, message: string }
   */
  validateTurn(gameState, senderJid) {
    if (!gameState.currentTurn) {
      return { valid: true }; // No turn tracking
    }
    
    if (gameState.currentTurn !== senderJid) {
      return { 
        valid: false, 
        message: `It's not your turn! Current turn: @${gameState.currentTurn.split('@')[0]}` 
      };
    }
    
    return { valid: true };
  }
  
  /**
   * End game and cleanup
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Game type
   * @param {Object} result - Game result { winner, loser, draw, reason }
   * @returns {Object|null} - Final game state or null
   */
  async endGame(chatId, gameType, result = {}) {
    const game = this.getActiveGame(chatId, gameType);
    if (!game) {
      return null;
    }
    
    game.status = 'ended';
    game.result = result;
    game.endedAt = Date.now();
    
    // Remove from active games
    this.activeGames.delete(game.gameKey);
    
    // Remove from database
    await this.removePersistedGame(game.gameKey);
    
    logger.info(`[GameManager] Ended ${gameType} game in chat ${chatId}. Result: ${JSON.stringify(result)}`);
    
    return game;
  }
  
  /**
   * Cancel/forfeit a game
   * @param {string} chatId - Chat ID
   * @param {string} gameType - Game type
   * @param {string} reason - Reason for cancellation
   * @returns {Object|null}
   */
  async cancelGame(chatId, gameType, reason = 'Cancelled by player') {
    return await this.endGame(chatId, gameType, { 
      reason, 
      cancelled: true 
    });
  }
  
  /**
   * List all active games (for admin/cleanup)
   * @returns {Array} - Array of all active games
   */
  listActiveGames() {
    return Array.from(this.activeGames.values());
  }
  
  /**
   * Get count of active games
   * @returns {number}
   */
  getActiveGameCount() {
    return this.activeGames.size;
  }
  
  /**
   * Cleanup abandoned games (timeout)
   * @param {number} maxAge - Max age in milliseconds (default: 1 hour)
   * @returns {Array} - Array of cleaned up games
   */
  async cleanupAbandonedGames(maxAge = this.defaultTimeout) {
    const now = Date.now();
    const cleanedUp = [];
    
    for (const [key, game] of this.activeGames.entries()) {
      const age = now - game.lastActivity;
      
      if (age > maxAge) {
        // Game has timed out
        await this.endGame(game.chatId, game.gameType, {
          reason: 'Game ended due to timeout/inactivity',
          timeout: true
        });
        cleanedUp.push(game);
        
        // Notify players if possible (would need sock reference)
        logger.info(`[GameManager] Cleaned up abandoned ${game.gameType} game (inactive for ${Math.round(age/60000)} min)`);
      }
    }
    
    return cleanedUp;
  }
  
  /**
   * Start periodic cleanup job
   */
  startCleanupJob() {
    setInterval(() => {
      this.cleanupAbandonedGames();
    }, this.cleanupInterval);
    
    logger.info('[GameManager] Cleanup job started (runs every 5 minutes)');
  }
  
  /**
   * Persist game to database
   * @param {Object} gameState - Game state to persist
   */
  async persistGame(gameState) {
    try {
      if (!is_connected()) {
        return; // DB not available, use in-memory only
      }
      
      await query(
        `INSERT INTO active_games (chat_id, game_id, game_type, state_json, created_at, last_activity)
         VALUES ($1, $2, $3, $4, NOW(), NOW())
         ON CONFLICT (chat_id, game_id) 
         DO UPDATE SET state_json = $4, last_activity = NOW()`,
        [gameState.chatId, gameState.gameKey, gameState.gameType, JSON.stringify(gameState)]
      );
    } catch (error) {
      logger.error('[GameManager] Error persisting game:', error.message);
    }
  }
  
  /**
   * Remove persisted game from database
   * @param {string} gameKey - Game key
   */
  async removePersistedGame(gameKey) {
    try {
      if (!is_connected()) {
        return;
      }
      
      await query(
        `DELETE FROM active_games WHERE game_id = $1`,
        [gameKey]
      );
    } catch (error) {
      logger.error('[GameManager] Error removing persisted game:', error.message);
    }
  }
  
  /**
   * Load persisted games from database on startup
   */
  async loadPersistedGames() {
    try {
      if (!is_connected()) {
        logger.info('[GameManager] Database not connected, skipping game recovery');
        return;
      }
      
      const result = await query(
        `SELECT chat_id, game_id, game_type, state_json, created_at, last_activity 
         FROM active_games 
         WHERE last_activity > NOW() - INTERVAL '1 hour'`
      );
      
      let loaded = 0;
      for (const row of result.rows) {
        try {
          const gameState = JSON.parse(row.state_json);
          gameState.chatId = row.chat_id;
          gameState.gameKey = row.game_id;
          gameState.gameType = row.game_type;
          
          this.activeGames.set(row.game_id, gameState);
          loaded++;
        } catch (parseError) {
          logger.error('[GameManager] Error parsing persisted game:', parseError.message);
        }
      }
      
      if (loaded > 0) {
        logger.info(`[GameManager] Recovered ${loaded} active games from database`);
      }
    } catch (error) {
      logger.error('[GameManager] Error loading persisted games:', error.message);
    }
  }
  
  /**
   * Get game timeout based on game type
   * @param {string} gameType - Type of game
   * @returns {number} - Timeout in milliseconds
   */
  getGameTimeout(gameType) {
    const timeouts = {
      'tictactoe': 5 * 60 * 1000,      // 5 minutes per turn
      'chess': 10 * 60 * 1000,         // 10 minutes per turn
      'connect4': 5 * 60 * 1000,       // 5 minutes per turn
      'trivia': 30 * 1000,             // 30 seconds per question
      'quiz': 30 * 1000,               // 30 seconds per question
      'guess': 5 * 60 * 1000,          // 5 minutes total
      'math': 5 * 60 * 1000,           // 5 minutes total
      'hangman': 5 * 60 * 1000,        // 5 minutes per turn
      'wordle': 5 * 60 * 1000,         // 5 minutes total
      'lobby': 10 * 60 * 1000          // 10 minutes to fill lobby
    };
    
    return timeouts[gameType] || this.defaultTimeout;
  }
}

// Singleton instance
const gameManager = new GameManager();

module.exports = { gameManager };
module.exports.default = gameManager;
