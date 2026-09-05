'use strict';

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes) {
    const value = Number(bytes) || 0;

    if (value <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(
        Math.floor(Math.log(value) / Math.log(1024)),
        units.length - 1
    );

    return `${(value / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

/**
 * Format milliseconds into a readable duration.
 */
function formatDuration(milliseconds) {
    const ms = Number(milliseconds) || 0;

    if (ms <= 0) {
        return '0s';
    }

    const totalSeconds = Math.floor(ms / 1000);

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || parts.length === 0) parts.push(`${seconds}s`);

    return parts.join(' ');
}

module.exports = {
    formatBytes,
    formatDuration
};
