#!/usr/bin/env python3
"""Export native sprite metadata, level data and the actual synthesis as Unity audio.

Serve the repository on port 4173. Requires Node, Playwright, Pillow, fontTools with brotli and FFmpeg.
Output is an asset kit, not a native implementation of the game.
"""
import argparse
import base64
import json
import shutil
import subprocess
import wave
import zipfile
from pathlib import Path
from PIL import Image
from fontTools.ttLib import TTFont
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
GAME=ROOT/'burbujas'


def export(folder):
    out=Path(folder);base=out/'Assets/BubbleParade'
    for name in ['Art','Fonts','Audio','Data']:(base/name).mkdir(parents=True,exist_ok=True)
    for path in (GAME/'assets/art').glob('*'):shutil.copyfile(path,base/'Art'/path.name)
    for path in (GAME/'assets/fonts').glob('*'):
        if path.suffix in ['.ttf','.txt']:shutil.copyfile(path,base/'Fonts'/path.name)
        if path.suffix=='.woff2' and not path.name.startswith('lilita'):
            font=TTFont(path);font.flavor=None;font.save(base/'Fonts'/(path.stem+'.ttf'))
    raw=subprocess.check_output(['node','--input-type=module','-e',
        "import{WIDTH,HEIGHT,FLOOR,STAKE,LEVELS,WORLDS,INPUT_ACTIONS}from'./burbujas/levels.mjs';console.log(JSON.stringify({width:WIDTH,height:HEIGHT,floor:FLOOR,stake:STAKE,levels:LEVELS,worlds:WORLDS,keys:INPUT_ACTIONS}));"],cwd=ROOT)
    (base/'Data/levels.json').write_bytes(raw)
    frames=[]
    poses=['idle','run1','run2','run3','jump','shoot','hurt','win']
    for file,cols,rows,names in [('heroes.png',4,4,[p+'_'+pose for p in ['pip','pop'] for pose in poses]),
                               ('enemies.png',4,2,[p+'_'+pose for pose in ['a','b'] for p in ['mush','hopper','bat','rotor']])]:
        with Image.open(GAME/'assets/art'/file) as image:
            w,h=image.size
        for i,name in enumerate(names):
            frames.append({'file':file,'name':name,'x':i%cols*w/cols,'y':h-(i//cols+1)*h/rows,
                'width':w/cols,'height':h/rows,'pivotX':.5,'pivotY':.045,'pixelsPerUnit':60})
    (base/'Data/sprites.json').write_text(json.dumps({'coordinates':'Unity bottom-left','frames':frames},indent=2)+'\n')
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page();page.goto('http://127.0.0.1:4173/burbujas/');page.wait_for_function('window.BubbleParade')
        jobs=[('garden-theme',0,29.090909),('crystal-theme',1,30.967742),('factory-theme',2,26.666667)]
        jobs+=[('coin',{'type':'coin'},.5),('shoot',{'type':'shoot', 'player':0},.3),
               ('capture',{'type':'capture','player':0},.5),('pop',{'type':'pop','player':0,'chain':1},.5),
               ('chain',{'type':'pop','player':0,'chain':5},.5),('jump',{'type':'jump','player':0},.3),
               ('burst',{'type':'burst','player':0},.25),('collect',{'type':'collect','player':0},.3),
               ('hurt',{'type':'hurt','player':0},.5),('escape',{'type':'escape'},.5),
               ('life',{'type':'life','player':0},.7),('start',{'type':'start'},.8),
               ('clear',{'type':'clear'},1.3),('victory',{'type':'end','won':True},1.4),('over',{'type':'end','won':False},1.2)]
        soundbank=[]
        for name,event,seconds in jobs:
            music=isinstance(event,int);channels=2 if music else 1
            data=page.evaluate("""async ({event,seconds,music,channels})=>{
              const {BubbleAudio}=await import('./audio.mjs');
              const duration=music?seconds*2+.4:seconds;
              const context=new OfflineAudioContext(channels,Math.ceil(duration*44100),44100);
              Object.defineProperty(context,'state',{get:()=> 'running'});
              const audio=new BubbleAudio(context);await audio.unlock();
              if(music){audio.world=event;audio.nextBeat=0;audio.scheduleMusic(duration);}else audio.event(event);
              const buffer=await context.startRendering(),start=music?Math.round(seconds*44100):0,count=Math.round(seconds*44100);
              const samples=Array.from({length:channels},(_,i)=>buffer.getChannelData(i));
              const bytes=new Uint8Array(count*channels*2),view=new DataView(bytes.buffer);let peak=0,power=0;
              for(let i=0;i<count;i++)for(let c=0;c<channels;c++){
                const value=samples[c][start+i];peak=Math.max(peak,Math.abs(value));power+=value*value;
                view.setInt16((i*channels+c)*2,Math.round(Math.max(-1,Math.min(1,value))*32767),true);
              }
              let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
              return {pcm:btoa(binary),peak,rms:Math.sqrt(power/(count*channels))};
            }""",{'event':event,'seconds':seconds,'music':music,'channels':channels})
            assert 0<data['peak']<.99 and data['rms']>0,(name,data['peak'],data['rms'])
            wave_path=base/'Audio'/(name+'.wav')
            with wave.open(str(wave_path),'wb') as wav:
                wav.setnchannels(channels);wav.setsampwidth(2);wav.setframerate(44100);wav.writeframes(base64.b64decode(data['pcm']))
            if music:
                dest=wave_path.with_suffix('.ogg')
                subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wave_path),'-c:a','libvorbis','-q:a','5',str(dest)],check=True)
                wave_path.unlink()
            else:dest=wave_path
            soundbank.append({'name':name,'file':dest.name,'loop':music,'seconds':seconds,'channels':channels,
                              'peak':data['peak'],'rms':data['rms']})
        browser.close()
    (base/'Data/audio.json').write_text(json.dumps({'sampleRate':44100,'clips':soundbank},indent=2)+'\n')
    shutil.copyfile(GAME/'UNITY_PORT.md',out/'README.md')
    archive=out.with_suffix('.zip')
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for path in out.rglob('*'):
            if path.is_file():z.write(path,path.relative_to(out))
    print(f'Unity asset kit: {archive} ({archive.stat().st_size:,} bytes); 24 sprite rectangles, 6 stages, 18 audio clips.')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('folder',nargs='?',default='/tmp/bubble-parade-unity-assets')
    export(parser.parse_args().folder)
