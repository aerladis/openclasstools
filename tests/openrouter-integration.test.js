import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('server configures OpenRouter free models in best to worst performance order', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(source, /OPENROUTER_API_KEY/);
    assert.match(source, /nvidia\/nemotron-3-super-120b-a12b:free/);
    assert.match(source, /inclusionai\/ling-3.0-flash:free/);
    assert.match(source, /openrouter\/free/);
    assert.match(source, /openai\/gpt-oss-20b:free/);

    const nemotronIndex = source.indexOf('nvidia/nemotron-3-super-120b-a12b:free');
    const lingIndex = source.indexOf('inclusionai/ling-3.0-flash:free');
    const autoRouterIndex = source.indexOf('openrouter/free');
    const gptOssIndex = source.indexOf('openai/gpt-oss-20b:free');

    assert.ok(nemotronIndex < lingIndex, 'Nemotron must be #1 priority model');
    assert.ok(lingIndex < autoRouterIndex, 'Ling 3.0 Flash must be #2 priority model');
    assert.ok(autoRouterIndex < gptOssIndex, 'openrouter/free must be #3 priority model');
});

test('server callAI falls back to OpenRouter upon Gemini rate limit / quota 429', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    assert.match(source, /callOpenRouter\(prompt, options\)/);
    assert.match(source, /key\.startsWith\('sk-or-'\)/);
    assert.match(source, /Automatically falling back to OpenRouter free models/);
});

test('parseModelJson unwraps top-level object containing array property', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    assert.match(source, /const arrayProp = Object\.keys\(parsed\)\.find/);
});

