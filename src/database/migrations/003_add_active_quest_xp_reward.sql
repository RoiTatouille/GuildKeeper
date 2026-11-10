ALTER TABLE active_quests
ADD COLUMN xp_reward INTEGER NOT NULL DEFAULT 0
CHECK (xp_reward >= 0);