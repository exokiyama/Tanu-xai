import 'dotenv/config';

const required = ['SESSION_ID'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`[BOOT] Missing environment variables: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  try {
    await import('./Tanu/index.js');
  } catch (error) {
    console.error('[BOOT] Startup failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
