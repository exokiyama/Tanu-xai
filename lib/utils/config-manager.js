import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, dirname } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_STORE_PATH = join(__dirname, '../../data/config-store.json');

/**
 * Centralized Configuration Manager
 * 
 * Configuration Hierarchy (highest to lowest priority):
 * 1. Runtime Changes (in-memory cache) - Highest priority
 * 2. Database Overrides (Neon PostgreSQL) - Phase 4
 * 3. Config File (config/config.js)
 * 4. Environment Variables (process.env)
 * 5. Default Values (hardcoded) - Lowest priority
 * 
 * Hot Reload vs Restart Required:
 * - Hot Reload: prefix, mode, watermark, botName, packname, author, language
 * - Restart Required: databaseUrl, sessionId, apiKeys, session settings
 */

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_CONFIG = {
  // Core Settings
  PREFIX: { value: '.', type: 'string', maxLength: 1, required: true, hotReload: true, category: 'core' },
  BOT_NAME: { value: 'Tanu XAI', type: 'string', maxLength: 50, required: true, hotReload: true, category: 'core' },
  WATERMARK: { value: 'Made by Arman HTX', type: 'string', maxLength: 100, hotReload: true, category: 'core' },
  LANGUAGE: { value: 'en', type: 'enum', values: ['en', 'id', 'es', 'pt', 'fr', 'de', 'hi', 'ur'], hotReload: true, category: 'core' },
  ALIVE_MSG: { value: '✅ Bot is Online!', type: 'string', maxLength: 500, hotReload: true, category: 'core' },
  
  // Sticker Settings
  STICKER_PACKNAME: { value: 'Tanu XAI', type: 'string', maxLength: 100, hotReload: true, category: 'sticker' },
  STICKER_AUTHOR: { value: 'Arman HTX', type: 'string', maxLength: 100, hotReload: true, category: 'sticker' },
  
  // Mode Settings
  BOT_MODE: { value: 'public', type: 'enum', values: ['public', 'private'], hotReload: true, category: 'mode' },
  AUTO_READ: { value: false, type: 'boolean', hotReload: true, category: 'mode' },
  AUTO_ONLINE: { value: false, type: 'boolean', hotReload: true, category: 'mode' },
  AUTO_STATUS: { value: false, type: 'boolean', hotReload: true, category: 'mode' },
  
  // Anti-Feature Settings (scope-based)
  ANTI_EDIT: { value: { enabled: false, scope: 'g' }, type: 'object', hotReload: true, category: 'anti-feature' },
  ANTI_DELETE: { value: { enabled: false, scope: 'g' }, type: 'object', hotReload: true, category: 'anti-feature' },
  ANTI_VV: { value: { enabled: false, scope: 'g' }, type: 'object', hotReload: true, category: 'anti-feature' },
  ANTI_LINK: { value: { enabled: false, whitelist: [] }, type: 'object', groupOnly: true, hotReload: true, category: 'anti-feature' },
  ANTI_SPAM: { value: { enabled: false, threshold: 10, windowMs: 5000, action: 'mute' }, type: 'object', hotReload: true, category: 'anti-feature' },
  ANTI_BOT: { value: { enabled: false, ignoreAdmins: true }, type: 'object', groupOnly: true, hotReload: true, category: 'anti-feature' },
  ANTI_BADWORD: { value: { enabled: false, words: [], action: 'warn' }, type: 'object', groupOnly: true, hotReload: true, category: 'anti-feature' },
  
  // Protection Settings
  PM_PROTECTION: { value: { enabled: false, allowContacts: true, allowGroups: true }, type: 'object', hotReload: true, category: 'protection' },
  CALL_REJECT: { value: { enabled: false, allowContacts: true }, type: 'object', hotReload: true, category: 'protection' },
  WARN_SYSTEM: { value: { enabled: true, maxWarns: 3, action: 'kick' }, type: 'object', hotReload: true, category: 'protection' },
  
  // Feature Toggles
  CHATBOT_ENABLED: { value: false, type: 'boolean', hotReload: true, category: 'features' },
  WELCOME_ENABLED: { value: false, type: 'boolean', hotReload: true, category: 'features' },
  GOODBYE_ENABLED: { value: false, type: 'boolean', hotReload: true, category: 'features' },
  
  // Sensitive Settings (Restart Required)
  DATABASE_URL: { value: './data/tanu-xai.db', type: 'string', sensitive: true, hotReload: false, category: 'system' },
  SESSION_ID: { value: '', type: 'string', sensitive: true, required: true, hotReload: false, category: 'system' },
  OPENAI_API_KEY: { value: '', type: 'string', sensitive: true, hotReload: false, category: 'ai' },
  GROQ_API_KEY: { value: '', type: 'string', sensitive: true, hotReload: false, category: 'ai' },
  GEMINI_API_KEY: { value: '', type: 'string', sensitive: true, hotReload: false, category: 'ai' },
  SMTP_PASSWORD: { value: '', type: 'string', sensitive: true, hotReload: false, category: 'system' },
  
  // URLs
  REPOSITORY_URL: { value: 'https://github.com/exokiyama/Tanu-xai', type: 'string', hotReload: true, category: 'core' },
  WEBSITE_URL: { value: '', type: 'string', hotReload: true, category: 'core' },
  CHANNEL_URL: { value: '', type: 'string', hotReload: true, category: 'core' },
  SUPPORT_URL: { value: '', type: 'string', hotReload: true, category: 'core' },
  
  // Reporting
  REPORT_EMAIL: { value: '', type: 'string', hotReload: true, category: 'system' },
  REPORT_TIME: { value: '00:00', type: 'string', pattern: '^\\d{2}:\\d{2}$', hotReload: true, category: 'system' },
  DAILY_REPORT_ENABLED: { value: false, type: 'boolean', hotReload: true, category: 'system' }
};

// Categories for grouping
const CATEGORIES = {
  core: 'Core Settings',
  sticker: 'Sticker Settings',
  mode: 'Mode Settings',
  'anti-feature': 'Anti-Feature Settings',
  protection: 'Protection Settings',
  features: 'Feature Toggles',
  system: 'System Settings',
  ai: 'AI Provider Settings'
};

// Cache for runtime changes
let runtimeCache = {};
let configCache = null;
let lastSaveTime = 0;
const SAVE_INTERVAL_MS = 5000; // Batch saves every 5 seconds

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateValue(key, value) {
  const setting = DEFAULT_CONFIG[key];
  if (!setting) {
    return { valid: false, error: `Unknown configuration key: ${key}` };
  }
  
  // Type validation
  if (setting.type === 'string') {
    if (typeof value !== 'string') {
      return { valid: false, error: `${key} must be a string` };
    }
    if (setting.maxLength && value.length > setting.maxLength) {
      return { valid: false, error: `${key} exceeds maximum length of ${setting.maxLength}` };
    }
    if (setting.pattern && !new RegExp(setting.pattern).test(value)) {
      return { valid: false, error: `${key} does not match required pattern` };
    }
  } else if (setting.type === 'number') {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: `${key} must be a number` };
    }
  } else if (setting.type === 'boolean') {
    if (typeof value !== 'boolean') {
      return { valid: false, error: `${key} must be a boolean` };
    }
  } else if (setting.type === 'enum') {
    if (!setting.values.includes(value)) {
      return { valid: false, error: `${key} must be one of: ${setting.values.join(', ')}` };
    }
  } else if (setting.type === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { valid: false, error: `${key} must be an object` };
    }
  }
  
  // Required check
  if (setting.required && (value === undefined || value === null || value === '')) {
    return { valid: false, error: `${key} is required` };
  }
  
  return { valid: true };
}

// ============================================================================
// FILE OPERATIONS
// ============================================================================

async function loadConfigFromFile() {
  try {
    if (!existsSync(CONFIG_STORE_PATH)) {
      const configDir = dirname(CONFIG_STORE_PATH);
      if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
      }
      // Initialize with defaults
      const initialConfig = {};
      for (const [key, setting] of Object.entries(DEFAULT_CONFIG)) {
        initialConfig[key] = setting.value;
      }
      await saveConfigToFile(initialConfig);
      return initialConfig;
    }
    
    const data = await readFile(CONFIG_STORE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('[ConfigManager] Failed to load config file:', error.message);
    // Return defaults on error
    const defaultConfig = {};
    for (const [key, setting] of Object.entries(DEFAULT_CONFIG)) {
      defaultConfig[key] = setting.value;
    }
    return defaultConfig;
  }
}

async function saveConfigToFile(config) {
  try {
    const configDir = dirname(CONFIG_STORE_PATH);
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }
    
    await writeFile(CONFIG_STORE_PATH, JSON.stringify(config, null, 2), 'utf8');
    lastSaveTime = Date.now();
    return true;
  } catch (error) {
    console.error('[ConfigManager] Failed to save config file:', error.message);
    return false;
  }
}

async function ensureConfigLoaded() {
  if (configCache === null) {
    configCache = await loadConfigFromFile();
  }
  return configCache;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get current value for a configuration key
 * Priority: runtime cache > file store > default
 * @param {string} key - Configuration key
 * @returns {Promise<any>} Current value or default
 */
export async function getConfig(key) {
  await ensureConfigLoaded();
  
  // Check runtime cache first (highest priority)
  if (key in runtimeCache) {
    return runtimeCache[key];
  }
  
  // Check file store
  if (key in configCache) {
    return configCache[key];
  }
  
  // Fall back to default
  return DEFAULT_CONFIG[key]?.value;
}

/**
 * Set a configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Value to set
 * @param {Object} options - Options
 * @param {boolean} options.persist - Whether to persist to file (default: true)
 * @param {boolean} options.validate - Whether to validate (default: true)
 * @returns {Promise<{success: boolean, error?: string, requiresRestart?: boolean}>}
 */
export async function setConfig(key, value, options = {}) {
  const { persist = true, validate = true } = options;
  
  if (validate) {
    const validation = validateValue(key, value);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
  }
  
  // Set in runtime cache (immediate effect)
  runtimeCache[key] = value;
  
  // Update file cache
  await ensureConfigLoaded();
  configCache[key] = value;
  
  // Schedule batch save
  if (persist) {
    const now = Date.now();
    if (now - lastSaveTime > SAVE_INTERVAL_MS) {
      await saveConfigToFile(configCache);
    } else {
      // Schedule save
      setTimeout(() => saveConfigToFile(configCache), SAVE_INTERVAL_MS - (now - lastSaveTime));
    }
  }
  
  const requiresRestart = !DEFAULT_CONFIG[key]?.hotReload;
  
  return { 
    success: true, 
    requiresRestart,
    message: requiresRestart ? 'This change requires a bot restart to take effect.' : 'Change applied immediately.'
  };
}

/**
 * Get all configuration values (with sensitive data redacted)
 * @returns {Promise<Object>} All config values
 */
export async function getAllConfig() {
  await ensureConfigLoaded();
  
  const result = {};
  for (const [key, setting] of Object.entries(DEFAULT_CONFIG)) {
    let value = key in runtimeCache ? runtimeCache[key] : (key in configCache ? configCache[key] : setting.value);
    
    // Redact sensitive values
    if (setting.sensitive && value && value !== '') {
      value = '[REDACTED]';
    }
    
    result[key] = value;
  }
  
  return result;
}

/**
 * Get all config with metadata (for display purposes)
 * @returns {Promise<Object>} Config with metadata
 */
export async function getAllConfigWithMetadata() {
  await ensureConfigLoaded();
  
  const result = {};
  for (const [key, setting] of Object.entries(DEFAULT_CONFIG)) {
    let value = key in runtimeCache ? runtimeCache[key] : (key in configCache ? configCache[key] : setting.value);
    const isSet = key in runtimeCache || key in configCache;
    
    result[key] = {
      value: setting.sensitive && value && value !== '' ? '[REDACTED]' : value,
      type: setting.type,
      category: setting.category,
      hotReload: setting.hotReload,
      sensitive: setting.sensitive || false,
      isSet,
      default: setting.value
    };
  }
  
  return result;
}

/**
 * Reset a configuration key to its default value
 * @param {string} key - Configuration key
 * @returns {Promise<{success: boolean, value?: any, error?: string}>}
 */
export async function resetConfig(key) {
  if (!DEFAULT_CONFIG[key]) {
    return { success: false, error: `Unknown configuration key: ${key}` };
  }
  
  // Remove from runtime cache and file cache
  delete runtimeCache[key];
  
  await ensureConfigLoaded();
  delete configCache[key];
  
  await saveConfigToFile(configCache);
  
  return { 
    success: true, 
    value: DEFAULT_CONFIG[key].value,
    message: `Reset ${key} to default value`
  };
}

/**
 * Reset all configuration to defaults
 * @returns {Promise<{success: boolean}>}
 */
export async function resetAllConfig() {
  runtimeCache = {};
  configCache = {};
  
  await saveConfigToFile({});
  
  return { success: true, message: 'All configuration reset to defaults' };
}

/**
 * Get configuration by category
 * @param {string} category - Category name
 * @returns {Promise<Object>} Config values for category
 */
export async function getConfigByCategory(category) {
  await ensureConfigLoaded();
  
  const result = {};
  for (const [key, setting] of Object.entries(DEFAULT_CONFIG)) {
    if (setting.category === category) {
      let value = key in runtimeCache ? runtimeCache[key] : (key in configCache ? configCache[key] : setting.value);
      
      if (setting.sensitive && value && value !== '') {
        value = '[REDACTED]';
      }
      
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Get all available categories
 * @returns {Object} Category names and descriptions
 */
export function getCategories() {
  return CATEGORIES;
}

/**
 * Check if a key exists
 * @param {string} key - Configuration key
 * @returns {boolean}
 */
export function hasKey(key) {
  return key in DEFAULT_CONFIG;
}

/**
 * Get metadata for a specific key
 * @param {string} key - Configuration key
 * @returns {Object|null} Metadata or null if not found
 */
export function getKeyMetadata(key) {
  return DEFAULT_CONFIG[key] || null;
}

/**
 * Force save config immediately (for testing)
 */
export async function forceSave() {
  await ensureConfigLoaded();
  return await saveConfigToFile(configCache);
}

/**
 * Clear runtime cache (for testing)
 */
export function clearRuntimeCache() {
  runtimeCache = {};
}

/**
 * Reload config from file (for testing)
 */
export async function reloadFromFile() {
  configCache = null;
  await ensureConfigLoaded();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getConfig,
  setConfig,
  getAllConfig,
  getAllConfigWithMetadata,
  resetConfig,
  resetAllConfig,
  getConfigByCategory,
  getCategories,
  hasKey,
  getKeyMetadata,
  forceSave,
  clearRuntimeCache,
  reloadFromFile,
  DEFAULT_CONFIG,
  CATEGORIES
};
