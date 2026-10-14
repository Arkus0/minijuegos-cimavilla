"""Genera PLACEHOLDERS rotulados (no son arte) para cada asset del manifest aún no entregado.

Nunca sobrescribe un PNG real: solo reescribe ficheros que ya llevan la marca `placeholder=1`
en sus metadatos PNG. Uso: python3 art-src/placeholders.py
"""
import json
import math
import os

from PIL import Image, PngImagePlugin

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')

# Fuente 3x5 mínima para rotular placeholders.
FONT = {
    'A': '.1.1.11111.11.1', 'B': '11.1.111.1.111.', 'C': '.111..1..1...11', 'D': '11.1.11.11.111.',
    'E': '1111..11.1..111', 'F': '1111..11.1..1..', 'G': '.111..1.11.1.11', 'H': '1.11.11111.11.1',
    'I': '111.1..1..1.111', 'J': '..1..1..11.1.1.', 'K': '1.11.111.1.11.1', 'L': '1..1..1..1..111',
    'M': '1.11111111.11.1', 'N': '11.1.11.11.11.1', 'O': '.1.1.11.11.1.1.', 'P': '11.1.111.1..1..',
    'Q': '.1.1.11.11.1.11', 'R': '11.1.111.1.11.1', 'S': '.111...1...111.', 'T': '111.1..1..1..1.',
    'U': '1.11.11.11.1111', 'V': '1.11.11.11.1.1.', 'W': '1.11.11111111.1', 'X': '1.11.1.1.1.11.1',
    'Y': '1.11.1.1..1..1.', 'Z': '111..1.1.1..111', '0': '.1.1.11.11.1.1.', '1': '.1.11..1..1.111',
    '2': '11...1.1.1..111', '3': '11...1.1...111.', '4': '1.11.1111..1..1', '5': '1111..11...111.',
    '6': '.111..11.1.1.1.', '7': '111..1.1..1..1.', '8': '.1.1.1.1.1.1.1.', '9': '.1.1.1.11..111.',
    'x': '...1.1.1.1.1...', '_': '............111', ' ': '...............', '-': '......111......',
}

INK = (24, 20, 28, 255)
PAPER = (236, 226, 200, 255)


def text_w(s):
    return len(s) * 4 - 1


def draw_text(im, x, y, s, col=INK):
    for ch in s.upper() if s != s.lower() else s:
        g = FONT.get(ch, FONT.get(ch.upper(), FONT[' ']))
        g = g.ljust(15, '.')[:15]
        for j in range(5):
            for i in range(3):
                if g[j * 3 + i] == '1' and 0 <= x + i < im.width and 0 <= y + j < im.height:
                    im.putpixel((x + i, y + j), col)
        x += 4


def label(im, s, y=None):
    """Rótulo centrado con fondo claro para que se lea sobre cualquier color."""
    w = text_w(s)
    x = max(1, (im.width - w) // 2)
    y = (im.height - 5) // 2 if y is None else y
    for j in range(y - 1, y + 6):
        for i in range(x - 1, x + w + 1):
            if 0 <= i < im.width and 0 <= j < im.height:
                im.putpixel((i, j), PAPER)
    draw_text(im, x, y, s)


def hatch(im, base, step=6):
    """Relleno plano + rayado diagonal + borde: lenguaje visual inequívoco de 'placeholder'."""
    w, h = im.size
    dark = tuple(max(0, c - 28) for c in base[:3]) + (255,)
    for y in range(h):
        for x in range(w):
            im.putpixel((x, y), dark if (x + y) % step == 0 else base)
    for x in range(w):
        im.putpixel((x, 0), INK)
        im.putpixel((x, h - 1), INK)
    for y in range(h):
        im.putpixel((0, y), INK)
        im.putpixel((w - 1, y), INK)


def is_placeholder(path):
    if not os.path.exists(path):
        return True
    try:
        return Image.open(path).text.get('placeholder') == '1'
    except Exception:
        return False


def save(im, path, placeholder=True):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    meta = PngImagePlugin.PngInfo()
    if placeholder:
        meta.add_text('placeholder', '1')
    im.save(path, pnginfo=meta, optimize=True)


MATERIAL = {
    'canto': (118, 112, 100, 255), 'acera': (168, 164, 152, 255), 'bordillo': (140, 136, 128, 255),
    'canaleta': (96, 92, 88, 255), 'charco': (80, 96, 110, 255), 'alcantarilla': (70, 66, 64, 255),
    'trans': (142, 134, 120, 255), 'fondo': (110, 60, 48, 255), 'musgo': (104, 116, 88, 255),
}


def make_tileset(a):
    w, h = a['size']
    t = a['tile']
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    for name, idx in a['tiles'].items():
        cx, cy = (idx % a['columns']) * t, (idx // a['columns']) * t
        key = next((k for k in MATERIAL if name.startswith(k)), 'canto')
        tile = Image.new('RGBA', (t, t))
        hatch(tile, MATERIAL[key], step=5 + idx % 3)
        code = ''.join(p[0] for p in name.split('_'))[:3].upper()
        draw_text(tile, (t - text_w(code)) // 2, 5, code, PAPER)
        im.paste(tile, (cx, cy))
    return im


def make_box(a, base):
    im = Image.new('RGBA', tuple(a['size']))
    hatch(im, base)
    w, h = a['size']
    lab = a.get('label', a['id'].upper())
    if text_w(lab) + 2 > w:
        lab = lab.split(' ')[0][: max(1, (w - 2) // 4)]
    label(im, lab)
    dims = f"{w}x{h}"
    if text_w(dims) + 2 <= w and h >= 20:
        label(im, dims, y=min(h - 7, (h - 5) // 2 + 9))
    return im


def make_walker(a):
    fw, fh = a['frame']
    cols, rows = a['framesPerRow'], len(a['rows'])
    im = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
    body = (120, 132, 150, 255)
    for r, d in enumerate(a['rows']):
        for c in range(cols):
            bob = 1 if c % 2 else 0
            ox, oy = c * fw, r * fh
            for y in range(6 + bob, fh - 1):
                for x in range(6, fw - 6):
                    if y < 13 + bob and (x - fw / 2) ** 2 / 25 + (y - 9 - bob) ** 2 / 16 > 1:
                        continue
                    im.putpixel((ox + x, oy + y), INK if x in (6, fw - 7) or y == fh - 2 else body)
            # Pies alternos para leer el ciclo de paso.
            step = [0, 2, 0, -2][c]
            for x in range(8 + step, 11 + step):
                im.putpixel((ox + x, oy + fh - 1), INK)
            for x in range(13 - step, 16 - step):
                im.putpixel((ox + x, oy + fh - 1), INK)
            # Indicador de dirección.
            arrow = {'down': (fw // 2, 24), 'up': (fw // 2, 14), 'left': (8, 18), 'right': (fw - 9, 18)}[d]
            for j in range(-1, 2):
                for i in range(-1, 2):
                    im.putpixel((ox + arrow[0] + i, oy + arrow[1] + bob + j), (240, 196, 106, 255))
            draw_text(im, ox + fw // 2 - 3, oy + 1, 'PJ')
    return im


def make_glow(a):
    w, h = a['size']
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    r = w / 2
    for y in range(h):
        for x in range(w):
            d = math.hypot(x + 0.5 - r, y + 0.5 - r) / r
            v = max(0.0, 1 - d) ** 1.6
            v = round(v * 6) / 6  # escalones discretos: evita degradados suaves impropios del pixel art
            if v > 0:
                im.putpixel((x, y), (255, 255, 255, int(255 * v)))
    return im


def main():
    man = json.load(open(os.path.join(ASSETS, 'manifest.json')))
    colors = {'walls': (150, 140, 128, 255), 'overhead': (150, 78, 60, 255), 'props': (120, 100, 80, 255)}
    made, kept = [], []
    for a in man['assets']:
        path = os.path.join(ASSETS, a['file'])
        if a['status'] not in ('placeholder', 'tool'):
            continue
        if not is_placeholder(path) and a['status'] == 'placeholder':
            kept.append(a['id'])
            continue
        if a['kind'] == 'tileset':
            im = make_tileset(a)
        elif a['kind'] == 'spritesheet':
            im = make_walker(a)
        elif a['id'] == 'fx_glow':
            im = make_glow(a)
        elif a['id'] == 'fx_gota':
            im = Image.new('RGBA', (1, 4), (200, 214, 230, 150))
        else:
            base = colors.get(a.get('layer'), (130, 130, 130, 255))
            if a['id'].endswith('_on'):
                base = (230, 170, 80, 255)
            im = make_box(a, base)
        assert list(im.size) == list(a['size']), (a['id'], im.size, a['size'])
        save(im, path, placeholder=a['status'] == 'placeholder')
        made.append(a['id'])
    print('generados:', ', '.join(made))
    if kept:
        print('respetados (arte real presente):', ', '.join(kept))


if __name__ == '__main__':
    main()
