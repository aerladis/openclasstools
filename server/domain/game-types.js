export const CONTENT_GAME_TYPES = Object.freeze([
    'who',
    'taboo',
    'hangman',
    'millionaire',
    'kelime',
    'flashcards',
    'hats',
    'lingoparty'
]);

export const DECKLESS_GAME_TYPES = Object.freeze(['bottle', 'wheel']);

export const ALL_GAME_TYPES = Object.freeze([
    ...CONTENT_GAME_TYPES,
    ...DECKLESS_GAME_TYPES
]);

export function isContentGameType(value) {
    return CONTENT_GAME_TYPES.includes(value);
}

export function isGameType(value) {
    return ALL_GAME_TYPES.includes(value);
}

