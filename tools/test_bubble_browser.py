#!/usr/bin/env python3
"""Behavioral browser checks for the actual arcade controls, host and audio."""
import json
import tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
from export_bubble import export

ARTIFACTS = Path('/workspace/artifacts/bubble-parade')
ARTIFACTS.mkdir(parents=True, exist_ok=True)
URL = 'http://127.0.0.1:4173/burbujas/'


def ready(page):
    page.wait_for_function("window.BubbleParade && document.getElementById('coin-prompt').textContent !== 'UN MOMENTO…'")


def snapshot(page):
    return page.evaluate('BubbleParade.estado()')


def set_scene(page, stage=0, chain=False):
    page.evaluate("""async ({stage,chain}) => {
      const {BubbleGame}=await import('./game.mjs');
      const g=new BubbleGame({pesetas:500,seed:1991});g.insertCoin();g.start(1);
      g.state.stage=stage;g.loadStage();const p=g.state.players[0];p.inv=60;
      if(chain){
        p.x=390;p.y=504;
        g.state.enemies=g.state.enemies.slice(0,3);
        g.state.bubbles=g.state.enemies.map((e,i)=>{
          const id=g.state.nextId++;e.trapped=id;
          return {id,owner:0,x:475+i*38,y:504,r:27,vx:0,age:1,life:6,enemy:e.id,phase:0};
        });
      }
      BubbleParade.iniciar({Pesetas:500,Semilla:1991},g.snapshot());
    }""", {'stage': stage, 'chain': chain})


with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    errors=[]
    page=browser.new_page(viewport={'width':1440,'height':1120})
    page.on('pageerror', lambda e:errors.append(str(e)))
    page.goto(URL);ready(page)
    page.screenshot(path=str(ARTIFACTS/'attract.png'),full_page=True)
    page.keyboard.press('m');page.keyboard.press('m');page.keyboard.press('m')
    assert snapshot(page)['wallet']==425 and snapshot(page)['credits']==3
    page.keyboard.press('2');page.wait_for_timeout(1750)
    state=snapshot(page)
    assert state['mode']=='play' and len(state['players'])==2 and state['credits']==1 and state['spent']==50
    page.keyboard.down('d');page.keyboard.down('f');page.wait_for_timeout(350)
    page.keyboard.up('d');page.keyboard.up('f')
    assert snapshot(page)['players'][0]['x']>state['players'][0]['x']+30
    page.keyboard.down('ArrowLeft');page.keyboard.down('k');page.wait_for_timeout(250)
    page.keyboard.up('ArrowLeft');page.keyboard.up('k')
    assert snapshot(page)['players'][1]['x']<state['players'][1]['x']-15
    page.screenshot(path=str(ARTIFACTS/'coop.png'),full_page=True)

    page.keyboard.press('p');before=snapshot(page)
    canvas_before=page.locator('#game-canvas').evaluate('c=>c.toDataURL()')
    page.wait_for_timeout(500)
    assert snapshot(page)==before
    assert page.locator('#game-canvas').evaluate('c=>c.toDataURL()')==canvas_before
    page.reload();ready(page)
    after=snapshot(page)
    assert after['spent']==50 and after['wallet']==425 and after['credits']==1 and len(after['players'])==2
    page.evaluate('BubbleParade.pausar(true)');held=snapshot(page)
    page.keyboard.press('p');page.wait_for_timeout(100)
    assert snapshot(page)==held and page.locator('#resume-button').is_disabled()
    page.keyboard.press('h');assert page.locator('#help-dialog').evaluate('d=>d.open')
    page.keyboard.press('Escape');assert not page.locator('#help-dialog').evaluate('d=>d.open')
    assert snapshot(page)['paused']
    page.evaluate('BubbleParade.pausar(false)')

    set_scene(page,chain=True)
    page.keyboard.down('g');page.wait_for_timeout(100);page.keyboard.up('g')
    state=snapshot(page)
    assert state['bestChain']==3 and state['runScore']>=9000 and len(state['enemies'])==0
    page.screenshot(path=str(ARTIFACTS/'chain.png'),full_page=True)
    page.wait_for_timeout(2350)
    assert snapshot(page)['stage']==1 and snapshot(page)['mode']=='play'
    for stage in [2,4]:
        set_scene(page,stage=stage);page.wait_for_timeout(200)
        page.screenshot(path=str(ARTIFACTS/('world-'+str(stage//2+1)+'.png')),full_page=True)

    # One completion event, real unused-credit refund, and no input after finish.
    page.evaluate("window.finishedEvents=[];window.addEventListener('minijuego:fin',e=>finishedEvents.push(e.detail))")
    page.keyboard.press('m');original=snapshot(page)
    result=page.evaluate('BubbleParade.terminar()')
    assert result['pesetasDelta']==-25 and snapshot(page)['wallet']==475
    page.evaluate('BubbleParade.terminar()');page.keyboard.press('m')
    assert page.evaluate('finishedEvents.length')==1 and snapshot(page)['wallet']==475

    # Real pointer events drive the joystick and arcade action buttons.
    page.evaluate('BubbleParade.iniciar({Pesetas:125,Semilla:1})')
    page.click('#coin-button');page.click('[data-start="1"]');page.wait_for_timeout(100)
    stick=page.locator('[data-joystick="0"]');box=stick.bounding_box()
    old_x=snapshot(page)['players'][0]['x']
    page.mouse.move(box['x']+box['width']*.88,box['y']+box['height']*.35)
    page.mouse.down();page.wait_for_timeout(300);page.mouse.up()
    assert snapshot(page)['players'][0]['x']>old_x+30
    shoot=page.locator('[data-action="shoot"][data-player="0"]');box=shoot.bounding_box()
    page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
    page.mouse.down();page.wait_for_timeout(100);page.mouse.up()
    assert snapshot(page)['bubbles'] or snapshot(page)['players'][0]['score']>0

    # Standard gamepad mapping uses the browser's real polling code with a test device.
    page.evaluate("""() => {
      window.testPad={index:0,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
      navigator.getGamepads=()=>[testPad];BubbleParade.iniciar({Pesetas:125,Semilla:1});
    }""")
    def pad(button):
        page.evaluate('(i)=>{testPad.buttons[i].pressed=true}',button);page.wait_for_timeout(60)
        page.evaluate('(i)=>{testPad.buttons[i].pressed=false}',button);page.wait_for_timeout(60)
    pad(3);pad(0);assert snapshot(page)['mode']=='play'
    old_x=snapshot(page)['players'][0]['x'];page.evaluate('testPad.axes[0]=1');page.wait_for_timeout(250)
    page.evaluate('testPad.axes[0]=0');assert snapshot(page)['players'][0]['x']>old_x+25
    pad(9);assert snapshot(page)['paused'];pad(9);assert not snapshot(page)['paused']

    for width,height in [(1280,800),(768,1024),(390,844),(320,740)]:
        device=browser.new_page(viewport={'width':width,'height':height})
        device.on('pageerror',lambda e:errors.append(str(e)));device.goto(URL);ready(device)
        assert not device.evaluate('document.documentElement.scrollWidth>innerWidth'),width
        device.screenshot(path=str(ARTIFACTS/('screen-'+str(width)+'.png')),full_page=True)
        device.close()

    # Render the actual synthesis graph, including music, impacts and mute.
    sound=page.evaluate("""async () => {
      const {BubbleAudio}=await import('./audio.mjs');
      async function render(muted){
        const context=new OfflineAudioContext(2,44100*8,44100);
        Object.defineProperty(context,'state',{get:()=> 'running'});
        const audio=new BubbleAudio(context);audio.setMuted(muted);await audio.unlock();audio.scheduleMusic(8);
        for(const event of [{type:'coin'},{type:'shoot',player:0},{type:'pop',player:1,chain:4},{type:'clear'}])audio.event(event);
        const buffer=await context.startRendering();let peak=0,power=0;
        for(let channel=0;channel<2;channel++)for(const value of buffer.getChannelData(channel)){peak=Math.max(peak,Math.abs(value));power+=value*value;}
        return {peak,rms:Math.sqrt(power/(buffer.length*2))};
      }
      return {audible:await render(false),muted:await render(true)};
    }""")
    assert sound['audible']['rms']>.005 and sound['audible']['peak']<.99,sound
    assert sound['muted']['peak']==0,sound

    # Exercise the real iframe message path and keep the standalone visit isolated.
    host=browser.new_page(viewport={'width':1440,'height':1120})
    host.on('pageerror',lambda e:errors.append(str(e)))
    host.goto('http://127.0.0.1:4173/docs/SIGUIENTE_MINIJUEGO.md')
    host.set_content('''<script>window.hostResults=[];addEventListener('message',e=>{
      if(e.source===document.getElementById('arcade').contentWindow&&e.data?.tipo==='fin')hostResults.push(e.data);
    });</script><iframe id="arcade" src="http://127.0.0.1:4173/burbujas/" width="1400" height="1100"></iframe>''')
    frame=host.frame_locator('#arcade');arcade=host.frames[1]
    arcade.wait_for_function("window.BubbleParade && document.getElementById('coin-prompt').textContent !== 'UN MOMENTO…'")
    standalone=arcade.evaluate("localStorage.getItem('bubble-parade:visit:v2')")
    def send_host(message):
        host.evaluate("message=>document.getElementById('arcade').contentWindow.postMessage(message,location.origin)",message)
    send_host({'tipo':'iniciar','id':'burbujas','contexto':{'Pesetas':125,'Semilla':1991}})
    arcade.wait_for_function('BubbleParade.estado().initialWallet===125')
    frame.locator('#coin-button').click();frame.locator('#coin-button').click();frame.locator('#attract [data-start="1"]').click()
    send_host({'tipo':'pausar','id':'burbujas','pausa':True})
    arcade.wait_for_function('BubbleParade.estado().paused');held=arcade.evaluate('BubbleParade.estado()')
    host.wait_for_timeout(120);assert arcade.evaluate('BubbleParade.estado()')==held
    send_host({'tipo':'terminar','id':'burbujas'})
    host.wait_for_function('hostResults.length===1')
    send_host({'tipo':'terminar','id':'burbujas'});host.wait_for_timeout(100)
    assert host.evaluate('hostResults.length')==1
    assert host.evaluate('hostResults[0].pesetasDelta')==-25 and arcade.evaluate('BubbleParade.estado().wallet')==100
    assert arcade.evaluate("localStorage.getItem('bubble-parade:visit:v2')")==standalone
    host.close()

    # Run the exact exported HTML in an offline document with no HTTP requests.
    with tempfile.TemporaryDirectory() as directory:
        html=Path(directory)/'bubble-parade.html';export(html)
        offline=browser.new_context(offline=True,viewport={'width':1280,'height':900})
        offline_page=offline.new_page();requests=[]
        offline_page.on('pageerror',lambda e:errors.append(str(e)))
        offline_page.on('request',lambda r:requests.append(r.url) if r.url.startswith(('http:','https:')) else None)
        offline_page.set_content(html.read_text(),wait_until='load');ready(offline_page)
        offline_page.click('#coin-button');offline_page.click('[data-start="1"]');offline_page.wait_for_timeout(100)
        assert snapshot(offline_page)['mode']=='play'
        offline_page.click('#footer-exit');assert snapshot(offline_page)['mode']=='finished'
        assert not requests,requests
        offline.close()
    assert not errors,errors
    print(json.dumps({'result':'PASS','controls':['keyboard','pointer','gamepad'],'layouts':5,'host':'iframe, single finish event, refund and save isolation','offlineHTTPRequests':0,'audio':sound,'pageErrors':errors},ensure_ascii=False))
    browser.close()
