/**
 * RPG Utility Functions
 * Shared utilities for RPG economy, inventory, cooldowns, and transactions
 */

import pkg from 'pg';
const { Pool } = pkg;

import { query, getClient, is_connected } from '../database/index.js';

/**
 * Ensure user exists in the database (auto-register)
 */
export async function ensureUserExists(userId) {
  try {
    const result = await query(
      `INSERT INTO users (id, phone_number, display_name, xp, level, created_at, updated_at)
       VALUES ($1, $2, $3, 0, 1, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      [userId, userId.split('@')[0], userId.split('@')[0]]
    );
    return result.rows[0];
  } catch (error) {
    console.error('[RPG] Error ensuring user exists:', error.message);
    throw error;
  }
}

/**
 * Get user balance (coins)
 */
export async function getBalance(userId) {
  try {
    await ensureUserExists(userId);
    
    const result = await query(
      `SELECT coins FROM economy WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Initialize economy record
      await query(
        `INSERT INTO economy (user_id, coins, updated_at) VALUES ($1, 0, NOW())`,
        [userId]
      );
      return 0;
    }
    
    return parseInt(result.rows[0].coins) || 0;
  } catch (error) {
    console.error('[RPG] Error getting balance:', error.message);
    return 0;
  }
}

/**
 * Update balance atomically with transaction support
 * @param {string} userId - User ID
 * @param {number} amount - Amount to add (positive) or remove (negative)
 * @param {string} transactionType - Type of transaction (daily, work, crime, shop, etc.)
 * @returns {Promise<{success: boolean, balance: number, message: string}>}
 */
export async function updateBalance(userId, amount, transactionType = 'adjustment') {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    await ensureUserExists(userId);
    
    // Check current balance
    const balanceResult = await client.query(
      `SELECT coins FROM economy WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    
    let currentBalance = 0;
    if (balanceResult.rows.length > 0) {
      currentBalance = parseInt(balanceResult.rows[0].coins) || 0;
    } else {
      // Initialize economy record
      await client.query(
        `INSERT INTO economy (user_id, coins, updated_at) VALUES ($1, 0, NOW())`,
        [userId]
      );
    }
    
    const newBalance = currentBalance + amount;
    
    // Prevent negative balance
    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return {
        success: false,
        balance: currentBalance,
        message: `Insufficient funds. You need ${Math.abs(newBalance)} more coins.`
      };
    }
    
    // Update balance
    await client.query(
      `UPDATE economy SET coins = $1, updated_at = NOW() WHERE user_id = $2`,
      [newBalance, userId]
    );
    
    // Log transaction
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, amount, transactionType, `${transactionType}: ${amount > 0 ? '+' : ''}${amount}`]
    );
    
    await client.query('COMMIT');
    
    return {
      success: true,
      balance: newBalance,
      message: `Transaction successful. New balance: ${newBalance}`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RPG] Error updating balance:', error.message);
    return {
      success: false,
      balance: await getBalance(userId),
      message: `Transaction failed: ${error.message}`
    };
  } finally {
    client.release();
  }
}

/**
 * Transfer coins between users with transaction safety
 */
export async function transferCoins(fromUserId, toUserId, amount) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    await ensureUserExists(fromUserId);
    await ensureUserExists(toUserId);
    
    // Check sender balance
    const balanceResult = await client.query(
      `SELECT coins FROM economy WHERE user_id = $1 FOR UPDATE`,
      [fromUserId]
    );
    
    let currentBalance = 0;
    if (balanceResult.rows.length > 0) {
      currentBalance = parseInt(balanceResult.rows[0].coins) || 0;
    }
    
    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return {
        success: false,
        message: `Insufficient funds. You have ${currentBalance} coins but need ${amount}.`
      };
    }
    
    // Deduct from sender
    await client.query(
      `UPDATE economy SET coins = coins - $1, updated_at = NOW() WHERE user_id = $2`,
      [amount, fromUserId]
    );
    
    // Add to receiver
    await client.query(
      `UPDATE economy SET coins = coins + $1, updated_at = NOW() WHERE user_id = $2`,
      [amount, toUserId]
    );
    
    // Log transactions
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [fromUserId, -amount, 'transfer_send', `Sent ${amount} coins to ${toUserId.split('@')[0]}`]
    );
    
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, description, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [toUserId, amount, 'transfer_receive', `Received ${amount} coins from ${fromUserId.split('@')[0]}`]
    );
    
    await client.query('COMMIT');
    
    const newBalance = currentBalance - amount;
    
    return {
      success: true,
      message: `Successfully transferred ${amount} coins to @${toUserId.split('@')[0]}`,
      newBalance
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RPG] Error transferring coins:', error.message);
    return {
      success: false,
      message: `Transfer failed: ${error.message}`
    };
  } finally {
    client.release();
  }
}

/**
 * Check if cooldown has expired
 * @param {string} userId - User ID
 * @param {string} action - Action name (daily, work, crime, etc.)
 * @param {number} cooldownMs - Cooldown in milliseconds
 * @returns {Promise<{ready: boolean, remainingMs: number}>}
 */
export async function checkCooldown(userId, action, cooldownMs) {
  try {
    await ensureUserExists(userId);
    
    const result = await query(
      `SELECT last_${action} FROM economy WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0 || !result.rows[0][`last_${action}`]) {
      return { ready: true, remainingMs: 0 };
    }
    
    const lastTime = new Date(result.rows[0][`last_${action}`]).getTime();
    const now = Date.now();
    const elapsed = now - lastTime;
    const remaining = cooldownMs - elapsed;
    
    if (remaining <= 0) {
      return { ready: true, remainingMs: 0 };
    }
    
    return { ready: false, remainingMs: remaining };
  } catch (error) {
    console.error('[RPG] Error checking cooldown:', error.message);
    return { ready: true, remainingMs: 0 }; // Allow on error
  }
}

/**
 * Set cooldown timestamp for an action
 */
export async function setCooldown(userId, action) {
  try {
    await ensureUserExists(userId);
    
    await query(
      `UPDATE economy SET last_${action} = NOW(), updated_at = NOW() WHERE user_id = $1`,
      [userId]
    );
    
    return true;
  } catch (error) {
    console.error('[RPG] Error setting cooldown:', error.message);
    return false;
  }
}

/**
 * Get user inventory
 */
export async function getInventory(userId) {
  try {
    await ensureUserExists(userId);
    
    const result = await query(
      `SELECT item_key, quantity FROM inventory WHERE user_id = $1 AND quantity > 0`,
      [userId]
    );
    
    return result.rows.reduce((acc, row) => {
      acc[row.item_key] = row.quantity;
      return acc;
    }, {});
  } catch (error) {
    console.error('[RPG] Error getting inventory:', error.message);
    return {};
  }
}

/**
 * Add item to inventory
 */
export async function addItem(userId, itemKey, quantity = 1) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    await ensureUserExists(userId);
    
    await client.query(
      `INSERT INTO inventory (user_id, item_key, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_key) 
       DO UPDATE SET quantity = inventory.quantity + $3`,
      [userId, itemKey, quantity]
    );
    
    await client.query('COMMIT');
    
    return { success: true, quantity };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RPG] Error adding item:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Remove item from inventory
 */
export async function removeItem(userId, itemKey, quantity = 1) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const result = await client.query(
      `SELECT quantity FROM inventory WHERE user_id = $1 AND item_key = $2`,
      [userId, itemKey]
    );
    
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Item not found in inventory' };
    }
    
    const currentQty = parseInt(result.rows[0].quantity) || 0;
    
    if (currentQty < quantity) {
      await client.query('ROLLBACK');
      return { success: false, error: `Not enough items. You have ${currentQty}, need ${quantity}` };
    }
    
    await client.query(
      `UPDATE inventory SET quantity = quantity - $1 WHERE user_id = $2 AND item_key = $3`,
      [quantity, userId, itemKey]
    );
    
    // Remove row if quantity is 0
    await client.query(
      `DELETE FROM inventory WHERE user_id = $1 AND item_key = $2 AND quantity = 0`,
      [userId, itemKey]
    );
    
    await client.query('COMMIT');
    
    return { success: true, remainingQuantity: currentQty - quantity };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RPG] Error removing item:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Transfer item between users
 */
export async function transferItem(fromUserId, toUserId, itemKey, quantity = 1) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    await ensureUserExists(fromUserId);
    await ensureUserExists(toUserId);
    
    // Check sender has item
    const senderResult = await client.query(
      `SELECT quantity FROM inventory WHERE user_id = $1 AND item_key = $2`,
      [fromUserId, itemKey]
    );
    
    if (senderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, error: 'Item not found in your inventory' };
    }
    
    const senderQty = parseInt(senderResult.rows[0].quantity) || 0;
    
    if (senderQty < quantity) {
      await client.query('ROLLBACK');
      return { success: false, error: `Not enough items. You have ${senderQty}` };
    }
    
    // Remove from sender
    await client.query(
      `UPDATE inventory SET quantity = quantity - $1 WHERE user_id = $2 AND item_key = $3`,
      [quantity, fromUserId, itemKey]
    );
    
    // Add to receiver
    await client.query(
      `INSERT INTO inventory (user_id, item_key, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_key)
       DO UPDATE SET quantity = inventory.quantity + $3`,
      [toUserId, itemKey, quantity]
    );
    
    await client.query('COMMIT');
    
    return { success: true, message: `Transferred ${quantity}x ${itemKey}` };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RPG] Error transferring item:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Get user profile/stats
 */
export async function getUserProfile(userId) {
  try {
    await ensureUserExists(userId);
    
    const result = await query(
      `SELECT u.id, u.phone_number, u.display_name, u.xp, u.level, u.created_at,
              e.coins, e.last_daily, e.last_work, e.last_crime
       FROM users u
       LEFT JOIN economy e ON u.id = e.user_id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      phoneNumber: row.phone_number,
      displayName: row.display_name,
      xp: parseInt(row.xp) || 0,
      level: parseInt(row.level) || 1,
      coins: parseInt(row.coins) || 0,
      lastDaily: row.last_daily,
      lastWork: row.last_work,
      lastCrime: row.last_crime,
      registeredAt: row.created_at
    };
  } catch (error) {
    console.error('[RPG] Error getting user profile:', error.message);
    return null;
  }
}

/**
 * Add XP to user and handle level up
 */
export async function addXP(userId, amount) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    await ensureUserExists(userId);
    
    const userResult = await client.query(
      `SELECT xp, level FROM users WHERE user_id = $1`,
      [userId]
    );
    
    let currentXP = 0;
    let currentLevel = 1;
    
    if (userResult.rows.length > 0) {
      currentXP = parseInt(userResult.rows[0].xp) || 0;
      currentLevel = parseInt(userResult.rows[0].level) || 1;
    }
    
    const newXp = currentXP + amount;
    const xpForNextLevel = currentLevel * 1000;
    
    let newLevel = currentLevel;
    let leveledUp = false;
    
    if (newXp >= xpForNextLevel) {
      newLevel = currentLevel + 1;
      leveledUp = true;
    }
    
    await client.query(
      `UPDATE users SET xp = $1, level = $2, updated_at = NOW() WHERE id = $3`,
      [newXp, newLevel, userId]
    );
    
    await client.query('COMMIT');
    
    return {
      success: true,
      xp: newXp,
      level: newLevel,
      leveledUp,
      xpForNextLevel: newLevel * 1000
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[RPG] Error adding XP:', error.message);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}

/**
 * Get global leaderboard (top users by XP or coins)
 */
export async function getLeaderboard(limit = 10, orderBy = 'xp') {
  try {
    const validOrderBy = ['xp', 'coins', 'level'];
    const orderField = validOrderBy.includes(orderBy) ? orderBy : 'xp';
    
    let joinClause = '';
    if (orderBy === 'coins') {
      joinClause = 'LEFT JOIN economy e ON u.id = e.user_id';
    }
    
    const result = await query(
      `SELECT u.id, u.display_name, u.xp, u.level, ${orderBy === 'coins' ? 'e.coins' : 'NULL as coins'}
       FROM users u
       ${joinClause}
       ORDER BY ${orderField} DESC
       LIMIT $1`,
      [limit]
    );
    
    return result.rows.map((row, index) => ({
      rank: index + 1,
      id: row.id,
      displayName: row.display_name || row.id.split('@')[0],
      xp: parseInt(row.xp) || 0,
      level: parseInt(row.level) || 1,
      coins: orderBy === 'coins' ? (parseInt(row.coins) || 0) : null
    }));
  } catch (error) {
    console.error('[RPG] Error getting leaderboard:', error.message);
    return [];
  }
}

export default {
  ensureUserExists,
  getBalance,
  updateBalance,
  transferCoins,
  checkCooldown,
  setCooldown,
  getInventory,
  addItem,
  removeItem,
  transferItem,
  getUserProfile,
  addXP,
  getLeaderboard
};
