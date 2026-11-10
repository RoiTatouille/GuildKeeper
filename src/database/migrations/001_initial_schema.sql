
-- =====================================================
-- GUILDS
-- =====================================================

CREATE TABLE guilds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_guild_id TEXT NOT NULL UNIQUE,
    active_quests_channel_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =====================================================
-- PLAYERS
-- =====================================================

CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    discord_user_id TEXT NOT NULL,

    sessions_played INTEGER NOT NULL DEFAULT 0
        CHECK (sessions_played >= 0),

    total_xp INTEGER NOT NULL DEFAULT 0
        CHECK (total_xp >= 0),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (guild_id, discord_user_id),
    UNIQUE (id, guild_id),

    FOREIGN KEY (guild_id)
        REFERENCES guilds(id)
        ON DELETE CASCADE
);


-- =====================================================
-- CHARACTERS
-- =====================================================

CREATE TABLE characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,

    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1
        CHECK (level >= 1),

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (id, guild_id),
    UNIQUE (player_id, name),

    FOREIGN KEY (player_id, guild_id)
        REFERENCES players(id, guild_id)
        ON DELETE CASCADE
);


-- =====================================================
-- ACTIVE QUESTS
-- =====================================================

CREATE TABLE active_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,

    discord_message_id TEXT UNIQUE,

    title TEXT NOT NULL,
    description TEXT NOT NULL,

    xp_reward INTEGER NOT NULL DEFAULT 0
        CHECK (xp_reward >= 0),

    min_level INTEGER NOT NULL DEFAULT 1
        CHECK (min_level >= 1),

    max_players INTEGER NOT NULL
        CHECK (max_players >= 1),

    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN (
            'OPEN',
            'RESERVED',
            'COMPLETED',
            'CANCELLED'
        )),

    created_by_discord_id TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,

    UNIQUE (id, guild_id),

    FOREIGN KEY (guild_id)
        REFERENCES guilds(id)
        ON DELETE CASCADE
);


-- =====================================================
-- QUEST PARTICIPANTS
-- =====================================================

CREATE TABLE quest_participants (
    guild_id INTEGER NOT NULL,
    active_quest_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,

    joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (active_quest_id, player_id),

    FOREIGN KEY (active_quest_id, guild_id)
        REFERENCES active_quests(id, guild_id)
        ON DELETE CASCADE,

    FOREIGN KEY (player_id, guild_id)
        REFERENCES players(id, guild_id)
        ON DELETE CASCADE
);


-- =====================================================
-- PASSIVE QUESTS
-- =====================================================

CREATE TABLE passive_quests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL,

    xp_reward INTEGER NOT NULL DEFAULT 0
        CHECK (xp_reward >= 0),

    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED')),

    created_by_discord_id TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (id, guild_id),

    FOREIGN KEY (guild_id)
        REFERENCES guilds(id)
        ON DELETE CASCADE
);


-- =====================================================
-- PASSIVE SUBSCRIPTIONS
-- =====================================================

CREATE TABLE passive_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    passive_quest_id INTEGER NOT NULL,

    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TEXT,

    FOREIGN KEY (player_id, guild_id)
        REFERENCES players(id, guild_id)
        ON DELETE CASCADE,

    FOREIGN KEY (passive_quest_id, guild_id)
        REFERENCES passive_quests(id, guild_id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_one_active_passive_subscription
ON passive_subscriptions(player_id)
WHERE ended_at IS NULL;


-- =====================================================
-- AVAILABLE SLOTS
-- =====================================================

CREATE TABLE available_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,

    starts_at TEXT NOT NULL,
    ends_at TEXT NOT NULL,

    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),

    created_by_discord_id TEXT NOT NULL,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CHECK (ends_at > starts_at),

    UNIQUE (id, guild_id),

    FOREIGN KEY (guild_id)
        REFERENCES guilds(id)
        ON DELETE CASCADE
);


-- =====================================================
-- SESSIONS
-- =====================================================

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,

    active_quest_id INTEGER NOT NULL UNIQUE,
    available_slot_id INTEGER NOT NULL,

    reserved_by_discord_id TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'SCHEDULED'
        CHECK (status IN (
            'SCHEDULED',
            'COMPLETED',
            'CANCELLED'
        )),

    reserved_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,

    UNIQUE (id, guild_id),

    FOREIGN KEY (active_quest_id, guild_id)
        REFERENCES active_quests(id, guild_id)
        ON DELETE CASCADE,

    FOREIGN KEY (available_slot_id, guild_id)
        REFERENCES available_slots(id, guild_id)
        ON DELETE RESTRICT
);

CREATE UNIQUE INDEX idx_reserved_available_slot
ON sessions(available_slot_id)
WHERE status = 'SCHEDULED';


-- =====================================================
-- SESSION PLAYERS
-- =====================================================

CREATE TABLE session_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id INTEGER NOT NULL,

    session_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,

    status TEXT NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN (
            'CONFIRMED',
            'ATTENDED',
            'ABSENT',
            'REMOVED'
        )),

    FOREIGN KEY (session_id, guild_id)
        REFERENCES sessions(id, guild_id)
        ON DELETE CASCADE,

    FOREIGN KEY (player_id, guild_id)
        REFERENCES players(id, guild_id)
        ON DELETE CASCADE,

    UNIQUE (session_id, player_id)
);


-- =====================================================
-- XP HISTORY
-- =====================================================

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


-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_characters_player
ON characters(player_id);

CREATE INDEX idx_quest_participants_player
ON quest_participants(player_id);

CREATE INDEX idx_passive_subscriptions_player
ON passive_subscriptions(player_id);

CREATE INDEX idx_available_slots_dates
ON available_slots(guild_id, starts_at);

CREATE INDEX idx_sessions_status
ON sessions(guild_id, status);

CREATE INDEX idx_session_players_player
ON session_players(player_id);

CREATE INDEX idx_xp_history_player
ON xp_history(player_id);