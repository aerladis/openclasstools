import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { createAdminDataRouter } from '../server/routes/admin-data.js';

const sessionManager = {
    requireHttp: (req, _res, next) => {
        req.adminSession = { csrfToken: 'csrf' };
        next();
    },
    requireCsrf: (req, res, next) => {
        if (req.headers['x-csrf-token'] !== 'csrf') {
            return res.status(403).json({ code: 'ADMIN_CSRF_INVALID' });
        }
        next();
    }
};

async function withServer({ sessionRepository, deckRepository }, run) {
    const app = express();
    app.use(express.json());
    app.use('/api/admin', createAdminDataRouter({
        sessionManager,
        sessionRepository,
        deckRepository
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

test('passes session filters and exposes exact version detail', async () => {
    const calls = [];
    const sessionRepository = {
        listAdmin: async filters => {
            calls.push(['list', filters]);
            return { items: [], nextCursor: null, summary: { totalSessions: 0 } };
        },
        getAdmin: async id => {
            calls.push(['detail', id]);
            return {
                id,
                deckVersion: { id: 'v2', versionNumber: 2 },
                activity: []
            };
        }
    };

    await withServer({
        sessionRepository,
        deckRepository: {}
    }, async origin => {
        const list = await fetch(
            `${origin}/api/admin/sessions?gameType=taboo&teacher=Ada&participant=Blue&status=completed&limit=25`
        );
        assert.equal(list.status, 200);
        const detail = await fetch(`${origin}/api/admin/sessions/s1`);
        assert.equal(detail.status, 200);
        assert.equal((await detail.json()).session.deckVersion.id, 'v2');
    });

    assert.deepEqual(calls[0][1], {
        gameType: 'taboo',
        teacher: 'Ada',
        participant: 'Blue',
        deck: undefined,
        roomCode: undefined,
        theme: undefined,
        cefr: undefined,
        status: 'completed',
        deckVersionId: undefined,
        from: undefined,
        to: undefined,
        cursor: undefined,
        limit: '25'
    });
});

test('lists deck history and publishes normalized immutable revisions', async () => {
    const calls = [];
    const deckRepository = {
        listAdmin: async filters => {
            calls.push(['list', filters]);
            return { items: [{ id: 'd1', gameType: 'who' }], nextCursor: null };
        },
        getCurrentAdmin: async id => ({
            id,
            gameType: 'who',
            currentVersion: { id: 'v1', content: ['Ada'] }
        }),
        getHistory: async id => {
            calls.push(['history', id]);
            return [{ id: 'v1', versionNumber: 1 }];
        },
        createRevision: async input => {
            calls.push(['revision', input]);
            return {
                id: input.deckId,
                currentVersion: { id: 'v2', versionNumber: 2, content: input.content }
            };
        },
        rename: async (id, name, expectedVersionId) => {
            calls.push(['rename', { id, name, expectedVersionId }]);
            return { id, name };
        },
        setArchived: async (id, archived, expectedVersionId) => {
            calls.push(['archive', { id, archived, expectedVersionId }]);
            return { id, archivedAt: archived ? 'now' : null };
        }
    };

    await withServer({
        sessionRepository: {},
        deckRepository
    }, async origin => {
        assert.equal((await fetch(`${origin}/api/admin/decks`)).status, 200);
        assert.equal((await fetch(`${origin}/api/admin/decks/d1/history`)).status, 200);

        const revision = await fetch(`${origin}/api/admin/decks/d1/revisions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': 'csrf'
            },
            body: JSON.stringify({
                expectedVersionId: 'v1',
                content: [' Grace Hopper ']
            })
        });
        assert.equal(revision.status, 201);
        assert.deepEqual(calls.find(call => call[0] === 'revision')[1].content, ['Grace Hopper']);

        const rename = await fetch(`${origin}/api/admin/decks/d1/name`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': 'csrf'
            },
            body: JSON.stringify({ name: 'Pioneers', expectedVersionId: 'v2' })
        });
        assert.equal(rename.status, 200);

        const archive = await fetch(`${origin}/api/admin/decks/d1/archive`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': 'csrf'
            },
            body: JSON.stringify({ archived: true, expectedVersionId: 'v2' })
        });
        assert.equal(archive.status, 200);
    });
});

test('rejects admin mutations without CSRF and invalid deck content', async () => {
    const deckRepository = {
        getCurrentAdmin: async id => ({
            id,
            gameType: 'taboo',
            currentVersion: { id: 'v1' }
        }),
        createRevision: async () => assert.fail('invalid content must not persist')
    };

    await withServer({
        sessionRepository: {},
        deckRepository
    }, async origin => {
        const noCsrf = await fetch(`${origin}/api/admin/decks/d1/revisions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ expectedVersionId: 'v1', content: [] })
        });
        assert.equal(noCsrf.status, 403);

        const invalid = await fetch(`${origin}/api/admin/decks/d1/revisions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': 'csrf'
            },
            body: JSON.stringify({
                expectedVersionId: 'v1',
                content: [{ word: 'Broken', forbidden: [] }]
            })
        });
        assert.equal(invalid.status, 400);
        assert.equal((await invalid.json()).code, 'INVALID_DECK_CONTENT');
    });
});
