import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { createAdminSessionManager } from '../server/security/admin-session.js';
import { createAdminAuthRouter } from '../server/routes/admin-auth.js';
import { createAdminDataRouter } from '../server/routes/admin-data.js';

async function withServer({ auth, repository }, run) {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', createAdminAuthRouter({
        sessionManager: auth,
        loginRateLimitMax: 2,
        loginRateLimitWindowMs: 60_000
    }));
    app.use('/api/admin', createAdminDataRouter({
        sessionManager: auth,
        sessionRepository: repository
    }));
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const { port } = server.address();
        await run(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

function createAuth() {
    return createAdminSessionManager({
        passcode: 'admin-passcode-123',
        secret: 'admin-test-secret-with-enough-length',
        secure: false,
        ttlMs: 60_000
    });
}

test('logs in with an HttpOnly cookie and restores the session', async () => {
    await withServer({
        auth: createAuth(),
        repository: { listAdmin: async () => ({ items: [], nextCursor: null, summary: {} }) }
    }, async origin => {
        const wrong = await fetch(`${origin}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: 'wrong' })
        });
        assert.equal(wrong.status, 401);

        const login = await fetch(`${origin}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: 'admin-passcode-123' })
        });
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie');
        const body = await login.json();
        assert.match(cookie, /HttpOnly/);
        assert.ok(body.csrfToken);
        assert.doesNotMatch(JSON.stringify(body), /admin-passcode-123/);

        const session = await fetch(`${origin}/api/admin/session`, {
            headers: { Cookie: cookie }
        });
        assert.equal(session.status, 200);
        assert.equal((await session.json()).csrfToken, body.csrfToken);
    });
});

test('protects admin data and requires CSRF to log out', async () => {
    let readCount = 0;
    await withServer({
        auth: createAuth(),
        repository: {
            listAdmin: async () => {
                readCount += 1;
                return {
                    items: [{ id: 's1', gameType: 'who' }],
                    nextCursor: null,
                    summary: { totalSessions: 1 }
                };
            }
        }
    }, async origin => {
        const denied = await fetch(`${origin}/api/admin/sessions`);
        assert.equal(denied.status, 401);
        assert.equal(readCount, 0);

        const login = await fetch(`${origin}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: 'admin-passcode-123' })
        });
        const cookie = login.headers.get('set-cookie');
        const { csrfToken } = await login.json();

        const allowed = await fetch(`${origin}/api/admin/sessions`, {
            headers: { Cookie: cookie }
        });
        assert.equal(allowed.status, 200);
        assert.equal((await allowed.json()).items[0].id, 's1');

        const noCsrf = await fetch(`${origin}/api/admin/logout`, {
            method: 'POST',
            headers: { Cookie: cookie }
        });
        assert.equal(noCsrf.status, 403);

        const logout = await fetch(`${origin}/api/admin/logout`, {
            method: 'POST',
            headers: {
                Cookie: cookie,
                'x-csrf-token': csrfToken
            }
        });
        assert.equal(logout.status, 200);
        assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
    });
});

test('rate limits repeated login attempts independently', async () => {
    await withServer({
        auth: createAuth(),
        repository: { listAdmin: async () => ({ items: [] }) }
    }, async origin => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
            const response = await fetch(`${origin}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode: 'wrong' })
            });
            assert.equal(response.status, 401);
        }
        const limited = await fetch(`${origin}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode: 'wrong' })
        });
        assert.equal(limited.status, 429);
    });
});
