import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Pure helper function for test verification
export function getUniqueDeckName(baseTopic, existingDecks = []) {
    const cleanBase = (baseTopic || '').trim() || 'Sample Deck';
    const existingNames = new Set(
        (existingDecks || [])
            .map(d => (typeof d === 'string' ? d : d?.name || d?.deckName || '').trim().toLowerCase())
            .filter(Boolean)
    );

    if (!existingNames.has(cleanBase.toLowerCase())) {
        return cleanBase;
    }

    let counter = 2;
    while (existingNames.has(`${cleanBase} (${counter})`.toLowerCase())) {
        counter++;
    }

    return `${cleanBase} (${counter})`;
}

test('getUniqueDeckName generates deck name from topic and appends (2), (3) when name already exists', () => {
    // 1. New unique topic name
    assert.equal(getUniqueDeckName('Space Exploration', []), 'Space Exploration');

    // 2. Duplicate topic name -> appends (2)
    const existing1 = [{ name: 'Space Exploration' }];
    assert.equal(getUniqueDeckName('Space Exploration', existing1), 'Space Exploration (2)');

    // 3. Multiple duplicates -> appends (3)
    const existing2 = [{ name: 'Space Exploration' }, { name: 'Space Exploration (2)' }];
    assert.equal(getUniqueDeckName('Space Exploration', existing2), 'Space Exploration (3)');

    // 4. Case-insensitive duplicate check
    const existingCase = [{ name: 'SPACE EXPLORATION' }];
    assert.equal(getUniqueDeckName('Space Exploration', existingCase), 'Space Exploration (2)');

    // 5. Empty topic falls back to Sample Deck
    assert.equal(getUniqueDeckName('', []), 'Sample Deck');
    assert.equal(getUniqueDeckName('', [{ name: 'Sample Deck' }]), 'Sample Deck (2)');
});

test('SetupScreen.jsx removes separate Deck Title input bar and uses topic name for deck naming', async () => {
    const setupPath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'SetupScreen.jsx');
    const source = await readFile(setupPath, 'utf8');

    // Must NOT have Deck Title form input bar
    assert.equal(source.includes('<label>Deck Title</label>'), false);

    // Must include getUniqueDeckName
    assert.match(source, /getUniqueDeckName/);
});
