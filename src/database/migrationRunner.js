
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import db from './database.js';

const migrationsDirectory = fileURLToPath(
    new URL('./migrations/', import.meta.url)
);

export async function runMigrations() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            executed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    `);

    const files = (await readdir(migrationsDirectory))
        .filter(file => /^\d+_.+\.sql$/.test(file))
        .sort();

    const getMigration = db.prepare(
        'SELECT filename FROM schema_migrations WHERE filename = ?'
    );

    const saveMigration = db.prepare(
        'INSERT INTO schema_migrations (filename) VALUES (?)'
    );

    for (const filename of files) {
        if (getMigration.get(filename)) {
            continue;
        }

        const filePath = path.join(migrationsDirectory, filename);
        const sql = await readFile(filePath, 'utf8');

        const executeMigration = db.transaction(() => {
            db.exec(sql);
            saveMigration.run(filename);
        });

        executeMigration();

        console.log(`Migration executed: ${filename}`);
    }

    console.log('Database migrations completed.');
}
