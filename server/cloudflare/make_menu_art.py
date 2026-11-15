import json, os
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'art', 'characters')
OUT = os.path.join(ROOT, 'assets', 'ui', 'menu')
W, H, AX, SCALE = 460, 500, 200, .75
SEQUENCE = [('idle', 520), ('walk1', 140), ('idle', 140), ('walk2', 140), ('idle', 260), ('punch', 210), ('idle', 170), ('kick', 250), ('idle', 220),
            ('fin0', 420), ('idle', 300), ('win1', 220), ('win2', 220), ('win3', 220), ('win', 900)]


def build(ch):
    folder = os.path.join(ART, ch)
    anchors = json.load(open(os.path.join(folder, 'anchors.json'), encoding='utf-8'))
    frames, durations = [], []
    for name, ms in SEQUENCE:
        path = os.path.join(folder, name + '.png')
        if not os.path.exists(path):
            continue
        pose = Image.open(path).convert('RGBA')
        canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        canvas.paste(pose, (round(AX - anchors.get(name, pose.width / 2)), H - pose.height), pose)
        frames.append(canvas.resize((round(W * SCALE), round(H * SCALE)), Image.LANCZOS))
        durations.append(ms)
    os.makedirs(OUT, exist_ok=True)
    target = os.path.join(OUT, ch + '.webp')
    frames[0].save(target, save_all=True, append_images=frames[1:], duration=durations, loop=0, quality=80, method=6, minimize_size=True)
    print(ch, len(frames), 'frames', os.path.getsize(target) // 1024, 'KB')


for ch in ['Q', 'W', 'E', 'R']:
    build(ch)
