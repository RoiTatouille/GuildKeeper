import db from '../database/database.js';

const createQuestTransaction = db.transaction((
    discordGuildId,
    title,
    description,
    requirements,
    xpReward,
    minLevel,
    minPlayers,
    maxPlayers,
    createdByDiscordId,
) => {
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

    const result = db.prepare(`
        INSERT INTO active_quests (
            guild_id,
            title,
            description,
            requirements,
            xp_reward,
            min_level,
            min_players,
            max_players,
            created_by_discord_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        guild.id,
        title,
        description,
        requirements,
        xpReward,
        minLevel,
        minPlayers,
        maxPlayers,
        createdByDiscordId
    );

    return findById(discordGuildId, Number(result.lastInsertRowid));
});

export function create(
    discordGuildId,
    title,
    description,
    requirements,
    xpReward,
    minLevel,
    minPlayers,
    maxPlayers,
    createdByDiscordId
) {
    return createQuestTransaction(
        discordGuildId,
        title,
        description,
        requirements,
        xpReward,
        minLevel,
        minPlayers,
        maxPlayers,
        createdByDiscordId
    );
}

export function findById(discordGuildId, questId) {
    return db.prepare(`
        SELECT
            active_quests.id,
            active_quests.guild_id AS guildId,
            active_quests.title,
            active_quests.description,
            active_quests.requirements,
            active_quests.xp_reward AS xpReward,
            active_quests.min_level AS minLevel,
            active_quests.min_players AS minPlayers,
            active_quests.max_players AS maxPlayers,
            active_quests.status,
            active_quests.discord_message_id AS discordMessageId,
            active_quests.created_by_discord_id AS createdByDiscordId,
            active_quests.created_at AS createdAt,
            active_quests.updated_at AS updatedAt,
            active_quests.completed_at AS completedAt
        FROM active_quests
        INNER JOIN guilds ON guilds.id = active_quests.guild_id
        WHERE guilds.discord_guild_id = ?
          AND active_quests.id = ?
    `).get(discordGuildId, questId) ?? null;
}

export function findAllByGuild(discordGuildId) {
    return db.prepare(`
        SELECT
            active_quests.id,
            active_quests.title,
            active_quests.description,
            active_quests.requirements,
            active_quests.xp_reward AS xpReward,
            active_quests.min_level AS minLevel,
            active_quests.min_players AS minPlayers,
            active_quests.max_players AS maxPlayers,
            active_quests.status,
            active_quests.discord_message_id AS discordMessageId,
            active_quests.created_at AS createdAt
        FROM active_quests
        INNER JOIN guilds ON guilds.id = active_quests.guild_id
        WHERE guilds.discord_guild_id = ?
        ORDER BY active_quests.created_at DESC
    `).all(discordGuildId);
}

export function update(
    discordGuildId,
    questId,
    title,
    description,
    requirements,
    xpReward,
    minLevel,
    minPlayers,
    maxPlayers
) {
    const result = db.prepare(`
        UPDATE active_quests
        SET
            title = ?,
            description = ?,
            requirements = ?,
            xp_reward = ?,
            min_level = ?,
            min_players = ?,
            max_players = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND guild_id = (
              SELECT id
              FROM guilds
              WHERE discord_guild_id = ?
          )
          AND status = 'OPEN'
    `).run(
        title,
        description,
        requirements,
        xpReward,
        minLevel,
        minPlayers,
        maxPlayers,
        questId,
        discordGuildId
    );

    if (result.changes === 0) {
        return null;
    }

    return findById(discordGuildId, questId);
}

export function cancel(discordGuildId, questId) {
    const result = db.prepare(`
        UPDATE active_quests
        SET
            status = 'CANCELLED',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND guild_id = (
              SELECT id
              FROM guilds
              WHERE discord_guild_id = ?
          )
          AND status = 'OPEN'
    `).run(questId, discordGuildId);

    return result.changes > 0;
}

export function setDiscordMessageId(discordGuildId, questId, messageId) {
    const result = db.prepare(`
        UPDATE active_quests
        SET
            discord_message_id = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND guild_id = (
              SELECT id
              FROM guilds
              WHERE discord_guild_id = ?
          )
    `).run(messageId, questId, discordGuildId);

    return result.changes > 0;
}