export const isGroupJid = (jid: string) => jid.endsWith('@g.us');
export const normalizeJid = (jid: string) => jid.replace(/:\d+(?=@)/, '').toLowerCase();
export const mentionJid = (phone: string) => `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
