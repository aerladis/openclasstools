import { isContentGameType } from '../domain/game-types.js';
import { normalizeDeckContent } from '../domain/deck-schemas.js';

export class DeckNameConflictError extends Error {
    constructor() {
        super('A deck with this name already exists for the selected game');
        this.name = 'DeckNameConflictError';
        this.status = 409;
        this.code = 'DECK_NAME_CONFLICT';
    }
}

export class DeckVersionConflictError extends Error {
    constructor() {
        super('This deck changed since it was opened');
        this.name = 'DeckVersionConflictError';
        this.status = 409;
        this.code = 'DECK_VERSION_CONFLICT';
    }
}

function cleanDeckName(value) {
    if (typeof value !== 'string' || !value.trim()) {
        const error = new Error('Deck name is required');
        error.status = 400;
        error.code = 'INVALID_DECK_NAME';
        throw error;
    }
    const name = value.trim().replace(/\s+/g, ' ');
    if (name.length > 100) {
        const error = new Error('Deck name must be at most 100 characters');
        error.status = 400;
        error.code = 'INVALID_DECK_NAME';
        throw error;
    }
    return name;
}

function cleanDeckReference(value, label) {
    if (
        typeof value !== 'string'
        || value.length > 80
        || !/^[a-zA-Z0-9-]+$/.test(value)
    ) {
        const error = new Error(`${label} is invalid`);
        error.status = 400;
        error.code = 'INVALID_DECK_REFERENCE';
        throw error;
    }
    return value;
}

function mapVersion(row) {
    if (!row) return null;
    return {
        id: row.id,
        deckId: row.deck_id,
        versionNumber: row.version_number,
        content: row.content,
        source: row.source,
        theme: row.theme ?? null,
        cefrLevel: row.cefr_level ?? null,
        generationParameters: row.generation_parameters || {},
        teacherDisplayName: row.teacher_display_name ?? null,
        aiProvider: row.ai_provider ?? null,
        aiModel: row.ai_model ?? null,
        teacherKeyUsed: Boolean(row.teacher_key_used),
        createdAt: row.created_at
    };
}

function mapDeck(row) {
    if (!row) return null;
    const nestedVersion = Array.isArray(row.current_version)
        ? row.current_version[0]
        : row.current_version;
    return {
        id: row.id,
        gameType: row.game_type,
        name: row.name,
        currentVersionId: row.current_version_id,
        isSystem: Boolean(row.is_system),
        archivedAt: row.archived_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        currentVersion: mapVersion(nestedVersion)
    };
}

function translateWriteError(error) {
    if (error?.code === '23505' || error?.databaseMessage === 'DECK_NAME_CONFLICT') {
        throw new DeckNameConflictError();
    }
    if (error?.code === '40001' || error?.databaseMessage === 'DECK_VERSION_CONFLICT') {
        throw new DeckVersionConflictError();
    }
    if (error?.code === 'P0002' || error?.databaseMessage === 'DECK_NOT_FOUND') {
        const missing = new Error('Deck not found');
        missing.status = 404;
        missing.code = 'DECK_NOT_FOUND';
        throw missing;
    }
    throw error;
}

const CURRENT_VERSION_SELECT = [
    'id',
    'game_type',
    'name',
    'current_version_id',
    'is_system',
    'archived_at',
    'created_at',
    'updated_at',
    'current_version:deck_versions!decks_current_version_fkey(*)'
].join(',');

export function createDeckRepository(client) {
    if (!client) throw new Error('Deck repository requires a database client');

    return Object.freeze({
        async listCurrent(gameType) {
            if (!isContentGameType(gameType)) {
                const error = new Error('Invalid content game type');
                error.status = 400;
                error.code = 'INVALID_GAME_TYPE';
                throw error;
            }
            const rows = await client.select('decks', {
                select: CURRENT_VERSION_SELECT,
                filters: {
                    game_type: `eq.${gameType}`,
                    archived_at: 'is.null'
                },
                order: 'name.asc'
            });
            return (rows || []).map(mapDeck);
        },

        async getCurrent(deckId) {
            const safeDeckId = cleanDeckReference(deckId, 'Deck ID');
            const rows = await client.select('decks', {
                select: CURRENT_VERSION_SELECT,
                filters: {
                    id: `eq.${safeDeckId}`,
                    archived_at: 'is.null'
                },
                limit: 1
            });
            return mapDeck(rows?.[0]);
        },

        async getCurrentAdmin(deckId) {
            const safeDeckId = cleanDeckReference(deckId, 'Deck ID');
            const rows = await client.select('decks', {
                select: CURRENT_VERSION_SELECT,
                filters: { id: `eq.${safeDeckId}` },
                limit: 1
            });
            return mapDeck(rows?.[0]);
        },

        async listAdmin({ gameType, query, archived, limit } = {}) {
            if (gameType && !isContentGameType(gameType)) {
                const error = new Error('Invalid content game type');
                error.status = 400;
                error.code = 'INVALID_GAME_TYPE';
                throw error;
            }
            const pageSize = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
            const filters = {};
            if (gameType) filters.game_type = `eq.${gameType}`;
            if (typeof query === 'string' && query.trim()) {
                const safeQuery = query.trim().replace(/[*(),]/g, '').slice(0, 100);
                filters.name = `ilike.*${safeQuery}*`;
            }
            if (archived === 'true' || archived === true) {
                filters.archived_at = 'not.is.null';
            } else if (archived !== 'all') {
                filters.archived_at = 'is.null';
            }
            const rows = await client.select('decks', {
                select: CURRENT_VERSION_SELECT,
                filters,
                order: 'updated_at.desc',
                limit: pageSize
            });
            const items = (rows || []).map(mapDeck);
            return { items, nextCursor: null };
        },

        async getHistory(deckId) {
            const safeDeckId = cleanDeckReference(deckId, 'Deck ID');
            const rows = await client.select('deck_versions', {
                select: '*',
                filters: { deck_id: `eq.${safeDeckId}` },
                order: 'version_number.desc',
                limit: 200
            });
            return (rows || []).map(mapVersion);
        },

        async createGenerated(input) {
            const content = normalizeDeckContent(input.gameType, input.content);
            try {
                const result = await client.rpc('create_generated_deck', {
                    p_game_type: input.gameType,
                    p_name: cleanDeckName(input.name),
                    p_content: content,
                    p_source: input.source || 'ai',
                    p_theme: input.theme || null,
                    p_cefr_level: input.cefrLevel || null,
                    p_generation_parameters: input.generationParameters || {},
                    p_teacher_display_name: input.teacherDisplayName || null,
                    p_ai_provider: input.aiProvider || null,
                    p_ai_model: input.aiModel || null,
                    p_teacher_key_used: Boolean(input.teacherKeyUsed),
                    p_is_system: Boolean(input.isSystem)
                });
                return {
                    ...mapDeck(result.deck),
                    currentVersion: mapVersion(result.version)
                };
            } catch (error) {
                translateWriteError(error);
            }
        },

        async createRevision(input) {
            const content = normalizeDeckContent(input.gameType, input.content);
            try {
                const result = await client.rpc('create_deck_revision', {
                    p_deck_id: cleanDeckReference(input.deckId, 'Deck ID'),
                    p_expected_version_id: cleanDeckReference(
                        input.expectedVersionId,
                        'Expected version ID'
                    ),
                    p_content: content,
                    p_theme: input.theme || null,
                    p_cefr_level: input.cefrLevel || null,
                    p_teacher_display_name: input.teacherDisplayName || 'Administrator'
                });
                return {
                    ...mapDeck(result.deck),
                    currentVersion: mapVersion(result.version)
                };
            } catch (error) {
                translateWriteError(error);
            }
        },

        async rename(deckId, name, expectedVersionId) {
            try {
                const result = await client.rpc('rename_deck', {
                    p_deck_id: cleanDeckReference(deckId, 'Deck ID'),
                    p_name: cleanDeckName(name),
                    p_expected_version_id: cleanDeckReference(
                        expectedVersionId,
                        'Expected version ID'
                    )
                });
                return {
                    ...mapDeck(result.deck),
                    currentVersion: mapVersion(result.version)
                };
            } catch (error) {
                translateWriteError(error);
            }
        },

        async setArchived(deckId, archived, expectedVersionId) {
            try {
                const result = await client.rpc('set_deck_archived', {
                    p_deck_id: cleanDeckReference(deckId, 'Deck ID'),
                    p_archived: Boolean(archived),
                    p_expected_version_id: cleanDeckReference(
                        expectedVersionId,
                        'Expected version ID'
                    )
                });
                return {
                    ...mapDeck(result.deck),
                    currentVersion: mapVersion(result.version)
                };
            } catch (error) {
                translateWriteError(error);
            }
        }
    });
}
