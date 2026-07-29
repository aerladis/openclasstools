import { extractTeacherContext } from '../http/teacher-context.js';

const SAFE_ERROR_MESSAGES = Object.freeze({
    DECK_NAME_REQUIRED: 'Deck name is required',
    INVALID_DECK_NAME: 'Deck name is invalid',
    DECK_NAME_CONFLICT: 'A deck with this name already exists for the selected game',
    TEACHER_NAME_REQUIRED: 'Teacher name is required',
    INVALID_TEACHER_NAME: 'Teacher name is invalid',
    TEACHER_AI_KEY_REQUIRED: 'A teacher Gemini API key is required',
    TEACHER_KEY_GENERATION_FAILED: 'Generation failed with the teacher API key. Check the key or its quota and try again.',
    GEMINI_QUOTA_EXCEEDED: 'Gemini API quota or rate limit exceeded (HTTP 429). Please check your Gemini API key usage limit or try again later.',
    INVALID_DECK_CONTENT: 'The AI returned invalid game content'
});

function publicError(error) {
    const code = error?.code || 'GENERATION_FAILED';
    const status = Number.isInteger(error?.status) ? error.status : 502;
    return {
        status,
        body: {
            success: false,
            code,
            error: SAFE_ERROR_MESSAGES[code] || (
                status < 500 ? 'The generation request is invalid' : 'Generation failed'
            )
        }
    };
}

export function createGenerationHandler({
    gameType,
    contentKey,
    generationService,
    parseInput,
    generate,
    aiProvider = 'gemini',
    aiModel = null,
    afterSuccess = null
}) {
    if (!gameType || !contentKey || !generationService || !parseInput || !generate) {
        throw new Error('Generation handler is missing required dependencies');
    }

    return async function generationHandler(req, res) {
        try {
            const teacherContext = extractTeacherContext(req);
            const generationInput = parseInput(req.body || {});
            const deck = await generationService.generateAndRegister({
                gameType,
                deckName: req.body?.deckName,
                generationInput,
                teacherContext,
                aiProvider,
                aiModel,
                generate: ({ apiKey, keySource }) => generate(generationInput, { apiKey, keySource })
            });
            const content = deck.currentVersion.content;

            if (afterSuccess) {
                try {
                    await afterSuccess(deck, { req, generationInput });
                } catch (hookError) {
                    console.warn(`[GenerationHandler] afterSuccess hook failed for ${gameType}:`, hookError.message);
                }
            }

            return res.status(201).json({
                success: true,
                count: Array.isArray(content) ? content.length : 0,
                [contentKey]: content,
                deck
            });
        } catch (error) {
            const response = publicError(error);
            return res.status(response.status).json(response.body);
        }
    };
}

