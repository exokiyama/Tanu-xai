import type { CommandContext, Category } from '../types.js';
import { allCommands } from './commands.js';
import { getSettings } from './settings.js';
import { ownerCards } from '../permissions/owner.js';
const labels: Record<Category, string> = { ai: '🤖 AI MENU', owner: '👑 OWNER MENU', group: '👥 GROUP MENU', protection: '🔐 PROTECTION MENU', status: '📱 STATUS MENU', download: '📥 DOWNLOAD MENU', sticker: '🎨 STICKER MENU', media: '🖼️ MEDIA MENU', reaction: '❤️ REACTION MENU', fun: '😂 FUN MENU', game: '🎮 GAME MENU', economy: '💰 ECONOMY MENU', search: '🔎 SEARCH MENU', tools: '🧰 TOOLS MENU', settings: '⚙️ SETTINGS' };
export async function showMenu(ctx: CommandContext) { const settings = getSettings(); const categories = [...new Set(allCommands().map(command => command.category))]; const body = categories.map(category => `${labels[category]}\n${allCommands().filter(command => command.category === category).map(command => `${settings.prefix}${command.name}`).join('  ')}`).join('\n'); await ctx.sock.sendMessage(ctx.chat, { text: `╭━━━『 🩷 ${settings.name} 』━━━╮\n┃\n${body}\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━╯\n\nUse ${settings.prefix}help <command> for details.\n\n[ CONTACT MAIN OWNER ]` }); }
export async function showOwners(ctx: CommandContext) { await ctx.sock.sendMessage(ctx.chat, { text: `💎 TANU XAI OWNER CARDS\n\n${ownerCards()}` }); }
