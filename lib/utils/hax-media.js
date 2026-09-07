'use strict';

const axios = require('axios');
const { config } = require('../../config/config.js');

const HAX_API = String(config.HAX_MEDIA_API || '').replace(/\/$/, '');

async function requestDownload(url, format = 'auto') {
  if (!HAX_API) throw new Error('HAX media API is not configured');
  const target = String(url || '').trim();
  if (!/^https?:\/\//i.test(target)) throw new Error('A valid URL is required');

  const response = await axios.post(`${HAX_API}/api/download`, { url: target, format }, {
    timeout: 120000,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true
  });
  const data = response.data;
  if (response.status < 200 || response.status >= 300 || !data?.success) {
    throw new Error(data?.error || `Media API returned HTTP ${response.status}`);
  }
  return data.data ?? data;
}

function firstUrl(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value;
  if (typeof value !== 'object') return null;
  for (const key of ['url', 'downloadUrl', 'download_url', 'directUrl', 'direct_url', 'src', 'link']) {
    if (typeof value[key] === 'string' && /^https?:\/\//i.test(value[key])) return value[key];
  }
  return null;
}

function pickMedia(data, type) {
  if (!data) return null;
  const direct = firstUrl(data);
  if (direct) return direct;

  const candidates = type === 'audio'
    ? [data.audio, data.audioUrl, data.audio_url, data.mp3, data.formats?.audio, data.formats?.mp3]
    : [data.video, data.videoUrl, data.video_url, data.mp4, data.formats?.video, data.formats?.mp4];

  for (const candidate of candidates) {
    const url = firstUrl(candidate);
    if (url) return url;
  }

  if (Array.isArray(data.formats)) {
    for (const item of data.formats) {
      const mime = String(item?.mime || item?.type || item?.format || '').toLowerCase();
      const url = firstUrl(item);
      if (url && mime.includes(type)) return url;
    }
  }
  return null;
}

function pickAnyMedia(data) {
  for (const type of ['video', 'audio', 'image', 'document']) {
    const url = pickMedia(data, type);
    if (url) return { type, url };
  }
  return null;
}

function pickTitle(data, fallback = 'Tanu XAI') {
  return String(data?.title || data?.name || data?.metadata?.title || data?.info?.title || fallback);
}

async function searchYouTube(query) {
  const q = String(query || '').trim();
  if (!q) throw new Error('Search query is required');
  const html = await axios.get('https://www.youtube.com/results', {
    params: { search_query: q }, timeout: 20000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }).then(r => r.data);
  const ids = [];
  const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  let match;
  while ((match = re.exec(html)) && ids.length < 5) if (!ids.includes(match[1])) ids.push(match[1]);
  if (!ids.length) throw new Error('No YouTube result found');
  return `https://www.youtube.com/watch?v=${ids[0]}`;
}

async function resolveYouTube(input) {
  const value = String(input || '').trim();
  if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(value)) return value;
  return searchYouTube(value);
}

function safeFilename(value, fallback = 'media') {
  return String(value || fallback).replace(/[^a-z0-9._ -]/gi, '').trim().slice(0, 80) || fallback;
}

module.exports = { HAX_API, requestDownload, firstUrl, pickMedia, pickAnyMedia, pickTitle, resolveYouTube, searchYouTube, safeFilename };
