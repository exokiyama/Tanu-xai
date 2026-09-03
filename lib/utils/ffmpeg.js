/**
 * FFmpeg Utilities - Video/audio conversion wrapper using fluent-ffmpeg
 */

const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { getTmpDir } = require('./downloader');

const TMP_DIR = getTmpDir();

/**
 * Convert video to MP4 format
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @returns {Promise<string>} - Output file path
 */
async function toMp4(inputPath, outputPath = null) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `converted_${Date.now()}.mp4`);
    
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',
        '-preset medium',
        '-crf 23',
        '-c:a aac',
        '-b:a 128k',
        '-movflags +faststart'
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Extract audio from video as MP3
 * @param {string} inputPath - Input video file path
 * @param {string} outputPath - Output file path (optional)
 * @returns {Promise<string>} - Output file path
 */
async function extractAudio(inputPath, outputPath = null) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `audio_${Date.now()}.mp3`);
    
    ffmpeg(inputPath)
      .noVideo()
      .outputOptions([
        '-vn',
        '-c:a libmp3lame',
        '-q:a 2',
        '-ar 44100'
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Convert audio to WAV format
 * @param {string} inputPath - Input audio file path
 * @param {string} outputPath - Output file path (optional)
 * @returns {Promise<string>} - Output file path
 */
async function toWav(inputPath, outputPath = null) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `audio_${Date.now()}.wav`);
    
    ffmpeg(inputPath)
      .outputOptions([
        '-c:a pcm_s16le',
        '-ar 44100',
        '-ac 2'
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Convert video/image to GIF
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @param {object} options - GIF options (duration, fps, size)
 * @returns {Promise<string>} - Output file path
 */
async function toGif(inputPath, outputPath = null, options = {}) {
  const { duration = 10, fps = 10, width = 320 } = options;
  
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `gif_${Date.now()}.gif`);
    
    ffmpeg(inputPath)
      .duration(duration)
      .outputOptions([
        `-vf fps=${fps},scale=${width}:-1:flags=lanczos`,
        '-loop 0'
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Crop video/image to square
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @param {number} size - Size of square crop
 * @returns {Promise<string>} - Output file path
 */
async function cropToSquare(inputPath, outputPath = null, size = 512) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `cropped_${Date.now()}.jpg`);
    
    ffmpeg(inputPath)
      .outputOptions([
        `-vf crop=min(iw\\,ih):min(iw\\,ih),scale=${size}:${size}`
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Resize image/video
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @param {number} width - Target width
 * @param {number} height - Target height
 * @returns {Promise<string>} - Output file path
 */
async function resize(inputPath, outputPath = null, width = 512, height = 512) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `resized_${Date.now()}.jpg`);
    
    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=${width}:${height}`
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Apply blur effect to image/video
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @param {number} intensity - Blur intensity (0-20)
 * @returns {Promise<string>} - Output file path
 */
async function blur(inputPath, outputPath = null, intensity = 5) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `blurred_${Date.now()}.jpg`);
    
    ffmpeg(inputPath)
      .outputOptions([
        `-vf gblur=sigma=${intensity}`
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Rotate image/video
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @param {number} angle - Rotation angle (90, 180, 270)
 * @returns {Promise<string>} - Output file path
 */
async function rotate(inputPath, outputPath = null, angle = 90) {
  let transpose = '';
  switch (angle) {
    case 90: transpose = '1'; break;
    case 180: transpose = '2'; break;
    case 270: transpose = '3'; break;
    default: transpose = '1';
  }
  
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `rotated_${Date.now()}.jpg`);
    
    ffmpeg(inputPath)
      .outputOptions([
        `-vf transpose=${transpose}`
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Mirror/flip image/video
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @param {string} direction - 'horizontal' or 'vertical'
 * @returns {Promise<string>} - Output file path
 */
async function mirror(inputPath, outputPath = null, direction = 'horizontal') {
  const filter = direction === 'horizontal' ? 'hflip' : 'vflip';
  
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `mirrored_${Date.now()}.jpg`);
    
    ffmpeg(inputPath)
      .outputOptions([
        `-vf ${filter}`
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Compress image/video
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @param {number} quality - Quality level (1-31, lower is better)
 * @returns {Promise<string>} - Output file path
 */
async function compress(inputPath, outputPath = null, quality = 20) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `compressed_${Date.now()}.jpg`);
    
    ffmpeg(inputPath)
      .outputOptions([
        `-q:v ${quality}`,
        '-qmin 1',
        '-qmax 31'
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

/**
 * Enhance image quality
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path (optional)
 * @returns {Promise<string>} - Output file path
 */
async function enhance(inputPath, outputPath = null) {
  return new Promise((resolve, reject) => {
    const output = outputPath || path.join(TMP_DIR, `enhanced_${Date.now()}.jpg`);
    
    ffmpeg(inputPath)
      .outputOptions([
        '-vf unsharp=5:5:1.0:5:5:0.0',
        '-colorspace sRGB'
      ])
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .save(output);
  });
}

module.exports = {
  toMp4,
  extractAudio,
  toWav,
  toGif,
  cropToSquare,
  resize,
  blur,
  rotate,
  mirror,
  compress,
  enhance,
  TMP_DIR
};
