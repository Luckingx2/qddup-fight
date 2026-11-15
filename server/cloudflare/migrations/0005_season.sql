ALTER TABLE matches ADD COLUMN ranking_season INTEGER NOT NULL DEFAULT 0;

CREATE TABLE ranking_scores (
  season INTEGER NOT NULL,
  player_id TEXT NOT NULL REFERENCES players(id),
  points INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (season, player_id)
);

CREATE INDEX ranking_scores_order ON ranking_scores(season, points DESC, wins DESC, losses ASC);

INSERT INTO ranking_scores (season, player_id, points, wins, losses)
  SELECT 1, id, points, wins, losses FROM players WHERE wins + losses > 0;

UPDATE matches SET ranking_season = 1 WHERE kind = 'ranked';

DROP TRIGGER score_match;

CREATE TRIGGER score_ranked_season AFTER UPDATE OF winner ON matches
WHEN NEW.kind = 'ranked' AND NEW.ranking_season > 0 AND OLD.winner IS NULL AND NEW.winner IS NOT NULL
BEGIN
  INSERT INTO ranking_scores(season, player_id, points, wins)
    VALUES (NEW.ranking_season, CASE NEW.winner WHEN 'host' THEN NEW.host ELSE NEW.guest END, 1025, 1)
    ON CONFLICT(season, player_id) DO UPDATE SET points = points + 25, wins = wins + 1;
  INSERT INTO ranking_scores(season, player_id, points, losses)
    VALUES (NEW.ranking_season, CASE NEW.winner WHEN 'host' THEN NEW.guest ELSE NEW.host END, 985, 1)
    ON CONFLICT(season, player_id) DO UPDATE SET points = MAX(0, points - 15), losses = losses + 1;
END;
