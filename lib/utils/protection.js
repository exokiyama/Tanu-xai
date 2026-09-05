const { readFile, writeFile } = require('fs/promises');
const { existsSync } = require('fs');
const { join, dirname } = require('path');

const __dirname = __dirname;
const PROTECTION_CONFIG_PATH = join(__dirname, '../../data/protection-config.json');

/**
 * Protection configuration manager
 * Handles reading/writing protection settings with persistence
 */

// Default configuration
const DEFAULT_CONFIG = {
  antidelete: { enabled: false, scope: 'g' }, // g=same chat, p=bot/sudo/pm
  antivv: { enabled: false, scope: 'g' },
  antiedit: { enabled: false, scope: 'g' },
  antilink: { enabled: false, groupOnly: true, whitelist: [] },
  antibadword: { enabled: false, groupOnly: true, words: [], action: 'warn' },
  antibot: { enabled: false, groupOnly: true, ignoreAdmins: true },
  antispam: { enabled: false, threshold: 10, windowMs: 5000, action: 'mute' },
  pmProtection: { enabled: false, allowContacts: true, allowGroups: true },
  callReject: { enabled: false, allowContacts: true },
  warnSystem: { enabled: true, maxWarns: 3, action: 'kick' }
};

let configCache = null;

/**
 * Load protection configuration from file
 */
async function loadProtectionConfig() {
  try {
    if (configCache) {
      return configCache;
    }

    if (!existsSync(PROTECTION_CONFIG_PATH)) {
      configCache = { ...DEFAULT_CONFIG };
      await saveProtectionConfig(configCache);
      return configCache;
    }

    const data = await readFile(PROTECTION_CONFIG_PATH, 'utf8');
    configCache = { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    return configCache;
  } catch (error) {
    console.error('[ProtectionConfig] Failed to load config:', error.message);
    configCache = { ...DEFAULT_CONFIG };
    return configCache;
  }
}

/**
 * Save protection configuration to file
 */
async function saveProtectionConfig(config) {
  try {
    const { mkdir } = await import('fs/promises');
    const configDir = dirname(PROTECTION_CONFIG_PATH);
    
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }

    configCache = config;
    await writeFile(PROTECTION_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[ProtectionConfig] Failed to save config:', error.message);
    return false;
  }
}

/**
 * Get a specific protection setting
 */
async function getProtection(key) {
  const config = await loadProtectionConfig();
  return config[key] || DEFAULT_CONFIG[key];
}

/**
 * Update a specific protection setting
 */
async function updateProtection(key, value) {
  const config = await loadProtectionConfig();
  config[key] = { ...DEFAULT_CONFIG[key], ...value };
  await saveProtectionConfig(config);
  return config[key];
}

/**
 * Check if a protection is enabled for a given context
 */
async function isProtectionEnabled(key, context = {}) {
  const { isGroup, isBotAdmin, senderJid, chatId } = context;
  const setting = await getProtection(key);
  
  if (!setting?.enabled) {
    return false;
  }

  // Check group-only restrictions
  if (setting.groupOnly && !isGroup) {
    return false;
  }

  // Check bot admin requirement
  if (setting.groupOnly && setting.requireBotAdmin && !isBotAdmin) {
    return false;
  }

  // Check scope for anti-delete/antivv/antiedit
  if (setting.scope) {
    const scope = setting.scope.toLowerCase();
    
    if (scope === 'off') {
      return false;
    }
    
    if (scope.includes('g') && isGroup) {
      return true;
    }
    
    if (scope.includes('p')) {
      // Check if sender is owner/sudo or in PM
      const { isOwner, isSudo } = context;
      if (isOwner || isSudo || !isGroup) {
        return true;
      }
    }
    
    if (scope.includes('pm') && !isGroup) {
      return true;
    }
    
    if (scope.includes('gm') && isGroup) {
      return true;
    }
    
    if (scope.includes('no-pm') && isGroup) {
      return true;
    }
    
    if (scope.includes('no-gm') && !isGroup) {
      return true;
    }
    
    // Check for specific JID targeting
    if (scope.includes('@')) {
      const targetJids = scope.split(',').map(s => s.trim()).filter(s => s.includes('@'));
      if (targetJids.includes(chatId) || targetJids.includes(senderJid)) {
        return true;
      }
    }
    
    return false;
  }

  return true;
}

/**
 * Parse protection scope string into structured format
 */
function parseProtectionScope(scopeStr) {
  if (!scopeStr) return { type: 'default', values: [] };
  
  const scope = scopeStr.toLowerCase().trim();
  
  if (scope === 'off') {
    return { type: 'disabled', values: [] };
  }
  
  if (scope === 'on' || scope === 'all') {
    return { type: 'all', values: ['g', 'p'] };
  }
  
  const values = [];
  const types = [];
  
  if (scope.includes('g')) types.push('group');
  if (scope.includes('p')) types.push('private');
  if (scope.includes('pm')) types.push('pm-only');
  if (scope.includes('gm')) types.push('group-only');
  if (scope.includes('no-pm')) types.push('exclude-pm');
  if (scope.includes('no-gm')) types.push('exclude-group');
  
  // Extract JIDs
  const jidRegex = /([0-9]{5,16}@[sg]\.whatsapp\.net)/g;
  const jids = scope.match(jidRegex) || [];
  if (jids.length > 0) {
    values.push(...jids);
    types.push('jid-targeted');
  }
  
  return {
    type: types.join('-') || 'custom',
    values: [...new Set(values)]
  };
}

/**
 * Reset a protection to default settings
 */
async function resetProtection(key) {
  const config = await loadProtectionConfig();
  config[key] = { ...DEFAULT_CONFIG[key] };
  await saveProtectionConfig(config);
  return config[key];
}

/**
 * Get all protection settings
 */
async function getAllProtections() {
  return await loadProtectionConfig();
}

// Module exports will be added by the conversion script
