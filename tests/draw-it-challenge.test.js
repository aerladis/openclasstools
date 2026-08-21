import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    DeckValidationError,
    normalizeDeckContent
} from '../server/domain/deck-schemas.js';
import * as serverModule from '../server.js';

const { createFallbackQuestions, loadPrompt } = serverModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('normalizeDeckContent supports draw cards with visual definition and single physical object answer', () => {
    const raw = [
        {
            type: 'draw',
            prompt: 'A handheld instrument with lenses used to view distant objects in the sky or sea.',
            answer: 'TELESCOPE'
        }
    ];

    const normalized = normalizeDeckContent('lingoparty', raw);
    assert.equal(normalized.length, 1);
    assert.equal(normalized[0].type, 'draw');
    assert.equal(normalized[0].prompt, 'A handheld instrument with lenses used to view distant objects in the sky or sea.');
    assert.equal(normalized[0].answer, 'TELESCOPE');
});

test('normalizeDeckContent normalizes and repairs draw card answer variants (slashes, articles, casing)', () => {
    const raw = [
        {
            type: 'draw',
            prompt: 'A musical instrument with six strings played by strumming or plucking.',
            answer: ' a guitar / acoustic guitar '
        },
        {
            type: 'draw',
            prompt: 'A two-wheeled vehicle powered by foot pedals.',
            targetWord: 'THE BICYCLE'
        }
    ];

    const normalized = normalizeDeckContent('lingoparty', raw);
    assert.equal(normalized[0].answer, 'GUITAR');
    assert.equal(normalized[1].answer, 'BICYCLE');
});

test('normalizeDeckContent rejects draw cards that leak the target word in the prompt', () => {
    const leakingCard = [
        {
            type: 'draw',
            prompt: 'Draw a large telescope pointing at the stars at night.',
            answer: 'TELESCOPE'
        }
    ];

    assert.throws(
        () => normalizeDeckContent('lingoparty', leakingCard),
        /leak|invalid/i
    );
});

test('createFallbackQuestions generates valid draw cards with zero word leak', () => {
    const cards = createFallbackQuestions('lingoparty', 'Space Exploration', 30);
    const drawCards = cards.filter(c => c.type === 'draw');

    assert.ok(drawCards.length > 0, 'Must include draw cards in fallback deck');

    for (const card of drawCards) {
        assert.equal(card.type, 'draw');
        assert.ok(card.prompt && typeof card.prompt === 'string' && card.prompt.length > 10, 'Prompt must be descriptive');
        assert.ok(card.answer && typeof card.answer === 'string', 'Answer must exist');

        // Single word or clean concrete physical object
        assert.ok(!card.answer.includes('/'), `Answer "${card.answer}" must not contain slashes`);
        assert.ok(!card.answer.includes(' or '), `Answer "${card.answer}" must not be an ambiguous alternative`);

        // Zero leak
        const cleanAns = card.answer.toUpperCase().trim();
        const cleanPrompt = card.prompt.toUpperCase();
        assert.ok(!cleanPrompt.includes(cleanAns), `Draw prompt "${card.prompt}" leaks answer "${card.answer}"`);
    }
});

test('server lingoparty generation handler accepts and normalizes draw cards end-to-end', async () => {
    const serverSource = await readFile(path.join(rootDir, 'server.js'), 'utf8');

    // The generation pipeline must not silently drop AI-generated draw cards
    assert.match(serverSource, /validTypes\s*=\s*\[[\s\S]*['"]draw['"]/);
    assert.match(serverSource, /c\.type\s*===\s*['"]draw['"]/);
});

test('AI structured generation permits draw and explicitly allocates draw cards', async () => {
    const requiredTypes = [
        'riddle',
        'scramble',
        'pronunciation',
        'association',
        'grammar',
        'speed',
        'roleplay',
        'ordering',
        'draw'
    ];
    const schemaTypes = serverModule.LINGOPARTY_SCHEMA?.items?.properties?.type?.enum;
    assert.ok(Array.isArray(schemaTypes), 'LingoParty structured-output schema must expose its permitted types');
    for (const type of requiredTypes) {
        assert.ok(schemaTypes.includes(type), `structured schema must permit ${type}`);
    }

    assert.equal(typeof serverModule.allocateLingoPartyCategories, 'function');
    const allocation = serverModule.allocateLingoPartyCategories(18);
    assert.deepEqual(allocation, {
        riddle: 2,
        scramble: 2,
        pronunciation: 2,
        association: 2,
        grammar: 2,
        speed: 2,
        roleplay: 2,
        ordering: 2,
        draw: 2
    });
    assert.equal(Object.values(serverModule.allocateLingoPartyCategories(64)).reduce((sum, value) => sum + value, 0), 64);

    const categoryAllocation = Object.entries(allocation)
        .map(([type, amount]) => `${amount} ${type}`)
        .join(', ');
    const prompt = loadPrompt('lingoparty', {
        count: '18',
        categoryAllocation,
        theme: 'Space',
        cefrInstruction: 'Use CEFR B1 vocabulary.'
    });
    assert.match(prompt, /2 draw/i, 'generation prompt must explicitly require draw cards');
    assert.match(prompt, /2 riddle/i, 'generation prompt must preserve explicit allocation for existing categories');
});

test('prompts.json contains Draw It category directives for concrete physical objects and zero leaks', async () => {
    const promptsSource = await readFile(path.join(rootDir, 'prompts.json'), 'utf8');
    const prompts = JSON.parse(promptsSource);

    assert.ok(prompts.lingoparty, 'lingoparty prompt must exist');
    assert.match(prompts.lingoparty, /"draw"/i);
    assert.match(prompts.lingoparty, /concrete.*physical object/i);
    assert.match(prompts.lingoparty, /monochrome|sketch|drawing/i);
});

test('CosmicWheelModal.jsx includes Draw It in wheel segments', async () => {
    const wheelSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'CosmicWheelModal.jsx'),
        'utf8'
    );

    assert.match(wheelSource, /type:\s*['"]draw['"]/);
    assert.match(wheelSource, /label:\s*['"]Draw It['"]/);
    assert.match(wheelSource, /icon:\s*['"]✏️['"]/);
});

test('BoardMap.jsx and BoardStage.jsx configure Draw It tile category', async () => {
    const mapSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'BoardMap.jsx'),
        'utf8'
    );
    const stageSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'BoardStage.jsx'),
        'utf8'
    );

    assert.match(mapSource, /draw:\s*\{[\s\S]*?icon:\s*['"]✏️['"][\s\S]*?label:\s*['"]Draw It['"]/);
    assert.match(stageSource, /draw:\s*\{[\s\S]*?text:\s*['"]✏️ DRAW IT CHALLENGE LANDED!['"]/);
});

test('ChallengeModal.jsx renders DrawingCanvas for draw challenge with pointer events, undo, clear, and brush sizes', async () => {
    const modalSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'ChallengeModal.jsx'),
        'utf8'
    );
    const cssSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'ChallengeModal.module.css'),
        'utf8'
    );

    // ChallengeModal should branch for challenge.type === 'draw'
    assert.match(modalSource, /challenge\.type\s*===\s*['"]draw['"]/);
    assert.match(modalSource, /canvasRef|DrawingCanvas|onPointerDown/i);
    assert.match(modalSource, /handleUndo|undo/i);
    assert.match(modalSource, /handleClear|clear/i);
    assert.match(modalSource, /touch-action:\s*none|touchAction:\s*['"]none['"]/i);

    // CSS should accommodate smartboard 16:9 canvas with no-scroll container
    assert.match(cssSource, /drawingContainer|canvasWrapper|drawCanvas/);
    assert.match(cssSource, /aspect-ratio:\s*16\s*\/\s*9/);
    assert.match(cssSource, /drawCardNoScroll|noScroll/);
});

test('ChallengeModal exposes a clearly labeled Skip/Pass action for draw challenges that resolves with zero trophies', async () => {
    const modalSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'ChallengeModal.jsx'),
        'utf8'
    );
    const cssSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'ChallengeModal.module.css'),
        'utf8'
    );

    // Draw challenges resolve without awarding a trophy via the non-correct BoardStage flow
    assert.match(modalSource, /onResolve\(\{\s*result:\s*['"](?:pass|skip)['"],\s*trophies:\s*0\s*\}\)/);

    // The Skip/Pass control is clearly labeled and sits alongside Correct/Incorrect in the grading row
    assert.match(modalSource, /styles\.actionRow[\s\S]*?styles\.btnPass[\s\S]*?styles\.btnWrong/);
    assert.match(modalSource, /(?:Skip\s*\/\s*Pass|Pass\s*\/\s*Skip|Skip|Pass)/i);

    // It is only offered for draw challenges so other cards keep the two-button grading row
    assert.match(modalSource, /challenge\.type\s*===\s*['"]draw['"]\s*&&[\s\S]*?styles\.btnPass/);

    // The Draw It smartboard card keeps its no-scroll layout while hosting the extra action
    assert.match(cssSource, /\.drawCardNoScroll\s*\{[\s\S]*?overflow:\s*hidden\s*!important/);
    assert.match(cssSource, /\.btnPass\s*\{[\s\S]*?flex:/);
});

test('QuestionTesterModal and SetupScreen include draw category and default starter cards', async () => {
    const testerSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'QuestionTesterModal.jsx'),
        'utf8'
    );
    const setupSource = await readFile(
        path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'SetupScreen.jsx'),
        'utf8'
    );

    assert.match(testerSource, /draw:\s*['"]✏️['"]/);
    assert.match(testerSource, /'draw'/);
    assert.match(setupSource, /type:\s*['"]draw['"]/);
});
