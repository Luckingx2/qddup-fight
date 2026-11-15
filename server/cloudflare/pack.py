import hashlib, json, os, re, sys
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'art', 'characters')
OUT = os.path.join(ROOT, 'assets', 'characters')
DATA = os.path.join(ROOT, 'js', 'data.js')
STATE = os.path.join(ROOT, 'art', '.packed.json')
WIDTH, PAD, SCALE, QUALITY = 2040, 2, .75, 86


def folder_hash(ch):
    h = hashlib.sha1()
    d = os.path.join(ART, ch)
    for f in sorted(os.listdir(d)):
        h.update(f.encode())
        with open(os.path.join(d, f), 'rb') as fh:
            h.update(fh.read())
    return h.hexdigest()


def pack(ch):
    d = os.path.join(ART, ch)
    anchors = json.load(open(os.path.join(d, 'anchors.json'), encoding='utf-8'))
    names = list(anchors) + sorted(f[:-4] for f in os.listdir(d) if f.endswith('.png') and f[:-4] not in anchors)
    imgs = {n: Image.open(os.path.join(d, n + '.png')).convert('RGBA') for n in names}
    frames, x, y, row = {}, PAD, PAD, 0
    for n in names:
        w, h = imgs[n].size
        if x + w + PAD > WIDTH:
            x, y, row = PAD, y + row + PAD, 0
        ax = anchors.get(n, w / 2)
        frames[n] = [x, y, w, h, round(float(ax), 1)]
        x += w + PAD
        row = max(row, h)
    sheet = Image.new('RGBA', (WIDTH, y + row + PAD), (0, 0, 0, 0))
    for n in names:
        fx, fy = frames[n][:2]
        sheet.paste(imgs[n], (fx, fy))
    small = sheet.resize((round(sheet.width * SCALE), round(sheet.height * SCALE)), Image.LANCZOS)
    small.save(os.path.join(OUT, ch + '.webp'), 'WEBP', quality=QUALITY, method=6, alpha_quality=90)
    return frames


def write_meta(updates):
    src = open(DATA, encoding='utf-8', newline='').read().replace('
', '
')
    m = re.search(r'const META=(\{.*?\});\n', src, re.S)
    meta = json.loads(m.group(1))
    for ch, frames in updates.items():
        meta.setdefault(ch, {})['frames'] = frames
    src = src[:m.start(1)] + json.dumps(meta, separators=(',', ':'), ensure_ascii=False) + src[m.end(1):]
    open(DATA, 'w', encoding='utf-8', newline='
').write(src)


def main():
    state = json.load(open(STATE)) if os.path.exists(STATE) else {}
    chars = sorted(c for c in os.listdir(ART) if os.path.isdir(os.path.join(ART, c)))
    force = sys.argv[1:]
    todo = [c for c in chars if (c in force) or (not force and state.get(c) != folder_hash(c))]
    updates = {}
    for ch in todo:
        updates[ch] = pack(ch)
        state[ch] = folder_hash(ch)
        print('packed', ch, len(updates[ch]), 'frames', os.path.getsize(os.path.join(OUT, ch + '.webp')) // 1024, 'KB')
    if updates:
        write_meta(updates)
        json.dump(state, open(STATE, 'w', newline='
'), indent=1)
    else:
        print('sheets up to date')


if __name__ == '__main__':
    main()
