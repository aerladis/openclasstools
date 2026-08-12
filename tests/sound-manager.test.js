import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('soundManager module exists and exports core audio methods', async () => {
    const servicePath = path.join(rootDir, 'frontend', 'src', 'services', 'soundManager.js');
    const source = await readFile(servicePath, 'utf8');

    assert.match(source, /export const soundManager/);
    assert.match(source, /playSound/);
    assert.match(source, /setAudioPack/);
    assert.match(source, /getAudioPack/);
    assert.match(source, /getAvailablePacks/);
});

test('public/js/soundManager.js exists for legacy game clients', async () => {
    const legacyPath = path.join(rootDir, 'public', 'js', 'soundManager.js');
    const source = await readFile(legacyPath, 'utf8');

    assert.match(source, /window\.soundManager/);
    assert.match(source, /playSound/);
});
