import db from '../database/database.js';

/**
 * Creates a character for a player
 */
export function create(playerId, name, level) {
    const result = db.prepare(`
        INSERT INTO characters (guild_id, player_id, name, level)
        SELECT guild_id, id, ?, ?
        FROM players
        WHERE id = ?
    `).run(name, level, playerId);

    if (result.changes === 0) {
        return null;
    }

    return findById(playerId, Number(result.lastInsertRowid));
}

/**
 * Updates a character
 */
export function update(playerId, characterId, name, level) {
    const result = db.prepare(`
        UPDATE characters
        SET
            name = ?,
            level = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND player_id = ?
    `).run(name, level, characterId, playerId);

    if (result.changes === 0) {
        return null;
    }

    return findById(playerId, characterId);
}

/**
 * Retrieves all characters of a player
 */
export function findAllByPlayerId(playerId) {
    return db.prepare(`
        SELECT
            id,
            name,
            level,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM characters
        WHERE player_id = ?
        ORDER BY name COLLATE NOCASE
    `).all(playerId);
}

/**
 * Retrieves a character of a player
 */
export function findById(playerId, characterId) {
    return db.prepare(`
        SELECT
            id,
            name,
            level,
            created_at AS createdAt,
            updated_at AS updatedAt
        FROM characters
        WHERE id = ? AND player_id = ?
    `).get(characterId, playerId) ?? null;
}

/**
 * Deletes a character of a player
 */
export function deleteById(playerId, characterId) {
    const result = db.prepare(`
        DELETE FROM characters
        WHERE id = ? AND player_id = ?
    `).run(characterId, playerId);

    return result.changes > 0;
}