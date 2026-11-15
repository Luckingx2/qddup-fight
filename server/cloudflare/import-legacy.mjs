// 이전 랭킹 DB(qddup-fight)의 시즌 점수를 새 DB(qddup-battle)의 legacy_scores 로 옮긴다.
// 전환 직전에 다시 실행해도 된다: 아직 계정에 연결되지 않은 기록만 최신 점수로 갱신한다.
//   node import-legacy.mjs            원격 DB에서 읽어 원격 DB에 쓴다
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';

const OLD_DB = 'qddup-fight', NEW_DB = 'qddup-battle';
const OLD_CONFIG = '../../../qddup-busan/online/wrangler.jsonc';
const wrangler = args => execFileSync('wrangler', args, {encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024});
const quote = text => "'" + String(text).replace(/'/g, "''") + "'";

const read = JSON.parse(wrangler(['d1', 'execute', OLD_DB, '--remote', '--json', '--config', OLD_CONFIG, '--command',
  '"SELECT p.id, p.nickname, s.season, s.points, s.wins, s.losses FROM ranking_scores s JOIN players p ON p.id = s.player_id ORDER BY s.season, p.id"']));
const rows = read[0].results;
if (!rows.length) throw new Error('이전 DB에서 읽은 랭킹 기록이 없습니다.');
for (const row of rows) {
  if (!/^[a-f0-9]{64}$/.test(row.id)) throw new Error('식별값 해시 형식이 아닌 id: ' + row.id);
  for (const key of ['season', 'points', 'wins', 'losses']) {
    if (!Number.isInteger(row[key])) throw new Error(`${row.id} 의 ${key} 값이 정수가 아닙니다.`);
  }
}

const sql = rows.map(row => `INSERT INTO legacy_scores (id, nickname, season, points, wins, losses) VALUES (${quote(row.id)}, ${quote(row.nickname)}, ${row.season}, ${row.points}, ${row.wins}, ${row.losses})
  ON CONFLICT(id) DO UPDATE SET nickname = excluded.nickname, points = excluded.points, wins = excluded.wins, losses = excluded.losses
  WHERE legacy_scores.claimed_by IS NULL;`).join('\n') + '\n';
writeFileSync('legacy-import.sql', sql);
wrangler(['d1', 'execute', NEW_DB, '--remote', '--yes', '--file', 'legacy-import.sql']);

const check = JSON.parse(wrangler(['d1', 'execute', NEW_DB, '--remote', '--json', '--command',
  '"SELECT COUNT(*) AS n, SUM(points) AS points, SUM(wins) AS wins, SUM(losses) AS losses, SUM(claimed_by IS NOT NULL) AS claimed FROM legacy_scores"']))[0].results[0];
const sum = key => rows.reduce((total, row) => total + row[key], 0);
console.log(`이전 DB: ${rows.length}명, 점수 ${sum('points')}, 승 ${sum('wins')}, 패 ${sum('losses')}`);
console.log(`새 DB:   ${check.n}명, 점수 ${check.points}, 승 ${check.wins}, 패 ${check.losses} (계정 연결됨 ${check.claimed}명)`);
