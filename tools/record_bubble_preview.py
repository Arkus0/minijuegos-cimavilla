#!/usr/bin/env python3
"""Record a short visual tour with the game's actual audio, plus showcase screenshots."""
import base64
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT=Path('/workspace/artifacts/bubble-parade');OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1340},record_video_dir=str(OUT/'recording'),record_video_size={'width':1440,'height':1340})
    page=context.new_page()
    page.add_init_script("""(() => {
      const Native=window.AudioContext;window.AudioContext=function(...args){
        const c=new Native(...args);window.captureContext=c;window.captureDestination=c.createMediaStreamDestination();
        const original=c.createDynamicsCompressor.bind(c);
        c.createDynamicsCompressor=()=>{const n=original(),connect=n.connect.bind(n);
          n.connect=(target,...rest)=>{const result=connect(target,...rest);if(target===c.destination)connect(captureDestination);return result;};return n;};return c;
      };
    })();""")
    page.goto('http://127.0.0.1:4173/burbujas/')
    page.wait_for_function("document.getElementById('coin-prompt').textContent!=='UN MOMENTO…'")
    page.wait_for_timeout(700);page.screenshot(path=str(OUT/'attract-final.png'),full_page=True)
    page.keyboard.press('m')
    page.evaluate("""() => {
      window.recordedAudio=[];window.audioRecorder=new MediaRecorder(captureDestination.stream,{mimeType:'audio/webm'});
      audioRecorder.ondataavailable=e=>recordedAudio.push(e.data);audioRecorder.start();
    }""")
    page.keyboard.press('m');page.keyboard.press('2');page.wait_for_timeout(1700)
    page.keyboard.down('d');page.keyboard.down('f');page.keyboard.down('ArrowLeft');page.keyboard.down('k');page.wait_for_timeout(650)
    page.keyboard.up('d');page.keyboard.up('ArrowLeft');page.keyboard.down('w');page.wait_for_timeout(400);page.keyboard.up('w')
    page.keyboard.down('g');page.wait_for_timeout(700);page.keyboard.up('g');page.keyboard.up('f');page.keyboard.up('k')
    for stage in [2,4]:
        page.evaluate("""async stage=>{
          const {BubbleGame}=await import('./game.mjs');const g=new BubbleGame({seed:1991});g.insertCoin();g.start(1);
          g.state.stage=stage;g.loadStage();g.state.players[0].inv=60;
          BubbleParade.iniciar({Pesetas:500,Semilla:1991},g.snapshot());
        }""",stage)
        page.keyboard.down('d');page.keyboard.down('f');page.wait_for_timeout(600)
        page.keyboard.up('d');page.keyboard.down('w');page.wait_for_timeout(400);page.keyboard.up('w')
        page.wait_for_timeout(450);page.keyboard.up('f')
        page.screenshot(path=str(OUT/('tour-world-'+str(stage//2+1)+'.png')),full_page=True)
    page.evaluate("""async()=>{
      const {BubbleGame}=await import('./game.mjs');const g=new BubbleGame({seed:1991});g.insertCoin();g.start(1);
      const p=g.state.players[0];p.x=390;p.y=504;p.inv=60;
      g.state.bubbles=g.state.enemies.slice(0,3).map((e,i)=>{
        const id=g.state.nextId++;e.trapped=id;
        return{id,owner:0,x:475+i*38,y:504,r:27,vx:0,age:1,life:6,enemy:e.id,phase:0};
      });BubbleParade.iniciar({Pesetas:500,Semilla:1991},g.snapshot());
    }""")
    page.keyboard.down('g');page.wait_for_timeout(110);page.keyboard.up('g')
    page.screenshot(path=str(OUT/'chain-showcase.png'),full_page=True);page.wait_for_timeout(1100)
    audio=page.evaluate("""()=>new Promise(resolve=>{
      audioRecorder.onstop=async()=>{
        const blob=new Blob(recordedAudio,{type:'audio/webm'}),bytes=new Uint8Array(await blob.arrayBuffer());
        let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));resolve(btoa(s));
      };audioRecorder.stop();
    })""")
    (OUT/'audio.webm').write_bytes(base64.b64decode(audio));video=page.video
    context.close();video_path=video.path();browser.close()
subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',video_path,'-itsoffset','1','-i',str(OUT/'audio.webm'),
                '-c:v','libx264','-preset','fast','-crf','22','-c:a','aac','-b:a','160k','-pix_fmt','yuv420p','-shortest',
                '/workspace/artifacts/bubble-parade.mp4'],check=True)
print('Recorded visual tour with actual FM music and effects:',Path('/workspace/artifacts/bubble-parade.mp4').stat().st_size)
