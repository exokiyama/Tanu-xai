import { validateConfig } from './config.js';
import { logger } from './utils/logger.js';
import { connectionManager } from './connection/manager.js';
import { db } from '../db/database/client.js';
import './plugins.js';

async function main() { validateConfig(); await db.connect(); await connectionManager.start(); logger.info('BOOT', 'Tanu XAI V2 started', { mode: process.env.NODE_ENV ?? 'production' }); }
const shutdown = async (signal: string) => { logger.info('BOOT', `Received ${signal}`); await connectionManager.shutdown(); await db.disconnect(); process.exit(0); };
process.once('SIGINT', () => void shutdown('SIGINT')); process.once('SIGTERM', () => void shutdown('SIGTERM')); process.on('uncaughtException', error => logger.error('ERROR', 'Uncaught exception', { error: error.message })); process.on('unhandledRejection', error => logger.error('ERROR', 'Unhandled rejection', { error: String(error) }));
main().catch(error => { logger.error('BOOT', 'Fatal startup error', { error: error instanceof Error ? error.message : String(error) }); process.exitCode = 1; });
