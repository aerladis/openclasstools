import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

function memoryStorage() {
    const values = new Map();
    return {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
}

async function loadFactory() {
    const source = await readFile(new URL('../platform-client.js', import.meta.url), 'utf8');
    const sandbox = {
        console,
        URLSearchParams,
        localStorage: memoryStorage(),
        sessionStorage: memoryStorage()
    };
    sandbox.window = sandbox;
    sandbox.globalThis = sandbox;
    vm.runInNewContext(source, sandbox, { filename: 'platform-client.js' });
    return sandbox.OpenClassPlatformFactory.createPlatformClient;
}

test('stores teacher name persistently and key for the tab session only', async () => {
    const createPlatformClient = await loadFactory();
    const local = memoryStorage();
    const session = memoryStorage();
    const client = createPlatformClient({
        localStorage: local,
        sessionStorage: session,
        fetch: async () => assert.fail('storage must not call fetch')
    });

    client.saveTeacherSettings({
        teacherDisplayName: ' Ms Ada ',
        keySource: 'teacher',
        geminiApiKey: 'secret-key-123'
    });

    assert.equal(local.getItem('oct_teacher_name'), 'Ms Ada');
    assert.equal(local.getItem('oct_gemini_key'), null);
    assert.equal(local.getItem('oct_ai_key_source'), 'teacher');
    assert.equal(session.getItem('oct_gemini_key'), 'secret-key-123');
    assert.deepEqual(
        JSON.parse(JSON.stringify(client.getTeacherContext())),
        {
            teacherDisplayName: 'Ms Ada',
            keySource: 'teacher',
            geminiApiKey: 'secret-key-123'
        }
    );
});

test('requires a teacher name and selected teacher key', async () => {
    const createPlatformClient = await loadFactory();
    const client = createPlatformClient({
        localStorage: memoryStorage(),
        sessionStorage: memoryStorage(),
        fetch: async () => {}
    });

    assert.throws(
        () => client.saveTeacherSettings({
            teacherDisplayName: '',
            keySource: 'platform',
            geminiApiKey: ''
        }),
        /Teacher name is required/
    );
    assert.throws(
        () => client.saveTeacherSettings({
            teacherDisplayName: 'Ms Ada',
            keySource: 'teacher',
            geminiApiKey: ''
        }),
        /Gemini API key is required/
    );
});

test('sends explicit teacher headers and never falls back key sources', async () => {
    const createPlatformClient = await loadFactory();
    const calls = [];
    const local = memoryStorage();
    const session = memoryStorage();
    const client = createPlatformClient({
        localStorage: local,
        sessionStorage: session,
        fetch: async (url, options) => {
            calls.push({ url, options });
            return {
                ok: true,
                status: 201,
                json: async () => ({
                    success: true,
                    cards: [{ word: 'Orbit', forbidden: ['space', 'planet', 'circle'] }],
                    deck: {
                        id: 'd1',
                        currentVersion: {
                            id: 'v1',
                            content: [{ word: 'Orbit', forbidden: ['space', 'planet', 'circle'] }]
                        }
                    }
                })
            };
        }
    });
    client.saveTeacherSettings({
        teacherDisplayName: 'Ms Ada',
        keySource: 'teacher',
        geminiApiKey: 'teacher-key-123'
    });

    const deck = await client.generateDeck('taboo', '/api/generate-taboo', {
        deckName: 'Space',
        theme: 'space'
    });
    assert.equal(deck.id, 'd1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.headers['x-ai-key-source'], 'teacher');
    assert.equal(calls[0].options.headers['x-gemini-api-key'], 'teacher-key-123');
    assert.match(calls[0].options.body, /"deckName":"Space"/);
});

test('lists decks and records the same selected version in a session', async () => {
    const createPlatformClient = await loadFactory();
    const calls = [];
    const local = memoryStorage();
    const session = memoryStorage();
    const client = createPlatformClient({
        localStorage: local,
        sessionStorage: session,
        fetch: async (url, options = {}) => {
            calls.push({ url, options });
            if (url.startsWith('/api/decks')) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({
                        success: true,
                        decks: [{
                            id: 'd1',
                            gameType: 'who',
                            currentVersion: { id: 'v2', content: ['Ada'] }
                        }]
                    })
                };
            }
            return {
                ok: true,
                status: 201,
                json: async () => ({
                    success: true,
                    session: { id: 's1', status: 'active' }
                })
            };
        }
    });
    client.saveTeacherSettings({
        teacherDisplayName: 'Ms Ada',
        keySource: 'platform',
        geminiApiKey: ''
    });

    const decks = await client.listDecks('who');
    await client.startSession({
        gameType: 'who',
        participantNames: [],
        deckId: decks[0].id,
        deckVersionId: decks[0].currentVersion.id
    });
    assert.match(calls[0].url, /gameType=who/);
    assert.match(calls[1].options.body, /"deckVersionId":"v2"/);
    assert.match(calls[1].options.body, /"teacherDisplayName":"Ms Ada"/);
});

test('returns safe structured API errors', async () => {
    const createPlatformClient = await loadFactory();
    const client = createPlatformClient({
        localStorage: memoryStorage(),
        sessionStorage: memoryStorage(),
        fetch: async () => ({
            ok: false,
            status: 409,
            json: async () => ({
                code: 'DECK_NAME_CONFLICT',
                error: 'A deck with this name already exists'
            })
        })
    });

    await assert.rejects(
        () => client.listDecks('who'),
        error => error.status === 409 &&
            error.code === 'DECK_NAME_CONFLICT' &&
            /already exists/.test(error.message)
    );
});

test('session logging failures warn without blocking an already loaded game', async () => {
    const createPlatformClient = await loadFactory();
    const warnings = [];
    const client = createPlatformClient({
        localStorage: memoryStorage(),
        sessionStorage: memoryStorage(),
        fetch: async () => {
            throw new Error('database offline');
        }
    });
    client.saveTeacherSettings({
        teacherDisplayName: 'Ms Ada',
        keySource: 'platform',
        geminiApiKey: ''
    });

    const session = await client.startSessionSafely({
        gameType: 'who',
        participantNames: [],
        deckId: 'd1',
        deckVersionId: 'v1'
    }, error => warnings.push(error.message));

    assert.equal(session, null);
    assert.deepEqual(warnings, ['Unable to reach the game server']);
});
