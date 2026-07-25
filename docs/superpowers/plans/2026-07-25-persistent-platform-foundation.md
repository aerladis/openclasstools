# Persistent Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the secure Supabase schema, server repositories, teacher-context handling, session APIs, and passcode-protected admin session required by persistent decks.

**Architecture:** Express remains the only public data boundary. Focused ESM modules under `server/` use a server-only PostgreSQL pool, game-specific validators, and dependency-injected repositories; `server.js` mounts their routers and reuses the existing AI provider functions during the migration.

**Tech Stack:** Node.js 18+, Express 4.21, native `node:test`, `pg`, PostgreSQL 17/Supabase, Socket.IO 4.8.

## Global Constraints

- Browser code must never receive Supabase or database credentials.
- `ADMIN_PASSCODE` has no hardcoded production fallback.
- Teacher display name is required for generation and recorded play.
- Teacher Gemini keys remain request-memory-only and must never be logged or persisted.
- A failed teacher key must not retry with the platform key.
- Operational tables retain RLS and grant no access to `anon` or `authenticated`.
- Existing telemetry rows must survive migration as legacy sessions.
- All code is ESM and uses `const`, `let`, async/await, and focused modules.

---

## File Map

- `supabase/migrations/20260725130600_persistent_platform_foundation.sql`: schema, data migration, constraints, grants, and RLS.
- `server/config.js`: validated server configuration.
- `server/db/pool.js`: PostgreSQL pool lifecycle.
- `server/domain/game-types.js`: canonical game identifiers.
- `server/domain/deck-schemas.js`: normalization and validation for every deck type.
- `server/repositories/deck-repository.js`: deck/version persistence.
- `server/repositories/session-repository.js`: play-session persistence.
- `server/security/admin-session.js`: signed-cookie and CSRF primitives.
- `server/http/teacher-context.js`: sanitized teacher/key selection.
- `server/routes/decks.js`: public deck reads and internal generation persistence contract.
- `server/routes/sessions.js`: public session lifecycle.
- `server/routes/admin-auth.js`: admin login/session/logout.
- `server/routes/admin-data.js`: protected session/deck data endpoints.
- `tests/`: native Node tests mirroring the server modules.
- `server.js`: composition root and existing generation/socket integration.

### Task 1: Test Harness, Configuration, and Database Migration

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `server/config.js`
- Create: `server/db/pool.js`
- Create: `tests/config.test.js`
- Create: `supabase/migrations/20260725130600_persistent_platform_foundation.sql`

**Interfaces:**
- Produces: `loadConfig(env, { production }) -> AppConfig`
- Produces: `createPool(databaseUrl) -> pg.Pool`
- Produces database tables `decks`, `deck_versions`, `game_sessions`, and `game_activity_logs`

- [ ] **Step 1: Add a failing configuration test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../server/config.js';

test('production rejects missing admin and database secrets', () => {
  for (const name of ['DATABASE_URL', 'ADMIN_PASSCODE', 'ADMIN_SESSION_SECRET']) {
    assert.throws(
      () => loadConfig({ NODE_ENV: 'production' }, { production: true }),
      new RegExp(name)
    );
  }
});

test('configuration never invents an admin passcode', () => {
  const config = loadConfig({ NODE_ENV: 'test' }, { production: false });
  assert.equal(config.adminPasscode, '');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/config.test.js`  
Expected: FAIL because `server/config.js` does not exist.

- [ ] **Step 3: Add the minimal configuration and pool implementation**

```js
// server/config.js
export function loadConfig(env = process.env, { production = env.NODE_ENV === 'production' } = {}) {
  const config = {
    nodeEnv: env.NODE_ENV || 'development',
    databaseUrl: env.DATABASE_URL || '',
    adminPasscode: env.ADMIN_PASSCODE || '',
    adminSessionSecret: env.ADMIN_SESSION_SECRET || '',
    cookieSecure: production
  };
  const missing = [
    ['DATABASE_URL', config.databaseUrl],
    ['ADMIN_PASSCODE', config.adminPasscode],
    ['ADMIN_SESSION_SECRET', config.adminSessionSecret]
  ].filter(([, value]) => !value).map(([name]) => name);
  if (production && missing.length) throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  return config;
}
```

```js
// server/db/pool.js
import pg from 'pg';

export function createPool(databaseUrl) {
  if (!databaseUrl) return null;
  return new pg.Pool({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 10
  });
}
```

Add `"test": "node --test"` to root scripts and pin `pg` in dependencies. Document `DATABASE_URL`, `ADMIN_PASSCODE`, and `ADMIN_SESSION_SECRET` in `.env.example`; retain no real values.

- [ ] **Step 4: Run configuration tests and install lockfile changes**

Run: `npm install`  
Run: `npm test -- tests/config.test.js`  
Expected: PASS.

- [ ] **Step 5: Create the migration through the Supabase CLI**

Run: `supabase --version`  
Run: `supabase migration new persistent_platform_foundation`

Use the generated filename. The migration must:

```sql
begin;

alter table if exists public.game_activity_logs rename to telemetry_game_activity_logs_legacy;
alter table if exists public.game_sessions rename to telemetry_game_sessions_legacy;

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  game_type text not null check (game_type in ('who','taboo','hangman','millionaire','kelime','flashcards','hats','lingoparty')),
  name varchar(100) not null check (char_length(btrim(name)) between 1 and 100),
  normalized_name text generated always as (lower(btrim(name))) stored,
  current_version_id uuid,
  is_system boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_type, normalized_name)
);

create table public.deck_versions (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  content jsonb not null check (jsonb_typeof(content) in ('array','object')),
  source text not null check (source in ('system','ai','admin_edit')),
  theme varchar(200),
  cefr_level varchar(4),
  generation_parameters jsonb not null default '{}'::jsonb,
  teacher_display_name varchar(120),
  ai_provider varchar(40),
  ai_model varchar(120),
  teacher_key_used boolean not null default false,
  created_at timestamptz not null default now(),
  unique (deck_id, version_number)
);

alter table public.decks
  add constraint decks_current_version_fkey
  foreign key (current_version_id) references public.deck_versions(id) on delete restrict;

create table public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code varchar(12),
  game_type text not null check (game_type in ('who','taboo','hangman','millionaire','kelime','flashcards','hats','lingoparty','bottle','wheel')),
  teacher_display_name varchar(120) not null,
  participant_names jsonb not null default '[]'::jsonb check (jsonb_typeof(participant_names) = 'array'),
  deck_id uuid references public.decks(id) on delete restrict,
  deck_version_id uuid references public.deck_versions(id) on delete restrict,
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  result jsonb,
  legacy_source_id uuid,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_activity_at timestamptz not null default now()
);

create table public.game_activity_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  event_type varchar(80) not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.game_sessions (
  room_code, game_type, teacher_display_name, participant_names, status,
  result, legacy_source_id, started_at, ended_at, last_activity_at
)
select
  game_id, game_type, coalesce(nullif(btrim(teacher_name), ''), 'Legacy Teacher'),
  coalesce(team_names, '[]'::jsonb), 'completed',
  jsonb_strip_nulls(jsonb_build_object(
    'legacy', true,
    'theme', theme,
    'cefrLevel', cefr_level,
    'questionCount', question_count,
    'teacherKeyUsed', custom_api_key_used,
    'winnerTeam', winner_team,
    'finalScores', final_scores
  )),
  id, created_at, updated_at, updated_at
from public.telemetry_game_sessions_legacy;

alter table public.decks enable row level security;
alter table public.deck_versions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_activity_logs enable row level security;

revoke all on public.decks, public.deck_versions, public.game_sessions, public.game_activity_logs from anon, authenticated;
grant all on public.decks, public.deck_versions, public.game_sessions, public.game_activity_logs to service_role;

commit;
```

- [ ] **Step 6: Verify the migration on a development branch/local database**

Run the migration against a non-production target, then query:

```sql
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('decks','deck_versions','game_sessions','game_activity_logs');

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('decks','deck_versions','game_sessions','game_activity_logs')
  and grantee in ('anon','authenticated');
```

Expected: four rows with `rowsecurity = true`; zero privilege rows for `anon`/`authenticated`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .env.example server/config.js server/db/pool.js tests/config.test.js supabase/migrations
git commit -m "feat(platform): add secure database foundation"
```

### Task 2: Canonical Game Types and Deck Validation

**Files:**
- Create: `server/domain/game-types.js`
- Create: `server/domain/deck-schemas.js`
- Create: `tests/deck-schemas.test.js`

**Interfaces:**
- Produces: `CONTENT_GAME_TYPES: readonly string[]`
- Produces: `normalizeDeckContent(gameType, content) -> normalized content`
- Throws: `DeckValidationError` with a public-safe message

- [ ] **Step 1: Write failing schema tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDeckContent, DeckValidationError } from '../server/domain/deck-schemas.js';

test('normalizes Taboo cards and strips unknown properties', () => {
  assert.deepEqual(normalizeDeckContent('taboo', [
    { word: 'Orbit', forbidden: ['space', 'planet', 'circle'], secret: 'remove' }
  ]), [{ word: 'Orbit', forbidden: ['space', 'planet', 'circle'] }]);
});

test('rejects malformed Millionaire questions', () => {
  assert.throws(
    () => normalizeDeckContent('millionaire', [{ question: 'Broken', options: ['A'], correct: 9 }]),
    DeckValidationError
  );
});

test('rejects unsupported game types', () => {
  assert.throws(() => normalizeDeckContent('bottle', []), /Unsupported deck game/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/deck-schemas.test.js`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement minimal validators**

Implement explicit normalizers for:

```js
export const CONTENT_GAME_TYPES = Object.freeze([
  'who', 'taboo', 'hangman', 'millionaire',
  'kelime', 'flashcards', 'hats', 'lingoparty'
]);

export class DeckValidationError extends Error {}

export function normalizeDeckContent(gameType, content) {
  const normalizer = NORMALIZERS[gameType];
  if (!normalizer) throw new DeckValidationError(`Unsupported deck game: ${gameType}`);
  const normalized = normalizer(content);
  if (!Array.isArray(normalized) || normalized.length === 0 || normalized.length > 200) {
    throw new DeckValidationError('Deck must contain between 1 and 200 entries');
  }
  return normalized;
}
```

Each game normalizer returns only its supported fields and applies the same constraints already expected by its client:

- `who`: non-empty character strings;
- `taboo`: `{ word, forbidden[3..8] }`;
- `hangman`: `{ word, category }`;
- `millionaire`: `{ question, options[4], correct: 0..3 }`;
- `kelime`: `{ question, answer }`;
- `flashcards`: `{ word, meaning }`;
- `hats`: `{ color, questions[], starters[] }`;
- `lingoparty`: supported challenge discriminated union.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/deck-schemas.test.js`  
Expected: PASS.

- [ ] **Step 5: Add boundary tests and refactor**

Add tests for empty decks, 201 entries, field-length limits, invalid CEFR-independent content, and every valid LingoParty card type. Extract shared `cleanText(value, maxLength)` only after tests are green.

- [ ] **Step 6: Commit**

```bash
git add server/domain tests/deck-schemas.test.js
git commit -m "feat(platform): validate game deck content"
```

### Task 3: Deck Repository and Public Read API

**Files:**
- Create: `server/repositories/deck-repository.js`
- Create: `server/routes/decks.js`
- Create: `tests/deck-repository.test.js`
- Create: `tests/decks-route.test.js`
- Modify: `server.js`

**Interfaces:**
- Produces: `createDeckRepository(pool)`
- Produces repository methods:
  - `listCurrent(gameType)`
  - `getVersion(deckId, versionId?)`
  - `createGenerated(input)`
  - `createRevision(input)`
  - `rename(deckId, name, expectedVersionId)`
  - `setArchived(deckId, archived, expectedVersionId)`
- Produces: `createDeckRouter({ repository })`
- HTTP: `GET /api/decks?gameType=taboo`
- HTTP: `GET /api/decks/:deckId`

- [ ] **Step 1: Write a failing repository contract test**

```js
test('createGenerated inserts a deck and immutable version in one transaction', async () => {
  const calls = [];
  const client = { query: async (text, params) => {
    calls.push({ text, params });
    if (text === 'BEGIN' || text === 'COMMIT') return { rows: [] };
    if (text.includes('insert into decks')) return { rows: [{ id: 'deck-1' }] };
    if (text.includes('insert into deck_versions')) return { rows: [{ id: 'version-1', version_number: 1 }] };
    if (text.includes('update decks')) return { rows: [{ id: 'deck-1', current_version_id: 'version-1' }] };
    return { rows: [] };
  }, release() {} };
  const pool = { connect: async () => client, query: (...args) => client.query(...args) };
  const repository = createDeckRepository(pool);
  const result = await repository.createGenerated({
    gameType: 'who',
    name: 'Space Heroes',
    content: ['Leia'],
    source: 'ai',
    teacherDisplayName: 'Ms A',
    teacherKeyUsed: false
  });
  assert.equal(result.versionId, 'version-1');
  assert.deepEqual(calls.map(call => call.text === 'BEGIN' || call.text === 'COMMIT' ? call.text : call.text.split(' ')[0]), ['BEGIN', 'insert', 'insert', 'update', 'COMMIT']);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/deck-repository.test.js`  
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement transaction-safe repository methods**

`createGenerated` must acquire one client with `pool.connect()`, then `BEGIN`, insert the deck, insert version 1, update `current_version_id`, and `COMMIT`; on error it must `ROLLBACK`, and it must release the client in `finally`. Translate PostgreSQL unique violation `23505` to a typed `DeckNameConflictError`.

`createRevision` must lock the deck row with `FOR UPDATE`, compare `current_version_id` with `expectedVersionId`, calculate `max(version_number) + 1`, insert the immutable revision, advance the deck, and commit.

- [ ] **Step 4: Verify repository GREEN**

Run: `node --test tests/deck-repository.test.js`  
Expected: PASS, including rollback and optimistic-conflict tests.

- [ ] **Step 5: Write failing public route tests**

Use a minimal ephemeral Express server and real HTTP requests:

```js
test('GET /api/decks filters by canonical content game type', async () => {
  const repository = { listCurrent: async gameType => [{ id: 'd1', gameType, name: 'Starter' }] };
  const response = await request(createDeckRouter({ repository }), '/api/decks?gameType=taboo');
  assert.equal(response.status, 200);
  assert.equal((await response.json()).decks[0].gameType, 'taboo');
});
```

Also assert `400` for `bottle` and ensure archived decks are absent from public results.

- [ ] **Step 6: Implement and mount the router**

Return safe DTOs:

```js
{
  id,
  gameType,
  name,
  currentVersion: {
    id, versionNumber, content, source, theme, cefrLevel, createdAt
  }
}
```

Mount before static middleware:

```js
app.use('/api/decks', createDeckRouter({ repository: deckRepository }));
```

- [ ] **Step 7: Verify route and regression tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/repositories/deck-repository.js server/routes/decks.js tests server.js
git commit -m "feat(platform): expose registered deck reads"
```

### Task 4: Teacher Context and Atomic Generation Registration

**Files:**
- Create: `server/http/teacher-context.js`
- Create: `server/services/generation-service.js`
- Create: `tests/teacher-context.test.js`
- Create: `tests/generation-service.test.js`
- Modify: `server.js`

**Interfaces:**
- Produces: `extractTeacherContext(req, config) -> { teacherDisplayName, keySource, apiKey, teacherKeyUsed }`
- Produces: `createGenerationService({ generators, deckRepository })`
- Produces: `generateAndRegister({ gameType, deckName, generationInput, teacherContext })`

- [ ] **Step 1: Write failing teacher-context tests**

```js
test('teacher key selection never falls back to platform credentials', () => {
  const context = extractTeacherContext({
    headers: {
      'x-teacher-name': '  Ms Ada  ',
      'x-ai-key-source': 'teacher',
      'x-gemini-api-key': 'teacher-secret-key-123'
    },
    body: {}
  }, { geminiApiKey: 'platform-key' });
  assert.deepEqual(context, {
    teacherDisplayName: 'Ms Ada',
    keySource: 'teacher',
    apiKey: 'teacher-secret-key-123',
    teacherKeyUsed: true
  });
});

test('missing teacher name is rejected', () => {
  assert.throws(() => extractTeacherContext({ headers: {}, body: {} }, {}), /Teacher name is required/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/teacher-context.test.js`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement sanitized explicit key selection**

Accept only `x-ai-key-source: teacher|platform`. For `teacher`, require a plausible `x-gemini-api-key`. For `platform`, require configured `GEMINI_API_KEY`. Do not return the key in any DTO.

- [ ] **Step 4: Write a failing no-fallback service test**

```js
test('teacher generator failure does not invoke platform generator', async () => {
  let platformCalls = 0;
  const service = createGenerationService({
    generators: {
      teacher: async () => { throw new SafeGenerationError('Teacher key rejected'); },
      platform: async () => { platformCalls += 1; return ['unexpected']; }
    },
    deckRepository: { createGenerated: async () => assert.fail('must not persist') }
  });
  await assert.rejects(
    service.generateAndRegister({
      gameType: 'who',
      deckName: 'Class Set',
      generationInput: {},
      teacherContext: { keySource: 'teacher', teacherDisplayName: 'Ms A', teacherKeyUsed: true }
    }),
    /Teacher key rejected/
  );
  assert.equal(platformCalls, 0);
});
```

- [ ] **Step 5: Implement generation orchestration**

The service must:

1. validate the required deck name;
2. call exactly the selected generator;
3. normalize output through `normalizeDeckContent`;
4. persist through `deckRepository.createGenerated`;
5. return `{ deck, version }` without secrets.

Refactor existing `/api/generate*` handlers to pass `deckName`, teacher context, and their current prompt/generator into this service. Remove key-prefix logging and raw upstream error bodies.

- [ ] **Step 6: Verify generation tests and secret scan**

Run: `npm test`  
Run: `rg -n "KeyPrefix|x-goog-api-key.*console|console\\.(log|error).*apiKey|berkai2026" server.js server`  
Expected: tests pass and search returns no sensitive logging/default passcode.

- [ ] **Step 7: Commit**

```bash
git add server/http server/services tests server.js
git commit -m "feat(platform): register named AI generations"
```

### Task 5: Game Session Lifecycle API

**Files:**
- Create: `server/repositories/session-repository.js`
- Create: `server/routes/sessions.js`
- Create: `tests/session-repository.test.js`
- Create: `tests/sessions-route.test.js`
- Modify: `server.js`

**Interfaces:**
- Produces: `createSessionRepository(pool)`
- Produces methods: `start(input)`, `complete(id, input)`, `touch(id)`, `abandonStale(cutoff)`
- HTTP: `POST /api/sessions`
- HTTP: `PATCH /api/sessions/:id/complete`

- [ ] **Step 1: Write failing lifecycle tests**

```js
test('starts a content session with the exact current deck version', async () => {
  const repository = createSessionRepository(poolFixture({
    deck: { id: 'd1', current_version_id: 'v2', game_type: 'taboo' }
  }));
  const session = await repository.start({
    gameType: 'taboo',
    roomCode: 'AB12',
    teacherDisplayName: 'Ms Ada',
    participantNames: ['Blue', 'Red'],
    deckId: 'd1',
    deckVersionId: 'v2'
  });
  assert.equal(session.deckVersionId, 'v2');
});

test('rejects a deck version belonging to another game', async () => {
  await assert.rejects(() => repository.start({
    gameType: 'who',
    teacherDisplayName: 'Ms Ada',
    participantNames: [],
    deckId: 'taboo-deck',
    deckVersionId: 'v1'
  }), /does not belong to this game/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/session-repository.test.js`  
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement repository and input validation**

Sanitize:

- room codes to `[A-Z0-9-]{1,12}`;
- teacher name to 120 characters;
- participant array to 32 unique strings of 80 characters;
- safe result JSON to 10 KB.

Use `UPDATE ... WHERE id = $1 AND status = 'active'` for completion so results cannot overwrite a completed session.

- [ ] **Step 4: Add route tests and implementation**

Assert:

- `201` with a session ID on start;
- `200` on first completion;
- `409` on repeated completion;
- `400` for missing teacher name;
- deckless Bottle/Wheel starts are accepted;
- content games require deck/version references.

- [ ] **Step 5: Add stale-session classification**

Expose a repository call from the existing hourly cleanup:

```js
await sessionRepository.abandonStale(new Date(Date.now() - 24 * 60 * 60 * 1000));
```

The query updates only `status = 'active'`.

- [ ] **Step 6: Verify**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/repositories/session-repository.js server/routes/sessions.js tests server.js
git commit -m "feat(platform): record game session lifecycle"
```

### Task 6: Admin Cookie, CSRF, Protected Data, and Socket Authorization

**Files:**
- Create: `server/security/admin-session.js`
- Create: `server/routes/admin-auth.js`
- Create: `server/routes/admin-data.js`
- Create: `tests/admin-session.test.js`
- Create: `tests/admin-routes.test.js`
- Modify: `server.js`
- Modify: `frontend/src/components/Admin/AdminDashboard.jsx`

**Interfaces:**
- Produces: `createAdminSessionManager({ passcode, secret, secure, ttlMs })`
- Produces methods: `login(candidate)`, `verifyCookie(header)`, `requireHttp(req,res,next)`, `requireCsrf(req,res,next)`
- HTTP: `POST /api/admin/login`, `GET /api/admin/session`, `POST /api/admin/logout`
- HTTP: protected `GET /api/admin/sessions`
- Socket.IO: privileged admin join/commands require verified handshake cookie

- [ ] **Step 1: Write failing cryptographic primitive tests**

```js
test('creates and verifies a short-lived signed session', () => {
  const manager = createAdminSessionManager({
    passcode: 'correct horse battery staple',
    secret: 'test-signing-secret-with-length',
    secure: false,
    ttlMs: 60_000
  });
  const login = manager.login('correct horse battery staple', 1_000);
  assert.equal(manager.verifyCookie(login.cookie, 30_000).csrfToken, login.csrfToken);
  assert.throws(() => manager.verifyCookie(login.cookie, 62_000), /expired/);
});

test('rejects a modified cookie', () => {
  const login = manager.login('correct horse battery staple', 1_000);
  assert.throws(() => manager.verifyCookie(`${login.cookie}x`, 2_000), /invalid/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/admin-session.test.js`  
Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement signed HttpOnly cookie primitives**

Use only `node:crypto`:

- `timingSafeEqual` on equal-length hashed passcode buffers;
- JSON payload `{ exp, csrfToken, nonce }`;
- base64url payload;
- HMAC-SHA256 signature;
- cookie name `oct_admin`;
- attributes `HttpOnly; SameSite=Strict; Path=/; Max-Age=1800` and `Secure` in production.

Never store the passcode in a cookie or browser storage.

- [ ] **Step 4: Add failing HTTP auth tests**

Assert:

- wrong passcode returns `401`;
- correct login sets cookie and returns CSRF token;
- protected read rejects no cookie;
- state mutation rejects no `x-csrf-token`;
- logout clears the cookie;
- login endpoint has its own rate limit.

- [ ] **Step 5: Implement and mount admin routers**

Replace the current unprotected telemetry endpoints. `GET /api/admin/sessions` may call `sessionRepository.listAdmin(filters)` but must be behind `requireHttp`.

The old React dashboard login must call `/api/admin/login`, keep only the returned CSRF token in React state, and call `/api/admin/session` on reload. Remove `sessionStorage` passcode storage and the undefined `verifyPasscode` path.

- [ ] **Step 6: Protect privileged Socket.IO events**

At connection:

```js
const adminSession = adminSessionManager.tryVerifyCookie(socket.handshake.headers.cookie);
socket.isAdminAuthorized = Boolean(adminSession);
```

Require `socket.isAdminAuthorized` for `adminJoin`, `updateWordListAdmin`, `adminUpdateHost`, `adminLifelineAction`, and privileged Lingo admin actions. Host/player events remain public.

- [ ] **Step 7: Verify**

Run: `npm test`  
Run: `npm --prefix frontend run build`  
Expected: all tests and build pass.

- [ ] **Step 8: Commit**

```bash
git add server/security server/routes tests server.js frontend/src/components/Admin/AdminDashboard.jsx
git commit -m "feat(admin): protect dashboard and remote control"
```

## Phase Verification

- [ ] Run: `npm test`
- [ ] Run: `npm --prefix frontend run lint`
- [ ] Run: `npm --prefix frontend run build`
- [ ] Run database privilege/RLS assertions
- [ ] Confirm existing telemetry rows appear as legacy sessions
- [ ] Confirm no API key or admin passcode appears in logs or responses
- [ ] Confirm unauthenticated REST and Socket.IO admin operations fail
