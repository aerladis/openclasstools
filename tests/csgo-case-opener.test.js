import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('MysteryFateModal.jsx implements CS:GO case opener ribbon and audio tick mechanics', async () => {
    const modalPath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'MysteryFateModal.jsx');
    const source = await readFile(modalPath, 'utf8');

    // Must have tick sound invocation for reel deceleration
    assert.match(source, /playSound\s*\(\s*['"]tick['"]\s*\)/);

    // Must have outcome color classification (isGood / red vs blue)
    assert.match(source, /isGood/);

    // Must calculate horizontal ribbon transform translation offset
    assert.match(source, /transform|translateX/);
});

test('MysteryFateModal.module.css provides CS:GO reel viewport, center pointer needles, and outcome glow styles', async () => {
    const cssPath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'MysteryFateModal.module.css');
    const source = await readFile(cssPath, 'utf8');

    // Reel viewport styles
    assert.match(source, /reelContainer|reelViewport/);

    // Center needle pointer styles
    assert.match(source, /needlePointer|centerLine|centerPointer/);

    // Outcome colors (blue and red glow)
    assert.match(source, /#38bdf8|rgba\(\s*56,\s*189,\s*248/);
    assert.match(source, /#ef4444|rgba\(\s*239,\s*68,\s*68/);
});
