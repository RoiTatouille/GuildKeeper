import db from '../database/database.js';

const createPlayerTransaction = db.transaction((discordGuildId, discordUserId) => {
    // Create the guild if not exist
    db.prepare(`
        INSERT INTO guilds (discord_guild_id)
        VALUES (?)
        ON CONFLICT(discord_guild_id) DO NOTHING
    `).run(discordGuildId);

    const guild = db.prepare(`
        SELECT id
        FROM guilds
        WHERE discord_guild_id = ?
    `).get(discordGuildId);

    // Create the player if it does not exist
    db.prepare(`
        INSERT INTO players (guild_id, discord_user_id)
        VALUES (?, ?)
        ON CONFLICT(guild_id, discord_user_id) DO NOTHING
    `).run(guild.id, discordUserId);

    return db.prepare(`
        SELECT
            id,
            guild_id AS guildId,
            discord_user_id AS discordUserId,
            sessions_played AS sessionsPlayed,
            total_xp AS totalXp,
            created_at AS createdAt
        FROM players
        WHERE guild_id = ? AND discord_user_id = ?
    `).get(guild.id, discordUserId);
});

/**
 * Retrieves an existing player or creates one
 */
export function getOrCreate(discordGuildId, discordUserId) {
    return createPlayerTransaction(discordGuildId, discordUserId);
}

/**
 * Retrieves a player by Discord id
 */
export function findByDiscordIds(discordGuildId, discordUserId) {
    return db.prepare(`
        SELECT
            players.id,
            players.guild_id AS guildId,
            players.discord_user_id AS discordUserId,
            players.sessions_played AS sessionsPlayed,
            players.total_xp AS totalXp,
            players.created_at AS createdAt
        FROM players
        INNER JOIN guilds ON guilds.id = players.guild_id
        WHERE guilds.discord_guild_id = ?
          AND players.discord_user_id = ?
    `).get(discordGuildId, discordUserId) ?? null;
}

/**
 * Retrieves a player by ID
 */
export function findById(playerId) {
    return db.prepare(`
        SELECT
            id,
            guild_id AS guildId,
            discord_user_id AS discordUserId,
            sessions_played AS sessionsPlayed,
            total_xp AS totalXp,
            created_at AS createdAt
        FROM players
        WHERE id = ?
    `).get(playerId) ?? null;
}