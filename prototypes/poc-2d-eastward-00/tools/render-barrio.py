"""Esquema ESTILIZADO del barrio (no es cartografía): manzanas, calles ortogonales, callejas,
hitos y la microcalle del ART-GATE, con la convención de bandas de docs/ASSET-SPEC.md §10.

Unidad: tile de 16 px. Periodo vertical = calle (11) + manzana (18) = 29 tiles.
Uso: python3 tools/render-barrio.py [--out docs/img/barrio.png]
"""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = 5  # px por tile en el esquema
WT, HT = 168, 150
MARGIN_X, MARGIN_Y, LEGEND_H = 20, 20, 250
font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
small = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 10)
bold = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 13)
title = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 16)

C = {
    'mar': (120, 160, 190), 'cerro': (150, 178, 120), 'calle': (226, 220, 206), 'tejado': (196, 110, 86),
    'fachada': (232, 190, 90), 'alero': (110, 150, 205), 'calleja': (90, 160, 100), 'arena': (236, 214, 160),
    'plaza': (214, 208, 194), 'muro': (130, 120, 110), 'gate': (200, 30, 60), 'txt': (40, 30, 24), 'hito': (120, 40, 120),
}

img = Image.new('RGB', (WT * S + 2 * MARGIN_X, HT * S + 2 * MARGIN_Y + LEGEND_H), (250, 246, 236))
d = ImageDraw.Draw(img)


def R(x0, y0, x1, y1, col, outline=None, width=1):
    d.rectangle([MARGIN_X + x0 * S, MARGIN_Y + y0 * S, MARGIN_X + x1 * S - 1, MARGIN_Y + y1 * S - 1], fill=col, outline=outline, width=width)


def label(x, y, txt, col=C['txt'], f=font, anchor='la'):
    d.text((MARGIN_X + x * S, MARGIN_Y + y * S), txt, fill=col, font=f, anchor=anchor)


# Mar y tierra.
R(0, 0, WT, HT, C['mar'])
LAND_X0, LAND_X1 = 10, 150
CERRO = (0, 25)
STREET, BLOCK = 11, 18
y = CERRO[1]
calles, manzanas = [], []
for i in range(4):
    calles.append((y, y + STREET))
    y += STREET
    if i < 3:
        manzanas.append((y, y + BLOCK))
        y += BLOCK
MUELLE_Y1 = y  # fin de la calle del muelle; al sur, agua

R(26, 2, 136, CERRO[1], C['cerro'])                       # cerro de Santa Catalina
R(LAND_X0, CERRO[1], LAND_X1, MUELLE_Y1, C['calle'])       # tierra urbana
R(LAND_X1, calles[2][0], WT, HT, C['arena'])               # playa al este
R(108, MUELLE_Y1, LAND_X1, MUELLE_Y1 + 14, C['plaza'])     # plaza mayor al sur-este
R(LAND_X0, CERRO[1], LAND_X1, CERRO[1] + 2, C['muro'])     # muro de contención al pie del cerro

# Manzanas: alero (3) + tejado (4) + fachadas sur (11), cortadas por callejas N-S.
CALLEJAS = {0: [(34, 36), (64, 66), (118, 120)], 1: [(34, 36), (58, 60), (84, 86), (118, 120)], 2: [(34, 36), (70, 72), (92, 94)]}
for i, (y0, y1) in enumerate(manzanas):
    cuts = [LAND_X0] + [c for pair in CALLEJAS[i] for c in pair] + [LAND_X1]
    for x0, x1 in zip(cuts[0::2], cuts[1::2]):
        R(x0, y0, x1, y0 + 3, C['alero'])
        R(x0, y0 + 3, x1, y0 + 7, C['tejado'])
        R(x0, y0 + 7, x1, y1, C['fachada'])
        d.line([MARGIN_X + x0 * S, MARGIN_Y + y1 * S - 1, MARGIN_X + x1 * S - 1, MARGIN_Y + y1 * S - 1], fill=(150, 110, 30), width=2)
    for x0, x1 in CALLEJAS[i]:
        R(x0, y0, x1, y1, C['calleja'])
# Escalinata continua hasta el cerro.
R(34, CERRO[1], 36, calles[0][1], C['calleja'])
R(34, 20, 36, CERRO[1], C['calleja'])

# Hitos (todos con su fachada mirando al SUR).
def hito(x0, y0, x1, y1, txt):
    d.rectangle([MARGIN_X + x0 * S, MARGIN_Y + y0 * S, MARGIN_X + x1 * S - 1, MARGIN_Y + y1 * S - 1], outline=C['hito'], width=3)
    label((x0 + x1) / 2, y1 - 3, txt, C['hito'], small, 'mm')


hito(74, 5, 90, 14, 'Elogio del\nHorizonte')
hito(40, 6, 60, 18, 'Batería de\nla Atalaya')
hito(122, manzanas[1][0] + 4, 148, manzanas[1][1], 'Fábrica de\nTabacos (PB+3)')
hito(38, manzanas[1][0] + 7, 56, manzanas[1][1], 'Casa natal\nJovellanos')
hito(12, manzanas[2][0] + 7, 33, manzanas[2][1], 'Palacio\nRevillagigedo')
hito(108, manzanas[2][0] + 7, 127, manzanas[2][1], 'Ayuntamiento')
hito(128, manzanas[2][0] + 4, 148, manzanas[2][1], 'San Pedro')
hito(96, manzanas[2][0] + 7, 104, manzanas[2][1], 'Reloj')

# Microcalle del ART-GATE: 62×29 tiles, de la fila 3 de la manzana A a la fila 3 de la manzana B.
gx0, gy0 = 40, manzanas[0][0] + 3
d.rectangle([MARGIN_X + gx0 * S - 2, MARGIN_Y + gy0 * S - 2, MARGIN_X + (gx0 + 62) * S + 1, MARGIN_Y + (gy0 + 29) * S + 1], outline=C['gate'], width=4)
label(gx0 + 63, calles[1][0] + 3, '← ART-GATE: microcalle\n    del chigre (62×29 tiles)', C['gate'], bold)

# Nombres de calles (E-O).
names = ['Calle de la Atalaya (al norte: muro y escaleras al cerro)', 'Calle Vicaría', 'Calle del Rosario · Plazuela', 'Muelle · Cuesta del Cholo (al sur: el puerto, sin alero)']
for (y0, y1), n in zip(calles, names):
    label(LAND_X0 + 2, y0 + 4, n, C['txt'], font)
label(LAND_X1 + 2, calles[2][0] + 30, 'Playa de\nSan Lorenzo', C['txt'], font)
label(112, MUELLE_Y1 + 5, 'Plaza Mayor', C['txt'], bold)
label(60, MUELLE_Y1 + 10, 'Puerto (agua)', (240, 248, 255), bold)
label(2, 2, 'Mar Cantábrico', (240, 248, 255), bold)
label(37, 21, 'Escalinata', (20, 80, 30), small)

# Rosa: cámara siempre mirando al norte.
cx, cy = WT - 8, 8
d.polygon([(MARGIN_X + cx * S, MARGIN_Y + (cy - 5) * S), (MARGIN_X + (cx - 2) * S, MARGIN_Y + cy * S), (MARGIN_X + (cx + 2) * S, MARGIN_Y + cy * S)], fill=C['txt'])
label(cx, cy + 1, 'N', C['txt'], bold, 'ma')

# Leyenda.
ly = MARGIN_Y + HT * S + 14
d.text((MARGIN_X, ly), 'Cimavilla reinterpretada · ESQUEMA ESTILIZADO, no cartografía\nCámara siempre mirando al norte · luz cenital/frontal', fill=C['txt'], font=title)
items = [
    ('fachada', 'Fachada SUR de cada manzana: lo único que se ve de frente (puertas, rótulos, galerías).'),
    ('tejado', 'Tejado visto desde arriba (tileset de teja árabe): el resto de la manzana.'),
    ('alero', 'Alero de la manzana sobre la acera sur de la calle de arriba: tapa al jugador (overhead).'),
    ('calleja', 'Callejas y cuestas norte-sur: suelo o escaleras + cantos de tejado. Las paredes laterales NO se ven.'),
    ('hito', 'Hitos con fachada propia, también mirando al sur. Ubicación inspirada, no exacta.'),
    ('gate', 'Zona del ART-GATE (la que se construye ahora).'),
]
for i, (k, txt) in enumerate(items):
    yy = ly + 46 + i * 22
    if k in ('hito', 'gate'):
        d.rectangle([MARGIN_X, yy, MARGIN_X + 18, yy + 14], outline=C[k], width=3)
    else:
        d.rectangle([MARGIN_X, yy, MARGIN_X + 18, yy + 14], fill=C[k])
    d.text((MARGIN_X + 28, yy), txt, fill=C['txt'], font=font)
d.text((MARGIN_X, ly + 46 + 6 * 22 + 4), f'Escala: 1 tile = 16 px. Calle = {STREET} tiles · manzana = {BLOCK} tiles (alero 3 + tejado 4 + fachada 11).\nPeriodo calle + manzana = 29 tiles = 464 px ≈ 1,7 pantallas de alto.', fill=C['txt'], font=font)

out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else os.path.join(ROOT, 'docs', 'img', 'barrio.png')
img.save(out)
print(out, img.size)
