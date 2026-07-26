# Persistent Decks and Analytics Dashboard Design

**Date:** 2026-07-25  
**Status:** Approved for implementation planning

## Objective

Evolve OpenClassTools into a persistent web application that:

- stores reusable, globally available named decks;
- records who hosted and participated in each game;
- records the exact deck generation or revision used in each session;
- provides an unlinked, server-protected administration dashboard for analytics and deck management;
- applies teacher identity and optional teacher-provided Gemini keys consistently across every content generator; and
- removes the retired arcade game completely.

This release does not add teacher accounts. A teacher is identified by a persistent display name, and participants are identified by the team or player labels entered for a game.

## Scope

### Content games with registered decks

The following games support both selecting an existing registered deck and generating a new named deck:

1. Who Am I?
2. Taboo
3. Hangman
4. Who Wants to Be a Millionaire
5. Kelime / Word Game
6. Vocabulary Flashcards
7. Six Thinking Hats
8. LingoParty

Bottle and Wheel remain deckless utility games, but their game sessions are still eligible for telemetry. The retired arcade game and every hub, documentation, deployment, and analytics reference to it are removed.

### Migration strategy

The existing hybrid frontend remains in place:

- React/Vite continues to own the hub, LingoParty, and administration dashboard.
- Stable vanilla HTML/CSS/JavaScript games are adapted through shared browser clients.
- Express remains the only trusted application backend.
- Supabase Postgres becomes the persistent store.

A full React rewrite is explicitly outside this release. Games can migrate to React individually after the shared platform contracts are stable.

## Architecture

Browser clients communicate only with Express. They never receive Supabase credentials or query Supabase directly.

The oversized `server.js` responsibilities will be extracted into focused server modules:

- database connection and repositories;
- deck schemas and content validation;
- generation orchestration;
- game-session recording;
- teacher-context parsing; and
- admin authentication and protected routes.

Existing generation URLs remain compatible during the migration, but their request and response contracts are extended with deck and teacher metadata.

Legacy games share small browser modules for:

- teacher-context access;
- deck listing and selection;
- generation requests; and
- session start/end reporting.

React surfaces use the same HTTP contracts through React-specific hooks or services.

## Database Model

### `decks`

A deck is the stable, human-facing identity of a reusable content collection.

Required fields:

- `id` UUID primary key;
- `game_type` constrained game identifier;
- `name` display name;
- `normalized_name` case-insensitive comparison value;
- `current_version_id` reference to the active revision;
- `is_system` boolean;
- `archived_at` nullable timestamp;
- `created_at` and `updated_at` timestamps.

`game_type` and `normalized_name` are unique together. A duplicate deck name within one game is rejected with a conflict response. The same name may be used by different games.

### `deck_versions`

Deck versions are immutable snapshots. Admin editing creates a new version and advances `decks.current_version_id`; it never changes a historical version.

Required fields:

- `id` UUID primary key;
- `deck_id` foreign key;
- `version_number` monotonically increasing within a deck;
- `content` validated JSONB using a game-specific schema;
- `source` constrained to `system`, `ai`, or `admin_edit`;
- `theme` nullable text;
- `cefr_level` nullable text;
- `generation_parameters` JSONB containing safe, non-secret generation inputs;
- `teacher_display_name` nullable text;
- `ai_provider` nullable text;
- `ai_model` nullable text;
- `teacher_key_used` boolean;
- `created_at` timestamp.

No API key, API-key prefix, prompt containing secrets, or upstream credential error is stored.

### `game_sessions`

A session records the real play event rather than merely an AI request.

Required fields:

- `id` UUID primary key;
- `room_code` nullable for games without Socket.IO rooms;
- `game_type` constrained game identifier;
- `teacher_display_name` text;
- `participant_names` JSONB array of sanitized team or player labels;
- `deck_id` nullable foreign key;
- `deck_version_id` nullable foreign key;
- `status` constrained to `active`, `completed`, or `abandoned`;
- `result` nullable JSONB;
- `started_at`, `ended_at`, and `last_activity_at` timestamps.

Content games record the exact `deck_version_id` that was loaded when play started. Bottle and Wheel use null deck fields. If an administrator edits a deck later, historical sessions still resolve to their original content.

### `game_activity_logs`

The existing activity log table remains available for meaningful granular events. It is not required for every UI interaction. Logs reference a `game_sessions.id` and store sanitized event details only.

### Legacy data

Existing Supabase telemetry rows are retained. They are migrated into the new session representation where possible and identified as legacy records when exact deck or participant information cannot be recovered.

Existing built-in content is seeded as named system decks. System decks are selectable like generated decks. Administrator edits produce a new admin revision while preserving the seeded revision.

## Teacher Settings and Gemini Key Handling

Teacher settings are shared by every content game.

- Teacher/classroom display name is required before generation or recorded play, sanitized, and stored in `localStorage`.
- A custom Gemini key is optional and stored only in `sessionStorage`.
- The key is sent only to an active generation request over HTTPS.
- The server keeps the key only in request memory.
- The key and its prefix are never written to application logs, database rows, analytics, error responses, or browser diagnostics.
- Clearing the key removes it from `sessionStorage`.

Every generator lets the teacher explicitly choose between their session key and the platform key when both are available. If a teacher-provided key fails, the request fails with a safe, actionable error. It does not silently retry with the platform key.

Teacher key use is recorded only as the boolean `teacher_key_used`.

## Deck Workflow

Every content-game setup screen offers two paths.

### Use a registered deck

1. The client requests active decks for its game type.
2. The teacher searches or selects a named deck.
3. The client loads the current validated version.
4. Starting the game records that exact version in the session.

### Generate and register a deck

1. The teacher enters a required deck name.
2. The teacher provides the existing game-specific inputs such as theme, count, and CEFR.
3. The server sanitizes inputs and checks the case-insensitive name constraint.
4. The server calls the explicitly selected Gemini credential source.
5. The server normalizes and validates generated content with the game-specific schema.
6. The deck and initial immutable version are persisted.
7. Only after persistence succeeds does the response report success and make the deck playable.

AI generation never creates an unnamed or local-only deck. All successfully generated decks are globally visible to users of that game.

Public clients cannot submit arbitrary deck JSON. Public deck creation is possible only as the result of a successful, rate-limited, server-validated generation request.

## Game-Session Workflow

Starting a game creates a session using:

- the real Socket.IO room code when one exists;
- the teacher display name;
- native team names from games that already collect them;
- optional comma-separated player names for games without team setup; and
- the selected deck and exact version for content games.

Completing a game updates its status, end time, and safe result summary. A stale active session is later classified as abandoned. Failure to record a session does not destroy an already loaded deck or prevent classroom play; the UI visibly warns that the play session is not being recorded.

No account identity is inferred from teacher names. The dashboard presents teacher and participant names as user-entered labels.

## Administration Dashboard

The React administration surface lives at `/control-center`. Nothing in the normal hub, game cards, navigation, or public documentation links to this route.

An obscure route is not treated as authorization. Access uses a single shared `ADMIN_PASSCODE` supplied through the server environment.

The dashboard contains:

### Analytics

- total sessions;
- sessions by game;
- generated decks and versions;
- teacher display names;
- participant/team labels;
- selected deck and exact version;
- theme and CEFR;
- platform-key versus teacher-key usage;
- session status, start/end time, and results;
- filters for teacher, participant, game, deck, room code, theme, CEFR, status, and date.

### Deck management

- list and filter decks by game;
- inspect current and historical revisions;
- edit content using game-aware fields rather than raw JSON;
- rename a deck subject to the per-game uniqueness constraint;
- publish an edited immutable version;
- archive and restore decks;
- view sessions that used each revision.

Historical deck versions referenced by sessions cannot be deleted or mutated.

### Existing live remote control

The existing Socket.IO remote-control functionality remains available within the protected administration surface. Telemetry/deck management and live remote control are separate dashboard tabs backed by separate modules.

The legacy public `admin.html` entry point is retired or redirected to `/control-center`. Administrative Socket.IO joins and commands require the same valid admin session as the dashboard; possession of a four-character room code alone is no longer sufficient for administrator control.

## Admin Authentication

The server exposes a login endpoint that:

- is rate-limited independently from general API traffic;
- rejects missing production configuration rather than using a default passcode;
- compares passcodes in constant time; and
- returns a short-lived signed session in an HttpOnly cookie.

Cookie requirements:

- `HttpOnly`;
- `SameSite=Strict`;
- `Secure` in production;
- `Path=/` so the React route, protected HTTP APIs, and Socket.IO handshake share the session;
- short lifetime; and
- signed and verified exclusively by the server.

Logout invalidates the browser cookie. Every analytics, session-detail, deck-mutation, and remote-administration endpoint verifies the admin session. Administrative Socket.IO connections verify the cookie during their handshake and re-check authorization before privileged commands. State-changing HTTP requests also require same-origin validation and a CSRF token issued after login. Authentication state is not stored as a plaintext passcode in browser storage.

## Supabase Security

Operational tables are server-only.

- Public `anon` and `authenticated` read/write policies are removed.
- Broad public grants are revoked.
- Row Level Security remains enabled as defense in depth.
- Only server-side credentials may access operational data.
- Server credentials are never exposed through Vite variables, response payloads, HTML, or client JavaScript.
- Database constraints enforce deck-name uniqueness, valid game types, valid session states, version uniqueness, and referential integrity.

The current public read/insert/update telemetry policies are a known security defect and must be removed during the foundation phase before the new dashboard is exposed.

## Validation and Error Handling

Each game has a dedicated deck-content validator. Invalid AI output or invalid admin edits are rejected without changing the active deck version.

Input limits cover:

- teacher, participant, and deck-name lengths;
- theme and CEFR allowlists;
- generation counts;
- maximum card/question counts;
- per-field content lengths; and
- total JSON payload size.

Expected API behavior:

- duplicate deck name: `409 Conflict`;
- invalid deck or generation input: `400 Bad Request`;
- missing or invalid admin session: `401 Unauthorized`;
- forbidden mutation: `403 Forbidden`;
- optimistic-concurrency conflict: `409 Conflict`;
- unavailable persistence: `503 Service Unavailable`;
- rate limit: `429 Too Many Requests`.

Admin edits carry the expected current version. If another edit was published first, the server rejects the stale edit instead of silently overwriting it.

Generated content is not reported as successful until the deck version is stored. Database or AI failures produce safe messages and a trace identifier without returning secrets or raw upstream responses.

## Hub and Game Inventory

The React hub becomes the canonical menu and includes every remaining game, including Hats and Flashcards.

The hub:

- contains no administrator link, including in development;
- retains shared Teacher Settings;
- removes the retired arcade game;
- continues linking stable legacy game pages during incremental migration.

Retired-game removal includes:

- deleting its self-contained directory;
- removing static and React hub entries;
- removing analytics icons/types;
- updating README, test, deployment, and agent documentation;
- excluding obsolete packaged deployment artifacts from source control.

Ordinary Hangman vocabulary is not removed merely because the unrelated arcade game is retired.

## Failure and Degraded Modes

- A failed teacher key never consumes platform quota automatically.
- A failed generation never registers a partial deck.
- A failed admin edit leaves the current version unchanged.
- A temporary session-logging failure displays a visible warning but allows an already loaded game to continue.
- A deck-list failure offers seeded bundled content only when that content can be identified as a system deck; it does not masquerade as a successful database load.
- Dashboard failures preserve authentication state only for the cookie lifetime and display retryable errors without leaking Supabase details.

## Testing and Verification

### Database

- Run migrations against a non-production Supabase branch or local database first.
- Assert table constraints, foreign keys, indexes, and version immutability.
- Verify RLS remains enabled.
- Verify `anon` and `authenticated` cannot read or mutate operational tables.
- Verify the server credential can execute required repository operations.
- Run Supabase security and performance advisors and resolve relevant findings.

### Backend

- Unit-test sanitizers, teacher context, key-source selection, deck validators, and admin-cookie verification.
- Integration-test generation plus persistence for every content game.
- Verify duplicate-name conflicts and per-game name scoping.
- Verify teacher-key failure does not invoke the platform key.
- Verify deck edits create versions and enforce optimistic concurrency.
- Verify session start, completion, abandonment, and exact version references.
- Verify every protected endpoint rejects unauthenticated access.
- Verify logs and responses never contain test API keys.

### Frontend

- Test teacher name persistence and session-only API-key behavior.
- Test registered-deck selection and required-name generation in all eight content games.
- Test participant/team capture and session warnings.
- Test admin login, logout, analytics filters, deck editing, conflicts, archive/restore, and revision history.
- Verify the hub contains all intended games and no admin or retired-game entry.

### End-to-end smoke flow

For each content game:

1. configure teacher settings;
2. generate and name a deck;
3. reload and select that registered deck;
4. start and complete a game with participant labels;
5. authenticate at `/control-center`;
6. locate the session and confirm the exact deck version;
7. edit the deck as an administrator;
8. replay using the new version; and
9. confirm the earlier session still resolves to the original version.

Build, lint, API tests, database verification, and representative browser flows must pass before deployment.

## Delivery Phases

### Phase 1: Secure platform foundation

- create reviewed Supabase migrations;
- secure grants and RLS;
- add modular repositories and validators;
- implement admin authentication;
- standardize teacher context and API-key handling;
- preserve/migrate existing telemetry.

### Phase 2: Deck and session adoption

- add shared deck/session browser clients;
- seed built-in system decks;
- update all eight content games;
- add session tracking to all remaining games;
- restore Hats and Flashcards to the canonical hub.

### Phase 3: Administration and cleanup

- complete analytics and session inspection;
- add game-aware deck editing and revision history;
- integrate protected live remote control;
- remove the retired arcade game and stale references;
- update documentation and deployment configuration;
- execute the full verification matrix.

Each phase must leave the application deployable and independently verifiable.

## Explicit Non-Goals

- Teacher or student user accounts.
- Teacher-private deck libraries.
- Direct browser access to Supabase.
- Full React rewrites of stable legacy games.
- Silent custom-key fallback to the platform key.
- Destructive deletion of historical deck revisions.
