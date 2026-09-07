const db = require('../database/index.js');
const { config } = require('../../config/config.js');
/**
 * Centralized Moderation Manager
 * 
 * Handles all moderation logic including:
 * - Warning system (add, remove, check warnings)
 * - Ban system (permanent and temporary bans)
 * - User restrictions (mute, restrict)
 * - Moderation logging
 * - Auto-cleanup jobs
 */

class ModerationManager {
  constructor() {
    this.db = db;
    this.config = config;
    this.warningCache = new Map(); // In-memory cache for warnings
    this.banCache = new Map(); // In-memory cache for bans
    this.restrictionCache = new Map(); // In-memory cache for restrictions
  }

  /**
   * Initialize database tables for moderation
   */
  async initializeTables() {
    if (!this.db.is_connected()) {
      console.log('[Moderation] Database not connected, using in-memory storage');
      return;
    }

    try {
      const client = await this.db.getClient();
      
      // Warnings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS warnings (
          id SERIAL PRIMARY KEY,
          group_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          admin_id VARCHAR(255) NOT NULL,
          reason TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          active BOOLEAN DEFAULT TRUE
        )
      `);

      // Bans table
      await client.query(`
        CREATE TABLE IF NOT EXISTS bans (
          id SERIAL PRIMARY KEY,
          group_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          admin_id VARCHAR(255),
          reason TEXT,
          duration BIGINT,
          banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          active BOOLEAN DEFAULT TRUE
        )
      `);

      // Restrictions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS restrictions (
          id SERIAL PRIMARY KEY,
          group_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          admin_id VARCHAR(255),
          type VARCHAR(50) NOT NULL,
          duration BIGINT,
          restricted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          active BOOLEAN DEFAULT TRUE
        )
      `);

      // Moderation log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS moderation_log (
          id SERIAL PRIMARY KEY,
          group_id VARCHAR(255) NOT NULL,
          action VARCHAR(100) NOT NULL,
          target_user VARCHAR(255),
          admin_user VARCHAR(255) NOT NULL,
          reason TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          metadata_json JSONB
        )
      `);

      // Create indexes for performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_warnings_group_user 
        ON warnings(group_id, user_id) WHERE active = TRUE
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_bans_group_user 
        ON bans(group_id, user_id) WHERE active = TRUE
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_restrictions_group_user 
        ON restrictions(group_id, user_id) WHERE active = TRUE
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_modlog_group 
        ON moderation_log(group_id, timestamp DESC)
      `);

      client.release();
      console.log('[Moderation] Database tables initialized');
    } catch (error) {
      console.error('[Moderation] Failed to initialize tables:', error.message);
    }
  }

  // ==================== WARNING SYSTEM ====================

  /**
   * Add a warning to a user
   */
  async addWarning(groupId, userId, reason, adminId) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `INSERT INTO warnings (group_id, user_id, admin_id, reason, timestamp, active)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, TRUE)
           RETURNING id`,
          [groupId, userId, adminId, reason]
        );
        
        const warningId = result.rows[0].id;
        
        // Log the action
        await this.logAction(groupId, 'warning_added', userId, adminId, reason, { warningId });
        
        return { success: true, warningId };
      } else {
        // In-memory fallback
        if (!this.warningCache.has(key)) {
          this.warningCache.set(key, []);
        }
        const warningId = Date.now();
        this.warningCache.get(key).push({
          id: warningId,
          groupId,
          userId,
          adminId,
          reason,
          timestamp: Date.now(),
          active: true
        });
        
        await this.logAction(groupId, 'warning_added', userId, adminId, reason, { warningId });
        
        return { success: true, warningId };
      }
    } catch (error) {
      console.error('[Moderation] Error adding warning:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove a specific warning or the last warning
   */
  async removeWarning(groupId, userId, warningId = null) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        let result;
        if (warningId) {
          result = await this.db.query(
            `UPDATE warnings SET active = FALSE 
             WHERE group_id = $1 AND user_id = $2 AND id = $3 AND active = TRUE
             RETURNING id`,
            [groupId, userId, warningId]
          );
        } else {
          // Remove last warning
          result = await this.db.query(
            `UPDATE warnings SET active = FALSE 
             WHERE id = (
               SELECT id FROM warnings 
               WHERE group_id = $1 AND user_id = $2 AND active = TRUE 
               ORDER BY timestamp DESC LIMIT 1
             )
             RETURNING id`,
            [groupId, userId]
          );
        }
        
        if (result.rows.length > 0) {
          await this.logAction(groupId, 'warning_removed', userId, null, null, { warningId: result.rows[0].id });
          return { success: true };
        }
        return { success: false, error: 'No active warning found' };
      } else {
        // In-memory fallback
        const warnings = this.warningCache.get(key) || [];
        const activeWarnings = warnings.filter(w => w.active);
        
        if (activeWarnings.length === 0) {
          return { success: false, error: 'No active warnings' };
        }
        
        let removed = false;
        if (warningId) {
          const warning = activeWarnings.find(w => w.id === warningId);
          if (warning) {
            warning.active = false;
            removed = true;
          }
        } else {
          // Remove last
          for (let i = activeWarnings.length - 1; i >= 0; i--) {
            if (activeWarnings[i].active) {
              activeWarnings[i].active = false;
              removed = true;
              break;
            }
          }
        }
        
        if (removed) {
          await this.logAction(groupId, 'warning_removed', userId, null, null, { warningId });
          return { success: true };
        }
        return { success: false, error: 'Warning not found' };
      }
    } catch (error) {
      console.error('[Moderation] Error removing warning:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all warnings for a user
   */
  async getWarnings(groupId, userId) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `SELECT id, admin_id, reason, timestamp 
           FROM warnings 
           WHERE group_id = $1 AND user_id = $2 AND active = TRUE
           ORDER BY timestamp ASC`,
          [groupId, userId]
        );
        return result.rows;
      } else {
        // In-memory fallback
        const warnings = this.warningCache.get(key) || [];
        return warnings.filter(w => w.active).map(w => ({
          id: w.id,
          admin_id: w.adminId,
          reason: w.reason,
          timestamp: w.timestamp
        }));
      }
    } catch (error) {
      console.error('[Moderation] Error getting warnings:', error.message);
      return [];
    }
  }

  /**
   * Get warning count for a user
   */
  async getWarningCount(groupId, userId) {
    const warnings = await this.getWarnings(groupId, userId);
    return warnings.length;
  }

  /**
   * Reset all warnings for a user
   */
  async resetWarnings(groupId, userId, adminId) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        await this.db.query(
          `UPDATE warnings SET active = FALSE 
           WHERE group_id = $1 AND user_id = $2 AND active = TRUE`,
          [groupId, userId]
        );
        await this.logAction(groupId, 'warnings_reset', userId, adminId, 'All warnings cleared');
        return { success: true };
      } else {
        // In-memory fallback
        const warnings = this.warningCache.get(key) || [];
        warnings.forEach(w => w.active = false);
        await this.logAction(groupId, 'warnings_reset', userId, adminId, 'All warnings cleared');
        return { success: true };
      }
    } catch (error) {
      console.error('[Moderation] Error resetting warnings:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all warned users in a group
   */
  async getWarnedUsers(groupId) {
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `SELECT DISTINCT user_id, COUNT(*) as warn_count
           FROM warnings
           WHERE group_id = $1 AND active = TRUE
           GROUP BY user_id
           ORDER BY warn_count DESC`,
          [groupId]
        );
        return result.rows;
      } else {
        // In-memory fallback
        const warnedUsers = new Map();
        for (const [key, warnings] of this.warningCache.entries()) {
          if (key.startsWith(`${groupId}:`)) {
            const userId = key.split(':')[1];
            const count = warnings.filter(w => w.active).length;
            if (count > 0) {
              warnedUsers.set(userId, { user_id: userId, warn_count: count });
            }
          }
        }
        return Array.from(warnedUsers.values()).sort((a, b) => b.warn_count - a.warn_count);
      }
    } catch (error) {
      console.error('[Moderation] Error getting warned users:', error.message);
      return [];
    }
  }

  // ==================== BAN SYSTEM ====================

  /**
   * Ban a user (permanent or temporary)
   */
  async banUser(groupId, userId, reason, duration, adminId) {
    const key = `${groupId}:${userId}`;
    
    try {
      let expiresAt = null;
      if (duration) {
        expiresAt = new Date(Date.now() + duration);
      }
      
      if (this.db.is_connected()) {
        // First, unban if already banned
        await this.db.query(
          `UPDATE bans SET active = FALSE WHERE group_id = $1 AND user_id = $2 AND active = TRUE`,
          [groupId, userId]
        );
        
        const result = await this.db.query(
          `INSERT INTO bans (group_id, user_id, admin_id, reason, duration, banned_at, expires_at, active)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, TRUE)
           RETURNING id`,
          [groupId, userId, adminId, reason, duration, expiresAt]
        );
        
        await this.logAction(groupId, 'user_banned', userId, adminId, reason, { 
          banId: result.rows[0].id, 
          duration,
          expiresAt 
        });
        
        return { success: true, banId: result.rows[0].id, expiresAt };
      } else {
        // In-memory fallback
        if (!this.banCache.has(key)) {
          this.banCache.set(key, []);
        }
        const banId = Date.now();
        this.banCache.get(key).push({
          id: banId,
          groupId,
          userId,
          adminId,
          reason,
          duration,
          bannedAt: Date.now(),
          expiresAt: expiresAt ? expiresAt.getTime() : null,
          active: true
        });
        
        await this.logAction(groupId, 'user_banned', userId, adminId, reason, { banId, duration, expiresAt });
        
        return { success: true, banId, expiresAt };
      }
    } catch (error) {
      console.error('[Moderation] Error banning user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(groupId, userId, adminId) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `UPDATE bans SET active = FALSE 
           WHERE group_id = $1 AND user_id = $2 AND active = TRUE
           RETURNING id`,
          [groupId, userId]
        );
        
        if (result.rows.length > 0) {
          await this.logAction(groupId, 'user_unbanned', userId, adminId, 'Ban lifted');
          return { success: true };
        }
        return { success: false, error: 'User is not banned' };
      } else {
        // In-memory fallback
        const bans = this.banCache.get(key) || [];
        const activeBan = bans.find(b => b.active);
        
        if (activeBan) {
          activeBan.active = false;
          await this.logAction(groupId, 'user_unbanned', userId, adminId, 'Ban lifted');
          return { success: true };
        }
        return { success: false, error: 'User is not banned' };
      }
    } catch (error) {
      console.error('[Moderation] Error unbanning user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a user is banned
   */
  async isBanned(groupId, userId) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `SELECT id, reason, expires_at 
           FROM bans 
           WHERE group_id = $1 AND user_id = $2 AND active = TRUE`,
          [groupId, userId]
        );
        
        if (result.rows.length > 0) {
          const ban = result.rows[0];
          // Check if temporary ban has expired
          if (ban.expires_at && new Date(ban.expires_at) < new Date()) {
            await this.unbanUser(groupId, userId, null);
            return { banned: false };
          }
          return { 
            banned: true, 
            reason: ban.reason, 
            expiresAt: ban.expires_at 
          };
        }
        return { banned: false };
      } else {
        // In-memory fallback
        const bans = this.banCache.get(key) || [];
        const activeBan = bans.find(b => b.active);
        
        if (activeBan) {
          // Check if temporary ban has expired
          if (activeBan.expiresAt && activeBan.expiresAt < Date.now()) {
            activeBan.active = false;
            return { banned: false };
          }
          return { 
            banned: true, 
            reason: activeBan.reason, 
            expiresAt: activeBan.expiresAt 
          };
        }
        return { banned: false };
      }
    } catch (error) {
      console.error('[Moderation] Error checking ban status:', error.message);
      return { banned: false, error: error.message };
    }
  }

  /**
   * Get all banned users in a group
   */
  async getBanList(groupId) {
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `SELECT user_id, admin_id, reason, banned_at, expires_at
           FROM bans
           WHERE group_id = $1 AND active = TRUE
           ORDER BY banned_at DESC`,
          [groupId]
        );
        return result.rows;
      } else {
        // In-memory fallback
        const bannedUsers = [];
        for (const [key, bans] of this.banCache.entries()) {
          if (key.startsWith(`${groupId}:`)) {
            const activeBans = bans.filter(b => b.active);
            activeBans.forEach(ban => {
              bannedUsers.push({
                user_id: ban.userId,
                admin_id: ban.adminId,
                reason: ban.reason,
                banned_at: ban.bannedAt,
                expires_at: ban.expiresAt
              });
            });
          }
        }
        return bannedUsers.sort((a, b) => b.banned_at - a.banned_at);
      }
    } catch (error) {
      console.error('[Moderation] Error getting ban list:', error.message);
      return [];
    }
  }

  /**
   * Check and auto-unban expired temporary bans
   */
  async checkExpiredBans() {
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `SELECT id, group_id, user_id 
           FROM bans 
           WHERE active = TRUE AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`
        );
        
        for (const ban of result.rows) {
          await this.db.query(
            `UPDATE bans SET active = FALSE WHERE id = $1`,
            [ban.id]
          );
          await this.logAction(ban.group_id, 'ban_expired', ban.user_id, null, 'Temporary ban expired');
        }
        
        if (result.rows.length > 0) {
          console.log(`[Moderation] Auto-unbanned ${result.rows.length} users`);
        }
      } else {
        // In-memory fallback
        let unbanned = 0;
        for (const [key, bans] of this.banCache.entries()) {
          for (const ban of bans) {
            if (ban.active && ban.expiresAt && ban.expiresAt < Date.now()) {
              ban.active = false;
              unbanned++;
            }
          }
        }
        if (unbanned > 0) {
          console.log(`[Moderation] Auto-unbanned ${unbanned} users (in-memory)`);
        }
      }
    } catch (error) {
      console.error('[Moderation] Error checking expired bans:', error.message);
    }
  }

  // ==================== RESTRICTION SYSTEM ====================

  /**
   * Apply restriction to a user
   */
  async restrictUser(groupId, userId, type, duration, adminId) {
    const key = `${groupId}:${userId}:${type}`;
    
    try {
      let expiresAt = null;
      if (duration) {
        expiresAt = new Date(Date.now() + duration);
      }
      
      if (this.db.is_connected()) {
        // First, remove existing restriction of same type
        await this.db.query(
          `UPDATE restrictions SET active = FALSE 
           WHERE group_id = $1 AND user_id = $2 AND type = $3 AND active = TRUE`,
          [groupId, userId, type]
        );
        
        const result = await this.db.query(
          `INSERT INTO restrictions (group_id, user_id, admin_id, type, duration, restricted_at, expires_at, active)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, TRUE)
           RETURNING id`,
          [groupId, userId, adminId, type, duration, expiresAt]
        );
        
        await this.logAction(groupId, 'user_restricted', userId, adminId, `Type: ${type}`, { 
          restrictionId: result.rows[0].id, 
          type,
          duration,
          expiresAt 
        });
        
        return { success: true, restrictionId: result.rows[0].id, expiresAt };
      } else {
        // In-memory fallback
        if (!this.restrictionCache.has(key)) {
          this.restrictionCache.set(key, []);
        }
        const restrictionId = Date.now();
        this.restrictionCache.get(key).push({
          id: restrictionId,
          groupId,
          userId,
          adminId,
          type,
          duration,
          restrictedAt: Date.now(),
          expiresAt: expiresAt ? expiresAt.getTime() : null,
          active: true
        });
        
        await this.logAction(groupId, 'user_restricted', userId, adminId, `Type: ${type}`, { restrictionId, type, duration, expiresAt });
        
        return { success: true, restrictionId, expiresAt };
      }
    } catch (error) {
      console.error('[Moderation] Error restricting user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove restriction from a user
   */
  async unrestrictUser(groupId, userId, type, adminId) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        let result;
        if (type) {
          result = await this.db.query(
            `UPDATE restrictions SET active = FALSE 
             WHERE group_id = $1 AND user_id = $2 AND type = $3 AND active = TRUE
             RETURNING id`,
            [groupId, userId, type]
          );
        } else {
          // Remove all restrictions
          result = await this.db.query(
            `UPDATE restrictions SET active = FALSE 
             WHERE group_id = $1 AND user_id = $2 AND active = TRUE
             RETURNING id`,
            [groupId, userId]
          );
        }
        
        if (result.rows.length > 0) {
          await this.logAction(groupId, 'user_unrestricted', userId, adminId, type ? `Type: ${type}` : 'All restrictions');
          return { success: true };
        }
        return { success: false, error: 'No active restrictions found' };
      } else {
        // In-memory fallback
        let removed = 0;
        for (const [cacheKey, restrictions] of this.restrictionCache.entries()) {
          if (cacheKey.startsWith(`${groupId}:${userId}`)) {
            for (const restriction of restrictions) {
              if (restriction.active && (!type || restriction.type === type)) {
                restriction.active = false;
                removed++;
              }
            }
          }
        }
        
        if (removed > 0) {
          await this.logAction(groupId, 'user_unrestricted', userId, adminId, type ? `Type: ${type}` : 'All restrictions');
          return { success: true };
        }
        return { success: false, error: 'No active restrictions found' };
      }
    } catch (error) {
      console.error('[Moderation] Error unrestricting user:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's active restrictions
   */
  async getUserRestrictions(groupId, userId) {
    const key = `${groupId}:${userId}`;
    
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `SELECT type, expires_at 
           FROM restrictions 
           WHERE group_id = $1 AND user_id = $2 AND active = TRUE`,
          [groupId, userId]
        );
        return result.rows;
      } else {
        // In-memory fallback
        const restrictions = [];
        for (const [cacheKey, restrictionList] of this.restrictionCache.entries()) {
          if (cacheKey.startsWith(`${groupId}:${userId}:`)) {
            const activeRestrictions = restrictionList.filter(r => r.active);
            activeRestrictions.forEach(r => {
              restrictions.push({
                type: r.type,
                expires_at: r.expiresAt
              });
            });
          }
        }
        return restrictions;
      }
    } catch (error) {
      console.error('[Moderation] Error getting restrictions:', error.message);
      return [];
    }
  }

  /**
   * Check and auto-unrestrict expired restrictions
   */
  async checkExpiredRestrictions() {
    try {
      if (this.db.is_connected()) {
        const result = await this.db.query(
          `SELECT id, group_id, user_id, type
           FROM restrictions 
           WHERE active = TRUE AND expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP`
        );
        
        for (const restriction of result.rows) {
          await this.db.query(
            `UPDATE restrictions SET active = FALSE WHERE id = $1`,
            [restriction.id]
          );
          await this.logAction(restriction.group_id, 'restriction_expired', restriction.user_id, null, `Temporary ${restriction.type} restriction expired`);
        }
        
        if (result.rows.length > 0) {
          console.log(`[Moderation] Auto-unrestricted ${result.rows.length} users`);
        }
      } else {
        // In-memory fallback
        let unrestricted = 0;
        for (const [key, restrictions] of this.restrictionCache.entries()) {
          for (const restriction of restrictions) {
            if (restriction.active && restriction.expiresAt && restriction.expiresAt < Date.now()) {
              restriction.active = false;
              unrestricted++;
            }
          }
        }
        if (unrestricted > 0) {
          console.log(`[Moderation] Auto-unrestricted ${unrestricted} users (in-memory)`);
        }
      }
    } catch (error) {
      console.error('[Moderation] Error checking expired restrictions:', error.message);
    }
  }

  // ==================== MODERATION LOGGING ====================

  /**
   * Log a moderation action
   */
  async logAction(groupId, action, targetUser, adminUser, reason, metadata = {}) {
    try {
      if (this.db.is_connected()) {
        await this.db.query(
          `INSERT INTO moderation_log (group_id, action, target_user, admin_user, reason, timestamp, metadata_json)
           VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)`,
          [groupId, action, targetUser, adminUser, reason, metadata]
        );
      }
      // In-memory: we don't store logs, just rely on DB
    } catch (error) {
      console.error('[Moderation] Error logging action:', error.message);
    }
  }

  /**
   * Get moderation log for a group
   */
  async getModLog(groupId, limit = 20, filters = {}) {
    try {
      if (this.db.is_connected()) {
        let query = `
          SELECT id, action, target_user, admin_user, reason, timestamp, metadata_json
          FROM moderation_log
          WHERE group_id = $1
        `;
        const params = [groupId];
        let paramIndex = 2;
        
        if (filters.action) {
          query += ` AND action = $${paramIndex}`;
          params.push(filters.action);
          paramIndex++;
        }
        
        if (filters.targetUser) {
          query += ` AND target_user = $${paramIndex}`;
          params.push(filters.targetUser);
          paramIndex++;
        }
        
        query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
        params.push(limit);
        
        const result = await this.db.query(query, params);
        return result.rows;
      } else {
        // In-memory fallback: no log storage
        return [];
      }
    } catch (error) {
      console.error('[Moderation] Error getting mod log:', error.message);
      return [];
    }
  }

  /**
   * Clear old moderation logs
   */
  async clearModLog(groupId, olderThanDays = 90) {
    try {
      if (this.db.is_connected()) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
        
        const result = await this.db.query(
          `DELETE FROM moderation_log 
           WHERE group_id = $1 AND timestamp < $2`,
          [groupId, cutoffDate]
        );
        
        console.log(`[Moderation] Cleared ${result.rowCount} old log entries`);
        return { success: true, cleared: result.rowCount };
      }
      return { success: false, error: 'Database not connected' };
    } catch (error) {
      console.error('[Moderation] Error clearing mod log:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ==================== CLEANUP JOBS ====================

  /**
   * Run all cleanup jobs (expired bans, restrictions, old logs)
   */
  async runCleanupJobs() {
    console.log('[Moderation] Running cleanup jobs...');
    await this.checkExpiredBans();
    await this.checkExpiredRestrictions();
    console.log('[Moderation] Cleanup jobs completed');
  }

  /**
   * Start scheduled cleanup job (every 5 minutes)
   */
  startCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.runCleanupJobs();
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('[Moderation] Cleanup scheduler started (5 minute interval)');
  }

  /**
   * Stop cleanup scheduler
   */
  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Moderation] Cleanup scheduler stopped');
    }
  }
}

// Singleton instance
const moderationManager = new ModerationManager();



module.exports = { moderationManager };
module.exports.default = moderationManager;
