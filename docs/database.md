# Database Operations

OpenClassTools uses Supabase Postgres through the server-only REST API. Browser clients never connect with the service-role key.

## Apply the schema

Apply this forward migration to the intended project:

`supabase/migrations/20260725130600_persistent_platform_foundation.sql`

You can paste it into the Supabase SQL editor or use your normal Supabase CLI migration workflow. The migration:

- creates `decks` and immutable `deck_versions`;
- creates `game_sessions` and `game_activity_logs`;
- adds atomic functions for named generation, revisions, rename/archive, and session lifecycle;
- migrates recoverable old telemetry into legacy-marked sessions;
- removes direct `anon` and `authenticated` access;
- grants operational access only to `service_role`.

The application must use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on the server. An anon key is intentionally insufficient.

## Seed system decks

After applying the migration:

```bash
npm run seed:decks
```

The idempotent seed registers built-in content for all eight content games. Existing named decks and versions are not overwritten.

## Data model

- `decks` holds stable identity, game type, display name, current version, and archive state.
- `deck_versions` holds immutable content and generation metadata.
- `game_sessions` points to the exact selected version and records teacher/participant labels and results.
- `game_activity_logs` holds sanitized, optional session events.

Renaming or archiving a deck does not mutate historical content. Administrator content edits create `admin_edit` revisions and advance only `current_version_id`.

## Operational checks

Run:

```sql
select count(*) from public.decks;
select game_type, count(*) from public.game_sessions group by game_type;
```

Confirm no policies or grants give `anon` or `authenticated` access to operational or renamed legacy telemetry tables. This repository intentionally contains no database dump.

