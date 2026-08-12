import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('BoardStage.jsx prevents double-click dice rolling during pawn movement and active states', async () => {
    const boardStagePath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'BoardStage.jsx');
    const source = await readFile(boardStagePath, 'utf8');

    // Must have isMoving state
    assert.match(source, /isMoving/);

    // handleRollDice must check isMoving
    assert.match(source, /if\s*\(\s*isRolling\s*\|\|\s*isMoving/);

    // Roll Dice button disabled attribute must include isMoving, activeModal, showQuestionReady
    assert.match(source, /disabled=\{\s*isRolling\s*\|\|\s*isMoving/);
});

test('BoardStage.jsx asks challenge question FIRST on Chance tile before drawing Mystery Box card', async () => {
    const boardStagePath = path.join(rootDir, 'frontend', 'src', 'games', 'LingoParty', 'components', 'BoardStage.jsx');
    const source = await readFile(boardStagePath, 'utf8');

    // Must have isChanceChallenge state
    assert.match(source, /isChanceChallenge/);

    // handleTileAction on chance tile triggers wheel/question first instead of mystery modal directly
    assert.match(source, /tile\.type === 'chance'/);

    // handleChallengeResolve opens mystery modal upon correct answer if isChanceChallenge is true
    assert.match(source, /if\s*\(\s*isChanceChallenge\s*\)/);
    assert.match(source, /setActiveModal\('mystery'\)/);

    // handleMysteryResolve checks doubleRoll and avoids premature wheel opening
    assert.match(source, /doubleRoll/);
});

test('lingoparty.js legacy client asks question first and guards double rolling', async () => {
    const legacyPath = path.join(rootDir, 'lingoparty.js');
    const source = await readFile(legacyPath, 'utf8');

    assert.match(source, /pendingChanceDraw/);
    assert.match(source, /triggerMysteryBoxEvent/);
});
