# Administration Dashboard

The dashboard is intentionally unlinked from the normal game hub. Open `/control-center` directly and enter the server-configured `ADMIN_PASSCODE`.

The server verifies the passcode and returns a short-lived signed session in an HttpOnly cookie. The passcode is never written to `localStorage` or `sessionStorage`. State-changing requests also require the in-memory CSRF token issued with the administrator session.

## Sessions

The Sessions tab shows teacher and participant labels, game/room, selected deck and exact immutable version, theme, CEFR, platform-key versus teacher-key generation, status, timing, result, and activity. Filters cover teacher, participant, game, deck, room code, theme, CEFR, status, and date.

Teacher names are user-entered labels and are not authenticated identities.

## Decks

The Decks tab can filter, inspect revision history, rename, publish game-aware edits, archive/restore, and list sessions that used a revision. Publishing creates a new version and uses optimistic concurrency; it never rewrites a historical version.

## Live remote

The Live remote tab retains host-room state, question controls, Millionaire answers/lifelines, LingoParty grading, and live pack synchronization. Both joining and every privileged Socket.IO action require a valid administrator cookie.

## Key privacy

A teacher Gemini key is optional. It exists only in browser `sessionStorage`, is sent only when `teacher` is explicitly selected, and is never stored in decks, versions, sessions, logs, or the dashboard. Only the boolean `teacherKeyUsed` provenance flag is recorded. If the teacher key fails, the request fails; it never retries with the platform key.

The Supabase service-role key, administrator passcode, signing secret, and platform Gemini key are server-only environment variables.

