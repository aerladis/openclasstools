function cleanEnvValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function loadConfig(env = process.env, { production = env.NODE_ENV === 'production' } = {}) {
    const config = {
        nodeEnv: cleanEnvValue(env.NODE_ENV) || 'development',
        supabaseUrl: cleanEnvValue(env.SUPABASE_URL),
        supabaseServiceRoleKey: cleanEnvValue(env.SUPABASE_SERVICE_ROLE_KEY),
        cookieSecure: production
    };

    const required = [
        ['SUPABASE_URL', config.supabaseUrl],
        ['SUPABASE_SERVICE_ROLE_KEY', config.supabaseServiceRoleKey]
    ];
    const missing = required.filter(([, value]) => !value).map(([name]) => name);

    if (production && missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    return config;
}
