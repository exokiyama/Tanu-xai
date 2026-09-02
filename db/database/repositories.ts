import { db } from './client.js';
export async function readSetting(key: string): Promise<unknown | null> { if (!db.isAvailable()) return null; const value = await db.api.get<{ value?: unknown }>('bot_settings', { key }); return value?.value ?? null; }
export async function writeSetting(key: string, value: unknown): Promise<void> { if (!db.isAvailable()) return; await db.api.upsert('bot_settings', { key, value, updated_at: new Date().toISOString() }); }
