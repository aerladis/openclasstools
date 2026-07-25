import test from 'node:test';
import assert from 'node:assert/strict';

import {
    GenerationServiceError,
    createGenerationService
} from '../server/services/generation-service.js';

test('generates, validates, and persists a named deck', async () => {
    const calls = [];
    const service = createGenerationService({
        deckRepository: {
            createGenerated: async input => {
                calls.push(input);
                return {
                    id: 'd1',
                    name: input.name,
                    currentVersion: { id: 'v1', content: input.content }
                };
            }
        }
    });

    const deck = await service.generateAndRegister({
        gameType: 'who',
        deckName: 'Space Heroes',
        generationInput: { theme: 'Space', count: 1 },
        teacherContext: {
            teacherDisplayName: 'Ms Ada',
            keySource: 'platform',
            apiKey: 'platform-secret',
            teacherKeyUsed: false
        },
        aiProvider: 'gemini',
        aiModel: 'gemini-2.5-flash',
        generate: async ({ apiKey }) => {
            assert.equal(apiKey, 'platform-secret');
            return ['Leia'];
        }
    });

    assert.equal(deck.currentVersion.id, 'v1');
    assert.equal(calls[0].teacherDisplayName, 'Ms Ada');
    assert.deepEqual(calls[0].generationParameters, { theme: 'Space', count: 1 });
});

test('teacher generator failure does not invoke a platform fallback or persistence', async () => {
    let generatedCalls = 0;
    let persistedCalls = 0;
    const service = createGenerationService({
        deckRepository: {
            createGenerated: async () => {
                persistedCalls += 1;
            }
        }
    });

    await assert.rejects(
        () => service.generateAndRegister({
            gameType: 'who',
            deckName: 'Class Set',
            generationInput: {},
            teacherContext: {
                keySource: 'teacher',
                apiKey: 'teacher-secret',
                teacherDisplayName: 'Ms Ada',
                teacherKeyUsed: true
            },
            generate: async () => {
                generatedCalls += 1;
                throw new Error('raw upstream credential detail');
            }
        }),
        error => {
            assert.ok(error instanceof GenerationServiceError);
            assert.equal(error.code, 'TEACHER_KEY_GENERATION_FAILED');
            assert.equal(error.message.includes('raw upstream'), false);
            return true;
        }
    );

    assert.equal(generatedCalls, 1);
    assert.equal(persistedCalls, 0);
});

test('requires a deck name before invoking AI', async () => {
    let calls = 0;
    const service = createGenerationService({
        deckRepository: { createGenerated: async () => {} }
    });

    await assert.rejects(
        () => service.generateAndRegister({
            gameType: 'who',
            deckName: '   ',
            generationInput: {},
            teacherContext: {
                keySource: 'platform',
                apiKey: 'platform-secret',
                teacherDisplayName: 'Ms Ada',
                teacherKeyUsed: false
            },
            generate: async () => {
                calls += 1;
                return ['Leia'];
            }
        }),
        /Deck name is required/
    );
    assert.equal(calls, 0);
});

