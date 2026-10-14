"""Analiza las capturas de tools/capture.mjs: costuras, paleta y GIF del recorrido.

Uso: python3 tools/analyze-captures.py reports/captures/<etiqueta>
"""
import glob
import json
import os
import shutil
import sys

from PIL import Image, ImageChops

OUT = sys.argv[1]
BG = (18, 16, 20)  # backgroundColor de Phaser: si asoma, hay costura o hueco
log = json.load(open(os.path.join(OUT, 'capture-log.json')))
res = {'seams': [], 'palette': {}, 'windows': log['windows'], 'console_errors': log['errors']}


def rgb(name):
    return Image.open(os.path.join(OUT, name)).convert('RGB')


# Costuras: píxeles de fondo dentro de la vista y equivalencia con posiciones enteras.
shots = {s['camX']: rgb(s['file']) for s in log['seams']}
for s in log['seams']:
    im = shots[s['camX']]
    bg = sum(1 for p in im.get_flattened_data() if p == BG)
    same_as = [x for x in (200, 201) if ImageChops.difference(im, shots[x]).getbbox() is None]
    res['seams'].append({'camX': s['camX'], 'bg_pixels': bg, 'identical_to_integer_cam': same_as})

# Paleta efectiva de las capturas base (sin luz) y con luz.
for f in sorted(glob.glob(os.path.join(OUT, 'nativo_*_base.png'))) + sorted(glob.glob(os.path.join(OUT, 'nativo_*_luz.png'))):
    im = Image.open(f).convert('RGB')
    res['palette'][os.path.basename(f)] = {'size': im.size, 'colors': len(im.getcolors(1 << 20))}

# GIF nítido del recorrido (fotogramas nativos ampliados ×2 con vecino más próximo).
frames = sorted(glob.glob(os.path.join(OUT, '_frames', 'f*.png')))
if frames:
    imgs = [Image.open(f).convert('RGB').resize((960, 540), Image.NEAREST) for f in frames[::2]]
    pal = imgs[len(imgs) // 2].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [im.quantize(palette=pal, dither=Image.Dither.NONE) for im in imgs]
    gif = os.path.join(OUT, 'recorrido_nativo_x2.gif')
    q[0].save(gif, save_all=True, append_images=q[1:], duration=110, loop=0, optimize=True)
    res['gif'] = {'file': os.path.basename(gif), 'frames': len(q), 'bytes': os.path.getsize(gif)}
    shutil.rmtree(os.path.join(OUT, '_frames'))

json.dump(res, open(os.path.join(OUT, 'analysis.json'), 'w'), indent=1)
res['cam_during_walk'] = log.get('camDuringWalk')
ok_seams = all(s['bg_pixels'] == 0 for s in res['seams'])
raw_split = [s['camX'] for s in res['seams'] if not s['identical_to_integer_cam']]
ok_cam = bool(res['cam_during_walk']) and res['cam_during_walk']['nonInteger'] == 0
ok_windows = all(w['integer'] for w in res['windows'])
print(f"costuras (px de fondo): {'OK' if ok_seams else 'REVISAR'} · escalado entero: {'OK' if ok_windows else 'REVISAR'} · "
      f"cámara entera en el recorrido: {'OK' if ok_cam else 'REVISAR'} {res['cam_during_walk']} · errores de consola: {len(res['console_errors'])}")
if raw_split:
    print(f"  diagnóstico: con scroll fraccionario {raw_split} las capas se desalinean 1 px → el juego fuerza scroll entero")
for s in res['seams']:
    print('  cam x', s['camX'], '→ px de fondo', s['bg_pixels'], '· idéntica a cam entera', s['identical_to_integer_cam'])
for w in res['windows']:
    print('  ventana', w['window'], '→ ×', w['zoom'], 'canvas', w['cssW'], 'x', w['cssH'], 'entero' if w['integer'] else 'NO ENTERO')
