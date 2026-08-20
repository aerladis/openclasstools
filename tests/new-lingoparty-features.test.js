import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Ordering challenges strictly enforce 2-person dialogues with no speaker C', async () => {
    const promptsSource = await readFile(new URL('../prompts.json', import.meta.url), 'utf8');
    const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const setupSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/SetupScreen.jsx', import.meta.url),
        'utf8'
    );
    const prompts = JSON.parse(promptsSource);

    // Prompt instructions must specify 2 speakers only and forbid 3rd speaker C
    assert.match(prompts.lingoparty, /2 speakers: Speaker A and Speaker B only/i);
    assert.doesNotMatch(prompts.lingoparty, /C:\s*That sounds/);

    // Fallbacks and samples must not use speaker C
    assert.doesNotMatch(serverSource, /ordering[\s\S]*?C:\s*/);
    assert.doesNotMatch(setupSource, /type:\s*'ordering'[\s\S]*?C:\s*/);
});

test('Board contains 1 random cube tile and top-right cube badge overlay', async () => {
    const gameSource = await readFile(
        new URL('../frontend/src/games/LingoParty/LingoPartyGame.jsx', import.meta.url),
        'utf8'
    );
    const mapSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardMap.jsx', import.meta.url),
        'utf8'
    );

    // LingoPartyGame should generate a random cube tile
    assert.match(gameSource, /type:\s*'cube'/);

    // BoardMap should render cube tiles with iconic cube icon and coordinates
    assert.match(mapSource, /['"]cube['"]/);
    assert.match(mapSource, /translate\([\s\S]*?,[\s\S]*?\)/);
    assert.match(mapSource, /🧊/);
});

test('MysteryFateModal rotates cards slower for suspense, features positive cards, and lower cube probability', async () => {
    const fateSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/MysteryFateModal.jsx', import.meta.url),
        'utf8'
    );

    // MysteryFateModal should include a Gibel Cube fate card and positive rewards
    assert.match(fateSource, /gibelCubes:\s*1/);
    assert.match(fateSource, /Stardust Crystal Vault/);
    assert.match(fateSource, /Hyperdrive Booster/);

    // Should use spinning reel animation for suspenseful reveal
    assert.match(fateSource, /duration\s*=\s*\d+/);

    // Should use weighted selection for rare Gibel Cube cards
    assert.match(fateSource, /cubeEvents/);
});

test('Crystal Ball is removed from ShopModal and Shop tile is removed from board generation', async () => {
    const shopSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/ShopModal.jsx', import.meta.url),
        'utf8'
    );
    const gameSource = await readFile(
        new URL('../frontend/src/games/LingoParty/LingoPartyGame.jsx', import.meta.url),
        'utf8'
    );

    assert.doesNotMatch(shopSource, /crystal_ball/i);
    assert.doesNotMatch(gameSource, /type:\s*'shop'/);
});

test('CEFR instructions scale grammar topics by level', async () => {
    const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');

    assert.match(serverSource, /GRAMMAR TOPICS BY CEFR LEVEL/i);
    assert.match(serverSource, /For A1:[\s\S]*?Present Simple/i);
    assert.match(serverSource, /For C1:[\s\S]*?Inversion/i);
});

test('Enhanced AI generation deduplication and gameplay zero-repetition fallback', async () => {
    const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');
    const boardStageSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardStage.jsx', import.meta.url),
        'utf8'
    );

    // server.js must use multi-field deduplication (seenTargetWords & seenAnswers) and sub-focus angles
    assert.match(serverSource, /seenTargetWords/);
    assert.match(serverSource, /seenAnswers/);
    assert.match(serverSource, /batchFocusAngles/);

    // BoardStage.jsx must check unused cards across any category before repeating a card
    assert.match(boardStageSource, /unusedAnyCategory/);
});

test('Left panel team leaderboard displays floating trophy change indicators (+1/-1)', async () => {
    const boardStageSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardStage.jsx', import.meta.url),
        'utf8'
    );
    const cssSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardStage.module.css', import.meta.url),
        'utf8'
    );

    assert.match(boardStageSource, /import\s+React,\s*\{[^}]*useEffect[^}]*\}\s+from\s+'react'/);
    assert.match(boardStageSource, /floatingEffects/);
    assert.match(boardStageSource, /floatingIndicatorContainer/);
    assert.match(cssSource, /floatBadgePlus/);
    assert.match(cssSource, /floatBadgeMinus/);
});

test('Shop button displays small red notification badge with affordable items count', async () => {
    const boardStageSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardStage.jsx', import.meta.url),
        'utf8'
    );
    const cssSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardStage.module.css', import.meta.url),
        'utf8'
    );

    assert.match(boardStageSource, /SHOP_ITEMS\.filter/);
    assert.match(boardStageSource, /shopBadgeNotification/);
    assert.match(cssSource, /shopBadgeNotification/);
    assert.match(cssSource, /pulseBadge/);
});

test('BoardMap features shiny landed tiles and chance tile prism color shift', async () => {
    const mapSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardMap.jsx', import.meta.url),
        'utf8'
    );
    const cssSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/BoardMap.module.css', import.meta.url),
        'utf8'
    );

    assert.match(mapSource, /shinyLandedTile/);
    assert.match(mapSource, /chanceTilePrism/);
    assert.match(cssSource, /shinyLandedGlow/);
    assert.match(cssSource, /chancePrismShift/);
});

test('CosmicWheelModal features pixel-perfect winner resolution and a narrower Gibel Cube jackpot segment', async () => {
    const wheelSource = await readFile(
        new URL('../frontend/src/games/LingoParty/components/CosmicWheelModal.jsx', import.meta.url),
        'utf8'
    );

    assert.match(wheelSource, /type:\s*'cube'/);
    assert.match(wheelSource, /CUBE JACKPOT/);
    assert.match(wheelSource, /weight:\s*0\.3/);
    assert.match(wheelSource, /getSegmentAtAngle\(current\)/);
});
