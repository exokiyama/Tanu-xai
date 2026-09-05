const { Pool } = require('pg');
const { config } = require('../../config/config.js');

// RPG + Daily Report PostgreSQL
const DATABASE_URL = 'postgresql://neondb_owner:npg_jmq4ZMywF2rc@ep-frosty-tooth-axuobj00-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

/**
 * PostgreSQL connection pool
 */
let pool = null;
let isConnected = false;
let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = config.maxReconnectAttempts || 10;

async function connect() {
  if (pool) {
    return pool;
  }

  try {
    pool = new Pool({
      connectionString: DATABASE_URL,

      // Free-tier friendly
      max: 5,
      min: 0,

      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
      maxUses: 0,
      keepAlive: true,

      ssl: /sslmode=require|neon\.tech|render\.com/.test(DATABASE_URL)
        ? { rejectUnauthorized: false }
        : undefined
    });

    await pool.query('SELECT NOW()');

    isConnected = true;
    reconnectAttempts = 0;

    console.log('[DB] PostgreSQL connected');
    console.log('[DB] RPG + Daily Report persistence enabled');

    pool.on('error', async (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
      isConnected = false;
      await attemptReconnect();
    });

    return pool;

  } catch (error) {
    console.error('[DB] PostgreSQL connection failed:', error.message);

    pool = null;
    isConnected = false;

    await attemptReconnect();

    return null;
  }
}

async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[DB] Maximum reconnect attempts reached.');
    return;
  }

  reconnectAttempts++;

  const delay = Math.min(
    1000 * Math.pow(2, reconnectAttempts),
    30000
  );

  console.log(
    `[DB] Reconnecting in ${delay}ms ` +
    `(attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
  );

  setTimeout(async () => {
    try {
      await connect();
    } catch (err) {
      console.error('[DB] Reconnection failed:', err.message);
    }
  }, delay);
}

async function getClient() {
  if (!pool) {
    throw new Error('[DB] Database pool not initialized');
  }

  return pool.connect();
}

async function query(text, params) {
  if (!pool) {
    throw new Error('[DB] Database pool not initialized');
  }

  return pool.query(text, params);
}

async function disconnect() {
  if (pool) {
    await pool.end();

    pool = null;
    isConnected = false;

    console.log('[DB] PostgreSQL connection closed');
  }
}

function is_connected() {
  return isConnected && pool !== null;
}

module.exports = {
  connect,
  getClient,
  query,
  disconnect,
  is_connected
};
