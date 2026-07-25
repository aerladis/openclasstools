begin;

do $migration$
begin
    if to_regclass('public.game_activity_logs') is not null
       and to_regclass('public.telemetry_game_activity_logs_legacy') is null then
        alter table public.game_activity_logs rename to telemetry_game_activity_logs_legacy;
    end if;

    if to_regclass('public.game_sessions') is not null
       and to_regclass('public.telemetry_game_sessions_legacy') is null then
        alter table public.game_sessions rename to telemetry_game_sessions_legacy;
    end if;
end
$migration$;

create table public.decks (
    id uuid primary key default gen_random_uuid(),
    game_type text not null check (
        game_type in ('who', 'taboo', 'hangman', 'millionaire', 'kelime', 'flashcards', 'hats', 'lingoparty')
    ),
    name varchar(100) not null check (char_length(btrim(name)) between 1 and 100),
    normalized_name text generated always as (lower(btrim(name))) stored,
    current_version_id uuid,
    is_system boolean not null default false,
    archived_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (game_type, normalized_name)
);

create table public.deck_versions (
    id uuid primary key default gen_random_uuid(),
    deck_id uuid not null references public.decks(id) on delete restrict,
    version_number integer not null check (version_number > 0),
    content jsonb not null check (jsonb_typeof(content) in ('array', 'object')),
    source text not null check (source in ('system', 'ai', 'admin_edit')),
    theme varchar(200),
    cefr_level varchar(4),
    generation_parameters jsonb not null default '{}'::jsonb,
    teacher_display_name varchar(120),
    ai_provider varchar(40),
    ai_model varchar(120),
    teacher_key_used boolean not null default false,
    created_at timestamptz not null default now(),
    unique (deck_id, version_number)
);

alter table public.decks
    add constraint decks_current_version_fkey
    foreign key (current_version_id)
    references public.deck_versions(id)
    on delete restrict;

create table public.game_sessions (
    id uuid primary key default gen_random_uuid(),
    room_code varchar(12),
    game_type text not null check (
        game_type in (
            'who', 'taboo', 'hangman', 'millionaire', 'kelime',
            'flashcards', 'hats', 'lingoparty', 'bottle', 'wheel'
        )
    ),
    teacher_display_name varchar(120) not null check (char_length(btrim(teacher_display_name)) between 1 and 120),
    participant_names jsonb not null default '[]'::jsonb check (jsonb_typeof(participant_names) = 'array'),
    deck_id uuid references public.decks(id) on delete restrict,
    deck_version_id uuid references public.deck_versions(id) on delete restrict,
    status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
    result jsonb,
    legacy_source_id uuid,
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    last_activity_at timestamptz not null default now(),
    check (
        (game_type in ('bottle', 'wheel') and deck_id is null and deck_version_id is null)
        or
        (game_type not in ('bottle', 'wheel') and deck_id is not null and deck_version_id is not null)
        or
        legacy_source_id is not null
    )
);

create table public.game_activity_logs (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.game_sessions(id) on delete cascade,
    event_type varchar(80) not null check (char_length(btrim(event_type)) between 1 and 80),
    details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
    created_at timestamptz not null default now()
);

create index decks_active_game_type_idx
    on public.decks (game_type, normalized_name)
    where archived_at is null;

create index deck_versions_deck_created_idx
    on public.deck_versions (deck_id, version_number desc);

create index game_sessions_started_idx
    on public.game_sessions (started_at desc, id desc);

create index game_sessions_game_status_idx
    on public.game_sessions (game_type, status, started_at desc);

create index game_activity_logs_session_idx
    on public.game_activity_logs (session_id, created_at);

do $migration$
begin
    if to_regclass('public.telemetry_game_sessions_legacy') is not null then
        execute $copy$
            insert into public.game_sessions (
                room_code,
                game_type,
                teacher_display_name,
                participant_names,
                status,
                result,
                legacy_source_id,
                started_at,
                ended_at,
                last_activity_at
            )
            select
                left(upper(regexp_replace(coalesce(game_id, ''), '[^A-Z0-9-]', '', 'g')), 12),
                case
                    when game_type in (
                        'who', 'taboo', 'hangman', 'millionaire', 'kelime',
                        'flashcards', 'hats', 'lingoparty', 'bottle', 'wheel'
                    ) then game_type
                    else 'lingoparty'
                end,
                left(coalesce(nullif(btrim(teacher_name), ''), 'Legacy Teacher'), 120),
                case
                    when jsonb_typeof(team_names) = 'array' then team_names
                    else '[]'::jsonb
                end,
                'completed',
                jsonb_strip_nulls(jsonb_build_object(
                    'legacy', true,
                    'theme', theme,
                    'cefrLevel', cefr_level,
                    'questionCount', question_count,
                    'teacherKeyUsed', custom_api_key_used,
                    'winnerTeam', winner_team,
                    'finalScores', final_scores
                )),
                id,
                coalesce(created_at, now()),
                coalesce(updated_at, created_at, now()),
                coalesce(updated_at, created_at, now())
            from public.telemetry_game_sessions_legacy
            on conflict (id) do nothing
        $copy$;
    end if;
end
$migration$;

alter table public.decks enable row level security;
alter table public.deck_versions enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_activity_logs enable row level security;

revoke all on table public.decks from anon, authenticated;
revoke all on table public.deck_versions from anon, authenticated;
revoke all on table public.game_sessions from anon, authenticated;
revoke all on table public.game_activity_logs from anon, authenticated;

grant select, insert, update, delete on table public.decks to service_role;
grant select, insert, update, delete on table public.deck_versions to service_role;
grant select, insert, update, delete on table public.game_sessions to service_role;
grant select, insert, update, delete on table public.game_activity_logs to service_role;

do $security$
begin
    if to_regclass('public.telemetry_game_sessions_legacy') is not null then
        alter table public.telemetry_game_sessions_legacy enable row level security;
        revoke all on table public.telemetry_game_sessions_legacy from anon, authenticated;
    end if;

    if to_regclass('public.telemetry_game_activity_logs_legacy') is not null then
        alter table public.telemetry_game_activity_logs_legacy enable row level security;
        revoke all on table public.telemetry_game_activity_logs_legacy from anon, authenticated;
    end if;
end
$security$;

alter default privileges for role postgres in schema public
    revoke select, insert, update, delete on tables from anon, authenticated;

alter default privileges for role postgres in schema public
    revoke usage, select on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
    revoke execute on functions from public, anon, authenticated;

commit;
