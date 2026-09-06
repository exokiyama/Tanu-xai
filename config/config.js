require('dotenv').config();

/**
 * Centralized configuration loader
 * Uses process.env directly - owner numbers must NOT be in .env
 */

// Permanent owner identities. These NEVER change when a new SESSION_ID is connected.
// The first entry is the main owner shown by `.owner`.
const PERMANENT_OWNERS = Object.freeze([
  { name: 'Arman HTX', number: '256788028745', role: 'Main Owner / Professional Dev' },
  { name: 'Tanu Darling', number: '919864179454', role: "Owner's Owner and Wife" }
]);

const TRUSTED_OWNER_NUMBER = PERMANENT_OWNERS[0].number;
const TRUSTED_WIFE_NUMBER = PERMANENT_OWNERS[1].number;
const MAX_RECONNECT_ATTEMPTS = 10;

const normalizePhoneFunc = (value) => {
  if (!value) return TRUSTED_OWNER_NUMBER;
  const cleaned = value.replace(/\D/g, '');
  return /^\d{7,20}$/.test(cleaned) ? cleaned : TRUSTED_OWNER_NUMBER;
};

const config = Object.freeze({
  // Environment
  nodeEnv: process.env.NODE_ENV ?? 'production',
  sessionId: process.env.SESSION_ID ?? '',

  // Owner/Wife numbers (hardcoded, not from .env)
  ownerNumber: TRUSTED_OWNER_NUMBER,
  ownerName: PERMANENT_OWNERS[0].name,
  wifeNumber: TRUSTED_WIFE_NUMBER,
  wifeName: PERMANENT_OWNERS[1].name,

  // Bot identity
  botName: process.env.BOT_NAME ?? 'Tanu XAI',
  prefix: process.env.PREFIX ?? '.',
  mode: ['public', 'private', 'dm', 'group'].includes(String(process.env.BOT_MODE || '').toLowerCase())
    ? String(process.env.BOT_MODE).toLowerCase()
    : 'public',
  watermark: process.env.WATERMARK ?? 'Made by Arman HTX',
  packname: process.env.STICKER_PACKNAME ?? 'Tanu XAI',
  author: process.env.STICKER_AUTHOR ?? 'Arman HTX',

  // URLs
  repositoryUrl: process.env.REPOSITORY_URL ?? 'https://github.com/exokiyama/Tanu-xai',
  websiteUrl: process.env.WEBSITE_URL ?? '',
  channelUrl: process.env.CHANNEL_URL ?? '',
  supportUrl: process.env.SUPPORT_URL ?? '',

  // Reporting
  reportEmail: process.env.REPORT_EMAIL_TO ?? process.env.REPORT_EMAIL ?? '',
  reportTime: process.env.REPORT_TIME ?? '00:00',

  // Database
  databaseUrl: process.env.DATABASE_URL?.trim() || './data/tanu-xai.db',

  // Connection
  maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,

  // Daily report
  dailyReportEnabled: process.env.DAILY_REPORT_ENABLED === 'true'
});

const phoneFromJid = (jid) => jid.split('@')[0].replace(/\D/g, '');

const normalizePhone = (value) => normalizePhoneFunc(value);

function validateConfig() {
  if (!config.sessionId) {
    throw new Error('SESSION_ID is required');
  }
  if (!config.sessionId.startsWith('Tanu-XAI~')) {
    throw new Error('SESSION_ID must use Tanu-XAI~ format');
  }
}

module.exports = {
  config,
  phoneFromJid,
  normalizePhone,
  validateConfig
};
