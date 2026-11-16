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
    const total = results.reduce((sum, result) => sum + result.deleted, 0);

    console.log('Nettoyage terminé');
    console.log(`Total : ${total} ligne(s) supprimée(s)`);

    for (const result of results) {
        console.log(`${result.table}: ${result.deleted} ligne(s) supprimée(s)`);
    }

    console.log('Configuration des guildes et migrations conservées');
} catch (error) {
    console.error('Échec du nettoyage :', error);
    process.exitCode = 1;
} finally {
    db.close();
}