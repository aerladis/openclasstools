# Administration Dashboard and Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver protected analytics, game-aware versioned deck editing, remote control, full Flappy removal, documentation, and release verification.

**Architecture:** The `/control-center` React route is an unlinked authenticated shell with isolated Sessions, Decks, and Remote tabs. Protected Express endpoints provide paginated/filterable DTOs and optimistic version mutations; legacy public admin entry points are removed.

**Tech Stack:** React 19, React Router 7, CSS Modules, Express, Socket.IO, PostgreSQL/Supabase, native `node:test`, Playwright-driven browser smoke testing.

## Global Constraints

- The hub and public documentation must not link to `/control-center`.
- Route obscurity is not authorization; every data read, mutation, and remote command is server-authorized.
- Admin passcodes never enter browser storage.
- Deck edits are game-aware and create immutable versions.
- Historical versions referenced by sessions are never mutated or deleted.
- Flappy Crocodile is removed completely; the ordinary Hangman word “CROCODILE” remains.
- Existing user LingoParty work and gameplay behavior must be preserved.

---

## File Map

- `frontend/src/components/Admin/AdminDashboard.jsx`: authenticated shell only.
- `frontend/src/components/Admin/AdminLogin.jsx`: login flow.
- `frontend/src/components/Admin/SessionsView.jsx`: analytics and session inspection.
- `frontend/src/components/Admin/DecksView.jsx`: deck list/history/edit/archive.
- `frontend/src/components/Admin/RemoteControlView.jsx`: authorized Socket.IO remote.
- `frontend/src/components/Admin/editors/`: per-game deck editors.
- `frontend/src/components/Admin/*.module.css`: focused styles.
- `server/routes/admin-data.js`: filters, pagination, history, edits, archive/restore.
- `tests/admin-data.test.js`, `tests/admin-ui-contract.test.js`: backend and source contracts.
- `frontend/src/App.jsx`, `server.js`: hidden route and legacy redirect cleanup.
- Hub/docs/deployment files: Flappy and public-admin cleanup.

### Task 1: Authenticated `/control-center` Shell

**Files:**
- Create: `frontend/src/components/Admin/AdminLogin.jsx`
- Create: `frontend/src/components/Admin/AdminShell.jsx`
- Modify: `frontend/src/components/Admin/AdminDashboard.jsx`
- Modify: `frontend/src/components/Admin/AdminDashboard.module.css`
- Modify: `frontend/src/App.jsx`
- Create: `tests/admin-ui-contract.test.js`

**Interfaces:**
- `AdminLogin({ onAuthenticated })`
- `AdminShell({ csrfToken, onLogout })`
- Route: `/control-center`
- No route or link: `/admin` in React hub

- [ ] **Step 1: Write failing route/auth source tests**

```js
test('React exposes only the unlinked control-center admin route', async () => {
  const app = await readFile('frontend/src/App.jsx', 'utf8');
  const hub = await readFile('frontend/src/components/Hub/GameHub.jsx', 'utf8');
  assert.match(app, /path="\\/control-center"/);
  assert.doesNotMatch(app, /path="\\/admin"/);
  assert.doesNotMatch(hub, /control-center|Admin Panel/);
});

test('admin code never stores the passcode', async () => {
  const source = await readAdminSources();
  assert.doesNotMatch(source, /localStorage.*passcode|sessionStorage.*passcode/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/admin-ui-contract.test.js`  
Expected: FAIL because `/admin` still exists and dashboard storage is insecure/incomplete.

- [ ] **Step 3: Build login and shell**

`AdminDashboard` checks `GET /api/admin/session`, renders `AdminLogin` on `401`, and keeps the returned CSRF token in memory. `AdminLogin` submits the passcode directly to `/api/admin/login` and clears its input on completion.

- [ ] **Step 4: Change the route and remove hub discovery**

Use:

```jsx
<Route path="/control-center" element={<AdminDashboard />} />
```

The wildcard continues to return the hub for unknown public routes, but `/control-center` must render directly on refresh through the existing SPA fallback.

- [ ] **Step 5: Verify**

Run: `node --test tests/admin-ui-contract.test.js`  
Run: `npm --prefix frontend run build`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Admin frontend/src/App.jsx tests/admin-ui-contract.test.js
git commit -m "feat(admin): add protected control center shell"
```

### Task 2: Session Analytics and Inspection

**Files:**
- Modify: `server/repositories/session-repository.js`
- Modify: `server/routes/admin-data.js`
- Create: `frontend/src/components/Admin/SessionsView.jsx`
- Create: `frontend/src/components/Admin/SessionsView.module.css`
- Create: `tests/admin-data.test.js`

**Interfaces:**
- HTTP: `GET /api/admin/sessions?gameType=&teacher=&participant=&deck=&roomCode=&theme=&cefr=&status=&from=&to=&cursor=`
- HTTP: `GET /api/admin/sessions/:id`
- DTO: `{ items, nextCursor, summary }`

- [ ] **Step 1: Write failing filter/pagination tests**

```js
test('session list uses bound parameters for every filter', async () => {
  const repository = createSessionRepository(recordingPool());
  await repository.listAdmin({
    gameType: 'taboo',
    teacher: 'Ada',
    participant: 'Blue',
    status: 'completed',
    limit: 25
  });
  const call = repository.lastQuery();
  assert.doesNotMatch(call.text, /Ada|Blue/);
  assert.deepEqual(call.params.slice(0, 4), ['taboo', '%Ada%', 'Blue', 'completed']);
});
```

Also test invalid dates/status, maximum page size 100, and exact version details.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/admin-data.test.js`  
Expected: FAIL because admin listing is not implemented.

- [ ] **Step 3: Implement repository queries and protected routes**

Join sessions to decks and versions. Return aggregate counts with the filtered page:

```js
{
  totalSessions,
  completedSessions,
  abandonedSessions,
  generatedDecks,
  teacherKeyUsagePercent
}
```

Legacy sessions return `legacy: true` and null deck version rather than invented data.

- [ ] **Step 4: Build SessionsView**

Provide:

- summary cards;
- debounced filters;
- accessible table;
- cursor pagination;
- details drawer with participants, result, deck version metadata, and activity logs;
- loading, empty, error, and retry states.

- [ ] **Step 5: Verify**

Run: `node --test tests/admin-data.test.js`  
Run: `npm --prefix frontend run lint`  
Run: `npm --prefix frontend run build`  
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/repositories/session-repository.js server/routes/admin-data.js frontend/src/components/Admin/SessionsView* tests/admin-data.test.js
git commit -m "feat(admin): add session analytics"
```

### Task 3: Game-Aware Deck Editing and Revision History

**Files:**
- Modify: `server/routes/admin-data.js`
- Modify: `server/repositories/deck-repository.js`
- Create: `frontend/src/components/Admin/DecksView.jsx`
- Create: `frontend/src/components/Admin/DecksView.module.css`
- Create: `frontend/src/components/Admin/editors/DeckEditor.jsx`
- Create: `frontend/src/components/Admin/editors/DeckEditor.module.css`
- Create: `frontend/src/components/Admin/editors/editor-config.js`
- Modify: `tests/admin-data.test.js`

**Interfaces:**
- HTTP: `GET /api/admin/decks?gameType=&query=&archived=&cursor=`
- HTTP: `GET /api/admin/decks/:id/history`
- HTTP: `POST /api/admin/decks/:id/revisions`
- HTTP: `PATCH /api/admin/decks/:id/name`
- HTTP: `PATCH /api/admin/decks/:id/archive`
- Mutations require `{ expectedVersionId }` and `x-csrf-token`

- [ ] **Step 1: Write failing optimistic-edit tests**

```js
test('publishing an edit creates a version and rejects a stale expected version', async () => {
  const first = await repository.createRevision({
    deckId: 'd1',
    expectedVersionId: 'v1',
    content: ['A', 'B'],
    teacherDisplayName: 'Administrator'
  });
  assert.equal(first.versionNumber, 2);
  await assert.rejects(() => repository.createRevision({
    deckId: 'd1',
    expectedVersionId: 'v1',
    content: ['stale'],
    teacherDisplayName: 'Administrator'
  }), /changed since it was opened/);
});
```

Test rename conflicts, archive/restore, CSRF rejection, invalid content, and history ordering.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/admin-data.test.js`  
Expected: FAIL on unimplemented mutation endpoints.

- [ ] **Step 3: Implement protected mutation routes**

Normalize every edit with `normalizeDeckContent(gameType, content)` before persistence. Set revision source to `admin_edit`; never mutate an old row. Archive changes visibility only and must not delete content.

- [ ] **Step 4: Define game-aware editor configuration**

`editor-config.js` maps each game type to column/field definitions and add-entry defaults. Examples:

```js
taboo: {
  fields: [
    { key: 'word', label: 'Target word', type: 'text' },
    { key: 'forbidden', label: 'Forbidden words', type: 'string-list', min: 3, max: 8 }
  ]
}
```

Millionaire uses four option inputs plus a correct-answer select; LingoParty switches fields by challenge type. No raw JSON textarea is the primary editor.

- [ ] **Step 5: Build DecksView**

Provide list filters, current-version inspection, history, rename, edit/publish, archive/restore, conflict refresh, and “sessions using this version” links.

- [ ] **Step 6: Verify**

Run: `npm test`  
Run: `npm --prefix frontend run lint`  
Run: `npm --prefix frontend run build`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add server/routes/admin-data.js server/repositories/deck-repository.js frontend/src/components/Admin/DecksView* frontend/src/components/Admin/editors tests/admin-data.test.js
git commit -m "feat(admin): edit versioned game decks"
```

### Task 4: Protected Live Remote Control and Legacy Admin Retirement

**Files:**
- Create: `frontend/src/components/Admin/RemoteControlView.jsx`
- Create: `frontend/src/components/Admin/RemoteControlView.module.css`
- Modify: `frontend/src/components/Admin/AdminShell.jsx`
- Modify: `server.js`
- Delete: `admin.html`
- Delete: `admin.js`
- Delete: `admin.css`
- Modify: `tests/admin-ui-contract.test.js`

**Interfaces:**
- React remote uses authenticated Socket.IO connection
- Legacy `/admin` and `/admin.html` redirect to `/control-center`
- Privileged event names remain compatible with game hosts

- [ ] **Step 1: Write failing retirement/auth tests**

Assert that:

- no public static admin asset remains;
- `/admin` and `/admin.html` redirect to `/control-center`;
- unauthenticated socket `adminJoin` fails;
- authenticated socket joins and commands succeed.

- [ ] **Step 2: Verify RED**

Run focused admin route/socket tests.  
Expected: FAIL while legacy assets and public join behavior remain.

- [ ] **Step 3: Port necessary remote controls into React**

Move behavior, not the monolithic file. `RemoteControlView` owns connection/room state; focused child renderers may be added for supported game state. Reuse existing event contracts.

- [ ] **Step 4: Retire legacy assets and add redirects before static middleware**

```js
app.get(['/admin', '/admin.html'], (_req, res) => res.redirect(302, '/control-center'));
```

Delete the old assets only after the React remote covers the supported controls.

- [ ] **Step 5: Verify**

Run: `npm test`  
Run: `npm --prefix frontend run build`  
Perform a two-browser host/remote smoke test.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Admin server.js tests
git rm admin.html admin.js admin.css
git commit -m "feat(admin): secure live game remote"
```

### Task 5: Remove Flappy Crocodile and Stale Inventory

**Files:**
- Delete: `FlappyCrocodile/index.html`
- Delete: `FlappyCrocodile/script.js`
- Delete: `FlappyCrocodile/style.css`
- Modify: `index.html`
- Modify: `README.md`
- Modify: `TEST_INSTRUCTIONS.md`
- Modify: `DEPLOY.md`
- Modify: `AGENTS.md`
- Modify: `frontend/src/components/Admin/AdminDashboard.jsx` or replacement icon map
- Remove or regenerate: `deploy.zip`
- Remove or regenerate: `deploy.tar.gz`
- Create: `tests/inventory.test.js`

**Interfaces:**
- Canonical game inventory contains ten games: eight content games plus Bottle and Wheel
- No Flappy route, files, card, analytics type, or documentation

- [ ] **Step 1: Write a failing repository inventory test**

```js
test('repository contains no Flappy Crocodile product references or assets', async () => {
  assert.equal(existsSync('FlappyCrocodile'), false);
  const files = await trackedTextFiles();
  const matches = files.filter(file => /flappy|Flappy Crocodile/i.test(readFileSync(file, 'utf8')));
  assert.deepEqual(matches, []);
});
```

Exclude Git history, dependencies, and binary archives from text scanning. Separately assert the ordinary Hangman word `CROCODILE` remains permitted.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/inventory.test.js`  
Expected: FAIL with the directory and current references.

- [ ] **Step 3: Remove assets and references**

Delete the directory and remove hub, analytics, README, testing, deployment, and agent-guide entries. Remove committed deployment archives unless the project explicitly requires them; if required, regenerate them from verified source without Flappy.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/inventory.test.js`  
Run: `rg -n -i "flappy|Flappy Crocodile" -g "!node_modules" -g "!lesson plan maker/**" .`  
Expected: no product references.

- [ ] **Step 5: Commit**

```bash
git add index.html README.md TEST_INSTRUCTIONS.md DEPLOY.md AGENTS.md tests/inventory.test.js
git rm -r FlappyCrocodile
git rm --ignore-unmatch deploy.zip deploy.tar.gz
git commit -m "chore: remove Flappy Crocodile"
```

### Task 6: Release Documentation and End-to-End Verification

**Files:**
- Modify: `README.md`
- Modify: `DEPLOY.md`
- Modify: `TEST_INSTRUCTIONS.md`
- Modify: `.env.example`
- Modify: `deploy.sh`
- Create: `docs/database.md`
- Create: `docs/admin-dashboard.md`

**Interfaces:**
- Deployment requires database/admin secrets and migration/seed steps
- Operations docs describe backup, migration, dashboard access, and key privacy

- [ ] **Step 1: Add documentation assertions**

Extend inventory/config tests to assert documentation contains `DATABASE_URL`, `ADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`, migration, seed, `/control-center`, and teacher-key privacy guidance.

- [ ] **Step 2: Verify RED**

Run focused documentation tests.  
Expected: FAIL until docs and deploy script are updated.

- [ ] **Step 3: Update operations documentation**

Document:

- Supabase migration and advisor commands;
- environment setup without real secrets;
- idempotent system-deck seed;
- admin login/logout and unlinked route;
- teacher name/API-key storage behavior;
- session/deck retention;
- rollback and backup prerequisites.

- [ ] **Step 4: Update deployment**

The deployment script must run the frontend build and fail clearly when required production variables are absent. Database migrations remain an explicit reviewed release step rather than an implicit destructive PM2 restart side effect.

- [ ] **Step 5: Execute automated verification**

Run:

```bash
npm test
npm --prefix frontend run lint
npm --prefix frontend run build
```

Expected: all pass with no warnings caused by new code.

- [ ] **Step 6: Execute browser smoke verification**

Using the in-app browser:

1. set teacher name and a session-only test key;
2. generate and register one deck;
3. reload and select it;
4. play and finish;
5. log into `/control-center`;
6. inspect the exact session/version;
7. edit and publish a new version;
8. replay it;
9. verify the old session still references the old version;
10. confirm unauthenticated dashboard/API/socket access fails.

- [ ] **Step 7: Run Supabase verification**

Run security/performance advisors and the RLS/grant queries from the foundation plan. Verify no public operational access and no API-key-like values in JSON/text columns.

- [ ] **Step 8: Commit**

```bash
git add README.md DEPLOY.md TEST_INSTRUCTIONS.md .env.example deploy.sh docs tests
git commit -m "docs: document persistent game platform"
```

## Release Verification

- [ ] Every automated test passes.
- [ ] React lint and production build pass.
- [ ] All eight content games can generate and reuse named decks.
- [ ] Bottle and Wheel record deckless sessions.
- [ ] Historical sessions retain exact immutable versions after edits.
- [ ] Admin REST and Socket.IO surfaces reject unauthenticated access.
- [ ] Supabase grants/RLS checks pass.
- [ ] Teacher/admin/database secrets are absent from logs, bundles, database content, and Git-tracked files.
- [ ] Flappy assets and references are absent.
- [ ] Production deployment starts successfully with documented environment variables.
