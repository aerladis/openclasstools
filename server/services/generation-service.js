import { normalizeDeckContent } from '../domain/deck-schemas.js';

export class GenerationServiceError extends Error {
    constructor(message, code, status = 502) {
        super(message);
        this.name = 'GenerationServiceError';
        this.code = code;
        this.status = status;
    }
}

function cleanDeckName(value) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new GenerationServiceError('Deck name is required', 'DECK_NAME_REQUIRED', 400);
    }
    const cleaned = value.trim().replace(/\s+/g, ' ');
    if (cleaned.length > 100) {
        throw new GenerationServiceError(
            'Deck name must be at most 100 characters',
            'INVALID_DECK_NAME',
            400
        );
    }
    return cleaned;
}

function safeGenerationFailure() {
    return new GenerationServiceError(
        'Generation failed with the teacher API key. Check the key or its quota and try again.',
        'TEACHER_KEY_GENERATION_FAILED'
    );
}

export function createGenerationService({ deckRepository }) {
    if (!deckRepository?.createGenerated) {
        throw new Error('Generation service requires a writable deck repository');
    }

    return Object.freeze({
        async generateAndRegister({
            gameType,
            deckName,
            generationInput = {},
            teacherContext,
            aiProvider = 'gemini',
            aiModel = null,
            generate
        }) {
            const name = cleanDeckName(deckName);
            if (typeof generate !== 'function') {
                throw new Error('Generation callback is required');
            }

            let generated;
            try {
                generated = await generate({
                    apiKey: teacherContext.apiKey,
                    keySource: teacherContext.keySource
                });
            } catch {
                throw safeGenerationFailure();
            }

            const content = normalizeDeckContent(gameType, generated);
            return deckRepository.createGenerated({
                gameType,
                name,
                content,
                source: 'ai',
                theme: generationInput.theme || generationInput.topic || null,
                cefrLevel: generationInput.cefrLevel || generationInput.cefr || null,
                generationParameters: generationInput,
                teacherDisplayName: teacherContext.teacherDisplayName,
                aiProvider,
                aiModel,
                teacherKeyUsed: Boolean(teacherContext.teacherKeyUsed)
            });
        }
    });
}

