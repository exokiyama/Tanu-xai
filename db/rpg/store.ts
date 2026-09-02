import { db } from '../database/client.js';
export interface RpgUser { id: string; balance: number; xp: number; level: number; lastDaily?: string; }
export function rpgAvailable() { return db.isAvailable(); }
export async function findUser(id: string) { if (!db.isAvailable()) return null; return db.api.get<RpgUser>('rpg_users', { id }); }
export async function ensureUser(id: string) { const existing = await findUser(id); if (existing) return existing; const user: RpgUser = { id, balance: 0, xp: 0, level: 1 }; await db.api.upsert('rpg_users', user as unknown as Record<string, unknown>); return user; }
export async function saveUser(user: RpgUser) { await db.api.upsert('rpg_users', user as unknown as Record<string, unknown>); return user; }
