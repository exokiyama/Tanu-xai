import { makeCacheableSignalKeyStore, type AuthenticationState, type SignalDataSet, type SignalKeyStore } from '@whiskeysockets/baileys';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

function decodePayload(token: string): Record<string, unknown> {
  const encoded = token.slice('Tanu-XAI~'.length);
  const candidates = [encoded, encoded.replace(/-/g, '+').replace(/_/g, '/')];
  for (const candidate of candidates) { try { const value = JSON.parse(Buffer.from(candidate, 'base64').toString('utf8')); if (value && typeof value === 'object') return value; } catch { /* try next format */ } }
  throw new Error('SESSION_ID payload is not valid base64 JSON');
}
function objectKeyStore(input: Record<string, unknown>): SignalKeyStore {
  const data = new Map<string, unknown>();
  for (const [type, values] of Object.entries(input)) if (values && typeof values === 'object') for (const [id, value] of Object.entries(values as Record<string, unknown>)) data.set(`${type}:${id}`, value);
  return { get: async (type, ids) => Object.fromEntries(ids.map(id => [id, data.get(`${type}:${id}`)]).filter(([, value]) => value !== undefined)) as never, set: async (updates: SignalDataSet) => { for (const [type, values] of Object.entries(updates)) for (const [id, value] of Object.entries(values ?? {})) { if (value === null) data.delete(`${type}:${id}`); else data.set(`${type}:${id}`, value); } }, clear: async () => data.clear() };
}
export function loadSession(): AuthenticationState { if (!config.sessionId.startsWith('Tanu-XAI~')) throw new Error('Invalid SESSION_ID prefix'); const decoded = decodePayload(config.sessionId); const creds = (decoded.creds ?? decoded) as AuthenticationState['creds']; if (!creds || typeof creds !== 'object') throw new Error('SESSION_ID has no credentials'); const keys = objectKeyStore((decoded.keys ?? {}) as Record<string, unknown>); logger.info('WA', 'Session decoded without logging credentials'); return { creds, keys: makeCacheableSignalKeyStore(keys, undefined) }; }
