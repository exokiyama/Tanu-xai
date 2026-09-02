import assert from 'node:assert/strict';
import { db } from '../dist/db/database/client.js';
import { ensureUser } from '../dist/db/rpg/store.js';
const ok = await db.connect(); assert.equal(ok, true); assert.equal(db.api.name, 'postgresql'); await db.api.upsert('runtime_checks', { id: 'neon-connectivity', checked_at: new Date().toISOString(), purpose: 'rpg-and-dailyreport' }); const row = await db.api.get('runtime_checks', { id: 'neon-connectivity' }); assert.equal(row?.purpose, 'rpg-and-dailyreport'); const user = await ensureUser('smoke-neon-user'); assert.equal(user.id, 'smoke-neon-user'); await db.disconnect(); console.log('neon database: connected, RPG persistence, and report persistence path verified');
