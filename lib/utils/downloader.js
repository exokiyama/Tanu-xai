/**
 * Downloader Utilities - YouTube, social media downloads with size limits
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { isValidUrl, getFilenameFromUrl, formatSize } = require('./media');

// Default timeout: 60 seconds
const DEFAULT_TIMEOUT = 60000;

// Temp directory
const TMP_DIR = path.join(process.cwd(), 'tmp', 'downloads');

// Ensure tmp directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

// File size limits (WhatsApp)
const LIMITS = {
  IMAGE: 16 * 1024 * 1024,      // 16MB
  VIDEO: 64 * 1024 * 1024,      // 64MB
  AUDIO: 64 * 1024 * 1024,      // 64MB
  DOCUMENT: 100 * 1024 * 1024   // 100MB
};

/**
 * Validate URL for specific platform
 * @param {string} url - URL to validate
 * @param {string} platform - Platform name (youtube, instagram, etc.)
 * @returns {boolean}
 */
function validateUrl(url, platform) {
  if (!url || typeof url !== 'string') return false;
  
  const patterns = {
    youtube: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
    instagram: /^(https?:\/\/)?(www\.)?instagram\.com\/.+$/,
    facebook: /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+$/,
    tiktok: /^(https?:\/\/)?(www\.)?tiktok\.com\/.+$/,
    twitter: /^(https?:\/\/)?(www\.)?(twitter\.com|x\.com)\/.+$/,
    pinterest: /^(https?:\/\/)?(www\.)?pinterest\.com\/.+$/
  };
  
  const pattern = patterns[platform];
  if (!pattern) return isValidUrl(url);
  
  return pattern.test(url);
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null}
 */
function extractYouTubeId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^?&\s]+)/,
    /youtube\.com\/v\/([^?&\s]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Download file from URL with size limit and progress tracking
 * @param {string} url - URL to download from
 * @param {object} options - Download options
 * @returns {Promise<{buffer: Buffer, filename: string, mimeType: string, size: number}>}
 */
async function downloadFile(url, options = {}) {
  const {
    maxSize = LIMITS.DOCUMENT,
    timeout = DEFAULT_TIMEOUT,
    onProgress = null,
    filename = null
  } = options;

  // Validate URL
  if (!isValidUrl(url)) {
    throw new Error('Invalid URL provided');
  }

  try {
    // First, get file info via HEAD request
    const headResponse = await axios.head(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const contentLength = parseInt(headResponse.headers['content-length'] || '0', 10);
    const contentType = headResponse.headers['content-type'] || 'application/octet-stream';

    // Validate file size
    if (contentLength > 0 && contentLength > maxSize) {
      throw new Error(`File too large: ${formatSize(contentLength)} exceeds limit of ${formatSize(maxSize)}`);
    }

    // Generate filename
    const finalFilename = filename || getFilenameFromUrl(url) || `download_${Date.now()}`;
    const tempPath = path.join(TMP_DIR, finalFilename);

    // Download file with streaming
    const response = await axios.get(url, {
      responseType: 'stream',
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      onDownloadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          onProgress({ loaded: progressEvent.loaded, total: progressEvent.total, percent });
        }
      }
    });

    // Write to temp file
    const writer = fs.createWriteStream(tempPath);
    
    return new Promise((resolve, reject) => {
      let downloadedSize = 0;

      response.data.on('data', (chunk) => {
        downloadedSize += chunk.length;
        
        // Check size limit during download
        if (downloadedSize > maxSize) {
          writer.close();
          fs.unlinkSync(tempPath);
          reject(new Error(`Download exceeded size limit of ${formatSize(maxSize)}`));
        }
      });

      response.data.pipe(writer);

      writer.on('finish', () => {
        const buffer = fs.readFileSync(tempPath);
        resolve({ buffer, filename: finalFilename, mimeType: contentType, size: downloadedSize, tempPath });
      });

      writer.on('error', (err) => {
        fs.unlinkSync(tempPath);
        reject(err);
      });
    });
  } catch (error) {
    if (error.response) {
      throw new Error(`Download failed: ${error.response.status} ${error.response.statusText}`);
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Download timed out');
    } else {
      throw new Error(`Download failed: ${error.message}`);
    }
  }
}

/**
 * Download YouTube video/audio info (placeholder for API integration)
 * @param {string} url - YouTube URL
 * @param {object} options - { format: 'audio'|'video', quality }
 * @returns {Promise<object>}
 */
async function downloadYouTube(url, options = {}) {
  const { format = 'audio', quality = null } = options;
  
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL');
  }
  
  // This is a placeholder - real implementation would use ytdl-core or similar
  // For now, return metadata structure
  return {
    videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    format,
    quality: quality || (format === 'audio' ? '128k' : '720p'),
    note: 'Requires ytdl-core library for actual download'
  };
}

/**
 * Download Instagram media (placeholder)
 * @param {string} url - Instagram post/reel URL
 * @returns {Promise<object>}
 */
async function downloadInstagram(url) {
  if (!validateUrl(url, 'instagram')) {
    throw new Error('Invalid Instagram URL');
  }
  
  return {
    url,
    note: 'Requires Instagram API integration'
  };
}

/**
 * Download TikTok video (placeholder)
 * @param {string} url - TikTok video URL
 * @returns {Promise<object>}
 */
async function downloadTikTok(url) {
  if (!validateUrl(url, 'tiktok')) {
    throw new Error('Invalid TikTok URL');
  }
  
  return {
    url,
    note: 'Requires TikTok API integration'
  };
}

/**
 * Download Facebook video (placeholder)
 * @param {string} url - Facebook video URL
 * @returns {Promise<object>}
 */
async function downloadFacebook(url) {
  if (!validateUrl(url, 'facebook')) {
    throw new Error('Invalid Facebook URL');
  }
  
  return {
    url,
    note: 'Requires Facebook API integration'
  };
}

/**
 * Download Twitter/X media (placeholder)
 * @param {string} url - Twitter/X post URL
 * @returns {Promise<object>}
 */
async function downloadTwitter(url) {
  if (!validateUrl(url, 'twitter')) {
    throw new Error('Invalid Twitter/X URL');
  }
  
  return {
    url,
    note: 'Requires Twitter API integration'
  };
}

/**
 * Download direct media URL
 * @param {string} url - Direct media URL
 * @param {object} options - Download options
 * @returns {Promise<object>}
 */
async function downloadDirectMedia(url, options = {}) {
  return await downloadFile(url, options);
}

/**
 * Check file size
 * @param {Buffer} buffer - File buffer
 * @returns {number} Size in bytes
 */
async function checkFileSize(buffer) {
  return buffer.length;
}

/**
 * Validate file size against WhatsApp limits
 * @param {number} size - File size in bytes
 * @param {string} type - Media type (image, video, audio, document)
 * @returns {boolean}
 */
function validateFileSize(size, type = 'document') {
  const limit = LIMITS[type.toUpperCase()] || LIMITS.DOCUMENT;
  return size <= limit;
}

/**
 * Get appropriate size limit for media type
 * @param {string} type - Media type
 * @returns {number} Size limit in bytes
 */
function getSizeLimit(type) {
  return LIMITS[type.toUpperCase()] || LIMITS.DOCUMENT;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatBytes(bytes) {
  return formatSize(bytes);
}

/**
 * Download and process helper - ensures temp files are removed
 * @param {string} url - URL to download
 * @param {object} options - Download options
 * @param {Function} processor - Async function to process the downloaded file
 * @returns {Promise<any>}
 */
async function downloadAndProcess(url, options, processor) {
  const result = await downloadFile(url, options);
  
  try {
    return await processor(result);
  } finally {
    if (result.tempPath && fs.existsSync(result.tempPath)) {
      try { fs.unlinkSync(result.tempPath); } catch (e) {}
    }
  }
}

/**
 * Cleanup old files in tmp directory
 * @param {number} olderThanMinutes - Files older than this will be deleted
 */
function cleanupOldFiles(olderThanMinutes = 60) {
  const now = Date.now();
  const threshold = olderThanMinutes * 60 * 1000;

  if (!fs.existsSync(TMP_DIR)) return;

  const files = fs.readdirSync(TMP_DIR);
  for (const file of files) {
    const filePath = path.join(TMP_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > threshold) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old temp file: ${file}`);
      }
    } catch (e) {}
  }
}

/**
 * Get temp directory path
 */
function getTmpDir() {
  return TMP_DIR;
}

module.exports = {
  downloadFile,
  downloadYouTube,
  downloadInstagram,
  downloadTikTok,
  downloadFacebook,
  downloadTwitter,
  downloadDirectMedia,
  downloadAndProcess,
  validateUrl,
  extractYouTubeId,
  checkFileSize,
  validateFileSize,
  getSizeLimit,
  formatBytes,
  cleanupOldFiles,
  getTmpDir,
  TMP_DIR,
  LIMITS
};
