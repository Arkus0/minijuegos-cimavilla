"""Genera maps/gate.tmj (Tiled JSON 1.10) para la microzona del ART-GATE.

No es un editor: es la descripción reproducible de UNA calle. El .tmj resultante se abre y
se edita en Tiled; si se edita a mano en Tiled, deja de regenerarse con este script.
Uso: python3 tools/build-map.py [--seed N]
"""
import json
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = json.load(open(os.path.join(ROOT, 'assets', 'manifest.json')))
A = {a['id']: a for a in MAN['assets']}
T = MAN['spec']['tile']

W, H = 62, 26                 # tiles
FACADE_LINE = 12 * T          # y de la base de las fachadas norte
ROW_ACERA_N = (12, 13)
ROW_BORDILLO_N = 14
ROWS_CALLE = range(15, 22)
ROW_BORDILLO_S = 22
ROWS_ACERA_S = range(23, 26)

seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1992
R = random.Random(seed)

suelo = A['suelo']
TILES = suelo['tiles']
FIRST_SUELO = 1
FIRST_OBJ = FIRST_SUELO + (suelo['size'][0] // T) * (suelo['size'][1] // T)


def gid(name):
    return FIRST_SUELO + TILES[name]


# --- capas de tiles -------------------------------------------------------------
ground = [0] * (W * H)
detail = [0] * (W * H)


def put(layer, x, y, name):
    layer[y * W + x] = gid(name)


for y in range(H):
    for x in range(W):
        if y < ROW_ACERA_N[0]:
            put(ground, x, y, 'fondo_tejados')
        elif y in ROW_ACERA_N or y in ROWS_ACERA_S:
            put(ground, x, y, 'acera_a' if (x * 7 + y * 3) % 5 else 'acera_b')
        elif y in (ROW_BORDILLO_N, ROW_BORDILLO_S):
            put(ground, x, y, 'bordillo')
        else:
            # Variación ponderada con semilla: evita la repetición de un solo tile.
            put(ground, x, y, R.choices(['canto_base', 'canto_v1', 'canto_v2', 'canto_v3'], [55, 18, 15, 12])[0])

# Musgo junto a los bordillos y detalles puntuales.
for x in range(W):
    for y in (ROWS_CALLE.start, ROWS_CALLE.stop - 1):
        if R.random() < 0.18:
            put(detail, x, y, 'canto_musgo')
for x, y, n in [(9, 18, 'alcantarilla'), (41, 18, 'alcantarilla'), (24, 20, 'charco'), (25, 20, 'charco'), (52, 16, 'charco')]:
    put(detail, x, y, n)

# --- tileset de objetos (colección de imágenes) -----------------------------------
obj_ids = [a['id'] for a in MAN['assets'] if a['kind'] == 'image' and a.get('layer') in ('walls', 'overhead', 'props')]
obj_tiles = []
for i, aid in enumerate(obj_ids):
    a = A[aid]
    obj_tiles.append({
        'id': i, 'image': '../assets/' + a['file'], 'imagewidth': a['size'][0], 'imageheight': a['size'][1],
        'properties': [{'name': 'asset', 'type': 'string', 'value': aid}],
    })
OBJ_GID = {aid: FIRST_OBJ + i for i, aid in enumerate(obj_ids)}

next_id = [1]


def prop(k, v):
    t = 'bool' if isinstance(v, bool) else 'int' if isinstance(v, int) else 'float' if isinstance(v, float) else 'string'
    return {'name': k, 'type': t, 'value': v}


def obj(aid, x, y, **props):
    """Objeto-imagen de Tiled: (x, y) es la esquina inferior izquierda del sprite."""
    a = A[aid]
    w, h = a['size']
    ax = a.get('anchor', [0, 1])[0]
    o = {'id': next_id[0], 'gid': OBJ_GID[aid], 'name': aid, 'type': '', 'x': x - ax * w, 'y': y,
         'width': w, 'height': h, 'rotation': 0, 'visible': True}
    if props:
        o['properties'] = [prop(k, v) for k, v in props.items()]
    next_id[0] += 1
    return o


def point(name, x, y, **props):
    o = {'id': next_id[0], 'name': name, 'type': '', 'x': x, 'y': y, 'width': 0, 'height': 0, 'rotation': 0,
         'visible': True, 'point': True}
    if props:
        o['properties'] = [prop(k, v) for k, v in props.items()]
    next_id[0] += 1
    return o


def rect(name, x, y, w, h):
    o = {'id': next_id[0], 'name': name, 'type': '', 'x': x, 'y': y, 'width': w, 'height': h, 'rotation': 0,
         'visible': True, 'properties': [{'name': 'collides', 'type': 'bool', 'value': True}]}
    next_id[0] += 1
    return o


# Fachadas norte, contiguas sobre la línea de fachada.
walls, x = [], 0
chigre_x = None
for aid in ['fachada_medianera', 'fachada_galeria_a', 'fachada_chigre', 'fachada_galeria_b', 'fachada_medianera',
            'fachada_galeria_a', 'fachada_galeria_b', 'fachada_medianera', 'fachada_galeria_a', 'fachada_galeria_b',
            'fachada_medianera']:
    walls.append(obj(aid, x, FACADE_LINE))
    if aid == 'fachada_chigre':
        chigre_x = x
    x += A[aid]['size'][0]
assert x == W * T, f'las fachadas suman {x}px y el mapa mide {W * T}px'

# Props del chigre y de la calle (ancla = centro de la base).
props = [
    obj('prop_cajas_sidra', chigre_x + 18, FACADE_LINE + 10),
    obj('prop_pipa', chigre_x + 96, FACADE_LINE + 8),
    obj('prop_pipa', chigre_x + 104, FACADE_LINE + 12),
    obj('prop_banco', chigre_x + 180, FACADE_LINE + 14),
    obj('prop_farol_on', chigre_x + 8, FACADE_LINE - 64, sortY=FACADE_LINE, light='farol'),
    obj('prop_farol_on', 604, FACADE_LINE - 64, sortY=FACADE_LINE, light='farol'),
]

# Tejados del lado sur en primer plano, con dos huecos de vista.
overhead = [obj('tejado_sur_a', x0, H * T) for x0 in (0, 160, 416, 576, 736)]

lights = [
    point('farol', chigre_x + 8, FACADE_LINE - 76, radius=56.0, color='#f2b45a', flicker=True),
    point('farol', 604, FACADE_LINE - 76, radius=56.0, color='#f2b45a', flicker=True),
    point('ventana_chigre', chigre_x + 56, FACADE_LINE - 18, radius=40.0, color='#e89a48', flicker=False),
]

collision = [
    rect('linea_fachadas', 0, 0, W * T, FACADE_LINE + 4),
    rect('borde_oeste', -16, 0, 16, H * T),
    rect('borde_este', W * T, 0, 16, H * T),
]
spawn = [point('spawn', chigre_x + 56, FACADE_LINE + 60)]


def tilelayer(lid, name, data):
    return {'id': lid, 'name': name, 'type': 'tilelayer', 'x': 0, 'y': 0, 'width': W, 'height': H,
            'opacity': 1, 'visible': True, 'data': data}


def objlayer(lid, name, objs):
    return {'id': lid, 'name': name, 'type': 'objectgroup', 'x': 0, 'y': 0, 'opacity': 1, 'visible': True,
            'draworder': 'topdown', 'objects': objs}


tmj = {
    'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'width': W, 'height': H, 'tilewidth': T, 'tileheight': T, 'infinite': False,
    'properties': [{'name': 'generator', 'type': 'string', 'value': f'tools/build-map.py seed={seed}'}],
    'tilesets': [
        {'firstgid': FIRST_SUELO, 'name': 'suelo', 'image': '../assets/' + suelo['file'],
         'imagewidth': suelo['size'][0], 'imageheight': suelo['size'][1], 'tilewidth': T, 'tileheight': T,
         'columns': suelo['size'][0] // T, 'tilecount': (suelo['size'][0] // T) * (suelo['size'][1] // T),
         'margin': 0, 'spacing': 0},
        {'firstgid': FIRST_OBJ, 'name': 'objetos', 'columns': 0, 'tilewidth': max(t['imagewidth'] for t in obj_tiles),
         'tileheight': max(t['imageheight'] for t in obj_tiles), 'tilecount': len(obj_tiles), 'margin': 0, 'spacing': 0,
         'grid': {'orientation': 'orthogonal', 'width': 1, 'height': 1}, 'tiles': obj_tiles},
    ],
    'layers': [
        tilelayer(1, 'ground', ground),
        tilelayer(2, 'ground-detail', detail),
        objlayer(3, 'walls', walls),
        objlayer(4, 'props', props),
        objlayer(5, 'overhead', overhead),
        objlayer(6, 'lights', lights),
        objlayer(7, 'collision', collision),
        objlayer(8, 'spawn', spawn),
    ],
    'nextlayerid': 9, 'nextobjectid': next_id[0],
}

out = os.path.join(ROOT, 'maps', 'gate.tmj')
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(tmj, open(out, 'w'), indent=1)
print(f'{out}: {W}x{H} tiles, {len(walls)} fachadas, {len(props)} props, {len(overhead)} tejados, seed={seed}')
