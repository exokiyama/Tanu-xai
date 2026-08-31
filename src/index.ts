import { config, validateConfig } from './core/config/index.js';
import { connectionManager } from './core/connection/manager.js';
import { db } from './core/database/index.js';
import { pluginLoader } from './utils/plugin-loader.js';
import { createModuleLogger } from './core/logger/index.js';

const log = createModuleLogger('BOOT');

const startTime = Date.now();

async function shutdown(signal: string): Promise<void> {
  log.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    await connectionManager.gracefulShutdown();
    await db.disconnect();
    log.info('Shutdown complete');
    process.exit(0);
  } catch (error: any) {
    log.error('Error during shutdown', { error: error.message });
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception', { error: error.message, stack: error.stack });
});

process.on('unhandledRejection', (reason: any) => {
  log.error('Unhandled rejection', { reason: reason?.message || reason });
});

async function main(): Promise<void> {
  log.info(`${config.botName} starting...`);
  
  if (!validateConfig()) {
    log.error('Configuration validation failed. Exiting.');
    process.exit(1);
  }
  
  log.info('Configuration validated');
  
  const dbConnected = await db.connect();
  if (dbConnected) {
    log.info('Database connected');
  } else {
    log.warn('Running without database');
  }
  
  await pluginLoader.loadPlugins();
  
  try {
    await connectionManager.initialize();
    await connectionManager.connect();
    log.info('WhatsApp connection initialized');
  } catch (error: any) {
    log.error('Failed to initialize WhatsApp connection', { error: error.message });
    process.exit(1);
  }
  
  const uptime = ((Date.now() - startTime) / 1000).toFixed(2);
  log.info(`${config.botName} ready in ${uptime}s`);
}

main().catch((error: any) => {
  log.error('Fatal startup error', { error: error.message, stack: error.stack });
  process.exit(1);
});
