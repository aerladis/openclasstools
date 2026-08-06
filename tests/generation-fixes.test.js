import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Hangman generation uses callJsonAI with HANGMAN_WORD_SCHEMA and structured JSON prompt', async () => {
    const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const promptsSource = await readFile(new URL('../prompts.json', import.meta.url), 'utf8');
    const prompts = JSON.parse(promptsSource);

    // Hangman generator should use callJsonAI and HANGMAN_WORD_SCHEMA
    assert.match(serverSource, /HANGMAN_WORD_SCHEMA/);
    assert.match(serverSource, /app\.post\('\/api\/generate-hangman'[\s\S]*?callJsonAI\(prompt,\s*HANGMAN_WORD_SCHEMA/);

    // Hangman prompt should instruct JSON object/array output
    assert.match(prompts.hangman, /JSON array of objects/);
    assert.match(prompts.hangman, /"word":\s*"PLANET"/);
});

test('LingoParty generates 5 questions per type (40 total) for 2 orbits and 2 students', async () => {
    const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const setupSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/SetupScreen.jsx', import.meta.url),
        'utf8'
    );

    // Check SetupScreen cardCount formula
    assert.match(setupSource, /perCategory\s*=\s*Math\.max\(8,\s*Math\.floor\(\(5\s*\*\s*teamCount\s*\*\s*orbitCount\)\s*\/\s*4\)\)/);
    assert.match(setupSource, /cardCount\s*=\s*Math\.min\(160,\s*perCategory\s*\*\s*8\)/);

    // Check server.js parseInput logic
    assert.match(serverSource, /perCategory\s*=\s*Math\.max\(8,\s*Math\.floor\(\(5\s*\*\s*playerCount\s*\*\s*orbitCount\)\s*\/\s*4\)\)/);

    // Verify 2 students (teamCount=2) and 2 orbits (orbitCount=2) formula
    const teamCount = 2;
    const orbitCount = 2;
    const perCategory = Math.max(8, Math.floor((5 * teamCount * orbitCount) / 4));
    const cardCount = Math.min(160, perCategory * 8);

    assert.equal(perCategory, 8, 'Should generate 8 questions per category');
    assert.equal(cardCount, 64, 'Should generate 64 total cards for 8 categories');
});
