import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL(
    '../supabase/migrations/20260725130600_persistent_platform_foundation.sql',
    import.meta.url
);

test('migration creates immutable deck and session tables', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    for (const table of ['decks', 'deck_versions', 'game_sessions', 'game_activity_logs']) {
        assert.match(sql, new RegExp(`create table public\\.${table}\\b`, 'i'));
    }
    assert.match(sql, /unique\s*\(game_type,\s*normalized_name\)/i);
    assert.match(sql, /unique\s*\(deck_id,\s*version_number\)/i);
    assert.match(sql, /deck_version_id uuid references public\.deck_versions/i);
});

test('migration locks operational and legacy telemetry away from public roles', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    for (const table of [
        'decks',
        'deck_versions',
        'game_sessions',
        'game_activity_logs',
        'telemetry_game_sessions_legacy',
        'telemetry_game_activity_logs_legacy'
    ]) {
        assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
        assert.match(sql, new RegExp(`revoke all on (table )?public\\.${table} from anon, authenticated`, 'i'));
    }
    assert.doesNotMatch(sql, /create policy[\s\S]+to\s+(anon|authenticated|public)/i);
});

test('migration preserves old session rows as explicitly legacy records', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    assert.match(sql, /telemetry_game_sessions_legacy/i);
    assert.match(sql, /legacy_source_id/i);
    assert.match(sql, /'legacy',\s*true/i);
});

test('migration exposes atomic deck writes only to the server role', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    for (const functionName of [
        'create_generated_deck',
        'create_deck_revision',
        'rename_deck',
        'set_deck_archived'
    ]) {
        assert.match(sql, new RegExp(`create function public\\.${functionName}\\b`, 'i'));
        assert.match(sql, new RegExp(`revoke all on function public\\.${functionName}[\\s\\S]+from public, anon, authenticated`, 'i'));
        assert.match(sql, new RegExp(`grant execute on function public\\.${functionName}[\\s\\S]+to service_role`, 'i'));
    }
    assert.match(sql, /security definer\s+set search_path = ''/i);
});

test('migration exposes atomic session lifecycle functions only to the server role', async () => {
    const sql = await readFile(migrationPath, 'utf8');

    for (const functionName of [
        'start_game_session',
        'complete_game_session',
        'touch_game_session',
        'abandon_stale_game_sessions'
    ]) {
        assert.match(sql, new RegExp(`create function public\\.${functionName}\\b`, 'i'));
        assert.match(sql, new RegExp(
            `revoke all on function public\\.${functionName}[\\s\\S]+from public, anon, authenticated`,
            'i'
        ));
        assert.match(sql, new RegExp(
            `grant execute on function public\\.${functionName}[\\s\\S]+to service_role`,
            'i'
        ));
    }
    assert.match(sql, /d\.current_version_id = p_deck_version_id/i);
    assert.match(sql, /where id = p_session_id\s+and status = 'active'/i);
});
