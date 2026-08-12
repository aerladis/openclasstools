import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const REQUIRED_SOUNDS = [
    'roll', 'step', 'correct', 'wrong', 'trophy', 'damage',
    'start', 'question', 'select', 'lifeline', 'walkAway', 'win',
    'loss', 'timeout', 'tick', 'flip', 'mastered', 'review',
    'nav', 'sync', 'reveal', 'pass', 'pause', 'resume'
];

test('sound exporter generates 24 valid RIFF WAV audio files and manifest files', async () => {
    const defaultPackDir = path.join(rootDir, 'public', 'audio_packs', 'default');
    const manifestPath = path.join(rootDir, 'public', 'audio_packs', 'manifest.json');
    const packJsonPath = path.join(defaultPackDir, 'pack.json');

    // Check manifest
    const manifestRaw = await readFile(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestRaw);
    assert.ok(Array.isArray(manifest.packs), 'manifest must have packs array');
    assert.ok(manifest.packs.some(p => p.id === 'default'), 'manifest must include default pack');

    // Check pack.json
    const packJsonRaw = await readFile(packJsonPath, 'utf8');
    const packJson = JSON.parse(packJsonRaw);
    assert.equal(packJson.id, 'default');

    // Check each WAV file
    for (const sound of REQUIRED_SOUNDS) {
        const wavPath = path.join(defaultPackDir, `${sound}.wav`);
        const fileBuffer = await readFile(wavPath);

        assert.ok(fileBuffer.length > 44, `${sound}.wav must be larger than 44 bytes header`);
        assert.equal(fileBuffer.subarray(0, 4).toString('ascii'), 'RIFF', `${sound}.wav must start with RIFF header`);
        assert.equal(fileBuffer.subarray(8, 12).toString('ascii'), 'WAVE', `${sound}.wav must have WAVE format`);
    }
});
