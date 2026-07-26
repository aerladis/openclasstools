import 'dotenv/config';

import { loadConfig } from '../config.js';
import { createSupabaseRestClient } from '../db/supabase-rest.js';
import { createDeckRepository } from '../repositories/deck-repository.js';
import { SYSTEM_DECKS } from '../seeds/system-decks.js';

const config = loadConfig(process.env);
if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to seed decks');
}

const repository = createDeckRepository(createSupabaseRestClient({
    url: config.supabaseUrl,
    serviceRoleKey: config.supabaseServiceRoleKey
}));

let created = 0;
for (const seed of SYSTEM_DECKS) {
    const existing = await repository.listCurrent(seed.gameType);
    const normalizedName = seed.name.trim().toLocaleLowerCase('en-US');
    if (existing.some(deck => deck.name.trim().toLocaleLowerCase('en-US') === normalizedName)) {
        continue;
    }
    await repository.createGenerated({
        ...seed,
        source: 'system',
        isSystem: true,
        teacherDisplayName: 'OpenClassTools',
        teacherKeyUsed: false
    });
    created += 1;
}

console.log(`System deck seed complete: ${created} created, ${SYSTEM_DECKS.length - created} existing.`);
