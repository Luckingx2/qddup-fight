import hashlib, html, os, re

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
DATA = open(os.path.join(ROOT, 'js', 'data.js'), encoding='utf-8').read()

FAMILIES = [
    ('Q', '드러머. 가까이 붙어 주먹과 킥으로 밀어붙이는 계열', ['Q', 'Qb', 'Qc']),
    ('W', '베이시스트. 빠른 발과 긴 사거리로 거리를 조절하는 계열', ['W', 'Wb', 'Wc']),
    ('E', '불주먹. 느리지만 한 방과 연타가 강한 계열', ['E', 'Eb', 'Ec']),
    ('R', '보컬. 높은 점프와 가드를 뚫는 잡기를 가진 계열', ['R', 'Rb', 'Rd', 'Rc']),
]
SPECIALS = {
    'Q': ('불꽃 복싱 3연타', '앞으로 파고들어 불꽃 주먹을 세 번 이어 칩니다. 첫 타가 닿아야 다음 타로 이어지고, 마지막 타는 상대를 띄워 날립니다.', '근접 연타'),
    'Qb': ('드럼롤', '제자리에서 음파를 쏩니다. 발동 뒤에 공격 버튼을 연타한 만큼 음파가 더 나갑니다.', '원거리 · 연타'),
    'Qc': ('페인트 웅덩이', '앞쪽 바닥에 페인트 웅덩이를 깝니다. 웅덩이를 밟은 상대는 미끄러지고 가드를 하지 못합니다.', '지상 제어'),
    'W': ('하트 돌진', '하트를 흩날리며 빠르게 돌진합니다. 맞은 상대는 오래 경직됩니다.', '돌진'),
    'Wb': ('저음 지진', '앞쪽 바닥에 예고 원이 생긴 뒤 보라색 충격파가 솟아 지상의 상대를 띄웁니다. 너무 가깝거나 멀면 맞지 않습니다.', '중거리 · 지상'),
    'Wc': ('페인트 롤러 돌진', '롤러를 밀며 화면의 절반 가까이 돌진합니다. 상대를 벽까지 밀어붙이면 큰 피해를, 벽에 닿지 못하면 작은 피해를 줍니다. 점프로 피할 수 있습니다.', '돌진'),
    'E': ('보랏빛 고양이 3연격', '보랏빛 궤적을 그리며 세 번 이어 칩니다. 첫 타가 닿아야 다음 타로 이어지고, 마지막 타는 상대를 높이 띄웁니다.', '근접 연타'),
    'Eb': ('청염 어퍼컷', '파란 불꽃 주먹으로 올려쳐 상대를 높이 띄웁니다.', '근접 · 띄우기'),
    'Ec': ('홍염 더블 펀치', '붉은 불꽃 주먹을 두 번 뻗습니다. 첫 펀치가 맞아야 두 번째 펀치가 이어집니다.', '근접 연타'),
    'R': ('도넛 난사', '제자리에서 도넛을 일곱 개 연달아 던집니다. 마지막 도넛이 가장 큽니다.', '원거리 연사'),
    'Rb': ('고음 샤우팅', '분홍 음파를 내질러 상대를 화면 끝까지 날립니다. 가드를 무시합니다.', '가드 무시'),
    'Rd': ('통굽 내려찍기', '높이 뛰어올라 상대 위로 떨어집니다. 착지 충격은 가드할 수 없습니다.', '공중 강습 · 가드 불가'),
    'Rc': ('뿌앵 울기', '눈물이 차오르는 동안 가까운 상대를 여러 번 때리고 자신의 체력을 조금씩 회복합니다.', '회복'),
}
STATS = [('hp', '체력'), ('speed', '이동'), ('jump', '점프'), ('pd', '펀치'), ('kd', '킥'), ('reach', '사거리')]


def parse():
    block = DATA[DATA.index('const CH={'):]
    block = block[:block.index('\n};')]
    out = {}
    for m in re.finditer(r"^ (\w+):\{(.*)\},?$", block, re.M):
        fields = {}
        for k, v in re.findall(r"(\w+):('(?:[^'\\]|\\.)*'|[-\d.]+)", m.group(2)):
            fields[k] = v[1:-1] if v.startswith("'") else float(v)
        out[m.group(1)] = fields
    tag = dict(re.findall(r"(\w+):'(\w+)'", re.search(r"const TAG=\{([^}]*)\}", DATA).group(1)))
    return out, tag


def asset(path):
    data = open(os.path.join(ROOT, path), 'rb').read()
    return path + '?v=' + hashlib.sha1(data).hexdigest()[:8]


def num(v):
    return str(int(v)) if float(v).is_integer() else str(v)


def card(key, ch, tag, lo, hi):
    name, desc, kind = SPECIALS[key]
    bars = []
    for field, label in STATS:
        span = hi[field] - lo[field]
        pct = 100 if not span else round(34 + 66 * (ch[field] - lo[field]) / span)
        shown = ('+' if field == 'reach' else '') + num(ch[field])
        bars.append(f'<div class="stat"><span>{label}</span><div class="bar"><i style="width:{pct}%"></i></div><b>{shown}</b></div>')
    speed = round(100 / ch['timing'])
    guard = round(ch['guard'] * 100)
    extra = [f'<li><span>공격 속도</span><b>{speed}%</b></li>', f'<li><span>가드 중 받는 피해</span><b>{guard}%</b></li>', f'<li><span>필살기 피해</span><b>{round(ch["special"] * 100)}%</b></li>']
    if ch.get('lunge'):
        extra.append('<li><span>공중 기동</span><b>특화</b></li>')
    partner = tag.get(key)
    notes = [f'<p class="tagline"><b>태그기</b> {html.escape(ch_all[partner]["name"])}와 함께 · 게이지 100%, 라운드당 1회</p>'] if partner else []
    if key in ('R', 'Rb', 'Rd', 'Rc'):
        notes.append('<p class="tagline"><b>잡아 던지기</b> G 키 / 잡기 버튼 · 가까운 지상의 상대에게 피해 4, 가드 통과</p>')
    return f'''<article class="fighter" id="{key}" style="--c:{ch['col']}">
  <div class="portrait"><img src="{asset('assets/ui/roster/' + key + '.webp')}" alt="{html.escape(ch['name'])}" loading="lazy"></div>
  <div class="info">
    <header><h3>{html.escape(ch['name'])}</h3><span class="role">{html.escape(ch['role'])}</span></header>
    <p class="trade">{html.escape(ch['tradeoff'])}</p>
    <div class="stats">{''.join(bars)}</div>
    <ul class="extra">{''.join(extra)}</ul>
    <section class="special"><span class="kind">{kind}</span><h4>필살기 · {html.escape(name)}</h4><p>{html.escape(desc)}</p></section>
    {''.join(notes)}
  </div>
</article>'''


ch_all, tag_all = parse()
keys = [k for _, _, ks in FAMILIES for k in ks]
lo = {f: min(ch_all[k][f] for k in keys) for f, _ in STATS}
hi = {f: max(ch_all[k][f] for k in keys) for f, _ in STATS}
sections = []
for fam, blurb, ks in FAMILIES:
    cards = '\n'.join(card(k, ch_all[k], tag_all, lo, hi) for k in ks)
    sections.append(f'<section class="family" id="family-{fam}"><div class="famhead"><h2>{fam} 계열</h2><p>{blurb}</p></div>\n{cards}\n</section>')
nav = ''.join(f'<a href="#family-{fam}">{fam}</a>' for fam, _, _ in FAMILIES)

PAGE = f'''<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>큐떱부산 캐릭터 소개</title>
<meta property="og:title" content="큐떱부산 캐릭터 소개">
<meta property="og:description" content="13명의 특성과 필살기">
<style>
@font-face{{font-family:'Pretendard';src:url({asset('assets/fonts/Pretendard-ExtraBold.woff2')}) format('woff2');font-weight:100 900;font-display:swap}}
@font-face{{font-family:'IBM Plex Sans KR';src:url({asset('assets/fonts/IBMPlexSansKR-Regular.woff2')}) format('woff2');font-weight:400;font-display:swap}}
@font-face{{font-family:'IBM Plex Sans KR';src:url({asset('assets/fonts/IBMPlexSansKR-SemiBold.woff2')}) format('woff2');font-weight:600 700;font-display:swap}}
@font-face{{font-family:'Bungee';src:url({asset('assets/fonts/Bungee.woff2')}) format('woff2');font-display:swap}}
:root{{--ink:#07060f;--pan:#15132e;--pan2:#1d1a3d;--line:#34305f;--txt:#f1f0ff;--dim:#a6a3cf;--holo:linear-gradient(100deg,#8ef6ff,#c9a6ff 35%,#ffb3e1 60%,#fff3b0 85%,#8ef6ff)}}
*{{box-sizing:border-box}}
html{{scroll-behavior:smooth}}
body{{margin:0;background:radial-gradient(120% 60% at 50% 0%,#1b1840,var(--ink) 70%) fixed,var(--ink);color:var(--txt);font-family:'IBM Plex Sans KR',system-ui,sans-serif;line-height:1.6}}
.wrap{{max-width:1080px;margin:0 auto;padding:0 16px 80px}}
.top{{padding:44px 0 18px;text-align:center}}
.top h1{{margin:0;font-family:'Pretendard',sans-serif;font-weight:800;font-size:clamp(34px,8vw,64px);line-height:1.05;background:var(--holo);-webkit-background-clip:text;background-clip:text;color:transparent}}
.top p{{margin:10px auto 0;max-width:36em;color:var(--dim);font-size:15px}}
.play{{display:inline-block;margin-top:18px;padding:11px 28px;border-radius:999px;background:var(--holo);color:#15132e;font-family:'Pretendard',sans-serif;font-weight:800;text-decoration:none;box-shadow:0 5px 0 #6b5fb0}}
nav{{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:8px;padding:10px 0;margin:14px -16px 0;background:rgba(7,6,15,.86);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}}
nav a{{min-width:52px;padding:7px 14px;border-radius:999px;border:1px solid var(--line);color:var(--txt);text-decoration:none;text-align:center;font-family:'Bungee',sans-serif;font-size:15px}}
nav a:hover{{border-color:#c9a6ff}}
.rules{{margin:26px 0 0;padding:18px 20px;border:1px solid var(--line);border-radius:16px;background:var(--pan)}}
.rules h2{{margin:0 0 8px;font-family:'Pretendard',sans-serif;font-size:18px}}
.rules ul{{margin:0;padding-left:1.1em;color:var(--dim);font-size:14px}}
.rules li+li{{margin-top:3px}}
.rules b{{color:var(--txt);font-weight:600}}
.family{{margin-top:44px;scroll-margin-top:64px}}
.famhead{{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;margin-bottom:14px}}
.famhead h2{{margin:0;font-family:'Pretendard',sans-serif;font-weight:800;font-size:28px}}
.famhead p{{margin:0;color:var(--dim);font-size:14px}}
.fighter{{display:grid;grid-template-columns:200px minmax(0,1fr);gap:20px;margin-top:14px;padding:18px;border:1px solid var(--line);border-left:4px solid var(--c);border-radius:18px;background:linear-gradient(120deg,var(--pan2),var(--pan));scroll-margin-top:64px}}
.portrait{{align-self:stretch;display:grid;place-items:end center;min-height:240px;border-radius:14px;background:radial-gradient(80% 70% at 50% 45%,color-mix(in srgb,var(--c) 34%,transparent),transparent 72%)}}
.portrait img{{display:block;max-width:100%;max-height:300px;filter:drop-shadow(0 8px 14px rgba(0,0,0,.5))}}
.info header{{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 12px}}
.info h3{{margin:0;font-family:'Bungee',sans-serif;font-weight:400;font-size:34px;line-height:1;color:var(--c)}}
.role{{padding:3px 10px;border-radius:999px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);font-size:13px;font-weight:600}}
.trade{{margin:8px 0 12px;color:var(--dim);font-size:14px}}
.stats{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 18px}}
.stat{{display:grid;grid-template-columns:3.2em minmax(0,1fr) 2.6em;align-items:center;gap:8px;font-size:13px}}
.stat span{{color:var(--dim)}}
.stat b{{text-align:right;font-weight:600;font-variant-numeric:tabular-nums}}
.bar{{height:8px;border-radius:999px;background:#0e0c22;overflow:hidden}}
.bar i{{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,color-mix(in srgb,var(--c) 55%,#fff 0%),var(--c))}}
.extra{{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 0;padding:0;list-style:none;font-size:12.5px}}
.extra li{{display:flex;gap:6px;padding:3px 10px;border-radius:8px;background:#0e0c22;color:var(--dim)}}
.extra b{{color:var(--txt);font-weight:600}}
.special{{position:relative;margin-top:14px;padding:13px 15px;border-radius:12px;background:color-mix(in srgb,var(--c) 13%,#0e0c22);border:1px solid color-mix(in srgb,var(--c) 38%,transparent)}}
.special h4{{margin:0 0 4px;font-family:'Pretendard',sans-serif;font-weight:800;font-size:16.5px}}
.special p{{margin:0;font-size:14px}}
.kind{{float:right;margin:0 0 4px 10px;padding:2px 8px;border-radius:999px;background:var(--c);color:#15132e;font-size:11.5px;font-weight:700}}
.tagline{{margin:8px 0 0;font-size:13px;color:var(--dim)}}
.tagline b{{color:var(--txt);font-weight:600;margin-right:4px}}
footer{{margin-top:48px;text-align:center;color:var(--dim);font-size:13px}}
@media (max-width:640px){{
  .fighter{{grid-template-columns:1fr;gap:12px;padding:14px}}
  .portrait{{min-height:0;place-items:center}}
  .portrait img{{max-height:210px}}
  .stats{{grid-template-columns:1fr}}
  .info h3{{font-size:30px}}
}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <h1>큐떱부산<br>캐릭터 소개</h1>
    <p>Q·W·E·R 네 계열, 13명의 특성과 필살기입니다. 수치는 게임에 들어 있는 값 그대로입니다.</p>
    <a class="play" href="./">게임 하러 가기</a>
  </div>
  <nav aria-label="계열 바로가기">{nav}</nav>
  <section class="rules">
    <h2>공통 규칙</h2>
    <ul>
      <li><b>필살기</b> 게이지가 100%일 때 필살 버튼(C 또는 L). 캐릭터마다 한 가지로 정해져 있습니다.</li>
      <li><b>태그기</b> 게이지가 100%일 때 태그 버튼(V 또는 ;). 짝꿍이 함께 나오며 라운드당 한 번만 쓸 수 있습니다.</li>
      <li><b>앉기</b> 아래 방향. 앉아 있으면 상대가 서서 치는 주먹과 킥이 빗나갑니다. 앉아 공격, 점프 공격, 필살기는 맞습니다.</li>
      <li><b>하단 킥</b> 앉은 채 킥. 맞은 상대는 넘어집니다. 피해는 일반 킥의 80%입니다.</li>
      <li><b>가드</b> 상대 반대 방향으로 이동 키를 누릅니다.</li>
      <li><b>수치 읽는 법</b> 사거리는 기본기 사거리에 더해지는 값, 공격 속도는 높을수록 기본기가 빠르고, 가드 중 받는 피해는 낮을수록 가드가 단단합니다.</li>
    </ul>
  </section>
{chr(10).join(sections)}
  <footer>큐떱부산 · 수치는 밸런스 조정에 따라 바뀔 수 있습니다.</footer>
</div>
</body>
</html>
'''
open(os.path.join(ROOT, 'characters.html'), 'w', encoding='utf-8', newline='\n').write(PAGE)
print('characters.html', len(PAGE), 'bytes,', len(keys), 'fighters')
