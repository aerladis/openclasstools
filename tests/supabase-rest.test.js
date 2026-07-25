import test from 'node:test';
import assert from 'node:assert/strict';

import {
    SupabaseRestError,
    createSupabaseRestClient
} from '../server/db/supabase-rest.js';

test('server REST client sends service credentials only to the configured Supabase origin', async () => {
    const calls = [];
    const client = createSupabaseRestClient({
        url: 'https://example.supabase.co/',
        serviceRoleKey: 'service-secret',
        fetchImpl: async (url, options) => {
            calls.push({ url, options });
            return new Response(JSON.stringify([{ id: 'd1' }]), {
                status: 200,
                headers: { 'content-type': 'application/json' }
            });
        }
    });

    const rows = await client.select('decks', {
        select: 'id,name',
        filters: { game_type: 'eq.taboo', archived_at: 'is.null' },
        order: 'name.asc'
    });

    assert.deepEqual(rows, [{ id: 'd1' }]);
    assert.equal(calls[0].url, 'https://example.supabase.co/rest/v1/decks?select=id%2Cname&game_type=eq.taboo&archived_at=is.null&order=name.asc');
    assert.equal(calls[0].options.headers.apikey, 'service-secret');
    assert.equal(calls[0].options.headers.Authorization, 'Bearer service-secret');
});

test('server REST client returns a safe typed error without leaking response bodies', async () => {
    const client = createSupabaseRestClient({
        url: 'https://example.supabase.co',
        serviceRoleKey: 'service-secret',
        fetchImpl: async () => new Response(JSON.stringify({
            code: '23505',
            message: 'duplicate key value contains private table details',
            details: 'secret database detail'
        }), {
            status: 409,
            headers: { 'content-type': 'application/json' }
        })
    });

    await assert.rejects(
        () => client.rpc('create_generated_deck', {}),
        error => {
            assert.ok(error instanceof SupabaseRestError);
            assert.equal(error.code, '23505');
            assert.equal(error.status, 409);
            assert.equal(error.message, 'Database request failed');
            assert.equal(JSON.stringify(error).includes('secret database detail'), false);
            return true;
        }
    );
});

