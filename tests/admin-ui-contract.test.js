import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('React exposes only the unlinked control-center admin route', async () => {
    const app = await readFile(new URL('../frontend/src/App.jsx', import.meta.url), 'utf8');
    const hub = await readFile(
        new URL('../frontend/src/components/Hub/GameHub.jsx', import.meta.url),
        'utf8'
    );

    assert.match(app, /path="\/control-center"/);
    assert.doesNotMatch(app, /path="\/admin"/);
    assert.doesNotMatch(hub, /control-center|Admin Panel|to="\/admin"/i);
});

test('admin UI uses cookie auth and never stores a passcode', async () => {
    const dashboard = await readFile(
        new URL('../frontend/src/components/Admin/AdminDashboard.jsx', import.meta.url),
        'utf8'
    );
    assert.match(dashboard, /\/api\/admin\/login/);
    assert.match(dashboard, /\/api\/admin\/session/);
    assert.match(dashboard, /x-csrf-token/);
    assert.doesNotMatch(dashboard, /localStorage|sessionStorage|x-admin-passcode|verifyPasscode/);
});
