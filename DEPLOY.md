# Deployment

OpenClassTools requires the Node server, the built React frontend, and the Supabase schema. Never expose the Supabase service-role key to browser code or commit it to Git.

## Required production environment

Create `/var/www/play.metrix.dpdns.org/.env`:

```env
NODE_ENV=production
PORT=8090
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
```

## Database rollout

1. Apply `supabase/migrations/20260725130600_persistent_platform_foundation.sql`.
2. Confirm the deck, deck-version, and game-session tables exist.
3. Keep the service-role key server-only.
4. Run `npm run seed:decks` once; the seed is idempotent.

## VPS rollout

From the project root:

```bash
chmod +x deploy.sh
./deploy.sh
```

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

Verify that the hub loads, a registered deck can be selected, named AI generation succeeds, and a game can finish even when optional session recording is unavailable.
