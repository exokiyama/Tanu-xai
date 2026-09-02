import { register } from '../handlers/commands.js';
const reply = async (ctx: any, text: string) => { await ctx.sock.sendMessage(ctx.chat, { text }); };
register({ name: 'coinflip', category: 'fun', description: 'Flip a virtual coin', handler: async ctx => reply(ctx, Math.random() < 0.5 ? 'Heads' : 'Tails') });
register({ name: 'dice', category: 'fun', description: 'Roll a six-sided die', handler: async ctx => reply(ctx, `🎲 ${1 + Math.floor(Math.random() * 6)}`) });
register({ name: '8ball', category: 'fun', description: 'Ask the magic eight ball', handler: async ctx => reply(ctx, ['Yes.', 'No.', 'Ask again later.', 'Definitely.'][Math.floor(Math.random() * 4)]) });
register({ name: 'rate', category: 'fun', description: 'Give a playful rating', handler: async ctx => reply(ctx, `⭐ Rating: ${Math.floor(Math.random() * 101)}%`) });
register({ name: 'ship', aliases: ['compatibility'], category: 'fun', description: 'Calculate a playful compatibility score', handler: async ctx => reply(ctx, `💞 Compatibility: ${Math.floor(Math.random() * 101)}%`) });
register({ name: 'compliment', category: 'fun', description: 'Send a positive compliment', handler: async ctx => reply(ctx, 'You bring good energy wherever you go.') });
register({ name: 'joke', category: 'fun', description: 'Tell a safe short joke', handler: async ctx => reply(ctx, 'Why did the developer go broke? Because they used up all their cache.') });
