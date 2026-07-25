import express from 'express';

function createLoginLimiter({ max, windowMs }) {
    const attempts = new Map();
    return (req, res, next) => {
        const key = req.ip || req.socket?.remoteAddress || 'unknown';
        const now = Date.now();
        const current = attempts.get(key);
        if (!current || now >= current.resetAt) {
            attempts.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        current.count += 1;
        if (current.count > max) {
            return res.status(429).json({
                success: false,
                code: 'ADMIN_LOGIN_RATE_LIMITED',
                error: 'Too many login attempts. Try again later.'
            });
        }
        return next();
    };
}

export function createAdminAuthRouter({
    sessionManager,
    loginRateLimitMax = 10,
    loginRateLimitWindowMs = 15 * 60 * 1000
}) {
    if (!sessionManager) throw new Error('Admin auth router requires a session manager');
    const router = express.Router();
    const loginLimiter = createLoginLimiter({
        max: loginRateLimitMax,
        windowMs: loginRateLimitWindowMs
    });

    router.post('/login', loginLimiter, (req, res) => {
        try {
            const login = sessionManager.login(req.body?.passcode);
            res.setHeader('Set-Cookie', login.cookie);
            return res.json({
                success: true,
                csrfToken: login.csrfToken,
                expiresAt: login.expiresAt
            });
        } catch (error) {
            const unavailable = error?.status === 503;
            return res.status(unavailable ? 503 : 401).json({
                success: false,
                code: error?.code || 'ADMIN_LOGIN_FAILED',
                error: unavailable
                    ? 'Administrator login is unavailable'
                    : 'Invalid administrator passcode'
            });
        }
    });

    router.get('/session', sessionManager.requireHttp, (req, res) => {
        return res.json({
            success: true,
            csrfToken: req.adminSession.csrfToken,
            expiresAt: req.adminSession.exp
        });
    });

    router.post(
        '/logout',
        sessionManager.requireHttp,
        sessionManager.requireCsrf,
        (_req, res) => {
            res.setHeader('Set-Cookie', sessionManager.clearCookie());
            return res.json({ success: true });
        }
    );

    return router;
}
