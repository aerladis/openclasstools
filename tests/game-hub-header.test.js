import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('GameHub.jsx header contains only title and gamepad emoji, removing subtitle paragraph', async () => {
    const hubPath = path.join(rootDir, 'frontend', 'src', 'components', 'Hub', 'GameHub.jsx');
    const source = await readFile(hubPath, 'utf8');

    // Title and emoji must exist
    assert.match(source, /🎮/);
    assert.match(source, /OpenClassTools Game Hub/);

    // Subtitle paragraph must NOT exist in titleSection
    assert.equal(source.includes('Next-Gen AI-Powered Classroom Party Games'), false);
});
