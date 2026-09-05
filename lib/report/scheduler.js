'use strict';

/**
 * Daily Report Scheduler
 *
 * PostgreSQL is used for:
 * - report configuration
 * - report history
 *
 * WhatsApp authentication is completely independent.
 */

const cron = require('node-cron');

const { config: appConfig } = require('../../config/config.js');
const db = require('../database/index.js');

const generator = require('./generator');
const mailer = require('./mailer');

let scheduledJob = null;
let initialized = false;
let reportInProgress = false;

const DEFAULT_REPORT_CONFIG = {
  scheduleTime: '0 9 * * *',
  targetEmail: '',
  retentionDays: 30,
  enabled: true
};

async function ensureTables() {
  if (!db.is_connected()) {
    return false;
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS report_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      schedule_time TEXT NOT NULL DEFAULT '0 9 * * *',
      target_email TEXT NOT NULL DEFAULT '',
      retention_days INTEGER NOT NULL DEFAULT 30,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT report_config_singleton CHECK (id = 1)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS report_history (
      id BIGSERIAL PRIMARY KEY,
      status TEXT NOT NULL,
      target_email TEXT,
      message_id TEXT,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    INSERT INTO report_config
      (id, schedule_time, target_email, retention_days, enabled)
    VALUES
      (1, $1, $2, $3, $4)
    ON CONFLICT (id) DO NOTHING
  `, [
    DEFAULT_REPORT_CONFIG.scheduleTime,
    appConfig.REPORT_EMAIL_TO || DEFAULT_REPORT_CONFIG.targetEmail,
    DEFAULT_REPORT_CONFIG.retentionDays,
    DEFAULT_REPORT_CONFIG.enabled
  ]);

  return true;
}

async function getReportConfig() {
  const defaults = {
    ...DEFAULT_REPORT_CONFIG,
    targetEmail: appConfig.REPORT_EMAIL_TO || ''
  };

  if (!db.is_connected()) {
    return {
      ...defaults,
      databaseAvailable: false
    };
  }

  try {
    await ensureTables();

    const result = await db.query(`
      SELECT
        schedule_time,
        target_email,
        retention_days,
        enabled
      FROM report_config
      WHERE id = 1
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return {
        ...defaults,
        databaseAvailable: true
      };
    }

    const row = result.rows[0];

    return {
      scheduleTime: row.schedule_time,
      targetEmail: row.target_email,
      retentionDays: Number(row.retention_days),
      enabled: Boolean(row.enabled),
      databaseAvailable: true
    };
  } catch (error) {
    console.error(
      '[ReportScheduler] Failed to load config:',
      error.message
    );

    return {
      ...defaults,
      databaseAvailable: false
    };
  }
}

async function updateReportConfig(key, value) {
  if (!db.is_connected()) {
    return {
      success: false,
      message: 'PostgreSQL is unavailable.'
    };
  }

  await ensureTables();

  const allowedKeys = {
    scheduleTime: 'schedule_time',
    targetEmail: 'target_email',
    retentionDays: 'retention_days',
    enabled: 'enabled'
  };

  const column = allowedKeys[key];

  if (!column) {
    return {
      success: false,
      message: `Invalid report configuration key: ${key}`
    };
  }

  try {
    await db.query(
      `UPDATE report_config
       SET ${column} = $1,
           updated_at = NOW()
       WHERE id = 1`,
      [value]
    );

    return {
      success: true
    };
  } catch (error) {
    console.error(
      '[ReportScheduler] Config update failed:',
      error.message
    );

    return {
      success: false,
      message: error.message
    };
  }
}

async function logReportHistory(
  status,
  email,
  errorMessage = null,
  messageId = null
) {
  if (!db.is_connected()) {
    console.log(
      `[ReportScheduler] Report ${status} at ${new Date().toISOString()}`
    );

    if (errorMessage) {
      console.error(
        `[ReportScheduler] Error: ${errorMessage}`
      );
    }

    return;
  }

  try {
    await ensureTables();

    await db.query(`
      INSERT INTO report_history
        (status, target_email, message_id, error_message)
      VALUES ($1, $2, $3, $4)
    `, [
      status,
      email || null,
      messageId || null,
      errorMessage || null
    ]);
  } catch (error) {
    console.error(
      '[ReportScheduler] Failed to save report history:',
      error.message
    );
  }
}

async function cleanupOldReports(retentionDays) {
  if (!db.is_connected()) {
    return;
  }

  try {
    await db.query(`
      DELETE FROM report_history
      WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
    `, [retentionDays]);
  } catch (error) {
    console.error(
      '[ReportScheduler] Retention cleanup failed:',
      error.message
    );
  }
}

async function generateAndSendReport() {
  if (reportInProgress) {
    return {
      success: false,
      message: 'Report already in progress'
    };
  }

  reportInProgress = true;

  try {
    const reportConfig = await getReportConfig();

    if (!reportConfig.enabled) {
      return {
        success: false,
        message: 'Reports are disabled'
      };
    }

    if (!reportConfig.targetEmail) {
      return {
        success: false,
        message:
          'No target email configured. Use .reporttarget <email>'
      };
    }

    console.log('[ReportScheduler] Generating daily report...');

    /*
     * Pass database wrapper to generator.
     */
    const reportContent = await generator.generate(db);

    const sendResult = await mailer.send(
      reportContent,
      reportConfig.targetEmail
    );

    if (sendResult.success) {
      await logReportHistory(
        'success',
        reportConfig.targetEmail,
        null,
        sendResult.messageId
      );

      await cleanupOldReports(
        reportConfig.retentionDays
      );

      console.log(
        '[ReportScheduler] Report sent successfully'
      );

      return {
        success: true,
        message:
          `Report sent to ${reportConfig.targetEmail}`,
        messageId: sendResult.messageId
      };
    }

    await logReportHistory(
      'failure',
      reportConfig.targetEmail,
      sendResult.error
    );

    return {
      success: false,
      message:
        `Failed to send report: ${sendResult.error}`
    };

  } catch (error) {
    console.error(
      '[ReportScheduler] Error generating report:',
      error
    );

    await logReportHistory(
      'failure',
      null,
      error.message
    );

    return {
      success: false,
      message: `Error: ${error.message}`
    };
  } finally {
    reportInProgress = false;
  }
}

async function initialize() {
  if (initialized) {
    return true;
  }

  try {
    if (!db.is_connected()) {
      console.warn(
        '[ReportScheduler] PostgreSQL unavailable. ' +
        'Daily reports disabled.'
      );

      return false;
    }

    await ensureTables();

    const reportConfig = await getReportConfig();

    if (!reportConfig.enabled) {
      console.log(
        '[ReportScheduler] Automatic reports disabled'
      );

      initialized = true;
      return true;
    }

    if (!cron.validate(reportConfig.scheduleTime)) {
      console.error(
        '[ReportScheduler] Invalid cron expression:',
        reportConfig.scheduleTime
      );

      return false;
    }

    if (scheduledJob) {
      scheduledJob.stop();
      scheduledJob = null;
    }

    scheduledJob = cron.schedule(
      reportConfig.scheduleTime,
      async () => {
        console.log(
          '[ReportScheduler] Running scheduled daily report...'
        );

        await generateAndSendReport();
      },
      {
        scheduled: true,
        timezone: appConfig.TIMEZONE || 'UTC'
      }
    );

    initialized = true;

    console.log(
      `[ReportScheduler] Initialized: ` +
      `${reportConfig.scheduleTime} ` +
      `(${appConfig.TIMEZONE || 'UTC'})`
    );

    return true;

  } catch (error) {
    console.error(
      '[ReportScheduler] Initialization failed:',
      error
    );

    return false;
  }
}

async function updateSchedule(newSchedule) {
  if (!cron.validate(newSchedule)) {
    return {
      success: false,
      message:
        'Invalid cron expression. Example: "0 9 * * *"'
    };
  }

  const saveResult = await updateReportConfig(
    'scheduleTime',
    newSchedule
  );

  if (!saveResult.success) {
    return saveResult;
  }

  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }

  scheduledJob = cron.schedule(
    newSchedule,
    async () => {
      await generateAndSendReport();
    },
    {
      scheduled: true,
      timezone: appConfig.TIMEZONE || 'UTC'
    }
  );

  return {
    success: true,
    message:
      `Schedule updated to: ${newSchedule}`
  };
}

async function updateTargetEmail(email) {
  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'Invalid email format'
    };
  }

  const saveResult = await updateReportConfig(
    'targetEmail',
    email
  );

  if (!saveResult.success) {
    return saveResult;
  }

  const testResult = await mailer.sendTest(email);

  if (testResult.success) {
    return {
      success: true,
      message:
        `Target email updated to ${email}. ` +
        `Test email sent!`
    };
  }

  return {
    success: false,
    message:
      `Email saved but test failed: ${testResult.error}`
  };
}

async function updateRetention(days) {
  const daysNum = parseInt(days, 10);

  if (
    Number.isNaN(daysNum) ||
    daysNum < 1 ||
    daysNum > 365
  ) {
    return {
      success: false,
      message:
        'Retention must be between 1 and 365 days'
    };
  }

  const saveResult = await updateReportConfig(
    'retentionDays',
    daysNum
  );

  if (!saveResult.success) {
    return saveResult;
  }

  await cleanupOldReports(daysNum);

  return {
    success: true,
    message:
      `Report retention set to ${daysNum} days`
  };
}

async function getConfig() {
  return getReportConfig().then((reportConfig) => ({
    scheduleTime: reportConfig.scheduleTime,
    targetEmail: reportConfig.targetEmail,
    retentionDays: reportConfig.retentionDays,
    enabled: reportConfig.enabled,
    databaseAvailable:
      reportConfig.databaseAvailable,
    isActive: scheduledJob !== null,
    isInitialized: initialized,
    isInProgress: reportInProgress
  }));
}

function stop() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }

  initialized = false;

  console.log('[ReportScheduler] Stopped');
}

async function triggerManualReport() {
  return generateAndSendReport();
}

module.exports = {
  initialize,
  stop,
  updateSchedule,
  updateTargetEmail,
  updateRetention,
  getConfig,
  triggerManualReport,
  generateAndSendReport,
  isInitialized: () => initialized,
  isInProgress: () => reportInProgress
};
