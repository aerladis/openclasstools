import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { createDeckRouter } from '../server/routes/decks.js';

async function withServer(router, run) {
    const app = express();
    app.use(express.json());
    app.use('/api/decks', router);
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const { port } = server.address();
        await run(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

test('GET /api/decks returns game-filtered registered decks', async () => {
    const repository = {
        listCurrent: async gameType => [{
            id: 'd1',
            gameType,
            name: 'Starter',
            currentVersion: { id: 'v1', versionNumber: 1, content: ['A'] }
        }]
    };

    await withServer(createDeckRouter({ repository }), async origin => {
        const response = await fetch(`${origin}/api/decks?gameType=who`);
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.equal(body.decks[0].gameType, 'who');
    });
});

test('GET /api/decks rejects deckless and missing game types', async () => {
    const repository = { listCurrent: async () => assert.fail('repository must not be called') };

    await withServer(createDeckRouter({ repository }), async origin => {
        for (const query of ['', '?gameType=bottle']) {
            const response = await fetch(`${origin}/api/decks${query}`);
            assert.equal(response.status, 400);
            assert.equal((await response.json()).code, 'INVALID_GAME_TYPE');
        }
    });
});

test('GET /api/decks/:id returns a registered deck or 404', async () => {
    const repository = {
        getCurrent: async id => id === 'd1'
            ? { id: 'd1', gameType: 'who', name: 'Starter', currentVersion: { id: 'v1', content: ['Ada'] } }
            : null
    };

    await withServer(createDeckRouter({ repository }), async origin => {
        const found = await fetch(`${origin}/api/decks/d1`);
        assert.equal(found.status, 200);
        assert.equal((await found.json()).deck.id, 'd1');

        const missing = await fetch(`${origin}/api/decks/missing`);
        assert.equal(missing.status, 404);
        assert.equal((await missing.json()).code, 'DECK_NOT_FOUND');
    });
});
