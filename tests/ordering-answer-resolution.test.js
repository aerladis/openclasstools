import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Pure logic implementations mirroring ChallengeModal.jsx
function parseOrderingLines(rawPrompt) {
    if (!rawPrompt || typeof rawPrompt !== 'string') return [];

    let text = rawPrompt.trim();
    text = text.replace(/^(put\s+this\s+[a-z0-9\s-]+\s+(in\s+)?(the\s+)?(correct\s+)?order\s*:?|reorder\s+([a-z0-9\s-]+)?:?|order\s+([a-z0-9\s-]+)?:?)/i, '').trim();

    let lines = [];
    if (/(^|\s)[1-9]\.\s+/.test(text)) {
        lines = text.split(/(?=(?:^|\s)[1-9]\.\s+)/).map(s => s.trim()).filter(Boolean);
    } else if (text.includes('\n')) {
        lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    } else if (/[A-Z][a-z]*\s*:\s*/.test(text)) {
        lines = text.split(/(?=[A-Z][a-z]*\s*:\s*)/).map(s => s.trim()).filter(Boolean);
    } else {
        lines = text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
    }

    return lines
        .map(line => line
            .replace(/^(put\s+this\s+conversation[^:]*:?)/i, '')
            .replace(/^([1-9]\d*[\.\)]|step\s*\d+:?|line\s*\d+:?)\s*/i, '')
            .trim()
        )
        .filter(Boolean);
}

function getCorrectOrderingSteps(prompt, answer) {
    const promptLines = parseOrderingLines(prompt);
    if (!promptLines || promptLines.length === 0) return [];

    if (Array.isArray(answer)) {
        if (answer.every(item => typeof item === 'number' || /^\d+$/.test(String(item).trim()))) {
            const indices = answer.map(item => parseInt(item, 10));
            const isOneBased = indices.every(i => i >= 1 && i <= promptLines.length);
            const isZeroBased = indices.every(i => i >= 0 && i < promptLines.length);
            if (isOneBased) {
                const resolved = indices.map(idx => promptLines[idx - 1]).filter(Boolean);
                if (resolved.length === promptLines.length) return resolved;
            } else if (isZeroBased) {
                const resolved = indices.map(idx => promptLines[idx]).filter(Boolean);
                if (resolved.length === promptLines.length) return resolved;
            }
        } else {
            const cleanSteps = answer.map(s => String(s).trim().replace(/^([1-9]\d*[\.\)]|step\s*\d+:?|line\s*\d+:?)\s*/i, '')).filter(Boolean);
            if (cleanSteps.length > 0) return cleanSteps;
        }
    }

    const answerStr = String(answer || '').trim();

    const digits = answerStr.match(/\d+/g);
    if (digits && digits.length === promptLines.length) {
        const indices = digits.map(d => parseInt(d, 10));
        const isOneBased = indices.every(i => i >= 1 && i <= promptLines.length);
        const isZeroBased = indices.every(i => i >= 0 && i < promptLines.length);

        if (isOneBased) {
            const resolved = indices.map(idx => promptLines[idx - 1]).filter(Boolean);
            if (resolved.length === promptLines.length) return resolved;
        } else if (isZeroBased) {
            const resolved = indices.map(idx => promptLines[idx]).filter(Boolean);
            if (resolved.length === promptLines.length) return resolved;
        }
    }

    if (answerStr.includes('\n') || answerStr.includes('->') || answerStr.includes(';')) {
        const rawSteps = answerStr
            .split(/->|\n|;/)
            .map(s => s.trim().replace(/^([1-9]\d*[\.\)]|step\s*\d+:?|line\s*\d+:?)\s*/i, ''))
            .filter(Boolean);
        if (rawSteps.length > 0) return rawSteps;
    }

    if (answerStr && !/\d+/.test(answerStr)) {
        return [answerStr];
    }

    return promptLines;
}

test('parseOrderingLines extracts dialogue lines from ordering prompt', () => {
    const prompt = `Put this conversation in the correct order:
1. "Nice to meet you too!"
2. "Hi, my name is Sarah."
3. "Nice to meet you, Sarah. I'm Tom."`;

    const lines = parseOrderingLines(prompt);
    assert.deepEqual(lines, [
        '"Nice to meet you too!"',
        '"Hi, my name is Sarah."',
        '"Nice to meet you, Sarah. I\'m Tom."'
    ]);
});

test('getCorrectOrderingSteps resolves index sequence "2, 3, 1" to actual sentence text in chronological order', () => {
    const prompt = `Put this conversation in the correct order:
1. "Nice to meet you too!"
2. "Hi, my name is Sarah."
3. "Nice to meet you, Sarah. I'm Tom."`;
    const answer = '2, 3, 1';

    const steps = getCorrectOrderingSteps(prompt, answer);
    assert.deepEqual(steps, [
        '"Hi, my name is Sarah."',
        '"Nice to meet you, Sarah. I\'m Tom."',
        '"Nice to meet you too!"'
    ]);
});

test('getCorrectOrderingSteps resolves arrow sequence "2 -> 1 -> 3"', () => {
    const prompt = `Put this conversation in the correct order:
1. "It's on Main Street, next to the bank."
2. "Excuse me, where is the library?"
3. "Thank you very much!"`;
    const answer = '2 -> 1 -> 3';

    const steps = getCorrectOrderingSteps(prompt, answer);
    assert.deepEqual(steps, [
        '"Excuse me, where is the library?"',
        '"It\'s on Main Street, next to the bank."',
        '"Thank you very much!"'
    ]);
});

test('getCorrectOrderingSteps resolves 5-item ordering sequence "5, 2, 3, 1, 4"', () => {
    const prompt = `Put this restaurant dialogue in the correct order:
1. "Could we have the bill, please?"
2. "Are you ready to order?"
3. "Yes, I'll have the pasta, please."
4. "Of course. Here it is."
5. "A table for two, please."`;
    const answer = '5, 2, 3, 1, 4';

    const steps = getCorrectOrderingSteps(prompt, answer);
    assert.deepEqual(steps, [
        '"A table for two, please."',
        '"Are you ready to order?"',
        '"Yes, I\'ll have the pasta, please."',
        '"Could we have the bill, please?"',
        '"Of course. Here it is."'
    ]);
});

test('ChallengeModal.jsx exports parseOrderingLines and getCorrectOrderingSteps', async () => {
    const modalPath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'ChallengeModal.jsx');
    const source = await readFile(modalPath, 'utf8');

    assert.match(source, /export\s+(?:function\s+|{[^}]*)parseOrderingLines/);
    assert.match(source, /export\s+(?:function\s+|{[^}]*)getCorrectOrderingSteps/);
    assert.match(source, /getCorrectOrderingSteps\s*\(/);
});
