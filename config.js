import 'dotenv/config';

export const runtimeConfig = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'production',
  botName: process.env.BOT_NAME ?? 'Tanu XAI',
  prefix: process.env.PREFIX ?? '.',
  mode: process.env.BOT_MODE === 'private' ? 'private' : 'public'
});
