import db from '../database/database.js';

export function add(discordUserId) {
    return db.prepare(`
        INSERT INTO guild_masters (discord_user_id)
        VALUES (?)
        ON CONFLICT(discord_user_id) DO NOTHING
    `).run(discordUserId).changes > 0;
}

export function remove(discordUserId) {
    return db.prepare(`
        DELETE FROM guild_masters
        WHERE discord_user_id = ?
    `).run(discordUserId).changes > 0;
}

export function isGuildMaster(discordUserId) {
    return db.prepare(`
        SELECT 1
        FROM guild_masters
        WHERE discord_user_id = ?
    `).get(discordUserId) !== undefined;
}

export function findAll() {
    return db.prepare(`
        SELECT
            id,
            discord_user_id AS discordUserId,
            created_at AS createdAt
        FROM guild_masters
        ORDER BY created_at ASC
    `).all();
}