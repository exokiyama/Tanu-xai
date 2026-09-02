import type { proto, WASocket } from '@whiskeysockets/baileys';
import { executeCommand } from './commands.js';
import { getSettings } from './settings.js';
import { isOwner } from '../permissions/owner.js';
import { isSudo } from '../permissions/sudo.js';
import { getGroupMetadata } from '../cache/groups.js';
import { eventStore, messageId } from '../cache/events.js';
import { rememberMessage } from '../cache/message-store.js';
const textOf = (message: proto.IWebMessageInfo) => message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? message.message?.imageMessage?.caption ?? message.message?.videoMessage?.caption ?? '';
const quotedOf = (message: proto.IWebMessageInfo) => { const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage; return quoted ? ({ message: quoted } as proto.IWebMessageInfo) : undefined; };
export async function handleMessages(upsert: { messages: proto.IWebMessageInfo[]; type: string }, sock: WASocket) {
  for (const message of upsert.messages) {
    if (message.key?.fromMe || message.key?.remoteJid === 'status@broadcast' || !message.message) continue;
    rememberMessage(message);
    const text = textOf(message).trim(); const chat = message.key?.remoteJid ?? ''; const sender = message.key?.participant ?? chat;
    const mediaType = message.message.imageMessage ? 'image' : message.message.videoMessage ? 'video' : message.message.audioMessage ? 'audio' : message.message.documentMessage ? 'document' : message.message.stickerMessage ? 'sticker' : undefined;
    const viewOnce = Boolean(message.message.viewOnceMessage || message.message.viewOnceMessageV2 || message.message.viewOnceMessageV2Extension);
    eventStore.add({ id: messageId(message), chat, sender, timestamp: (Number(message.messageTimestamp) || Math.floor(Date.now() / 1000)) * 1000, kind: viewOnce ? 'view-once' : 'message', text, mediaType, fromMe: Boolean(message.key?.fromMe), isGroup: chat.endsWith('@g.us'), viewOnce, quoted: Boolean(message.message.extendedTextMessage?.contextInfo?.quotedMessage) });
    const prefix = getSettings().prefix; if (!text.startsWith(prefix)) continue;
    const parts = text.slice(prefix.length).trim().split(/\s+/); const command = (parts.shift() ?? '').toLowerCase(); if (!command) continue;
    let isAdmin = false; let isBotAdmin = false; const isGroup = chat.endsWith('@g.us');
    if (isGroup) { try { const metadata = await getGroupMetadata(sock, chat); const participant = metadata.participants.find(item => item.id === sender); const bot = metadata.participants.find(item => item.id === sock.user?.id); isAdmin = Boolean(participant?.admin); isBotAdmin = Boolean(bot?.admin); } catch { /* permissions remain false */ } }
    await executeCommand({ sock, message, chat, sender, text, args: parts, command, mentions: message.message.extendedTextMessage?.contextInfo?.mentionedJid ?? [], quoted: quotedOf(message), isGroup, isOwner: isOwner(sender), isSudo: isSudo(sender), isAdmin, isBotAdmin });
  }
}
