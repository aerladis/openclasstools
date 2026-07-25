# LingoParty Five-Row Board Design

## Goal

Make new LingoParty games start with a 30-tile board arranged as five rows of six tiles, and remove the visible progression line from the game board.

## Scope

The active React implementation at `frontend/src/games/LingoParty/` is the only target. The older standalone LingoParty HTML, CSS, and JavaScript files are not changed.

## Design

`SetupScreen` will initialize its board-length state to `30`. `BoardMap` already uses six tiles per row, so a 30-tile board naturally renders as five serpentine rows without changing coordinate logic.

The board’s SVG progression path will remain structurally present for existing layout and animation code, but will be visually transparent. Tiles, tile effects, hover states, pawns, and movement behavior remain unchanged.

## Verification

Build the React frontend, start a new game with the default setup, and confirm the board contains 30 tiles in five rows with no visible connecting progression line.
