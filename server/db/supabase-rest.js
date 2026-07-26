export class SupabaseRestError extends Error {
    constructor({ status, code, databaseMessage }) {
        super('Database request failed');
        this.name = 'SupabaseRestError';
        this.status = status;
        this.code = code || 'DATABASE_REQUEST_FAILED';
        Object.defineProperty(this, 'databaseMessage', {
            value: databaseMessage || '',
            enumerable: false
        });
    }
}

function assertIdentifier(value, label) {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9_]*$/i.test(value)) {
        throw new TypeError(`${label} must be a safe SQL identifier`);
    }
}

export function createSupabaseRestClient({
    url,
    serviceRoleKey,
    fetchImpl = globalThis.fetch
}) {
    const baseUrl = typeof url === 'string' ? url.replace(/\/+$/, '') : '';
    if (!baseUrl || !serviceRoleKey || typeof fetchImpl !== 'function') {
        throw new Error('Supabase URL, service-role key, and fetch implementation are required');
    }

    async function request(path, {
        method = 'GET',
        query,
        body,
        prefer
    } = {}) {
        const requestUrl = new URL(`${baseUrl}/rest/v1/${path}`);
        for (const [key, value] of Object.entries(query || {})) {
            if (value !== undefined && value !== null && value !== '') {
                requestUrl.searchParams.set(key, String(value));
            }
        }

        const headers = {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Accept: 'application/json'
        };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        if (prefer) headers.Prefer = prefer;

        const response = await fetchImpl(requestUrl.toString(), {
            method,
            headers,
            ...(body !== undefined ? { body: JSON.stringify(body) } : {})
        });

        if (!response.ok) {
            let payload = {};
            try {
                payload = await response.json();
            } catch {
                payload = {};
            }
            throw new SupabaseRestError({
                status: response.status,
                code: payload.code,
                databaseMessage: payload.message
            });
        }

        if (response.status === 204) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    return Object.freeze({
        select(table, {
            select = '*',
            filters = {},
            order,
            limit,
            single = false
        } = {}) {
            assertIdentifier(table, 'Table');
            return request(table, {
                query: {
                    select,
                    ...filters,
                    order,
                    limit
                },
                ...(single ? { prefer: 'params=single-object' } : {})
            }).then(result => single && Array.isArray(result) ? (result[0] || null) : result);
        },

        rpc(functionName, payload) {
            assertIdentifier(functionName, 'Function');
            return request(`rpc/${functionName}`, {
                method: 'POST',
                body: payload
            });
        }
    });
}

