"""Genera maps/gate.tmj (Tiled JSON 1.10) para la microcalle del ART-GATE.

No es un editor: es la descripción reproducible de UNA calle este-oeste según la convención de
bandas (docs/ASSET-SPEC.md §10). El .tmj se abre y edita en Tiled; si se edita a mano en Tiled,
deja de regenerarse con este script. Uso: python3 tools/build-map.py [--seed N]

Banda vertical (de arriba abajo, en tiles de 16 px):
  0-3   tejado visible de la manzana norte (64 px)            capa roofs-back
  4-14  fachadas sur de la manzana norte (PB+2 = 176 px)       capa walls (objetos)
  15-16 acera norte · 17 bordillo · 18-24 calzada · 25 bordillo
  26-28 acera sur, TAPADA por el alero de la manzana sur (48 px)  capa overhead (tiles)
Las callejas norte-sur cortan la banda: suelo de escalera y cantos de tejado a ambos lados.
"""
import json
import os
import random
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = json.load(open(os.path.join(ROOT, 'assets', 'manifest.json')))
A = {a['id']: a for a in MAN['assets']}
T = MAN['spec']['tile']

W, H = 62, 29
FACADE_LINE = 15 * T           # y de la base de las fachadas norte (240 px)
ROWS_TEJADO_N = range(0, 4)
ROWS_ACERA_N = (15, 16)
ROW_BORDILLO_N = 17
ROWS_CALLE = range(18, 25)
ROW_BORDILLO_S = 25
ROWS_ACERA_S = range(26, 29)   # bajo la banda overhead
CALLEJA_N = (24, 25)           # columnas de la calleja que sube al norte
CALLEJAS_S = [(18, 19), (44, 45)]  # columnas de las callejas que bajan al sur (hacia el muelle)

seed = int(sys.argv[sys.argv.index('--seed') + 1]) if '--seed' in sys.argv else 1992
R = random.Random(seed)

# --- tilesets: suelo (1..), tejado (..), colección de objetos --------------------
def count(a):
    return (a['size'][0] // T) * (a['size'][1] // T)


suelo, tejado = A['suelo'], A['tejado']
FIRST = {'suelo': 1, 'tejado': 1 + count(suelo)}
FIRST_OBJ = FIRST['tejado'] + count(tejado)


def gid(ts, name):
    return FIRST[ts] + A[ts]['tiles'][name]


def layer_data():
    return [0] * (W * H)


ground, detail, roofs_back, overhead = layer_data(), layer_data(), layer_data(), layer_data()


def put(layer, x, y, ts, name):
    layer[y * W + x] = gid(ts, name)


def in_cols(x, cols):
    return cols[0] <= x <= cols[1]


# --- suelo ----------------------------------------------------------------------
for y in range(H):
    for x in range(W):
        if y < FACADE_LINE // T:
            # Bajo tejados y fachadas no se ve el suelo, salvo en la calleja norte.
            put(ground, x, y, 'suelo', ('escalon_a' if y % 2 else 'escalon_b') if in_cols(x, CALLEJA_N) else 'fondo_tejados')
        elif y in ROWS_ACERA_N or y in ROWS_ACERA_S:
            if y in ROWS_ACERA_S and any(in_cols(x, c) for c in CALLEJAS_S):
                put(ground, x, y, 'suelo', 'escalon_a' if y % 2 else 'escalon_b')
            else:
                put(ground, x, y, 'suelo', 'acera_a' if (x * 7 + y * 3) % 5 else 'acera_b')
        elif y in (ROW_BORDILLO_N, ROW_BORDILLO_S):
            put(ground, x, y, 'suelo', 'bordillo')
        else:
            # Variación ponderada con semilla: evita la repetición de un solo tile.
            put(ground, x, y, 'suelo', R.choices(['canto_base', 'canto_v1', 'canto_v2', 'canto_v3'], [55, 18, 15, 12])[0])

for x in range(W):
    for y in (ROWS_CALLE.start, ROWS_CALLE.stop - 1):
        if R.random() < 0.18:
            put(detail, x, y, 'suelo', 'canto_musgo')
for x, y, n in [(9, 21, 'alcantarilla'), (41, 21, 'alcantarilla'), (24, 23, 'charco'), (25, 23, 'charco'), (52, 19, 'charco')]:
    put(detail, x, y, 'suelo', n)

# --- banda overhead: alero de la manzana sur sobre la acera sur -------------------
for y in ROWS_ACERA_S:
    for x in range(W):
        cut = next((c for c in CALLEJAS_S if in_cols(x, c)), None)
        if cut:
            continue
        west_of_cut = any(x == c[0] - 1 for c in CALLEJAS_S)
        east_of_cut = any(x == c[1] + 1 for c in CALLEJAS_S)
        if y == ROWS_ACERA_S.start:
            n = 'esq_ne' if west_of_cut else 'esq_no' if east_of_cut else 'borde_n'
        else:
            n = 'canto_e' if west_of_cut else 'canto_o' if east_of_cut else R.choice(['campo_a', 'campo_b', 'campo_c'])
        put(overhead, x, y, 'tejado', n)

# --- objetos ----------------------------------------------------------------------
obj_ids = [a['id'] for a in MAN['assets'] if a['kind'] == 'image' and a.get('layer') in ('walls', 'overhead', 'props')]
obj_tiles = [{'id': i, 'image': '../assets/' + A[aid]['file'], 'imagewidth': A[aid]['size'][0], 'imageheight': A[aid]['size'][1],
              'properties': [{'name': 'asset', 'type': 'string', 'value': aid}]} for i, aid in enumerate(obj_ids)]
OBJ_GID = {aid: FIRST_OBJ + i for i, aid in enumerate(obj_ids)}
FLIP_H = 0x80000000  # bit de volteo horizontal de Tiled
next_id = [1]


def prop(k, v):
    t = 'bool' if isinstance(v, bool) else 'int' if isinstance(v, int) else 'float' if isinstance(v, float) else 'string'
    return {'name': k, 'type': t, 'value': v}


def obj(aid, x, y, flip=False, name=None, **props):
    """Objeto-imagen de Tiled: (x, y) es la esquina inferior izquierda del sprite."""
    a = A[aid]
    w, h = a['size']
    ax = a.get('anchor', [0, 1])[0]
    o = {'id': next_id[0], 'gid': OBJ_GID[aid] | (FLIP_H if flip else 0), 'name': name or aid, 'type': '',
         'x': x - ax * w, 'y': y, 'width': w, 'height': h, 'rotation': 0, 'visible': True}
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
         'visible': True, 'properties': [prop('collides', True)]}
    next_id[0] += 1
    return o


# Solares de la manzana norte (oeste → este). Cada uno: (código, asset, voltear).
SOLARES = [('N1', 'fachada_estrecha', False), ('N2', 'fachada_galeria_a', False), ('N3', 'fachada_chigre', False),
           ('N4', 'fachada_casa_b', False), ('CALLEJA', None, False), ('N5', 'fachada_galeria_a', True),
           ('N6', 'fachada_estrecha', True), ('N7', 'fachada_casa_b', True), ('N8', 'fachada_galeria_a', False),
           ('N9', 'fachada_casa_b', False), ('N10', 'fachada_casa_b', True)]
walls, x, slots = [], 0, {}
for code, aid, flip in SOLARES:
    if aid is None:
        assert x == CALLEJA_N[0] * T, f'la calleja debería empezar en {CALLEJA_N[0] * T}, empieza en {x}'
        slots[code] = (x, 2 * T)
        x += 2 * T
        continue
    walls.append(obj(aid, x, FACADE_LINE, flip=flip, name=f'{code}:{aid}', solar=code))
    slots[code] = (x, A[aid]['size'][0])
    x += A[aid]['size'][0]
assert x == W * T, f'los solares suman {x}px y el mapa mide {W * T}px'

# --- tejados de la manzana norte (fondo): bajan hasta la cornisa de cada fachada -----
facade_top = {}
for code, (sx, sw) in slots.items():
    if code == 'CALLEJA':
        continue
    aid = next(a for c, a, _ in SOLARES if c == code)
    for col in range(sx // T, (sx + sw) // T):
        facade_top[col] = (FACADE_LINE - A[aid]['size'][1]) // T
for x in range(W):
    if in_cols(x, CALLEJA_N):
        continue
    for y in range(facade_top[x]):
        if x == CALLEJA_N[0] - 1:
            n = 'canto_e'
        elif x == CALLEJA_N[1] + 1:
            n = 'canto_o'
        elif y == 1:
            n = 'cumbrera'
        elif y == facade_top[x] - 1:
            n = 'borde_s'
        else:
            n = R.choice(['campo_a', 'campo_a', 'campo_b', 'campo_c'])
        put(roofs_back, x, y, 'tejado', n)

cx = slots['N3'][0]  # chigre
props = [
    obj('prop_cajas_sidra', cx + 18, FACADE_LINE + 10),
    obj('prop_pipa', cx + 96, FACADE_LINE + 8),
    obj('prop_pipa', cx + 104, FACADE_LINE + 12),
    obj('prop_banco', slots['N4'][0] + 48, FACADE_LINE + 14),
    obj('prop_farol_on', cx + 8, FACADE_LINE - 64, sortY=FACADE_LINE, light='farol'),
    obj('prop_farol_on', slots['CALLEJA'][0] + 40, FACADE_LINE - 64, sortY=FACADE_LINE, light='farol'),
]
lights = [
    point('farol', cx + 8, FACADE_LINE - 76, radius=56.0, color='#f2b45a', flicker=True),
    point('farol', slots['CALLEJA'][0] + 40, FACADE_LINE - 76, radius=56.0, color='#f2b45a', flicker=True),
    point('ventana_chigre', cx + 56, FACADE_LINE - 18, radius=40.0, color='#e89a48', flicker=False),
]

# Colisiones: manzana norte (salvo la calleja), bordes del mapa y fondo sur fuera de las callejas.
cal_x0, cal_x1 = CALLEJA_N[0] * T, (CALLEJA_N[1] + 1) * T
collision = [
    rect('manzana_norte_oeste', 0, 0, cal_x0, FACADE_LINE + 4),
    rect('manzana_norte_este', cal_x1, 0, W * T - cal_x1, FACADE_LINE + 4),
    rect('fin_calleja_norte', cal_x0, 0, cal_x1 - cal_x0, 8),
    rect('borde_oeste', -16, 0, 16, H * T),
    rect('borde_este', W * T, 0, 16, H * T),
]
spawn = [point('spawn', cx + 56, FACADE_LINE + 60)]


def tilelayer(lid, name, data):
    return {'id': lid, 'name': name, 'type': 'tilelayer', 'x': 0, 'y': 0, 'width': W, 'height': H,
            'opacity': 1, 'visible': True, 'data': data}


def objlayer(lid, name, objs):
    return {'id': lid, 'name': name, 'type': 'objectgroup', 'x': 0, 'y': 0, 'opacity': 1, 'visible': True,
            'draworder': 'topdown', 'objects': objs}


def tileset(ts):
    a = A[ts]
    return {'firstgid': FIRST[ts], 'name': ts, 'image': '../assets/' + a['file'], 'imagewidth': a['size'][0],
            'imageheight': a['size'][1], 'tilewidth': T, 'tileheight': T, 'columns': a['size'][0] // T,
            'tilecount': count(a), 'margin': 0, 'spacing': 0}


tmj = {
    'type': 'map', 'version': '1.10', 'tiledversion': '1.10.2', 'orientation': 'orthogonal', 'renderorder': 'right-down',
    'width': W, 'height': H, 'tilewidth': T, 'tileheight': T, 'infinite': False,
    'properties': [prop('generator', f'tools/build-map.py seed={seed}'), prop('slots', json.dumps(slots))],
    'tilesets': [
        tileset('suelo'), tileset('tejado'),
        {'firstgid': FIRST_OBJ, 'name': 'objetos', 'columns': 0, 'tilewidth': max(t['imagewidth'] for t in obj_tiles),
         'tileheight': max(t['imageheight'] for t in obj_tiles), 'tilecount': len(obj_tiles), 'margin': 0, 'spacing': 0,
         'grid': {'orientation': 'orthogonal', 'width': 1, 'height': 1}, 'tiles': obj_tiles},
    ],
    'layers': [
        tilelayer(1, 'ground', ground),
        tilelayer(2, 'ground-detail', detail),
        tilelayer(3, 'roofs-back', roofs_back),
        objlayer(4, 'walls', walls),
        objlayer(5, 'props', props),
        tilelayer(6, 'overhead', overhead),
        objlayer(7, 'lights', lights),
        objlayer(8, 'collision', collision),
        objlayer(9, 'spawn', spawn),
    ],
    'nextlayerid': 10, 'nextobjectid': next_id[0],
}

out = os.path.join(ROOT, 'maps', 'gate.tmj')
json.dump(tmj, open(out, 'w'), indent=1)
print(f'{out}: {W}x{H} tiles, {len(walls)} fachadas, {len(props)} props, seed={seed}')
print('solares:', {k: v for k, v in slots.items()})
