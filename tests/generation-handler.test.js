import test from 'node:test';
import assert from 'node:assert/strict';

import { createGenerationHandler } from '../server/routes/generation-handler.js';

function responseRecorder() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test('generation handler returns registered deck metadata and legacy content key', async () => {
    const calls = [];
    const handler = createGenerationHandler({
        gameType: 'who',
        contentKey: 'characters',
        geminiApiKey: 'platform-secret-key',
        generationService: {
            generateAndRegister: async input => {
                calls.push(input);
                return {
                    id: 'd1',
                    name: 'Space Heroes',
                    currentVersion: { id: 'v1', versionNumber: 1, content: ['Leia'] }
                };
            }
        },
        parseInput: body => ({ theme: body.theme, count: 1 }),
        generate: async () => ['Leia'],
        aiModel: 'gemini-2.5-flash'
    });
    const req = {
        headers: {
            'x-teacher-name': 'Ms Ada',
            'x-ai-key-source': 'platform'
        },
        body: { deckName: 'Space Heroes', theme: 'Space' }
    };
    const res = responseRecorder();

    await handler(req, res);

    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.body.characters, ['Leia']);
    assert.equal(res.body.deck.id, 'd1');
    assert.equal(calls[0].deckName, 'Space Heroes');
});

test('generation handler returns safe domain errors', async () => {
    const handler = createGenerationHandler({
        gameType: 'who',
        contentKey: 'characters',
        geminiApiKey: 'platform-secret-key',
        generationService: {
            generateAndRegister: async () => {
                const error = new Error('Sensitive upstream body');
                error.status = 502;
                error.code = 'TEACHER_KEY_GENERATION_FAILED';
                throw error;
            }
        },
        parseInput: body => body,
        generate: async () => []
    });
    const res = responseRecorder();

    await handler({
        headers: {
            'x-teacher-name': 'Ms Ada',
            'x-ai-key-source': 'teacher',
            'x-gemini-api-key': 'teacher-secret-key'
        },
        body: { deckName: 'Set' }
    }, res);

    assert.equal(res.statusCode, 502);
    assert.equal(res.body.code, 'TEACHER_KEY_GENERATION_FAILED');
    assert.equal(JSON.stringify(res.body).includes('Sensitive upstream'), false);
});

