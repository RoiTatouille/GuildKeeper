import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const databasePath = resolve('data/guildkeeper.sqlite');

mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

console.log(`Database connected: ${databasePath}`);

export default db;