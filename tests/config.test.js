import test from 'node:test';
import assert from 'node:assert/strict';

import { loadConfig } from '../server/config.js';

test('production rejects missing database credentials', () => {
    for (const name of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
        assert.throws(
            () => loadConfig({ NODE_ENV: 'production' }, { production: true }),
            new RegExp(name)
        );
    }
});

test('configuration has no retired administrator secrets', () => {
    const config = loadConfig({ NODE_ENV: 'test' }, { production: false });
    assert.equal('adminPasscode' in config, false);
    assert.equal('adminSessionSecret' in config, false);
});

test('configuration accepts server-only Supabase REST credentials', () => {
    const config = loadConfig({
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret'
    }, { production: true });

    assert.equal(config.supabaseUrl, 'https://example.supabase.co');
    assert.equal(config.supabaseServiceRoleKey, 'service-role-secret');
    assert.equal(config.cookieSecure, true);
});
