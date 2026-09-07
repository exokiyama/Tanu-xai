'use strict';

const chats = new Map();

function rememberChat(jid, meta = {}) {
  if (!jid) return;
  const current = chats.get(jid) || {};
  chats.set(jid, { ...current, ...meta, jid, lastSeen: Date.now() });
}
function listChats() { return Array.from(chats.values()).sort((a,b) => b.lastSeen - a.lastSeen); }
function clearChats() { chats.clear(); }
module.exports = { rememberChat, listChats, clearChats };
