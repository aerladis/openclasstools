import {
    createHash,
    createHmac,
    randomBytes,
    timingSafeEqual
} from 'node:crypto';

const COOKIE_NAME = 'oct_admin';

export class AdminAuthenticationError extends Error {
    constructor(message = 'Administrator authentication is required', {
        status = 401,
        code = 'ADMIN_AUTH_REQUIRED'
    } = {}) {
        super(message);
        this.name = 'AdminAuthenticationError';
        this.status = status;
        this.code = code;
    }
}

function constantTimeStringEqual(left, right) {
    const leftHash = createHash('sha256').update(String(left)).digest();
    const rightHash = createHash('sha256').update(String(right)).digest();
    return timingSafeEqual(leftHash, rightHash);
}

function parseCookie(header) {
    if (typeof header !== 'string') return '';
    for (const part of header.split(';')) {
        const [name, ...rest] = part.trim().split('=');
        if (name === COOKIE_NAME) return rest.join('=');
    }
    return '';
}

function publicAuthError(res, error) {
    return res.status(error?.status === 403 ? 403 : 401).json({
        success: false,
        code: error?.code || 'ADMIN_AUTH_REQUIRED',
        error: error?.status === 403
            ? 'The security token is invalid'
            : 'Administrator authentication is required'
    });
}

export function createAdminSessionManager({
    passcode,
    secret,
    secure = false,
    ttlMs = 30 * 60 * 1000
}) {
    const configuredPasscode = typeof passcode === 'string' ? passcode : '';
    const signingSecret = typeof secret === 'string' ? secret : '';
    if (!Number.isFinite(ttlMs) || ttlMs < 1_000) {
        throw new Error('Admin session TTL must be at least one second');
    }

    function sign(payload) {
        return createHmac('sha256', signingSecret)
            .update(payload)
            .digest('base64url');
    }

    function login(candidate, now = Date.now()) {
        if (!configuredPasscode || !signingSecret) {
            throw new AdminAuthenticationError('Administrator login is not configured', {
                status: 503,
                code: 'ADMIN_AUTH_UNAVAILABLE'
            });
        }
        if (!constantTimeStringEqual(candidate || '', configuredPasscode)) {
            throw new AdminAuthenticationError('Invalid administrator passcode', {
                code: 'ADMIN_LOGIN_FAILED'
            });
        }

        const csrfToken = randomBytes(24).toString('base64url');
        const payload = Buffer.from(JSON.stringify({
            exp: now + ttlMs,
            csrfToken,
            nonce: randomBytes(18).toString('base64url')
        })).toString('base64url');
        const token = `${payload}.${sign(payload)}`;
        const cookie = [
            `${COOKIE_NAME}=${token}`,
            'HttpOnly',
            'SameSite=Strict',
            'Path=/',
            `Max-Age=${Math.floor(ttlMs / 1000)}`,
            ...(secure ? ['Secure'] : [])
        ].join('; ');

        return { cookie, csrfToken, expiresAt: now + ttlMs };
    }

    function verifyCookie(header, now = Date.now()) {
        if (!signingSecret) {
            throw new AdminAuthenticationError('Administrator login is not configured', {
                status: 503,
                code: 'ADMIN_AUTH_UNAVAILABLE'
            });
        }
        const token = parseCookie(header);
        const dot = token.lastIndexOf('.');
        if (dot <= 0) {
            throw new AdminAuthenticationError('Invalid administrator session');
        }
        const payload = token.slice(0, dot);
        const signature = token.slice(dot + 1);
        if (!signature || !constantTimeStringEqual(signature, sign(payload))) {
            throw new AdminAuthenticationError('Invalid administrator session');
        }

        let session;
        try {
            session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        } catch {
            throw new AdminAuthenticationError('Invalid administrator session');
        }
        if (
            !Number.isFinite(session?.exp) ||
            typeof session?.csrfToken !== 'string' ||
            typeof session?.nonce !== 'string'
        ) {
            throw new AdminAuthenticationError('Invalid administrator session');
        }
        if (now >= session.exp) {
            throw new AdminAuthenticationError('Administrator session expired', {
                code: 'ADMIN_SESSION_EXPIRED'
            });
        }
        return Object.freeze(session);
    }

    function tryVerifyCookie(header, now = Date.now()) {
        try {
            return verifyCookie(header, now);
        } catch {
            return null;
        }
    }

    function verifyCsrf(session, candidate) {
        if (
            !session?.csrfToken ||
            typeof candidate !== 'string' ||
            !constantTimeStringEqual(candidate, session.csrfToken)
        ) {
            throw new AdminAuthenticationError('Invalid CSRF token', {
                status: 403,
                code: 'ADMIN_CSRF_INVALID'
            });
        }
    }

    function requireHttp(req, res, next) {
        try {
            req.adminSession = verifyCookie(req.headers.cookie);
            return next();
        } catch (error) {
            return publicAuthError(res, error);
        }
    }

    function requireCsrf(req, res, next) {
        try {
            req.adminSession = req.adminSession || verifyCookie(req.headers.cookie);
            verifyCsrf(req.adminSession, req.headers['x-csrf-token']);
            return next();
        } catch (error) {
            return publicAuthError(res, error);
        }
    }

    function clearCookie() {
        return [
            `${COOKIE_NAME}=`,
            'HttpOnly',
            'SameSite=Strict',
            'Path=/',
            'Max-Age=0',
            ...(secure ? ['Secure'] : [])
        ].join('; ');
    }

    return Object.freeze({
        login,
        verifyCookie,
        tryVerifyCookie,
        verifyCsrf,
        requireHttp,
        requireCsrf,
        clearCookie
    });
}
