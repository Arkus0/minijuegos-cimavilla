#!/usr/bin/env python3
"""Convert the approved web artwork/foley into native Unity resources.

Requires Playwright+Chromium, fontTools+brotli and Inkscape.
Serve the repository locally before running; no design assets are fetched externally.
"""
import argparse
import base64
import json
import subprocess
import wave
from pathlib import Path

from fontTools.ttLib import TTFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PACKAGE = ROOT / "unity/Packages/com.cimavilla.costa-verde"


def save_data_url(path, value):
    path.write_bytes(base64.b64decode(value.split(",", 1)[1]))


def export(url):
    for folder in ["Art", "Audio", "Fonts", "Data"]:
        (PACKAGE / folder).mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1440, "height": 1034}, device_scale_factor=2)
        page.goto(url)
        page.wait_for_function("window.CimavillaTragaperras")
        page.evaluate("document.fonts.ready")
        page.evaluate("Promise.all([...document.images].map(i => i.decode().catch(() => {})))")
        layout = page.evaluate("""() => {
          const cabinet = document.querySelector('#cabinet').getBoundingClientRect();
          function box(el, name) {
            const r = el.getBoundingClientRect(), css = getComputedStyle(el);
            return {name, x:r.x-cabinet.x, y:r.y-cabinet.y, width:r.width, height:r.height,
              fontSize:parseFloat(css.fontSize)||12, color:css.color};
          }
          const selectors = {
            credits:'#credits',bank:'#bank',status:'#machine-status',hint:'#machine-hint',
            marquee:'#attract-message',coin:'#coin-button',spin:'#spin-button',cash:'#cashout-button',
            coinLabel:'#coin-button > span:not(.coin-slot)',spinLabel:'#spin-button > span',
            cashLabel:'#cashout-button > span',tray:'#tray-label',window:'#reel-window'
          };
          const elements = Object.entries(selectors).map(([n,s]) => box(document.querySelector(s), n));
          document.querySelectorAll('.reel canvas').forEach((el,i) => elements.push(box(el,'reel'+i)));
          document.querySelectorAll('.hold-button').forEach((el,i) => {
            elements.push(box(el,'hold'+i)); elements.push(box(el.querySelector('.action-label'),'holdLabel'+i));
          });
          document.querySelectorAll('.held-label').forEach((el,i) => elements.push(box(el,'held'+i)));
          const lamps = [...document.querySelectorAll('.bulb,.perimeter-bulb')].map((el,i) => {
            const b = box(el,'lamp'+i);
            b.color = getComputedStyle(el).getPropertyValue('--bulb-color').trim();
            b.phase = parseInt(el.style.getPropertyValue('--i')); return b;
          });
          return {width:cabinet.width,height:cabinet.height,elements,lamps};
        }""")
        (PACKAGE / "Data/cabinet-layout.json").write_text(json.dumps(layout, indent=2) + "\n")
        # Visibility preserves the exact approved layout; the native UI fills these holes.
        page.add_style_tag(content="""
          html,body {background:transparent!important}
          .bar-environment,.site-header,.intro-panel,.site-footer,.machine-caption,.machine-shadow {visibility:hidden!important}
          #cabinet {box-shadow:none!important}
          #cabinet canvas,.held-label,#credits,#bank,#machine-status,#machine-hint,#attract-message,
          .action-label,#coin-button > span:not(.coin-slot),#spin-button > span,#cashout-button > span,
          #tray-label {visibility:hidden!important}
          .bulb,.perimeter-bulb {animation:none!important;opacity:.3!important;box-shadow:none!important}
          * {transition:none!important}
        """)
        for selector in ["#coin-button", "#spin-button", "#cashout-button", ".hold-button"]:
            page.locator(selector).evaluate_all("els => els.forEach(el => el.disabled = true)")
        page.locator("#cabinet").screenshot(path=str(PACKAGE / "Art/cabinet-front.png"), omit_background=True)
        for name, selector in [("coin", "#coin-button"), ("spin", "#spin-button"),
                               ("cash", "#cashout-button"), ("hold", ".hold-button")]:
            page.locator(selector).first.evaluate("el => el.disabled = false")
            page.locator(selector).first.screenshot(path=str(PACKAGE / f"Art/button-{name}.png"), omit_background=True)
            page.locator(selector).first.evaluate("el => el.disabled = true")
        page.locator(".peseta").evaluate("el => el.style.visibility = 'visible'")
        page.locator(".peseta").screenshot(path=str(PACKAGE / "Art/coin-25.png"), omit_background=True)
        atlas = page.evaluate("""async () => {
          const {STRIPS,SYMBOLS} = await import('./game.mjs');
          const images = {};
          await Promise.all(SYMBOLS.map(async name => { const img = new Image();
            img.src='assets/'+name+'.svg'; await img.decode(); images[name]=img; }));
          const c=document.createElement('canvas');c.width=256;c.height=256*SYMBOLS.length;
          const x=c.getContext('2d');
          SYMBOLS.forEach((s,i)=>x.drawImage(images[s],0,(SYMBOLS.length-1-i)*256,256,256));
          return {image:c.toDataURL(),strips:STRIPS.map(s=>s.map(n=>SYMBOLS.indexOf(n)))};
        }""")
        save_data_url(PACKAGE / "Art/symbol-atlas.png", atlas["image"])
        (PACKAGE / "Data/reel-strips.json").write_text(json.dumps({"strips": atlas["strips"]}) + "\n")
        for old in (PACKAGE / "Art").glob("reel-strip-*"):
            old.unlink()
        glow = page.evaluate("""() => {
          const c=document.createElement('canvas');c.width=c.height=64;
          const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);
          [[0,'#fff'],[.12,'#fffffff2'],[.25,'#ffffffaa'],[.52,'#ffffff38'],[1,'#ffffff00']].forEach(([p,v])=>g.addColorStop(p,v));
          x.fillStyle=g;x.fillRect(0,0,64,64);return c.toDataURL();
        }""")
        save_data_url(PACKAGE / "Art/lamp-glow.png", glow)
        for name in ["chigre", "coast"]:
            data = page.evaluate("""async name => {
              const img=new Image();img.src='assets/'+name+'.webp';await img.decode();
              const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
              c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/jpeg',.94);
            }""", name)
            save_data_url(PACKAGE / f"Art/{name}.jpg", data)
        jobs = [("coin", .5), ("payoutCoin", .5), ("click", .25), ("stop0", .6),
                ("stop1", .6), ("stop2", .6), ("bonus", 1), ("anticipation", 1.3),
                ("win", 1.7), ("jackpot", 2.4), ("attract", 1), ("motor", 2),
                ("welcome-voice", 2.3), ("prize-voice", 2.7)]
        for name, seconds in jobs:
            data = page.evaluate("""async ({name,seconds}) => {
              const {MachineAudio}=await import('./audio.mjs');
              const offline=new OfflineAudioContext(1,Math.ceil(seconds*44100),44100);
              Object.defineProperty(offline,'state',{get:()=> 'running'});
              const Original=window.AudioContext;window.AudioContext=function(){return offline};
              const random=Math.random;let seed=1234;
              Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
              const audio=new MachineAudio();await audio.unlock();await audio.sampleReady;
              if(name.endsWith('-voice')) audio.playVoice(name==='welcome-voice'?'welcome':'prize');
              else {
                audio.playVoice=()=>{};
                if(name.startsWith('stop')) audio.stop(Number(name.slice(-1)));
                else if(name==='motor') audio.startMotor();
                else if(name==='jackpot') audio.win(true);
                else audio[name]();
              }
              const buffer=await offline.startRendering(), samples=buffer.getChannelData(0);
              const start=name==='motor'?44100:0;
              const bytes=new Uint8Array((samples.length-start)*2),view=new DataView(bytes.buffer);
              for(let i=start;i<samples.length;i++)view.setInt16((i-start)*2,Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),true);
              let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
              window.AudioContext=Original;Math.random=random;return btoa(binary);
            }""", {"name": name, "seconds": seconds})
            with wave.open(str(PACKAGE / f"Audio/{name}.wav"), "wb") as wav:
                wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(44100)
                wav.writeframes(base64.b64decode(data))
        browser.close()
    for src in (ROOT / "tragaperras/assets/fonts").glob("*.woff2"):
        font = TTFont(src); font.flavor = None
        font.save(PACKAGE / "Fonts" / (src.stem + ".ttf"))
    for src in (ROOT / "tragaperras/assets/fonts").glob("*OFL.txt"):
        # Normalize whitespace only; preserve every copyright notice and license word.
        (PACKAGE / "Fonts" / src.name).write_text("\n".join(line.rstrip() for line in src.read_text().splitlines()) + "\n")
    for src in (ROOT / "tragaperras/assets").glob("*.svg"):
        subprocess.run(["inkscape", str(src), "--export-width=256", "--export-height=256",
                        "--export-filename=" + str(PACKAGE / "Art" / (src.stem + ".png"))], check=True, capture_output=True)
    print(f"Exported approved artwork, 82 lamp positions, symbol atlas, 14 WAVs and fonts to {PACKAGE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:4173/tragaperras/")
    export(parser.parse_args().url)
