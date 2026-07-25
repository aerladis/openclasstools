# LingoParty Performance and Welcome Screen Design

## Goal

Make LingoParty animations fluid, remove capsule tiles, and replace the welcome screen with a compact team setup and shared AI deck library.

## Performance

The wheel canvas will allocate its bitmap only when its displayed size or device-pixel ratio changes; each animation frame will only clear and redraw the existing bitmap. The board will reduce its persistent visual work by replacing the per-star DOM animation field and expensive always-on SVG filter animations with a single lightweight background treatment and limited transform/opacity animations. Animated effects remain available for short, meaningful events rather than running continuously.

## Board Styling

Capsule tiles are removed. Sphere and hex remain available through the style control. Hexes use the selected lunar-metal panel texture and a 60-degree rotation (one sixth of a full turn) from the existing flat-top presentation. Sphere tiles use varied planet textures per tile, including gas-giant swirl, cratered moon, ice world, lava world, and nebula planet surfaces. Fate Box tiles use an animated luminous gift-crate treatment; vortex hazards use a compact gravitational swirl; asteroid hazards use a fractured-rock treatment. These special tiles maintain high contrast against standard tiles and do not rely on heavy continuous filters.

## Welcome Screen

The welcome screen becomes a compact two-column layout:

- A small Solo / Duo / Crew segmented control: 1, 2, or 3+ students per pawn.
- A separate team-count control determines how many pawn rows appear.
- Each pawn row has an editable team name, a selectable emoji pawn, and its color. Students can customize the emoji for their own team.
- The AI Mission Center offers Generate new deck and Saved decks without obscuring team setup.

## Shared Deck Library

Generated decks are persisted server-side in a flat JSON file, preserving the teacher name, deck title, topic, CEFR level, creation timestamp, and cards. A shared listing endpoint returns saved decks to all teachers. Teachers can select a saved deck and launch a game with it; no database or authentication layer is introduced.

## Mode-Aware Challenges

The selected mode travels with the generation request and saved-deck metadata. AI prompts require solo responses for Solo, paired dialogue and turn-taking for Duo, and 3+ participant collaboration for Crew. The fallback roleplay cards follow the same mode-specific framing.

## Verification

Verify wheel canvas dimensions stay stable while spinning, the board retains sphere and rotated-hex style options but no capsule option, the welcome screen renders compact per-team emoji controls, saved decks are available from a fresh browser session, and generated roleplay wording matches Solo, Duo, and Crew modes. Run frontend lint/build and exercise the API endpoints.
