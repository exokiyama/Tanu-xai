/**
 * Debug Formatter - Consistent formatting for debug output
 * Creates readable, structured debug information display
 */

/**
 * Create a box header for debug sections
 * @param {string} title - Title text
 * @returns {string} Formatted header
 */
function createHeader(title) {
  const width = 35;
  const padding = Math.floor((width - title.length) / 2);
  const leftPad = ' '.repeat(padding);
  const rightPad = ' '.repeat(width - title.length - padding);
  
  return `╔═══════════════════════════════════╗\n║${leftPad}${title}${rightPad}║\n╚═══════════════════════════════════╝`;
}

/**
 * Format a key-value pair with tree-like structure
 * @param {string} key - Key name
 * @param {string|number} value - Value
 * @param {boolean} isLast - Whether this is the last item in the group
 * @param {number} indent - Indentation level
 * @returns {string} Formatted line
 */
function formatKeyValue(key, value, isLast = true, indent = 0) {
  const prefix = '  '.repeat(indent);
  const connector = isLast ? '└─' : '├─';
  return `${prefix}${connector} ${key}: ${value}`;
}

/**
 * Format status with emoji indicator
 * @param {boolean} success - Whether status is good
 * @param {string} text - Status text
 * @returns {string} Formatted status
 */
function formatStatus(success, text) {
  return success ? `✅ ${text}` : `❌ ${text}`;
}

/**
 * Format warning with emoji
 * @param {string} text - Warning text
 * @returns {string} Formatted warning
 */
function formatWarning(text) {
  return `⚠️ ${text}`;
}

/**
 * Format memory usage
 * @param {number} used - Used memory in bytes
 * @param {number} total - Total memory in bytes
 * @returns {string} Formatted memory string
 */
function formatMemory(used, total) {
  const usedMB = (used / 1024 / 1024).toFixed(2);
  const totalMB = (total / 1024 / 1024).toFixed(2);
  const percentage = ((used / total) * 100).toFixed(1);
  return `${usedMB}MB / ${totalMB}MB (${percentage}%)`;
}

/**
 * Format uptime
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  
  return parts.join(' ') || '< 1m';
}

/**
 * Format a section with multiple key-value pairs
 * @param {string} title - Section title
 * @param {object} items - Key-value pairs
 * @returns {string} Formatted section
 */
function formatSection(title, items) {
  let result = `\n📊 ${title}\n`;
  const keys = Object.keys(items);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = items[key];
    const isLast = i === keys.length - 1;
    result += `${formatKeyValue(key, value, isLast)}\n`;
  }
  return result;
}

/**
 * Format command list by category
 * @param {object} commandsByCategory - Commands grouped by category
 * @returns {string} Formatted command list
 */
function formatCommandList(commandsByCategory) {
  let result = '\n📦 Command Registry\n';
  
  for (const [category, commands] of Object.entries(commandsByCategory)) {
    result += `├─ ${category}: ${commands.length} commands\n`;
  }
  
  return result;
}

/**
 * Format issues list
 * @param {array} issues - Array of issue strings
 * @param {string} title - Issue section title
 * @returns {string} Formatted issues list
 */
function formatIssues(issues, title = 'Issues') {
  if (!issues || issues.length === 0) {
    return `\n✅ No ${title.toLowerCase()} detected\n`;
  }
  
  let result = `\n⚠️ ${title}:\n`;
  for (let i = 0; i < issues.length; i++) {
    const isLast = i === issues.length - 1;
    result += `${formatKeyValue(i + 1, issues[i], isLast)}\n`;
  }
  return result;
}

/**
 * Format table data
 * @param {array} rows - Array of row objects
 * @param {array} columns - Column names to display
 * @returns {string} Formatted table
 */
function formatTable(rows, columns) {
  if (!rows || rows.length === 0) {
    return 'No data available';
  }
  
  // Calculate column widths
  const widths = columns.map(col => {
    const maxVal = rows.reduce((max, row) => {
      const val = String(row[col] || '');
      return Math.max(max, val.length);
    }, col.length);
    return Math.min(maxVal, 30); // Cap at 30 chars
  });
  
  // Build header
  let result = '┌─';
  result += columns.map((col, i) => col.padEnd(widths[i], '─')).join('─┼─');
  result += '─┐\n';
  
  // Build rows
  for (const row of rows.slice(0, 10)) { // Limit to 10 rows
    result += '│ ';
    result += columns.map((col, i) => {
      const val = String(row[col] || '');
      return val.substring(0, 30).padEnd(widths[i], ' ');
    }).join(' │ ');
    result += ' │\n';
  }
  
  if (rows.length > 10) {
    result += `└─ ... and ${rows.length - 10} more rows\n`;
  } else {
    result += '└─\n';
  }
  
  return result;
}

/**
 * Format error message safely
 * @param {Error} error - Error object
 * @returns {string} Formatted error
 */
function formatError(error) {
  if (!error) return 'Unknown error';
  return `${error.name}: ${error.message}`;
}

/**
 * Create a divider line
 * @returns {string} Divider
 */
function createDivider() {
  return '\n─────────────────────────────────────\n';
}

module.exports = {
  createHeader,
  formatKeyValue,
  formatStatus,
  formatWarning,
  formatMemory,
  formatUptime,
  formatSection,
  formatCommandList,
  formatIssues,
  formatTable,
  formatError,
  createDivider
};
