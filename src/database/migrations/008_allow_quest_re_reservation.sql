CREATE TABLE sessions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,

    active_quest_id INTEGER NOT NULL,
    available_slot_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN (
            'SCHEDULED',
            'COMPLETED',
            'CANCELLED'
        )),

    reserved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    reserved_by_discord_id TEXT,

    UNIQUE (id, guild_id),

    FOREIGN KEY (active_quest_id, guild_id)
        REFERENCES active_quests(id, guild_id)
        ON DELETE CASCADE,

    FOREIGN KEY (available_slot_id, guild_id)
        REFERENCES available_slots(id, guild_id)
);

INSERT INTO sessions_new (
    id,
    guild_id,
    active_quest_id,
    available_slot_id,
    status,
    reserved_at,
    completed_at,
    reserved_by_discord_id
)
SELECT
    id,
    guild_id,
    active_quest_id,
    available_slot_id,
    status,
    reserved_at,
    completed_at,
    reserved_by_discord_id
FROM sessions;

DROP TABLE sessions;

ALTER TABLE sessions_new RENAME TO sessions;

CREATE UNIQUE INDEX idx_scheduled_active_quest
ON sessions(active_quest_id)
WHERE status IN ('SCHEDULED', 'COMPLETED');

CREATE UNIQUE INDEX idx_reserved_available_slot
ON sessions(available_slot_id)
WHERE status IN ('SCHEDULED', 'COMPLETED');

CREATE INDEX idx_sessions_status
ON sessions(guild_id, status);