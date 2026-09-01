import type { GroupMetadata, WASocket } from '@whiskeysockets/baileys';
const entries = new Map<string, { value: GroupMetadata; expires: number }>();
export async function getGroupMetadata(sock: WASocket, jid: string): Promise<GroupMetadata> { const existing = entries.get(jid); if (existing && existing.expires > Date.now()) return existing.value; const value = await sock.groupMetadata(jid); if (entries.size >= 200) entries.delete(entries.keys().next().value as string); entries.set(jid, { value, expires: Date.now() + 300_000 }); return value; }
export function invalidateGroupMetadata(jid?: string) { if (jid) entries.delete(jid); else entries.clear(); }
