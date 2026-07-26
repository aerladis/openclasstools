# LingoParty Performance and Shared Decks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a fluid LingoParty board, compact team setup, and server-shared mode-aware AI decks.

**Architecture:** Keep game state in React and persist the shared deck library as a bounded JSON file on the existing Express server. Optimize the canvas and board rendering without changing turn rules; keep hex and sphere presentation as controlled variants.

**Tech Stack:** React 19, Vite 8, Express 4, Node.js file system, CSS Modules, Canvas 2D.

## Global Constraints

- Keep Solo, Duo, and Crew as 1, 2, and 3+ students per pawn; team count remains separate.
- Remove capsules only; retain sphere and 60-degree rotated lunar-metal hex styles.
- Shared decks store teacher name, title, topic, CEFR, mode, created timestamp, and cards in a flat JSON file.
- Avoid persistent high-cost filters, per-frame canvas resizing, and continuous decorative animation.

---

### Task 1: Remove animation bottlenecks and implement visual tile variants

**Files:**

- Modify: `frontend/src/games/LingoParty/components/CosmicWheelModal.jsx`
- Modify: `frontend/src/games/LingoParty/components/BoardMap.jsx`
- Modify: `frontend/src/games/LingoParty/components/BoardMap.module.css`
- Modify: `frontend/src/games/LingoParty/components/BoardStage.jsx`
- Modify: `frontend/src/games/LingoParty/components/BoardStage.module.css`
- Test: inline Node source assertions plus frontend build

**Interfaces:**

- Produces: `tileStyle` values `sphere | hex`; `tileTexture` values are local visual state only.
- Produces: `resizeCanvas()` runs before drawing, not within every animation frame.

- [x] **Step 1: Write the failing performance guard**

Run a Node assertion that requires `CosmicWheelModal.jsx` to expose a resize helper and rejects `canvas.width =` inside `drawWheel`; requires `BoardStage.jsx` not to contain `capsule`.

- [x] **Step 2: Run the guard and verify it fails**

Expected: the wheel assigns `canvas.width` in `drawWheel` and the tile cycle lists `capsule`.

- [x] **Step 3: Implement the minimal rendering changes**

Move canvas bitmap allocation into a `resizeCanvas` helper called by mount and `ResizeObserver`; have `drawWheel` only draw. Restrict the style cycle to sphere and hex. Rotate hex points by `Math.PI / 3`, render lunar-metal panel texture for hex, and choose deterministic per-index sphere textures. Give chance, vortex, and asteroid tiles distinct Fate Box, swirl, and fractured-rock visual layers. Replace the 90 animated star elements and always-running filter animations with static or event-only effects.

- [x] **Step 4: Re-run the guard and inspect a spin**

Confirm the source guard passes; launch a game, trigger the wheel, and verify the canvas width and height do not change during a spin.

- [x] **Step 5: Run frontend checks**

Run `npm --prefix frontend run lint` and `npm --prefix frontend run build`. Expected: build exits 0; record any pre-existing lint warnings separately.

### Task 2: Build compact mode-aware team setup and share game mode

**Files:**

- Modify: `frontend/src/games/LingoParty/components/SetupScreen.jsx`
- Modify: `frontend/src/games/LingoParty/components/SetupScreen.module.css`
- Modify: `frontend/src/games/LingoParty/LingoPartyGame.jsx`
- Test: inline DOM/source assertion and manual welcome-screen check

**Interfaces:**

- `onStartGame({ teams, boardLength, baseColor, deck, mode })` carries `mode: 'solo' | 'duo' | 'crew'`.
- Each team remains `{ id, name, pawn, position, trophies, items }`.

- [x] **Step 1: Write a failing source check**

Assert that SetupScreen initializes `mode` to `crew`, renders Solo/Duo/Crew controls, and passes `mode` in every `onStartGame` branch.

- [x] **Step 2: Run the check and verify it fails**

Expected: no `mode` state exists in the current component.

- [x] **Step 3: Implement the compact setup**

Replace the large setup fields with a compact mode segmented control, a separate 1–6 team count stepper, and compact per-team rows. Each row contains an editable name, emoji cycle button, and color input. Pass mode to the React game state and retain it across socket broadcasts.

- [x] **Step 4: Verify setup behavior**

Launch a Crew game with four teams, change two emojis, and confirm the board receives the exact names, emojis, and mode.

### Task 3: Add shared server deck library and mode-aware generation

**Files:**

- Modify: `server.js`
- Create: `lingoparty-decks.json` initialized to an empty array
- Modify: `frontend/src/games/LingoParty/components/SetupScreen.jsx`
- Test: Node HTTP integration checks against a temporary deck file and frontend build

**Interfaces:**

- `POST /api/generate-lingoparty` accepts `{ theme, count, cefr, mode, deckTitle }` and stores a generated deck using `x-teacher-name`.
- `GET /api/lingoparty-decks` returns `{ success: true, decks }` ordered newest first.
- Saved deck shape: `{ id, teacherName, title, theme, cefr, mode, createdAt, cards }`.

- [x] **Step 1: Write failing API checks**

Start the server with a temporary deck file. Assert that a generated deck response records nonempty `teacherName`, `title`, `mode`, and cards, then assert the listing endpoint returns that exact saved record.

- [x] **Step 2: Run the checks and verify they fail**

Expected: the listing endpoint does not exist and generation does not persist records.

- [x] **Step 3: Implement bounded file persistence and endpoints**

Add safe read/write helpers using the existing input sanitizers, cap the library at 100 newest decks, persist only valid card arrays, and add the listing endpoint. Extend the AI prompt with the selected mode: individual response for Solo, exchange of two turns for Duo, and three-or-more participant collaboration for Crew. Apply the same language to fallback roleplay cards.

- [x] **Step 4: Add AI Mission Center controls**

Add Teacher name and Deck title fields, Generate new deck and Saved decks views, fetch shared decks, and launch directly with selected cards and saved mode.

- [x] **Step 5: Run API and frontend checks**

Confirm valid save/list/launch flow for Solo, Duo, and Crew; run `npm --prefix frontend run lint` and `npm --prefix frontend run build`.

- [x] **Step 6: Commit the implementation**

Stage only `server.js`, `lingoparty-decks.json`, and the changed LingoParty React files, then commit with message `feat: improve LingoParty setup and shared decks`.
