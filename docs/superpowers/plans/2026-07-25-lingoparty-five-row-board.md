# LingoParty Five-Row Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start LingoParty with a 30-tile, five-row board and no visible progression line.

**Architecture:** Keep the existing six-column serpentine coordinate system. Change only the setup state and the two rendered SVG path layers; tile generation, pawns, and gameplay state are unchanged.

**Tech Stack:** React 19, Vite 8, CSS Modules, oxlint.

## Global Constraints

- Modify only the active React LingoParty implementation under `frontend/src/games/LingoParty/`.
- Preserve six tiles per row, existing tile types, pawn movement, and all non-default board sizes.
- Do not change the legacy standalone LingoParty files.

---

### Task 1: Set the five-row default and hide the visual path

**Files:**

- Modify: `frontend/src/games/LingoParty/components/SetupScreen.jsx:73,198-206`
- Modify: `frontend/src/games/LingoParty/components/BoardMap.module.css:67-90`
- Test: Inline Node assertions over the two source files

**Interfaces:**

- Consumes: `SetupScreen` passes its `boardLength` state to `onStartGame`.
- Consumes: `BoardMap` uses `getMapCoordinates`, which fixes `tilesPerRow` at `6`.
- Produces: New games start with `boardLength === 30`; the two displayed SVG progress-path classes have zero opacity.

- [x] **Step 1: Write the failing source-level acceptance check**

Run:

```powershell
@'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const setup = readFileSync('frontend/src/games/LingoParty/components/SetupScreen.jsx', 'utf8');
const css = readFileSync('frontend/src/games/LingoParty/components/BoardMap.module.css', 'utf8');

assert.match(setup, /useState\(30\)/, 'the default board length must be 30');
assert.match(css, /\.mapGuidelineGlow\s*\{[^}]*opacity:\s*0;/s, 'the guideline must be transparent');
assert.match(css, /\.mapPathGlow\s*\{[^}]*opacity:\s*0;/s, 'the path glow must be transparent');
'@ | node --input-type=module
```

- [x] **Step 2: Run the check and verify it fails**

Expected: it fails because `SetupScreen` currently uses `useState(32)` and both path layers have non-zero opacity.

- [x] **Step 3: Implement the minimal UI changes**

Change the `boardLength` state initializer in `SetupScreen.jsx` to `useState(30)` and replace the outdated 42-planet default option with a selected 30-planet option. Set both `.mapGuidelineGlow` and `.mapPathGlow` to `opacity: 0` in `BoardMap.module.css`.

- [x] **Step 4: Re-run the acceptance check**

Run the exact Step 1 command. Expected: no assertion output and exit code 0.

- [x] **Step 5: Validate frontend quality and visual behavior**

Run:

```powershell
npm --prefix frontend run lint
npm --prefix frontend run build
```

Then start a new game at `http://localhost:8091/lingoparty` and confirm it starts with 30 tiles in five serpentine rows, with neither connecting path layer visible.

- [x] **Step 6: Commit the focused implementation**

```powershell
git add -- frontend/src/games/LingoParty/components/SetupScreen.jsx frontend/src/games/LingoParty/components/BoardMap.module.css
git commit -m "feat: default LingoParty to five-row board"
```
