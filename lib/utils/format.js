/**
 * Format Utilities - Standardized output formatting for commands
 * Provides consistent box drawing, spacing, and emoji usage
 */

/**
 * Create a formatted box header
 * @param {string} title - Title text
 * @param {number} width - Box width (default: 25)
 * @returns {string} Formatted box header
 */
function createBoxHeader(title, width = 25) {
  const padding = Math.max(0, width - title.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  
  const topLine = '╭─' + '─'.repeat(width) + '─╮';
  const middle = `│${' '.repeat(leftPad)}${title}${' '.repeat(rightPad)}│`;
  const bottomLine = '╰─' + '─'.repeat(width) + '─╯';
  
  return `${topLine}\n${middle}\n${bottomLine}`;
}

/**
 * Create a simple bordered box with content
 * @param {string[]} lines - Array of content lines
 * @param {string} title - Optional title
 * @returns {string} Formatted box
 */
function createBox(lines, title = '') {
  const maxWidth = Math.max(...lines.map(l => l.length), title.length);
  const width = maxWidth + 2;
  
  let result = '';
  result += '╭' + '─'.repeat(width) + '╮\n';
  
  if (title) {
    const padding = width - title.length;
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    result += `│${' '.repeat(leftPad)}${title}${' '.repeat(rightPad)}│\n`;
    result += '├' + '─'.repeat(width) + '┤\n';
  }
  
  for (const line of lines) {
    const padding = width - line.length;
    result += `│ ${line}${' '.repeat(padding - 1)}│\n`;
  }
  
  result += '╰' + '─'.repeat(width) + '╯';
  
  return result;
}

/**
 * Format a key-value pair with consistent spacing
 * @param {string} key - Key/label
 * @param {string|number} value - Value
 * @param {number} minKeyWidth - Minimum key width for alignment
 * @returns {string} Formatted key-value line
 */
function formatKeyValue(key, value, minKeyWidth = 12) {
  const paddedKey = key.padEnd(minKeyWidth);
  return `${paddedKey}: ${value}`;
}

/**
 * Create a list item with bullet point
 * @param {string} text - Item text
 * @param {string} bullet - Bullet character (default: •)
 * @returns {string} Formatted list item
 */
function formatListItem(text, bullet = '•') {
  return `${bullet} ${text}`;
}

/**
 * Format a numbered list
 * @param {string[]} items - Array of items
 * @param {number} startAt - Starting number (default: 1)
 * @returns {string} Formatted numbered list
 */
function formatNumberedList(items, startAt = 1) {
  return items.map((item, i) => `${startAt + i}. ${item}`).join('\n');
}

/**
 * Add emoji prefix based on status
 * @param {string} status - Status type
 * @returns {string} Emoji
 */
function getStatusEmoji(status) {
  const emojis = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    pending: '⏳',
    online: '🟢',
    offline: '🔴',
    busy: '🟡'
  };
  return emojis[status] || '•';
}

/**
 * Format code block for technical output
 * @param {string} code - Code/content to format
 * @param {string} language - Language hint (for display)
 * @returns {string} Formatted code block
 */
function formatCodeBlock(code, language = '') {
  const langPrefix = language ? language + '\n' : '';
  return `\`\`\`${langPrefix}${code}\`\`\``;
}

/**
 * Truncate and pad text for table-like display
 * @param {string} text - Text to format
 * @param {number} width - Target width
 * @param {boolean} truncate - Whether to truncate with ellipsis
 * @returns {string} Formatted text
 */
function formatTableCell(text, width, truncate = true) {
  if (text.length > width && truncate) {
    return text.slice(0, width - 3) + '...';
  }
  return text.padEnd(width);
}

/**
 * Create a divider line
 * @param {string} char - Character to use (default: ─)
 * @param {number} length - Length of divider
 * @returns {string} Divider line
 */
function createDivider(char = '─', length = 30) {
  return char.repeat(length);
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Bytes count
 * @returns {string} Human-readable size
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * Format percentage with visual bar
 * @param {number} percent - Percentage (0-100)
 * @param {number} width - Bar width in characters
 * @returns {string} Visual percentage bar
 */
function formatPercentBar(percent, width = 10) {
  const clamped = Math.min(100, Math.max(0, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${clamped.toFixed(0)}%`;
}

/**
 * Create command usage string
 * @param {string} prefix - Command prefix
 * @param {string} command - Command name
 * @param {string} args - Arguments description
 * @returns {string} Formatted usage string
 */
function formatUsage(prefix, command, args = '') {
  const usage = `${prefix}${command}`;
  return args ? `${usage} ${args}` : usage;
}

/**
 * Standard utility command response template
 * @param {object} options - Template options
 * @returns {string} Formatted response
 */
function formatUtilityResponse(options) {
  const {
    title = 'UTILITY',
    icon = '🔧',
    lines = [],
    footer = ''
  } = options;
  
  let result = `╭───「 ${icon} ${title} 」───⊷\n`;
  
  for (const line of lines) {
    result += `│ ${line}\n`;
  }
  
  if (footer) {
    result += `│\n│ ${footer}\n`;
  }
  
  result += '╰────────────────────⊷';
  
  return result;
}

// Module exports will be added by the conversion script
