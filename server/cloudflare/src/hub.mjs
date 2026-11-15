import {DurableObject} from 'cloudflare:workers';

export const season = env => Math.max(1, Number(env.RANKING_SEASON) || 1);
const enc = new TextEncoder();
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async text => hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
const RELAY = new Set(['OFFER', 'ANSWER', 'CANDIDATE', 'LEAVE', 'EXPIRE']);

function send(ws, data) {
  try { ws.send(typeof data === 'string' ? data : JSON.stringify(data)); return true; } catch { return false; }
}

export class Hub extends DurableObject {
  pending = new Map();
  seen = new Map();

  online(player) {
    const now = Date.now();
    if (player) this.seen.set(player, now);
    for (const ws of this.ctx.getWebSockets('lobby')) {
      const a = ws.deserializeAttachment();
      if (a?.player) this.seen.set(a.player, now);
    }
    for (const [k, t] of this.seen) if (now - t > 300000) this.seen.delete(k);
    return this.seen.size;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/presence') {
      const w = url.searchParams.get('w') || '', now = Date.now();
      this.asks = this.asks || new Map();
      const list = (this.asks.get(w) || []).filter(t => now - t < 10000);
      list.push(now);
      this.asks.set(w, list);
      if (this.asks.size > 2000) for (const [k, v] of this.asks) if (now - v[v.length - 1] > 10000) this.asks.delete(k);
      if (list.length > 10) return new Response('{"error":"too_many_requests"}', {status: 429});
      return Response.json({online: this.online(url.searchParams.get('p') || '')});
    }
    const [client, server] = Object.values(new WebSocketPair());
    if (url.pathname === '/api/peerjs') {
      const id = url.searchParams.get('id') || '';
      const token = url.searchParams.get('token') || '';
      this.ctx.acceptWebSocket(server, ['p:' + id]);
      server.serializeAttachment({k: 'p', id, token});
      if (!/^[\w-]{1,100}$/.test(id)) {
        send(server, {type: 'ERROR', payload: {msg: 'invalid id'}});
        server.close(1008, 'invalid id');
      } else {
        let taken = false;
        for (const ws of this.ctx.getWebSockets('p:' + id)) {
          if (ws === server) continue;
          const a = ws.deserializeAttachment();
          if (a?.token === token) { try { ws.close(1000, 'replaced'); } catch {} }
          else if (ws.readyState === WebSocket.OPEN) taken = true;
        }
        if (taken) {
          send(server, {type: 'ID-TAKEN', payload: {msg: 'ID is taken'}});
          server.close(1008, 'id taken');
        } else send(server, {type: 'OPEN'});
      }
      return new Response(null, {status: 101, webSocket: client});
    }
    this.ctx.acceptWebSocket(server, ['lobby']);
    server.serializeAttachment({k: 'l'});
    return new Response(null, {status: 101, webSocket: client});
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > 20000) return;
    let m;
    try { m = JSON.parse(raw); } catch { return; }
    let a = ws.deserializeAttachment() || {};
    if (a.k === 'p') return this.relay(ws, a, m);
    if (a.k !== 'l') return;
    if (m.t === 'auth') {
      const job = this.auth(ws, m);
      this.pending.set(ws, job);
      try { await job; } finally { if (this.pending.get(ws) === job) this.pending.delete(ws); }
      return;
    }
    if (this.pending.has(ws)) {
      await this.pending.get(ws);
      a = ws.deserializeAttachment() || {};
    }
    return this.lobby(ws, a, m);
  }

  relay(ws, a, m) {
    if (!m || !RELAY.has(m.type) || typeof m.dst !== 'string') return;
    const targets = this.ctx.getWebSockets('p:' + m.dst).filter(t => t.readyState === WebSocket.OPEN);
    const target = targets.at(-1);
    if (!target) {
      if (m.type === 'OFFER') send(ws, {type: 'EXPIRE', src: m.dst, dst: a.id});
      return;
    }
    send(target, {type: m.type, src: a.id, dst: m.dst, payload: m.payload});
  }

  async auth(ws, m) {
    if (typeof m.token !== 'string' || !/^[a-f0-9]{64}$/.test(m.token)) return this.reject(ws);
    const me = await this.env.DB.prepare(`SELECT p.id, p.nickname, COALESCE(r.points, 1000) AS points FROM sessions s
      JOIN players p ON p.id = s.player
      LEFT JOIN ranking_scores r ON r.player_id = p.id AND r.season = ?
      WHERE s.token_hash = ? AND s.expires_at > ?`)
      .bind(season(this.env), await sha256(m.token), Date.now()).first();
    if (!me) return this.reject(ws);
    ws.serializeAttachment({k: 'l', player: me.id, nick: me.nickname, points: me.points, q: null});
    send(ws, {t: 'ok'});
  }

  async lobby(ws, a, m) {
    if (!a.player) return this.reject(ws);
    if (m.t === 'queue' && (m.kind === 'quick' || m.kind === 'ranked')) {
      for (const other of this.ctx.getWebSockets('lobby')) {
        if (other !== ws && other.deserializeAttachment()?.player === a.player) {
          try { other.close(1000, 'replaced'); } catch {}
        }
      }
      ws.serializeAttachment({...a, q: {kind: m.kind, at: Date.now()}});
      await this.tryMatch();
      return;
    }
    if (m.t === 'cancel') ws.serializeAttachment({...a, q: null});
  }

  reject(ws) {
    send(ws, {t: 'err', code: 'not_logged_in'});
    try { ws.close(1008, 'not logged in'); } catch {}
  }

  async tryMatch() {
    const now = Date.now();
    const waiting = this.ctx.getWebSockets('lobby')
      .filter(ws => ws.readyState === WebSocket.OPEN)
      .map(ws => ({ws, a: ws.deserializeAttachment()}))
      .filter(x => x.a?.q)
      .sort((x, y) => x.a.q.at - y.a.q.at);
    const rankedPlayers = new Set(waiting.filter(x => x.a.q.kind === 'ranked').map(x => x.a.player)).size;
    const used = new Set();
    const pairs = [];
    for (let i = 0; i < waiting.length; i++) {
      if (used.has(i)) continue;
      const x = waiting[i];
      for (let j = i + 1; j < waiting.length; j++) {
        if (used.has(j)) continue;
        const y = waiting[j];
        if (y.a.q.kind !== x.a.q.kind || y.a.player === x.a.player) continue;
        if (x.a.q.kind === 'ranked') {
          const allowed = 150 + Math.floor((now - x.a.q.at) / 10000) * 100;
          const alone = rankedPlayers === 2 && now - y.a.q.at >= 2500;
          if (!alone && Math.abs(x.a.points - y.a.points) > allowed) continue;
        }
        used.add(i); used.add(j); pairs.push([x, y]);
        break;
      }
    }
    for (const [x, y] of pairs) {
      x.ws.serializeAttachment({...x.a, q: null});
      y.ws.serializeAttachment({...y.a, q: null});
    }
    for (const [x, y] of pairs) {
      const id = crypto.randomUUID();
      const kind = x.a.q.kind;
      try {
        await this.env.DB.prepare('INSERT INTO matches (id,kind,host,guest,created_at,ranking_season) VALUES (?,?,?,?,?,?)')
          .bind(id, kind, x.a.player, y.a.player, now, kind === 'ranked' ? season(this.env) : 0).run();
      } catch {
        send(x.ws, {t: 'err', code: 'server_error'});
        send(y.ws, {t: 'err', code: 'server_error'});
        continue;
      }
      send(x.ws, {t: 'match', match: {id, kind, host: true, opponent: y.a.nick}});
      send(y.ws, {t: 'match', match: {id, kind, host: false, opponent: x.a.nick}});
    }
    const rankedLeft = waiting.some((x, i) => !used.has(i) && x.a.q.kind === 'ranked');
    if (rankedLeft && !(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + 1000);
  }

  async alarm() {
    await this.tryMatch();
  }

  async webSocketClose(ws, code) {
    this.pending.delete(ws);
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch {}
  }

  async webSocketError(ws) {
    try { ws.close(1011, 'error'); } catch {}
  }
}
