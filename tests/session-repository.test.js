import test from 'node:test';
import assert from 'node:assert/strict';

import {
    SessionConflictError,
    SessionValidationError,
    createSessionRepository
} from '../server/repositories/session-repository.js';

const ACTIVE_ROW = Object.freeze({
    id: 'session-1',
    room_code: 'AB12',
    game_type: 'taboo',
    teacher_display_name: 'Ms Ada',
    participant_names: ['Blue', 'Red'],
    deck_id: 'deck-1',
    deck_version_id: 'version-2',
    status: 'active',
    result: null,
    started_at: '2026-07-25T00:00:00Z',
    ended_at: null,
    last_activity_at: '2026-07-25T00:00:00Z'
});

test('starts a content session with the exact selected deck version', async () => {
    const calls = [];
    const repository = createSessionRepository({
        rpc: async (name, payload) => {
            calls.push({ name, payload });
            return ACTIVE_ROW;
        }
    });

    const session = await repository.start({
        gameType: 'taboo',
        roomCode: ' ab12 ',
        teacherDisplayName: '  Ms Ada  ',
        participantNames: [' Blue ', 'Red', 'blue'],
        deckId: 'deck-1',
        deckVersionId: 'version-2'
    });

    assert.equal(calls[0].name, 'start_game_session');
    assert.deepEqual(calls[0].payload, {
        p_game_type: 'taboo',
        p_room_code: 'AB12',
        p_teacher_display_name: 'Ms Ada',
        p_participant_names: ['Blue', 'Red'],
        p_deck_id: 'deck-1',
        p_deck_version_id: 'version-2'
    });
    assert.equal(session.deckVersionId, 'version-2');
    assert.equal(session.status, 'active');
});

test('accepts Bottle and Wheel only without deck references', async () => {
    const calls = [];
    const repository = createSessionRepository({
        rpc: async (name, payload) => {
            calls.push({ name, payload });
            return {
                ...ACTIVE_ROW,
                game_type: payload.p_game_type,
                deck_id: null,
                deck_version_id: null
            };
        }
    });

    for (const gameType of ['bottle', 'wheel']) {
        const session = await repository.start({
            gameType,
            teacherDisplayName: 'Ms Ada',
            participantNames: []
        });
        assert.equal(session.deckId, null);
    }

    await assert.rejects(
        () => repository.start({
            gameType: 'wheel',
            teacherDisplayName: 'Ms Ada',
            participantNames: [],
            deckId: 'deck-1',
            deckVersionId: 'version-1'
        }),
        SessionValidationError
    );
});

test('requires both deck references for content games and validates public input', async () => {
    const repository = createSessionRepository({
        rpc: async () => assert.fail('invalid input must not reach the database')
    });

    for (const input of [
        { gameType: 'taboo', teacherDisplayName: 'Ms Ada', participantNames: [] },
        { gameType: 'not-a-game', teacherDisplayName: 'Ms Ada', participantNames: [] },
        { gameType: 'who', teacherDisplayName: '', participantNames: [], deckId: 'd', deckVersionId: 'v' },
        { gameType: 'who', teacherDisplayName: 'Ms Ada', participantNames: 'Blue', deckId: 'd', deckVersionId: 'v' },
        { gameType: 'who', teacherDisplayName: 'Ms Ada', participantNames: [], roomCode: '../../x', deckId: 'd', deckVersionId: 'v' }
    ]) {
        await assert.rejects(() => repository.start(input), SessionValidationError);
    }
});

test('maps deck mismatch and repeated completion to safe conflicts', async () => {
    const mismatch = Object.assign(new Error('Database request failed'), {
        databaseMessage: 'DECK_VERSION_MISMATCH'
    });
    const alreadyCompleted = Object.assign(new Error('Database request failed'), {
        databaseMessage: 'SESSION_ALREADY_COMPLETED'
    });

    await assert.rejects(
        () => createSessionRepository({
            rpc: async () => { throw mismatch; }
        }).start({
            gameType: 'who',
            teacherDisplayName: 'Ms Ada',
            participantNames: [],
            deckId: 'deck-1',
            deckVersionId: 'version-1'
        }),
        SessionConflictError
    );

    await assert.rejects(
        () => createSessionRepository({
            rpc: async () => { throw alreadyCompleted; }
        }).complete('session-1', { score: 10 }),
        SessionConflictError
    );
});

test('completes once, touches activity, and abandons stale sessions', async () => {
    const calls = [];
    const repository = createSessionRepository({
        rpc: async (name, payload) => {
            calls.push({ name, payload });
            if (name === 'complete_game_session') {
                return {
                    ...ACTIVE_ROW,
                    status: 'completed',
                    result: payload.p_result,
                    ended_at: '2026-07-25T00:05:00Z'
                };
            }
            if (name === 'touch_game_session') return true;
            return 3;
        }
    });

    const completed = await repository.complete('session-1', { score: 10 });
    assert.equal(completed.status, 'completed');
    assert.deepEqual(completed.result, { score: 10 });
    assert.equal(await repository.touch('session-1'), true);
    assert.equal(
        await repository.abandonStale(new Date('2026-07-24T00:00:00Z')),
        3
    );
    assert.deepEqual(calls.map(call => call.name), [
        'complete_game_session',
        'touch_game_session',
        'abandon_stale_game_sessions'
    ]);
});

test('rejects unsafe or oversized completion results before persistence', async () => {
    const repository = createSessionRepository({
        rpc: async () => assert.fail('invalid result must not reach the database')
    });

    await assert.rejects(
        () => repository.complete('session-1', { payload: 'x'.repeat(11_000) }),
        SessionValidationError
    );
    const circular = {};
    circular.self = circular;
    await assert.rejects(
        () => repository.complete('session-1', circular),
        SessionValidationError
    );
});

test('combines admin date filters and uses inner joins for deck metadata filters', async () => {
    const calls = [];
    const repository = createSessionRepository({
        rpc: async () => {},
        select: async (table, options) => {
            calls.push({ table, options });
            return [];
        }
    });

    const result = await repository.listAdmin({
        deck: 'Travel',
        theme: 'Cities',
        cefr: 'B2',
        from: '2026-07-01T00:00:00Z',
        to: '2026-07-31T23:59:59Z',
        cursor: '2026-07-25T12:00:00Z',
        limit: 500
    });

    assert.equal(calls[0].options.limit, 100);
    assert.match(calls[0].options.select, /deck:decks!inner/);
    assert.match(calls[0].options.select, /deck_version:deck_versions!inner/);
    assert.match(calls[0].options.filters.and, /started_at\.gte\./);
    assert.match(calls[0].options.filters.and, /started_at\.lte\./);
    assert.match(calls[0].options.filters.and, /started_at\.lt\./);
    assert.deepEqual(result.summary.sessionsByGame, {});
    assert.equal(result.summary.generatedDecks, 0);
});

test('admin detail returns null cleanly and rejects invalid filters', async () => {
    const repository = createSessionRepository({
        rpc: async () => {},
        select: async () => []
    });

    assert.equal(await repository.getAdmin('missing-session'), null);
    await assert.rejects(
        () => repository.listAdmin({ status: 'deleted' }),
        /Status is invalid/
    );
    await assert.rejects(
        () => repository.listAdmin({ from: 'not-a-date' }),
        /From date is invalid/
    );
});
