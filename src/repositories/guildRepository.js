import db from '../database/database.js';

export function findByDiscordId(discordGuildId) {
    return db.prepare(`
        SELECT
            id,
            discord_guild_id AS discordGuildId,
            active_quests_channel_id AS activeQuestsChannelId,
            general_channel_id AS generalChannelId,
            created_at AS createdAt
        FROM guilds
        WHERE discord_guild_id = ?
    `).get(discordGuildId) ?? null;
}

export function updateActiveQuestsChannel(discordGuildId, channelId) {
    db.prepare(`
        INSERT INTO guilds (discord_guild_id, active_quests_channel_id)
        VALUES (?, ?)
        ON CONFLICT(discord_guild_id)
        DO UPDATE SET active_quests_channel_id = excluded.active_quests_channel_id
    `).run(discordGuildId, channelId);
}

export function updateGeneralChannel(discordGuildId, channelId) {
    db.prepare(`
        INSERT INTO guilds (discord_guild_id, general_channel_id)
        VALUES (?, ?)
        ON CONFLICT(discord_guild_id)
        DO UPDATE SET general_channel_id = excluded.general_channel_id
    `).run(discordGuildId, channelId);
}