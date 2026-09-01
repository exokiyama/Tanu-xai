import { config, phoneFromJid } from '../config.js';
import { PERMANENT_OWNERS } from '../types.js';
export const isOwner = (jid: string) => { const number = phoneFromJid(jid); return number === config.ownerNumber || number === config.wifeNumber || PERMANENT_OWNERS.some(owner => owner.number === number); };
export const ownerCards = () => PERMANENT_OWNERS.map(owner => `👑 ${owner.name}\n${owner.role}\n+${owner.number}`).join('\n\n');
