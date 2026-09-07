const pino = require('pino');

/**
 * Simple logger using pino
 */
let logger;
try {
  logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname'
      }
    }
  });
} catch (e) {
  logger = null;
}

// Fallback if pino-pretty is not available
const fallbackLogger = {
  info: (module, message, data) => {
    console.log(`[INFO] ${new Date().toISOString()} [${module}] ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (module, message, data) => {
    console.warn(`[WARN] ${new Date().toISOString()} [${module}] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (module, message, data) => {
    console.error(`[ERROR] ${new Date().toISOString()} [${module}] ${message}`, data ? JSON.stringify(data) : '');
  },
  debug: (module, message, data) => {
    console.debug(`[DEBUG] ${new Date().toISOString()} [${module}] ${message}`, data ? JSON.stringify(data) : '');
  }
};

// Wrap logger to use module-based logging
const log = {
  info: (module, message, data) => {
    try {
      if (logger) {
        logger.info({ module }, message, data);
      } else {
        fallbackLogger.info(module, message, data);
      }
    } catch {
      fallbackLogger.info(module, message, data);
    }
  },
  warn: (module, message, data) => {
    try {
      if (logger) {
        logger.warn({ module }, message, data);
      } else {
        fallbackLogger.warn(module, message, data);
      }
    } catch {
      fallbackLogger.warn(module, message, data);
    }
  },
  error: (module, message, data) => {
    try {
      if (logger) {
        logger.error({ module }, message, data);
      } else {
        fallbackLogger.error(module, message, data);
      }
    } catch {
      fallbackLogger.error(module, message, data);
    }
  },
  debug: (module, message, data) => {
    try {
      if (logger) {
        logger.debug({ module }, message, data);
      } else {
        fallbackLogger.debug(module, message, data);
      }
    } catch {
      fallbackLogger.debug(module, message, data);
    }
  }
};

module.exports = { log };
module.exports.default = log;
