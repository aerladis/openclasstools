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
