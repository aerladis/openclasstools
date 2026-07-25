import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';

import { createSessionRouter } from '../server/routes/sessions.js';

async function withServer(router, run) {
    const app = express();
    app.use(express.json());
    app.use('/api/sessions', router);
    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
        const { port } = server.address();
        await run(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise(resolve => server.close(resolve));
    }
}

test('starts and completes a game session', async () => {
    const calls = [];
    const repository = {
        start: async input => {
            calls.push({ type: 'start', input });
            return { id: 's1', ...input, status: 'active' };
        },
        complete: async (id, result) => {
            calls.push({ type: 'complete', id, result });
            return { id, status: 'completed', result };
        }
    };

    await withServer(createSessionRouter({ repository }), async origin => {
        const started = await fetch(`${origin}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                gameType: 'taboo',
                teacherDisplayName: 'Ms Ada',
                participantNames: ['Blue', 'Red'],
                deckId: 'd1',
                deckVersionId: 'v2'
            })
        });
        assert.equal(started.status, 201);
        assert.equal((await started.json()).session.id, 's1');

        const completed = await fetch(`${origin}/api/sessions/s1/complete`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: { score: 12 } })
        });
        assert.equal(completed.status, 200);
        assert.equal((await completed.json()).session.status, 'completed');
    });

    assert.deepEqual(calls[1], {
        type: 'complete',
        id: 's1',
        result: { score: 12 }
    });
});

test('returns safe validation and completion-conflict errors', async () => {
    const validation = Object.assign(new Error('Teacher name is required'), {
        status: 400,
        code: 'TEACHER_NAME_REQUIRED'
    });
    const conflict = Object.assign(new Error('Session has already ended'), {
        status: 409,
        code: 'SESSION_ALREADY_COMPLETED'
    });
    const repository = {
        start: async () => { throw validation; },
        complete: async () => { throw conflict; }
    };

    await withServer(createSessionRouter({ repository }), async origin => {
        const started = await fetch(`${origin}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
        assert.equal(started.status, 400);
        assert.equal((await started.json()).code, 'TEACHER_NAME_REQUIRED');

        const completed = await fetch(`${origin}/api/sessions/s1/complete`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: {} })
        });
        assert.equal(completed.status, 409);
        assert.equal((await completed.json()).code, 'SESSION_ALREADY_COMPLETED');
    });
});

test('does not expose database error details', async () => {
    const repository = {
        start: async () => {
            const error = new Error('secret database detail');
            error.status = 503;
            throw error;
        }
    };

    await withServer(createSessionRouter({ repository }), async origin => {
        const response = await fetch(`${origin}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{}'
        });
        assert.equal(response.status, 503);
        const body = await response.json();
        assert.equal(body.error, 'Session service is temporarily unavailable');
        assert.doesNotMatch(JSON.stringify(body), /secret database detail/);
    });
});
