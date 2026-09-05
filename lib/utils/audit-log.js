'use strict';

const {
    writeFile,
    readFile,
    mkdir
} = require('fs/promises');

const {
    existsSync,
    readFileSync,
    writeFileSync
} = require('fs');

const {
    dirname,
    join
} = require('path');

const AUDIT_LOG_PATH = join(
    __dirname,
    '../../data/audit-logs.json'
);

/**
 * Audit Logging System for Owner/Sudo Commands
 *
 * Logs privileged command usage for security
 * and accountability.
 */

// In-memory log buffer for performance
let logBuffer = [];

const MAX_BUFFER_SIZE = 100;
const MAX_LOG_ENTRIES = 10000;

/**
 * Generate unique audit log ID
 */
function generateId() {
    return `audit_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 11)}`;
}

/**
 * Sanitize sensitive data before logging
 */
function sanitizeData(data) {
    if (data === null || data === undefined) {
        return null;
    }

    if (typeof data === 'string') {
        return data.length > 500
            ? `${data.substring(0, 500)}...`
            : data;
    }

    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }

    if (typeof data === 'object') {
        const sanitized = {};

        for (const [key, value] of Object.entries(data)) {
            const sensitiveKeys = [
                'password',
                'token',
                'secret',
                'session',
                'apikey',
                'api_key',
                'authorization'
            ];

            if (sensitiveKeys.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = sanitizeData(value);
            }
        }

        return sanitized;
    }

    return data;
}

/**
 * Load audit logs from disk
 */
async function loadAuditLogs() {
    try {
        if (!existsSync(AUDIT_LOG_PATH)) {
            return [];
        }

        const data = await readFile(
            AUDIT_LOG_PATH,
            'utf8'
        );

        if (!data.trim()) {
            return [];
        }

        const logs = JSON.parse(data);

        return Array.isArray(logs)
            ? logs
            : [];

    } catch (error) {
        console.error(
            '[AuditLog] Failed to load logs:',
            error.message
        );

        return [];
    }
}

/**
 * Save audit logs to disk
 */
async function saveAuditLogs(logs) {
    try {
        const logDir = dirname(AUDIT_LOG_PATH);

        if (!existsSync(logDir)) {
            await mkdir(logDir, {
                recursive: true
            });
        }

        await writeFile(
            AUDIT_LOG_PATH,
            JSON.stringify(logs, null, 2),
            'utf8'
        );

        return true;

    } catch (error) {
        console.error(
            '[AuditLog] Failed to save logs:',
            error.message
        );

        return false;
    }
}

/**
 * Log an owner/sudo command execution
 */
async function logCommandExecution({
    command,
    senderJid,
    chatId,
    isGroup = false,
    parameters = {},
    success = true,
    error = null,
    permissionLevel = 'owner'
}) {
    const entry = {
        id: generateId(),

        timestamp: new Date().toISOString(),

        command: command || 'unknown',

        senderJid: senderJid || 'unknown',

        senderPhone: senderJid
            ? senderJid
                .split('@')[0]
                .replace(/\D/g, '')
            : 'unknown',

        chatId: chatId || 'unknown',

        isGroup: Boolean(isGroup),

        parameters: sanitizeData(parameters),

        success: Boolean(success),

        error: error
            ? sanitizeData(error)
            : null,

        permissionLevel:
            permissionLevel || 'owner'
    };

    logBuffer.push(entry);

    if (logBuffer.length >= MAX_BUFFER_SIZE) {
        await flushLogs();
    }

    const logSymbol = entry.success
        ? '✅'
        : '❌';

    console.log(
        `[AUDIT] ${logSymbol} ` +
        `${entry.command} by ${entry.senderPhone} ` +
        `(${entry.permissionLevel}) - ` +
        `${entry.success ? 'SUCCESS' : 'FAILED'}`
    );

    return entry;
}

/**
 * Generic log function
 *
 * Kept for compatibility with commands that
 * import { log } from this module.
 */
async function log(data = {}) {
    return logCommandExecution(data);
}

/**
 * Flush buffered logs to disk
 */
async function flushLogs() {
    if (logBuffer.length === 0) {
        return true;
    }

    try {
        const existingLogs = await loadAuditLogs();

        const newLogs = [
            ...existingLogs,
            ...logBuffer
        ];

        const trimmedLogs = newLogs.slice(
            -MAX_LOG_ENTRIES
        );

        const saved = await saveAuditLogs(
            trimmedLogs
        );

        if (saved) {
            logBuffer = [];
        }

        return saved;

    } catch (error) {
        console.error(
            '[AuditLog] Flush failed:',
            error.message
        );

        return false;
    }
}

/**
 * Get recent audit logs
 */
async function getRecentLogs(limit = 50) {
    const logs = await loadAuditLogs();

    const safeLimit = Math.max(
        1,
        Math.min(Number(limit) || 50, MAX_LOG_ENTRIES)
    );

    return logs.slice(-safeLimit);
}

/**
 * Search audit logs by command
 */
async function searchLogsByCommand(commandName) {
    const logs = await loadAuditLogs();

    return logs.filter(
        entry => entry.command === commandName
    );
}

/**
 * Search audit logs by user
 */
async function searchLogsByUser(phoneNumber) {
    const logs = await loadAuditLogs();

    const normalized = String(phoneNumber || '')
        .replace(/\D/g, '');

    return logs.filter(
        entry => entry.senderPhone === normalized
    );
}

/**
 * Get audit statistics
 */
async function getAuditStats() {
    const logs = await loadAuditLogs();

    return {
        totalEntries: logs.length,

        successfulExecutions:
            logs.filter(log => log.success).length,

        failedExecutions:
            logs.filter(log => !log.success).length,

        ownerExecutions:
            logs.filter(
                log => log.permissionLevel === 'owner'
            ).length,

        sudoExecutions:
            logs.filter(
                log => log.permissionLevel === 'sudo'
            ).length,

        commandsUsed: [
            ...new Set(
                logs.map(log => log.command)
            )
        ],

        uniqueUsers: [
            ...new Set(
                logs.map(log => log.senderPhone)
            )
        ]
    };
}

/**
 * Clear old audit logs
 */
async function clearOldLogs(daysToKeep = 30) {
    const logs = await loadAuditLogs();

    const cutoffDate = new Date();

    cutoffDate.setDate(
        cutoffDate.getDate() - Number(daysToKeep)
    );

    const filteredLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);

        return (
            !Number.isNaN(logDate.getTime()) &&
            logDate >= cutoffDate
        );
    });

    const removedCount =
        logs.length - filteredLogs.length;

    if (removedCount > 0) {
        await saveAuditLogs(filteredLogs);
    }

    return removedCount;
}

/**
 * Flush logs every 5 minutes
 */
const flushInterval = setInterval(() => {
    flushLogs().catch(error => {
        console.error(
            '[AuditLog] Auto-flush failed:',
            error.message
        );
    });
}, 5 * 60 * 1000);

/*
 * Do not keep Node process alive only because
 * of the audit logger timer.
 */
if (typeof flushInterval.unref === 'function') {
    flushInterval.unref();
}

/**
 * Flush remaining logs when process exits
 */
process.on('exit', () => {
    try {
        if (logBuffer.length === 0) {
            return;
        }

        let existingLogs = [];

        if (existsSync(AUDIT_LOG_PATH)) {
            const data = readFileSync(
                AUDIT_LOG_PATH,
                'utf8'
            );

            if (data.trim()) {
                existingLogs = JSON.parse(data);
            }
        }

        const finalLogs = [
            ...(Array.isArray(existingLogs)
                ? existingLogs
                : []),
            ...logBuffer
        ].slice(-MAX_LOG_ENTRIES);

        const logDir = dirname(
            AUDIT_LOG_PATH
        );

        if (!existsSync(logDir)) {
            require('fs').mkdirSync(
                logDir,
                { recursive: true }
            );
        }

        writeFileSync(
            AUDIT_LOG_PATH,
            JSON.stringify(
                finalLogs,
                null,
                2
            ),
            'utf8'
        );

    } catch {
        // Ignore errors during process exit
    }
});

/**
 * Module exports
 */
module.exports = {
    log,
    logCommandExecution,
    loadAuditLogs,
    saveAuditLogs,
    flushLogs,
    getRecentLogs,
    searchLogsByCommand,
    searchLogsByUser,
    getAuditStats,
    clearOldLogs
};

module.exports.default = module.exports;
