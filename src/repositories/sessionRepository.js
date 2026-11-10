import db from '../database/database.js';

export function findQuestById(discordGuildId, questId) {
    return db.prepare(`
        SELECT
            active_quests.id,
            active_quests.guild_id AS guildId,
            active_quests.title,
            active_quests.min_level AS minLevel,
            active_quests.max_players AS maxPlayers,
            active_quests.status
        FROM active_quests
        INNER JOIN guilds ON guilds.id = active_quests.guild_id
        WHERE guilds.discord_guild_id = ?
          AND active_quests.id = ?
    `).get(discordGuildId, questId) ?? null;
}

export function findParticipantsByQuestId(questId) {
    return db.prepare(`
        SELECT
            players.id AS playerId,
            players.discord_user_id AS discordUserId,
            characters.id AS characterId,
            characters.name AS characterName,
            characters.level AS characterLevel
        FROM quest_participants
        INNER JOIN players ON players.id = quest_participants.player_id
        LEFT JOIN characters ON characters.player_id = players.id
        WHERE quest_participants.active_quest_id = ?
        ORDER BY players.id, characters.name COLLATE NOCASE
    `).all(questId);
}

export function findActiveSlotById(discordGuildId, slotId) {
    return db.prepare(`
        SELECT
            available_slots.id,
            available_slots.guild_id AS guildId,
            available_slots.starts_at AS startsAt,
            available_slots.ends_at AS endsAt
        FROM available_slots
        INNER JOIN guilds ON guilds.id = available_slots.guild_id
        WHERE guilds.discord_guild_id = ?
          AND available_slots.id = ?
          AND available_slots.is_active = 1
    `).get(discordGuildId, slotId) ?? null;
}

export function isSlotReserved(slotId) {
    return Boolean(db.prepare(`
        SELECT 1
        FROM sessions
        WHERE available_slot_id = ?
          AND status = 'SCHEDULED'
    `).get(slotId));
}

const createReservationTransaction = db.transaction((
    guildId,
    questId,
    slotId,
    reservedByDiscordId,
    playerIds
) => {
    const quest = db.prepare(`
        SELECT id
        FROM active_quests
        WHERE id = ? AND guild_id = ? AND status = 'OPEN'
    `).get(questId, guildId);

    if (!quest) {
        return null;
    }

    const slot = db.prepare(`
        SELECT id
        FROM available_slots
        WHERE id = ? AND guild_id = ? AND is_active = 1
    `).get(slotId, guildId);

    if (!slot) {
        return null;
    }

    const session = db.prepare(`
        INSERT INTO sessions (
            guild_id,
            active_quest_id,
            available_slot_id,
            reserved_by_discord_id
        )
        VALUES (?, ?, ?, ?)
    `).run(guildId, questId, slotId, reservedByDiscordId);

    const insertSessionPlayer = db.prepare(`
        INSERT INTO session_players (
            guild_id,
            session_id,
            player_id
        )
        VALUES (?, ?, ?)
    `);

    for (const playerId of playerIds) {
        insertSessionPlayer.run(guildId, session.lastInsertRowid, playerId);
    }

    db.prepare(`
        UPDATE active_quests
        SET status = 'RESERVED',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND guild_id = ?
    `).run(questId, guildId);

    return {
        id: Number(session.lastInsertRowid),
        questId,
        slotId,
        playerCount: playerIds.length
    };
});

export function createReservation(
    guildId,
    questId,
    slotId,
    reservedByDiscordId,
    playerIds
) {
    return createReservationTransaction(
        guildId,
        questId,
        slotId,
        reservedByDiscordId,
        playerIds
    );
}