import { WIDTH, HEIGHT, FLOOR, STEP, STAKE, LEVELS } from './levels.mjs';
export { WIDTH, HEIGHT, FLOOR, STEP, STAKE, LEVELS };
const clone = value => structuredClone(value);
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const intersects = (a,b) => a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
const circleHit = (b,a,r=b.r) => Math.hypot(b.x-clamp(b.x,a.x,a.x+a.w),b.y-clamp(b.y,a.y,a.y+a.h)) < r;
const ready = new Set(['attract','over','victory']);
const freshPlayer = i => ({id:i,x:i?824:92,y:FLOOR-48,w:34,h:48,vx:0,vy:0,dir:i?-1:1,
  lives:3,score:0,nextLife:25000,inv:1.6,on:true,coyote:.1,jumpBuffer:0,jumpHeld:false,
  shot:0,burst:0,pose:0,run:0,hurt:0});

// The renderer never changes this model or consumes its outcome RNG.
export class BubbleGame {
  constructor({pesetas=500,seed=1991,snapshot=null}={}) {
    const money = Number.isSafeInteger(pesetas) && pesetas>=0 ? pesetas : 500;
    this.state={version:2,wallet:money,initialWallet:money,credits:0,spent:0,rng:(seed>>>0)||0x6d2b79f5,
      mode:'attract',paused:false,stage:0,stageTime:85,time:0,clearTime:0,players:[],enemies:[],bubbles:[],items:[],
      nextId:1,runs:0,totalScore:0,totalCleared:0,victories:0,bestChain:0,runBestChain:0,runScore:0,runChain:0,chainTime:0,
      stagePops:0,stageHits:0,stageBonus:0,finished:false};
    this.events=[];
    if (validSnapshot(snapshot)) { this.state=clone(snapshot);this.state.paused=false; }
  }
  snapshot(){return clone(this.state);}
  event(type,data={}){this.events.push({type,...data});}
  drainEvents(){const events=this.events;this.events=[];return events;}
  random(){let x=this.state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.state.rng=x>>>0;return this.state.rng/4294967296;}
  get level(){return LEVELS[this.state.stage];}
  get canAct(){return !this.state.finished && !this.state.paused;}
  insertCoin(){const s=this.state;if(!this.canAct||s.wallet<STAKE)return false;s.wallet-=STAKE;s.credits++;this.event('coin');return true;}
  start(count=1){
    const s=this.state;
    if(!this.canAct||!ready.has(s.mode)||(count!==1&&count!==2)||s.credits<count)return false;
    s.credits-=count;s.spent+=STAKE*count;s.runs++;s.players=Array.from({length:count},(_,i)=>freshPlayer(i));
    s.stage=0;s.runScore=0;s.runBestChain=0;s.runChain=0;s.chainTime=0;s.mode='play';this.loadStage();this.event('start',{count});return true;
  }
  loadStage(){
    const s=this.state,l=this.level;s.stageTime=l.seconds;s.clearTime=0;s.stagePops=s.stageHits=s.stageBonus=0;
    s.bubbles=[];s.items=[];
    for(const p of s.players){
      p.x=p.id?824:92;p.y=FLOOR-p.h;p.vx=p.vy=0;p.inv=1.8;p.on=true;p.coyote=.1;
      p.jumpBuffer=0;p.jumpHeld=false;p.shot=p.burst=p.pose=p.hurt=0;
      if(s.players.length===2 && p.lives===0){p.lives=1;this.event('revive',{player:p.id});}
    }
    s.enemies=l.enemies.map((spec,i)=>({id:s.nextId++,type:spec.type,x:spec.x,y:spec.y-(spec.type==='bat'?28:36),
      w:spec.type==='rotor'?38:32,h:spec.type==='bat'?28:36,vx:i%2?65:-65,vy:0,on:true,trapped:0,
      cooldown:.8+this.random()*1.2,windup:0,charge:0,baseY:spec.y-28,phase:this.random()*Math.PI*2,angry:false}));
    this.event('stage',{stage:s.stage});
  }
  award(player,points){
    const s=this.state,p=s.players[player];if(!p)return;
    p.score+=points;s.runScore+=points;s.totalScore+=points;
    while(p.score>=p.nextLife){p.nextLife+=25000;p.lives=Math.min(5,p.lives+1);this.event('life',{player});}
  }
  shoot(p){
    const s=this.state;if(p.shot>0||s.bubbles.filter(b=>b.owner===p.id).length>=18)return;
    s.bubbles.push({id:s.nextId++,owner:p.id,x:p.x+p.w/2+p.dir*26,y:p.y+20,r:20,
      vx:p.dir*480,age:0,life:5.8,enemy:0,phase:this.random()*Math.PI*2});
    p.shot=.21;p.pose=.18;this.event('shoot',{x:p.x+p.w/2,y:p.y+20,player:p.id});
  }
  pop(bubbleId,player){
    const s=this.state;const root=s.bubbles.find(b=>b.id===bubbleId&&b.enemy);
    if(!root)return 0;
    const connected=[root],seen=new Set([root.id]);
    for(let i=0;i<connected.length;i++)for(const b of s.bubbles){
      if(b.enemy&&!seen.has(b.id)&&Math.hypot(b.x-connected[i].x,b.y-connected[i].y)<b.r+connected[i].r+30){
        seen.add(b.id);connected.push(b);
      }
    }
    const chain=connected.length;s.bestChain=Math.max(s.bestChain,chain);s.runBestChain=Math.max(s.runBestChain,chain);
    s.runChain=s.chainTime>0?s.runChain+chain:chain;s.chainTime=1.15;
    const multiplier=Math.min(8,chain);
    let points=0;
    for(const b of connected){
      const e=s.enemies.find(e=>e.id===b.enemy);if(!e)continue;
      const value=1000*multiplier;points+=value;
      if(b.owner===player)this.award(player,value);
      else {this.award(player,Math.round(value*.7));this.award(b.owner,Math.round(value*.3));}
      s.enemies=s.enemies.filter(enemy=>enemy.id!==b.enemy);
      s.items.push({id:s.nextId++,x:b.x-12,y:b.y-12,w:24,h:24,vx:(this.random()-.5)*75,vy:-110,
        kind:Math.floor(this.random()*4),life:7,on:false});
      s.stagePops++;this.event('pop',{x:b.x,y:b.y,player,chain,points:value});
    }
    s.bubbles=s.bubbles.filter(b=>!seen.has(b.id));
    this.event('chain',{x:root.x,y:root.y,chain,points,player});return chain;
  }
  burst(p){
    if(p.burst>0)return;
    p.burst=.48;p.pose=.2;const center={x:p.x+p.w/2,y:p.y+24};
    const nearest=this.state.bubbles.filter(b=>b.enemy&&Math.hypot(b.x-center.x,b.y-center.y)<105)
      .sort((a,b)=>Math.hypot(a.x-center.x,a.y-center.y)-Math.hypot(b.x-center.x,b.y-center.y))[0];
    this.event('burst',{...center,player:p.id});if(nearest)this.pop(nearest.id,p.id);
  }
  physics(body,dt,gravity=1550){
    const oldBottom=body.y+body.h;body.vy=Math.min(690,body.vy+gravity*dt);
    body.x+=body.vx*dt;
    if(body.x<28){body.x=28;if(body.type)body.vx=Math.abs(body.vx);}
    if(body.x+body.w>WIDTH-28){body.x=WIDTH-28-body.w;if(body.type)body.vx=-Math.abs(body.vx);}
    body.y+=body.vy*dt;body.on=false;
    if(body.vy>=0){
      for(const platform of [...this.level.platforms,{x:0,y:FLOOR,w:WIDTH}]){
        if(body.x+body.w-4>platform.x&&body.x+4<platform.x+platform.w&&oldBottom<=platform.y+1&&body.y+body.h>=platform.y){
          body.y=platform.y-body.h;body.vy=0;body.on=true;break;
        }
      }
    }
    if(body.y<72){body.y=72;body.vy=Math.max(0,body.vy);}
    if(body.y+body.h>FLOOR){body.y=FLOOR-body.h;body.vy=0;body.on=true;}
  }
  updatePlayers(dt,inputs){
    for(const p of this.state.players){
      if(p.lives<=0)continue;const input=inputs[p.id]||{};
      p.inv=Math.max(0,p.inv-dt);p.shot=Math.max(0,p.shot-dt);p.burst=Math.max(0,p.burst-dt);p.pose=Math.max(0,p.pose-dt);p.hurt=Math.max(0,p.hurt-dt);
      p.coyote=p.on?.1:Math.max(0,p.coyote-dt);
      if(input.jump&&!p.jumpHeld)p.jumpBuffer=.12;else p.jumpBuffer=Math.max(0,p.jumpBuffer-dt);
      p.jumpHeld=!!input.jump;
      const move=clamp(Number(input.move)||0,-1,1),target=move*244;
      const speed=(move?1500:2100)*dt;p.vx+=clamp(target-p.vx,-speed,speed);
      if(Math.abs(move)>.05)p.dir=Math.sign(move);
      if(p.jumpBuffer>0&&p.coyote>0){p.vy=-640;p.jumpBuffer=0;p.coyote=0;p.on=false;this.event('jump',{x:p.x+17,y:p.y+48,player:p.id});}
      if(input.shoot)this.shoot(p);if(input.burst)this.burst(p);
      this.physics(p,dt);p.run+=Math.abs(p.vx)*dt*.09;
    }
  }
  updateEnemies(dt){
    const s=this.state;
    for(const e of s.enemies){
      if(e.trapped)continue;e.angry=e.angry||s.stageTime<=15;e.cooldown-=dt;
      const speed=(e.type==='rotor'?72:e.type==='hopper'?78:63)*(e.angry?1.45:1);
      if(e.type==='bat'){
        e.x+=e.vx*dt*(e.angry?1.45:1);if(e.x<40||e.x>WIDTH-72)e.vx*=-1;
        e.x=clamp(e.x,40,WIDTH-72);e.y=clamp(e.baseY+Math.sin(s.time*1.7+e.phase)*32,94,FLOOR-e.h);
      }else{
        if(e.type==='hopper'){
          if(e.windup>0){e.windup-=dt;e.vx=0;if(e.windup<=0){e.vy=-495;e.vx=(this.nearestPlayer(e)?.x>e.x?1:-1)*speed;e.cooldown=1.25+this.random();}}
          else if(e.on&&e.cooldown<=0){e.windup=.32;this.event('windup',{x:e.x+16,y:e.y+18});}
        }
        if(e.type==='rotor'){
          if(e.charge>0){e.charge-=dt;if(e.charge<=0){e.cooldown=1.4;e.vx=Math.sign(e.vx||1)*speed;}}
          else if(e.windup>0){e.windup-=dt;e.vx=0;if(e.windup<=0){e.charge=.65;e.vx=(this.nearestPlayer(e)?.x>e.x?1:-1)*260;}}
          else if(e.on&&e.cooldown<=0){e.windup=.45;this.event('windup',{x:e.x+19,y:e.y+18});}
        }
        if(e.windup<=0&&e.charge<=0&&Math.abs(e.vx)<1)e.vx=(this.random()<.5?-1:1)*speed;
        if(e.type==='mush')e.vx=Math.sign(e.vx||1)*speed;
        if(e.on&&e.windup<=0&&e.charge<=0){
          const support=[...this.level.platforms,{x:0,y:FLOOR,w:WIDTH}].find(t=>Math.abs(t.y-(e.y+e.h))<2&&e.x+e.w>t.x&&e.x<t.x+t.w);
          if(support){const ahead=e.x+e.w/2+Math.sign(e.vx)*(e.w/2+7);if(ahead<support.x+1||ahead>support.x+support.w-1)e.vx*=-1;}
        }
        this.physics(e,dt);
      }
      for(const p of s.players)if(p.lives>0&&p.inv<=0&&intersects(p,e)){
        p.lives--;s.stageHits++;p.inv=2.4;p.hurt=.4;p.vy=-260;p.vx=(p.x<e.x?-1:1)*170;
        this.event('hurt',{x:p.x+17,y:p.y+22,player:p.id,lives:p.lives});
      }
    }
  }
  nearestPlayer(e){return this.state.players.filter(p=>p.lives>0).sort((a,b)=>Math.abs(a.x-e.x)-Math.abs(b.x-e.x))[0];}
  updateBubbles(dt){
    const s=this.state;
    for(const b of [...s.bubbles]){
      if(!s.bubbles.some(active=>active.id===b.id))continue;
      b.age+=dt;b.life-=dt;b.x+=b.vx*dt;b.vx*=Math.exp(-5.4*dt);
      if(b.age>.22)b.y-=dt*(b.enemy?37:49);
      if(b.age>.7)b.x+=Math.sin(s.time*2+b.phase)*13*dt;
      b.x=clamp(b.x,48,WIDTH-48);b.y=Math.max(113,b.y);
      if(!b.enemy&&b.age<.65){
        const enemy=s.enemies.find(e=>!e.trapped&&circleHit(b,e,b.r+2));
        if(enemy){b.enemy=enemy.id;b.life=7.2;b.r=27;enemy.trapped=b.id;b.vx*=.25;
          this.award(b.owner,100);this.event('capture',{x:b.x,y:b.y,player:b.owner});}
      }
      if(b.enemy){const enemy=s.enemies.find(e=>e.id===b.enemy);if(enemy){enemy.x=b.x-enemy.w/2;enemy.y=b.y-enemy.h/2;}}
      if(b.enemy&&b.age>.38){
        const player=s.players.find(p=>p.lives>0&&circleHit(b,p,b.r-3));if(player){this.pop(b.id,player.id);continue;}
      }
      if(b.life<=0){
        if(b.enemy){const enemy=s.enemies.find(e=>e.id===b.enemy);if(enemy){enemy.trapped=0;enemy.angry=true;enemy.vy=0;enemy.cooldown=.4;enemy.baseY=enemy.y;enemy.vx=(this.random()<.5?-1:1)*100;
          this.event('escape',{x:b.x,y:b.y});}}
        s.bubbles=s.bubbles.filter(active=>active.id!==b.id);
      }
    }
  }
  updateItems(dt){
    const s=this.state;
    for(const item of s.items){
      item.life-=dt;item.vx*=Math.exp(-2*dt);this.physics(item,dt,980);
      const p=s.players.find(p=>p.lives>0&&intersects(p,item));
      if(p&&item.life>0){item.life=0;this.award(p.id,250+item.kind*100);this.event('collect',{x:item.x+12,y:item.y+12,player:p.id,points:250+item.kind*100});}
    }
    s.items=s.items.filter(item=>item.life>0);
  }
  completeStage(){
    const s=this.state;if(s.mode!=='play')return;
    s.mode='clear';s.clearTime=2.25;s.totalCleared++;
    s.stageBonus=Math.max(0,Math.ceil(s.stageTime))*25+(s.stageHits===0?1500:0);
    const alive=s.players.filter(p=>p.lives>0);const share=Math.floor(s.stageBonus/alive.length);
    alive.forEach((p,i)=>this.award(p.id,share+(i===0?s.stageBonus-share*alive.length:0)));
    if(s.stage===LEVELS.length-1)s.victories++;
    this.event('clear',{stage:s.stage,bonus:s.stageBonus,perfect:s.stageHits===0});
  }
  step(dt=STEP,inputs=[]){
    const s=this.state;if(!this.canAct||s.mode==='attract'||s.mode==='over'||s.mode==='victory')return;
    s.time+=dt;s.chainTime=Math.max(0,s.chainTime-dt);
    if(s.mode==='clear'){
      s.clearTime-=dt;if(s.clearTime<=0){
        if(s.stage===LEVELS.length-1){s.mode='victory';s.clearTime=0;this.event('end',{won:true,score:s.runScore});}
        else {s.stage++;s.mode='play';this.loadStage();}
      }return;
    }
    s.stageTime=Math.max(0,s.stageTime-dt);
    this.updatePlayers(dt,inputs);this.updateBubbles(dt);this.updateEnemies(dt);this.updateItems(dt);
    if(s.players.every(p=>p.lives<=0)){s.mode='over';this.event('end',{won:false,score:s.runScore});}
    else if(s.enemies.length===0)this.completeStage();
  }
  pause(value){this.state.paused=!!value;}
  finish(){
    const s=this.state;if(!s.finished){s.wallet+=s.credits*STAKE;s.credits=0;s.finished=true;s.paused=false;s.mode='finished';}
    return this.result();
  }
  result(){const s=this.state;return {tipo:'fin',id:'burbujas',puntos:s.totalScore,ganado:s.victories>0,
    pesetasDelta:s.wallet+s.credits*STAKE-s.initialWallet,partidas:s.runs,fases:s.totalCleared,mejorCadena:s.bestChain};}
}

export class FixedClock {
  constructor(){this.accumulator=0;}
  reset(){this.accumulator=0;}
  advance(seconds,paused,tick){
    if(paused)return 0;this.accumulator+=Math.max(0,Math.min(seconds,.25));let steps=0;
    while(this.accumulator+1e-12>=STEP){tick(STEP);this.accumulator=Math.max(0,this.accumulator-STEP);steps++;}
    return steps;
  }
}

export function validSnapshot(s){
  if(!s||s.version!==2||!['attract','play','clear','over','victory','finished'].includes(s.mode))return false;
  if(!['wallet','initialWallet','credits','spent','runs','totalScore','totalCleared','victories','bestChain','runScore','nextId','rng','stage'].every(k=>Number.isSafeInteger(s[k])&&s[k]>=0))return false;
  if(s.rng===0||s.rng>0xffffffff||s.stage>=LEVELS.length||s.wallet+s.credits*STAKE+s.spent!==s.initialWallet)return false;
  if(!['stageTime','time','clearTime','runChain','runBestChain','chainTime','stagePops','stageHits','stageBonus'].every(k=>Number.isFinite(s[k])&&s[k]>=0))return false;
  if(typeof s.paused!=='boolean'||typeof s.finished!=='boolean')return false;
  if(!Array.isArray(s.players)||s.players.length>2||!Array.isArray(s.enemies)||s.enemies.length>60||!Array.isArray(s.bubbles)||s.bubbles.length>40||!Array.isArray(s.items)||s.items.length>100)return false;
  if(['play','clear','over','victory'].includes(s.mode)&&s.players.length<1)return false;
  const coords=a=>a.every(e=>e&&['x','y','vx'].every(k=>Number.isFinite(e[k]))&&Math.abs(e.x)<4000&&Math.abs(e.y)<4000);
  if(![s.players,s.enemies,s.bubbles,s.items].every(coords))return false;
  if(!s.players.every((p,i)=>p.id===i&&Number.isInteger(p.lives)&&p.lives>=0&&p.lives<=5&&Number.isSafeInteger(p.score)&&p.score>=0&&Number.isFinite(p.vy)))return false;
  if(!s.players.every(p=>['w','h','inv','coyote','jumpBuffer','shot','burst','pose','run','hurt','nextLife'].every(k=>Number.isFinite(p[k])&&p[k]>=0)&&
    p.w===34&&p.h===48&&typeof p.on==='boolean'&&typeof p.jumpHeld==='boolean'&&(p.dir===1||p.dir===-1)))return false;
  const ids=s.enemies.map(e=>e.id);if(new Set(ids).size!==ids.length)return false;
  if(!s.enemies.every(e=>Number.isSafeInteger(e.id)&&['mush','hopper','bat','rotor'].includes(e.type)&&Number.isFinite(e.vy)))return false;
  if(!s.enemies.every(e=>['w','h','cooldown','windup','charge','baseY','phase'].every(k=>Number.isFinite(e[k]))&&
    typeof e.on==='boolean'&&typeof e.angry==='boolean'&&Number.isSafeInteger(e.trapped)&&e.trapped>=0))return false;
  if(!s.bubbles.every(b=>Number.isSafeInteger(b.id)&&b.owner>=0&&b.owner<s.players.length&&Number.isFinite(b.life)&&Number.isFinite(b.age)&&Number.isFinite(b.r)&&(!b.enemy||ids.includes(b.enemy))))return false;
  if(!s.bubbles.every(b=>Number.isFinite(b.phase)&&Number.isInteger(b.owner)&&(!b.enemy||s.enemies.some(e=>e.id===b.enemy&&e.trapped===b.id))))return false;
  if(!s.enemies.every(e=>!e.trapped||s.bubbles.some(b=>b.id===e.trapped&&b.enemy===e.id)))return false;
  if(!s.items.every(i=>['w','h','vy','life'].every(k=>Number.isFinite(i[k]))&&Number.isInteger(i.kind)&&i.kind>=0&&i.kind<=3))return false;
  const allIds=[...s.enemies,...s.bubbles,...s.items].map(e=>e.id);
  if(new Set(allIds).size!==allIds.length||allIds.some(id=>!Number.isSafeInteger(id)||id<1||id>=s.nextId))return false;
  return true;
}
