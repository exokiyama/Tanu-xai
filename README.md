# Tanu XAI V2

Tanu XAI V2 is a lightweight, modular Baileys bot. `index.js` is the production launcher; TypeScript runtime code lives under `Tanu/`, provider boundaries under `lib/`, plugins under `plugins/`, and Supabase code/schema under `db/`.

## Run locally

```bash
cp .env.example .env
# put a complete Tanu-XAI~ session in .env
npm install
npm run dev
```

## Run in production or a panel

```bash
npm install
npm run build
npm start
```

For Pterodactyl/KataBump, set the startup command to `npm start`, add variables from `.env.example` in the panel, and run `npm run build` after source updates. Render, Koyeb, Railway, Heroku-compatible services, VPS, Windows, Termux, and VS Code use the same commands.

## Configuration and security

`SESSION_ID` is required and must retain the external generator format `Tanu-XAI~...`. The adapter decodes supported base64 JSON session payloads in memory and never logs credentials. Supabase is optional at startup: when unavailable, the bot logs a warning and continues with bounded in-memory settings/sudo state. Run `db/migrations/001_initial_schema.sql` in Supabase before enabling persistence. Never commit `.env`, session tokens, API keys, or the Supabase service-role key.

The two permanent owners are fixed in source: **Arman HTX** (`+256788028745`, Professional Dev) and **Tanu Darling** (`+919864179454`, the owner's wife and a permanent owner). No command can modify or remove them. Sudo is separate and can only be delegated by an owner.

## Commands and extensibility

System/tool commands include `.menu`, `.help`, `.alive`, `.ping`, `.runtime`, `.owners`, and `.contact`. Owner/settings commands include `.setsudo`, `.delsudo`, `.getsudo`, `.setname`, `.setprefix`, `.setmode`, `.setwatermark`, `.setpackname`, `.setauthor`, and `.settings`. AI, downloader, search, sticker, and media command names are centrally registered and return honest provider-not-configured responses until integrations are supplied. Add provider implementations under the matching `lib/` directory and register them centrally.

The connection manager uses the current `makeWASocket` API, prevents duplicate sockets, handles logged-out/bad sessions without loops, retries transient failures with exponential backoff, and shuts down on SIGINT/SIGTERM. The cache is TTL-bound and capped. Ordinary messages do not trigger database, AI, downloader, or media work.

## Known limitations

Interactive WhatsApp carousel/button support varies by Baileys and WhatsApp version, so menus and owner cards use reliable text fallbacks. Settings and sudo persistence become durable once Supabase persistence methods are connected. AI, downloaders, search, reactions, media conversion, email, and external plugins require configured provider implementations; this build does not fake those integrations.

## V2.1 audit and feature boundaries

The current-state audit is recorded in [AUDIT_V2_1.md](AUDIT_V2_1.md). Existing session/auth and connection files were preserved; the old uncompiled `src/` tree was kept because no dependency proof justified deleting user-owned code.

The command catalog contains more than 200 metadata entries. Commands that need an external provider are marked `enabled: false` and respond as unavailable rather than pretending to work. The menu engine discovers only enabled commands, preventing the menu from advertising unavailable features.

The event store retains a bounded, expiring set of local message metadata for anti-delete/anti-edit evidence and reports. It cannot reconstruct events never delivered by WhatsApp. The capability map in `Tanu/connection/capabilities.ts` documents this distinction. Group metadata is cached for five minutes and invalidated by the cache boundary rather than fetched for every message.

Daily reports are default-off, owner-controlled integration points. The report generator produces a readable transcript and summary from retained local events; it does not silently archive unlimited conversations or media. Configure durable report storage only through the optional database adapter.

## V2.1 verification

```bash
npm run typecheck
npm test
npm run lint
```

The smoke test covers TTL eviction, permanent-owner authorization, event retention, and report rendering. The installed Baileys version is `7.0.0-rc14`. Supported event declarations were verified against its installed type/runtime files. 
