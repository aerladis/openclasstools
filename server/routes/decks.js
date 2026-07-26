import express from 'express';

import { isContentGameType } from '../domain/game-types.js';

function sendError(res, error) {
    const status = Number.isInteger(error?.status) ? error.status : 503;
    res.status(status).json({
        success: false,
        code: error?.code || 'DECK_SERVICE_UNAVAILABLE',
        error: status >= 500 ? 'Deck service is temporarily unavailable' : error.message
    });
}

export function createDeckRouter({ repository }) {
    if (!repository) throw new Error('Deck router requires a repository');
    const router = express.Router();

    router.get('/', async (req, res) => {
        const gameType = typeof req.query.gameType === 'string' ? req.query.gameType : '';
        if (!isContentGameType(gameType)) {
            return res.status(400).json({
                success: false,
                code: 'INVALID_GAME_TYPE',
                error: 'A supported content game type is required'
            });
        }

        try {
            const decks = await repository.listCurrent(gameType);
            return res.json({ success: true, decks });
        } catch (error) {
            return sendError(res, error);
        }
    });

    router.get('/:deckId', async (req, res) => {
        try {
            const deck = await repository.getCurrent(req.params.deckId);
            if (!deck) {
                return res.status(404).json({
                    success: false,
                    code: 'DECK_NOT_FOUND',
                    error: 'Deck not found'
                });
            }
            return res.json({ success: true, deck });
        } catch (error) {
            return sendError(res, error);
        }
    });

    return router;
}

