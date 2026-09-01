import type { CommandContext } from '../types.js';
import { getSettings } from './settings.js';
import { ownerCards } from '../permissions/owner.js';
import { renderMenu } from './menu-engine.js';
export async function showMenu(ctx: CommandContext) { const settings = getSettings(); await ctx.sock.sendMessage(ctx.chat, { text: `${renderMenu({ style: settings.menustyle })}\n\nUse ${settings.prefix}help <command> for details.\n\n[ CONTACT MAIN OWNER ]` }); }
export async function showOwners(ctx: CommandContext) { await ctx.sock.sendMessage(ctx.chat, { text: `💎 TANU XAI OWNER CARDS\n\n${ownerCards()}` }); }
