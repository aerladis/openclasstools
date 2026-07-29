import test from 'node:test';
import assert from 'node:assert/strict';

import {
    DeckNameConflictError,
    createDeckRepository
} from '../server/repositories/deck-repository.js';

test('creates a named deck through one atomic RPC call', async () => {
    const calls = [];
    const client = {
        rpc: async (name, payload) => {
            calls.push({ name, payload });
            return {
                deck: {
                    id: 'deck-1',
                    game_type: 'who',
                    name: 'Space Heroes',
                    current_version_id: 'version-1',
                    is_system: false,
                    archived_at: null,
                    created_at: '2026-07-25T00:00:00Z',
                    updated_at: '2026-07-25T00:00:00Z'
                },
                version: {
                    id: 'version-1',
                    deck_id: 'deck-1',
                    version_number: 1,
                    content: ['Leia'],
                    source: 'ai',
                    theme: 'Space',
                    cefr_level: null,
                    generation_parameters: { count: 1 },
                    teacher_display_name: 'Ms Ada',
                    ai_provider: 'gemini',
                    ai_model: 'gemini-2.5-flash',
                    teacher_key_used: false,
                    created_at: '2026-07-25T00:00:00Z'
                }
            };
        }
    };

    const repository = createDeckRepository(client);
    const result = await repository.createGenerated({
        gameType: 'who',
        name: ' Space Heroes ',
        content: ['Leia'],
        source: 'ai',
        theme: 'Space',
        generationParameters: { count: 1 },
        teacherDisplayName: 'Ms Ada',
        aiProvider: 'gemini',
        aiModel: 'gemini-2.5-flash',
        teacherKeyUsed: false
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].name, 'create_generated_deck');
    assert.equal(calls[0].payload.p_name, 'Space Heroes');
    assert.equal(result.id, 'deck-1');
    assert.equal(result.currentVersion.id, 'version-1');
});

test('lists only active current decks for one content game', async () => {
    const calls = [];
    const client = {
        select: async (table, options) => {
            calls.push({ table, options });
            return [{
                id: 'd1',
                game_type: 'taboo',
                name: 'Starter',
                current_version_id: 'v1',
                is_system: true,
                archived_at: null,
                created_at: '2026-07-25T00:00:00Z',
                updated_at: '2026-07-25T00:00:00Z',
                current_version: {
                    id: 'v1',
                    deck_id: 'd1',
                    version_number: 1,
                    content: [{ word: 'Orbit', forbidden: ['space', 'planet', 'circle'] }],
                    source: 'system',
                    created_at: '2026-07-25T00:00:00Z'
                }
            }];
        }
    };

    const decks = await createDeckRepository(client).listCurrent('taboo');
    assert.equal(decks[0].currentVersion.versionNumber, 1);
    assert.deepEqual(calls[0].options.filters, {
        game_type: 'eq.taboo',
        archived_at: 'is.null'
    });
});

test('maps database conflicts to public-safe domain errors', async () => {
    const conflict = Object.assign(new Error('Database request failed'), { code: '23505' });
    await assert.rejects(
        () => createDeckRepository({ rpc: async () => { throw conflict; } }).createGenerated({
            gameType: 'who',
            name: 'Taken',
            content: ['Leia'],
            source: 'ai'
        }),
        DeckNameConflictError
    );
});
