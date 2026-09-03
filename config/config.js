import 'dotenv/config';

/**
 * Centralized configuration loader
 * Uses process.env directly - owner numbers must NOT be in .env
 */

// Permanent owner numbers (hardcoded, never from .env)
const PERMANENT_OWNERS = [
  { number: '917023968416', role: 'owner' },
  { number: '917023968416', role: 'wife' }
];

const TRUSTED_OWNER_NUMBER = PERMANENT_OWNERS[0].number;
const TRUSTED_WIFE_NUMBER = PERMANENT_OWNERS[1].number;
const MAX_RECONNECT_ATTEMPTS = 10;

const normalizePhone = (value) => {
  if (!value) return TRUSTED_OWNER_NUMBER;
  const cleaned = value.replace(/\D/g, '');
  return /^\d{7,20}$/.test(cleaned) ? cleaned : TRUSTED_OWNER_NUMBER;
};

export const config = Object.freeze({
  // Environment
  nodeEnv: process.env.NODE_ENV ?? 'production',
  sessionId: process.env.SESSION_ID ?? '',
  
  // Owner/Wife numbers (hardcoded, not from .env)
  ownerNumber: TRUSTED_OWNER_NUMBER,
  wifeNumber: TRUSTED_WIFE_NUMBER,
  
  // Bot identity
  botName: process.env.BOT_NAME ?? 'Tanu XAI',
  prefix: process.env.PREFIX ?? '.',
  mode: process.env.BOT_MODE === 'private' ? 'private' : 'public',
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

export const phoneFromJid = (jid) => jid.split('@')[0].replace(/\D/g, '');

export const normalizePhone = (value) => normalizePhone(value);

export function validateConfig() {
  if (!config.sessionId) {
    throw new Error('SESSION_ID is required');
  }
  if (!config.sessionId.startsWith('Tanu-XAI~')) {
    throw new Error('SESSION_ID must use Tanu-XAI~ format');
  }
}
