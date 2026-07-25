import {
    isContentGameType,
    isGameType
} from '../domain/game-types.js';

const MAX_RESULT_BYTES = 10 * 1024;

export class SessionValidationError extends Error {
    constructor(message, code = 'INVALID_SESSION') {
        super(message);
        this.name = 'SessionValidationError';
        this.status = 400;
        this.code = code;
    }
}

export class SessionConflictError extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'SessionConflictError';
        this.status = 409;
        this.code = code;
    }
}

function cleanText(value, {
    label,
    maxLength,
    required = false
}) {
    if (value === undefined || value === null || value === '') {
        if (required) {
            const code = `${label.toUpperCase().replaceAll(' ', '_')}_REQUIRED`;
            throw new SessionValidationError(`${label} is required`, code);
        }
        return null;
    }
    if (typeof value !== 'string') {
        throw new SessionValidationError(`${label} is invalid`);
    }
    const cleaned = value.trim().replace(/\s+/g, ' ');
    if ((required && !cleaned) || cleaned.length > maxLength) {
        throw new SessionValidationError(`${label} is invalid`);
    }
    return cleaned || null;
}

function cleanRoomCode(value) {
    const roomCode = cleanText(value, { label: 'Room code', maxLength: 12 });
    if (!roomCode) return null;
    const normalized = roomCode.toUpperCase();
    if (!/^[A-Z0-9-]{1,12}$/.test(normalized)) {
        throw new SessionValidationError('Room code is invalid', 'INVALID_ROOM_CODE');
    }
    return normalized;
}

function cleanParticipantNames(value) {
    if (!Array.isArray(value)) {
        throw new SessionValidationError('Participant names must be an array', 'INVALID_PARTICIPANTS');
    }
    if (value.length > 32) {
        throw new SessionValidationError('At most 32 participant names are allowed', 'INVALID_PARTICIPANTS');
    }
    const seen = new Set();
    const participants = [];
    for (const item of value) {
        const participant = cleanText(item, {
            label: 'Participant name',
            maxLength: 80,
            required: true
        });
        const normalized = participant.toLocaleLowerCase('en-US');
        if (!seen.has(normalized)) {
            seen.add(normalized);
            participants.push(participant);
        }
    }
    return participants;
}

function cleanReference(value, label) {
    return cleanText(value, { label, maxLength: 80 });
}

function normalizeStartInput(input = {}) {
    if (!isGameType(input.gameType)) {
        throw new SessionValidationError('A supported game type is required', 'INVALID_GAME_TYPE');
    }

    const teacherDisplayName = cleanText(input.teacherDisplayName, {
        label: 'Teacher name',
        maxLength: 120,
        required: true
    });
    const participantNames = cleanParticipantNames(input.participantNames);
    const deckId = cleanReference(input.deckId, 'Deck ID');
    const deckVersionId = cleanReference(input.deckVersionId, 'Deck version ID');

    if (isContentGameType(input.gameType) && (!deckId || !deckVersionId)) {
        throw new SessionValidationError(
            'A deck and exact deck version are required for this game',
            'DECK_REFERENCE_REQUIRED'
        );
    }
    if (!isContentGameType(input.gameType) && (deckId || deckVersionId)) {
        throw new SessionValidationError(
            'This game does not use a deck',
            'DECK_NOT_SUPPORTED'
        );
    }

    return {
        gameType: input.gameType,
        roomCode: cleanRoomCode(input.roomCode),
        teacherDisplayName,
        participantNames,
        deckId,
        deckVersionId
    };
}

function normalizeResult(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new SessionValidationError('Session result must be an object', 'INVALID_SESSION_RESULT');
    }
    let serialized;
    try {
        serialized = JSON.stringify(value);
    } catch {
        throw new SessionValidationError('Session result must be valid JSON', 'INVALID_SESSION_RESULT');
    }
    if (!serialized || Buffer.byteLength(serialized, 'utf8') > MAX_RESULT_BYTES) {
        throw new SessionValidationError('Session result is too large', 'INVALID_SESSION_RESULT');
    }
    return JSON.parse(serialized);
}

function cleanSessionId(value) {
    const id = cleanText(value, {
        label: 'Session ID',
        maxLength: 80,
        required: true
    });
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
        throw new SessionValidationError('Session ID is invalid', 'INVALID_SESSION_ID');
    }
    return id;
}

function mapSession(row) {
    if (!row) return null;
    return {
        id: row.id,
        roomCode: row.room_code ?? null,
        gameType: row.game_type,
        teacherDisplayName: row.teacher_display_name,
        participantNames: row.participant_names || [],
        deckId: row.deck_id ?? null,
        deckVersionId: row.deck_version_id ?? null,
        status: row.status,
        result: row.result ?? null,
        legacy: Boolean(row.legacy_source_id),
        startedAt: row.started_at,
        endedAt: row.ended_at ?? null,
        lastActivityAt: row.last_activity_at
    };
}

function mapAdminSession(row) {
    if (!row) return null;
    const session = mapSession(row);
    const deck = Array.isArray(row.deck) ? row.deck[0] : row.deck;
    const version = Array.isArray(row.deck_version)
        ? row.deck_version[0]
        : row.deck_version;
    return {
        ...session,
        deckName: deck?.name ?? null,
        deckVersion: version ? {
            id: version.id,
            versionNumber: version.version_number,
            content: version.content,
            source: version.source,
            theme: version.theme ?? null,
            cefrLevel: version.cefr_level ?? null,
            generationParameters: version.generation_parameters || {},
            teacherDisplayName: version.teacher_display_name ?? null,
            aiProvider: version.ai_provider ?? null,
            aiModel: version.ai_model ?? null,
            teacherKeyUsed: Boolean(version.teacher_key_used),
            createdAt: version.created_at
        } : null
    };
}

function translateDatabaseError(error) {
    switch (error?.databaseMessage) {
        case 'DECK_VERSION_MISMATCH':
            throw new SessionConflictError(
                'The selected deck changed or does not belong to this game',
                'DECK_VERSION_MISMATCH'
            );
        case 'SESSION_ALREADY_COMPLETED':
            throw new SessionConflictError(
                'Session has already ended',
                'SESSION_ALREADY_COMPLETED'
            );
        case 'SESSION_NOT_FOUND': {
            const missing = new Error('Session not found');
            missing.status = 404;
            missing.code = 'SESSION_NOT_FOUND';
            throw missing;
        }
        default:
            throw error;
    }
}

function cleanAdminFilter(value, maxLength = 120) {
    if (typeof value !== 'string') return '';
    return value.trim().replace(/[*(),]/g, '').slice(0, maxLength);
}

function parseAdminDate(value, label) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        throw new SessionValidationError(`${label} date is invalid`, 'INVALID_DATE_FILTER');
    }
    return date.toISOString();
}

export function createSessionRepository(client) {
    if (!client?.rpc) throw new Error('Session repository requires a database client');

    return Object.freeze({
        async start(input) {
            const normalized = normalizeStartInput(input);
            try {
                const row = await client.rpc('start_game_session', {
                    p_game_type: normalized.gameType,
                    p_room_code: normalized.roomCode,
                    p_teacher_display_name: normalized.teacherDisplayName,
                    p_participant_names: normalized.participantNames,
                    p_deck_id: normalized.deckId,
                    p_deck_version_id: normalized.deckVersionId
                });
                return mapSession(row);
            } catch (error) {
                translateDatabaseError(error);
            }
        },

        async complete(id, result) {
            try {
                const row = await client.rpc('complete_game_session', {
                    p_session_id: cleanSessionId(id),
                    p_result: normalizeResult(result)
                });
                return mapSession(row);
            } catch (error) {
                translateDatabaseError(error);
            }
        },

        async touch(id) {
            try {
                return Boolean(await client.rpc('touch_game_session', {
                    p_session_id: cleanSessionId(id)
                }));
            } catch (error) {
                translateDatabaseError(error);
            }
        },

        async abandonStale(cutoff) {
            if (!(cutoff instanceof Date) || Number.isNaN(cutoff.getTime())) {
                throw new SessionValidationError('Stale-session cutoff is invalid');
            }
            try {
                return Number(await client.rpc('abandon_stale_game_sessions', {
                    p_cutoff: cutoff.toISOString()
                })) || 0;
            } catch (error) {
                translateDatabaseError(error);
            }
        },

        async listAdmin({
            limit,
            gameType,
            teacher,
            participant,
            deck,
            roomCode,
            theme,
            cefr,
            status,
            deckVersionId,
            from,
            to,
            cursor
        } = {}) {
            const pageSize = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
            if (gameType && !isGameType(gameType)) {
                throw new SessionValidationError('Game type is invalid', 'INVALID_GAME_TYPE');
            }
            if (status && !['active', 'completed', 'abandoned'].includes(status)) {
                throw new SessionValidationError('Status is invalid', 'INVALID_STATUS_FILTER');
            }
            const filters = {};
            if (gameType) filters.game_type = `eq.${gameType}`;
            if (teacher) {
                filters.teacher_display_name = `ilike.*${cleanAdminFilter(teacher)}*`;
            }
            if (participant) {
                filters.participant_names = `cs.${JSON.stringify([cleanAdminFilter(participant, 80)])}`;
            }
            if (roomCode) filters.room_code = `eq.${cleanAdminFilter(roomCode, 12).toUpperCase()}`;
            if (status) filters.status = `eq.${status}`;
            if (deckVersionId) {
                filters.deck_version_id = `eq.${cleanAdminFilter(deckVersionId, 80)}`;
            }
            if (deck) filters['deck.name'] = `ilike.*${cleanAdminFilter(deck, 100)}*`;
            if (theme) filters['deck_version.theme'] = `ilike.*${cleanAdminFilter(theme, 200)}*`;
            if (cefr) filters['deck_version.cefr_level'] = `eq.${cleanAdminFilter(cefr, 4)}`;
            const fromDate = parseAdminDate(from, 'From');
            const toDate = parseAdminDate(to, 'To');
            const dateFilters = [
                fromDate ? `started_at.gte.${fromDate}` : null,
                toDate ? `started_at.lte.${toDate}` : null,
                cursor ? `started_at.lt.${parseAdminDate(cursor, 'Cursor')}` : null
            ].filter(Boolean);
            if (dateFilters.length === 1) {
                const [column, operator, ...value] = dateFilters[0].split('.');
                filters[column] = `${operator}.${value.join('.')}`;
            } else if (dateFilters.length > 1) {
                filters.and = `(${dateFilters.join(',')})`;
            }

            const deckJoin = deck ? 'decks!inner' : 'decks';
            const versionJoin = theme || cefr ? 'deck_versions!inner' : 'deck_versions';

            const rows = await client.select('game_sessions', {
                select: [
                    'id',
                    'room_code',
                    'game_type',
                    'teacher_display_name',
                    'participant_names',
                    'deck_id',
                    'deck_version_id',
                    'status',
                    'result',
                    'legacy_source_id',
                    'started_at',
                    'ended_at',
                    'last_activity_at',
                    `deck:${deckJoin}(name)`,
                    `deck_version:${versionJoin}(id,version_number,source,theme,cefr_level,teacher_key_used,created_at)`
                ].join(','),
                filters,
                order: 'started_at.desc',
                limit: pageSize
            });
            const items = (rows || []).map(mapAdminSession);
            return {
                items,
                nextCursor: items.length === pageSize
                    ? items[items.length - 1]?.startedAt || null
                    : null,
                summary: {
                    totalSessions: items.length,
                    completedSessions: items.filter(item => item.status === 'completed').length,
                    abandonedSessions: items.filter(item => item.status === 'abandoned').length,
                    generatedDecks: new Set(
                        items
                            .filter(item => item.deckId && item.deckVersion?.source !== 'seed')
                            .map(item => item.deckId)
                    ).size,
                    sessionsByGame: items.reduce((counts, item) => ({
                        ...counts,
                        [item.gameType]: (counts[item.gameType] || 0) + 1
                    }), {}),
                    teacherKeyUsagePercent: items.length === 0
                        ? 0
                        : Math.round(
                            (items.filter(item => item.deckVersion?.teacherKeyUsed).length / items.length) * 100
                        )
                }
            };
        },

        async getAdmin(id) {
            const sessionId = cleanSessionId(id);
            const rows = await client.select('game_sessions', {
                select: [
                    'id',
                    'room_code',
                    'game_type',
                    'teacher_display_name',
                    'participant_names',
                    'deck_id',
                    'deck_version_id',
                    'status',
                    'result',
                    'legacy_source_id',
                    'started_at',
                    'ended_at',
                    'last_activity_at',
                    'deck:decks(name)',
                    'deck_version:deck_versions(id,version_number,content,source,theme,cefr_level,generation_parameters,teacher_display_name,ai_provider,ai_model,teacher_key_used,created_at)'
                ].join(','),
                filters: { id: `eq.${sessionId}` },
                limit: 1
            });
            const session = mapAdminSession(rows?.[0]);
            if (!session) return null;
            const activity = await client.select('game_activity_logs', {
                select: 'id,event_type,details,created_at',
                filters: { session_id: `eq.${sessionId}` },
                order: 'created_at.asc',
                limit: 500
            });
            return {
                ...session,
                activity: (activity || []).map(row => ({
                    id: row.id,
                    eventType: row.event_type,
                    details: row.details || {},
                    createdAt: row.created_at
                }))
            };
        }
    });
}
