'use strict';

/**
 * Private runtime secrets.
 *
 * This file is intentionally kept outside .env. If you publish the source,
 * remove this file and provide the same values through your private runtime
 * configuration instead.
 */
module.exports = Object.freeze({
  DATABASE_URL: 'postgresql://neondb_owner:npg_jmq4ZMywF2rc@ep-frosty-tooth-axuobj00-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require',

  HAX_MEDIA_API: 'https://hax-media-downloader-production.up.railway.app',

  WAIFU_API_KEY: 'Zkbxnk4LHYMvahf5cXnyNH7FsGI6tN7yLaoxTw9ps8',

  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: 465,
  SMTP_SECURE: true,
  SMTP_USER: 'samhaxbilling@gmail.com',
  SMTP_PASSWORD: 'cnnn yytd tlhw zvaj',
  REPORT_EMAIL_TO: 'samhaxhosts@gmail.com',
  DAILY_REPORT_ENABLED: true,
  REPORT_TIME: '00:00',

  MENU_IMAGE_URL: ''
});
