CREATE TABLE legacy_scores (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  season INTEGER NOT NULL,
  points INTEGER NOT NULL,
  wins INTEGER NOT NULL,
  losses INTEGER NOT NULL,
  claimed_by TEXT REFERENCES players(id),
  claimed_at INTEGER
);

CREATE UNIQUE INDEX legacy_one_per_player ON legacy_scores(claimed_by) WHERE claimed_by IS NOT NULL;
CREATE INDEX legacy_unclaimed ON legacy_scores(season, points DESC) WHERE claimed_by IS NULL;
CREATE INDEX legacy_nickname ON legacy_scores(nickname COLLATE NOCASE) WHERE claimed_by IS NULL;
