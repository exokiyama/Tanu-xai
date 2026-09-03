import { getCategories, getKeyMetadata } from './config-manager.js';

/**
 * Configuration Display Utility
 * Formats configuration data for user-friendly display
 */

/**
 * Format a configuration value for display
 * @param {any} value - The value to format
 * @param {string} type - The data type
 * @returns {string} Formatted value
 */
export function formatValue(value, type) {
  if (value === null || value === undefined) {
    return 'Not set';
  }
  
  if (typeof value === 'boolean') {
    return value ? '✅ Enabled' : '❌ Disabled';
  }
  
  if (typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value.join(', ');
  }
  
  return String(value);
}

/**
 * Redact sensitive values
 * @param {any} value - The value
 * @param {boolean} isSensitive - Whether it's sensitive
 * @returns {string} Display string
 */
export function redactValue(value, isSensitive) {
  if (!isSensitive) {
    return formatValue(value, typeof value);
  }
  
  if (!value || value === '') {
    return 'Not set';
  }
  
  return '[REDACTED]';
}

/**
 * Group configuration by category
 * @param {Object} config - All configuration with metadata
 * @returns {Object} Grouped configuration
 */
export function groupByCategory(config) {
  const categories = getCategories();
  const grouped = {};
  
  // Initialize all categories
  for (const [catKey, catName] of Object.entries(categories)) {
    grouped[catKey] = {
      name: catName,
      settings: []
    };
  }
  
  // Group settings
  for (const [key, meta] of Object.entries(config)) {
    const category = meta.category || 'system';
    if (!grouped[category]) {
      grouped[category] = {
        name: category,
        settings: []
      };
    }
    
    grouped[category].settings.push({
      key,
      ...meta
    });
  }
  
  return grouped;
}

/**
 * Generate formatted text display for all settings
 * @param {Object} configWithMetadata - Config from getAllConfigWithMetadata()
 * @returns {string} Formatted text
 */
export function generateSettingsDisplay(configWithMetadata) {
  const grouped = groupByCategory(configWithMetadata);
  const categories = getCategories();
  
  let text = '╭───「 Bot Configuration 」───⊷\n';
  text += '│ 📋 Complete Settings Overview\n';
  text += '╰────────────────────────────⊷\n\n';
  
  for (const [catKey, categoryData] of Object.entries(grouped)) {
    if (categoryData.settings.length === 0) continue;
    
    const categoryName = categories[catKey] || catKey;
    text += `*━━━━━━━━━━━━━━━━━━━━━━━*\n`;
    text += `*  ${categoryName}*\n`;
    text += `*━━━━━━━━━━━━━━━━━━━━━━━*\n\n`;
    
    for (const setting of categoryData.settings) {
      const displayName = setting.key.replace(/_/g, ' ').toLowerCase();
      const valueDisplay = redactValue(setting.value, setting.sensitive);
      const statusIcon = setting.isSet ? '🔧' : '⚙️';
      const hotReloadIcon = setting.hotReload ? '⚡' : '🔄';
      
      text += `${statusIcon} *${setting.key}*\n`;
      text += `   Value: ${valueDisplay}\n`;
      if (!setting.isSet) {
        text += `   (Default: ${formatValue(setting.default, setting.type)})\n`;
      }
      if (!setting.hotReload) {
        text += `   ${hotReloadIcon} Requires restart\n`;
      }
      text += '\n';
    }
  }
  
  text += `\n*Legend:*\n`;
  text += `⚡ Hot reload (applies immediately)\n`;
  text += `🔄 Restart required\n`;
  text += `🔧 Custom value set\n`;
  text += `⚙️ Using default\n`;
  text += `[REDACTED] Sensitive data\n`;
  
  return text;
}

/**
 * Generate display for a single setting
 * @param {string} key - Configuration key
 * @param {Object} metadata - Setting metadata
 * @returns {string} Formatted text
 */
export function generateSingleSettingDisplay(key, metadata) {
  if (!metadata) {
    return `❌ Unknown setting: ${key}`;
  }
  
  const valueDisplay = redactValue(metadata.value, metadata.sensitive);
  const hotReloadInfo = metadata.hotReload 
    ? '⚡ Change applies immediately' 
    : '🔄 Requires bot restart';
  
  let text = `╭───「 ${key} 」───⊷\n`;
  text += `│ *Value:* ${valueDisplay}\n`;
  text += `│ *Type:* ${metadata.type}\n`;
  text += `│ *Category:* ${metadata.category}\n`;
  text += `│ *Status:* ${metadata.isSet ? 'Custom' : 'Default'}\n`;
  if (!metadata.isSet) {
    text += `│ *Default:* ${formatValue(metadata.default, metadata.type)}\n`;
  }
  text += `│\n`;
  text += `│ ${hotReloadInfo}\n`;
  text += `╰────────────────────⊷`;
  
  return text;
}

/**
 * Generate category display
 * @param {string} categoryKey - Category key
 * @param {Object} categoryData - Category data from groupByCategory
 * @returns {string} Formatted text
 */
export function generateCategoryDisplay(categoryKey, categoryData) {
  const categories = getCategories();
  const categoryName = categories[categoryKey] || categoryKey;
  
  let text = `╭───「 ${categoryName} 」───⊷\n`;
  text += `│ Settings in this category: ${categoryData.settings.length}\n`;
  text += '╰────────────────────────────⊷\n\n';
  
  for (const setting of categoryData.settings) {
    const valueDisplay = redactValue(setting.value, setting.sensitive);
    text += `• *${setting.key}*: ${valueDisplay}\n`;
  }
  
  return text;
}

/**
 * Generate help text for setvar command
 * @returns {string} Help text
 */
export function generateSetvarHelp() {
  const categories = getCategories();
  
  let text = '╭───「 SetVar Help 」───⊷\n';
  text += '│ Configure bot settings\n';
  text += '╰────────────────────────────⊷\n\n';
  
  text += '*Usage:*\n';
  text += '.setvar <KEY> <value> - Set a configuration value\n';
  text += '.getvar <KEY> - Get a specific setting\n';
  text += '.resetvar <KEY> - Reset to default\n';
  text += '.settings - Show all settings\n\n';
  
  text += '*Available Categories:*\n';
  for (const [key, name] of Object.entries(categories)) {
    text += `• ${name} (${key})\n`;
  }
  
  text += '\n*Examples:*\n';
  text += '.setvar PREFIX !\n';
  text += '.setvar BOT_NAME MyBot\n';
  text += '.setvar STICKER_PACKNAME MyStickers\n';
  text += '.setvar BOT_MODE private\n';
  text += '.resetvar PREFIX\n';
  
  return text;
}

export default {
  formatValue,
  redactValue,
  groupByCategory,
  generateSettingsDisplay,
  generateSingleSettingDisplay,
  generateCategoryDisplay,
  generateSetvarHelp
};
