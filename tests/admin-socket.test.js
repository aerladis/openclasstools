import test from 'node:test';
import assert from 'node:assert/strict';

import { createAdminSessionManager } from '../server/security/admin-session.js';
import {
    attachAdminSocketAuthorization,
    requireAuthorizedAdminSocket
} from '../server/security/admin-socket.js';

function createAuth() {
    return createAdminSessionManager({
        passcode: 'admin-passcode-123',
        secret: 'admin-test-secret-with-enough-length',
        secure: false,
        ttlMs: 60_000
    });
}

test('rejects privileged socket work without a verified cookie', () => {
    const socket = { handshake: { headers: {} } };
    attachAdminSocketAuthorization(socket, createAuth(), 2_000);

    let response;
    assert.equal(
        requireAuthorizedAdminSocket(socket, value => { response = value; }),
        false
    );
    assert.deepEqual(response, {
        success: false,
        code: 'ADMIN_AUTH_REQUIRED',
        error: 'Administrator authentication is required'
    });
});

test('accepts privileged socket work with a verified admin cookie', () => {
    const auth = createAuth();
    const login = auth.login('admin-passcode-123', 1_000);
    const socket = {
        handshake: {
            headers: { cookie: login.cookie }
        }
    };
    attachAdminSocketAuthorization(socket, auth, 2_000);

    assert.equal(requireAuthorizedAdminSocket(socket, undefined, 2_001), true);
    assert.equal(socket.isAdminAuthorized, true);
});

test('re-checks cookie expiry before every privileged socket action', () => {
    const auth = createAuth();
    const login = auth.login('admin-passcode-123', 1_000);
    const socket = {
        handshake: {
            headers: { cookie: login.cookie }
        }
    };
    attachAdminSocketAuthorization(socket, auth, 2_000);

    assert.equal(requireAuthorizedAdminSocket(socket, undefined, 2_001), true);
    assert.equal(requireAuthorizedAdminSocket(socket, undefined, 61_001), false);
    assert.equal(socket.isAdminAuthorized, false);
});
