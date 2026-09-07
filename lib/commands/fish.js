'use strict';
const { updateBalance, addXP, checkCooldown, setCooldown } = require('../utils/rpg');
module.exports = {
  pattern: 'fish', aliases: [], description: 'Fish for random coins and XP', category: '🎮 RPG', usage: 'fish',
  async handler(sock, message, args, context) {
    const id = message.sender; const cd = await checkCooldown(id, 'fish', 5 * 60 * 1000);
    if (!cd.ready) return context.reply(`🎣 Come back in ${Math.ceil(cd.remainingMs / 60000)} minute(s).`);
    await setCooldown(id, 'fish'); const reward = 40 + Math.floor(Math.random() * 161);
    const xp = 20 + Math.floor(Math.random() * 31); const result = await updateBalance(id, reward, 'fish'); await addXP(id, xp);
    return context.reply(`🎣 *Fishing!*\n\nYou caught a fish worth 🪙 ${reward}.\n⭐ +${xp} XP\n💰 Balance: 🪙 ${result.balance}`);
  }
};
