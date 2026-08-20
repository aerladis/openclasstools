import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('server configures provider backup chain from Google down to Groq, Kimi, and OpenRouter', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(source, /callGemini\(prompt,\s*\{\s*\.\.\.options,\s*apiKey:\s*geminiKey\s*\}\)/);
    assert.match(source, /callGroq\(prompt,\s*\{\s*\.\.\.options,\s*apiKey:\s*GROQ_API_KEY\s*\}\)/);
    assert.match(source, /callKimi\(prompt,\s*\{\s*\.\.\.options,\s*apiKey:\s*KIMI_API_KEY\s*\}\)/);
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

test('platform Gemini fallback receives calculated server key when no teacher key is supplied', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    // Verifies the calculation of geminiKey and its injection into callGemini
    assert.match(source, /const\s+geminiKey\s*=\s*options\.apiKey\s*\|\|\s*process\.env\.GEMINI_API_KEY\s*\|\|\s*process\.env\.GOOGLE_API_KEY/);
    assert.match(source, /return\s+await\s+callGemini\(prompt,\s*\{\s*\.\.\.options,\s*apiKey:\s*geminiKey\s*\}\)/);
});

test('server defaults Groq model to openai/gpt-oss-120b and marks 401/403 as non-retryable', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    // Default Groq model
    assert.match(source, /const\s+GROQ_MODEL\s*=\s*process\.env\.GROQ_MODEL\s*\|\|\s*['"]openai\/gpt-oss-120b['"]/);

    // Kimi, Groq, and Gemini non-retryable 401/403 error classification
    assert.match(source, /err\.retryable\s*=\s*response\.status\s*!==\s*401/);
});

test('server routes API keys by prefix for Groq, Kimi, and OpenRouter', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(source, /key\.startsWith\('gsk_'\)/);
    assert.match(source, /key\.startsWith\('sk-LT'\)/);
    assert.match(source, /key\.startsWith\('sk-or-'\)/);
});

test('server mounts /api/ai/compare-providers endpoint and references process.env Gemini key safely', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    const compareEndpointIndex = source.indexOf("app.post('/api/ai/compare-providers'");
    const staticMiddlewareIndex = source.indexOf('express.static');

    assert.ok(compareEndpointIndex >= 0, '/api/ai/compare-providers endpoint missing');
    assert.ok(compareEndpointIndex < staticMiddlewareIndex, '/api/ai/compare-providers must be mounted before static middleware');

    const compareSection = source.slice(compareEndpointIndex, source.indexOf("app.post('/api/generate-campaign'", compareEndpointIndex));

    // Must safely read Gemini key from process.env and pass it to callGemini
    assert.match(compareSection, /const\s+geminiKey\s*=\s*process\.env\.GEMINI_API_KEY\s*\|\|\s*process\.env\.GOOGLE_API_KEY/);
    assert.match(compareSection, /callGemini\(prompt,\s*\{\s*apiKey:\s*geminiKey\s*\}\)/);
    // Must not contain bare undeclared identifier references
    assert.doesNotMatch(compareSection, /(?<!process\.env\.)GEMINI_API_KEY\s*\|\|/);
});

test('server enforces response_format json_object for Groq, Kimi, and OpenRouter for safe JSON', async () => {
    const source = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(source, /response_format:\s*\{\s*type:\s*'json_object'\s*\}/);
    assert.match(source, /cleanModelJsonText/);
});

