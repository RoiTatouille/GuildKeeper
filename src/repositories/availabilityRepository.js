import db from '../database/database.js';

export function getTimezone(discordGuildId) {
    const result = db.prepare(`
        SELECT timezone
        FROM guilds
        WHERE discord_guild_id = ?
    `).get(discordGuildId);

    return result?.timezone ?? 'Europe/Paris';
}

export function create(discordGuildId, startsAt, endsAt, createdByDiscordId) {
    return db.transaction(() => {
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
            INSERT INTO available_slots (
                guild_id,
                starts_at,
                ends_at,
                created_by_discord_id
            )
            VALUES (?, ?, ?, ?)
        `).run(
            guild.id,
            startsAt,
            endsAt,
            createdByDiscordId
        );

        return db.prepare(`
            SELECT
                id,
                starts_at AS startsAt,
                ends_at AS endsAt,
                is_active AS isActive
            FROM available_slots
            WHERE id = ?
        `).get(Number(result.lastInsertRowid));
    })();
}

export function findActiveByGuild(discordGuildId) {
    return db.prepare(`
        SELECT
            available_slots.id,
            available_slots.starts_at AS startsAt,
            available_slots.ends_at AS endsAt
        FROM available_slots
        INNER JOIN guilds ON guilds.id = available_slots.guild_id
        WHERE guilds.discord_guild_id = ?
          AND available_slots.is_active = 1
        ORDER BY available_slots.starts_at
    `).all(discordGuildId);
}

export function update(discordGuildId, slotId, startsAt, endsAt) {
    const result = db.prepare(`
        UPDATE available_slots
        SET starts_at = ?, ends_at = ?
        WHERE id = ?
          AND is_active = 1
          AND guild_id = (
              SELECT id
              FROM guilds
              WHERE discord_guild_id = ?
          )
          AND NOT EXISTS (
              SELECT 1
              FROM sessions
              WHERE sessions.available_slot_id = available_slots.id
                AND sessions.status = 'SCHEDULED'
          )
    `).run(startsAt, endsAt, slotId, discordGuildId);

    if (result.changes === 0) return null;

    return findActiveById(discordGuildId, slotId);
}

export function deactivate(discordGuildId, slotId) {
    const result = db.prepare(`
        UPDATE available_slots
        SET is_active = 0
        WHERE id = ?
          AND guild_id = (
              SELECT id
              FROM guilds
              WHERE discord_guild_id = ?
          )
          AND is_active = 1
          AND NOT EXISTS (
            SELECT 1
            FROM sessions
            WHERE sessions.available_slot_id = available_slots.id
              AND sessions.status = 'SCHEDULED'
          )
    `).run(slotId, discordGuildId);

    return result.changes > 0;
}

export function findActiveById(discordGuildId, slotId) {
    return db.prepare(`
        SELECT
            id,
            starts_at AS startsAt,
            ends_at AS endsAt
        FROM available_slots
        WHERE id = ?
          AND guild_id = (
              SELECT id
              FROM guilds
              WHERE discord_guild_id = ?
          )
          AND is_active = 1
    `).get(slotId, discordGuildId) ?? null;
}

export function isReserved(slotId) {
    return Boolean(db.prepare(`
        SELECT 1
        FROM sessions
        WHERE available_slot_id = ?
          AND status = 'SCHEDULED'
        LIMIT 1
    `).get(slotId));
}