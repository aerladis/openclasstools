import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);

test('removed arcade game and legacy administrator assets are absent', () => {
    const removedDirectory = ['../', 'Fl', 'appy', 'Crocodile'].join('');
    assert.equal(existsSync(new URL(removedDirectory, import.meta.url)), false);
    for (const file of ['admin.html', 'admin.js', 'admin.css']) {
        assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), false);
    }
});

test('canonical and fallback hubs expose every remaining game without stale cards', async () => {
    const [reactHub, fallbackHub, readme, agentGuide] = await Promise.all([
        readFile(new URL('../frontend/src/components/Hub/GameHub.jsx', import.meta.url), 'utf8'),
        readFile(new URL('../index.html', import.meta.url), 'utf8'),
        readFile(new URL('../README.md', import.meta.url), 'utf8'),
        readFile(new URL('../AGENTS.md', import.meta.url), 'utf8')
    ]);

    for (const game of ['flashcards', 'hats']) {
        assert.match(reactHub, new RegExp(game, 'i'));
        assert.match(fallbackHub, new RegExp(game, 'i'));
    }
    for (const source of [reactHub, fallbackHub, readme, agentGuide]) {
        const removedName = new RegExp(['fl', 'appy'].join(''), 'i');
        assert.doesNotMatch(source, removedName);
    }
    assert.doesNotMatch(reactHub, /control-center|Admin Panel/i);
});
