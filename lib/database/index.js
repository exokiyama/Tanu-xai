const { Pool } = require('pg');
const { config } = require('../../config/config.js');

/**
 * Neon PostgreSQL connection pool with error handling and reconnection logic
 */

let pool = null;
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = config.maxReconnectAttempts || 10;

/**
 * Initialize the database connection pool
 */
async function connect() {
  if (pool) {
    return pool;
  }

  const databaseUrl = config.databaseUrl;

  // Check if it's a PostgreSQL URL
  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    console.log('[DB] Not a PostgreSQL URL, skipping connection');
    return null;
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      min: 0,
      connectionTimeoutMillis: 30000,
      idleTimeoutMillis: 10000,
      maxUses: 0,
      keepAlive: true,
      ssl: /sslmode=require|neon\.tech|render\.com/.test(databaseUrl)
        ? { rejectUnauthorized: false }
        : undefined
    });

    // Test the connection
    await pool.query('SELECT NOW()');
    isConnected = true;
    reconnectAttempts = 0;
    console.log('[DB] PostgreSQL connection established');

    // Handle pool errors
    pool.on('error', async (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
      isConnected = false;
      await attemptReconnect();
    });

    return pool;
  } catch (error) {
    console.error('[DB] Failed to connect to PostgreSQL:', error.message);
    pool = null;
    isConnected = false;
    await attemptReconnect();
    return null;
  }
}

/**
 * Attempt to reconnect with exponential backoff
 */
async function attemptReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('[DB] Max reconnection attempts reached. Giving up.');
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

  console.log(`[DB] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);

  setTimeout(async () => {
    try {
      await connect();
    } catch (err) {
      console.error('[DB] Reconnection failed:', err.message);
    }
  }, delay);
}

/**
 * Get a client from the pool
 */
async function getClient() {
  if (!pool) {
    throw new Error('[DB] Database pool not initialized');
  }
  return pool.connect();
}

/**
 * Execute a query
 */
async function query(text, params) {
  if (!pool) {
    throw new Error('[DB] Database pool not initialized');
  }
  return pool.query(text, params);
}

/**
 * Close the database connection
 */
async function disconnect() {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
    console.log('[DB] PostgreSQL connection closed');
  }
}

/**
 * Check if database is connected
 */
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
