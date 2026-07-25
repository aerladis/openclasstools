# Deck and Session Game Adoption Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all eight content games registered-deck generation/selection and record real play sessions for every remaining game.

**Architecture:** A framework-neutral browser client provides teacher context, deck loading, and session lifecycle calls to legacy games; React uses a matching service/hook. Each game retains its gameplay code while adapting only setup, generation, and lifecycle boundaries.

**Tech Stack:** Vanilla ES6 browser JavaScript, React 19/Vite 8, Express JSON APIs from the foundation plan, Socket.IO 4.8, native `node:test`.

## Global Constraints

- Successful AI generation always requires and persists a globally visible deck name.
- Deck names are case-insensitively unique within a game.
- Teacher name persists in `localStorage`; Gemini key persists only in `sessionStorage`.
- Teacher-key failures never fall back to the platform key.
- Content games record exact `deckId` and `deckVersionId`.
- Bottle and Wheel record sessions with null deck fields.
- Session logging failure warns but does not stop already loaded gameplay.
- Stable gameplay behavior and current visual styling must remain intact.

---

## File Map

- `platform-client.js`: legacy teacher/deck/session client.
- `deck-library.css`: shared legacy setup controls.
- `frontend/src/services/platformApi.js`: React API equivalent.
- `frontend/src/hooks/useDeckLibrary.js`: React deck loading/generation state.
- Eight content-game HTML/JS files: setup integration.
- `bottle.js`, `wheel.js`: deckless session integration.
- `server/seeds/system-decks.js`: normalized built-in deck seeds.
- `server/scripts/seed-system-decks.js`: idempotent seed runner.
- `tests/platform-client.test.js`, `tests/system-decks.test.js`: shared contracts.

### Task 1: Shared Teacher, Deck, and Session Browser Clients

**Files:**
- Create: `platform-client.js`
- Create: `deck-library.css`
- Create: `frontend/src/services/platformApi.js`
- Create: `frontend/src/hooks/useDeckLibrary.js`
- Create: `tests/platform-client.test.js`
- Modify: `frontend/src/components/Common/ApiKeyModal.jsx`

**Interfaces:**
- Legacy global: `window.OpenClassPlatform`
- Produces:
  - `getTeacherContext()`
  - `saveTeacherSettings({ teacherDisplayName, geminiApiKey })`
  - `listDecks(gameType)`
  - `generateDeck(gameType, endpoint, input)`
  - `startSession(input)`
  - `completeSession(id, result)`
  - `mountDeckLibrary(options)`
- React service exports matching async functions.

- [ ] **Step 1: Write failing storage tests**

Use a small injected storage fixture:

```js
test('stores teacher name persistently and key for the tab session only', () => {
  const local = memoryStorage();
  const session = memoryStorage();
  const client = createPlatformClient({ localStorage: local, sessionStorage: session, fetch: async () => {} });
  client.saveTeacherSettings({ teacherDisplayName: 'Ms Ada', geminiApiKey: 'secret-key-123' });
  assert.equal(local.getItem('oct_teacher_name'), 'Ms Ada');
  assert.equal(local.getItem('oct_gemini_key'), null);
  assert.equal(session.getItem('oct_gemini_key'), 'secret-key-123');
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/platform-client.test.js`  
Expected: FAIL because `platform-client.js` does not exist.

- [ ] **Step 3: Implement the framework-neutral client**

Build an IIFE that exports a factory for Node tests and assigns the browser singleton. Generation requests must set:

```js
{
  'Content-Type': 'application/json',
  'x-teacher-name': teacherDisplayName,
  'x-ai-key-source': keySource,
  ...(keySource === 'teacher' ? { 'x-gemini-api-key': geminiApiKey } : {})
}
```

Error objects must expose safe `status`, `code`, and `message` properties.

- [ ] **Step 4: Implement the React equivalent and hook**

`useDeckLibrary(gameType)` returns:

```js
{
  decks, selectedDeck, loading, error,
  refresh(), select(deckId), generate({ endpoint, deckName, ...input })
}
```

Keep the API implementation in `platformApi.js`; the hook owns React state only.

- [ ] **Step 5: Update Teacher Settings**

Migrate key storage from `localStorage` to `sessionStorage`, require a non-empty teacher name, add explicit `teacher|platform` selection, and change misleading copy from “browser session” only after behavior matches it.

- [ ] **Step 6: Verify**

Run: `node --test tests/platform-client.test.js`  
Run: `npm --prefix frontend run build`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add platform-client.js deck-library.css frontend/src/services frontend/src/hooks frontend/src/components/Common/ApiKeyModal.jsx tests/platform-client.test.js
git commit -m "feat(client): share teacher deck and session APIs"
```

### Task 2: Who Am I, Taboo, and Hangman Adoption

**Files:**
- Modify: `who.html`
- Modify: `game.js`
- Modify: `taboo.html`
- Modify: `taboo.js`
- Modify: `hangman.html`
- Modify: `hangman.js`
- Create: `tests/legacy-game-contracts.test.js`

**Interfaces:**
- Consumes: `window.OpenClassPlatform.mountDeckLibrary`
- Each adapter produces `getSelectedDeckRef() -> { deckId, deckVersionId }`
- Each game starts/completes a session through the shared client

- [ ] **Step 1: Write failing static contract tests**

```js
test('all first-wave pages load the shared platform client before their game script', async () => {
  for (const page of ['who.html', 'taboo.html', 'hangman.html']) {
    const html = await readFile(page, 'utf8');
    assert.ok(html.indexOf('platform-client.js') < html.indexOf(page === 'who.html' ? 'game.js' : page.replace('.html', '.js')));
    assert.match(html, /deck-library\.css/);
  }
});
```

Add source assertions that each generation payload includes `deckName` and each game calls `startSession`.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/legacy-game-contracts.test.js`  
Expected: FAIL because the pages do not load the shared client.

- [ ] **Step 3: Integrate Who Am I**

Replace `list.txt` as the canonical generated source. Keep bundled fallback content, but:

- mount a Who deck picker;
- require a deck name for generation;
- populate `CHARACTERS` from the selected/current deck;
- start the session when countdown begins;
- complete it when the round ends.

- [ ] **Step 4: Verify Who manually and contract GREEN**

Run: `node --test tests/legacy-game-contracts.test.js`  
Expected: PASS for Who Am I. In the browser, intercept `GET /api/decks?gameType=who` with a deterministic fixture and confirm selection survives game reset without mutating deck content.

- [ ] **Step 5: Integrate Taboo**

Map registered `content` directly to normalized cards. Remove localStorage generated-content reuse as a competing source; keep only a migration hint if old saved content exists. Record team names, score, selected version, and completion result.

- [ ] **Step 6: Integrate Hangman**

Map registered content to `{ word, category }`, require named generation, and record player labels plus wins/losses. Do not remove the ordinary “CROCODILE” Hangman word.

- [ ] **Step 7: Verify**

Run: `npm test`  
Run manual flows for generation, duplicate name, existing selection, and session-warning behavior in all three games.

- [ ] **Step 8: Commit**

```bash
git add who.html game.js taboo.html taboo.js hangman.html hangman.js tests/legacy-game-contracts.test.js
git commit -m "feat(games): adopt decks in who taboo and hangman"
```

### Task 3: Millionaire, Kelime, Flashcards, and Hats Adoption

**Files:**
- Modify: `millionaire.html`
- Modify: `millionaire.js`
- Modify: `kelime.html`
- Modify: `kelime.js`
- Modify: `flashcards.html`
- Modify: `flashcards.js`
- Modify: `hats.html`
- Modify: `hats.js`
- Modify: `tests/legacy-game-contracts.test.js`

**Interfaces:**
- Consumes shared deck/session client
- Millionaire content: `{ question, options[4], correct }[]`
- Kelime content: `{ question, answer }[]`
- Flashcards content: `{ word, meaning }[]`
- Hats content: `{ color, questions[], starters[] }[]`

- [ ] **Step 1: Extend failing contract tests**

Add the four pages to the script/CSS ordering test and assert that generation uses `deckName`, selected deck IDs reach `startSession`, and local generated-content reuse cannot bypass registered decks.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/legacy-game-contracts.test.js`  
Expected: FAIL for the four newly listed pages.

- [ ] **Step 3: Integrate Millionaire**

Load selected question snapshots without changing lifeline logic. Record target prize, final level, final prize, completion reason, and actual selected version.

- [ ] **Step 4: Integrate Kelime**

Preserve answer-length sorting as a presentation copy only; never mutate the immutable fetched content. Record participant label, score, and answered-question count.

- [ ] **Step 5: Integrate Flashcards**

Treat mastery/review flags as per-session state rather than deck edits. Record mastered/review counts on completion.

- [ ] **Step 6: Integrate Hats**

Map all six color groups through the registered deck. Record the selected topic and completion state without persisting classroom responses inside the deck.

- [ ] **Step 7: Verify**

Run: `npm test`  
Perform focused browser flows for all four games.

- [ ] **Step 8: Commit**

```bash
git add millionaire.html millionaire.js kelime.html kelime.js flashcards.html flashcards.js hats.html hats.js tests/legacy-game-contracts.test.js
git commit -m "feat(games): adopt decks in quiz and study games"
```

### Task 4: LingoParty React Adoption

**Files:**
- Modify: `frontend/src/games/LingoParty/components/SetupScreen.jsx`
- Modify: `frontend/src/games/LingoParty/LingoPartyGame.jsx`
- Create: `frontend/src/games/LingoParty/components/DeckLibraryPanel.jsx`
- Create: `frontend/src/games/LingoParty/components/DeckLibraryPanel.module.css`
- Create: `tests/lingoparty-contract.test.js`

**Interfaces:**
- Consumes: `useDeckLibrary('lingoparty')`
- `onStartGame` receives `{ teams, boardLength, baseColor, deck, deckId, deckVersionId }`
- Session result includes winner and final team summaries

- [ ] **Step 1: Write failing source contract tests**

```js
test('LingoParty setup passes an exact registered deck reference to game start', async () => {
  const source = await readFile('frontend/src/games/LingoParty/components/SetupScreen.jsx', 'utf8');
  assert.match(source, /deckId/);
  assert.match(source, /deckVersionId/);
  assert.match(source, /useDeckLibrary/);
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/lingoparty-contract.test.js`  
Expected: FAIL because SetupScreen has no registered deck reference.

- [ ] **Step 3: Add the React deck library panel**

Render:

- searchable registered-deck select;
- required deck-name input in the AI section;
- explicit AI key-source selection inherited from Teacher Settings;
- refresh/error/loading states;
- “Launch selected deck” and “Generate, save, and launch” actions.

- [ ] **Step 4: Pass immutable deck metadata into game state**

Add `deckId` and `deckVersionId` alongside `deck`. Do not use the generation response’s temporary random ID as the Socket.IO room code; use `useSocketGame().gameId`.

- [ ] **Step 5: Record the real session**

Start after teams and board are finalized. Complete when the victory modal receives a winner. Include actual custom team names; remove hardcoded Dragons/Rockets/Androids telemetry.

- [ ] **Step 6: Verify**

Run: `node --test tests/lingoparty-contract.test.js`  
Run: `npm --prefix frontend run lint`  
Run: `npm --prefix frontend run build`  
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/games/LingoParty tests/lingoparty-contract.test.js
git commit -m "feat(lingoparty): use persistent challenge decks"
```

### Task 5: Deckless Sessions, System Seeds, and Canonical Hub Inventory

**Files:**
- Create: `server/seeds/system-decks.js`
- Create: `server/scripts/seed-system-decks.js`
- Create: `tests/system-decks.test.js`
- Modify: `bottle.js`
- Modify: `wheel.js`
- Modify: `frontend/src/components/Hub/GameHub.jsx`
- Modify: `package.json`

**Interfaces:**
- Produces: `SYSTEM_DECKS` with one normalized seed per content game
- Script: `npm run seed:decks`
- Bottle/Wheel consume session API with null deck references

- [ ] **Step 1: Write failing seed tests**

```js
test('provides one valid system deck for every content game', () => {
  assert.deepEqual(
    [...new Set(SYSTEM_DECKS.map(deck => deck.gameType))].sort(),
    [...CONTENT_GAME_TYPES].sort()
  );
  for (const deck of SYSTEM_DECKS) {
    assert.doesNotThrow(() => normalizeDeckContent(deck.gameType, deck.content));
  }
});
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/system-decks.test.js`  
Expected: FAIL because seed data does not exist.

- [ ] **Step 3: Extract and seed built-in decks idempotently**

The seed script calls `createGenerated` with `source: 'system'` only when `(gameType, normalizedName)` is absent. Name seeds consistently, such as `Starter — General`.

- [ ] **Step 4: Record Bottle and Wheel sessions**

Add optional participant-name inputs if absent. Start sessions with `deckId: null` and `deckVersionId: null`. Bottle completes with `{ spinCount }`; Wheel completes with `{ spinCount, selectedName }`.

- [ ] **Step 5: Fix the React hub inventory**

Ensure the canonical hub includes Hats and Flashcards and no development-only administrator link. Preserve every other remaining game card.

- [ ] **Step 6: Verify**

Run: `npm test`  
Run: `npm run seed:decks` against a development database twice.  
Expected: second run creates zero duplicate decks.

- [ ] **Step 7: Commit**

```bash
git add server/seeds server/scripts tests/system-decks.test.js bottle.js wheel.js frontend/src/components/Hub/GameHub.jsx package.json
git commit -m "feat(platform): seed decks and complete game tracking"
```

## Phase Verification

- [ ] Run: `npm test`
- [ ] Run: `npm --prefix frontend run lint`
- [ ] Run: `npm --prefix frontend run build`
- [ ] For each content game: generate named deck, reload, select it, start, complete, and verify exact version in database
- [ ] For Bottle and Wheel: start and complete a deckless session
- [ ] Confirm teacher key disappears after the tab session and never appears in logs/database
- [ ] Confirm failed session logging warns without breaking loaded gameplay
