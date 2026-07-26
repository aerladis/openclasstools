import { CONTENT_GAME_TYPES } from './game-types.js';

export { CONTENT_GAME_TYPES };

export class DeckValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DeckValidationError';
        this.status = 400;
        this.code = 'INVALID_DECK_CONTENT';
    }
}

function cleanText(value, field, maxLength, { uppercase = false } = {}) {
    if (typeof value !== 'string') {
        throw new DeckValidationError(`${field} must be text`);
    }

    const cleaned = value.trim().replace(/\s+/g, ' ');
    if (!cleaned) {
        throw new DeckValidationError(`${field} is required`);
    }
    if (cleaned.length > maxLength) {
        throw new DeckValidationError(`${field} must be at most ${maxLength} characters`);
    }

    return uppercase ? cleaned.toLocaleUpperCase('en-US') : cleaned;
}

function normalizeTextList(value, field, {
    min = 1,
    max = 8,
    itemMaxLength = 120
} = {}) {
    if (!Array.isArray(value)) {
        throw new DeckValidationError(`${field} must be a list`);
    }

    const result = [];
    const seen = new Set();
    for (const item of value) {
        const cleaned = cleanText(item, field, itemMaxLength);
        const key = cleaned.toLocaleLowerCase('en-US');
        if (!seen.has(key)) {
            seen.add(key);
            result.push(cleaned);
        }
    }

    if (result.length < min || result.length > max) {
        throw new DeckValidationError(`${field} must contain between ${min} and ${max} entries`);
    }
    return result;
}

function normalizeWho(content) {
    return content.map((character, index) => cleanText(character, `Character ${index + 1}`, 120));
}

function normalizeTaboo(content) {
    return content.map((card, index) => {
        if (!card || typeof card !== 'object' || Array.isArray(card)) {
            throw new DeckValidationError(`Taboo card ${index + 1} must be an object`);
        }
        return {
            word: cleanText(card.word, `Taboo word ${index + 1}`, 80),
            forbidden: normalizeTextList(card.forbidden, `Forbidden words ${index + 1}`, {
                min: 3,
                max: 8,
                itemMaxLength: 80
            })
        };
    });
}

function normalizeHangman(content) {
    return content.map((entry, index) => {
        const source = typeof entry === 'string' ? { word: entry, category: 'Generated' } : entry;
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw new DeckValidationError(`Hangman entry ${index + 1} must be text or an object`);
        }
        return {
            word: cleanText(source.word, `Hangman word ${index + 1}`, 60, { uppercase: true }),
            category: cleanText(source.category || source.cat || 'Generated', `Hangman category ${index + 1}`, 80)
        };
    });
}

function normalizeMillionaire(content) {
    return content.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new DeckValidationError(`Millionaire question ${index + 1} must be an object`);
        }
        if (!Array.isArray(entry.options) || entry.options.length !== 4) {
            throw new DeckValidationError(`Millionaire question ${index + 1} must have exactly 4 options`);
        }
        const correct = Number(entry.correct);
        if (!Number.isInteger(correct) || correct < 0 || correct > 3) {
            throw new DeckValidationError(`Millionaire question ${index + 1} has an invalid correct option`);
        }
        return {
            question: cleanText(entry.question, `Millionaire question ${index + 1}`, 500),
            options: entry.options.map((option, optionIndex) => (
                cleanText(option, `Millionaire option ${index + 1}.${optionIndex + 1}`, 200)
            )),
            correct
        };
    });
}

function normalizeKelime(content) {
    return content.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new DeckValidationError(`Word Game question ${index + 1} must be an object`);
        }
        return {
            question: cleanText(entry.question, `Word Game question ${index + 1}`, 500),
            answer: cleanText(entry.answer, `Word Game answer ${index + 1}`, 80, { uppercase: true })
        };
    });
}

function normalizeFlashcards(content) {
    return content.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new DeckValidationError(`Flashcard ${index + 1} must be an object`);
        }
        return {
            word: cleanText(entry.word, `Flashcard word ${index + 1}`, 120),
            meaning: cleanText(entry.meaning, `Flashcard meaning ${index + 1}`, 300)
        };
    });
}

const HAT_COLORS = new Set(['white', 'red', 'black', 'yellow', 'green', 'blue']);

function normalizeHats(content) {
    const normalized = content.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new DeckValidationError(`Thinking Hat ${index + 1} must be an object`);
        }
        const color = cleanText(entry.color || entry.id, `Thinking Hat color ${index + 1}`, 10).toLowerCase();
        if (!HAT_COLORS.has(color)) {
            throw new DeckValidationError(`Thinking Hat ${index + 1} has an invalid color`);
        }
        return {
            color,
            questions: normalizeTextList(entry.questions, `Thinking Hat questions ${index + 1}`, {
                min: 1,
                max: 8,
                itemMaxLength: 500
            }),
            starters: normalizeTextList(entry.starters, `Thinking Hat starters ${index + 1}`, {
                min: 1,
                max: 8,
                itemMaxLength: 300
            })
        };
    });

    const colors = new Set(normalized.map(hat => hat.color));
    if (normalized.length !== HAT_COLORS.size || colors.size !== HAT_COLORS.size) {
        throw new DeckValidationError('Thinking Hats must contain exactly the six unique colors');
    }
    return normalized;
}

function normalizeLingoParty(content) {
    const supportedTypes = new Set([
        'riddle',
        'scramble',
        'pronunciation',
        'association',
        'grammar',
        'speed',
        'roleplay',
        'truefalse'
    ]);

    return content.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new DeckValidationError(`LingoParty card ${index + 1} must be an object`);
        }
        const type = cleanText(entry.type, `LingoParty type ${index + 1}`, 30).toLowerCase();
        if (!supportedTypes.has(type)) {
            throw new DeckValidationError(`LingoParty card ${index + 1} has an unsupported type`);
        }

        if (type === 'scramble') {
            return {
                type,
                scrambledWord: cleanText(entry.scrambledWord, `Scrambled word ${index + 1}`, 160),
                targetWord: cleanText(entry.targetWord || entry.word, `Target word ${index + 1}`, 80, { uppercase: true }),
                clue: cleanText(entry.clue || entry.prompt, `Scramble clue ${index + 1}`, 500)
            };
        }

        if (type === 'truefalse') {
            if (typeof entry.answer !== 'boolean') {
                throw new DeckValidationError(`True/false answer ${index + 1} must be boolean`);
            }
            return {
                type,
                prompt: cleanText(entry.prompt, `True/false prompt ${index + 1}`, 800),
                answer: entry.answer
            };
        }

        const normalized = {
            type,
            prompt: cleanText(entry.prompt, `LingoParty prompt ${index + 1}`, 800)
        };
        if (type !== 'pronunciation' && entry.answer !== undefined && entry.answer !== null && String(entry.answer).trim()) {
            normalized.answer = cleanText(String(entry.answer), `LingoParty answer ${index + 1}`, 500);
        }
        return normalized;
    });
}

const NORMALIZERS = Object.freeze({
    who: normalizeWho,
    taboo: normalizeTaboo,
    hangman: normalizeHangman,
    millionaire: normalizeMillionaire,
    kelime: normalizeKelime,
    flashcards: normalizeFlashcards,
    hats: normalizeHats,
    lingoparty: normalizeLingoParty
});

export function normalizeDeckContent(gameType, content) {
    const normalizer = NORMALIZERS[gameType];
    if (!normalizer) {
        throw new DeckValidationError(`Unsupported deck game: ${gameType}`);
    }
    if (!Array.isArray(content) || content.length < 1 || content.length > 200) {
        throw new DeckValidationError('Deck must contain between 1 and 200 entries');
    }

    return normalizer(content);
}
