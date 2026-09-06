/**
 * Media Utilities - Type detection, format validation, MIME types
 */

const mime = require('mime-types');

// Supported media types
const MEDIA_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/3gpp'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// File size limits (bytes)
const SIZE_LIMITS = {
  image: 16 * 1024 * 1024,      // 16MB
  video: 64 * 1024 * 1024,      // 64MB
  audio: 64 * 1024 * 1024,      // 64MB
  document: 100 * 1024 * 1024,  // 100MB
  sticker: 1 * 1024 * 1024      // 1MB
};

/**
 * Detect media type from buffer or URL
 */
function detectMediaType(bufferOrUrl) {
  if (Buffer.isBuffer(bufferOrUrl)) {
    const header = bufferOrUrl.slice(0, 12);
    
    // Check magic numbers
    if (header[0] === 0xFF && header[1] === 0xD8) return 'image/jpeg';
    if (header[0] === 0x89 && header.toString('ascii', 1, 4) === 'PNG') return 'image/png';
    if (header.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
    if (header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
    if (header.toString('ascii', 0, 4) === 'ftyp') return 'video/mp4';
    if (header[0] === 0x1A && header.toString('ascii', 4, 7) === 'ftyp') return 'video/mp4';
    if (header.toString('ascii', 0, 4) === 'OggS') return 'audio/ogg';
    if (header.toString('ascii', 0, 2) === 'ID') return 'audio/mp3';
  }
  
  if (typeof bufferOrUrl === 'string') {
    const mimeType = mime.lookup(bufferOrUrl);
    if (mimeType) return mimeType;
  }
  
  return null;
}

/**
 * Get media category (image, video, audio, document)
 */
function getMediaCategory(mimeType) {
  for (const [category, types] of Object.entries(MEDIA_TYPES)) {
    if (types.includes(mimeType)) return category;
  }
  return 'document';
}

/**
 * Validate file size against WhatsApp limits
 */
function validateFileSize(sizeBytes, mediaType = 'document') {
  const limit = SIZE_LIMITS[mediaType] || SIZE_LIMITS.document;
  return {
    valid: sizeBytes <= limit,
    size: sizeBytes,
    limit: limit,
    sizeFormatted: formatSize(sizeBytes),
    limitFormatted: formatSize(limit)
  };
}

/**
 * Format bytes to human readable
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Validate URL format
 */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Extract filename from URL
 */
function getFilenameFromUrl(url) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    return pathname.substring(pathname.lastIndexOf('/') + 1) || 'download';
  } catch {
    return 'download';
  }
}

/**
 * Get proper MIME type for extension
 */
function getMimeType(filename) {
  return mime.lookup(filename) || 'application/octet-stream';
}

module.exports = {
  MEDIA_TYPES,
  SIZE_LIMITS,
  detectMediaType,
  getMediaCategory,
  validateFileSize,
  formatSize,
  isValidUrl,
  getFilenameFromUrl,
  getMimeType
};
