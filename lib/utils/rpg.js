'use strict';

/**
 * Shared RPG data layer.
 *
 * WhatsApp JIDs are NOT PostgreSQL UUIDs. This module resolves a JID/phone
 * number to the user's UUID once and all economy/inventory operations use the
 * UUID internally. Money/item transfers are always performed in a transaction.
 */

const db = require('../database/index.js');

function phoneFromJid(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  return raw.includes('@') ? raw.split('@')[0].split(':')[0].replace(/\D/g, '') : raw.replace(/\D/g, '');
}

async function ensureUserExists(userId, client = null, displayName = null) {
  const executor = client || db;
  const phone = phoneFromJid(userId);
  if (!phone) throw new Error('Invalid RPG user identifier');
  const name = displayName || phone;

  const result = await executor.query(
    `INSERT INTO users (phone_number, display_name, xp, level, updated_at)
     VALUES ($1, $2, 0, 1, NOW())
     ON CONFLICT (phone_number)
     DO UPDATE SET display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), users.display_name), updated_at = NOW()
     RETURNING id, phone_number, display_name, xp, level, created_at`,
    [phone, name]
  );
  return result.rows[0];
}

async function resolveUserUuid(userId, client = null, displayName = null) {
  const row = await ensureUserExists(userId, client, displayName);
  return row.id;
}

async function ensureEconomy(client, userUuid) {
  await client.query(
    `INSERT INTO economy (user_id, coins, updated_at)
     VALUES ($1, 0, NOW())
     ON CONFLICT (user_id) DO NOTHING`,
    [userUuid]
  );
}

async function getBalance(userId) {
  try {
    const uuid = await resolveUserUuid(userId);
    await db.query(
      `INSERT INTO economy (user_id, coins, updated_at) VALUES ($1, 0, NOW()) ON CONFLICT (user_id) DO NOTHING`,
      [uuid]
    );
    const result = await db.query('SELECT coins FROM economy WHERE user_id = $1', [uuid]);
    return Number(result.rows[0]?.coins || 0);
  } catch (error) {
    console.error('[RPG] getBalance:', error.message);
    return 0;
  }
}

async function updateBalance(userId, amount, transactionType = 'adjustment') {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || !Number.isInteger(numericAmount)) {
    return { success: false, balance: await getBalance(userId), message: 'Invalid coin amount.' };
  }
  if (numericAmount === 0) return { success: true, balance: await getBalance(userId), message: 'No balance change.' };

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const uuid = await resolveUserUuid(userId, client);
    await ensureEconomy(client, uuid);

    const result = await client.query('SELECT coins FROM economy WHERE user_id = $1 FOR UPDATE', [uuid]);
    const current = Number(result.rows[0]?.coins || 0);
    const next = current + numericAmount;
    if (next < 0) {
      await client.query('ROLLBACK');
      return { success: false, balance: current, message: `Insufficient funds. You need ${Math.abs(numericAmount)} coins.` };
    }

    await client.query('UPDATE economy SET coins = $1, updated_at = NOW() WHERE user_id = $2', [next, uuid]);
    await client.query(
      `INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)`,
      [uuid, numericAmount, transactionType, `${transactionType}: ${numericAmount > 0 ? '+' : ''}${numericAmount}`]
    );
    await client.query('COMMIT');
    return { success: true, balance: next, message: `Transaction successful. New balance: ${next}` };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[RPG] updateBalance:', error.message);
    return { success: false, balance: await getBalance(userId), message: `Transaction failed: ${error.message}` };
  } finally {
    client.release();
  }
}

async function transferCoins(fromUserId, toUserId, amount) {
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) return { success: false, message: 'Transfer amount must be a positive integer.' };
  if (phoneFromJid(fromUserId) === phoneFromJid(toUserId)) return { success: false, message: 'You cannot transfer coins to yourself.' };

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const fromUuid = await resolveUserUuid(fromUserId, client);
    const toUuid = await resolveUserUuid(toUserId, client);
    await ensureEconomy(client, fromUuid);
    await ensureEconomy(client, toUuid);

    const sender = await client.query('SELECT coins FROM economy WHERE user_id = $1 FOR UPDATE', [fromUuid]);
    const receiver = await client.query('SELECT coins FROM economy WHERE user_id = $1 FOR UPDATE', [toUuid]);
    const current = Number(sender.rows[0]?.coins || 0);
    if (current < numericAmount) {
      await client.query('ROLLBACK');
      return { success: false, message: `Insufficient funds. You have ${current} coins but need ${numericAmount}.` };
    }

    await client.query('UPDATE economy SET coins = coins - $1, updated_at = NOW() WHERE user_id = $2', [numericAmount, fromUuid]);
    await client.query('UPDATE economy SET coins = coins + $1, updated_at = NOW() WHERE user_id = $2', [numericAmount, toUuid]);
    await client.query(`INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'transfer_send', $3)`, [fromUuid, -numericAmount, `Sent ${numericAmount} coins to ${phoneFromJid(toUserId)}`]);
    await client.query(`INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'transfer_receive', $3)`, [toUuid, numericAmount, `Received ${numericAmount} coins from ${phoneFromJid(fromUserId)}`]);
    await client.query('COMMIT');
    return { success: true, message: `Successfully transferred ${numericAmount} coins to @${phoneFromJid(toUserId)}`, newBalance: current - numericAmount };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('[RPG] transferCoins:', error.message);
    return { success: false, message: `Transfer failed: ${error.message}` };
  } finally {
    client.release();
  }
}

const COOLDOWN_COLUMNS = new Set(['daily', 'work', 'crime', 'rob', 'hunt', 'weekly', 'adventure']);

async function checkCooldown(userId, action, cooldownMs) {
  if (!COOLDOWN_COLUMNS.has(action)) throw new Error(`Unsupported cooldown: ${action}`);
  try {
    const uuid = await resolveUserUuid(userId);
    await db.query(`INSERT INTO economy (user_id, coins, updated_at) VALUES ($1, 0, NOW()) ON CONFLICT (user_id) DO NOTHING`, [uuid]);
    const result = await db.query(`SELECT last_${action} FROM economy WHERE user_id = $1`, [uuid]);
    const last = result.rows[0]?.[`last_${action}`];
    if (!last) return { ready: true, remainingMs: 0 };
    const remainingMs = Number(cooldownMs) - (Date.now() - new Date(last).getTime());
    return remainingMs <= 0 ? { ready: true, remainingMs: 0 } : { ready: false, remainingMs };
  } catch (error) {
    console.error('[RPG] checkCooldown:', error.message);
    return { ready: true, remainingMs: 0 };
  }
}

async function setCooldown(userId, action) {
  if (!COOLDOWN_COLUMNS.has(action)) throw new Error(`Unsupported cooldown: ${action}`);
  try {
    const uuid = await resolveUserUuid(userId);
    await db.query(`INSERT INTO economy (user_id, coins, updated_at) VALUES ($1, 0, NOW()) ON CONFLICT (user_id) DO NOTHING`, [uuid]);
    await db.query(`UPDATE economy SET last_${action} = NOW(), updated_at = NOW() WHERE user_id = $1`, [uuid]);
    return true;
  } catch (error) {
    console.error('[RPG] setCooldown:', error.message);
    return false;
  }
}

async function getInventory(userId) {
  try {
    const uuid = await resolveUserUuid(userId);
    const result = await db.query('SELECT item_key, quantity FROM inventory WHERE user_id = $1 AND quantity > 0 ORDER BY item_key', [uuid]);
    return Object.fromEntries(result.rows.map(row => [row.item_key, Number(row.quantity)]));
  } catch (error) {
    console.error('[RPG] getInventory:', error.message);
    return {};
  }
}

async function addItem(userId, itemKey, quantity = 1) {
  const qty = Number(quantity);
  if (!itemKey || !Number.isInteger(qty) || qty <= 0) return { success: false, error: 'Invalid item or quantity' };
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const uuid = await resolveUserUuid(userId, client);
    await client.query(
      `INSERT INTO inventory (user_id, item_key, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
      [uuid, itemKey, qty]
    );
    await client.query('COMMIT');
    return { success: true, quantity: qty };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return { success: false, error: error.message };
  } finally { client.release(); }
}

async function removeItem(userId, itemKey, quantity = 1) {
  const qty = Number(quantity);
  if (!itemKey || !Number.isInteger(qty) || qty <= 0) return { success: false, error: 'Invalid item or quantity' };
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const uuid = await resolveUserUuid(userId, client);
    const result = await client.query('SELECT quantity FROM inventory WHERE user_id = $1 AND item_key = $2 FOR UPDATE', [uuid, itemKey]);
    const current = Number(result.rows[0]?.quantity || 0);
    if (current < qty) { await client.query('ROLLBACK'); return { success: false, error: `Not enough items. You have ${current}, need ${qty}` }; }
    await client.query('UPDATE inventory SET quantity = quantity - $1 WHERE user_id = $2 AND item_key = $3', [qty, uuid, itemKey]);
    await client.query('DELETE FROM inventory WHERE user_id = $1 AND item_key = $2 AND quantity <= 0', [uuid, itemKey]);
    await client.query('COMMIT');
    return { success: true, remainingQuantity: current - qty };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return { success: false, error: error.message };
  } finally { client.release(); }
}

async function transferItem(fromUserId, toUserId, itemKey, quantity = 1) {
  const qty = Number(quantity);
  if (!Number.isInteger(qty) || qty <= 0) return { success: false, error: 'Invalid quantity' };
  if (phoneFromJid(fromUserId) === phoneFromJid(toUserId)) return { success: false, error: 'Cannot transfer to yourself' };
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const fromUuid = await resolveUserUuid(fromUserId, client);
    const toUuid = await resolveUserUuid(toUserId, client);
    const result = await client.query('SELECT quantity FROM inventory WHERE user_id = $1 AND item_key = $2 FOR UPDATE', [fromUuid, itemKey]);
    const current = Number(result.rows[0]?.quantity || 0);
    if (current < qty) { await client.query('ROLLBACK'); return { success: false, error: `Not enough items. You have ${current}` }; }
    await client.query('UPDATE inventory SET quantity = quantity - $1 WHERE user_id = $2 AND item_key = $3', [qty, fromUuid, itemKey]);
    await client.query('DELETE FROM inventory WHERE user_id = $1 AND item_key = $2 AND quantity <= 0', [fromUuid, itemKey]);
    await client.query(`INSERT INTO inventory (user_id, item_key, quantity) VALUES ($1, $2, $3) ON CONFLICT (user_id, item_key) DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`, [toUuid, itemKey, qty]);
    await client.query('COMMIT');
    return { success: true, message: `Transferred ${qty}x ${itemKey}` };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return { success: false, error: error.message };
  } finally { client.release(); }
}

async function getUserProfile(userId) {
  try {
    const uuid = await resolveUserUuid(userId);
    const result = await db.query(
      `SELECT u.id, u.phone_number, u.display_name, u.xp, u.level, u.created_at,
              e.coins, e.last_daily, e.last_work, e.last_crime
       FROM users u LEFT JOIN economy e ON u.id = e.user_id WHERE u.id = $1`,
      [uuid]
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return { id: row.id, phoneNumber: row.phone_number, displayName: row.display_name, xp: Number(row.xp || 0), level: Number(row.level || 1), coins: Number(row.coins || 0), lastDaily: row.last_daily, lastWork: row.last_work, lastCrime: row.last_crime, registeredAt: row.created_at };
  } catch (error) {
    console.error('[RPG] getUserProfile:', error.message);
    return null;
  }
}

async function addXP(userId, amount) {
  const xpAmount = Number(amount);
  if (!Number.isInteger(xpAmount) || xpAmount <= 0) return { success: false, error: 'Invalid XP amount' };
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const uuid = await resolveUserUuid(userId, client);
    const result = await client.query('SELECT xp, level FROM users WHERE id = $1 FOR UPDATE', [uuid]);
    const currentXP = Number(result.rows[0]?.xp || 0);
    const currentLevel = Number(result.rows[0]?.level || 1);
    const newXp = currentXP + xpAmount;
    const newLevel = Math.max(currentLevel, Math.floor(newXp / 1000) + 1);
    await client.query('UPDATE users SET xp = $1, level = $2, updated_at = NOW() WHERE id = $3', [newXp, newLevel, uuid]);
    await client.query('COMMIT');
    return { success: true, xp: newXp, level: newLevel, leveledUp: newLevel > currentLevel, xpForNextLevel: newLevel * 1000 };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    return { success: false, error: error.message };
  } finally { client.release(); }
}

async function getLeaderboard(limit = 10, orderBy = 'xp') {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const order = ['xp', 'coins', 'level'].includes(orderBy) ? orderBy : 'xp';
  try {
    const result = await db.query(
      `SELECT u.id, u.display_name, u.xp, u.level, COALESCE(e.coins, 0) AS coins
       FROM users u LEFT JOIN economy e ON u.id = e.user_id
       ORDER BY ${order} DESC, u.xp DESC LIMIT $1`,
      [safeLimit]
    );
    return result.rows.map((row, index) => ({ rank: index + 1, id: row.id, displayName: row.display_name || row.id, xp: Number(row.xp || 0), level: Number(row.level || 1), coins: Number(row.coins || 0) }));
  } catch (error) {
    console.error('[RPG] getLeaderboard:', error.message);
    return [];
  }
}

const rpgUtils = {
  ensureUserExists,
  resolveUserUuid,
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

module.exports = { ...rpgUtils, rpgUtils };
