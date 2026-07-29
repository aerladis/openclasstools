# Administration Dashboard Retirement

The former administration dashboard and remote-control screen have been retired to keep OpenClassTools simple. Teachers now use the main game hub and each game manages its own state locally.

Named deck selection, AI generation, and optional play-session recording remain available through the retained HTTP APIs.

Teacher Gemini keys remain temporary in browser `sessionStorage`, are sent only for generation requests, and are never persisted by OpenClassTools.
