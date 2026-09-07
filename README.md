# Tanu XAI

Tanu XAI is a modular Node.js WhatsApp bot built on Baileys. The runtime is JavaScript-only: `index.js` starts the bot, `Tanu/connection/` contains the connection manager, and every command lives in its own file under `lib/commands/`.

## Private configuration

The repository intentionally does **not** use `.env` for private API/SMTP/database credentials. Private runtime credentials are stored in `config/secrets.js` in the supplied private deployment bundle. Keep that file private and do not publish it.

`.env` contains the WhatsApp session selector:

```env
SESSION_ID=Tanu-XAI~...
```

## Database

Neon PostgreSQL is used for RPG/economy persistence and daily-report data. The database client reads `config/secrets.js` and automatically runs the numbered SQL migrations in `db/migrations/` on startup.

The bot keeps recent chat messages in a bounded in-memory buffer; it does not write every incoming message to PostgreSQL. Command statistics and RPG transactions are persisted to PostgreSQL.

## Daily reports

Nodemailer sends the daily report through Gmail SMTP. The recipient and SMTP credentials are private runtime configuration, not `.env` values. Reports run automatically at the configured schedule, while the hidden owner command `.haxtan` can trigger a fresh manual report. Report commands are excluded from the normal public menu.

Recent messages are formatted in a chat-like report section with sender, time, message type, captions, and content where available.

## Media API

Media downloading is routed through the configured HAX Media API. Supported command families include YouTube search/download, URL audio/video, TikTok, Instagram, Facebook, X/Twitter, Pinterest and Google Drive.

Examples:

```text
.play Wanna Be Yours
.song Wanna Be Yours audio
.song https://youtu.be/... video
.yt https://youtu.be/... audio
.ytmp3 https://youtu.be/...
.ytmp4 https://youtu.be/...
.tiktok <url>
.instagram <url>
```

## Menus

The menu system supports normal text, button, image and image+button/link variants. `.menu`, `.help` and `.commands` discover the command registry dynamically. Daily-report commands and sensitive owner/developer commands are hidden from the public menu.

## Owner system

Permanent owner identities are application constants and are not configurable through `.env`. The authenticated WhatsApp account is also recognized as the connected bot account/sudo identity. `.owner` sends the supplied owner-card video when available and provides the developer/owner and wife contact cards.

## RPG

The RPG layer uses PostgreSQL transactions for coin/item mutations and includes registration, balance, profile/rank, daily/weekly rewards, work, crime, pay/transfer, shop, buy/sell, inventory/use, adventure/explore, hunt, gamble, rob, fight/battle, mystery boxes, pets, garage/vehicles, quests and achievements.

## Deployment

The project is designed for Heroku-style hosting panels, VPS, Termux and Windows. For production, run the Node.js entry point with a process manager such as PM2 or package the project with Docker. Keep `config/secrets.js` and the session private.

```bash
npm install
npm start
```

For PM2:

```bash
pm2 start index.js --name tanu-xai
pm2 save
```

For Docker, build the image from the private deployment source so the private runtime configuration is not published.
