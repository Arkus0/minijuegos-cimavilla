import { BubbleGame, FixedClock, STAKE, LEVELS } from './game.mjs';
import { WORLDS } from './levels.mjs';
import { ArcadeRenderer } from './render.mjs';
import { ArcadeInput } from './input.mjs';
import { BubbleAudio } from './audio.mjs';
import { demoInput } from './demo.mjs';

const $=id=>document.getElementById(id),SAVE='bubble-parade:visit:v2',RECORDS='bubble-parade:records:v1',PREFS='bubble-parade:prefs:v1';
const readStore=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const putStore=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
const removeStore=key=>{try{localStorage.removeItem(key);}catch{}};
const initial=readStore(SAVE,null),prefs=readStore(PREFS,{muted:false,crt:false});
let game=new BubbleGame({seed:Date.now(),snapshot:initial?.state});
if(game.state.finished)game=new BubbleGame({seed:Date.now()});
let visitId=initial?.id||String(Date.now()),recorded=new Set(Array.isArray(initial?.recorded)?initial.recorded:[]);
let records=readStore(RECORDS,[{name:'KIR',score:24500,players:1},{name:'PIP',score:18000,players:1},{name:'POP',score:15000,players:2}]);
records=Array.isArray(records)?records.filter(r=>r&&typeof r.name==='string'&&Number.isSafeInteger(r.score)&&r.score>=0).slice(0,5):[];
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const renderer=new ArcadeRenderer($('game-canvas'),{reduced}),audio=new BubbleAudio(),clock=new FixedClock();
let demo,hostSession=false,finished=false,ready=false,sessionToken=0,hostOrigin='*',previous=performance.now(),saveClock=0;
let pauseReasons=new Set(),introTime=0,chainTime=0,toastTime=0,uiSignature='',padsCount=0,audioReady=null;
const gameReady=()=>['attract','over','victory'].includes(game.state.mode);
const input=new ArcadeInput({shortcut:handleShortcut,menu:gameReady,onPad:count=>{padsCount=count;},interact:()=>{if(!audio.active&&!game.state.paused&&!finished)unlock();}});

function makeDemo(){demo=new BubbleGame({pesetas:25,seed:31691});demo.insertCoin();demo.start(1);demo.drainEvents();}
makeDemo();
function save(){if(!hostSession&&!finished)putStore(SAVE,{id:visitId,state:game.snapshot(),recorded:[...recorded]});}
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');toastTime=2.3;}
function unlock(){const token=sessionToken;audioReady=audio.unlock();audioReady.then(()=>{if(token!==sessionToken||finished)audio.stop();else audio.setWorld(LEVELS[game.state.stage].world);});}
function rememberPreferences(){putStore(PREFS,{muted:audio.muted,crt:$('screen').classList.contains('crt')});}
function setMuted(value){audio.setMuted(value);$('sound-button').classList.toggle('is-muted',value);$('sound-button').setAttribute('aria-pressed',String(value));$('sound-button').setAttribute('aria-label',value?'Activar sonido':'Silenciar sonido');$('sound-label').textContent=value?'SILENCIO':'SONIDO';rememberPreferences();}
function setCRT(value){$('screen').classList.toggle('crt',value);$('crt-label').textContent=value?'ON':'OFF';$('crt-button').setAttribute('aria-pressed',String(value));rememberPreferences();}
function pause(reason,value){
  if(value)pauseReasons.add(reason);else pauseReasons.delete(reason);
  const paused=pauseReasons.size>0;game.pause(paused);audio.pause(paused);input.clear();
  $('cabinet').classList.toggle('is-paused',paused);
  $('pause-panel').hidden=!(pauseReasons.has('manual')||pauseReasons.has('host'))||$('help-dialog').open||$('visit-dialog').open;
  $('resume-button').disabled=pauseReasons.has('host');$('resume-button').textContent=pauseReasons.has('host')?'ESPERANDO AL JUEGO':'CONTINUAR · P';
  $('pause-note').textContent=pauseReasons.has('host')?'La partida continuará cuando vuelva el juego principal.':'Los bichos también descansan.';
  uiSignature='';renderUI();
}
function togglePause(){if(finished||pauseReasons.has('host'))return;pause('manual',!pauseReasons.has('manual'));}
function help(open=true){if(open){pause('help',true);if(!$('help-dialog').open)$('help-dialog').showModal();}else{$('help-dialog').close();pause('help',false);}}
function insertCoin(){
  if(!ready||finished||game.state.paused)return;
  if(!game.insertCoin()){toast('No quedan pesetas. El crédito que no juegues se devuelve al salir.');return;}
  unlock();processEvents();uiSignature='';renderUI();save();
}
function start(count){
  if(!ready||finished)return;
  if(!game.start(count)){
    if(!game.state.paused&&gameReady())toast(count===2?'El cooperativo necesita dos créditos. Mete otra moneda.':'Primero mete una moneda con M.');return;
  }
  unlock();input.clear();clock.reset();renderer.reset();chainTime=0;processEvents();uiSignature='';renderUI();save();
  $('game-canvas').setAttribute('tabindex','0');$('game-canvas').focus({preventScroll:true});
}
function handleShortcut(code){
  if(code==='KeyH'){help(!$('help-dialog').open);return;}
  if(code==='Escape'&&$('help-dialog').open){help(false);return;}
  if(code==='KeyP'||code==='Escape'){togglePause();return;}
  if(code==='KeyV'){unlock();setMuted(!audio.muted);return;}
  if(code==='KeyM')insertCoin();if(code==='Digit1')start(1);if(code==='Digit2')start(2);
}
function recordKey(){return visitId+':'+game.state.runs;}
function submitRecord(){
  const s=game.state;if(s.runs<1||s.runScore<1||recorded.has(recordKey()))return;
  const name=$('initials').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,3)||'AAA';
  records.push({name,score:s.runScore,players:s.players.length});records.sort((a,b)=>b.score-a.score);records=records.slice(0,5);
  recorded.add(recordKey());putStore(RECORDS,records);renderRecords();$('record-form').hidden=true;save();toast('Marca guardada. ¡A por la siguiente!');
}
function renderRecords(){
  const list=$('records');list.replaceChildren();
  records.slice(0,3).forEach((record,i)=>{const li=document.createElement('li'),name=document.createElement('b'),score=document.createElement('span'),tag=document.createElement('small');
    name.textContent=(i+1)+'. '+record.name.replace(/[^A-Za-z0-9]/g,'').slice(0,3);score.textContent=record.score.toString().padStart(6,'0');tag.textContent=(record.players===2?'2P':'1P');score.append(tag);li.append(name,score);list.append(li);});
  uiSignature='';
}
function processEvents(){
  for(const event of game.drainEvents()){
    renderer.event(event);
    if(event.type==='stage'){
      introTime=1.65;$('intro-stage').textContent='STAGE '+String(event.stage+1).padStart(2,'0');
      $('intro-name').textContent=WORLDS[LEVELS[event.stage].world].name;
      $('intro-tip').textContent=event.stage===0?'F atrapa · G estalla · Agrupa para ganar más puntos.':LEVELS[event.stage].name;
      audio.setWorld(LEVELS[event.stage].world);audio.music?.gain.setTargetAtTime(.58,audio.context.currentTime,.12);
    }
    if(event.type==='chain'&&event.chain>1){chainTime=1.25;$('chain-label').textContent=event.chain>=4?'¡QUÉ TRAVESURA!':'¡CADENA!';$('chain-value').textContent='×'+event.chain;$('chain-points').textContent='+'+event.points;}
    if(event.type==='clear'){$('clear-kicker').textContent=event.perfect?'¡PERFECTO! NI UN RASGUÑO.':'¡BIEN HECHO!';$('clear-bonus').textContent='BONUS +'+event.bonus;}
    if(event.type==='end'){introTime=0;chainTime=0;input.clear();$('initials').value='AAA';audio.music?.gain.setTargetAtTime(.28,audio.context.currentTime,.18);}
    if(audio.active)audio.event(event);
    else if(audioReady){const token=sessionToken,begun=performance.now();audioReady.then(()=>{
      if(token===sessionToken&&!finished&&!game.state.paused&&performance.now()-begun<350)audio.event(event);
    });}
  }
}
function renderUI(){
  const s=game.state;
  const signature=[s.mode,s.wallet,s.credits,s.paused,s.stage,Math.ceil(s.stageTime),s.runScore,s.bestChain,...s.players.flatMap(p=>[p.score,p.lives]),ready,padsCount,recorded.has(recordKey())].join('|');
  if(signature===uiSignature)return;uiSignature=signature;
  $('wallet').textContent=s.wallet.toLocaleString('es-ES');$('credits').textContent=String(s.credits).padStart(2,'0');
  $('coin-button').disabled=!ready||finished||s.paused||s.wallet<STAKE;
  $('coin-prompt').textContent=!ready?'UN MOMENTO…':s.credits?'READY TO PLAY':'INSERT COIN';
  $('start-hint').textContent=!ready?'La máquina se está encendiendo.':s.credits?'Pulsa 1 o 2. La travesura te espera.':'Mete una moneda con M o pulsa el botón MONEDA.';
  for(const button of document.querySelectorAll('[data-start]'))button.disabled=!ready||finished||s.paused||!gameReady()||s.credits<Number(button.dataset.start);
  $('attract').hidden=s.mode!=='attract';$('game-hud').hidden=s.mode==='attract'||finished;
  $('world-name').textContent=WORLDS[LEVELS[s.stage].world].short;
  $('stage-number').replaceChildren(document.createTextNode(String(s.stage+1).padStart(2,'0')+' '));const total=document.createElement('small');total.textContent='/ 06';$('stage-number').append(total);
  $('timer').textContent=String(Math.ceil(s.stageTime)).padStart(2,'0');$('timer').parentElement.classList.toggle('hurry',s.stageTime<=15);
  for(let i=0;i<2;i++){
    const p=s.players[i];$('score-'+(i+1)).textContent=String(p?.score||0).padStart(6,'0');
    const lives=$('lives-'+(i+1));lives.replaceChildren();lives.setAttribute('aria-label',(p?.lives||0)+' vidas');
    for(let j=0;j<(p?.lives||0);j++)lives.append(document.createElement('i'));
  }
  $('p2-hud').hidden=s.players.length<2;$('join-hud').hidden=s.players.length===2;
  $('cabinet').classList.toggle('mobile-coop',s.players.length===2);
  $('high-score').textContent=String(Math.max(records[0]?.score||0,s.runScore)).padStart(6,'0');
  $('clear-banner').hidden=s.mode!=='clear';$('clear-kicker').textContent=s.stageHits===0?'¡PERFECTO! NI UN RASGUÑO.':'¡BIEN HECHO!';$('clear-bonus').textContent='BONUS +'+s.stageBonus;
  $('end-panel').hidden=!['over','victory','finished'].includes(s.mode);
  $('end-kicker').textContent=s.mode==='victory'?'SEIS FASES. UNA GRAN TRAVESURA.':finished?'TU MARCA SE VIENE CONTIGO.':'OTRA PARTIDA. OTRA OPORTUNIDAD.';
  $('end-title').textContent=s.mode==='victory'?'YOU DID IT!':finished?'HASTA LA PRÓXIMA':'GAME OVER';
  $('end-score').textContent=String(s.runScore).padStart(6,'0');$('end-summary').textContent='Fase '+(s.stage+1)+' de 6 · Mejor cadena ×'+Math.max(1,s.runBestChain);
  $('record-form').hidden=s.runScore<1||recorded.has(recordKey());
  $('end-credit-note').textContent=finished?'El crédito pendiente ha vuelto al bolsillo.':'M para meter moneda · El crédito pendiente se devuelve al salir.';
  $('pad-status').textContent=padsCount?(padsCount===2?'2 MANDOS':'MANDO CONECTADO'):'';
  $('game-canvas').setAttribute('aria-label','Bubble Parade · fase '+(s.stage+1)+' de 6 · '+s.enemies.length+' enemigos restantes');
}
function finish(){
  if(finished)return game.result();
  if(game.state.runScore>0&&!recorded.has(recordKey()))submitRecord();
  finished=true;sessionToken++;input.clear();audio.stop();pauseReasons.clear();$('cabinet').classList.remove('is-paused');
  $('help-dialog').close();$('visit-dialog').close();$('pause-panel').hidden=true;
  const result=game.finish();if(!hostSession)removeStore(SAVE);uiSignature='';renderUI();
  window.dispatchEvent(new CustomEvent('minijuego:fin',{detail:result}));
  if(window.parent!==window)window.parent.postMessage(result,hostOrigin);
  return result;
}
function initialize(context={},saved=null,host=true){
  if(!finished&&hostSession)finish();sessionToken++;audio.stop();
  game=new BubbleGame({pesetas:context.Pesetas??500,seed:context.Semilla??Date.now(),snapshot:saved});
  hostSession=host;finished=false;document.body.classList.toggle('host-session',host);
  visitId=String(Date.now());recorded=new Set();pauseReasons.clear();clock.reset();input.clear();renderer.reset();
  introTime=chainTime=0;uiSignature='';$('cabinet').classList.remove('is-paused');$('pause-panel').hidden=true;
  $('help-dialog').close();$('visit-dialog').close();makeDemo();renderUI();save();return game.snapshot();
}
for(const button of document.querySelectorAll('[data-start]'))button.addEventListener('click',()=>start(Number(button.dataset.start)));
$('coin-button').addEventListener('click',insertCoin);$('sound-button').addEventListener('click',()=>{unlock();setMuted(!audio.muted);});
$('help-button').addEventListener('click',()=>help());$('close-help').addEventListener('click',()=>help(false));$('help-done').addEventListener('click',()=>help(false));
$('help-dialog').addEventListener('close',()=>pause('help',false));
$('help-dialog').addEventListener('cancel',()=>pause('help',false));
$('pause-button').addEventListener('click',togglePause);$('resume-button').addEventListener('click',()=>pause('manual',false));
$('crt-button').addEventListener('click',()=>setCRT(!$('screen').classList.contains('crt')));
$('fullscreen-button').addEventListener('click',()=>{const pending=document.fullscreenElement?document.exitFullscreen():$('cabinet').requestFullscreen?.();pending?.catch(()=>toast('Tu navegador no permite pantalla completa.'));});
for(const id of ['exit-link','footer-exit'])$(id).addEventListener('click',event=>{event.preventDefault();finish();if(!hostSession&&!window.BubbleParadeOffline)location.href='../index.html';});
$('record-form').addEventListener('submit',e=>{e.preventDefault();submitRecord();});
$('new-visit').addEventListener('click',()=>{if(hostSession)return;pause('dialog',true);$('visit-dialog').showModal();});
$('cancel-visit').addEventListener('click',()=>{$('visit-dialog').close();pause('dialog',false);});
$('visit-dialog').addEventListener('close',()=>pause('dialog',false));
$('confirm-visit').addEventListener('click',()=>{finish();initialize({},null,false);});
window.addEventListener('blur',()=>pause('focus',true));window.addEventListener('focus',()=>pause('focus',false));
document.addEventListener('visibilitychange',()=>pause('hidden',document.hidden));
window.addEventListener('pagehide',save);
window.addEventListener('message',event=>{
  if(event.source!==window.parent||!event.data||event.data.id!=='burbujas')return;
  const message=event.data;hostOrigin=event.origin==='null'?'*':event.origin;
  if(message.tipo==='iniciar')initialize(message.contexto||{},message.estado||null,true);
  if(message.tipo==='pausar')pause('host',!!message.pausa);
  if(message.tipo==='terminar')finish();
});
window.CimavillaBurbujas={iniciar:(context,state)=>initialize(context,state,true),pausar:value=>pause('host',value),
  terminar:finish,estado:()=>game.snapshot(),guardar:()=>game.snapshot()};
window.BubbleParade={...window.CimavillaBurbujas};
setMuted(!!prefs.muted);setCRT(!!prefs.crt);renderRecords();renderUI();
Promise.all([renderer.ready,document.fonts.ready]).then(()=>{ready=true;uiSignature='';renderUI();});

function frame(now){
  const delta=Math.min(.25,Math.max(0,(now-previous)/1000));previous=now;input.poll();
  clock.advance(delta,game.state.paused||!ready,dt=>{
    if(game.state.mode==='attract'&&!finished){
      if(['over','victory'].includes(demo.state.mode))makeDemo();demo.step(dt,[demoInput(demo)]);
      for(const e of demo.drainEvents())if(['pop','capture'].includes(e.type))renderer.event(e);
    }else if(!finished){game.step(dt,input.read());processEvents();}
    renderer.tick(dt);introTime=Math.max(0,introTime-dt);chainTime=Math.max(0,chainTime-dt);saveClock+=dt;
  });
  if(toastTime>0){toastTime-=delta;if(toastTime<=0)$('toast').classList.remove('visible');}
  $('round-intro').hidden=introTime<=0||game.state.mode!=='play';$('chain-banner').hidden=chainTime<=0||game.state.mode!=='play';
  renderer.draw(game.state.mode==='attract'?demo:game,{attract:game.state.mode==='attract'});renderUI();audio.tick();
  if(saveClock>=.6){saveClock=0;save();}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
