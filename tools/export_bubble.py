#!/usr/bin/env python3
"""Package the complete arcade as one offline HTML with local Blob-backed modules."""
import argparse
import base64
import json
import mimetypes
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'burbujas'


def export(output):
    html=(GAME/'index.html').read_text()
    html=re.sub(r'<link[^>]+>', '', html)
    html=re.sub(r'<script type="module"[^>]*></script>', '', html)
    html=html.replace('href="../index.html"','href="#"')
    html=html.replace('VOLVER AL SALÓN','TERMINAR VISITA')
    assets={}
    for path in (GAME/'assets').rglob('*'):
        if path.is_file() and path.suffix in ['.png','.jpg','.woff2']:
            assets[path.relative_to(GAME).as_posix()]={'type':mimetypes.guess_type(path)[0] or 'application/octet-stream','data':base64.b64encode(path.read_bytes()).decode()}
    modules={path.stem:path.read_text() for path in GAME.glob('*.mjs') if not path.name.endswith('.test.mjs')}
    payload={'assets':assets,'modules':modules,'css':(GAME/'styles.css').read_text(),
             'licenses':{p.name:p.read_text() for p in (GAME/'assets/fonts').glob('*OFL.txt')}}
    data=json.dumps(payload,ensure_ascii=False).replace('</','<\\/')
    boot=r"""<script>
window.BubbleParadeOffline=true;
const packageData=PAYLOAD,assetURLs={};
for(const [path,asset] of Object.entries(packageData.assets)){
 const bytes=Uint8Array.from(atob(asset.data),c=>c.charCodeAt(0));
 assetURLs[path]=URL.createObjectURL(new Blob([bytes],{type:asset.type}));
}
function assets(source){for(const [path,url] of Object.entries(assetURLs))source=source.split(path).join(url);return source;}
const style=document.createElement('style');style.textContent=assets(packageData.css);document.head.append(style);
const imports={};
for(const [name,code] of Object.entries(packageData.modules)){
 const source=assets(code).replace(/(['"])\.\/([a-z]+)\.mjs\1/g,(_,quote,module)=>quote+'bubble/'+module+quote);
 imports['bubble/'+name]=URL.createObjectURL(new Blob([source],{type:'application/javascript'}));
}
const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports});document.head.append(map);
const app=document.createElement('script');app.type='module';app.textContent="import 'bubble/app'";document.body.append(app);
</script>""".replace('PAYLOAD',data)
    html=html.replace('</body>',boot+'\n</body>')
    out=Path(output);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(html)
    print(f'Offline arcade: {out} ({out.stat().st_size:,} bytes; {len(assets)} assets, {len(modules)} modules)')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('output',nargs='?',default='/tmp/bubble-parade.html')
    export(parser.parse_args().output)
