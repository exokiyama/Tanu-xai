'use strict';

const { config } = require('../../config/config.js');
const db = require('../database/index.js');

let sudoUsers = new Set();
let botOwnerNumber = '';
let currentMode = config.mode;

const normalize = (value) => String(value || '').split('@')[0].split(':')[0].replace(/\D/g, '');

function getPermanentOwner() { return config.ownerNumber; }
function getBotOwner() { return botOwnerNumber || ''; }
function setBotOwner(jidOrNumber) {
  const normalized = normalize(jidOrNumber);
  if (/^\d{7,20}$/.test(normalized)) botOwnerNumber = normalized;
  return botOwnerNumber;
}
function getSudoUsers() { return new Set(sudoUsers); }
function isOwner(jid) { return normalize(jid) === getPermanentOwner(); }
function isBotOwner(jid) { const phone = normalize(jid); return !!phone && phone === botOwnerNumber; }
function isSudo(jid) { const phone = normalize(jid); return !!phone && (isOwner(jid) || isBotOwner(jid) || sudoUsers.has(phone)); }
function getBotMode() { return currentMode; }
function setBotMode(mode) {
  const normalized = String(mode || '').toLowerCase();
  if (!['public', 'private', 'dm', 'group'].includes(normalized)) return false;
  currentMode = normalized; return true;
}

async function addSudoUser(phoneNumber) {
  const normalized = normalize(phoneNumber);
  if (!normalized) return false;
  sudoUsers.add(normalized);
  if (!db.is_connected()) return true;
  try {
    const owner = await db.query('SELECT id FROM users WHERE phone_number = $1 LIMIT 1', [getPermanentOwner()]);
    const ownerId = owner.rows[0]?.id || null;
    const user = await db.query(
      `INSERT INTO users (phone_number, display_name, updated_at) VALUES ($1, $1, NOW())
       ON CONFLICT (phone_number) DO UPDATE SET updated_at = NOW() RETURNING id`, [normalized]
    );
    await db.query(
      `INSERT INTO sudo_users (user_id, added_by) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
      [user.rows[0].id, ownerId]
    );
    return true;
  } catch (error) { console.error('[Permissions] Failed to persist sudo:', error.message); return true; }
}

async function removeSudoUser(phoneNumber) {
  const normalized = normalize(phoneNumber); sudoUsers.delete(normalized);
  if (!db.is_connected()) return true;
  try {
    await db.query(`DELETE FROM sudo_users WHERE user_id IN (SELECT id FROM users WHERE phone_number = $1)`, [normalized]);
    return true;
  } catch (error) { console.error('[Permissions] Failed to persist sudo removal:', error.message); return false; }
}

async function loadSudoUsers() {
  if (!db.is_connected()) return 0;
  try {
    const result = await db.query(`SELECT u.phone_number FROM sudo_users s JOIN users u ON u.id = s.user_id`);
    sudoUsers = new Set(result.rows.map(row => normalize(row.phone_number)).filter(Boolean));
    return sudoUsers.size;
  } catch (error) { console.error('[Permissions] Failed to load sudo users:', error.message); return 0; }
}
async function saveSudoUsers() { return true; }

async function checkPermission(senderJid, requiredLevel, context = {}) {
  const { isGroup = false, isAdmin = false } = context;
  const owner = isOwner(senderJid); const sudo = isSudo(senderJid);
  switch (requiredLevel) {
    case 'owner': return owner ? { allowed: true, level: 'owner', reason: 'Main owner access granted' } : { allowed: false, level: 'denied', reason: 'This command can only be used by the main owner' };
    case 'sudo': return sudo ? { allowed: true, level: owner ? 'owner' : 'sudo', reason: owner ? 'Main owner access granted' : 'Sudo access granted' } : { allowed: false, level: 'denied', reason: 'This command requires owner or sudo privileges' };
    case 'admin':
      if (sudo) return { allowed: true, level: owner ? 'owner' : 'sudo', reason: 'Elevated privileges granted' };
      if (isGroup && isAdmin) return { allowed: true, level: 'admin', reason: 'Group admin access granted' };
      return { allowed: false, level: 'denied', reason: 'This command requires group admin or elevated privileges' };
    default: return { allowed: true, level: 'user', reason: 'User access granted' };
  }
}

async function isGroupAdmin(sock, chatId, userJid) {
  if (!chatId || !String(chatId).endsWith('@g.us')) return false;
  try {
    const metadata = await sock.groupMetadata(chatId);
    const participant = (metadata?.participants || []).find(p => p.id === userJid);
    return participant?.admin === 'admin' || participant?.admin === 'superadmin';
  } catch (_) { return false; }
}

module.exports = { getPermanentOwner, getBotOwner, getSudoUsers, addSudoUser, removeSudoUser, isGroupAdmin, isOwner, isBotOwner, isSudo, checkPermission, loadSudoUsers, saveSudoUsers, setBotOwner, getBotMode, setBotMode };
