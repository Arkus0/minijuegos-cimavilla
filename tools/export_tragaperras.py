#!/usr/bin/env python3
"""Export Costa Verde as one offline HTML file. Uses only Python's standard library."""
from pathlib import Path
import argparse
import base64
import json
import mimetypes
import re

ROOT = Path(__file__).resolve().parents[1]
GAME = ROOT / 'tragaperras'


def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def build(output):
    html = (GAME / 'index.html').read_text()
    css = (GAME / 'styles.css').read_text() + '\n' + (GAME / 'showtime.css').read_text()
    assets = {p.relative_to(GAME).as_posix(): data_uri(p) for p in (GAME / 'assets').rglob('*')
              if p.is_file() and p.suffix != '.txt'}
    for name, uri in assets.items():
        html = html.replace(name, uri)
        css = css.replace(name, uri)

    sources = []
    for name in ['game.mjs', 'reels.mjs', 'audio.mjs', 'app.mjs']:
        source = (GAME / name).read_text()
        source = re.sub(r'^import .*?;\n', '', source, flags=re.M)
        source = re.sub(r'^export ', '', source, flags=re.M)
        source = source.replace('`assets/${symbol}.svg`', 'SLOT_ASSETS[symbol]')
        for name, uri in assets.items():
            source = source.replace(name, uri)
        sources.append(source)
    symbols = {name: assets[f'assets/{name}.svg'] for name in ['cherry','lemon','watermelon','seven','bell']}
    javascript = 'const SLOT_ASSETS = ' + json.dumps(symbols) + ';\n' + '\n'.join(sources)
    html = re.sub(r'\s*<link rel="preload"[^>]*>', '', html)
    html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>\n' + css + '\n</style>')
    html = html.replace('<script type="module" src="app.mjs"></script>', '')
    html = html.replace('<link rel="stylesheet" href="showtime.css">', '')
    html = html.replace('href="../index.html"', 'href="https://arkus0.github.io/minijuegos-cimavilla/"')
    licenses = '\n\n'.join(p.read_text() for p in (GAME / 'assets/fonts').glob('*-OFL.txt'))
    html = html.replace('</body>', '<!-- Embedded font licenses:\n' + licenses.replace('--', '—') +
                        '\n-->\n<script type="module">\n' + javascript + '\n</script>\n</body>')
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html)
    print(f'{output} ({output.stat().st_size:,} bytes)')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output', type=Path)
    build(parser.parse_args().output)
