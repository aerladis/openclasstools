import test from 'node:test';
import assert from 'node:assert/strict';

import {
    AdminAuthenticationError,
    createAdminSessionManager
} from '../server/security/admin-session.js';

function manager(overrides = {}) {
    return createAdminSessionManager({
        passcode: 'correct horse battery staple',
        secret: 'test-signing-secret-with-enough-length',
        secure: false,
        ttlMs: 60_000,
        ...overrides
    });
}

test('creates and verifies a short-lived signed HttpOnly session', () => {
    const auth = manager();
    const login = auth.login('correct horse battery staple', 1_000);

    assert.match(login.cookie, /^oct_admin=/);
    assert.match(login.cookie, /HttpOnly/);
    assert.match(login.cookie, /SameSite=Strict/);
    assert.doesNotMatch(login.cookie, /correct horse/);
    assert.equal(
        auth.verifyCookie(login.cookie, 30_000).csrfToken,
        login.csrfToken
    );
    assert.throws(
        () => auth.verifyCookie(login.cookie, 62_000),
        /expired/i
    );
});

test('rejects wrong passcodes, modified cookies, and missing configuration', () => {
    const auth = manager();
    assert.throws(
        () => auth.login('wrong passcode', 1_000),
        AdminAuthenticationError
    );

    const login = auth.login('correct horse battery staple', 1_000);
    const cookiePair = login.cookie.split(';', 1)[0];
    assert.throws(
        () => auth.verifyCookie(`${cookiePair}x`, 2_000),
        /invalid/i
    );
    assert.equal(auth.tryVerifyCookie('oct_admin=broken', 2_000), null);

    assert.throws(
        () => manager({ passcode: '' }).login('', 1_000),
        /not configured/i
    );
});

test('requires an exact CSRF token for state changes', () => {
    const auth = manager();
    const login = auth.login('correct horse battery staple', 1_000);
    const session = auth.verifyCookie(login.cookie, 2_000);

    assert.doesNotThrow(() => auth.verifyCsrf(session, login.csrfToken));
    assert.throws(() => auth.verifyCsrf(session, ''), /CSRF/i);
    assert.throws(() => auth.verifyCsrf(session, `${login.csrfToken}x`), /CSRF/i);
});

test('sets Secure in production and returns an expiring clear cookie', () => {
    const auth = manager({ secure: true });
    assert.match(auth.login('correct horse battery staple', 1_000).cookie, /Secure/);
    assert.match(auth.clearCookie(), /Max-Age=0/);
});
