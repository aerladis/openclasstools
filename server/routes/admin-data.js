import express from 'express';

export function createAdminDataRouter({
    sessionManager,
    sessionRepository
}) {
    if (!sessionManager || !sessionRepository) {
        throw new Error('Admin data router requires authentication and session repositories');
    }
    const router = express.Router();
    router.use(sessionManager.requireHttp);

    router.get('/sessions', async (req, res) => {
        try {
            const result = await sessionRepository.listAdmin({
                limit: req.query.limit,
                gameType: req.query.gameType
            });
            return res.json({ success: true, ...result });
        } catch {
            return res.status(503).json({
                success: false,
                code: 'ADMIN_DATA_UNAVAILABLE',
                error: 'Administrator data is temporarily unavailable'
            });
        }
    });

    return router;
}
