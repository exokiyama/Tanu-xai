/**
 * Text Utilities - Encoding/decoding and string manipulation
 */

const { createHash } = require('crypto');
/**
 * Encode string to Base64
 * @param {string} text - Text to encode
 * @returns {string} Base64 encoded string
 */
function base64Encode(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return Buffer.from(text, 'utf-8').toString('base64');
}

/**
 * Decode Base64 string
 * @param {string} base64 - Base64 string to decode
 * @returns {string} Decoded text
 */
function base64Decode(base64) {
  if (typeof base64 !== 'string') throw new Error('Input must be a string');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    throw new Error('Invalid Base64 input');
  }
}

/**
 * URL encode a string
 * @param {string} text - Text to encode
 * @returns {string} URL encoded string
 */
function urlEncode(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return encodeURIComponent(text);
}

/**
 * URL decode a string
 * @param {string} text - URL encoded string
 * @returns {string} Decoded text
 */
function urlDecode(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  try {
    return decodeURIComponent(text);
  } catch (error) {
    throw new Error('Invalid URL encoded input');
  }
}

/**
 * Convert string to binary
 * @param {string} text - Text to convert
 * @returns {string} Binary representation
 */
function toBinary(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return text.split('').map(char => 
    char.charCodeAt(0).toString(2).padStart(8, '0')
  ).join(' ');
}

/**
 * Convert binary string back to text
 * @param {string} binary - Binary string (space-separated bytes)
 * @returns {string} Decoded text
 */
function fromBinary(binary) {
  if (typeof binary !== 'string') throw new Error('Input must be a string');
  return binary.split(' ').map(bin => 
    String.fromCharCode(parseInt(bin, 2))
  ).join('');
}

/**
 * Convert string to hexadecimal
 * @param {string} text - Text to convert
 * @returns {string} Hexadecimal representation
 */
function toHex(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return Buffer.from(text, 'utf-8').toString('hex');
}

/**
 * Convert hexadecimal string back to text
 * @param {string} hex - Hexadecimal string
 * @returns {string} Decoded text
 */
function fromHex(hex) {
  if (typeof hex !== 'string') throw new Error('Input must be a string');
  try {
    return Buffer.from(hex, 'hex').toString('utf-8');
  } catch (error) {
    throw new Error('Invalid hexadecimal input');
  }
}

/**
 * Calculate MD5 hash
 * @param {string} text - Text to hash
 * @returns {string} MD5 hash (lowercase hex)
 */
function md5(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return createHash('md5').update(text).digest('hex');
}

/**
 * Calculate SHA256 hash
 * @param {string} text - Text to hash
 * @returns {string} SHA256 hash (lowercase hex)
 */
function sha256(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Count words in text
 * @param {string} text - Text to analyze
 * @returns {number} Word count
 */
function wordCount(text) {
  if (typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count characters in text
 * @param {string} text - Text to analyze
 * @param {boolean} includeSpaces - Whether to count spaces
 * @returns {number} Character count
 */
function charCount(text, includeSpaces = true) {
  if (typeof text !== 'string') return 0;
  if (includeSpaces) return text.length;
  return text.replace(/\s/g, '').length;
}

/**
 * Reverse a string
 * @param {string} text - Text to reverse
 * @returns {string} Reversed string
 */
function reverse(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return text.split('').reverse().join('');
}

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncate(text, maxLength = 100) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Escape special regex characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeRegex(text) {
  if (typeof text !== 'string') throw new Error('Input must be a string');
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize user input to prevent injection attacks
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  // Remove null bytes and control characters
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// Module exports will be added by the conversion script
