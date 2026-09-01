import { cache } from '../cache/manager.js';
import { config } from '../config.js';
import type { BotSettings } from '../types.js';
const defaults: BotSettings = { name: config.botName, prefix: config.prefix, mode: config.mode, watermark: config.watermark, packname: config.packname, author: config.author, menustyle: 'premium', repositoryUrl: config.repositoryUrl, websiteUrl: config.websiteUrl, channelUrl: config.channelUrl, supportUrl: config.supportUrl, reportEmail: config.reportEmail, reportTime: config.reportTime };
export const getSettings = (): BotSettings => (cache.get('bot-settings') as BotSettings | undefined) ?? defaults;
export const updateSettings = (patch: Partial<BotSettings>) => { const next = { ...getSettings(), ...patch }; cache.set('bot-settings', next, 86_400_000); return next; };
