# Remove Socket.IO and the Control Center

## Goal

Simplify OpenClassTools into a collection of standalone browser games backed by the existing deck, generation, and play-session HTTP APIs. Remove all real-time remote-control behavior, all room/game codes shown in the frontend, and the complete Control Center.

## Scope

### Keep

- The React game hub and LingoParty game.
- Legacy standalone game pages.
- Named deck selection and AI-assisted deck generation.
- Public play-session creation and completion over HTTP.
- Supabase repositories, migrations, and server-only credentials needed by the retained HTTP platform.
- Teacher Gemini-key handling.

### Remove

- The Socket.IO server and every server-side room, host, admin, synchronization, and remote-action handler.
- Socket.IO browser scripts and client code in legacy games.
- `socket.io` and `socket.io-client` dependencies.
- Socket.IO development and deployment proxy configuration.
- Generated room/game codes and all frontend code displays.
- The complete React Control Center, including login, dashboard, deck-administration, session-administration, and live-remote views.
- Server administrator authentication, administrator data routes, and Socket.IO administrator authorization modules used only by the Control Center.
- Tests and current documentation that assert or advertise removed behavior.

Historical database migrations may retain existing nullable `room_code` columns so deployed databases do not require a destructive migration. Retained clients will stop generating or sending room codes.

## Kelime Completion

The unfinished Kelime task will be completed as part of the simplification. When a registered or default deck starts, the setup controls and mounted deck-library section will be hidden. Gameplay action controls remain available. Starting a new round through the existing page flow restores only the setup state that remains supported.

## Minimal Teacher API-Key Guide

The main game hub will include a compact, collapsed-by-default teacher guide beneath the header. Its short copy will explain only that a teacher's Gemini API key is temporary, kept securely in the current browser tab, and used to avoid shared-quota limits. An action inside the expanded guide will open the existing API-key dialog. The guide will use native disclosure behavior and will not add a long tutorial or a separate screen.

## Architecture and Data Flow

Express will use its normal HTTP server directly, without a Socket.IO wrapper. Browser games will manage all game state locally. Deck loading and generation continue through HTTP APIs. A game may create and complete a play-session record through the existing HTTP platform client, but it will no longer attach a room code.

The React application will expose only the hub and game routes. Requests for the retired `/control-center` route will fall through to the normal application behavior with no administration UI or privileged administrator API behind it.

## Error Handling

Standalone play must continue if session telemetry cannot be recorded. Existing safe error callbacks remain in place. Removing remote synchronization must not introduce references to missing socket globals or missing room identifiers.

## Testing

- Add or update contract tests to assert that Kelime hides its deck library when play starts.
- Add a frontend contract test for the collapsed teacher API-key guide and its key-dialog action.
- Add negative inventory assertions for Socket.IO dependencies, imports, browser scripts, server handlers, game-code UI, and Control Center routes.
- Update affected existing tests so they cover retained HTTP composition only.
- Run the complete root Node test suite.
- Run the React production build and lint checks available in the repository.
- Search active source and configuration for remaining Socket.IO and Control Center support.

## Non-Goals

- Replacing Socket.IO with WebSockets, polling, or another remote-control system.
- Rebuilding administration in another form.
- Dropping historical database columns or rewriting already-applied migrations.
- Refactoring unrelated game logic or visual design.
