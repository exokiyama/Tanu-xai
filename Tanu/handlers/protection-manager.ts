import { cache } from '../cache/manager.js';
import { isGroupJid, normalizeJid, mentionJid } from '../utils/jid.js';
import type { CommandContext } from '../types.js';
import { listSudo } from '../permissions/sudo.js';
export type ProtectionName = 'antivv' | 'antidelete' | 'antiedit' | 'antirevoke' | 'anticall' | 'antistatus' | 'antilink' | 'antispam' | 'antiflood' | 'antibot' | 'antibadword' | 'protectstatus' | 'protectmedia' | 'protectchat' | 'preserve';
export interface ProtectionRule { enabled: boolean; target: string; scopes: Array<'pm' | 'gm'>; }
export function resolveProtectionTarget(ctx: CommandContext, raw?: string): string { if (!raw || raw === 'g') return ctx.chat; if (raw === 'p') { const sudo = listSudo()[0]; return sudo ? mentionJid(sudo) : ctx.chat; } if (raw.includes('@')) return normalizeJid(raw); if (/^\d{7,20}$/.test(raw)) return mentionJid(raw); return ctx.chat; }
export function parseProtection(ctx: CommandContext): ProtectionRule | null { const args = [...ctx.args]; if (args[0] === 'off') return { enabled: false, target: ctx.chat, scopes: [] }; const explicit = args[0] && (args[0] === 'g' || args[0] === 'p' || args[0].includes('@') || /^\d{7,20}$/.test(args[0])) ? args.shift() : undefined; const scopes = args.filter(arg => arg === 'pm' || arg === 'gm').filter((value, index, all) => all.indexOf(value) === index) as Array<'pm' | 'gm'>; return { enabled: true, target: resolveProtectionTarget(ctx, explicit), scopes }; }
export function setProtection(name: ProtectionName, rule: ProtectionRule) { cache.set(`protection:${name}:${rule.target}`, rule, 86_400_000); }
export function getProtection(name: ProtectionName, target: string) { return cache.get(`protection:${name}:${normalizeJid(target)}`) as ProtectionRule | undefined; }
export function formatProtection(name: ProtectionName, rule: ProtectionRule) { return `${name}: ${rule.enabled ? 'on' : 'off'}\nTarget: ${isGroupJid(rule.target) ? 'group' : rule.target}\nScope: ${rule.scopes.join(', ') || 'all'}`; }
