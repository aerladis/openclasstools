# Test Instructions

## Automated verification

```bash
npm test
npm --prefix frontend run lint
npm --prefix frontend run build
```

The test suite covers schema security, deck validation/versioning, named generation, teacher-key handling, session lifecycle, admin cookies/CSRF, protected Socket.IO commands, game adoption, and inventory.

## Core browser flow

For each content game—Who Am I?, Taboo, Hangman, Millionaire, Word Game, Flashcards, Six Thinking Hats, and LingoParty:

1. Enter a teacher display name.
2. Select an existing registered deck and start the game.
3. Confirm gameplay continues normally.
4. Return to setup.
5. Enter a unique deck name and generate a deck.
6. Confirm the generated deck is selected and remains available after reload.
7. Start and finish a real play session.

For Bottle and Wheel, enter the teacher/participant labels, play once, and confirm a deckless session is recorded.

## Teacher API-key flow

1. Open the teacher-key dialog from the hub.
2. Set a teacher name and custom Gemini key.
3. Choose `teacher` as the generation source.
4. Generate a uniquely named deck.
5. Confirm the dashboard marks the version as teacher-key generated but never displays or stores the key.
6. Submit an invalid teacher key and confirm the request fails with an actionable error.
7. Confirm it does not retry with the platform key.
8. Close the browser tab and confirm the custom key is gone; the teacher name may remain.

## Control center

Open `/control-center` directly.

- An unauthenticated browser must see the passcode form.
- Login must set an HttpOnly cookie; the passcode must not appear in local or session storage.
- Filter sessions by teacher, participant, game, deck, room code, theme, CEFR, status, and date.
- Inspect a session and confirm its exact deck version, generation source, key-source flag, participants, result, and activity.
- Rename a deck.
- Edit it with the game-aware form and publish a new immutable revision.
- Confirm an older session still resolves to its older revision.
- Archive and restore the deck.
- Open two admin tabs on the same deck and confirm a stale edit gets a version-conflict warning.
- Connect the Live remote tab to a four-character host room and test relevant controls.

## Security checks

- `GET /api/admin/sessions` without a valid cookie returns `401`.
- Admin mutations without CSRF return `403`.
- An unauthenticated Socket.IO client cannot join or send privileged commands.
- Public clients never receive `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSCODE`, or `ADMIN_SESSION_SECRET`.
- Teacher Gemini keys do not appear in logs, database rows, or built frontend assets.
