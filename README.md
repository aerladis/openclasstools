# OpenClassTools

OpenClassTools is a collection of standalone classroom games with reusable named decks, AI-assisted content generation, and optional play-session recording. React/Vite provides the main hub and LingoParty; the established games remain focused browser clients behind the same Express HTTP server.

## Games

Deck-backed games include Who Am I?, Taboo, Hangman, Millionaire, Word Game, Vocabulary Flashcards, Six Thinking Hats, and LingoParty. Spin the Bottle and Wheel of Names are deckless classroom utilities.

## Platform behavior

- Generated packs are registered as immutable named deck versions.
- Games can load an existing registered deck for their game type.
- Game state stays in the browser; no room codes or remote-control server are used.
- Optional HTTP session records keep the teacher label, participants or teams, selected deck version, status, and result.
- A teacher Gemini key is temporary: it stays in the current browser tab's `sessionStorage`, is sent only for AI generation, and is never persisted by OpenClassTools.

## Local setup

Requirements:

- Node.js 18 or newer
- A Supabase project
- A Gemini API key for AI generation

Install and build:

```bash
npm install
npm run build
```

Copy `.env.example` to `.env`:

```env
GEMINI_API_KEY=your_gemini_key
PORT=8090
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

Apply the migration and seed the built-in named decks as described in [docs/database.md](docs/database.md):

```bash
npm run seed:decks
npm start
```

Open `http://localhost:8090`.

## Main APIs

- `GET /api/decks?gameType=...` lists registered current decks.
- `POST /api/sessions` starts an optional play session.
- `PATCH /api/sessions/:id/complete` completes it.
- `POST /api/generate*` generates and registers a named deck.
- `GET /api/health` reports HTTP server health.

## Verification

```bash
npm test
npm --prefix frontend run lint
npm --prefix frontend run build
```
