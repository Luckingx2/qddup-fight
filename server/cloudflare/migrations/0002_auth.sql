DROP TRIGGER IF EXISTS assign_match;
DROP TRIGGER IF EXISTS score_match;
DROP TABLE IF EXISTS queue;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS players;

CREATE TABLE players (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pw_hash TEXT NOT NULL,
  pw_salt TEXT NOT NULL,
  pw_iter INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  player TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_player ON sessions(player);

CREATE TABLE auth_fail (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  first_at INTEGER NOT NULL
);

CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('quick', 'ranked')),
  host TEXT NOT NULL REFERENCES players(id),
  guest TEXT NOT NULL REFERENCES players(id),
  created_at INTEGER NOT NULL,
  host_report TEXT CHECK (host_report IN ('host', 'guest')),
  guest_report TEXT CHECK (guest_report IN ('host', 'guest')),
  winner TEXT CHECK (winner IN ('host', 'guest')),
  CHECK (host <> guest)
);

CREATE TABLE queue (
  player TEXT PRIMARY KEY REFERENCES players(id),
  kind TEXT NOT NULL CHECK (kind IN ('quick', 'ranked')),
  joined_at INTEGER NOT NULL,
  seen_at INTEGER NOT NULL,
  match_id TEXT REFERENCES matches(id)
);

CREATE INDEX queue_waiting ON queue(kind, joined_at) WHERE match_id IS NULL;
CREATE INDEX players_rank ON players(points DESC, wins DESC, losses ASC);

CREATE TRIGGER assign_match AFTER INSERT ON matches
BEGIN
  UPDATE queue SET match_id = NEW.id WHERE player IN (NEW.host, NEW.guest);
END;

CREATE TRIGGER score_match AFTER UPDATE OF winner ON matches
WHEN NEW.kind = 'ranked' AND OLD.winner IS NULL AND NEW.winner IS NOT NULL
BEGIN
  UPDATE players SET points = points + 25, wins = wins + 1
    WHERE id = CASE NEW.winner WHEN 'host' THEN NEW.host ELSE NEW.guest END;
  UPDATE players SET points = MAX(0, points - 15), losses = losses + 1
    WHERE id = CASE NEW.winner WHEN 'host' THEN NEW.guest ELSE NEW.host END;
END;
