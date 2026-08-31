import pino from 'pino';
import { config } from '../config/index.js';

const levelMap: Record<string, string> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error'
};

export const logger = pino({
  level: levelMap[config.logLevel] || 'info',
  formatters: {
    level: (label) => ({ level: label.toUpperCase() })
  },
  timestamp: () => `,"time":"${new Date().toISOString()}"`
});

export function createModuleLogger(module: string) {
  return {
    debug: (msg: string, data?: any) => logger.debug({ module }, msg, data),
    info: (msg: string, data?: any) => logger.info({ module }, msg, data),
    warn: (msg: string, data?: any) => logger.warn({ module }, msg, data),
    error: (msg: string, data?: any) => logger.error({ module }, msg, data)
  };
}
