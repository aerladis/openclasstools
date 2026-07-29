import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('runtime dependencies and server contain no Socket.IO or admin control center', async () => {
    const [rootPackage, frontendPackage, server, app] = await Promise.all([
        read('package.json'),
        read('frontend/package.json'),
        read('server.js'),
        read('frontend/src/App.jsx')
    ]);

    for (const source of [rootPackage, frontendPackage, server, app]) {
        assert.doesNotMatch(source, /socket\.io|control-center|AdminDashboard/i);
    }
    assert.match(server, /app\.listen\(PORT/);
    assert.doesNotMatch(server, /createServer|activeGames|\/api\/admin/);
});

test('browser clients expose no rooms, codes, or socket scripts', async () => {
    const paths = [
        'who.html',
        'taboo.html',
        'hangman.html',
        'millionaire.html',
        'kelime.html',
        'flashcards.html',
        'lingoparty.html',
        'game.js',
        'taboo.js',
        'hangman.js',
        'millionaire.js',
        'kelime.js',
        'flashcards.js',
        'lingoparty.js',
        'frontend/src/games/LingoParty/LingoPartyGame.jsx'
    ];

    for (const path of paths) {
        const source = await read(path);
        assert.doesNotMatch(
            source,
            /socket\.io|hostJoin|hostUpdate|syncWordList|game-id-badge|roomCode|Game ID:/i,
            path
        );
    }
});

test('Kelime hides setup UI when a round starts', async () => {
    const source = await read('kelime.js');
    assert.match(source, /function setSetupVisible\(visible\)/);
    assert.match(source, /setSetupVisible\(false\)/);
});

test('hub has a concise native teacher-key guide wired to the key modal', async () => {
    const source = await read('frontend/src/components/Hub/GameHub.jsx');
    assert.match(source, /<details[^>]*className=\{styles\.teacherGuide\}/);
    assert.match(source, /temporary/i);
    assert.match(source, /secure/i);
    assert.match(source, /quota/i);
    assert.match(source, /setIsApiKeyModalOpen\(true\)/);
});
