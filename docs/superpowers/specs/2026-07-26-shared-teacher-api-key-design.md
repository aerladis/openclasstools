# Shared Teacher API Key UX Design

## Goal
Make AI content generation in OpenClassTools require a teacher-provided Google Gemini API key, share that key across every game page in the browser session, and give clear status + a generation console during AI calls.

## Principles
- No platform-provided API key fallback. If the teacher has not entered a key, AI generation is unavailable.
- One key per browser tab session (`sessionStorage`), shared between the React hub, LingoParty, and all legacy HTML games.
- First visit asks for a key once; the teacher can opt out.
- Keep the existing glassmorphism UI style.

## Storage Layer: `shared/ai-key.js`
A vanilla JS IIFE served at `/shared/ai-key.js` and loaded by both React and legacy pages. It reads/writes these `sessionStorage` keys:
- `oct_gemini_key` — the teacher's API key
- `oct_teacher_name` — teacher/classroom name
- `oct_ai_declined` — `"true"` if the user clicked "I don't want to use AI features"

Public API on `window.AiKey`:
- `getKey()` → string
- `setKey(key, name)`
- `hasKey()` → boolean
- `clearKey()`
- `getTeacherName()` → string
- `declineAI()`
- `wantsAI()` → boolean (inverse of declined)

React accesses the same storage through a small service (`frontend/src/services/aiKey.js`) that wraps `window.AiKey`. This avoids duplicating keys/logic.

## First-Visit Prompt
A modal rendered when `!hasKey() && wantsAI()`:
- Header: "Enable AI Content Generation"
- Teacher/classroom name input (required)
- Gemini API key input (required)
- Helper link to Google AI Studio
- Primary: **Save & Enable AI**
- Secondary: **I don't want to use AI features** → calls `declineAI()` and closes

The prompt appears on:
- `index.html` / React hub (`/`) on first load
- Each legacy game page that has AI generation on first load

Once declined or saved, the modal does not reappear on reload.

## Key Status Badge
Displayed in the React hub header and in each legacy game's top bar:
- `🟢 AI Key Active` when `hasKey()`
- `🔴 AI Generation Disabled` when `!hasKey()`
- A "Change Key" button reopens the first-visit prompt so the teacher can update or clear the key.

## Disabling AI Generation Without a Key
Client-side:
- "Generate with AI" buttons are hidden or disabled with a tooltip: "Add a Gemini API key to use AI generation."
- Legacy games that currently show an inline API key input replace it with the status badge + "Change Key" button.

Server-side:
- Remove the `keySource` / platform-key fallback.
- Generation endpoints require the `x-gemini-api-key` header and return `400` if missing.
- Update `server/http/teacher-context.js` and generation route handlers accordingly.

## AI Generation Console
During any `/api/generate*` call, show a panel with status steps:
1. `Sending request...`
2. `Generating content...`
3. `Received N items`
4. `Saving deck...`
5. `Done` or `Error: <message>`

For legacy games, this is a simple DOM log appended to a modal/overlay. For the React hub, a small component renders the same steps.

## Affected Files
- New: `shared/ai-key.js`, `shared/ai-key-prompt.js`, `shared/ai-key-prompt.css`
- New: `frontend/src/services/aiKey.js`
- Update: `frontend/src/services/platformApi.js`
- Update: `frontend/src/components/Common/ApiKeyModal.jsx`
- Update: `frontend/src/components/Hub/GameHub.jsx`
- Update: legacy HTML/JS files with AI generation (who, taboo, hangman, millionaire, kelime, hats, flashcards)
- Update: `server/http/teacher-context.js`, generation route handlers, server tests

## Security
- The API key stays in `sessionStorage` only; it is never persisted to localStorage or server-side storage.
- The server receives the key only in request headers.

## Out of Scope
- Changing non-AI game flows.
- Refactoring unrelated legacy game logic.
- Prompting on every page load once the user has saved or declined.
