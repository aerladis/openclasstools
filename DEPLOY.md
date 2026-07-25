# Deployment

OpenClassTools requires the Node server, the built React frontend, and the Supabase schema. Do not expose the Supabase service-role key to browser code or commit it to Git.

## Required production environment

Create `/var/www/play.metrix.dpdns.org/.env` with:

```env
NODE_ENV=production
PORT=8090
ALLOWED_ORIGINS=https://play.metrix.dpdns.org
GEMINI_API_KEY=your_platform_gemini_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
ADMIN_PASSCODE=your_long_administrator_passcode
ADMIN_SESSION_SECRET=your_random_signing_secret
```

`SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSCODE`, and `ADMIN_SESSION_SECRET` are server-only secrets. Use a random signing secret of at least 32 characters.

## Database rollout

1. Apply `supabase/migrations/20260725130600_persistent_platform_foundation.sql` to the intended Supabase project.
2. Verify that `decks`, `deck_versions`, `game_sessions`, and `game_activity_logs` exist.
3. Verify that `anon` and `authenticated` have no direct access to operational or legacy telemetry tables.
4. With the production `.env` loaded, run `npm run seed:decks` once. The seed is idempotent.

The migration retains recoverable legacy telemetry as explicitly marked legacy sessions. This repository intentionally includes no database dump or deployment archive.

## VPS rollout

From the project root on the VPS:

```bash
chmod +x deploy.sh
./deploy.sh
```

The script preserves the server `.env`, refuses to start if the four persistent-platform secrets are missing, installs dependencies, builds React, configures Nginx/PM2, and restarts the app.

For a manual update:

```bash
cd /var/www/play.metrix.dpdns.org
git pull
npm install
npm run build
npm run seed:decks
pm2 restart openclasstools
```

## Post-deployment checks

```bash
pm2 status
pm2 logs openclasstools
curl -fsS https://play.metrix.dpdns.org/api/health
```

Then verify:

- the canonical hub contains all ten games;
- a registered deck can be selected;
- a named generation creates a reusable deck;
- a session appears at `/control-center`;
- unauthenticated admin APIs return `401`;
- `/admin` and `/admin.html` redirect to `/control-center`;
- Socket.IO live controls work after administrator login.
