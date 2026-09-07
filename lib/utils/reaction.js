/**
 * Shared reaction helper for sending reaction GIFs/images
 * Uses WAIFU.PICS API or similar reaction APIs
 */

const axios = require('axios');

// Reaction API endpoints by category
const REACTION_APIS = {
  hug: 'https://api.waifu.pics/sfw/hug',
  kiss: 'https://api.waifu.pics/sfw/kiss',
  cuddle: 'https://api.waifu.pics/sfw/cuddle',
  slap: 'https://api.waifu.pics/sfw/slap',
  pat: 'https://api.waifu.pics/sfw/pat',
  bonk: 'https://api.waifu.pics/sfw/bonk',
  bite: 'https://api.waifu.pics/sfw/bite',
  handshake: 'https://api.waifu.pics/sfw/handshake',
  handhold: 'https://api.waifu.pics/sfw/highfive',
  highfive: 'https://api.waifu.pics/sfw/highfive',
  dance: 'https://api.waifu.pics/sfw/dance',
  blush: 'https://api.waifu.pics/sfw/blush',
  cry: 'https://api.waifu.pics/sfw/cry',
  poke: 'https://api.waifu.pics/sfw/poke',
  wave: 'https://api.waifu.pics/sfw/wave',
  smile: 'https://api.waifu.pics/sfw/smile',
  stare: 'https://api.waifu.pics/sfw/stare',
  facepalm: 'https://api.waifu.pics/sfw/facepalm',
  yeet: 'https://api.waifu.pics/sfw/yeet',
  tickle: 'https://api.waifu.pics/sfw/tickle',
  feed: 'https://api.waifu.pics/sfw/feed',
  punch: 'https://api.waifu.pics/sfw/kick',
  kill: 'https://api.waifu.pics/sfw/kick',
  smug: 'https://api.waifu.pics/sfw/smug',
  wink: 'https://api.waifu.pics/sfw/nod',
  nom: 'https://api.waifu.pics/sfw/nom',
  happy: 'https://api.waifu.pics/sfw/smile',
  peck: 'https://api.waifu.pics/sfw/kiss',
  glomp: 'https://api.waifu.pics/sfw/cuddle',
  bully: 'https://api.waifu.pics/sfw/bully',
};

// Caption templates for reactions
const CAPTION_TEMPLATES = {
  hug: '{sender} hugged {target}',
  kiss: '{sender} kissed {target}',
  cuddle: '{sender} cuddled {target}',
  slap: '{sender} slapped {target}',
  pat: '{sender} patted {target}',
  bonk: '{sender} bonked {target}',
  bite: '{sender} bit {target}',
  handshake: '{sender} shook hands with {target}',
  handhold: '{sender} held hands with {target}',
  highfive: '{sender} high-fived {target}',
  dance: '{sender} danced with {target}',
  blush: '{sender} blushed at {target}',
  cry: '{sender} cried because of {target}',
  poke: '{sender} poked {target}',
  wave: '{sender} waved at {target}',
  smile: '{sender} smiled at {target}',
  stare: '{sender} stared at {target}',
  facepalm: '{sender} facepalmed at {target}',
  yeet: '{sender} yeeted {target}',
  tickle: '{sender} tickled {target}',
  feed: '{sender} fed {target}',
  punch: '{sender} punched {target}',
  kill: '{sender} killed {target}',
  smug: '{sender} looked smug at {target}',
  wink: '{sender} winked at {target}',
  nom: '{sender} nommed at {target}',
  happy: '{sender} is happy with {target}',
  peck: '{sender} pecked {target}',
  glomp: '{sender} glomped {target}',
  bully: '{sender} bullied {target}',
};

/**
 * Fetch a reaction GIF URL from API
 * @param {string} action - The reaction type (hug, kiss, etc.)
 * @returns {Promise<string>} - GIF URL
 */
async function fetchReactionGif(action) {
  const endpoint = REACTION_APIS[action.toLowerCase()];
  if (!endpoint) {
    throw new Error(`Unknown reaction type: ${action}`);
  }

  try {
    const response = await axios.get(endpoint, {
      timeout: 10000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    if (response.data && response.data.url) {
      return response.data.url;
    }
    throw new Error('Invalid API response');
  } catch (error) {
    console.error(`Failed to fetch ${action} GIF:`, error.message);
    throw new Error(`Failed to fetch reaction GIF for ${action}`);
  }
}

/**
 * Download GIF from URL as buffer
 * @param {string} url - GIF URL
 * @returns {Promise<Buffer>} - GIF buffer
 */
async function downloadGif(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Failed to download GIF:`, error.message);
    throw new Error('Failed to download reaction GIF');
  }
}

/**
 * Send a reaction message
 * @param {object} sock - WhatsApp socket
 * @param {object} message - Original message object
 * @param {object} options - Reaction options
 */
async function sendReaction(sock, message, options) {
  const {
    action,
    captionTemplate = CAPTION_TEMPLATES[action.toLowerCase()] || '{sender} reacted with {target}',
    targetJid = null
  } = options;

  const chatId = message.chat || message.key?.remoteJid;
  const sender = message.sender || message.key?.participant || message.key?.remoteJid;
  
  // Get target from quoted message or mention
  let target = targetJid;
  if (!target && message.quoted) {
    target = message.quoted.sender;
  }
  
  if (!target) {
    return await sock.sendMessage(chatId, { 
      text: `❌ Please mention someone or reply to their message to ${action}` 
    }, { quoted: message });
  }

  // Format names for caption
  const senderName = message.pushName || sender.split('@')[0];
  const targetName = target.split('@')[0];
  
  const caption = captionTemplate
    .replace('{sender}', `@${senderName}`)
    .replace('{target}', `@${targetName}`);

  try {
    // Fetch and download reaction GIF
    const gifUrl = await fetchReactionGif(action);
    const gifBuffer = await downloadGif(gifUrl);

    // Send as video with caption and mentions
    await sock.sendMessage(chatId, {
      video: gifBuffer,
      caption: caption,
      gifPlayback: true,
      mentions: [sender, target]
    }, { quoted: message });

  } catch (error) {
    console.error('Reaction error:', error);
    await sock.sendMessage(chatId, { 
      text: `❌ Failed to send ${action} reaction: ${error.message}` 
    }, { quoted: message });
  }
}

/**
 * Get list of available reactions
 * @returns {string[]} - Array of reaction names
 */
function getAvailableReactions() {
  return Object.keys(REACTION_APIS);
}

/**
 * Check if a reaction type exists
 * @param {string} action - Reaction name
 * @returns {boolean}
 */
function isValidReaction(action) {
  return Object.keys(REACTION_APIS).includes(action.toLowerCase());
}

module.exports = {
  sendReaction,
  fetchReactionGif,
  downloadGif,
  getAvailableReactions,
  isValidReaction,
  REACTION_APIS,
  CAPTION_TEMPLATES
};
