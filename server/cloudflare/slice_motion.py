import json, os, sys
from PIL import Image
from slice_crouch import ART, ALPHA_CUT, clean, columns, foot_x


HALO_CUT = int(os.environ.get('HALO_CUT', '100'))


def split(sheet, count):
    cols = columns(sheet.getchannel('A'))
    runs, start = [], None
    for x, n in enumerate(cols + [0]):
        if n and start is None:
            start = x
        elif not n and start is not None:
            runs.append([start, x])
            start = None
    runs = [r for r in runs if r[1] - r[0] > sheet.width * .02]
    while len(runs) > count:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = gaps.index(min(gaps))
        runs[i:i + 2] = [[runs[i][0], runs[i + 1][1]]]
    if len(runs) != count:
        raise SystemExit(f'expected {count} poses, found {len(runs)}: {runs}')
    return [sheet.crop((a, 0, b, sheet.height)) for a, b in runs]


def head_width(im, top):
    alpha = im.getchannel('A')
    w, h = alpha.size
    px = alpha.load()
    return max(sum(1 for x in range(w) if px[x, y] > ALPHA_CUT) for y in range(int(h * top)))


def main(ch, sheet_path, names, scale_arg):
    sheet = Image.open(sheet_path).convert('RGBA')
    r, g, b, a = sheet.split()
    sheet = Image.merge('RGBA', (r, g, b, a.point(lambda v: 0 if v < HALO_CUT else v)))
    full = sheet.getbbox()
    poses = split(sheet.crop((0, full[1], sheet.width, full[3])), len(names))
    boxes = [p.getbbox() for p in poses]
    base = max(b[3] for b in boxes)
    folder = os.path.join(ART, ch)
    idle = Image.open(os.path.join(folder, 'idle.png')).convert('RGBA')
    if scale_arg == 'stand':
        scale = idle.height / clean(poses[-1]).height
    elif scale_arg == 'auto':
        firsts = [clean(p) for p in poses]
        scale = head_width(idle, .35) / max(head_width(p, .35) for p in firsts)
    else:
        scale = float(scale_arg)
    anchors_path = os.path.join(folder, 'anchors.json')
    anchors = json.load(open(anchors_path, encoding='utf-8'))
    for name, pose, box in zip(names, poses, boxes):
        cut = pose.crop((box[0], box[1], box[2], base))
        r, g, b, a = cut.split()
        cut = Image.merge('RGBA', (r, g, b, a.point(lambda v: 0 if v < ALPHA_CUT else v)))
        small = cut.resize((round(cut.width * scale), round(cut.height * scale)), Image.LANCZOS)
        small.save(os.path.join(folder, name + '.png'))
        anchors[name] = round(foot_x(small), 1)
        print(ch, name, small.size, 'anchor', anchors[name], 'scale', round(scale, 3))
    json.dump(anchors, open(anchors_path, 'w', encoding='utf-8', newline='\n'), indent=1)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4] if len(sys.argv) > 4 else 'auto')
