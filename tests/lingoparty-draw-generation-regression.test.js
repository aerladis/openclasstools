import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureMinimumDrawCards } from '../server.js';

test('LingoParty generation fills missing drawing questions instead of returning zero', () => {
    const generated = [
        { type: 'riddle', prompt: 'I have keys but no locks.', answer: 'KEYBOARD' },
        { type: 'grammar', prompt: 'She [___] every day.', answer: 'STUDIES' }
    ];

    const cards = ensureMinimumDrawCards(generated, 90, 'Classroom objects');
    const drawCards = cards.filter(card => card.type === 'draw');

    assert.equal(drawCards.length, 10);
    assert.equal(new Set(drawCards.map(card => card.answer)).size, drawCards.length);
    for (const card of drawCards) {
        assert.match(card.prompt, /^Draw /);
        assert.match(card.answer, /^[A-Z][A-Z -]*$/);
        assert.equal(card.answer.includes('/'), false);
        assert.equal(card.prompt.toUpperCase().includes(card.answer), false);
    }
});

test('LingoParty generation preserves valid AI drawing questions and only fills the deficit', () => {
    const generated = [
        {
            type: 'draw',
            prompt: 'Draw a round instrument with two hands and twelve numbers that tells time.',
            answer: 'CLOCK'
        }
    ];

    const cards = ensureMinimumDrawCards(generated, 18, 'Daily routines');
    const drawCards = cards.filter(card => card.type === 'draw');

    assert.equal(drawCards.length, 2);
    assert.deepEqual(drawCards[0], generated[0]);
});
