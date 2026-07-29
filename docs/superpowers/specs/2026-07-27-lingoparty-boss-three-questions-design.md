# LingoParty Boss Challenge — Three Questions Design

## Summary

When a team lands on the finish/trophy tile in LingoParty, the current behavior presents a single "Boss Challenge" card. This design changes that behavior so the boss challenge presents **three consecutive questions**. The team must answer **all three correctly** to win the boss reward. A single wrong answer ends the challenge immediately in failure. There is no pass/skip option during the boss.

## Goals

- Increase tension and stakes for the final tile.
- Keep the change scoped to the client-side game logic (`lingoparty.js`).
- Reuse the existing challenge modal, timer, and category rendering.
- Draw the three boss questions from the already-generated deck.

## Non-Goals

- Adding a separate pool of "boss-only" questions on the server.
- Changing normal challenge tile behavior.
- Adding new screens or modals.

## Decisions Made During Brainstorming

| Topic | Decision |
|-------|----------|
| Scoring | All three questions must be answered correctly to win. |
| Wrong answer | Ends the boss challenge immediately (failure). |
| Pass/Skip | No pass button is shown during the boss. |
| Question source | Draw three cards from `gameState.deck`. |
| Timer | Reset per question using the existing per-type timer values. |
| Implementation approach | Extend `gameState.activeChallenge` to hold an array of cards and an index. |

## Data Model

`gameState.activeChallenge` remains the single source of truth for an open challenge.

For a **normal tile**, it stays a single card object:

```js
{
  type: 'riddle',
  prompt: '...',
  answer: '...',
  coins: 15
}
```

For the **boss challenge**, it becomes:

```js
{
  isBoss: true,
  cards: [card1, card2, card3],
  index: 0
}
```

The modal reads `activeChallenge.cards[activeChallenge.index]` to render the current question.

## Boss Start Flow

1. Team lands on `finish` or `trophy` tile.
2. `handleTileAction` draws **three cards** from `gameState.deck`.
3. If fewer than three cards remain, generate placeholder fallback cards to guarantee a playable boss.
4. Wrap the three cards in the boss object and call `openChallengeModal(activeChallenge, team)`.

## Modal UI Changes

- The existing challenge modal is reused.
- When `activeChallenge.isBoss` is true:
  - Show a boss header such as `👑 Boss Challenge — Question 1/3`.
  - Hide the pass button.
  - Update the coins badge to reflect the boss reward context, e.g. `👑 Boss Reward`.
- Normal challenge tiles remain unchanged.

## Grading Flow

### Correct Answer

1. Clear the timer.
2. If `index < 2`:
   - Increment `index`.
   - Re-render the modal with the next card.
   - Reset the timer for the new card.
3. If `index === 2` (last question correct):
   - Close the modal.
   - Award the boss win: Gibel Cube, trophy, board warp/reset pawns, victory check.

### Wrong Answer

1. Clear the timer.
2. Close the modal immediately.
3. Apply failure: play damage sound, push the team back to `startPos`, render pawns, show failure status.
4. End the turn.

### Pass

The pass button is hidden during the boss, so no pass handling is required.

## Files Changed

- `lingoparty.js` — logic for starting the boss, rendering progress, advancing questions, and win/fail grading.
- `lingoparty.css` (optional) — minor styling for the boss progress badge if needed.

## Backwards Compatibility

- Normal challenge tiles are unaffected.
- The boss challenge uses the same card schema as normal tiles, so no API or prompt changes are needed.
- Existing saved/shared decks continue to work.

## Testing Notes

- Start a LingoParty game and reach the finish tile.
- Verify three questions appear in sequence.
- Verify progress indicator updates (1/3, 2/3, 3/3).
- Verify pass button is hidden during the boss.
- Verify a wrong answer on question 1 or 2 ends the boss immediately.
- Verify answering all three correctly awards the boss reward.
- Verify normal challenge tiles still behave as before.
