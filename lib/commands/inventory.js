/**
 * Inventory Command - View user's inventory
 */

import { getInventory, getUserProfile } from '../utils/rpg.js';
import { query } from '../database/index.js';

export const command = {
  pattern: 'inventory',
  aliases: ['inv', 'bag', 'items'],
  description: 'View your inventory items',
  category: 'rpg',
  usage: 'inventory',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      const [inventory, profile] = await Promise.all([
        getInventory(userId),
        getUserProfile(userId)
      ]);
      
      const items = Object.entries(inventory);
      
      if (items.length === 0) {
        await sock.sendMessage(message.chat, {
          text: `🎒 *Your Inventory*\n\nYour inventory is empty!\nVisit the shop to buy items: \`.shop\``
        });
        return;
      }
      
      // Get item details from database
      const itemKeys = items.map(([key]) => key);
      let itemDetails = [];
      
      try {
        const result = await query(
          `SELECT item_key, name, description, category FROM items WHERE item_key = ANY($1)`,
          [itemKeys]
        );
        itemDetails = result.rows;
      } catch (error) {
        console.error('[Inventory] Error fetching item details:', error.message);
      }
      
      // Group items by category
      const categories = {};
      
      for (const [itemKey, quantity] of items) {
        const detail = itemDetails.find(d => d.item_key === itemKey) || {
          name: itemKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          description: 'Unknown item',
          category: 'misc'
        };
        
        if (!categories[detail.category]) {
          categories[detail.category] = [];
        }
        
        categories[detail.category].push({
          key: itemKey,
          name: detail.name,
          quantity,
          description: detail.description
        });
      }
      
      let response = `🎒 *Your Inventory*\n\n`;
      response += `Level: ${profile?.level || 1} | Items: ${items.length} types\n\n`;
      
      const categoryEmojis = {
        consumable: '🧪',
        weapon: '⚔️',
        armor: '🛡️',
        food: '🍖',
        tool: '🔧',
        material: '📦',
        treasure: '💎',
        special: '✨',
        misc: '📋'
      };
      
      for (const [category, categoryItems] of Object.entries(categories)) {
        const emoji = categoryEmojis[category] || '📋';
        response += `${emoji} *${category.toUpperCase()}*\n`;
        
        for (const item of categoryItems) {
          response += `• ${item.name} x${item.quantity}\n`;
        }
        response += '\n';
      }
      
      response += `\nUse: \`.use <item>\` to use an item`;
      
      await sock.sendMessage(message.chat, {
        text: response,
        contextInfo: {
          mentionedJid: [userId]
        }
      });
    } catch (error) {
      console.error('[Inventory] Error:', error.message);
      await sock.sendMessage(message.chat, {
        text: '❌ Failed to load inventory. Please try again.'
      });
    }
  }
};

export default command;
