import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(ROOT, '..', '..', 'art', 'characters')
NAMES = ['crouch', 'cpunch', 'ckick']
ALPHA_CUT = 40
OFFSET = {'crouch': -2, 'cpunch': -9.5, 'ckick': -22}


def columns(alpha):
    w, h = alpha.size
    px = alpha.load()
    return [sum(1 for y in range(h) if px[x, y] > ALPHA_CUT) for x in range(w)]


def split(sheet):
    cols = columns(sheet.getchannel('A'))
    runs, start = [], None
    for x, n in enumerate(cols + [0]):
        if n and start is None:
            start = x
        elif not n and start is not None:
            runs.append([start, x])
            start = None
    merged = []
    for run in runs:
        if merged and run[0] - merged[-1][1] < sheet.width * .02:
            merged[-1][1] = run[1]
        else:
            merged.append(run)
    merged = [r for r in merged if r[1] - r[0] > sheet.width * .05]
    if len(merged) != 3:
        raise SystemExit(f'expected 3 poses, found {len(merged)}: {merged}')
    return [sheet.crop((a, 0, b, sheet.height)) for a, b in merged]


def clean(im):
    r, g, b, a = im.split()
    a = a.point(lambda v: 0 if v < ALPHA_CUT else v)
    im = Image.merge('RGBA', (r, g, b, a))
    return im.crop(im.getbbox())


def foot_x(im):
    cols = columns(im.getchannel('A'))
    tall = max(cols) * .62
    xs = [x for x, n in enumerate(cols) if n >= tall]
    return (xs[0] + xs[-1]) / 2


def main(ch, sheet_path, crouch_height):
    poses = [clean(p) for p in split(Image.open(sheet_path).convert('RGBA'))]
    scale = crouch_height / poses[0].height
    folder = os.path.join(ART, ch)
    anchors_path = os.path.join(folder, 'anchors.json')
    anchors = json.load(open(anchors_path, encoding='utf-8'))
    for name, pose in zip(NAMES, poses):
        small = pose.resize((round(pose.width * scale), round(pose.height * scale)), Image.LANCZOS)
        small.save(os.path.join(folder, name + '.png'))
        anchors[name] = round(foot_x(small) + OFFSET[name], 1)
        print(ch, name, small.size, 'anchor', anchors[name])
    json.dump(anchors, open(anchors_path, 'w', encoding='utf-8', newline='
'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]))
