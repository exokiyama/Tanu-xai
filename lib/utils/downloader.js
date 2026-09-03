/**
 * Downloader Utilities - URL validation, download with size limits, progress tracking
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { isValidUrl, getFilenameFromUrl, formatSize, validateFileSize } = require('./media');

// Default timeout: 60 seconds
const DEFAULT_TIMEOUT = 60000;

// Temp directory
const TMP_DIR = path.join(process.cwd(), 'tmp');

// Ensure tmp directory exists
if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Download file from URL with size limit and progress tracking
 * @param {string} url - URL to download from
 * @param {object} options - Download options
 * @returns {Promise<{buffer: Buffer, filename: string, mimeType: string, size: number}>}
 */
async function downloadFile(url, options = {}) {
  const {
    maxSize = 100 * 1024 * 1024, // 100MB default
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
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percent
          });
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
        // Read file into buffer
        const buffer = fs.readFileSync(tempPath);
        resolve({
          buffer,
          filename: finalFilename,
          mimeType: contentType,
          size: downloadedSize,
          tempPath
        });
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
 * Download and cleanup helper - ensures temp files are removed
 * @param {string} url - URL to download
 * @param {object} options - Download options
 * @param {Function} processor - Async function to process the downloaded file
 * @returns {Promise<any>} - Result from processor
 */
async function downloadAndProcess(url, options, processor) {
  const result = await downloadFile(url, options);
  
  try {
    return await processor(result);
  } finally {
    // Cleanup temp file
    if (result.tempPath && fs.existsSync(result.tempPath)) {
      try {
        fs.unlinkSync(result.tempPath);
      } catch (e) {
        console.error('Failed to cleanup temp file:', e);
      }
    }
  }
}

/**
 * Cleanup all files in tmp directory older than specified minutes
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
    } catch (e) {
      console.error(`Error cleaning up ${file}:`, e);
    }
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
  downloadAndProcess,
  cleanupOldFiles,
  getTmpDir,
  TMP_DIR
};
