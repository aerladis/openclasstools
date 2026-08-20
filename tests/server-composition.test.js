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

test('server mounts session lifecycle routes and stale cleanup before static files', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const sessionMount = source.indexOf("app.use('/api/sessions'");
    const staticFiles = source.indexOf('express.static');

    assert.ok(sessionMount >= 0, 'session router mount is missing');
    assert.ok(sessionMount < staticFiles, 'session router must be mounted before static middleware');
    assert.match(source, /sessionRepository\.abandonStale/);
});

test('all content generators register named decks through the shared handler', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const generationSection = source.slice(
        source.indexOf('// ---- POST /api/generate (Who Am I? characters) ----'),
        source.indexOf('// ---- GET /api/lingoparty-decks')
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

test('server mounts /api/ai/verify endpoint for key & connectivity checks before static files', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const verifyMount = source.indexOf("app.post('/api/ai/verify'");
    const staticFiles = source.indexOf('express.static');

    assert.ok(verifyMount >= 0, '/api/ai/verify endpoint mount is missing');
    assert.ok(verifyMount < staticFiles, '/api/ai/verify must be mounted before static middleware');
    assert.match(source, /GEMINI_QUOTA_EXCEEDED/);
    assert.match(source, /INVALID_GEMINI_KEY/);
});

test('production startup listener is decoupled from argv and package.json sets NODE_ENV=test for tests', async () => {
    const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const packageSource = await readFile(new URL('../package.json', import.meta.url), 'utf8');
    const pkg = JSON.parse(packageSource);

    assert.match(serverSource, /process\.env\.NODE_ENV\s*!==\s*['"]test['"]/);
    assert.doesNotMatch(serverSource, /process\.argv\[1\]/);
    assert.match(pkg.scripts?.test || '', /NODE_ENV=test/);
});

