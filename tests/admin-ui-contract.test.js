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

test('control center includes analytics, versioned deck editing, and protected live controls', async () => {
    const [sessions, decks, editor, remote] = await Promise.all([
        readFile(new URL('../frontend/src/components/Admin/SessionsView.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../frontend/src/components/Admin/DecksView.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../frontend/src/components/Admin/editors/DeckEditor.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../frontend/src/components/Admin/RemoteControlView.jsx', import.meta.url), 'utf8')
    ]);

    for (const filter of [
        'teacher', 'participant', 'gameType', 'deck', 'roomCode',
        'theme', 'cefr', 'status', 'from', 'to'
    ]) {
        assert.match(sessions, new RegExp(`\\b${filter}\\b`));
    }
    assert.match(sessions, /Exact content/);
    assert.match(decks, /Publish|publish/);
    assert.match(decks, /Archive/);
    assert.match(decks, /Sessions using/);
    assert.doesNotMatch(editor, /textarea/i);
    assert.match(remote, /USE_LIFELINE/);
    assert.match(remote, /GRADE_ANSWER/);
    assert.match(remote, /updateWordListAdmin/);
});
