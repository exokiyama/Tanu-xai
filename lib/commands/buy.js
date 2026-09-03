/**
 * Buy Command - Purchase items from shop
 */

import { getBalance, updateBalance, addItem } from '../utils/rpg.js';
import { query } from '../database/index.js';

export const command = {
  pattern: 'buy',
  aliases: ['purchase'],
  description: 'Buy an item from the shop',
  category: 'rpg',
  usage: 'buy <item_key> [quantity]',
  groupOnly: false,
  ownerOnly: false,
  
  async handler(sock, message, args, context) {
    try {
      const userId = message.sender;
      
      if (args.length === 0) {
        await sock.sendMessage(message.chat, {
          text: '❌ Please specify an item to buy.\n\nUsage: .buy <item_key> [quantity]\nExample: .buy potion_health 5'
        });
        return;
      }
      
      const itemKey = args[0].toLowerCase();
      const quantity = parseInt(args[1]) || 1;
      
      if (quantity <= 0) {
        await sock.sendMessage(message.chat, {
          text: '❌ Quantity must be greater than 0.'
        });
        return;
      }
      
      // Fetch item from database
      let itemResult;
      try {
        itemResult = await query(
          `SELECT * FROM items WHERE item_key = $1`,
          [itemKey]
        );
      } catch (error) {
        console.error('[Buy] Error fetching item:', error.message);
        await sock.sendMessage(message.chat, {
          text: '❌ Failed to fetch item details.'
        });
        return;
      }
      
      if (itemResult.rows.length === 0) {
        await sock.sendMessage(message.chat, {
          text: `❌ Item '${itemKey}' not found!\nUse \`.shop\` to browse available items.`
        });
        return;
      }
      
      const item = itemResult.rows[0];
      
      if (item.buy_price <= 0) {
        await sock.sendMessage(message.chat, {
          text: `❌ ${item.name} cannot be bought directly.`
        });
        return;
      }
      
      const totalCost = item.buy_price * quantity;
      
      // Check balance and purchase with transaction
      const currentBalance = await getBalance(userId);
      
      if (currentBalance < totalCost) {
        await sock.sendMessage(message.chat, {
          text: `❌ Insufficient funds!\n\nItem: ${item.name}\nPrice: 🪙 ${item.buy_price} x ${quantity} = ${totalCost}\nYour Balance: 🪙 ${currentBalance}\n\nYou need 🪙 ${totalCost - currentBalance} more coins.`
        });
        return;
      }
      
      // Deduct money
      const balanceResult = await updateBalance(userId, -totalCost, 'shop_purchase');
      
      if (!balanceResult.success) {
        await sock.sendMessage(message.chat, {
          text: `❌ Purchase failed: ${balanceResult.message}`
        });
        return;
      }
      
      // Add items to inventory
      const addResult = await addItem(userId, itemKey, quantity);
      
      if (!addResult.success) {
        // Refund on failure
        await updateBalance(userId, totalCost, 'refund');
        await sock.sendMessage(message.chat, {
          text: `❌ Failed to add items to inventory. You have been refunded.\n\nError: ${addResult.error}`
        });
        return;
      }
      
      let response = `🛒 *Purchase Successful!*\n\n`;
      response += `Item: ${item.name}\n`;
      response += `Quantity: x${quantity}\n`;
      response += `Unit Price: 🪙 ${item.buy_price}\n`;
      response += `Total: 🪙 ${totalCost.toLocaleString()}\n\n`;
      response += `New Balance: 🪙 ${balanceResult.balance.toLocaleString()}\n`;
      
      await sock.sendMessage(message.chat, {
        text: response,
        contextInfo: { mentionedJid: [userId] }
      });
    } catch (error) {
      console.error('[Buy] Error:', error.message);
      await sock.sendMessage(message.chat, {
        text: '❌ Purchase failed. Please try again.'
      });
    }
  }
};

export default command;
