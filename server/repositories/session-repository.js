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
        }
    });
}
