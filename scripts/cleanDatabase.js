import db from '../src/database/database.js';

db.pragma('foreign_keys = ON');

const tables = [
    'session_players',
    'xp_history',
    'quest_participants',
    'passive_subscriptions',
    'sessions',
    'active_quests',
    'passive_quests',
    'characters',
    'players',
    'available_slots'
];

const cleanDatabase = db.transaction(() => {
    const results = [];

    for (const table of tables) {
        const result = db.prepare(`DELETE FROM ${table}`).run();
        results.push({
            table,
            deleted: result.changes
        });
    }

    const hasSequence = db.prepare(`
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'sqlite_sequence'
    `).get();

    if (hasSequence) {
        const placeholders = tables.map(() => '?').join(', ');

        db.prepare(`
            DELETE FROM sqlite_sequence
            WHERE name IN (${placeholders})
        `).run(...tables);
    }

    return results;
});

try {
    const results = cleanDatabase();

    console.log('Nettoyage terminé');

    for (const result of results) {
        console.log(`${result.table}: ${result.deleted} ligne(s) supprimée(s)`);
    }

    console.log('Configuration des guildes et migrations conservées');
} catch (error) {
    console.error('Échec du nettoyage :', error);
} finally {
    db.close();
}