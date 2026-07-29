# Victory Modal CSS Integration Design

## Goal

Use the existing `VictoryModal.module.css` file from the July 28 evening workspace in the React `VictoryModal` component.

## Scope

- Change `VictoryModal.jsx` to import `VictoryModal.module.css`.
- Replace the current `ShopModal.module.css` class references and inline presentation styles with the matching Victory modal CSS-module classes.
- Preserve team sorting, winner selection, button behavior, text, and navigation.
- Do not modify `VictoryModal.module.css`.
- Do not change any other game behavior or styling.

## Component Structure

The modal will use the class hierarchy already defined by the recovered stylesheet:

- `overlay` and `card` for the modal shell.
- `header`, `crownContainer`, `crownEmoji`, `gameOverBadge`, `title`, and `subtitle` for the heading.
- `winnerHeroCard`, `winnerBadge`, `winnerPawn`, `winnerName`, and `winnerStatsRow` for the winning team.
- `leaderboardSection`, `leaderboardList`, and row-level classes for the final rankings.
- `actionRow`, `btnRematch`, and `btnHub` for the existing actions.

## Behavior

The component remains presentational. It continues to:

1. Sort teams by trophies, then coins.
2. Display the leading team as the winner.
3. Render every team in rank order.
4. Call `onPlayAgain` from the rematch button.
5. Call `onReturnHub` from the return button.

## Verification

- Add a source-level regression test that requires the Victory modal to import and use its own CSS module.
- Run the regression test before and after the component change.
- Run the full test suite, frontend lint, and production build.
- Verify the modal visually in the browser without changing the recovered stylesheet.
