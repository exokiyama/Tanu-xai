const fs = require('fs');
const path = require('path');

// Simple in-memory config cache
let configCache = {};

function loadConfig() {
  try {
    const configPath = path.join(__dirname, '../../config/config.js');
    if (fs.existsSync(configPath)) {
      configCache = require(configPath);
    }
  } catch (error) {
    console.error('[ConfigManager] Failed to load config:', error.message);
  }
  return configCache;
}

function getConfig(key) {
  if (Object.keys(configCache).length === 0) loadConfig();
  return key ? configCache[key] : configCache;
}

function setConfig(key, value) {
  if (Object.keys(configCache).length === 0) loadConfig();
  configCache[key] = value;
  // Note: Persistent saving to DB/JSON should be handled by specific commands
}

module.exports = {
  loadConfig,
  getConfig,
  setConfig
};
