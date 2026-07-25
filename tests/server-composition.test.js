import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('server mounts the registered deck router before static files', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const mount = source.indexOf("app.use('/api/decks'");
    const staticFiles = source.indexOf('express.static');

    assert.ok(mount >= 0, 'deck router mount is missing');
    assert.ok(staticFiles >= 0, 'static middleware is missing');
    assert.ok(mount < staticFiles, 'deck router must be mounted before static middleware');
    assert.match(source, /createSupabaseRestClient/);
    assert.match(source, /SUPABASE_SERVICE_ROLE_KEY|supabaseServiceRoleKey/);
});

test('all content generators register named decks through the shared handler', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const generationSection = source.slice(
        source.indexOf('// ---- POST /api/generate (Who Am I? characters) ----'),
        source.indexOf('// ---- Admin Telemetry API Endpoints ----')
    );

    for (const endpoint of [
        '/api/generate',
        '/api/generate-taboo',
        '/api/generate-hangman',
        '/api/generate-kelime',
        '/api/generate-millionaire',
        '/api/generate-hats',
        '/api/generate-flashcards',
        '/api/generate-lingoparty'
    ]) {
        assert.match(generationSection, new RegExp(`app\\.post\\('${endpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'[\\s\\S]{0,500}createGenerationHandler`));
    }
    assert.doesNotMatch(generationSection, /AI Fallback|logGameSessionToSupabase|Math\.random\(\)\.toString\(36\)/);
    assert.doesNotMatch(source, /KeyPrefix/);
    assert.doesNotMatch(source, /berkai2026|function extractTeacherContext|function logGameSessionToSupabase|function logGameActivityToSupabase/);
});
