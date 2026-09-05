/**
 * Shop Command - Browse and buy items
 */

const { getBalance, updateBalance, addItem } = require('../utils/rpg.js');
const { query } = require('../database/index.js');
const command = {
  pattern: 'shop',
  aliases: ['store', 'market'],
  description: 'Browse the item shop',
  category: 'rpg',
  usage: 'shop [item_name]',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      // If user specified an item, show details or buy
      if (args.length > 0) {
        const searchTerm = args.join(' ').toLowerCase().replace(/ /g, '_');
        
        // Try to find the item
        let itemResult;
        try {
          itemResult = await query(
            `SELECT * FROM items WHERE item_key ILIKE $1 OR name ILIKE $2`,
            [`%${searchTerm}%`, `%${searchTerm}%`]
          );
        } catch (error) {
          // Fallback for databases without ILIKE
          itemResult = await query(
            `SELECT * FROM items WHERE LOWER(item_key) LIKE LOWER($1) OR LOWER(name) LIKE LOWER($2)`,
            [`%${searchTerm}%`, `%${searchTerm}%`]
          );
        }
        
        if (itemResult.rows.length === 0) {
          await sock.sendMessage(message.chat, {
            text: `❌ Item not found! Use \`.shop\` to browse all items.`
          });
          return;
        }
        
        const item = itemResult.rows[0];
        
        // Show item details with option to buy
        let response = `🏪 *Item Details*\n\n`;
        response += `*Name:* ${item.name}\n`;
        response += `*Category:* ${item.category}\n`;
        response += `*Description:* ${item.description}\n`;
        response += `*Buy Price:* 🪙 ${item.buy_price}\n`;
        response += `*Sell Price:* 🪙 ${item.sell_price}\n`;
        response += `*Usable:* ${item.usable ? 'Yes' : 'No'}\n`;
        response += `*Tradeable:* ${item.tradeable ? 'Yes' : 'No'}\n\n`;
        
        if (item.buy_price > 0) {
          response += `Use: \`.buy ${item.item_key}\` to purchase`;
        } else {
          response += `This item cannot be bought directly.`;
        }
        
        await sock.sendMessage(message.chat, { text: response });
        return;
      }
      
      // Show full shop catalog
      let itemsResult;
      try {
        itemsResult = await query(
          `SELECT * FROM items WHERE buy_price > 0 ORDER BY category, buy_price`
        );
      } catch (error) {
        console.error('[Shop] Error fetching items:', error.message);
        await sock.sendMessage(message.chat, {
          text: '❌ Failed to load shop. Please try again.'
        });
        return;
      }
      
      const items = itemsResult.rows;
      
      // Group by category
      const categories = {};
      for (const item of items) {
        if (!categories[item.category]) {
          categories[item.category] = [];
        }
        categories[item.category].push(item);
      }
      
      const categoryEmojis = {
        consumable: '🧪',
        weapon: '⚔️',
        armor: '🛡️',
        food: '🍖',
        tool: '🔧',
        material: '📦',
        treasure: '💎',
        special: '✨'
      };
      
      let response = `🏪 *Item Shop*\n\n`;
      response += `Welcome to the shop! Browse items below.\n`;
      response += `Use: \`.shop <item>\` for details\n`;
      response += `Use: \`.buy <item>\` to purchase\n\n`;
      
      for (const [category, categoryItems] of Object.entries(categories)) {
        const emoji = categoryEmojis[category] || '📋';
        response += `${emoji} *${category.toUpperCase()}*\n`;
        
        for (const item of categoryItems.slice(0, 5)) { // Limit per category
          response += `• ${item.name} - 🪙 ${item.buy_price}\n`;
        }
        
        if (categoryItems.length > 5) {
          response += `  ...and ${categoryItems.length - 5} more\n`;
        }
        response += '\n';
      }
      
      // Get user balance
      const balance = await getBalance(userId);
      response += `\n💰 Your Balance: 🪙 ${balance.toLocaleString()}`;
      
      await sock.sendMessage(message.chat, {
        text: response,
        contextInfo: { mentionedJid: [userId] }
      });
    } catch (error) {
      console.error('[Shop] Error:', error.message);
      await sock.sendMessage(message.chat, {
        text: '❌ Failed to load shop. Please try again.'
      });
    }
  }
};

// Missing module.exports fixed
module.exports = command;
