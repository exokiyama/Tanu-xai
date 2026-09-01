# Tanu XAI V2.1 Current-State Audit

## Scope

The repository was audited at commit `7707d65` before V2.1 changes. The audit covered the directory tree, package metadata and lockfile, TypeScript configuration, entrypoints, connection/auth code, command/message handling, permissions, cache, database, menus, plugins, and utility modules.

## Findings

| Area | Finding | V2.1 action |
|---|---|---|
| Entry points | Root `index.js` starts compiled `dist/Tanu/index.js`; this is valid for panels. | Keep and document. |
| Baileys | Installed version is `@whiskeysockets/baileys ^7.0.0-rc14`; the current manager uses `makeWASocket` and avoids removed `makeInMemoryStore`. | Preserve API choice and add event capability coverage. |
| Session | Session adapter decodes `Tanu-XAI~` base64 JSON into an in-memory key store, but does not persist credential/key updates to a session directory. | Add persistence adapter without putting auth in the RPG/report DB. |
| Connection | Reconnect and shutdown exist; event wiring is concentrated in the manager and message handler calls `groupMetadata()` for every group message. | Add cache-first metadata and listener cleanup. |
| Commands | The registry exists, but most feature command names are registered together in `Tanu/plugins.ts`; command metadata lacks enabled/private/bot-admin details. | Split catalogs and add structured metadata. |
| Menus | Text menu is generated from the registry, but only one style is implemented and configurable links/media are absent. | Add menu engine with honest text fallback and styles. |
| Protection | No anti-delete/edit/view-once event store or target-JID settings exist. | Add bounded event/message store and explicit capability-limited protection. |
| Reports | Only a default-off scheduler stub exists; no readable transcript collector/generator exists. | Add in-memory event pipeline, owner-only report generation, retention, and summary. |
| Database | Supabase client is optional, but repositories are minimal and feature code has no replaceable adapter contract. | Add provider-neutral adapter boundary. |
| Owner/profile | Fixed owners and sudo exist; profile/fullpp/owner-card commands are incomplete. | Add owner/profile command boundaries and clear resolution limits. |
| Testing/lint | Build/typecheck pass; no test script or ESLint config exists. | Add deterministic smoke tests and a valid lint configuration. |
| Security | `.env` is ignored and no secrets were found. | Extend ignore rules for auth/session directories and scan again. |

## Kept files

No manually modified session-generator files were found in the repository. Existing V2 connection/auth files are kept and extended rather than deleted. The old `src/` tree remains uncompiled to avoid deleting potentially user-owned code without dependency proof.

## Planned removals

No source files are removed in V2.1. Empty placeholder directories are retained where they document provider boundaries.
