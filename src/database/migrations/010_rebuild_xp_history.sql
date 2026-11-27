DROP TABLE xp_history;

CREATE TABLE xp_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    session_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,

    source_type TEXT NOT NULL
        CHECK (source_type IN (
            'ACTIVE_QUEST',
            'PASSIVE_QUEST'
        )),

    passive_quest_id INTEGER,

    amount INTEGER NOT NULL
        CHECK (amount >= 0),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (
        (source_type = 'ACTIVE_QUEST'
            AND passive_quest_id IS NULL)
        OR
        (source_type = 'PASSIVE_QUEST'
            AND passive_quest_id IS NOT NULL)
    ),

    FOREIGN KEY (session_id, guild_id)
        REFERENCES sessions(id, guild_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (player_id, guild_id)
        REFERENCES players(id, guild_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (passive_quest_id, guild_id)
        REFERENCES passive_quests(id, guild_id)
        ON DELETE RESTRICT,

    UNIQUE (session_id, player_id)
);