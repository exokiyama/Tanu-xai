'use strict';
const { query } = require('../database');
const { ensureUserExists } = require('../utils/rpg');
module.exports = {
  pattern: 'reg', aliases: ['register'], description: 'Register your RPG profile', category: '🎮 RPG', usage: 'reg <name> <age>',
  async handler(sock, message, args, context) {
    const name = args.slice(0, -1).join(' ').trim();
    const age = Number(args.at(-1));
    if (!name || !Number.isInteger(age) || age < 1 || age > 120) return context.reply('Usage: `.reg <name> <age>`');
    const user = await ensureUserExists(message.sender, null, name);
    await query('UPDATE users SET display_name=$1, age=$2, registered=true, updated_at=NOW() WHERE id=$3', [name, age, user.id]);
    return context.reply(`✅ RPG registration complete.\n\n👤 Name: ${name}\n🎂 Age: ${age}`);
  }
};
