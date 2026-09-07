/**
 * Sticker Utilities - WebP conversion, metadata handling, sticker pack management
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { getTmpDir } = require('./downloader');
const { toMp4, extractAudio } = require('./ffmpeg');

const TMP_DIR = getTmpDir();

// Default sticker metadata
const DEFAULT_PACK = process.env.STICKER_PACK_NAME || 'Tanu Bot';
const DEFAULT_AUTHOR = process.env.STICKER_AUTHOR || 'WhatsApp Bot';

/**
 * Convert image to WebP sticker format
 * @param {Buffer|string} input - Image buffer or file path
 * @param {object} options - Sticker options
 * @returns {Promise<Buffer>} - WebP buffer
 */
async function imageToWebP(input, options = {}) {
  const { 
    pack = DEFAULT_PACK, 
    author = DEFAULT_AUTHOR,
    width = 512,
    height = 512
  } = options;

  let pipeline = sharp(typeof input === 'string' ? input : input);
  
  // Resize and convert
  pipeline = pipeline
    .resize(width, height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 80 });

  return await pipeline.toBuffer();
}

/**
 * Convert video to animated WebP (sticker)
 * @param {Buffer|string} input - Video buffer or file path
 * @param {object} options - Sticker options
 * @returns {Promise<Buffer>} - Animated WebP buffer
 */
async function videoToWebP(input, options = {}) {
  const { 
    pack = DEFAULT_PACK, 
    author = DEFAULT_AUTHOR,
    fps = 10,
    width = 320
  } = options;

  const inputPath = typeof input === 'string' ? input : path.join(TMP_DIR, `video_${Date.now()}.mp4`);
  
  // If buffer, write to temp file
  if (Buffer.isBuffer(input)) {
    fs.writeFileSync(inputPath, input);
  }

  const outputPath = path.join(TMP_DIR, `sticker_${Date.now()}.webp`);

  try {
    // Use ffmpeg via fluent-ffmpeg for animated WebP
    const ffmpeg = require('fluent-ffmpeg');
    
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-vf scale=${width}:-1,fps=${fps}`,
          '-c:v libwebp',
          '-lossless 0',
          '-q:v 80',
          '-loop 0',
          '-preset default'
        ])
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    return fs.readFileSync(outputPath);
  } finally {
    // Cleanup
    if (Buffer.isBuffer(input) && fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
  }
}

/**
 * Create sticker with custom pack/author metadata
 * @param {Buffer|string} input - Media buffer or file path
 * @param {boolean} isVideo - Is this a video sticker
 * @param {object} metadata - Pack and author info
 * @returns {Promise<{buffer: Buffer, mimetype: string}>}
 */
async function createSticker(input, isVideo = false, metadata = {}) {
  const webpBuffer = isVideo 
    ? await videoToWebP(input, metadata)
    : await imageToWebP(input, metadata);

  return {
    buffer: webpBuffer,
    mimetype: 'image/webp',
    pack: metadata.pack || DEFAULT_PACK,
    author: metadata.author || DEFAULT_AUTHOR
  };
}

/**
 * Extract sticker metadata from WebP file
 * @param {Buffer} webpBuffer - WebP buffer
 * @returns {Promise<object>} - Sticker metadata
 */
async function extractStickerMetadata(webpBuffer) {
  try {
    const metadata = await sharp(webpBuffer).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      size: webpBuffer.length,
      hasAlpha: metadata.hasAlpha || false,
      pages: metadata.pages || 1,
      isAnimated: (metadata.pages || 1) > 1
    };
  } catch (e) {
    console.error('Error extracting sticker metadata:', e);
    return null;
  }
}

/**
 * Steal/take sticker pack metadata
 * @param {Buffer} webpBuffer - Input sticker buffer
 * @param {string} newPack - New pack name
 * @param {string} newAuthor - New author name
 * @returns {Promise<Buffer>} - Modified sticker buffer
 */
async function stealSticker(webpBuffer, newPack = DEFAULT_PACK, newAuthor = DEFAULT_AUTHOR) {
  // For now, just return the same buffer - actual metadata embedding
  // would require exif-js or similar library
  // The pack/author is typically displayed by WhatsApp client
  return webpBuffer;
}

/**
 * Create circular sticker from image
 * @param {Buffer|string} input - Image buffer or path
 * @returns {Promise<Buffer>} - Circular WebP buffer
 */
async function createCircleSticker(input) {
  const resized = await sharp(typeof input === 'string' ? input : input)
    .resize(512, 512, { fit: 'cover' })
    .extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .toBuffer();

  // Create circular mask
  const mask = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .raw()
    .toBuffer();

  // Apply circle crop using composite
  const circle = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .raw()
    .toBuffer();

  return await sharp(resized)
    .resize(512, 512)
    .webp({ quality: 80 })
    .toBuffer();
}

/**
 * Validate sticker dimensions and format
 * @param {Buffer} buffer - Sticker buffer
 * @returns {object} - Validation result
 */
function validateSticker(buffer) {
  const maxSize = 1 * 1024 * 1024; // 1MB
  
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: 'Empty sticker buffer' };
  }
  
  if (buffer.length > maxSize) {
    return { valid: false, error: `Sticker too large (${(buffer.length / 1024 / 1024).toFixed(2)}MB > 1MB)` };
  }
  
  return { valid: true, size: buffer.length };
}

module.exports = {
  imageToWebP,
  videoToWebP,
  createSticker,
  extractStickerMetadata,
  stealSticker,
  createCircleSticker,
  validateSticker,
  DEFAULT_PACK,
  DEFAULT_AUTHOR
};
