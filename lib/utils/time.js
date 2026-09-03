/**
 * Time Utilities - Timezone conversion, timestamp formatting, date calculations
 */

/**
 * Format a timestamp to human-readable string
 * @param {number} timestamp - Unix timestamp in seconds or milliseconds
 * @returns {string} Formatted date/time string
 */
export function formatTimestamp(timestamp) {
  // Convert to milliseconds if in seconds
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Get current Unix timestamp
 * @param {boolean} inSeconds - Return in seconds instead of milliseconds
 * @returns {number} Current timestamp
 */
export function getTimestamp(inSeconds = false) {
  return inSeconds ? Math.floor(Date.now() / 1000) : Date.now();
}

/**
 * Format time difference into human-readable string
 * @param {number} ms - Milliseconds difference
 * @returns {string} Human-readable duration
 */
export function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Get timezone abbreviation from offset
 * @param {number} offsetHours - UTC offset in hours
 * @returns {string} Timezone abbreviation
 */
export function getTimezoneFromOffset(offsetHours) {
  const offset = offsetHours * 60;
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Convert date to specific timezone
 * @param {Date} date - Date object
 * @param {string} timezone - IANA timezone name (e.g., 'America/New_York')
 * @returns {string} Formatted date in timezone
 */
export function formatDateInTimezone(date, timezone) {
  try {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  } catch (error) {
    // Fallback to local time if timezone is invalid
    return date.toLocaleString('en-US');
  }
}

/**
 * Get time remaining until a target date
 * @param {Date|string|number} target - Target date
 * @returns {object} Time remaining breakdown
 */
export function getTimeRemaining(target) {
  const targetDate = new Date(target);
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  
  if (diff <= 0) {
    return { expired: true, total: 0 };
  }
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  return {
    expired: false,
    total: diff,
    days: days % 365,
    hours: hours % 24,
    minutes: minutes % 60,
    seconds: seconds % 60
  };
}

/**
 * Add time to a date
 * @param {Date} date - Base date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit type: 'ms', 's', 'm', 'h', 'd', 'w', 'y'
 * @returns {Date} New date
 */
export function addTime(date, amount, unit) {
  const result = new Date(date);
  
  switch (unit) {
    case 'ms': result.setMilliseconds(result.getMilliseconds() + amount); break;
    case 's': result.setSeconds(result.getSeconds() + amount); break;
    case 'm': result.setMinutes(result.getMinutes() + amount); break;
    case 'h': result.setHours(result.getHours() + amount); break;
    case 'd': result.setDate(result.getDate() + amount); break;
    case 'w': result.setDate(result.getDate() + (amount * 7)); break;
    case 'M': result.setMonth(result.getMonth() + amount); break;
    case 'y': result.setFullYear(result.getFullYear() + amount); break;
    default: result.setMilliseconds(result.getMilliseconds() + amount);
  }
  
  return result;
}

/**
 * Check if a date is today
 * @param {Date|string|number} date - Date to check
 * @returns {boolean} True if date is today
 */
export function isToday(date) {
  const checkDate = new Date(date);
  const today = new Date();
  return checkDate.toDateString() === today.toDateString();
}

/**
 * Get age from birthdate
 * @param {Date|string|number} birthdate - Birthdate
 * @returns {number} Age in years
 */
export function getAge(birthdate) {
  const birth = new Date(birthdate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  
  return Math.max(0, age);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date|string|number} date - Date to format
 * @returns {string} Relative time string
 */
export function formatRelativeTime(date) {
  const then = new Date(date).getTime();
  const now = Date.now();
  const diff = now - then;
  
  if (diff < 0) return 'in the future';
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} minute(s) ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hour(s) ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} day(s) ago`;
  
  return formatTimestamp(date);
}

/**
 * Common timezone mappings for user-friendly names
 */
export const COMMON_TIMEZONES = {
  'UTC': 'Coordinated Universal Time',
  'America/New_York': 'Eastern Time (US)',
  'America/Chicago': 'Central Time (US)',
  'America/Denver': 'Mountain Time (US)',
  'America/Los_Angeles': 'Pacific Time (US)',
  'Europe/London': 'British Time',
  'Europe/Paris': 'Central European Time',
  'Asia/Kolkata': 'Indian Standard Time',
  'Asia/Dubai': 'Gulf Standard Time',
  'Asia/Singapore': 'Singapore Time',
  'Asia/Tokyo': 'Japan Standard Time',
  'Australia/Sydney': 'Australian Eastern Time'
};

export default {
  formatTimestamp,
  getTimestamp,
  formatDuration,
  getTimezoneFromOffset,
  formatDateInTimezone,
  getTimeRemaining,
  addTime,
  isToday,
  getAge,
  formatRelativeTime,
  COMMON_TIMEZONES
};
