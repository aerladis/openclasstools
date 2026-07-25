import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const CONTENT_GAMES = [
    ['who.html', 'game.js'],
    ['taboo.html', 'taboo.js'],
    ['hangman.html', 'hangman.js'],
    ['millionaire.html', 'millionaire.js'],
    ['kelime.html', 'kelime.js'],
    ['flashcards.html', 'flashcards.js'],
    ['hats.html', 'hats.js']
];

test('all legacy content pages load the shared deck client before game code', async () => {
    for (const [page, script] of CONTENT_GAMES) {
        const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
        assert.match(html, /deck-library\.css/, `${page} must load shared deck styles`);
        const clientIndex = html.indexOf('platform-client.js');
        const gameIndex = html.indexOf(script);
        assert.ok(clientIndex >= 0, `${page} must load platform-client.js`);
        assert.ok(clientIndex < gameIndex, `${page} must load the platform client before ${script}`);
        assert.match(html, /deck-library-mount/, `${page} must expose a deck library mount`);
    }
});

test('all legacy content games select exact decks and record lifecycle', async () => {
    for (const [, script] of CONTENT_GAMES) {
        const source = await readFile(new URL(`../${script}`, import.meta.url), 'utf8');
        assert.match(source, /mountDeckLibrary/, `${script} must mount registered decks`);
        assert.match(source, /getSelectedDeckRef/, `${script} must use the exact deck version`);
        assert.match(source, /startSession/, `${script} must record play start`);
        assert.match(source, /completeSession/, `${script} must record play completion`);
    }
});

test('deckless Bottle and Wheel still record play without deck references', async () => {
    for (const script of ['bottle.js', 'wheel.js']) {
        const source = await readFile(new URL(`../${script}`, import.meta.url), 'utf8');
        assert.match(source, /OpenClassPlatform\.startSession/);
        assert.match(source, /deckId:\s*null/);
        assert.match(source, /deckVersionId:\s*null/);
        assert.match(source, /OpenClassPlatform\.completeSession/);
    }
});
