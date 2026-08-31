import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'production',
  sessionId: process.env.SESSION_ID || '',
  ownerNumber: process.env.OWNER_NUMBER || '',
  prefix: process.env.PREFIX || '.',
  botName: process.env.BOT_NAME || 'Tanu XAI',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  logLevel: process.env.LOG_LEVEL || 'info'
} as const;

export function validateConfig(): boolean {
  const required = ['sessionId', 'ownerNumber'] as const;
  const missing = required.filter(key => !config[key]);
  
  if (missing.length > 0) {
    console.error(`[CONFIG] Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  if (!config.sessionId.startsWith('Tanu-XAI~')) {
    console.error('[CONFIG] Invalid SESSION_ID format. Must start with "Tanu-XAI~"');
    return false;
  }
  
  return true;
}

export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

export function getBotMode(): 'public' | 'private' {
  return 'public';
}
