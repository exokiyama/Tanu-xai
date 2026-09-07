'use strict';

const { config } = require('../../config/config.js');

const runtime = new Map();

const META = {
  PREFIX: ['core', 'Command prefix', '.', 'string', true, false],
  BOT_NAME: ['core', 'Bot display name', 'Tanu XAI', 'string', true, false],
  BOT_MODE: ['core', 'Bot mode', 'public', 'enum', true, false, ['public', 'private', 'dm', 'group']],
  WATERMARK: ['core', 'Media watermark', 'Made by Arman HTX', 'string', true, false],
  STICKER_PACKNAME: ['sticker', 'Sticker pack name/author', 'Tanu XAI', 'string', true, false],
  STICKER_AUTHOR: ['sticker', 'Sticker author', 'Arman HTX', 'string', true, false],
  LANGUAGE: ['core', 'Default language', 'english', 'string', true, false],
  AUTO_READ: ['automation', 'Automatically read messages', false, 'boolean', true, false],
  AUTO_ONLINE: ['automation', 'Always online', false, 'boolean', true, false],
  AUTO_STATUS: ['automation', 'Automatically view status', false, 'boolean', true, false],
  CMD_REACTION: ['reactions', 'React to commands', true, 'boolean', true, false],
  ANTI_DELETE: ['protection', 'Anti-delete scope', 'off', 'string', true, false],
  ANTI_EDIT: ['protection', 'Anti-edit scope', 'off', 'string', true, false],
  ANTI_VV: ['protection', 'Anti-view-once scope', 'off', 'string', true, false],
  ANTI_LINK: ['protection', 'Anti-link', false, 'boolean', true, false],
  ANTI_SPAM: ['protection', 'Anti-spam', false, 'boolean', true, false],
  PM_PROTECTION: ['protection', 'PM protection', false, 'boolean', true, false],
  REPORT_TIME: ['report', 'Daily report cron', '0 0 * * *', 'string', true, false],
  DAILY_REPORT_ENABLED: ['report', 'Automatic daily report', true, 'boolean', false, false],
  TIMEZONE: ['report', 'Report timezone', 'Asia/Karachi', 'string', true, false]
};

function currentValue(key) {
  if (runtime.has(key)) return runtime.get(key);
  const lower = {
    PREFIX: 'prefix', BOT_NAME: 'botName', BOT_MODE: 'mode', WATERMARK: 'watermark',
    STICKER_PACKNAME: 'packname', STICKER_AUTHOR: 'author', LANGUAGE: 'language',
    REPORT_TIME: 'reportTime', DAILY_REPORT_ENABLED: 'dailyReportEnabled', TIMEZONE: 'TIMEZONE'
  }[key];
  if (lower && Object.prototype.hasOwnProperty.call(config, lower)) return config[lower];
  if (key === 'ANTI_DELETE') return config.ANTI_DELETE;
  if (key === 'ANTI_EDIT') return config.ANTI_EDIT;
  if (key === 'ANTI_VV') return config.ANTI_VIEW_ONCE;
  return config[key];
}

function normalizeKey(key) { return String(key || '').trim().toUpperCase(); }

function hasKey(key) { return Boolean(META[normalizeKey(key)]); }

function getKeyMetadata(key) {
  const k = normalizeKey(key);
  if (!META[k]) return null;
  const [category, description, defaultValue, type, hotReload, sensitive, values] = META[k];
  return { key: k, category, description, default: defaultValue, type, hotReload, sensitive: Boolean(sensitive), values: values || [] };
}

async function getConfig(key) {
  const k = normalizeKey(key);
  return currentValue(k);
}

async function setConfig(key, value) {
  const k = normalizeKey(key);
  if (!hasKey(k)) return { success: false, error: `Unknown configuration key: ${k}` };

  if (k === 'BOT_MODE') config.mode = String(value).toLowerCase();
  else if (k === 'PREFIX') config.prefix = String(value);
  else if (k === 'BOT_NAME') config.botName = String(value);
  else if (k === 'WATERMARK') config.watermark = String(value);
  else if (k === 'STICKER_PACKNAME') config.packname = String(value);
  else if (k === 'STICKER_AUTHOR') config.author = String(value);
  else if (k === 'REPORT_TIME') config.reportTime = String(value);
  else runtime.set(k, value);

  config[k] = value;
  return { success: true, value, requiresRestart: false };
}

async function resetConfig(key) {
  const k = normalizeKey(key);
  const meta = getKeyMetadata(k);
  if (!meta) return { success: false, error: `Unknown configuration key: ${k}` };
  runtime.delete(k);
  if (k === 'PREFIX') config.prefix = meta.default;
  if (k === 'BOT_NAME') config.botName = meta.default;
  if (k === 'BOT_MODE') config.mode = meta.default;
  if (k === 'WATERMARK') config.watermark = meta.default;
  if (k === 'STICKER_PACKNAME') config.packname = meta.default;
  if (k === 'STICKER_AUTHOR') config.author = meta.default;
  return { success: true, value: meta.default };
}

async function getAllConfigWithMetadata() {
  const out = {};
  for (const key of Object.keys(META)) {
    const metadata = getKeyMetadata(key);
    const value = await getConfig(key);
    out[key] = { ...metadata, value, isSet: value !== metadata.default };
  }
  return out;
}

function getCategories() {
  return {
    core: '⚙️ Core', protection: '🛡️ Protection', automation: '🤖 Automation',
    reactions: '💫 Reactions', sticker: '🎨 Sticker', report: '📊 Reports'
  };
}

async function getConfigByCategory(category) {
  const c = String(category || '').toLowerCase();
  const out = {};
  for (const key of Object.keys(META)) {
    if (META[key][0] === c) out[key] = await getConfig(key);
  }
  return out;
}

module.exports = {
  loadConfig: () => config,
  getConfig,
  setConfig,
  resetConfig,
  hasKey,
  getKeyMetadata,
  getAllConfigWithMetadata,
  getCategories,
  getConfigByCategory,
  DEFAULT_CONFIG: Object.fromEntries(Object.entries(META).map(([k, v]) => [k, { value: v[2], default: v[2], category: v[0], description: v[1], type: v[3], hotReload: v[4], sensitive: Boolean(v[5]), values: v[6] || [] }]))
};
