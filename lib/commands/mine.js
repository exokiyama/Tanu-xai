'use strict';
const { updateBalance, addItem, addXP, checkCooldown, setCooldown } = require('../utils/rpg');
module.exports = {
  pattern: 'mine', aliases: [], description: 'Mine random resources for coins, items and XP', category: '🎮 RPG', usage: 'mine',
  async handler(sock, message, args, context) {
    const id = message.sender; const cd = await checkCooldown(id, 'mine', 10 * 60 * 1000);
    if (!cd.ready) return context.reply(`⛏️ Mine cooldown: ${Math.ceil(cd.remainingMs / 60000)} minute(s) remaining.`);
    await setCooldown(id, 'mine');
    const rolls = [
      ['material_stone', 1, 4, 20], ['material_iron', 1, 2, 80], ['material_wood', 1, 5, 15], ['diamond', 1, 1, 300]
    ];
    const [item, min, max, coin] = rolls[Math.floor(Math.random() * rolls.length)]; const qty = min + Math.floor(Math.random() * (max - min + 1));
    await addItem(id, item, qty); const coins = coin * qty; const balance = await updateBalance(id, coins, 'mine'); const xp = 25 + Math.floor(Math.random() * 36); await addXP(id, xp);
    return context.reply(`⛏️ *Mining Result*\n\n📦 ${item} ×${qty}\n🪙 +${coins} coins\n⭐ +${xp} XP\n💰 Balance: ${balance.balance}`);
  }
};
