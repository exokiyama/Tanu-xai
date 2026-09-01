import { cache } from '../cache/manager.js';
export type ProtectionName = 'antivv' | 'antidelete' | 'antiedit' | 'antirevoke' | 'anticall' | 'antistatus' | 'antilink' | 'antispam' | 'antiflood' | 'antibot' | 'antibadword';
export interface ProtectionRule { enabled: boolean; scope: 'chat' | 'jid'; target?: string; }
export function setProtection(name: ProtectionName, rule: ProtectionRule) { cache.set(`protection:${name}:${rule.target ?? 'chat'}`, rule, 86_400_000); }
export function getProtection(name: ProtectionName, target = 'chat') { return cache.get(`protection:${name}:${target}`) as ProtectionRule | undefined; }
