import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('MysteryFateModal.jsx supports dynamic mobile landscape card steps', async () => {
    const modalPath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'MysteryFateModal.jsx');
    const source = await readFile(modalPath, 'utf8');

    // Must check window.innerHeight for mobile landscape adjustment
    assert.match(source, /isMobileLandscape|innerHeight/);
    assert.match(source, /itemStep/);
});

test('MysteryFateModal.module.css includes responsive media queries for mobile landscape aspect ratios (16:9, 18:9, 20:9)', async () => {
    const cssPath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'MysteryFateModal.module.css');
    const source = await readFile(cssPath, 'utf8');

    // Media query for max-height landscape (540px / 520px)
    assert.match(source, /@media\s*\(\s*max-height:\s*540px\s*\)/);
    assert.match(source, /reelContainer/);
    assert.match(source, /120px|125px/);
});
