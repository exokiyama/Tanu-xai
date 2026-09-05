const { config } = require('../../config/config.js');
/**
 * Centralized Permission System
 * 
 * This module provides a single, secure permission checking function
 * that all owner/sudo commands MUST use.
 * 
 * Permission Levels (highest to lowest):
 * - 'owner': Permanent owner only (hardcoded in config)
 * - 'sudo': Owner + sudo users (additional privileged users)
 * - 'admin': Group admins (for group-specific commands)
 * - 'user': Any user
 */

// Sudo users list (can be modified by owner)
let sudoUsers = new Set();

/**
 * Get the permanent owner number from config
 * @returns {string} Owner phone number
 */
function getPermanentOwner() {
  return config.ownerNumber;
}

/**
 * Get all sudo users
 * @returns {Set<string>} Set of sudo user phone numbers
 */
function getSudoUsers() {
  return new Set(sudoUsers);
}

/**
 * Add a sudo user (owner only)
 * @param {string} phoneNumber - Phone number to add as sudo
 */
function addSudoUser(phoneNumber) {
  const normalized = phoneNumber.replace(/\D/g, '');
  sudoUsers.add(normalized);
}

/**
 * Remove a sudo user (owner only)
 * @param {string} phoneNumber - Phone number to remove from sudo
 */
function removeSudoUser(phoneNumber) {
  const normalized = phoneNumber.replace(/\D/g, '');
  sudoUsers.delete(normalized);
}

/**
 * Check if a JID belongs to the permanent owner
 * @param {string} jid - WhatsApp JID
 * @returns {boolean}
 */
function isOwner(jid) {
  if (!jid) return false;
  const phoneNumber = jid.split('@')[0].replace(/\D/g, '');
  return phoneNumber === getPermanentOwner();
}

/**
 * Check if a JID belongs to a sudo user
 * @param {string} jid - WhatsApp JID
 * @returns {boolean}
 */
function isSudo(jid) {
  if (!jid) return false;
  const phoneNumber = jid.split('@')[0].replace(/\D/g, '');
  return isOwner(jid) || sudoUsers.has(phoneNumber);
}

/**
 * Check permission for a command
 * 
 * @param {string} senderJid - The JID of the message sender
 * @param {string} requiredLevel - Required permission level: 'owner' | 'sudo' | 'admin' | 'user'
 * @param {object} context - Additional context (isGroup, isAdmin, etc.)
 * @returns {{ allowed: boolean, level: string, reason: string }}
 */
async function checkPermission(senderJid, requiredLevel, context = {}) {
  const { isGroup = false, isAdmin = false } = context;
  
  // Normalize the sender JID to phone number
  const senderPhone = senderJid ? senderJid.split('@')[0].replace(/\D/g, '') : '';
  
  // Check owner permission
  const isOwnerUser = senderPhone === getPermanentOwner();
  const isSudoUser = isOwnerUser || sudoUsers.has(senderPhone);
  
  switch (requiredLevel) {
    case 'owner':
      if (isOwnerUser) {
        return { allowed: true, level: 'owner', reason: 'Permanent owner access granted' };
      }
      return { 
        allowed: false, 
        level: 'denied', 
        reason: 'This command can only be used by the permanent owner' 
      };
      
    case 'sudo':
      if (isSudoUser) {
        return { 
          allowed: true, 
          level: isOwnerUser ? 'owner' : 'sudo', 
          reason: isOwnerUser ? 'Permanent owner access granted' : 'Sudo access granted' 
        };
      }
      return { 
        allowed: false, 
        level: 'denied', 
        reason: 'This command requires sudo or owner privileges' 
      };
      
    case 'admin':
      if (isGroup && isAdmin) {
        return { allowed: true, level: 'admin', reason: 'Group admin access granted' };
      }
      if (isOwnerUser || isSudoUser) {
        return { 
          allowed: true, 
          level: isOwnerUser ? 'owner' : 'sudo', 
          reason: 'Elevated privileges override admin requirement' 
        };
      }
      return { 
        allowed: false, 
        level: 'denied', 
        reason: 'This command requires group admin or elevated privileges' 
      };
      
    case 'user':
    default:
      return { allowed: true, level: 'user', reason: 'User access granted' };
  }
}

/**
 * Load sudo users from persistent storage
 * In production, this would load from database
 */
async function loadSudoUsers() {
  // For now, sudo users are managed in-memory
  // In Phase 4 (Database), this will load from database
  console.log('[Permissions] Sudo users loaded');
}

/**
 * Save sudo users to persistent storage
 */
async function saveSudoUsers() {
  // For now, sudo users are managed in-memory
  // In Phase 4 (Database), this will save to database
  console.log('[Permissions] Sudo users saved');
}

// Module exports will be added by the conversion script
