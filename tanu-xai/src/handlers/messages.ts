import { proto, WASocket } from '@whiskeysockets/baileys';
import { MessageContext } from '../types/index.js';
import { permissions } from '../core/permissions/index.js';
import { config, normalizePhoneNumber } from '../core/config/index.js';

export function normalizeMessage(msg: proto.IWebMessageInfo): Partial<MessageContext> {
  const chatId = msg.key.remoteJid || '';
  const senderId = msg.key.participant || msg.key.remoteJid || '';
  const isGroup = chatId.endsWith('@g.us');

  return {
    chat: chatId,
    sender: normalizePhoneNumber(senderId.replace(/:\d+$/, '')),
    isGroup
  };
}

export function extractQuotedMessage(msg: proto.IWebMessageInfo): proto.IWebMessageInfo | undefined {
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    ? {
        key: msg.message.extendedTextMessage.contextInfo.quotedMessage.key || {},
        message: msg.message.extendedTextMessage.contextInfo.quotedMessage,
        ...msg.message.extendedTextMessage.contextInfo
      } as proto.IWebMessageInfo
    : undefined;
}

export function extractMentions(msg: proto.IWebMessageInfo): string[] {
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
  return mentions.map(jid => normalizePhoneNumber(jid.replace(/@\w+\.\w+$/, '')));
}

export function extractText(msg: proto.IWebMessageInfo): string {
  return msg.message?.conversation ||
         msg.message?.extendedTextMessage?.text ||
         msg.message?.imageMessage?.caption ||
         msg.message?.videoMessage?.caption ||
         '';
}

export async function buildMessageContext(
  msg: proto.IWebMessageInfo,
  sock: WASocket
): Promise<MessageContext | null> {
  const normalized = normalizeMessage(msg);
  
  if (!normalized.chat || !normalized.sender) {
    return null;
  }

  const text = extractText(msg);
  const quoted = extractQuotedMessage(msg);
  const mentions = extractMentions(msg);

  const isOwner = permissions.isOwner(normalized.sender);
  const isSudo = await permissions.isSudo(normalized.sender);

  let isAdmin = false;
  let isBotAdmin = false;

  if (normalized.isGroup) {
    try {
      const groupMetadata = await sock.groupMetadata(normalized.chat);
      isAdmin = groupMetadata.participants.some(p => p.id === msg.key.participant && p.admin !== null);
      isBotAdmin = groupMetadata.participants.some(p => p.id === sock.user?.id && p.admin !== null);
    } catch (error) {
      console.error('[HANDLER] Failed to get group metadata', error);
    }
  }

  const prefix = config.prefix;
  let command = '';
  let args: string[] = [];

  if (text.startsWith(prefix)) {
    const trimmed = text.slice(prefix.length).trim();
    const parts = trimmed.split(/\s+/);
    command = parts[0]?.toLowerCase() || '';
    args = parts.slice(1);
  }

  return {
    sock,
    sender: normalized.sender,
    chat: normalized.chat,
    isGroup: normalized.isGroup,
    isOwner,
    isSudo,
    isAdmin,
    isBotAdmin,
    text,
    command,
    args,
    quoted,
    mentions,
    message: msg
  };
}

export function shouldProcessMessage(msg: proto.IWebMessageInfo): boolean {
  if (msg.key.fromMe) {
    return false;
  }

  if (msg.message?.protocolMessage) {
    return false;
  }

  if (msg.message?.ephemeralMessage) {
    return false;
  }

  return true;
}
