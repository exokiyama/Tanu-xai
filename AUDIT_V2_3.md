# Tanu XAI V2.3 Final Audit

## Architecture

The active runtime is TypeScript under `Tanu/`, with Baileys connection/auth, message and command routing, protection, cache, optional database adapters, and daily-report modules separated by responsibility. The installed Baileys release is `7.0.0-rc14`; no `makeInMemoryStore` import is used.

## Database

`DATABASE_URL` selects the PostgreSQL adapter with a bounded pool, keep-alive, optional SSL detection, and reconnect-safe startup. Without it, local SQLite is used at `./data/tanu-xai.db`. Initialization failure selects the null adapter and does not stop WhatsApp startup. Supabase is not required by the runtime and is no longer a dependency of the database client.

## Auth and events

`SESSION_ID` remains the primary auth input. Auth credentials and signal keys remain outside the application database. Incoming events are retained in bounded memory with TTL, while `getMessage` provides previous-message lookup for Baileys retry operations. Group metadata is cached for approximately five minutes and invalidated on group update events. Full-history synchronization is enabled using the installed API option.

## Commands and menu

The runtime registers 260 commands. The executable audit reports no duplicate names, invalid handlers, or missing metadata. Local handlers include repository information, owner card, profile picture lookup, group JID listing, protection grammar, mode/settings commands, and `.haxtan`. Daily-report triggers and forbidden script/support/version entries are excluded from the public menu. Provider-dependent features remain clearly bounded rather than falsely advertised as functional.

## Reports

The report includes readable timestamped chat-style transcript entries, direction, media, view-once, edited, deleted, chat-count, incoming, and outgoing summaries from events actually observed by the bot. `.haxtan` regenerates the current retained report. Email delivery and automatic scheduling have provider/configuration boundaries and fail gracefully when unconfigured.

## Validation

Build, typecheck, smoke tests, SQLite fallback test, command audit, lint, diff check, dependency audit, secret scan, and tracked-artifact scan passed. Docker CLI was unavailable in the sandbox, so the Dockerfile was reviewed statically rather than built. Live WhatsApp, SMTP, PostgreSQL network connectivity, and provider/media integrations require external credentials/accounts and were not claimed as integration-tested.
