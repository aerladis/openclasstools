import express from 'express';

import { normalizeDeckContent } from '../domain/deck-schemas.js';

function sendAdminError(res, error) {
    const status = Number.isInteger(error?.status) ? error.status : 503;
    return res.status(status).json({
        success: false,
        code: error?.code || 'ADMIN_DATA_UNAVAILABLE',
        error: status >= 500
            ? 'Administrator data is temporarily unavailable'
            : error.message
    });
}

export function createAdminDataRouter({
    sessionManager,
    sessionRepository,
    deckRepository = {}
}) {
    if (!sessionManager || !sessionRepository) {
        throw new Error('Admin data router requires authentication and session repositories');
    }
    const router = express.Router();
    router.use(sessionManager.requireHttp);

    router.get('/sessions', async (req, res) => {
        try {
            const result = await sessionRepository.listAdmin({
                gameType: req.query.gameType,
                teacher: req.query.teacher,
                participant: req.query.participant,
                deck: req.query.deck,
                roomCode: req.query.roomCode,
                theme: req.query.theme,
                cefr: req.query.cefr,
                status: req.query.status,
                deckVersionId: req.query.deckVersionId,
                from: req.query.from,
                to: req.query.to,
                cursor: req.query.cursor,
                limit: req.query.limit
            });
            return res.json({ success: true, ...result });
        } catch (error) {
            return sendAdminError(res, error);
        }
    });

    router.get('/sessions/:sessionId', async (req, res) => {
        try {
            const session = await sessionRepository.getAdmin(req.params.sessionId);
            if (!session) {
                return res.status(404).json({
                    success: false,
                    code: 'SESSION_NOT_FOUND',
                    error: 'Session not found'
                });
            }
            return res.json({ success: true, session });
        } catch (error) {
            return sendAdminError(res, error);
        }
    });

    router.get('/decks', async (req, res) => {
        try {
            const result = await deckRepository.listAdmin({
                gameType: req.query.gameType,
                query: req.query.query,
                archived: req.query.archived,
                cursor: req.query.cursor,
                limit: req.query.limit
            });
            return res.json({ success: true, ...result });
        } catch (error) {
            return sendAdminError(res, error);
        }
    });

    router.get('/decks/:deckId/history', async (req, res) => {
        try {
            const versions = await deckRepository.getHistory(req.params.deckId);
            return res.json({ success: true, versions });
        } catch (error) {
            return sendAdminError(res, error);
        }
    });

    router.post(
        '/decks/:deckId/revisions',
        sessionManager.requireCsrf,
        async (req, res) => {
            try {
                const deck = await deckRepository.getCurrentAdmin(req.params.deckId);
                if (!deck) {
                    return res.status(404).json({
                        success: false,
                        code: 'DECK_NOT_FOUND',
                        error: 'Deck not found'
                    });
                }
                const content = normalizeDeckContent(deck.gameType, req.body?.content);
                const updated = await deckRepository.createRevision({
                    deckId: deck.id,
                    gameType: deck.gameType,
                    expectedVersionId: req.body?.expectedVersionId,
                    content,
                    theme: req.body?.theme ?? deck.currentVersion?.theme,
                    cefrLevel: req.body?.cefrLevel ?? deck.currentVersion?.cefrLevel,
                    teacherDisplayName: 'Administrator'
                });
                return res.status(201).json({ success: true, deck: updated });
            } catch (error) {
                return sendAdminError(res, error);
            }
        }
    );

    router.patch(
        '/decks/:deckId/name',
        sessionManager.requireCsrf,
        async (req, res) => {
            try {
                const deck = await deckRepository.rename(
                    req.params.deckId,
                    req.body?.name,
                    req.body?.expectedVersionId
                );
                return res.json({ success: true, deck });
            } catch (error) {
                return sendAdminError(res, error);
            }
        }
    );

    router.patch(
        '/decks/:deckId/archive',
        sessionManager.requireCsrf,
        async (req, res) => {
            try {
                const deck = await deckRepository.setArchived(
                    req.params.deckId,
                    req.body?.archived,
                    req.body?.expectedVersionId
                );
                return res.json({ success: true, deck });
            } catch (error) {
                return sendAdminError(res, error);
            }
        }
    );

    return router;
}
