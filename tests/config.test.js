import test from 'node:test';
import assert from 'node:assert/strict';

import { loadConfig } from '../server/config.js';

test('production rejects missing admin and database secrets', () => {
    for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSCODE', 'ADMIN_SESSION_SECRET']) {
        assert.throws(
            () => loadConfig({ NODE_ENV: 'production' }, { production: true }),
            new RegExp(name)
        );
    }
});

test('configuration never invents an admin passcode', () => {
    const config = loadConfig({ NODE_ENV: 'test' }, { production: false });
    assert.equal(config.adminPasscode, '');
});

test('configuration accepts server-only Supabase REST credentials', () => {
    const config = loadConfig({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
        ADMIN_PASSCODE: 'a-long-admin-passcode',
        ADMIN_SESSION_SECRET: 'a-long-signing-secret'
    }, { production: true });

    assert.equal(config.supabaseUrl, 'https://example.supabase.co');
    assert.equal(config.supabaseServiceRoleKey, 'service-role-secret');
    assert.equal(config.cookieSecure, true);
});
