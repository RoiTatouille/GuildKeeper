ALTER TABLE active_quests
ADD COLUMN min_players INTEGER NOT NULL DEFAULT 1
CHECK (min_players >= 1);