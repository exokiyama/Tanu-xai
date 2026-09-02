import { validateConfig, config } from './config.js';
import { logger } from './utils/logger.js';
import { connectionManager } from './connection/manager.js';
import { db } from '../db/database/client.js';
import { DailyReportScheduler } from '../db/dailyreport/scheduler.js';
import { generateReport } from '../db/dailyreport/report.js';
import { deliverReport } from '../db/dailyreport/runtime.js';
import './plugins.js';
const reportScheduler = new DailyReportScheduler({ enabled: config.dailyReportEnabled, time: config.reportTime, generate: generateReport, send: deliverReport, onError: error => logger.error('REPORT', 'Scheduled report failed', { error: error instanceof Error ? error.message : String(error) }) });
async function main() { validateConfig(); const dbReady = await db.connect(); reportScheduler.start(); await connectionManager.start(); logger.info('BOOT', 'Tanu XAI started', { mode: config.mode, database: dbReady ? db.api.name : 'none', dailyReport: config.dailyReportEnabled }); }
const shutdown = async (signal: string) => { logger.info('BOOT', `Received ${signal}`); reportScheduler.stop(); await connectionManager.shutdown(); await db.disconnect(); process.exit(0); };
process.once('SIGINT', () => void shutdown('SIGINT')); process.once('SIGTERM', () => void shutdown('SIGTERM')); process.on('uncaughtException', error => logger.error('ERROR', 'Uncaught exception', { error: error.message })); process.on('unhandledRejection', error => logger.error('ERROR', 'Unhandled rejection', { error: String(error) }));
main().catch(error => { logger.error('BOOT', 'Fatal startup error', { error: error instanceof Error ? error.message : String(error) }); process.exitCode = 1; });
