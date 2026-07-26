import express from 'express';

const SAFE_MESSAGES = Object.freeze({
    INVALID_SESSION: 'The session request is invalid',
    INVALID_GAME_TYPE: 'A supported game type is required',
    TEACHER_NAME_REQUIRED: 'Teacher name is required',
    INVALID_PARTICIPANTS: 'Participant names are invalid',
    INVALID_ROOM_CODE: 'Room code is invalid',
    DECK_REFERENCE_REQUIRED: 'A registered deck is required for this game',
    DECK_NOT_SUPPORTED: 'This game does not use a deck',
    DECK_VERSION_MISMATCH: 'The selected deck changed or does not belong to this game',
    INVALID_SESSION_RESULT: 'The session result is invalid',
    INVALID_SESSION_ID: 'Session ID is invalid',
    SESSION_ALREADY_COMPLETED: 'Session has already ended',
    SESSION_NOT_FOUND: 'Session not found'
});

function sendError(res, error) {
    const status = Number.isInteger(error?.status) ? error.status : 503;
    const code = error?.code || 'SESSION_SERVICE_UNAVAILABLE';
    return res.status(status).json({
        success: false,
        code,
        error: status >= 500
            ? 'Session service is temporarily unavailable'
            : (SAFE_MESSAGES[code] || 'The session request is invalid')
    });
}

export function createSessionRouter({ repository }) {
    if (!repository) throw new Error('Session router requires a repository');
    const router = express.Router();

    router.post('/', async (req, res) => {
        try {
            const session = await repository.start(req.body || {});
            return res.status(201).json({ success: true, session });
        } catch (error) {
            return sendError(res, error);
        }
    });

    router.patch('/:sessionId/complete', async (req, res) => {
        try {
            const session = await repository.complete(
                req.params.sessionId,
                req.body?.result
            );
            return res.json({ success: true, session });
        } catch (error) {
            return sendError(res, error);
        }
    });

    return router;
}
