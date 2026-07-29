# LingoParty Boss Challenge — Three Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the LingoParty finish/trophy tile so it presents three consecutive boss questions; the team wins only by answering all three correctly, and a single wrong answer ends the challenge immediately.

**Architecture:** Extend `gameState.activeChallenge` to hold an array of three cards plus an index for boss mode. Reuse the existing challenge modal and per-category rendering by reading `activeChallenge.cards[index]`. Keep normal challenge tiles unchanged.

**Tech Stack:** Legacy HTML/CSS/JS client (`lingoparty.js`, `lingoparty.html`, `lingoparty.css`), Node built-in test runner for static contract checks.

## Global Constraints

- All changes are client-side in `lingoparty.js` (and optionally `lingoparty.css`).
- Boss questions must be drawn from the existing `gameState.deck`.
- A wrong answer immediately fails the boss challenge.
- The pass button must be hidden during the boss.
- The existing per-type timer values must reset for each boss question.
- Normal challenge tiles must remain unchanged.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `lingoparty.js` | Core game logic: boss start flow, modal rendering, grading/advance logic. |
| `lingoparty.css` | Optional styling for the boss progress badge/header. |

---

### Task 1: Prepare the boss challenge data structure

**Files:**
- Modify: `lingoparty.js:706-730` (`handleTileAction`)

**Interfaces:**
- Consumes: `gameState.deck` array of card objects.
- Produces: `gameState.activeChallenge` can now be either a single card object (normal) or `{ isBoss: true, cards: [card1, card2, card3], index: 0 }` (boss).

- [ ] **Step 1: Change the finish/trophy branch to draw three cards**

Replace the single-card draw in `handleTileAction` (lines 714-719) with logic that builds a boss challenge object:

```js
} else if (tile.type === 'finish' || tile.type === 'trophy') {
    const bossCards = [];
    while (bossCards.length < 3) {
        let card = gameState.deck.length > 0 ? gameState.deck.shift() : null;
        if (!card) {
            const types = ['riddle', 'scramble', 'pronunciation', 'association', 'grammar', 'speed', 'roleplay'];
            const randType = types[Math.floor(Math.random() * types.length)];
            card = { type: randType, prompt: `Complete the ${randType} challenge!`, answer: 'Target' };
        }
        bossCards.push(card);
    }
    gameState.activeChallenge = { isBoss: true, cards: bossCards, index: 0 };
    openChallengeModal(gameState.activeChallenge, team);
}
```

- [ ] **Step 2: Verify normal tile branch is untouched**

The `else` branch (standard challenge tile, lines 720-729) must remain exactly as it was: draw one card and call `openChallengeModal(card, team)`.

- [ ] **Step 3: Commit**

```bash
git add lingoparty.js
git commit -m "feat(lingoparty): draw 3 cards and wrap boss challenge state"
```

---

### Task 2: Render the current boss question and progress UI

**Files:**
- Modify: `lingoparty.js:732-835` (`openChallengeModal`)
- Modify: `lingoparty.html:238-241` (pass button) OR `lingoparty.js:733-739` (hide via JS)

**Interfaces:**
- Consumes: `gameState.activeChallenge` (boss object or single card).
- Produces: Modal renders `card.cards[card.index]` for bosses; progress badge visible only during boss; pass button hidden during boss.

- [ ] **Step 1: Normalize the card to render**

At the top of `openChallengeModal`, add:

```js
const isBoss = card && card.isBoss === true;
const currentCard = isBoss ? card.cards[card.index] : card;
```

Use `currentCard` everywhere the function previously used `card` (badge text, coins, prompt rendering, timer).

- [ ] **Step 2: Add boss progress badge and hide pass button**

After setting the coins badge, add:

```js
if (isBoss) {
    challengeTypeBadgeEl.textContent = `👑 Boss Challenge — Question ${card.index + 1}/3`;
    challengeCoinsBadgeEl.textContent = '👑 Boss Reward';
    btnChallengePass.classList.add('hidden');
} else {
    btnChallengePass.classList.remove('hidden');
}
```

- [ ] **Step 3: Commit**

```bash
git add lingoparty.js
git commit -m "feat(lingoparty): render boss progress and hide pass button"
```

---

### Task 3: Advance to the next boss question on correct answers

**Files:**
- Modify: `lingoparty.js:863-910` (`gradeChallenge`)

**Interfaces:**
- Consumes: `gameState.activeChallenge` (boss object), `gameState.timerInterval`.
- Produces: If boss is active and `index < 2`, advance index and re-render modal. If `index === 2`, award win.

- [ ] **Step 1: Extract current card and check boss state**

At the top of `gradeChallenge`, replace the direct `card` reads with:

```js
const card = gameState.activeChallenge;
const isBoss = card && card.isBoss === true;
const currentCard = isBoss ? card.cards[card.index] : card;
const reward = currentCard && currentCard.coins ? currentCard.coins : 15;
```

- [ ] **Step 2: Handle boss correct answer with advancement**

Inside the `if (card && card.isBoss)` block, replace the immediate win logic with:

```js
if (isBoss) {
    if (isCorrect) {
        if (card.index < 2) {
            card.index += 1;
            openChallengeModal(card, currentTeam);
            return;
        }

        playSound('trophy');
        currentTeam.gibelCubes = (currentTeam.gibelCubes || 0) + 1;
        currentTeam.trophies += 1;

        if (currentTeam.gibelCubes >= 3) {
            alert(`👑 VICTORY! ${currentTeam.name} defeated the Boss Challenge and acquired 3 Gibel Cubes!`);
        } else {
            gameState.teams.forEach(t => t.position = 0);
            renderPawns();
            setStatusMessage(`🧊 ${currentTeam.name} defeated the Boss Challenge & acquired Gibel Cube ${currentTeam.gibelCubes}/3! Board warped to Orbit ${gameState.round + 1}!`, '#38bdf8');
        }
    } else {
        playSound('damage');
        if (currentTeam.startPos !== undefined) {
            currentTeam.position = currentTeam.startPos;
        }
        renderPawns();
        setStatusMessage(`❌ ${currentTeam.name} failed the Boss Challenge and got pushed back!`, '#ef4444');
    }

    gameState.activeChallenge = null;
    advanceTurn();
    return;
}
```

- [ ] **Step 3: Verify normal tile grading still works**

The `else if (isCorrect)` and final `else` branches below the boss block must continue to use `currentCard` for reward/penalty logic. The current code already awards `reward` coins and applies grammar penalty; ensure it references `currentCard` instead of `card`.

- [ ] **Step 4: Commit**

```bash
git add lingoparty.js
git commit -m "feat(lingoparty): advance through 3 boss questions on correct answers"
```

---

### Task 4: Optional CSS tweak for boss progress badge

**Files:**
- Modify: `lingoparty.css` (append a new rule)

**Interfaces:**
- Consumes: `#challenge-type-badge` element.
- Produces: Boss badge uses a distinct color so it stands out.

- [ ] **Step 1: Add boss badge styling**

Append to `lingoparty.css`:

```css
#challenge-type-badge.boss-badge {
    background: linear-gradient(135deg, #ef4444, #f97316);
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 2: Apply the class in JS**

In `openChallengeModal`, when `isBoss` is true, also add `boss-badge` class to `challengeTypeBadgeEl` and remove it otherwise:

```js
if (isBoss) {
    challengeTypeBadgeEl.classList.add('boss-badge');
} else {
    challengeTypeBadgeEl.classList.remove('boss-badge');
}
```

- [ ] **Step 3: Commit**

```bash
git add lingoparty.css lingoparty.js
git commit -m "style(lingoparty): distinct boss challenge badge"
```

---

### Task 5: Manual testing

**Files:**
- None (manual).

- [ ] **Step 1: Start the server**

```bash
npm start
```

- [ ] **Step 2: Open LingoParty and reach the finish tile**

Use a short board (15 tiles) and move a team to the finish/trophy tile.

- [ ] **Step 3: Verify three-question sequence**

- Confirm modal header shows `Question 1/3`, then `2/3`, then `3/3`.
- Confirm pass button is hidden.
- Confirm timer resets for each question.

- [ ] **Step 4: Verify failure path**

Answer question 1 or 2 wrong and confirm:
- Modal closes immediately.
- Team is pushed back.
- Turn advances.

- [ ] **Step 5: Verify success path**

Answer all three correctly and confirm:
- Boss reward is awarded.
- Pawns reset / victory alert appears.

- [ ] **Step 6: Verify normal challenge tiles**

Land on a normal challenge tile and confirm it still shows a single question with the pass button visible.

---

## Self-Review

**Spec coverage:**
- Three questions one after another → Tasks 1, 3.
- All three must be correct → Task 3 (win only when `index === 2`).
- Wrong answer ends immediately → Task 3 (failure branch before advancement).
- No pass button during boss → Task 2.
- Draw from existing deck → Task 1.
- Timer resets per question → Task 3 (`openChallengeModal` restarts timer each time).
- Normal tiles unchanged → Tasks 1, 3 explicitly preserve normal branch.

**Placeholder scan:**
- No TBD/TODO/"implement later"/"similar to" placeholders.
- All code blocks contain concrete content.
- All file paths and line ranges reference real locations in `lingoparty.js`.

**Type consistency:**
- Boss object shape is consistent across tasks: `{ isBoss: true, cards: [...], index: number }`.
- `currentCard` is derived the same way in `openChallengeModal` and `gradeChallenge`.
- `challengeTypeBadgeEl` and `btnChallengePass` are the same DOM references used elsewhere in the file.
