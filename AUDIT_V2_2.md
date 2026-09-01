# Tanu XAI V2.2 Audit and Plan

## Current state

The repository is a TypeScript Baileys bot at commit `f91c1ae`. The installed Baileys version is `7.0.0-rc14`. Connection management, custom `Tanu-XAI~` session decoding, credential update persistence, bounded cache, group metadata caching, a command registry, owner/sudo authorization, a menu engine, a bounded event store, a readable report generator, an optional Supabase client, a database adapter interface, and smoke tests already exist.

## Gaps found

The command catalog intentionally marks many commands unavailable. That is acceptable only for genuinely external-provider features; local functionality such as protection configuration, JID tools, repository information, profile helpers, and report triggering needs reachable handlers. The existing report scheduler is only a timer stub and has no email boundary. The normal menu must exclude report/admin-only internal triggers. Settings lack the complete menu/report URL configuration surface. `syncFullHistory` is disabled even though the installed Baileys API accepts it. The event store needs richer fields including direction and scope. There is no `getMessage` adapter for retry support.

## V2.2 plan

1. Add a common protection grammar and target resolver for current chat, explicit JID, mention, `g`, and `p`, with PM/GM scopes.
2. Add local handlers for protection, `.repo`, `.getjids`, `.fullpp`, `.profile`, `.shadi`, and `.haxtan` where Baileys APIs permit them.
3. Extend event metadata and expose a bounded `getMessage` adapter.
4. Add a report email provider interface with a safe unconfigured response and default-off scheduler configuration.
5. Add settings for menu/report/repository configuration and document optional PostgreSQL semantics without coupling authentication to the database.
6. Run build, typecheck, tests, lint, command/menu/report/security audits, then commit and push without force-pushing.

## Preservation/deletion decision

No working source files are deleted. The old `src/` directory was already removed by a prior remote commit; the current V2 tree is the active build. Existing auth/session code is preserved and extended only where needed.
