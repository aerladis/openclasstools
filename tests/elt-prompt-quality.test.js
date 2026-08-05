import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeDeckContent } from '../server/domain/deck-schemas.js';
import { createFallbackQuestions, loadPrompt } from '../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('prompts.json contains essential ELT directives and zero-leak rules', () => {
    const promptsPath = path.join(__dirname, '..', 'prompts.json');
    const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf8'));

    assert.ok(prompts.lingoparty, 'lingoparty prompt must exist');
    assert.ok(prompts.lingoparty.includes('AUTHENTICITY & NATURALNESS DIRECTIVE'), 'Must contain naturalness directive');
    assert.ok(prompts.lingoparty.includes('CRITICAL ZERO-LEAK DIRECTIVE'), 'Must contain zero-leak directive');
    assert.ok(prompts.lingoparty.includes('CRITICAL: Use ONLY 2 speakers (A and B)'), 'Must restrict ordering to 2 speakers');

    assert.ok(prompts.kelime.includes('CRITICAL ZERO-LEAK RULE'), 'Kelime must include zero-leak rule');
    assert.ok(prompts.taboo.includes('circumlocution'), 'Taboo prompt must encourage circumlocution');
    assert.ok(prompts.millionaire.includes('naturally phrased'), 'Millionaire prompt must specify natural phrasing');
});

test('loadPrompt loads template with dynamic variable replacements', () => {
    const loaded = loadPrompt('kelime', { theme: 'Technology', count: '10', cefrInstruction: 'Use B1 vocabulary' });
    assert.ok(loaded.includes('Technology'), 'Theme replacement failed');
    assert.ok(loaded.includes('10'), 'Count replacement failed');
    assert.ok(loaded.includes('Use B1 vocabulary'), 'CEFR instruction replacement failed');
});

test('createFallbackQuestions generates valid, ELT-compliant fallback decks for all games', () => {
    const gameTypes = ['lingoparty', 'taboo', 'hangman', 'kelime', 'millionaire', 'who', 'hats'];

    for (const gameType of gameTypes) {
        const count = gameType === 'millionaire' ? 15 : gameType === 'hats' ? 6 : 20;
        const rawContent = createFallbackQuestions(gameType, 'Space Odyssey', count);
        assert.ok(Array.isArray(rawContent), `${gameType} fallback output must be an array`);

        const normalized = normalizeDeckContent(gameType, rawContent);
        assert.ok(normalized.length > 0, `${gameType} normalized content must not be empty`);
    }
});

test('createFallbackQuestions lingoparty ordering items strictly follow 2-speaker format', () => {
    const fallback = createFallbackQuestions('lingoparty', 'Travel', 20);
    const orderingCards = fallback.filter(card => card.type === 'ordering');

    assert.ok(orderingCards.length > 0, 'Must include ordering fallback cards');

    for (const card of orderingCards) {
        const promptLines = card.prompt.split('\n');
        assert.equal(promptLines.length, 3, 'Ordering prompt must have exactly 3 lines');
        
        for (const line of promptLines) {
            const hasValidSpeaker = line.startsWith('A:') || line.startsWith('B:');
            assert.ok(hasValidSpeaker, `Line "${line}" must start with A: or B:`);
            assert.ok(!line.startsWith('C:'), `Line "${line}" must NOT be Speaker C`);
        }

        assert.ok(card.answer.includes('->'), 'Answer must be a formatted sequence with ->');
    }
});

test('createFallbackQuestions scramble and riddle cards do not leak target words', () => {
    const fallback = createFallbackQuestions('lingoparty', 'General', 20);
    const scrambleCards = fallback.filter(card => card.type === 'scramble');

    for (const card of scrambleCards) {
        const target = card.targetWord.toUpperCase();
        const clue = card.clue.toUpperCase();
        assert.ok(!clue.includes(target), `Scramble clue "${card.clue}" leaks target word "${card.targetWord}"`);
    }
});
