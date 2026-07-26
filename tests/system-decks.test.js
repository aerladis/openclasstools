import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTENT_GAME_TYPES } from '../server/domain/game-types.js';
import { normalizeDeckContent } from '../server/domain/deck-schemas.js';
import { SYSTEM_DECKS } from '../server/seeds/system-decks.js';

test('provides one valid system deck for every content game', () => {
    assert.deepEqual(
        [...new Set(SYSTEM_DECKS.map(deck => deck.gameType))].sort(),
        [...CONTENT_GAME_TYPES].sort()
    );
    for (const deck of SYSTEM_DECKS) {
        assert.equal(deck.name, 'Starter — General');
        assert.doesNotThrow(() => normalizeDeckContent(deck.gameType, deck.content));
    }
});
