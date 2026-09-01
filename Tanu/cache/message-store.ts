import type { proto } from '@whiskeysockets/baileys';
import { eventStore, messageId } from './events.js';
const messages = new Map<string, { value: proto.IWebMessageInfo; expires: number }>();
const ttl = 86_400_000; const max = 1000;
export function rememberMessage(message: proto.IWebMessageInfo) { const id = messageId(message); if (messages.size >= max) messages.delete(messages.keys().next().value as string); messages.set(id, { value: message, expires: Date.now() + ttl }); }
export async function getMessage(key: proto.IMessageKey): Promise<proto.IMessage | undefined> { const entry = messages.get(key.id ?? ''); if (!entry || entry.expires < Date.now()) { if (entry) messages.delete(key.id ?? ''); return undefined; } return entry.value.message ?? undefined; }
export function markUpdate(id: string, kind: 'edited' | 'deleted', text?: string) { if (kind === 'edited' && text) eventStore.markEdited(id, text); else eventStore.markDeleted(id); }
