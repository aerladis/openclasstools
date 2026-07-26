# OpenClassTools

OpenClassTools is a classroom game web app with reusable named decks, AI-assisted content generation, real play-session recording, and a protected administration dashboard. React/Vite owns the canonical hub, LingoParty, and administration UI; the established games continue as focused browser clients behind the same Express and Socket.IO server.

## Games

The hub contains eight deck-backed content games:

- Who Am I?
- Taboo
- Hangman
- Millionaire
- Word Game
- Vocabulary Flashcards
- Six Thinking Hats
- LingoParty

Spin the Bottle and Wheel of Names are deckless utilities. They still record play sessions.

## Platform behavior

- Every generated pack requires a deck name and is registered as an immutable first version.
- Any game can load an already registered deck for its game type.
- Administrator edits publish a new version; sessions keep pointing to the exact version used.
- Session records include the teacher label, participants or teams, game, room code, status, result, and generation metadata.
- The React hub has no administrator link. The protected dashboard is available directly at `/control-center`.
- Live Socket.IO remote control is part of the protected dashboard.

Teacher names are labels, not accounts. A teacher can explicitly use the platform Gemini key or a custom key. Custom keys live only in browser `sessionStorage`, are sent only for the selected generation request, and never fall back silently to the platform key.

## Local setup

Prerequisites:

- Node.js 18 or newer
- A Supabase project
- A Gemini key for platform-key generation

Install and build:

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` and provide real values:

```env
GEMINI_API_KEY=your_platform_gemini_key
PORT=8090
ALLOWED_ORIGINS=http://localhost:8090
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
ADMIN_PASSCODE=your_long_administrator_passcode
ADMIN_SESSION_SECRET=your_random_signing_secret
```

Apply the database migration and seed the built-in decks as described in [docs/database.md](docs/database.md). Then start the app:

```bash
npm run seed:decks
npm start
```

Open `http://localhost:8090`. Open `http://localhost:8090/control-center` directly for administration.

## Main APIs

- `GET /api/decks?gameType=...` lists registered current decks.
- `POST /api/sessions` starts a real play session.
- `PATCH /api/sessions/:id/complete` completes it.
- `POST /api/generate*` endpoints generate and atomically register named decks.
- `POST /api/admin/login` creates the signed administrator cookie.
- Protected `/api/admin/sessions*` and `/api/admin/decks*` routes power analytics and deck management.
- `GET /api/health` reports server and database readiness.

See [docs/admin-dashboard.md](docs/admin-dashboard.md), [DEPLOY.md](DEPLOY.md), and [TEST_INSTRUCTIONS.md](TEST_INSTRUCTIONS.md) for operations and verification.

## Verification

```bash
npm test
npm --prefix frontend run lint
npm --prefix frontend run build
```
