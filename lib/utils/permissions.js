const { config } = require('../../config/config.js');

/**
 * Central permission system.
 *
 * Main owner is permanent and NEVER changes when a SESSION_ID is connected.
 * The WhatsApp account used by SESSION_ID is the secondary/bot owner and is
 * automatically treated as sudo. Extra sudo users are runtime-managed.
 */
let sudoUsers = new Set();
let botOwnerNumber = '';
let currentMode = config.mode;

const normalize = (value) => String(value || '').split('@')[0].replace(/\D/g, '');

function getPermanentOwner() {
  return config.ownerNumber;
}

function getBotOwner() {
  return botOwnerNumber || '';
}

function setBotOwner(jidOrNumber) {
  const normalized = normalize(jidOrNumber);
  if (/^\d{7,20}$/.test(normalized)) {
    botOwnerNumber = normalized;
  }
  return botOwnerNumber;
}

function getSudoUsers() {
  return new Set(sudoUsers);
}

function addSudoUser(phoneNumber) {
  const normalized = normalize(phoneNumber);
  if (normalized) sudoUsers.add(normalized);
}

function removeSudoUser(phoneNumber) {
  const normalized = normalize(phoneNumber);
  sudoUsers.delete(normalized);
}

function isOwner(jid) {
  return normalize(jid) === getPermanentOwner();
}

function isBotOwner(jid) {
  const phone = normalize(jid);
  return !!phone && !!botOwnerNumber && phone === botOwnerNumber;
}

function isSudo(jid) {
  const phone = normalize(jid);
  return !!phone && (isOwner(jid) || isBotOwner(jid) || sudoUsers.has(phone));
}

function getBotMode() {
  return currentMode;
}

function setBotMode(mode) {
  const normalized = String(mode || '').toLowerCase();
  if (!['public', 'private', 'dm', 'group'].includes(normalized)) {
    return false;
  }
  currentMode = normalized;
  return true;
}

async function checkPermission(senderJid, requiredLevel, context = {}) {
  const { isGroup = false, isAdmin = false } = context;
  const owner = isOwner(senderJid);
  const sudo = isSudo(senderJid);

  switch (requiredLevel) {
    case 'owner':
      return owner
        ? { allowed: true, level: 'owner', reason: 'Main owner access granted' }
        : { allowed: false, level: 'denied', reason: 'This command can only be used by the main owner' };
    case 'sudo':
      return sudo
        ? { allowed: true, level: owner ? 'owner' : 'sudo', reason: owner ? 'Main owner access granted' : 'Sudo access granted' }
        : { allowed: false, level: 'denied', reason: 'This command requires owner or sudo privileges' };
    case 'admin':
      if (sudo) return { allowed: true, level: owner ? 'owner' : 'sudo', reason: 'Elevated privileges granted' };
      if (isGroup && isAdmin) return { allowed: true, level: 'admin', reason: 'Group admin access granted' };
      return { allowed: false, level: 'denied', reason: 'This command requires group admin or elevated privileges' };
    case 'user':
    default:
      return { allowed: true, level: 'user', reason: 'User access granted' };
  }
}

async function loadSudoUsers() {}
async function saveSudoUsers() {}

module.exports = {
  getPermanentOwner,
  getBotOwner,
  getSudoUsers,
  addSudoUser,
  removeSudoUser,
  isOwner,
  isBotOwner,
  isSudo,
  checkPermission,
  loadSudoUsers,
  saveSudoUsers,
  setBotOwner,
  getBotMode,
  setBotMode
};
