import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('GameHub header contains only centered title and gamepad emoji, removing header action buttons', async () => {
    const hubPath = path.join(rootDir, 'frontend', 'src', 'components', 'Hub', 'GameHub.jsx');
    const cssPath = path.join(rootDir, 'frontend', 'src', 'components', 'Hub', 'GameHub.module.css');
    const source = await readFile(hubPath, 'utf8');
    const cssSource = await readFile(cssPath, 'utf8');

    // Title and emoji must exist
    assert.match(source, /🎮/);
    assert.match(source, /OpenClassTools Game Hub/);

    // Header actions must NOT exist
    assert.equal(source.includes('headerActions'), false);
    assert.equal(source.includes('Teacher Guide'), false);
    assert.equal(source.includes('Audio Packs'), false);
    assert.equal(source.includes('AI Key Active'), false);

    // CSS hubHeader and titleSection must be centered
    assert.match(cssSource, /\.hubHeader\s*\{[^}]*justify-content:\s*center/);
    assert.match(cssSource, /\.titleSection\s*\{[^}]*justify-content:\s*center/);
});
