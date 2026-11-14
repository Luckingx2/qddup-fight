const QUEUE_TTL = 20_000;
const MATCH_TTL = 30 * 60_000;
const RANKING_SEASON = 1;
const MATCH_CLIENT = 2;

function respond(data, status = 200) {
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});
}

async function playerId(request) {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization') || '')?.[1];
  if (!token) return null;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function matchmake(db, id, kind, now) {
  const stale = now - QUEUE_TTL;
  const expired = now - MATCH_TTL;
  const statements = [
    db.prepare(`DELETE FROM queue WHERE (match_id IS NULL AND (seen_at < ? OR client_version <> ?))
      OR match_id IN (SELECT id FROM matches WHERE created_at < ?
        OR (kind = 'ranked' AND ranking_season <> ?))`).bind(stale, MATCH_CLIENT, expired, RANKING_SEASON),
    db.prepare(`INSERT INTO queue (player,kind,joined_at,seen_at,client_version) VALUES (?,?,?,?,?)
      ON CONFLICT(player) DO UPDATE SET
        joined_at = CASE WHEN queue.kind = excluded.kind THEN queue.joined_at ELSE excluded.joined_at END,
        kind = excluded.kind, seen_at = excluded.seen_at, client_version = excluded.client_version
      WHERE queue.match_id IS NULL`).bind(id, kind, now, now, MATCH_CLIENT),
    db.prepare(`INSERT INTO matches (id,kind,host,guest,created_at,ranking_season)
      SELECT ?, me.kind, opponent.player, me.player, ?, CASE WHEN me.kind = 'ranked' THEN ? ELSE 0 END
      FROM queue me
      JOIN queue opponent ON opponent.kind = me.kind AND opponent.player <> me.player
      LEFT JOIN ranking_scores p ON p.player_id = me.player AND p.season = ?
      LEFT JOIN ranking_scores op ON op.player_id = opponent.player AND op.season = ?
      WHERE me.player = ? AND me.match_id IS NULL AND opponent.match_id IS NULL
        AND (me.kind = 'quick' OR ABS(COALESCE(p.points, 1000) - COALESCE(op.points, 1000)) <=
          150 + MAX(0, ((? - MIN(me.joined_at, opponent.joined_at)) / 10000)) * 100)
      ORDER BY opponent.joined_at, opponent.player LIMIT 1`).bind(crypto.randomUUID(), now, RANKING_SEASON, RANKING_SEASON, RANKING_SEASON, id, now),
    db.prepare(`SELECT m.id, m.kind, m.host = q.player AS host, p.nickname AS opponent
      FROM queue q JOIN matches m ON m.id = q.match_id
      JOIN players p ON p.id = CASE WHEN m.host = q.player THEN m.guest ELSE m.host END
      WHERE q.player = ?`).bind(id)
  ];
  const results = await db.batch(statements);
  return results.at(-1).results[0] || null;
}

async function handle(request, db) {
  const path = new URL(request.url).pathname;
  if (request.method === 'GET' && path === '/leaderboard') {
    const {results} = await db.prepare(`SELECT p.nickname,s.points,s.wins,s.losses
      FROM ranking_scores s JOIN players p ON p.id = s.player_id
      WHERE s.season = ?
      ORDER BY s.points DESC, s.wins DESC, s.losses ASC, p.nickname, p.id LIMIT 50`).bind(RANKING_SEASON).all();
    return respond({season: RANKING_SEASON, players: results});
  }
  if (request.method !== 'POST') return respond({error: 'not_found'}, 404);
  const id = await playerId(request);
  if (!id) return respond({error: 'invalid_identity'}, 401);
  const text = await request.text();
  if (text.length > 512) return respond({error: 'invalid_request'}, 400);
  let body;
  try { body = JSON.parse(text); } catch { return respond({error: 'invalid_request'}, 400); }
  if (!body || typeof body !== 'object') return respond({error: 'invalid_request'}, 400);

  if (path === '/queue') {
    if (body.client !== MATCH_CLIENT) return respond({error: 'client_update_required'}, 409);
    const nickname = typeof body.nickname === 'string' ? body.nickname.normalize('NFKC').trim() : '';
    if (!/^[\p{L}\p{N}_ -]{2,16}$/u.test(nickname) || !['quick', 'ranked'].includes(body.kind)) {
      return respond({error: 'invalid_queue_entry'}, 400);
    }
    await db.prepare(`INSERT INTO players (id,nickname) VALUES (?,?)
      ON CONFLICT(id) DO UPDATE SET nickname = excluded.nickname WHERE players.nickname <> excluded.nickname`)
      .bind(id, nickname).run();
    return respond({match: await matchmake(db, id, body.kind, Date.now())});
  }

  if (path === '/leave') {
    // Before assignment, cancel only the waiting entry. An assigned player leaves by match ID.
    if (body.id == null) {
      await db.prepare('DELETE FROM queue WHERE player = ? AND match_id IS NULL').bind(id).run();
      const assigned = await db.prepare('SELECT match_id AS id FROM queue WHERE player = ?').bind(id).first();
      return respond({id: assigned?.id || null});
    }
    await db.prepare('DELETE FROM queue WHERE player = ? AND match_id = ?').bind(id, body.id).run();
    return respond({});
  }

  if (path === '/result') {
    if (typeof body.id !== 'string' || !['host', 'guest'].includes(body.winner)) {
      return respond({error: 'invalid_result'}, 400);
    }
    const [submission, confirmation] = await db.batch([
      db.prepare(`UPDATE matches SET
        host_report = CASE WHEN host = ? THEN COALESCE(host_report, ?) ELSE host_report END,
        guest_report = CASE WHEN guest = ? THEN COALESCE(guest_report, ?) ELSE guest_report END
        WHERE id = ? AND kind = 'ranked' AND ranking_season = ? AND (host = ? OR guest = ?) AND created_at >= ?
        RETURNING host_report, guest_report, winner`).bind(id, body.winner, id, body.winner, body.id, RANKING_SEASON, id, id, Date.now() - MATCH_TTL),
      db.prepare(`UPDATE matches SET winner = host_report
        WHERE id = ? AND (host = ? OR guest = ?) AND kind = 'ranked' AND ranking_season = ? AND winner IS NULL
          AND host_report = guest_report AND created_at >= ? RETURNING winner`).bind(body.id, id, id, RANKING_SEASON, Date.now() - MATCH_TTL)
    ]);
    const record = submission.results[0];
    if (!record) return respond({error: 'unknown_match'}, 404);
    const confirmed = !!(record.winner || confirmation.results[0]);
    const disputed = !!(record.host_report && record.guest_report && record.host_report !== record.guest_report);
    return respond({confirmed, disputed});
  }
  return respond({error: 'not_found'}, 404);
}

export default {
  async fetch(request, env) {
    const gameOrigin = env.GAME_ORIGIN ?? 'https://luckingx2.github.io';
    const origin = request.headers.get('Origin');
    if (origin && origin !== gameOrigin) return respond({error: 'origin_denied'}, 403);
    const cors = {
      'Access-Control-Allow-Origin': gameOrigin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    let response;
    try {
      response = await handle(request, env.DB);
    } catch (error) {
      console.error('Online API failure', error.message);
      response = respond({error: 'service_unavailable'}, 503);
    }
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    return response;
  }
};
