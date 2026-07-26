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

create function public.create_generated_deck(
    p_game_type text,
    p_name text,
    p_content jsonb,
    p_source text,
    p_theme text,
    p_cefr_level text,
    p_generation_parameters jsonb,
    p_teacher_display_name text,
    p_ai_provider text,
    p_ai_model text,
    p_teacher_key_used boolean,
    p_is_system boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_deck public.decks%rowtype;
    v_version public.deck_versions%rowtype;
begin
    insert into public.decks (game_type, name, is_system)
    values (p_game_type, p_name, coalesce(p_is_system, false))
    returning * into v_deck;

    insert into public.deck_versions (
        deck_id,
        version_number,
        content,
        source,
        theme,
        cefr_level,
        generation_parameters,
        teacher_display_name,
        ai_provider,
        ai_model,
        teacher_key_used
    )
    values (
        v_deck.id,
        1,
        p_content,
        p_source,
        nullif(btrim(p_theme), ''),
        nullif(btrim(p_cefr_level), ''),
        coalesce(p_generation_parameters, '{}'::jsonb),
        nullif(btrim(p_teacher_display_name), ''),
        nullif(btrim(p_ai_provider), ''),
        nullif(btrim(p_ai_model), ''),
        coalesce(p_teacher_key_used, false)
    )
    returning * into v_version;

    update public.decks
    set current_version_id = v_version.id,
        updated_at = now()
    where id = v_deck.id
    returning * into v_deck;

    return jsonb_build_object(
        'deck', to_jsonb(v_deck),
        'version', to_jsonb(v_version)
    );
exception
    when unique_violation then
        raise exception using
            errcode = '23505',
            message = 'DECK_NAME_CONFLICT';
end
$function$;

create function public.create_deck_revision(
    p_deck_id uuid,
    p_expected_version_id uuid,
    p_content jsonb,
    p_theme text,
    p_cefr_level text,
    p_teacher_display_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_deck public.decks%rowtype;
    v_version public.deck_versions%rowtype;
    v_next_version integer;
begin
    select *
    into v_deck
    from public.decks
    where id = p_deck_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'DECK_NOT_FOUND';
    end if;

    if v_deck.current_version_id is distinct from p_expected_version_id then
        raise exception using
            errcode = '40001',
            message = 'DECK_VERSION_CONFLICT';
    end if;

    select coalesce(max(version_number), 0) + 1
    into v_next_version
    from public.deck_versions
    where deck_id = p_deck_id;

    insert into public.deck_versions (
        deck_id,
        version_number,
        content,
        source,
        theme,
        cefr_level,
        generation_parameters,
        teacher_display_name,
        teacher_key_used
    )
    values (
        p_deck_id,
        v_next_version,
        p_content,
        'admin_edit',
        nullif(btrim(p_theme), ''),
        nullif(btrim(p_cefr_level), ''),
        '{}'::jsonb,
        nullif(btrim(p_teacher_display_name), ''),
        false
    )
    returning * into v_version;

    update public.decks
    set current_version_id = v_version.id,
        updated_at = now()
    where id = p_deck_id
    returning * into v_deck;

    return jsonb_build_object(
        'deck', to_jsonb(v_deck),
        'version', to_jsonb(v_version)
    );
end
$function$;

revoke all on function public.create_generated_deck(
    text, text, jsonb, text, text, text, jsonb, text, text, text, boolean, boolean
) from public, anon, authenticated;
grant execute on function public.create_generated_deck(
    text, text, jsonb, text, text, text, jsonb, text, text, text, boolean, boolean
) to service_role;

revoke all on function public.create_deck_revision(
    uuid, uuid, jsonb, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_deck_revision(
    uuid, uuid, jsonb, text, text, text
) to service_role;

create function public.rename_deck(
    p_deck_id uuid,
    p_name text,
    p_expected_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_deck public.decks%rowtype;
    v_version public.deck_versions%rowtype;
begin
    select * into v_deck
    from public.decks
    where id = p_deck_id
    for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'DECK_NOT_FOUND';
    end if;
    if v_deck.current_version_id is distinct from p_expected_version_id then
        raise exception using errcode = '40001', message = 'DECK_VERSION_CONFLICT';
    end if;

    update public.decks
    set name = btrim(p_name),
        updated_at = now()
    where id = p_deck_id
    returning * into v_deck;

    select * into v_version
    from public.deck_versions
    where id = v_deck.current_version_id;

    return jsonb_build_object('deck', to_jsonb(v_deck), 'version', to_jsonb(v_version));
exception
    when unique_violation then
        raise exception using errcode = '23505', message = 'DECK_NAME_CONFLICT';
end
$function$;

create function public.set_deck_archived(
    p_deck_id uuid,
    p_archived boolean,
    p_expected_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_deck public.decks%rowtype;
    v_version public.deck_versions%rowtype;
begin
    select * into v_deck
    from public.decks
    where id = p_deck_id
    for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'DECK_NOT_FOUND';
    end if;
    if v_deck.current_version_id is distinct from p_expected_version_id then
        raise exception using errcode = '40001', message = 'DECK_VERSION_CONFLICT';
    end if;

    update public.decks
    set archived_at = case when p_archived then now() else null end,
        updated_at = now()
    where id = p_deck_id
    returning * into v_deck;

    select * into v_version
    from public.deck_versions
    where id = v_deck.current_version_id;

    return jsonb_build_object('deck', to_jsonb(v_deck), 'version', to_jsonb(v_version));
end
$function$;

revoke all on function public.rename_deck(uuid, text, uuid)
from public, anon, authenticated;
grant execute on function public.rename_deck(uuid, text, uuid)
to service_role;

revoke all on function public.set_deck_archived(uuid, boolean, uuid)
from public, anon, authenticated;
grant execute on function public.set_deck_archived(uuid, boolean, uuid)
to service_role;

create function public.start_game_session(
    p_game_type text,
    p_room_code text,
    p_teacher_display_name text,
    p_participant_names jsonb,
    p_deck_id uuid,
    p_deck_version_id uuid
)
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_session public.game_sessions%rowtype;
    v_valid_reference boolean;
begin
    if p_game_type in (
        'who', 'taboo', 'hangman', 'millionaire',
        'kelime', 'flashcards', 'hats', 'lingoparty'
    ) then
        select exists (
            select 1
            from public.decks d
            join public.deck_versions v
              on v.id = p_deck_version_id
             and v.deck_id = d.id
            where d.id = p_deck_id
              and d.game_type = p_game_type
              and d.current_version_id = p_deck_version_id
              and d.archived_at is null
        ) into v_valid_reference;

        if not v_valid_reference then
            raise exception using
                errcode = '40001',
                message = 'DECK_VERSION_MISMATCH';
        end if;
    elsif p_game_type in ('bottle', 'wheel') then
        if p_deck_id is not null or p_deck_version_id is not null then
            raise exception using
                errcode = '22023',
                message = 'DECK_VERSION_MISMATCH';
        end if;
    else
        raise exception using
            errcode = '22023',
            message = 'INVALID_GAME_TYPE';
    end if;

    insert into public.game_sessions (
        room_code,
        game_type,
        teacher_display_name,
        participant_names,
        deck_id,
        deck_version_id
    )
    values (
        nullif(btrim(p_room_code), ''),
        p_game_type,
        btrim(p_teacher_display_name),
        coalesce(p_participant_names, '[]'::jsonb),
        p_deck_id,
        p_deck_version_id
    )
    returning * into v_session;

    return v_session;
end
$function$;

create function public.complete_game_session(
    p_session_id uuid,
    p_result jsonb
)
returns public.game_sessions
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_session public.game_sessions%rowtype;
begin
    update public.game_sessions
    set status = 'completed',
        result = coalesce(p_result, '{}'::jsonb),
        ended_at = now(),
        last_activity_at = now()
    where id = p_session_id
      and status = 'active'
    returning * into v_session;

    if found then
        return v_session;
    end if;

    if exists (select 1 from public.game_sessions where id = p_session_id) then
        raise exception using
            errcode = '40001',
            message = 'SESSION_ALREADY_COMPLETED';
    end if;

    raise exception using
        errcode = 'P0002',
        message = 'SESSION_NOT_FOUND';
end
$function$;

create function public.touch_game_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
    update public.game_sessions
    set last_activity_at = now()
    where id = p_session_id
      and status = 'active';
    return found;
end
$function$;

create function public.abandon_stale_game_sessions(p_cutoff timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_count integer;
begin
    update public.game_sessions
    set status = 'abandoned',
        ended_at = now(),
        last_activity_at = now()
    where status = 'active'
      and last_activity_at < p_cutoff;
    get diagnostics v_count = row_count;
    return v_count;
end
$function$;

revoke all on function public.start_game_session(
    text, text, text, jsonb, uuid, uuid
) from public, anon, authenticated;
grant execute on function public.start_game_session(
    text, text, text, jsonb, uuid, uuid
) to service_role;

revoke all on function public.complete_game_session(uuid, jsonb)
from public, anon, authenticated;
grant execute on function public.complete_game_session(uuid, jsonb)
to service_role;

revoke all on function public.touch_game_session(uuid)
from public, anon, authenticated;
grant execute on function public.touch_game_session(uuid)
to service_role;

revoke all on function public.abandon_stale_game_sessions(timestamptz)
from public, anon, authenticated;
grant execute on function public.abandon_stale_game_sessions(timestamptz)
to service_role;

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
