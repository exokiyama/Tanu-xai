/**
 * Report Scheduler - Manages automatic daily report scheduling
 * Uses node-cron for reliable scheduling
 */

const cron = require('node-cron');
const config = require('../config/config');
const generator = require('./generator');
const mailer = require('./mailer');

// State management to prevent duplicates
let scheduledJob = null;
let initialized = false;
let reportInProgress = false;

/**
 * Database wrapper for report history logging
 */
async function logReportHistory(status, email, errorMessage = null) {
  // This would integrate with the database layer
  // For now, just log to console
  console.log(`[ReportScheduler] Report ${status} at ${new Date().toISOString()}, sent to: ${email}`);
  if (errorMessage) {
    console.error(`[ReportScheduler] Error: ${errorMessage}`);
  }
}

/**
 * Get report configuration from database or cache
 */
async function getReportConfig() {
  // Default configuration
  const defaultConfig = {
    scheduleTime: '0 9 * * *', // 9 AM daily
    targetEmail: config.REPORT_EMAIL_TO || '',
    retentionDays: 30,
    enabled: true
  };
  
  // In production, this would load from database
  // For now, use config values
  return {
    scheduleTime: config.REPORT_TIME || defaultConfig.scheduleTime,
    targetEmail: defaultConfig.targetEmail,
    retentionDays: defaultConfig.retentionDays,
    enabled: defaultConfig.enabled
  };
}

/**
 * Update report configuration
 */
async function updateReportConfig(key, value) {
  // In production, this would save to database
  console.log(`[ReportScheduler] Config updated: ${key} = ${value}`);
  return true;
}

/**
 * Generate and send the report
 * Called by both scheduler and manual trigger
 */
async function generateAndSendReport() {
  // Prevent concurrent execution
  if (reportInProgress) {
    console.log('[ReportScheduler] Report already in progress, skipping');
    return {
      success: false,
      message: 'Report already in progress'
    };
  }
  
  reportInProgress = true;
  
  try {
    const reportConfig = await getReportConfig();
    
    if (!reportConfig.enabled) {
      console.log('[ReportScheduler] Reports are disabled');
      return {
        success: false,
        message: 'Reports are disabled'
      };
    }
    
    if (!reportConfig.targetEmail) {
      console.error('[ReportScheduler] No target email configured');
      return {
        success: false,
        message: 'No target email configured. Use .reporttarget to set it.'
      };
    }
    
    console.log('[ReportScheduler] Generating daily report...');
    
    // Generate report content
    // Note: db parameter would be passed from main index.js
    const reportContent = await generator.generate(null);
    
    // Send via email
    const sendResult = await mailer.send(reportContent, reportConfig.targetEmail);
    
    if (sendResult.success) {
      await logReportHistory('success', reportConfig.targetEmail);
      console.log('[ReportScheduler] Report sent successfully');
      return {
        success: true,
        message: `Report sent to ${reportConfig.targetEmail}`,
        messageId: sendResult.messageId
      };
    } else {
      await logReportHistory('failure', reportConfig.targetEmail, sendResult.error);
      console.error('[ReportScheduler] Failed to send report:', sendResult.error);
      return {
        success: false,
        message: `Failed to send report: ${sendResult.error}`
      };
    }
    
  } catch (error) {
    console.error('[ReportScheduler] Error generating report:', error);
    await logReportHistory('failure', 'unknown', error.message);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  } finally {
    reportInProgress = false;
  }
}

/**
 * Initialize the scheduler
 * Called once during bot startup
 */
async function initialize(db) {
  if (initialized) {
    console.log('[ReportScheduler] Already initialized, skipping');
    return true;
  }
  
  try {
    const reportConfig = await getReportConfig();
    
    if (!reportConfig.enabled) {
      console.log('[ReportScheduler] Automatic reports disabled');
      initialized = true;
      return true;
    }
    
    // Validate cron expression
    if (!cron.validate(reportConfig.scheduleTime)) {
      console.error('[ReportScheduler] Invalid cron expression:', reportConfig.scheduleTime);
      // Use default
      reportConfig.scheduleTime = '0 9 * * *';
    }
    
    // Clear existing job if any
    if (scheduledJob) {
      scheduledJob.stop();
      scheduledJob = null;
    }
    
    // Create new scheduled job
    scheduledJob = cron.schedule(reportConfig.scheduleTime, async () => {
      console.log('[ReportScheduler] Running scheduled daily report...');
      await generateAndSendReport();
    }, {
      scheduled: true,
      timezone: config.TIMEZONE || 'UTC'
    });
    
    console.log(`[ReportScheduler] Initialized with schedule: ${reportConfig.scheduleTime} (${config.TIMEZONE || 'UTC'})`);
    initialized = true;
    
    return true;
    
  } catch (error) {
    console.error('[ReportScheduler] Failed to initialize:', error);
    return false;
  }
}

/**
 * Update schedule dynamically
 * Called when user changes report time
 */
async function updateSchedule(newSchedule) {
  if (!cron.validate(newSchedule)) {
    return {
      success: false,
      message: 'Invalid cron expression. Example: "0 9 * * *" for 9 AM daily'
    };
  }
  
  // Stop existing job
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
  }
  
  // Save to config
  await updateReportConfig('scheduleTime', newSchedule);
  
  // Create new job
  scheduledJob = cron.schedule(newSchedule, async () => {
    console.log('[ReportScheduler] Running scheduled daily report...');
    await generateAndSendReport();
  }, {
    scheduled: true,
    timezone: config.TIMEZONE || 'UTC'
  });
  
  console.log(`[ReportScheduler] Schedule updated to: ${newSchedule}`);
  
  return {
    success: true,
    message: `Schedule updated to: ${newSchedule}`
  };
}

/**
 * Update target email
 */
async function updateTargetEmail(email) {
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      success: false,
      message: 'Invalid email format'
    };
  }
  
  await updateReportConfig('targetEmail', email);
  
  // Send test email
  const testResult = await mailer.sendTest(email);
  
  if (testResult.success) {
    return {
      success: true,
      message: `Target email updated to ${email}. Test email sent!`
    };
  } else {
    return {
      success: false,
      message: `Email updated but test failed: ${testResult.error}`
    };
  }
}

/**
 * Update retention period
 */
async function updateRetention(days) {
  const daysNum = parseInt(days, 10);
  if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
    return {
      success: false,
      message: 'Retention must be between 1 and 365 days'
    };
  }
  
  await updateReportConfig('retentionDays', daysNum);
  
  return {
    success: true,
    message: `Report retention set to ${daysNum} days`
  };
}

/**
 * Get current configuration
 */
async function getConfig() {
  const reportConfig = await getReportConfig();
  
  return {
    scheduleTime: reportConfig.scheduleTime,
    targetEmail: reportConfig.targetEmail,
    retentionDays: reportConfig.retentionDays,
    enabled: reportConfig.enabled,
    isActive: scheduledJob !== null,
    isInitialized: initialized,
    isInProgress: reportInProgress
  };
}

/**
 * Stop the scheduler
 * Called on bot shutdown
 */
function stop() {
  if (scheduledJob) {
    scheduledJob.stop();
    scheduledJob = null;
    console.log('[ReportScheduler] Stopped');
  }
  initialized = false;
}

/**
 * Manually trigger report generation
 * Used by .haxtan command
 */
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
