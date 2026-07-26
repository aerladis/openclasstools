import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('operations documentation covers persistent platform setup and key privacy', async () => {
    const [readme, database, admin, deployment, envExample] = await Promise.all([
        readFile(new URL('../README.md', import.meta.url), 'utf8'),
        readFile(new URL('../docs/database.md', import.meta.url), 'utf8'),
        readFile(new URL('../docs/admin-dashboard.md', import.meta.url), 'utf8'),
        readFile(new URL('../DEPLOY.md', import.meta.url), 'utf8'),
        readFile(new URL('../.env.example', import.meta.url), 'utf8')
    ]);

    for (const name of [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ADMIN_PASSCODE',
        'ADMIN_SESSION_SECRET'
    ]) {
        assert.match(envExample, new RegExp(`^${name}=`, 'm'));
        assert.match(deployment, new RegExp(name));
    }
    assert.match(readme, /named decks/i);
    assert.match(readme, /\/control-center/);
    assert.match(database, /20260725130600_persistent_platform_foundation\.sql/);
    assert.match(database, /npm run seed:decks/);
    assert.match(database, /service.role/i);
    assert.match(admin, /HttpOnly/i);
    assert.match(admin, /sessionStorage/);
    assert.match(admin, /teacher.*key.*never|never.*teacher.*key/is);
});

test('deployment script stops when persistent-platform secrets are missing', async () => {
    const script = await readFile(new URL('../deploy.sh', import.meta.url), 'utf8');
    for (const name of [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ADMIN_PASSCODE',
        'ADMIN_SESSION_SECRET'
    ]) {
        assert.match(script, new RegExp(name));
    }
    assert.match(script, /exit 1/);
    assert.match(script, /npm run build/);
});

