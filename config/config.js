'use strict';

require('dotenv').config();
const secrets = require('./secrets.js');

/**
 * Centralized configuration.
 * Owner identities and private service credentials are intentionally not read
 * from .env. The .env file is reserved for the session/runtime selector.
 */
const PERMANENT_OWNERS = Object.freeze([
  { name: 'Arman HTX', number: '256788028745', role: 'Main Owner / Professional Dev' },
  { name: 'Tanu Darling', number: '919864179454', role: "Owner's Owner and Wife" }
]);

const TRUSTED_OWNER_NUMBER = PERMANENT_OWNERS[0].number;
const TRUSTED_WIFE_NUMBER = PERMANENT_OWNERS[1].number;
const MAX_RECONNECT_ATTEMPTS = 10;

const mode = String(process.env.BOT_MODE || 'public').trim().toLowerCase();
const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
const phoneFromJid = (jid) => normalizePhone(String(jid || '').split('@')[0]);

const config = {
  nodeEnv: process.env.NODE_ENV || 'production',
  sessionId: String(process.env.SESSION_ID || '').trim(),

  ownerNumber: TRUSTED_OWNER_NUMBER,
  ownerName: PERMANENT_OWNERS[0].name,
  wifeNumber: TRUSTED_WIFE_NUMBER,
  wifeName: PERMANENT_OWNERS[1].name,
  permanentOwners: PERMANENT_OWNERS,

  botName: process.env.BOT_NAME || 'Tanu XAI',
  prefix: process.env.PREFIX || '.',
  mode: ['public', 'private', 'dm', 'group'].includes(mode) ? mode : 'public',
  watermark: process.env.WATERMARK || 'Made by Arman HTX',
  packname: process.env.STICKER_PACKNAME || 'Tanu XAI',
  author: process.env.STICKER_AUTHOR || 'Arman HTX',

  repositoryUrl: process.env.REPOSITORY_URL || 'https://github.com/exokiyama/Tanu-xai',
  websiteUrl: process.env.WEBSITE_URL || '',
  channelUrl: process.env.CHANNEL_URL || '',
  supportUrl: process.env.SUPPORT_URL || '',

  reportEmail: secrets.REPORT_EMAIL_TO,
  reportTime: secrets.REPORT_TIME,
  databaseUrl: secrets.DATABASE_URL,
  maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  dailyReportEnabled: secrets.DAILY_REPORT_ENABLED,

  // Private integrations are not exposed through .env.
  HAX_MEDIA_API: secrets.HAX_MEDIA_API,
  WAIFU_API_KEY: secrets.WAIFU_API_KEY,
  SMTP_HOST: secrets.SMTP_HOST,
  SMTP_PORT: secrets.SMTP_PORT,
  SMTP_SECURE: secrets.SMTP_SECURE,
  SMTP_USER: secrets.SMTP_USER,
  SMTP_PASSWORD: secrets.SMTP_PASSWORD,
  REPORT_EMAIL_TO: secrets.REPORT_EMAIL_TO,
  MENU_IMAGE_URL: secrets.MENU_IMAGE_URL
};

// Backward-compatible uppercase aliases used by legacy modules.
Object.assign(config, {
  NODE_ENV: config.nodeEnv,
  SESSION_ID: config.sessionId,
  OWNER_NUMBER: config.ownerNumber,
  OWNER_NAME: config.ownerName,
  OWNER_WIFE_NUMBER: config.wifeNumber,
  BOT_NAME: config.botName,
  PREFIX: config.prefix,
  MODE: config.mode,
  WATERMARK: config.watermark,
  STICKER_PACKNAME: config.packname,
  STICKER_AUTHOR: config.author,
  REPOSITORY_URL: config.repositoryUrl,
  WEBSITE_URL: config.websiteUrl,
  CHANNEL_URL: config.channelUrl,
  SUPPORT_URL: config.supportUrl,
  REPORT_EMAIL: config.reportEmail,
  REPORT_EMAIL_TO: config.reportEmail,
  REPORT_TIME: config.reportTime,
  DATABASE_URL: config.databaseUrl,
  MAX_RECONNECT_ATTEMPTS: config.maxReconnectAttempts,
  DAILY_REPORT_ENABLED: config.dailyReportEnabled,
  ANTI_DELETE: true,
  ANTI_VIEW_ONCE: true,
  TIMEZONE: process.env.TZ || 'Asia/Karachi'
});

function validateConfig() {
  if (!config.sessionId) throw new Error('SESSION_ID is required');
  if (!config.sessionId.startsWith('Tanu-XAI~')) {
    throw new Error('SESSION_ID must use Tanu-XAI~ format');
  }
  if (!config.databaseUrl) throw new Error('Private PostgreSQL DATABASE_URL is missing');
}

module.exports = {
  config,
  PERMANENT_OWNERS,
  phoneFromJid,
  normalizePhone,
  validateConfig
};
