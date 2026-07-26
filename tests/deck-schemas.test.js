import test from 'node:test';
import assert from 'node:assert/strict';

import {
    CONTENT_GAME_TYPES,
    DeckValidationError,
    normalizeDeckContent
} from '../server/domain/deck-schemas.js';

test('defines the eight content game types once', () => {
    assert.deepEqual(CONTENT_GAME_TYPES, [
        'who',
        'taboo',
        'hangman',
        'millionaire',
        'kelime',
        'flashcards',
        'hats',
        'lingoparty'
    ]);
});

test('normalizes Taboo cards and strips unknown properties', () => {
    assert.deepEqual(normalizeDeckContent('taboo', [
        { word: ' Orbit ', forbidden: [' space ', 'planet', 'circle'], secret: 'remove' }
    ]), [{ word: 'Orbit', forbidden: ['space', 'planet', 'circle'] }]);
});

test('normalizes strings and object entries for Hangman', () => {
    assert.deepEqual(normalizeDeckContent('hangman', [
        ' orbit ',
        { word: 'rocket', category: ' Space ' }
    ]), [
        { word: 'ORBIT', category: 'Generated' },
        { word: 'ROCKET', category: 'Space' }
    ]);
});

test('rejects malformed Millionaire questions', () => {
    assert.throws(
        () => normalizeDeckContent('millionaire', [
            { question: 'Broken', options: ['A'], correct: 9 }
        ]),
        DeckValidationError
    );
});

test('normalizes Word Game and Flashcard fields', () => {
    assert.deepEqual(normalizeDeckContent('kelime', [
        { question: '  Water formula? ', answer: ' h2o ' }
    ]), [{ question: 'Water formula?', answer: 'H2O' }]);
    assert.deepEqual(normalizeDeckContent('flashcards', [
        { word: ' orbit ', meaning: ' yörünge ', ignored: true }
    ]), [{ word: 'orbit', meaning: 'yörünge' }]);
});

test('requires one entry for each of the six Thinking Hats', () => {
    assert.throws(
        () => normalizeDeckContent('hats', [
            { color: 'white', questions: ['What do we know?'], starters: ['The facts show...'] }
        ]),
        /exactly the six/
    );
});

test('normalizes every supported LingoParty challenge type', () => {
    const normalized = normalizeDeckContent('lingoparty', [
        { type: 'riddle', prompt: 'Question?', answer: 'Answer', trophies: 1 },
        { type: 'scramble', targetWord: 'ORBIT', scrambledWord: 'T-I-B-R-O', clue: 'A path' },
        { type: 'pronunciation', prompt: 'Repeat this.' },
        { type: 'association', prompt: 'Name three.', answer: 'A, B, C' },
        { type: 'grammar', prompt: 'Fix it.', answer: 'Fixed.' },
        { type: 'speed', prompt: 'Quick!', answer: 'Fast' },
        { type: 'roleplay', prompt: 'Act it out.', answer: 'Useful phrases' },
        { type: 'truefalse', prompt: 'Earth is round.', answer: true }
    ]);

    assert.deepEqual(normalized.map(card => card.type), [
        'riddle',
        'scramble',
        'pronunciation',
        'association',
        'grammar',
        'speed',
        'roleplay',
        'truefalse'
    ]);
    assert.equal(normalized[0].trophies, undefined);
});

test('rejects empty, oversized, unsupported, and overlong deck content', () => {
    assert.throws(() => normalizeDeckContent('who', []), /between 1 and 200/);
    assert.throws(() => normalizeDeckContent('who', Array.from({ length: 201 }, () => 'Name')), /between 1 and 200/);
    assert.throws(() => normalizeDeckContent('bottle', []), /Unsupported deck game/);
    assert.throws(() => normalizeDeckContent('who', ['x'.repeat(121)]), /120 characters/);
});
