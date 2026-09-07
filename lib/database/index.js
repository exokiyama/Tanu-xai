const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { config } = require('../../config/config.js');

// RPG + Daily Report PostgreSQL
const DATABASE_URL = config.databaseUrl;

/**
 * PostgreSQL connection pool
 */
let pool = null;
let isConnected = false;
let reconnectAttempts = 0;

const MAX_RECONNECT_ATTEMPTS = config.maxReconnectAttempts || 10;

async function runMigrations() {
  if (!pool) throw new Error('[DB] Pool not initialized');
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
  const dir = path.join(process.cwd(), 'db', 'migrations');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const done = await pool.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file]);
    if (done.rows.length) continue;
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations(name) VALUES($1)', [file]);
    console.log(`[DB] Migration applied: ${file}`);
  }
}

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
    await runMigrations();

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
  is_connected,
  runMigrations
};
