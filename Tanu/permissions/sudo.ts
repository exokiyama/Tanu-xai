import { phoneFromJid } from '../config.js';
import { isOwner } from './owner.js';
const sudo = new Set<string>();
export const isSudo = (jid: string) => sudo.has(phoneFromJid(jid));
export const addSudo = (jid: string) => { const number = phoneFromJid(jid); if (!number || isOwner(jid)) return false; sudo.add(number); return true; };
export const removeSudo = (jid: string) => sudo.delete(phoneFromJid(jid));
export const listSudo = () => [...sudo];
