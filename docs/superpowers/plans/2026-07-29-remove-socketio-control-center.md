# Socket.IO and Control Center Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep OpenClassTools' standalone games, deck APIs, AI generation, and HTTP play-session tracking while removing Socket.IO, room codes, the Control Center, and completing the Kelime setup-hiding fix plus a minimal teacher key guide.

**Architecture:** Express serves retained HTTP APIs and static assets directly with `app.listen`. Each game owns its state locally and records optional telemetry through `startSessionSafely`/`completeSession` without a room code. React exposes only the hub and LingoParty, with a native disclosure guide that opens the existing API-key modal.

**Tech Stack:** Node.js 18+, Express 4.21, native `node:test`, React 19, React Router 7, Vite 8, Oxlint.

## Global Constraints

- Do not replace Socket.IO with WebSockets, polling, or another remote-control system.
- Preserve named decks, AI generation, and public play-session HTTP APIs.
- Preserve historical database migrations and nullable historical `room_code` data.
- Remove the complete Control Center and its server-only administrator surface.
- Do not modify unrelated LingoParty modal files or the dirty `lesson plan maker` submodule.

---

## File Structure

- `server.js`: retained Express HTTP composition, AI routes, static serving, and stale session cleanup.
- `game.js`, `taboo.js`, `hangman.js`, `millionaire.js`, `kelime.js`, `flashcards.js`, `lingoparty.js`: standalone game state and HTTP session tracking only.
- `frontend/src/games/LingoParty/LingoPartyGame.jsx`: local React LingoParty state and HTTP session tracking.
- `frontend/src/components/Hub/GameHub.jsx` and `.module.css`: game hub plus compact teacher key guide.
- `tests/removal-contract.test.js`: negative inventory and retained-feature contracts for the simplification.
- Removed files: `server/security/admin-socket.js`, `server/security/admin-session.js`, `server/routes/admin-auth.js`, `server/routes/admin-data.js`, `frontend/src/hooks/useSocketGame.js`, and `frontend/src/components/Admin/`.

### Task 1: Establish Removal and Retention Contracts

**Files:**
- Create: `tests/removal-contract.test.js`
- Modify: `tests/server-composition.test.js`
- Modify: `tests/legacy-game-contracts.test.js`
- Modify: `tests/lingoparty-contract.test.js`
- Delete: `tests/admin-socket.test.js`
- Delete: `tests/admin-session.test.js`
- Delete: `tests/admin-routes.test.js`
- Delete: `tests/admin-data.test.js`
- Delete: `tests/admin-ui-contract.test.js`

**Interfaces:**
- Consumes: repository source files as UTF-8 text.
- Produces: source-level contracts that reject Socket.IO, Control Center, room-code UI, and missing Kelime/teacher-guide behavior.

- [ ] **Step 1: Write the failing removal contract**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('runtime dependencies and server contain no Socket.IO or admin control center', async () => {
  const [rootPackage, frontendPackage, server, app] = await Promise.all([
    read('package.json'),
    read('frontend/package.json'),
    read('server.js'),
    read('frontend/src/App.jsx')
  ]);
  for (const source of [rootPackage, frontendPackage, server, app]) {
    assert.doesNotMatch(source, /socket\.io|control-center|AdminDashboard/i);
  }
  assert.match(server, /app\.listen\(PORT/);
  assert.doesNotMatch(server, /createServer|activeGames|\/api\/admin/);
});

test('browser clients expose no rooms, codes, or socket scripts', async () => {
  const paths = [
    'who.html', 'taboo.html', 'hangman.html', 'millionaire.html',
    'kelime.html', 'flashcards.html', 'lingoparty.html',
    'game.js', 'taboo.js', 'hangman.js', 'millionaire.js',
    'kelime.js', 'flashcards.js', 'lingoparty.js',
    'frontend/src/games/LingoParty/LingoPartyGame.jsx'
  ];
  for (const path of paths) {
    const source = await read(path);
    assert.doesNotMatch(source, /socket\.io|hostJoin|hostUpdate|syncWordList|game-id-badge|roomCode|Game ID:/i, path);
  }
});

test('Kelime hides setup UI when a round starts', async () => {
  const source = await read('kelime.js');
  assert.match(source, /function setSetupVisible\(visible\)/);
  assert.match(source, /setSetupVisible\(false\)/);
});

test('hub has a concise native teacher-key guide wired to the key modal', async () => {
  const source = await read('frontend/src/components/Hub/GameHub.jsx');
  assert.match(source, /<details[^>]*className=\{styles\.teacherGuide\}/);
  assert.match(source, /temporary/i);
  assert.match(source, /secure/i);
  assert.match(source, /quota/i);
  assert.match(source, /setIsApiKeyModalOpen\(true\)/);
});
```

- [ ] **Step 2: Replace obsolete positive Socket.IO/admin assertions**

In `tests/server-composition.test.js`, delete the privileged Socket.IO test and retain the deck/session mounting and generation-handler tests. In `tests/lingoparty-contract.test.js`, replace the room-code assertion with:

```js
test('LingoParty records real custom teams without a room code', async () => {
  const source = await readFile(
    new URL('../frontend/src/games/LingoParty/LingoPartyGame.jsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /participantNames:\s*teams\.map/);
  assert.doesNotMatch(source, /roomCode|gameId|useSocketGame/);
});
```

- [ ] **Step 3: Run contracts and verify they fail for the expected old support**

Run: `node --test tests/removal-contract.test.js tests/server-composition.test.js tests/legacy-game-contracts.test.js tests/lingoparty-contract.test.js`

Expected: failures mention `socket.io`, `control-center`, room codes, missing `setSetupVisible`, and missing `teacherGuide`.

- [ ] **Step 4: Commit the contract changes**

```bash
git add tests/removal-contract.test.js tests/server-composition.test.js tests/legacy-game-contracts.test.js tests/lingoparty-contract.test.js tests/admin-socket.test.js tests/admin-session.test.js tests/admin-routes.test.js tests/admin-data.test.js tests/admin-ui-contract.test.js
git commit -m "test: define standalone platform contracts"
```

### Task 2: Simplify the Express Server and Dependencies

**Files:**
- Modify: `server.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Delete: `server/security/admin-socket.js`
- Delete: `server/security/admin-session.js`
- Delete: `server/routes/admin-auth.js`
- Delete: `server/routes/admin-data.js`

**Interfaces:**
- Consumes: retained deck, generation, and session repositories/routers.
- Produces: `app.listen(PORT)` HTTP server with `/api/decks`, `/api/sessions`, generation endpoints, `/api/lingoparty-decks`, `/api/health`, and static serving.

- [ ] **Step 1: Remove real-time and administrator composition**

Delete the `node:http`, `socket.io`, administrator security/router imports; delete `server`, `io`, `adminSessionManager`, `/api/admin` mounts, `activeGames`, `MAX_GAMES`, the Socket.IO connection block, `/admin` redirects, and the `/socket.io` SPA exception.

Retain stale HTTP session cleanup in this form:

```js
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000;

setInterval(async () => {
  try {
    const abandoned = await sessionRepository.abandonStale(
      new Date(Date.now() - MAX_SESSION_AGE)
    );
    if (abandoned > 0) {
      console.log(`Marked ${abandoned} expired play sessions as abandoned`);
    }
  } catch {
    console.warn('Unable to classify expired play sessions');
  }
}, 60 * 60 * 1000);
```

Return a simple health response:

```js
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

Start Express directly:

```js
app.listen(PORT, () => {
  console.log(`🎮 BerkAI Game Hub running → http://localhost:${PORT}`);
  console.log('🔒 Security: Rate limiting enabled');
});
```

- [ ] **Step 2: Remove obsolete modules and dependency**

Run: `npm uninstall socket.io`

Delete the four obsolete administrator/security modules listed above.

- [ ] **Step 3: Run server contracts**

Run: `node --test tests/removal-contract.test.js tests/server-composition.test.js tests/config.test.js tests/sessions-route.test.js tests/decks-route.test.js`

Expected: all selected tests pass.

- [ ] **Step 4: Commit the server simplification**

```bash
git add server.js package.json package-lock.json server/security/admin-socket.js server/security/admin-session.js server/routes/admin-auth.js server/routes/admin-data.js
git commit -m "refactor: remove realtime and admin server"
```

### Task 3: Make Legacy Games Fully Standalone and Finish Kelime

**Files:**
- Modify: `who.html`, `taboo.html`, `hangman.html`, `millionaire.html`, `kelime.html`, `flashcards.html`, `lingoparty.html`
- Modify: `game.js`, `taboo.js`, `hangman.js`, `millionaire.js`, `kelime.js`, `flashcards.js`, `lingoparty.js`

**Interfaces:**
- Consumes: local browser state, deck library, and `window.OpenClassPlatform` HTTP functions.
- Produces: standalone browser games with no generated room identifier and no remote synchronization.

- [ ] **Step 1: Remove Socket.IO scripts and game-code markup**

Delete every `<script src="/socket.io/socket.io.js"></script>` tag. Delete LingoParty's `#game-id-badge` markup. Keep the remaining script order unchanged.

- [ ] **Step 2: Remove real-time code from each legacy client**

For each JavaScript file, delete the `gameId`/`socket` declarations, socket connection listeners, remote command handlers, broadcast functions, `syncWordList` emissions, and dynamically-created `.game-id-badge` elements. Remove calls to deleted broadcast/sync helpers while preserving the local state changes around them.

Change every session start payload from:

```js
{
  gameType: 'whoami',
  roomCode: gameId,
  participantNames: [],
  ...selectedDeckRef
}
```

to:

```js
{
  gameType: 'whoami',
  participantNames: [],
  ...selectedDeckRef
}
```

Use each file's existing `gameType` and participant list; only remove `roomCode`.

- [ ] **Step 3: Hide Kelime setup controls after play starts**

In `kelime.html`, add `id="setup-controls"` to `.solo-top-row` and keep `#deck-library-mount` unchanged. In `kelime.js`, capture both elements and add:

```js
let setupControls;
let deckLibraryMount;

function setSetupVisible(visible) {
  if (setupControls) setupControls.hidden = !visible;
  if (deckLibraryMount) deckLibraryMount.hidden = !visible;
}
```

Assign the elements during `DOMContentLoaded` and call `setSetupVisible(false)` immediately before each successful initial `loadQuestion(0, { resetRoundTimer: true, startTimer: true })` path for default or registered deck play.

- [ ] **Step 4: Run legacy contracts**

Run: `node --test tests/removal-contract.test.js tests/legacy-game-contracts.test.js`

Expected: both test files pass.

- [ ] **Step 5: Commit standalone legacy games**

```bash
git add who.html taboo.html hangman.html millionaire.html kelime.html flashcards.html lingoparty.html game.js taboo.js hangman.js millionaire.js kelime.js flashcards.js lingoparty.js
git commit -m "refactor: make legacy games standalone"
```

### Task 4: Remove the React Control Center and Add the Teacher Guide

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/Hub/GameHub.jsx`
- Modify: `frontend/src/components/Hub/GameHub.module.css`
- Modify: `frontend/src/games/LingoParty/LingoPartyGame.jsx`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Delete: `frontend/src/hooks/useSocketGame.js`
- Delete: `frontend/src/components/Admin/`

**Interfaces:**
- Consumes: `ApiKeyModal`, `startSessionSafely`, and `completeSession`.
- Produces: hub and LingoParty routes only; concise native teacher guide; local LingoParty state.

- [ ] **Step 1: Remove Control Center routes and files**

Make `frontend/src/App.jsx` import only `GameHub` and `LingoPartyGame`, with routes `/`, `/lingoparty`, and the existing wildcard fallback. Delete the entire `frontend/src/components/Admin/` directory.

- [ ] **Step 2: Remove React Socket.IO integration**

Delete `useSocketGame.js`, remove its import/use from `LingoPartyGame.jsx`, remove `gameId` from initial/new state, remove `roomCode` from session start, and remove `broadcastGameState` calls/effect dependencies. Keep all local `setGameState` behavior and completion telemetry.

Run: `npm --prefix frontend uninstall socket.io-client`

- [ ] **Step 3: Add the compact teacher guide**

Add below the hub header:

```jsx
<details className={styles.teacherGuide}>
  <summary>Why use your own API key?</summary>
  <div className={styles.teacherGuideBody}>
    <p>Your key is temporary, kept securely in this browser tab, and helps avoid shared quota limits.</p>
    <button type="button" onClick={() => setIsApiKeyModalOpen(true)}>
      Add API key
    </button>
  </div>
</details>
```

Add compact responsive styles:

```css
.teacherGuide {
  align-self: center;
  width: min(680px, 100%);
  padding: 0.8rem 1rem;
  border: 1px solid rgba(168, 85, 247, 0.25);
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.55);
}

.teacherGuide summary {
  cursor: pointer;
  color: #d8b4fe;
  font-weight: 700;
}

.teacherGuideBody {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.7rem;
  color: var(--color-text-dim);
}

.teacherGuideBody p { margin: 0; }

.teacherGuideBody button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  color: white;
  background: linear-gradient(135deg, #7c3aed, #db2777);
  cursor: pointer;
}
```

- [ ] **Step 4: Run React contracts, lint, and build**

Run: `node --test tests/removal-contract.test.js tests/lingoparty-contract.test.js`

Run: `npm --prefix frontend run lint`

Run: `npm --prefix frontend run build`

Expected: contracts pass, lint exits zero, and Vite produces `frontend/dist`.

- [ ] **Step 5: Commit the React simplification**

```bash
git add frontend/src/App.jsx frontend/src/components/Hub/GameHub.jsx frontend/src/components/Hub/GameHub.module.css frontend/src/games/LingoParty/LingoPartyGame.jsx frontend/src/hooks/useSocketGame.js frontend/src/components/Admin frontend/package.json frontend/package-lock.json
git commit -m "refactor: simplify frontend to standalone games"
```

### Task 5: Remove Deployment Support and Refresh Current Documentation

**Files:**
- Modify: `frontend/vite.config.js`
- Modify: `nginx-play.conf`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `DEPLOY.md`
- Modify: `TEST_INSTRUCTIONS.md`
- Modify: `docs/admin-dashboard.md`
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: final standalone architecture.
- Produces: HTTP-only dev/deployment configuration and current documentation with no supported Control Center or Socket.IO claims.

- [ ] **Step 1: Remove real-time proxy configuration**

Keep only the `/api` Vite proxy:

```js
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:8090'
  }
}
```

In nginx, remove `proxy_set_header Upgrade`, `Connection 'upgrade'`, and `proxy_cache_bypass`.

- [ ] **Step 2: Update current documentation**

Describe OpenClassTools as standalone classroom games with HTTP deck/generation/session services. Delete Control Center setup, administrator passcode/session-secret requirements, remote-control testing, room-code instructions, and Socket.IO deployment claims. Replace `docs/admin-dashboard.md` with a short retirement note pointing readers to the main hub and retained deck/session HTTP APIs.

- [ ] **Step 3: Run active-source inventory**

Run:

```bash
rg -n -i \
  -g '!node_modules/**' -g '!frontend/node_modules/**' -g '!frontend/dist/**' \
  -g '!docs/superpowers/**' -g '!supabase/migrations/**' -g '!MILLIONAIRE_PLAN.md' \
  'socket\.io|control-center|game-id-badge|roomCode|hostJoin|hostUpdate|adminJoin'
```

Expected: no output from active source, configuration, tests, or current documentation. Historical design plans, the immutable migration, and `MILLIONAIRE_PLAN.md` are excluded.

- [ ] **Step 4: Run full verification**

Run: `npm test`

Run: `npm --prefix frontend run lint`

Run: `npm --prefix frontend run build`

Run: `git diff --check`

Expected: all tests pass, lint and build exit zero, and no whitespace errors are reported.

- [ ] **Step 5: Commit configuration and documentation**

```bash
git add frontend/vite.config.js nginx-play.conf .env.example README.md DEPLOY.md TEST_INSTRUCTIONS.md docs/admin-dashboard.md AGENTS.md
git commit -m "docs: document standalone classroom games"
```
