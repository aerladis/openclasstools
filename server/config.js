function cleanEnvValue(value) {
    return typeof value === 'string' ? value.trim() : '';
}

export function loadConfig(env = process.env, { production = env.NODE_ENV === 'production' } = {}) {
    const config = {
        nodeEnv: cleanEnvValue(env.NODE_ENV) || 'development',
        supabaseUrl: cleanEnvValue(env.SUPABASE_URL),
        supabaseServiceRoleKey: cleanEnvValue(env.SUPABASE_SERVICE_ROLE_KEY),
        adminPasscode: cleanEnvValue(env.ADMIN_PASSCODE),
        adminSessionSecret: cleanEnvValue(env.ADMIN_SESSION_SECRET),
        cookieSecure: production
    };

    const required = [
        ['SUPABASE_URL', config.supabaseUrl],
        ['SUPABASE_SERVICE_ROLE_KEY', config.supabaseServiceRoleKey],
        ['ADMIN_PASSCODE', config.adminPasscode],
        ['ADMIN_SESSION_SECRET', config.adminSessionSecret]
    ];
    const missing = required.filter(([, value]) => !value).map(([name]) => name);

    if (production && missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    return config;
}

