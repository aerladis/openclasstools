import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('server configures provider backup chain from Google down to Groq, Kimi, and OpenRouter', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(source, /callGemini\(prompt, options\)/);
    assert.match(source, /callGroq\(prompt, options\)/);
    assert.match(source, /callKimi\(prompt, options\)/);
    assert.match(source, /callOpenRouter\(prompt,/);

    const geminiChainIndex = source.indexOf('// Step 1: Google Gemini');
    const groqChainIndex = source.indexOf('// Step 2: Groq');
    const kimiChainIndex = source.indexOf('// Step 3: Kimi / Moonshot');
    const openrouterChainIndex = source.indexOf('// Step 4: OpenRouter Free Models');

    assert.ok(geminiChainIndex >= 0, 'Google Gemini step missing from backup chain');
    assert.ok(groqChainIndex > geminiChainIndex, 'Groq must follow Google Gemini in backup chain');
    assert.ok(kimiChainIndex > groqChainIndex, 'Kimi must follow Groq in backup chain');
    assert.ok(openrouterChainIndex > kimiChainIndex, 'OpenRouter must follow Kimi in backup chain');
});

test('server routes API keys by prefix for Groq, Kimi, and OpenRouter', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(source, /key\.startsWith\('gsk_'\)/);
    assert.match(source, /key\.startsWith\('sk-LT'\)/);
    assert.match(source, /key\.startsWith\('sk-or-'\)/);
});

test('server mounts /api/ai/compare-providers endpoint for question prompt comparing', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    const compareEndpointIndex = source.indexOf("app.post('/api/ai/compare-providers'");
    const staticMiddlewareIndex = source.indexOf('express.static');

    assert.ok(compareEndpointIndex >= 0, '/api/ai/compare-providers endpoint missing');
    assert.ok(compareEndpointIndex < staticMiddlewareIndex, '/api/ai/compare-providers must be mounted before static middleware');
});

test('server enforces response_format json_object for Groq, Kimi, and OpenRouter for safe JSON', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(source, /response_format:\s*\{\s*type:\s*'json_object'\s*\}/);
    assert.match(source, /cleanModelJsonText/);
});

