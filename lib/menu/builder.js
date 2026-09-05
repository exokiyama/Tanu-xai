/**
 * Menu Builder - Dynamically generates menus based on loaded commands
 * Supports: normal, button, image, image-button styles
 * Automatically groups commands by category
 * Excludes sensitive commands from public menu
 */

const config = require('../config/config');

// Commands explicitly excluded from public menu
const EXCLUDED_COMMANDS = new Set([
  'dailyreport',
  'report',
  'reportretention',
  'reporttime',
  'reporttarget',
  'haxtan' // .haxtan
]);

// Categories that are NEVER shown in public menu
const HIDDEN_CATEGORIES = new Set([
  'developer' // Developer/debug commands are always hidden
]);

/**
 * Generate menu text based on style and commands
 * @param {Array} commands - Array of command objects from registry
 * @param {string} style - Menu style: 'normal', 'button', 'image', 'image-button'
 * @param {boolean} isOwner - Whether the user is an owner (shows hidden commands)
 * @returns {object} Menu object with text, buttons, image options
 */
function generateMenu(commands, style = 'normal', isOwner = false) {
  // Filter commands based on ownership and hidden flag
  const filteredCommands = commands.filter(cmd => {
    // Always exclude sensitive commands unless owner
    if (EXCLUDED_COMMANDS.has(cmd.name)) {
      return isOwner;
    }
    // Also respect the hidden flag in command metadata
    if (cmd.hidden && !isOwner) {
      return false;
    }
    return true;
  });

  // Group commands by category
  const grouped = groupByCategory(filteredCommands);

  // Generate menu based on style
  switch (style) {
    case 'button':
      return generateButtonMenu(grouped, isOwner);
    case 'image':
      return generateImageMenu(grouped, isOwner);
    case 'image-button':
      return generateImageButtonMenu(grouped, isOwner);
    case 'normal':
    default:
      return generateNormalMenu(grouped, isOwner);
  }
}

/**
 * Group commands by their category
 */
function groupByCategory(commands) {
  const groups = {};
  
  for (const cmd of commands) {
    // Skip commands in hidden categories
    if (HIDDEN_CATEGORIES.has(cmd.category)) {
      continue;
    }
    
    const category = cmd.category || '📦 General';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(cmd);
  }
  
  return groups;
}

/**
 * Generate normal text menu
 */
function generateNormalMenu(grouped, isOwner) {
  let text = `╭───「 ${config.BOT_NAME} 」───⊷\n`;
  text += `│ Welcome to ${config.BOT_NAME}!\n`;
  text += `│ Type ${config.PREFIX}menu <category> for details\n`;
  text += `╰────────────────────⊷\n\n`;

  const categoryOrder = [
    '👑 Owner',
    '🤖 AI',
    '🛡️ Protection',
    '🎮 RPG',
    '🎨 Image',
    '🔧 Tools',
    '📊 Info',
    '📦 General'
  ];

  const categories = Object.keys(grouped).sort((a, b) => {
    const idxA = categoryOrder.indexOf(a);
    const idxB = categoryOrder.indexOf(b);
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  for (const category of categories) {
    text += `*${category}*\n`;
    for (const cmd of grouped[category]) {
      const aliases = cmd.aliases && cmd.aliases.length > 0 
        ? ` (${cmd.aliases.map(a => config.PREFIX + a).join(', ')})` 
        : '';
      text += `  ◦ ${config.PREFIX}${cmd.pattern}${aliases}\n`;
      if (cmd.description) {
        text += `    └ ${cmd.description}\n`;
      }
    }
    text += '\n';
  }

  text += `╭────────────────────⊷\n`;
  text += `│ Total Commands: ${countCommands(grouped)}\n`;
  text += `│ Powered by Tanu-xai\n`;
  text += `╰────────────────────⊷`;

  return {
    type: 'text',
    text,
    buttons: [],
    image: null
  };
}

/**
 * Generate button-style menu
 */
function generateButtonMenu(grouped, isOwner) {
  const { text } = generateNormalMenu(grouped, isOwner);
  
  const buttons = [];
  const categories = Object.keys(grouped);
  
  // Create buttons for top categories (max 3 for WhatsApp limit)
  const topCategories = categories.slice(0, 3);
  for (const cat of topCategories) {
    buttons.push({
      type: 'reply',
      reply: {
        display_text: cat,
        id: `${config.PREFIX}menu ${cat.toLowerCase().replace(/[^a-z]/g, '')}`
      }
    });
  }
  
  // Add help button
  buttons.push({
    type: 'reply',
    reply: {
      display_text: 'ℹ️ Help',
      id: `${config.PREFIX}help`
    }
  });

  return {
    type: 'button',
    text,
    buttons,
    image: null
  };
}

/**
 * Generate image-style menu (returns image URL placeholder)
 */
function generateImageMenu(grouped, isOwner) {
  const { text } = generateNormalMenu(grouped, isOwner);
  
  // In production, this would generate an actual image
  // For now, return a placeholder with the text as caption
  return {
    type: 'image',
    text,
    buttons: [],
    image: {
      url: config.MENU_IMAGE_URL || null,
      caption: text
    }
  };
}

/**
 * Generate image + button menu
 */
function generateImageButtonMenu(grouped, isOwner) {
  const normalMenu = generateNormalMenu(grouped, isOwner);
  const buttonMenu = generateButtonMenu(grouped, isOwner);
  
  return {
    type: 'image-button',
    text: normalMenu.text,
    buttons: buttonMenu.buttons,
    image: {
      url: config.MENU_IMAGE_URL || null,
      caption: normalMenu.text
    }
  };
}

/**
 * Count total commands in grouped object
 */
function countCommands(grouped) {
  let count = 0;
  for (const category of Object.keys(grouped)) {
    count += grouped[category].length;
  }
  return count;
}

/**
 * Get single command help
 */
function getCommandHelp(command, prefix = config.PREFIX) {
  if (!command) {
    return {
      type: 'text',
      text: 'Command not found.',
      buttons: [],
      image: null
    };
  }

  let text = `╭───「 Command Info 」───⊷\n`;
  text += `│ *Name:* ${prefix}${command.pattern}\n`;
  
  if (command.aliases && command.aliases.length > 0) {
    text += `│ *Aliases:* ${command.aliases.map(a => prefix + a).join(', ')}\n`;
  }
  
  text += `│ *Category:* ${command.category || 'General'}\n`;
  
  if (command.description) {
    text += `│ *Description:* ${command.description}\n`;
  }
  
  if (command.usage) {
    text += `│ *Usage:* ${command.usage}\n`;
  }
  
  if (command.permissions && command.permissions.length > 0) {
    text += `│ *Permissions:* ${command.permissions.join(', ')}\n`;
  }
  
  text += `╰────────────────────⊷`;

  return {
    type: 'text',
    text,
    buttons: [],
    image: null
  };
}

module.exports = {
  generateMenu,
  getCommandHelp,
  EXCLUDED_COMMANDS
};
