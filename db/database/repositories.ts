import { db } from './client.js';
export async function readSetting(key: string): Promise<unknown | null> { if (!db.isAvailable()) return null; const result = await db.api?.from('bot_settings').select('value').eq('key', key).maybeSingle(); if (result?.error) throw result.error; return result?.data?.value ?? null; }
export async function writeSetting(key: string, value: unknown): Promise<void> { if (!db.isAvailable()) return; const result = await db.api?.from('bot_settings').upsert({ key, value, updated_at: new Date().toISOString() }); if (result?.error) throw result.error; }
