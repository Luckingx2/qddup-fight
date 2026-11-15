export {Hub} from './hub.mjs';
import {season, CHAMPIONS} from './hub.mjs';

const QUEUE_TTL = 20_000;
const MATCH_TTL = 30 * 60_000;
const SESSION_TTL = 30 * 24 * 60 * 60_000;
const PW_ITER = 30_000;
const FAIL_WINDOW = 10 * 60_000;
const FAIL_LIMIT_NICK = 5;
const FAIL_LIMIT_IP = 20;
const NICK_RE = /^[\p{L}\p{N}_ -]{2,16}$/u;
const TURN_TTL = 3600;
const FALLBACK_ICE = [
  {urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302']},
  {urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'], username: 'peerjs', credential: 'peerjsp'}
];

const enc = new TextEncoder();
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const randomHex = bytes => hex(crypto.getRandomValues(new Uint8Array(bytes)));
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));

function respond(data, status = 200) {
  return Response.json(data, {status, headers: {'Cache-Control': 'no-store'}});
}

async function hashPassword(password, saltHex, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(saltHex.match(/../g), h => parseInt(h, 16));
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations}, key, 256));
}

function sameHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function bearer(request) {
  return /^Bearer ([a-f0-9]{64})$/.exec(request.headers.get('Authorization') || '')?.[1] || null;
}

let seasonNow = 1;
async function sessionPlayer(db, request) {
  const token = bearer(request);
  if (!token) return null;
  return db.prepare(`SELECT p.id, p.nickname, COALESCE(r.points, 1000) AS points,
    COALESCE(r.wins, 0) AS wins, COALESCE(r.losses, 0) AS losses FROM sessions s
    JOIN players p ON p.id = s.player
    LEFT JOIN ranking_scores r ON r.player_id = p.id AND r.season = ?
    WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(seasonNow, await sha256(token), Date.now()).first();
}

async function newSession(db, playerId) {
  const token = randomHex(32);
  const now = Date.now();
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO sessions (token_hash, player, created_at, expires_at) VALUES (?,?,?,?)')
      .bind(await sha256(token), playerId, now, now + SESSION_TTL)
  ]);
  return token;
}

async function tooManyFailures(db, keys, now) {
  for (const [key, limit] of keys) {
    const row = await db.prepare('SELECT count, first_at FROM auth_fail WHERE key = ?').bind(key).first();
    if (row && now - row.first_at < FAIL_WINDOW && row.count >= limit) return true;
  }
  return false;
}

async function recordFailure(db, keys, now) {
  await db.batch(keys.map(([key]) => db.prepare(`INSERT INTO auth_fail (key, count, first_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET
      count = CASE WHEN ? - auth_fail.first_at >= ? THEN 1 ELSE auth_fail.count + 1 END,
      first_at = CASE WHEN ? - auth_fail.first_at >= ? THEN ? ELSE auth_fail.first_at END`)
    .bind(key, now, now, FAIL_WINDOW, now, FAIL_WINDOW, now)));
}

function readCredentials(body) {
  const nickname = typeof body.nickname === 'string' ? body.nickname.normalize('NFKC').trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!NICK_RE.test(nickname)) return {error: 'invalid_nickname'};
  if (password.length < 4 || password.length > 64) return {error: 'invalid_password'};
  return {nickname, password};
}

const legacyToken = body => (typeof body.legacy === 'string' && /^[a-f0-9]{64}$/.test(body.legacy) ? body.legacy : null);

async function claimLegacy(db, playerId, token) {
  if (!token) return null;
  const legacyId = await sha256(token);
  const row = await db.prepare('SELECT claimed_by FROM legacy_scores WHERE id = ? AND season = ?')
    .bind(legacyId, seasonNow).first();
  if (!row) return {status: 'none'};
  if (row.claimed_by) return {status: row.claimed_by === playerId ? 'done' : 'used'};
  const now = Date.now();
  const [claim] = await db.batch([
    db.prepare(`UPDATE legacy_scores SET claimed_by = ?, claimed_at = ?
      WHERE id = ? AND season = ? AND claimed_by IS NULL
        AND NOT EXISTS (SELECT 1 FROM legacy_scores WHERE claimed_by = ?)
        AND NOT EXISTS (SELECT 1 FROM ranking_scores WHERE season = ? AND player_id = ?)
      RETURNING points, wins, losses`).bind(playerId, now, legacyId, seasonNow, playerId, seasonNow, playerId),
    db.prepare(`INSERT INTO ranking_scores (season, player_id, points, wins, losses)
      SELECT season, claimed_by, points, wins, losses FROM legacy_scores
      WHERE id = ? AND claimed_by = ? AND claimed_at = ?`).bind(legacyId, playerId, now)
  ]);
  const moved = claim.results[0];
  return moved ? {status: 'claimed', ...moved} : {status: 'has_record'};
}

async function signup(db, body) {
  const cred = readCredentials(body);
  if (cred.error) return respond({error: cred.error}, 400);
  const taken = await db.prepare('SELECT 1 FROM players WHERE nickname = ?').bind(cred.nickname).first();
  if (taken) return respond({error: 'nickname_taken'}, 409);
  const legacy = legacyToken(body);
  const {results: reserved} = await db.prepare(`SELECT id FROM legacy_scores
    WHERE nickname = ? COLLATE NOCASE AND claimed_by IS NULL`).bind(cred.nickname).all();
  if (reserved.length) {
    const legacyId = legacy && await sha256(legacy);
    if (!reserved.some(row => row.id === legacyId)) return respond({error: 'nickname_reserved'}, 409);
  }
  const id = crypto.randomUUID();
  const salt = randomHex(16);
  const hash = await hashPassword(cred.password, salt, PW_ITER);
  try {
    await db.prepare(`INSERT INTO players (id, nickname, pw_hash, pw_salt, pw_iter, created_at)
      VALUES (?,?,?,?,?,?)`).bind(id, cred.nickname, hash, salt, PW_ITER, Date.now()).run();
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return respond({error: 'nickname_taken'}, 409);
    throw error;
  }
  return respond({token: await newSession(db, id), nickname: cred.nickname, created: true, legacy: await claimLegacy(db, id, legacy)});
}

async function login(db, body, ip) {
  const cred = readCredentials(body);
  if (cred.error) return respond({error: cred.error}, 400);
  const now = Date.now();
  const keys = [['n:' + cred.nickname.toLowerCase(), FAIL_LIMIT_NICK], ['ip:' + ip, FAIL_LIMIT_IP]];
  if (await tooManyFailures(db, keys, now)) return respond({error: 'too_many_attempts'}, 429);
  const player = await db.prepare('SELECT id, nickname, pw_hash, pw_salt, pw_iter FROM players WHERE nickname = ?')
    .bind(cred.nickname).first();
  if (!player) return signup(db, body);
  const hash = await hashPassword(cred.password, player.pw_salt, player.pw_iter);
  if (!sameHex(hash, player.pw_hash)) {
    await recordFailure(db, keys, now);
    return respond({error: 'invalid_login'}, 401);
  }
  await db.prepare('DELETE FROM auth_fail WHERE key = ?').bind(keys[0][0]).run();
  return respond({token: await newSession(db, player.id), nickname: player.nickname, legacy: await claimLegacy(db, player.id, legacyToken(body))});
}

async function turnServers(env) {
  if (!env.TURN_KEY_ID || !env.TURN_KEY_API_TOKEN) return {iceServers: FALLBACK_ICE, ttl: TURN_TTL, relay: 'fallback'};
  const day = new Date().toISOString().slice(0, 10);
  const limit = Number(env.TURN_DAILY_LIMIT || 3000);
  const row = await env.DB.prepare(`INSERT INTO turn_daily (day, count) VALUES (?, 1)
    ON CONFLICT(day) DO UPDATE SET count = count + 1 RETURNING count`).bind(day).first();
  if (row.count > limit) return {iceServers: FALLBACK_ICE, ttl: TURN_TTL, relay: 'fallback'};
  const reply = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${env.TURN_KEY_ID}/credentials/generate-ice-servers`, {
    method: 'POST',
    headers: {Authorization: `Bearer ${env.TURN_KEY_API_TOKEN}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({ttl: TURN_TTL})
  });
  if (!reply.ok) {
    console.error('TURN credential failure', reply.status);
    return {iceServers: FALLBACK_ICE, ttl: TURN_TTL, relay: 'fallback'};
  }
  const data = await reply.json();
  const list = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers];
  const iceServers = list.map(s => ({...s, urls: [].concat(s.urls).filter(u => !/:53(\?|$)/.test(u))}))
    .filter(s => s.urls.length);
  return {iceServers, ttl: TURN_TTL, relay: 'cloudflare'};
}

async function matchmake(db, id, kind, now) {
  const stale = now - QUEUE_TTL;
  const expired = now - MATCH_TTL;
  const statements = [
    db.prepare(`DELETE FROM queue WHERE (match_id IS NULL AND seen_at < ?)
      OR match_id IN (SELECT id FROM matches WHERE created_at < ?)`).bind(stale, expired),
    db.prepare(`INSERT INTO queue (player,kind,joined_at,seen_at) VALUES (?,?,?,?)
      ON CONFLICT(player) DO UPDATE SET
        joined_at = CASE WHEN queue.kind = excluded.kind THEN queue.joined_at ELSE excluded.joined_at END,
        kind = excluded.kind, seen_at = excluded.seen_at WHERE queue.match_id IS NULL`).bind(id, kind, now, now),
    db.prepare(`INSERT INTO matches (id,kind,host,guest,created_at,ranking_season)
      SELECT ?, me.kind, opponent.player, me.player, ?, CASE WHEN me.kind = 'ranked' THEN ? ELSE 0 END
      FROM queue me
      JOIN queue opponent ON opponent.kind = me.kind AND opponent.player <> me.player
      LEFT JOIN ranking_scores p ON p.player_id = me.player AND p.season = ?
      LEFT JOIN ranking_scores op ON op.player_id = opponent.player AND op.season = ?
      WHERE me.player = ? AND me.match_id IS NULL AND opponent.match_id IS NULL
        AND (me.kind = 'quick' OR ABS(COALESCE(p.points, 1000) - COALESCE(op.points, 1000)) <=
          150 + MAX(0, ((? - MIN(me.joined_at, opponent.joined_at)) / 10000)) * 100)
      ORDER BY opponent.joined_at, opponent.player LIMIT 1`).bind(crypto.randomUUID(), now, seasonNow, seasonNow, seasonNow, id, now),
    db.prepare(`SELECT m.id, m.kind, m.host = q.player AS host, p.nickname AS opponent
      FROM queue q JOIN matches m ON m.id = q.match_id
      JOIN players p ON p.id = CASE WHEN m.host = q.player THEN m.guest ELSE m.host END
      WHERE q.player = ?`).bind(id)
  ];
  const results = await db.batch(statements);
  return results.at(-1).results[0] || null;
}

async function handle(request, env) {
  seasonNow = season(env);
  const db = env.DB;
  const path = new URL(request.url).pathname.replace(/^\/api/, '');
  if (request.method === 'GET' && path === '/leaderboard') {
    const {results} = await db.prepare(`SELECT nickname, points, wins, losses, titles FROM (
        SELECT p.nickname, s.points, s.wins, s.losses, COALESCE(c.titles, 0) AS titles
          FROM ranking_scores s JOIN players p ON p.id = s.player_id
          LEFT JOIN (${CHAMPIONS}) c ON c.player_id = p.id WHERE s.season = ?
        UNION ALL
        SELECT nickname, points, wins, losses, 0 FROM legacy_scores WHERE season = ? AND claimed_by IS NULL)
      ORDER BY points DESC, wins DESC, losses ASC, nickname LIMIT 50`).bind(seasonNow, seasonNow, seasonNow).all();
    const me = await sessionPlayer(db, request);
    let mine = null;
    if (me) {
      const r = await db.prepare(`SELECT points, wins, losses FROM ranking_scores WHERE season = ? AND player_id = ?`).bind(seasonNow, me.id).first();
      const won = await db.prepare(`SELECT titles FROM (${CHAMPIONS}) WHERE player_id = ?`).bind(seasonNow, me.id).first();
      mine = {nickname: me.nickname, points: r?.points ?? 1000, wins: r?.wins ?? 0, losses: r?.losses ?? 0, rank: null, titles: won?.titles ?? 0};
      if (r) mine.rank = 1 + (await db.prepare(`SELECT COUNT(*) AS n FROM (
          SELECT p.nickname, s.points, s.wins, s.losses
            FROM ranking_scores s JOIN players p ON p.id = s.player_id WHERE s.season = ?
          UNION ALL
          SELECT nickname, points, wins, losses FROM legacy_scores WHERE season = ? AND claimed_by IS NULL)
        WHERE points > ? OR (points = ? AND (wins > ? OR (wins = ? AND (losses < ? OR (losses = ? AND nickname < ?)))))`)
        .bind(seasonNow, seasonNow, r.points, r.points, r.wins, r.wins, r.losses, r.losses, me.nickname).first()).n;
    }
    return respond({season: seasonNow, players: results, me: mine});
  }
  if (request.method === 'GET' && path === '/turn') {
    const me = await sessionPlayer(db, request);
    if (!me) return respond({error: 'not_logged_in'}, 401);
    return respond(await turnServers(env));
  }
  if (request.method === 'GET' && path === '/build') return new Response(env.BUILD || '', {headers: {'Content-Type': 'text/plain', 'Cache-Control': 'no-store'}});
  if (request.method === 'GET' && path === '/online') {
    const me = await sessionPlayer(db, request);
    const who = me?.id || request.headers.get('CF-Connecting-IP') || '';
    const r = await env.HUB.get(env.HUB.idFromName('main')).fetch('https://hub/presence?p=' + encodeURIComponent(me?.id || '') + '&w=' + encodeURIComponent(who));
    if (r.status === 429) return respond({error: 'too_many_requests'}, 429);
    return respond(await r.json());
  }
  if (request.method === 'GET' && path === '/me') {
    const me = await sessionPlayer(db, request);
    if (!me) return respond({error: 'not_logged_in'}, 401);
    const won = await db.prepare(`SELECT titles FROM (${CHAMPIONS}) WHERE player_id = ?`).bind(seasonNow, me.id).first();
    return respond({nickname: me.nickname, season: seasonNow, points: me.points, wins: me.wins, losses: me.losses, titles: won?.titles ?? 0});
  }
  if (request.method !== 'POST') return respond({error: 'not_found'}, 404);
  const text = await request.text();
  if (path === '/diag') {
    if (text.length > 8000) return respond({error: 'invalid_request'}, 400);
    const me = await sessionPlayer(db, request);
    await db.batch([
      db.prepare('INSERT INTO diag (at, player, data) VALUES (?,?,?)').bind(Date.now(), me?.nickname || null, text),
      db.prepare('DELETE FROM diag WHERE id <= (SELECT MAX(id) - 300 FROM diag)')
    ]);
    return respond({});
  }
  if (text.length > 512) return respond({error: 'invalid_request'}, 400);
  let body;
  try { body = JSON.parse(text || '{}'); } catch { return respond({error: 'invalid_request'}, 400); }
  if (!body || typeof body !== 'object') return respond({error: 'invalid_request'}, 400);

  if (path === '/login') return login(db, body, request.headers.get('CF-Connecting-IP') || 'unknown');
  if (path === '/hub/match') {
    if (!['quick', 'ranked'].includes(body.kind) || typeof body.host !== 'string' || typeof body.guest !== 'string') {
      return respond({error: 'invalid_request'}, 400);
    }
    const who = token => db.prepare(`SELECT p.id FROM sessions s JOIN players p ON p.id = s.player
      WHERE s.token_hash = ? AND s.expires_at > ?`);
    const [h, g] = await Promise.all([body.host, body.guest].map(async t =>
      /^[a-f0-9]{64}$/.test(t) ? who(t).bind(await sha256(t), Date.now()).first() : null));
    if (!h || !g || h.id === g.id) return respond({error: 'not_logged_in'}, 401);
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO matches (id,kind,host,guest,created_at,ranking_season) VALUES (?,?,?,?,?,?)')
      .bind(id, body.kind, h.id, g.id, Date.now(), body.kind === 'ranked' ? seasonNow : 0).run();
    return respond({id});
  }
  if (path === '/logout') {
    const token = bearer(request);
    if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
    return respond({});
  }

  const me = await sessionPlayer(db, request);
  if (!me) return respond({error: 'not_logged_in'}, 401);
  const id = me.id;

  if (path === '/queue') {
    if (!['quick', 'ranked'].includes(body.kind)) return respond({error: 'invalid_queue_entry'}, 400);
    return respond({match: await matchmake(db, id, body.kind, Date.now())});
  }

  if (path === '/leave') {
    if (body.id == null) {
      await db.prepare('DELETE FROM queue WHERE player = ? AND match_id IS NULL').bind(id).run();
      const assigned = await db.prepare('SELECT match_id AS id FROM queue WHERE player = ?').bind(id).first();
      return respond({id: assigned?.id || null});
    }
    await db.prepare('DELETE FROM queue WHERE player = ? AND match_id = ?').bind(id, body.id).run();
    return respond({});
  }

  if (path === '/drop') {
    const hp = body.hp;
    if (typeof body.id !== 'string' || typeof body.alive !== 'boolean' || !Array.isArray(hp) || hp.length !== 2
      || !hp.every(v => Number.isFinite(v)) || !Number.isFinite(body.el)) return respond({error: 'invalid_request'}, 400);
    const now = Date.now();
    const m = await db.prepare(`SELECT id, kind, host, guest, host_drop, guest_drop, drop_at, outcome, winner, ranking_season
      FROM matches WHERE id = ? AND (host = ? OR guest = ?) AND created_at >= ?`).bind(body.id, id, id, now - MATCH_TTL).first();
    if (!m) return respond({error: 'unknown_match'}, 404);
    const side = m.host === id ? 'host' : 'guest';
    const reply = o => respond({decided: true, outcome: o.outcome, reason: o.reason, me: side, season: m.ranking_season || seasonNow});
    if (m.outcome) return reply(JSON.parse(m.outcome));
    if (m.winner) return reply({outcome: m.winner, reason: 'result'});
    const mine = {alive: body.alive, bye: !!body.bye, auth: !!body.auth, dq: !!body.dq, odq: !!body.odq, hp: hp.map(v => Math.max(0, Math.round(v))), el: Math.round(body.el)};
    const col = side === 'host' ? 'host_drop' : 'guest_drop';
    if (!m[col]) {
      await db.prepare(`UPDATE matches SET ${col} = ?, drop_at = COALESCE(drop_at, ?) WHERE id = ? AND ${col} IS NULL`)
        .bind(JSON.stringify(mine), now, m.id).run();
      m[col] = JSON.stringify(mine);
      m.drop_at = m.drop_at || now;
    }
    const h = m.host_drop && JSON.parse(m.host_drop), g = m.guest_drop && JSON.parse(m.guest_drop);
    const hdq = !!(h?.dq || g?.odq), gdq = !!(g?.dq || h?.odq);
    if (!(h && g) && !h?.bye && !g?.bye && !hdq && !gdq && now - m.drop_at < 5000) return respond({decided: false, me: side});
    let o;
    const any = h || g, view = h?.auth ? h : g?.auth ? g : (h || g);
    if (hdq !== gdq) o = {outcome: hdq ? 'guest' : 'host', reason: 'dq'};
    else if (Math.min(...[h, g].filter(Boolean).map(r => r.el)) < 5000) o = {outcome: 'void', reason: 'early'};
    else if (h?.bye && !g?.bye) o = {outcome: 'host', reason: 'left'};
    else if (g?.bye && !h?.bye) o = {outcome: 'guest', reason: 'left'};
    else if ((h?.alive || false) !== (g?.alive || false)) o = {outcome: h?.alive ? 'host' : 'guest', reason: 'alive'};
    else if (view.hp[0] === view.hp[1]) o = {outcome: 'void', reason: 'tie'};
    else o = {outcome: view.hp[0] > view.hp[1] ? 'host' : 'guest', reason: 'hp'};
    if (!any) o = {outcome: 'void', reason: 'tie'};
    await db.batch([
      db.prepare('UPDATE matches SET outcome = ? WHERE id = ? AND outcome IS NULL').bind(JSON.stringify(o), m.id),
      ...(o.outcome !== 'void' ? [db.prepare('UPDATE matches SET winner = ? WHERE id = ? AND winner IS NULL').bind(o.outcome, m.id)] : [])
    ]);
    const final = await db.prepare('SELECT outcome FROM matches WHERE id = ?').bind(m.id).first();
    return reply(JSON.parse(final.outcome));
  }

  if (path === '/result') {
    if (typeof body.id !== 'string' || !['host', 'guest'].includes(body.winner)) {
      return respond({error: 'invalid_result'}, 400);
    }
    const [submission, confirmation] = await db.batch([
      db.prepare(`UPDATE matches SET
        host_report = CASE WHEN host = ? THEN COALESCE(host_report, ?) ELSE host_report END,
        guest_report = CASE WHEN guest = ? THEN COALESCE(guest_report, ?) ELSE guest_report END
        WHERE id = ? AND kind = 'ranked' AND (host = ? OR guest = ?) AND created_at >= ?
        RETURNING host_report, guest_report, winner`).bind(id, body.winner, id, body.winner, body.id, id, id, Date.now() - MATCH_TTL),
      db.prepare(`UPDATE matches SET winner = host_report
        WHERE id = ? AND (host = ? OR guest = ?) AND kind = 'ranked' AND winner IS NULL
          AND host_report = guest_report AND created_at >= ? RETURNING winner`).bind(body.id, id, id, Date.now() - MATCH_TTL)
    ]);
    const record = submission.results[0];
    if (!record) return respond({error: 'unknown_match'}, 404);
    const confirmed = !!(record.winner || confirmation.results[0]);
    const disputed = !!(record.host_report && record.guest_report && record.host_report !== record.guest_report);
    return respond({confirmed, disputed, season: seasonNow});
  }
  return respond({error: 'not_found'}, 404);
}

const hits = new Map();
function flood(request, path) {
  const now = Date.now();
  const who = (request.headers.get('CF-Connecting-IP') || '') + '|' + (request.headers.get('Authorization') || '').slice(-16) + '|' + path;
  const list = (hits.get(who) || []).filter(t => now - t < 10000);
  list.push(now);
  hits.set(who, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > 10000) hits.delete(k);
  return list.length > 10;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (request.headers.get('Upgrade') !== 'websocket' && request.method !== 'OPTIONS' && flood(request, url.pathname)) {
      return respond({error: 'too_many_requests'}, 429);
    }
    const origin = request.headers.get('Origin');
    const allowed = (env.EXTRA_ORIGINS || '').split(',').filter(Boolean);
    if (origin && origin !== url.origin && !allowed.includes(origin)) return respond({error: 'origin_denied'}, 403);
    const cors = origin && origin !== url.origin ? {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Vary': 'Origin'
    } : {};
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});
    if (url.pathname === '/api/peerjs/id') {
      return new Response('qddup-' + crypto.randomUUID(), {headers: {'Content-Type': 'text/plain', 'Cache-Control': 'no-store', ...cors}});
    }
    if (url.pathname === '/api/peerjs' || url.pathname === '/api/lobby') {
      if (request.headers.get('Upgrade') !== 'websocket') return respond({error: 'websocket_required'}, 426);
      return env.HUB.get(env.HUB.idFromName('main')).fetch(request);
    }
    let response;
    try {
      response = await handle(request, env);
    } catch (error) {
      console.error('Online API failure', error.message);
      response = respond({error: 'service_unavailable'}, 503);
    }
    for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    return response;
  }
};
