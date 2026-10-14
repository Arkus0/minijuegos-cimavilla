"""Renderiza maps/gate.tmj a PNG sin Phaser (montaje de referencia) y, con --plano, el plano anotado
de la microcalle: tipos de vista coloreados, solares rotulados y regla de bandas.

Uso: python3 tools/render-plan.py [--plano] [--out ruta.png]
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(ROOT, 'maps', 'gate.tmj')
m = json.load(open(MAP))
T = m['tilewidth']
W, H = m['width'] * T, m['height'] * T
FLIPS = 0xE0000000


def load(rel):
    return Image.open(os.path.normpath(os.path.join(os.path.dirname(MAP), rel))).convert('RGBA')


tiles = {}
for ts in m['tilesets']:
    if 'image' in ts:
        im = load(ts['image'])
        for i in range(ts['tilecount']):
            c = ts['columns']
            tiles[ts['firstgid'] + i] = im.crop(((i % c) * T, (i // c) * T, (i % c + 1) * T, (i // c + 1) * T))
    for t in ts.get('tiles', []):
        tiles[ts['firstgid'] + t['id']] = load(t['image'])

canvas = Image.new('RGBA', (W, H), (18, 16, 20, 255))
layers = {l['name']: l for l in m['layers']}


def draw_tiles(name):
    l = layers[name]
    for i, g in enumerate(l['data']):
        if g:
            canvas.alpha_composite(tiles[g & ~FLIPS], ((i % m['width']) * T, (i // m['width']) * T))


def draw_objects(name):
    objs = sorted(layers[name]['objects'], key=lambda o: next((p['value'] for p in o.get('properties', []) if p['name'] == 'sortY'), o['y']))
    for o in objs:
        im = tiles[o['gid'] & ~FLIPS]
        if o['gid'] & 0x80000000:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        canvas.alpha_composite(im, (int(o['x']), int(o['y']) - im.height))


for n in ['ground', 'ground-detail', 'roofs-back']:
    draw_tiles(n)
draw_objects('walls')
draw_objects('props')
draw_tiles('overhead')

out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(ROOT, 'reports', 'montaje_gate.png')

if '--plano' not in sys.argv:
    canvas.save(out)
    print(out)
    sys.exit()

# --- plano anotado -------------------------------------------------------------------
S = 2
RULER = 230
LEG = 150
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
plan = Image.new('RGBA', (RULER + W * S + 20, H * S + LEG + 40), (250, 246, 236, 255))
base = canvas.resize((W * S, H * S), Image.NEAREST)
# Atenuar el montaje para que se lean las anotaciones.
veil = Image.new('RGBA', base.size, (250, 246, 236, 120))
base.alpha_composite(veil)
plan.alpha_composite(base, (RULER, 20))
d = ImageDraw.Draw(plan)
COL = {'fachada': (214, 160, 20), 'tejado': (178, 60, 40), 'alero': (40, 120, 200), 'calleja': (40, 150, 80)}


def box(x, y, w, h, col, width=3):
    d.rectangle([RULER + x * S, 20 + y * S, RULER + (x + w) * S - 1, 20 + (y + h) * S - 1], outline=col, width=width)


slots = json.loads(next(p['value'] for p in m['properties'] if p['name'] == 'slots'))
walls = {next(p['value'] for p in o['properties'] if p['name'] == 'solar'): o for o in layers['walls']['objects']}
for code, (sx, sw) in slots.items():
    if code == 'CALLEJA':
        box(sx, 0, sw, 15 * T, COL['calleja'])
        d.text((RULER + sx * S + 4, 20 + 40 * S), 'calleja\nN-S', fill=COL['calleja'], font=bold)
        continue
    o = walls[code]
    box(o['x'], o['y'] - o['height'], o['width'], o['height'], COL['fachada'])
    box(o['x'], 0, o['width'], o['y'] - o['height'], COL['tejado'], 2)
    aid = o['name'].split(':')[1].replace('fachada_', '')
    flip = ' (volteada)' if o['gid'] & 0x80000000 else ''
    d.text((RULER + o['x'] * S + 6, 20 + (o['y'] - o['height'] + 6) * S), f"{code}\n{aid}{flip}\n{o['width']}×{o['height']}", fill=(60, 40, 10), font=bold)
# Banda overhead y callejas sur.
box(0, 26 * T, m['width'] * T, 3 * T, COL['alero'])
for i, g in enumerate(layers['overhead']['data']):
    pass
for cols in [(18, 19), (44, 45)]:
    box(cols[0] * T, 26 * T, 2 * T, 3 * T, COL['calleja'])

# Regla de bandas.
bands = [(0, 4, 'Tejado manzana norte\n(visto desde arriba) 64 px', COL['tejado']),
         (4, 15, 'Fachadas SUR de la\nmanzana norte\nPB+2 = 176 px · PB+1 = 128', COL['fachada']),
         (15, 17, 'Acera norte 32 px', (90, 90, 90)), (17, 18, 'Bordillo', (90, 90, 90)),
         (18, 25, 'Calzada empedrada\n112 px', (90, 90, 90)), (25, 26, 'Bordillo', (90, 90, 90)),
         (26, 29, 'Acera sur TAPADA por el\nalero de la manzana sur\n48 px (overhead)', COL['alero'])]
for y0, y1, txt, col in bands:
    d.rectangle([10, 20 + y0 * T * S, 20, 20 + y1 * T * S - 2], fill=col)
    d.text((28, 20 + y0 * T * S + 2), txt, fill=col, font=font)

# Leyenda.
ly = H * S + 36
items = [('Fachada sur (de cara a cámara): el asset caro, con puertas, rótulos y galerías', COL['fachada']),
         ('Tejado visto desde arriba: tileset de teja árabe (fondo de manzana)', COL['tejado']),
         ('Alero de la manzana sur: los mismos tiles de tejado, tapa al jugador (se aclara a su alrededor)', COL['alero']),
         ('Calleja norte-sur: suelo de escalera + cantos de tejado; las paredes laterales no se ven', COL['calleja'])]
for i, (txt, col) in enumerate(items):
    d.rectangle([RULER, ly + i * 24, RULER + 18, ly + i * 24 + 16], fill=col)
    d.text((RULER + 28, ly + i * 24), txt, fill=(40, 30, 20), font=font)
d.text((10, ly), 'Microcalle del ART-GATE\n62×29 tiles (992×464 px)\ncámara mirando al norte\nluz cenital/frontal', fill=(40, 30, 20), font=bold)
plan.convert('RGB').save(out)
print(out)
