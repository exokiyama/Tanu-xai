/**
 * Secret Redactor - Centralized utility for redacting sensitive information
 * All debug command output MUST pass through this redactor before being sent
 * 
 * This is the single source of truth for secret redaction in the bot.
 */

class SecretRedactor {
  constructor() {
    this.sensitivePatterns = [
      // API Keys
      { pattern: /api[_-]?key['":\s]+['"]?([A-Za-z0-9_-]{20,})/gi, replacement: '[API_KEY_REDACTED]' },
      { pattern: /sk-[A-Za-z0-9]{20,}/g, replacement: '[OPENAI_KEY_REDACTED]' },
      { pattern: /gsk_[A-Za-z0-9]{20,}/g, replacement: '[GROQ_KEY_REDACTED]' },
      
      // Database URLs
      { pattern: /postgresql:\/\/[^@\s]+@[^/\s]+/gi, replacement: '[DATABASE_URL_REDACTED]' },
      { pattern: /mongodb(\+srv)?:\/\/[^@\s]+@[^/\s]+/gi, replacement: '[MONGO_URL_REDACTED]' },
      
      // SMTP Credentials
      { pattern: /smtp[_-]?password['":\s]+['"]?([^'"\s]+)/gi, replacement: '[SMTP_PASSWORD_REDACTED]' },
      { pattern: /app[_-]?password['":\s]+['"]?([^'"\s]+)/gi, replacement: '[APP_PASSWORD_REDACTED]' },
      
      // Session/Auth
      { pattern: /session[_-]?id['":\s]+['"]?([^'"\s]{20,})/gi, replacement: '[SESSION_REDACTED]' },
      { pattern: /token['":\s]+['"]?([A-Za-z0-9._-]{20,})/gi, replacement: '[TOKEN_REDACTED]' },
      
      // Owner Numbers (partial redaction)
      { pattern: /(\d{3})\d{6,}(\d{2})/g, replacement: '$1******$2' },
      
      // Generic password patterns
      { pattern: /password['":\s]+['"]?([^'"\s]+)/gi, replacement: '[PASSWORD_REDACTED]' },
      { pattern: /secret['":\s]+['"]?([^'"\s]+)/gi, replacement: '[SECRET_REDACTED]' }
    ];
  }
  
  /**
   * Redact sensitive information from input
   * @param {string|object|array} input - Input to redact
   * @returns {string|object|array} Redacted output
   */
  redact(input) {
    if (typeof input === 'string') {
      return this.redactString(input);
    }
    if (typeof input === 'object' && input !== null) {
      return this.redactObject(input);
    }
    return input;
  }
  
  /**
   * Redact a string
   * @param {string} str - String to redact
   * @returns {string} Redacted string
   */
  redactString(str) {
    if (!str || typeof str !== 'string') return str;
    
    let result = str;
    for (const { pattern, replacement } of this.sensitivePatterns) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }
  
  /**
   * Redact an object recursively
   * @param {object} obj - Object to redact
   * @param {number} depth - Current recursion depth
   * @returns {object} Redacted object
   */
  redactObject(obj, depth = 0) {
    if (depth > 10) return '[MAX_DEPTH]'; // Prevent infinite recursion
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.redactObject(item, depth + 1));
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Redact entire value if key is sensitive
      if (this.isSensitiveKey(lowerKey)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.redactObject(value, depth + 1);
      } else if (typeof value === 'string') {
        result[key] = this.redactString(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  
  /**
   * Check if a key name is sensitive
   * @param {string} key - Key name to check
   * @returns {boolean}
   */
  isSensitiveKey(key) {
    const sensitiveKeys = [
      'password', 'passwd', 'secret', 'token', 'api_key', 'apikey',
      'auth', 'credential', 'session', 'private_key', 'privatekey',
      'database_url', 'mongo_url', 'smtp_password', 'app_password'
    ];
    return sensitiveKeys.some(sk => key.includes(sk));
  }
  
  /**
   * Redact log entries (array of log objects)
   * @param {array} logs - Array of log entries
   * @returns {array} Redacted log entries
   */
  redactLogs(logs) {
    if (!Array.isArray(logs)) return logs;
    
    return logs.map(log => {
      if (typeof log === 'string') {
        return this.redactString(log);
      }
      if (typeof log === 'object' && log !== null) {
        const redactedLog = {};
        for (const [key, value] of Object.entries(log)) {
          if (key === 'message' || key === 'text' || key === 'data') {
            redactedLog[key] = this.redact(value);
          } else if (typeof value === 'string') {
            redactedLog[key] = this.redactString(value);
          } else {
            redactedLog[key] = value;
          }
        }
        return redactedLog;
      }
      return log;
    });
  }
  
  /**
   * Redact database query results
   * @param {array} rows - Database rows
   * @param {array} sensitiveColumns - Columns to always redact
   * @returns {array} Redacted rows
   */
  redactDatabaseRows(rows, sensitiveColumns = ['password', 'token', 'secret', 'api_key']) {
    if (!Array.isArray(rows)) return rows;
    
    return rows.map(row => {
      if (typeof row !== 'object' || row === null) return row;
      
      const redactedRow = { ...row };
      for (const col of sensitiveColumns) {
        if (col in redactedRow) {
          redactedRow[col] = '[REDACTED]';
        }
      }
      return redactedRow;
    });
  }
}

// Export singleton instance
module.exports = new SecretRedactor();
