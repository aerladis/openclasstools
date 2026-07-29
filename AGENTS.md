# OpenClassTools Agent Guide

## Project

OpenClassTools is a classroom game hub. React/Vite owns the main hub and LingoParty, while legacy HTML/CSS/JavaScript clients provide the other games. Express serves static assets and HTTP APIs for named decks, AI generation, and optional session recording.

All game state is local to the browser. Do not add room codes, remote-control screens, or a real-time transport without an explicit new design.

## Commands

```bash
npm install
npm start
npm test
npm --prefix frontend run lint
npm --prefix frontend run build
```

The default server URL is `http://localhost:8090`.

## Configuration

```env
GEMINI_API_KEY=your_gemini_key
PORT=8090
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

Teacher-provided Gemini keys are temporary browser-tab values. Never persist or log them.

## Conventions

- Use ES modules, `const`/`let`, arrow callbacks, and async/await.
- Keep each game self-contained.
- Preserve the glassmorphism design tokens and mobile layouts.
- Use the shared deck library and HTTP session client for deck-backed games.
- Keep standalone play working when telemetry or AI services are unavailable.
- Add or update native `node:test` coverage for behavior changes.

## Adding a game

Add the game client, link it from both hubs when applicable, use the shared particle/theme patterns, and keep its state local. Deck-backed games should use the registered-deck HTTP APIs and record optional session lifecycle events.
