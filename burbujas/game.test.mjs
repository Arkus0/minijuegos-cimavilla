import test from 'node:test';
import assert from 'node:assert/strict';
import { BubbleGame,FixedClock,STAKE,STEP,LEVELS } from './game.mjs';

function playing(count=1){const g=new BubbleGame({pesetas:500,seed:1991});for(let i=0;i<count;i++)g.insertCoin();assert.ok(g.start(count));g.drainEvents();return g;}
function steps(game,n,inputs=[]){for(let i=0;i<n;i++)game.step(STEP,inputs);}

test('paid single/cooperative starts conserve the complete wallet and cannot start twice',()=>{
  const g=new BubbleGame({pesetas:125,seed:0});assert.equal(g.start(1),false);
  g.insertCoin();assert.equal(g.start(2),false);assert.equal(g.start(1),true);assert.equal(g.start(1),false);
  g.insertCoin();g.insertCoin();assert.equal(g.result().pesetasDelta,-STAKE);
  const first=g.finish();assert.equal(g.state.wallet,100);assert.equal(first.pesetasDelta,-25);
  assert.deepEqual(g.finish(),first);assert.equal(g.insertCoin(),false);assert.equal(g.start(1),false);
  const co=playing(2);assert.equal(co.state.players.length,2);assert.equal(co.finish().pesetasDelta,-50);
});

test('pause freezes simulation, rejects coin/start and never accumulates a time backlog',()=>{
  const g=playing(),clock=new FixedClock();g.pause(true);const saved=g.snapshot();
  assert.equal(g.insertCoin(),false);assert.equal(g.start(2),false);
  g.step(30,[{move:1,shoot:true}]);assert.deepEqual(g.snapshot(),saved);
  assert.equal(clock.advance(30,true,dt=>g.step(dt)),0);assert.equal(clock.accumulator,0);
  g.pause(false);assert.equal(clock.advance(STEP,false,dt=>g.step(dt)),1);assert.ok(g.state.time<.02);
});

test('30, 60 and 120 fps produce identical seeded model states',()=>{
  const results=[30,60,120].map(fps=>{
    const g=playing(2),clock=new FixedClock();
    for(let frame=0;frame<fps*12;frame++)clock.advance(1/fps,false,dt=>{
      const tick=Math.round(g.state.time/STEP);g.step(dt,[{move:tick%240<120?1:-1,jump:tick%71<12,shoot:true,burst:tick%29<3},
        {move:tick%210<100?-1:1,jump:tick%89<8,shoot:tick%4<2,burst:true}]);
    });
    return g.snapshot();
  });assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});

test('capture is physical, and an escaped enemy becomes angry without awarding a kill',()=>{
  const g=playing(),p=g.state.players[0],e=g.state.enemies[0];p.x=100;e.x=160;e.y=FLOOR()-e.h;e.vx=0;
  g.shoot(p);g.step();const b=g.state.bubbles.find(b=>b.enemy===e.id);assert.ok(b);assert.equal(p.score,100);
  p.x=800;b.life=.001;g.step();assert.equal(e.trapped,0);assert.ok(e.angry);assert.ok(g.state.enemies.includes(e));assert.equal(p.score,100);
});
const FLOOR=()=>552;

test('a connected pop removes enemies once and rewards both capture and finishing players',()=>{
  const g=playing(2);const enemies=g.state.enemies.slice(0,3);g.state.enemies=enemies;
  g.state.bubbles=enemies.map((e,i)=>{const id=g.state.nextId++;e.trapped=id;return{id,owner:i===1?1:0,x:400+i*48,y:280,r:27,vx:0,age:1,life:6,enemy:e.id,phase:0};});
  const root=g.state.bubbles[0].id;assert.equal(g.pop(root,0),3);
  assert.equal(g.state.players[0].score,8100);assert.equal(g.state.players[1].score,900);
  assert.equal(g.state.runScore,9000);assert.equal(g.state.bestChain,3);assert.equal(g.state.enemies.length,0);assert.equal(g.state.items.length,3);
  assert.equal(g.pop(root,0),0);assert.equal(g.state.runScore,9000);
});

test('jump reaches the next platform and patrolling enemies turn at a ledge',()=>{
  const g=playing(),p=g.state.players[0];p.x=125;const start=p.y;
  g.step(STEP,[{jump:true}]);steps(g,20,[{}]);assert.ok(start-p.y>98);
  steps(g,45,[{}]);assert.equal(p.y+p.h,450);assert.ok(p.on);
  const e=g.state.enemies[0];e.type='mush';e.x=58;e.y=450-e.h;e.vx=-63;e.on=true;e.trapped=0;
  g.step();assert.ok(e.vx>0);assert.equal(e.y+e.h,450);
});

test('clear/reload advances to a different stage without duplicating time/perfect bonuses',()=>{
  const g=playing();g.state.enemies=[];g.step();assert.equal(g.state.mode,'clear');
  const saved=g.snapshot(),score=g.state.runScore;assert.ok(score>0);
  const restored=new BubbleGame({snapshot:saved});steps(g,150);steps(restored,150);
  assert.deepEqual(g.snapshot(),restored.snapshot());assert.equal(g.state.stage,1);assert.equal(g.state.runScore,score);
  assert.notDeepEqual(LEVELS[0].platforms,LEVELS[1].platforms);
});

test('six distinct stages finish a campaign once, and closing in the final celebration preserves victory',()=>{
  const g=playing(2);
  for(let stage=0;stage<6;stage++){
    assert.equal(g.state.stage,stage);g.state.enemies=[];g.state.bubbles=[];g.step();
    assert.equal(g.state.mode,'clear');
    if(stage<5)steps(g,136);
  }
  assert.equal(g.state.victories,1);const points=g.state.totalScore;
  assert.ok(g.finish().ganado);assert.equal(g.result().puntos,points);assert.equal(g.result().pesetasDelta,-50);
  assert.equal(g.result().fases,6);assert.equal(g.state.victories,1);
});

test('extra lives count every crossed threshold; co-op restores a lost partner on a new stage',()=>{
  const g=playing(2);g.award(0,50000);assert.equal(g.state.players[0].lives,5);assert.equal(g.state.players[0].nextLife,75000);
  g.state.players[1].lives=0;g.state.enemies=[];g.step();steps(g,136);
  assert.equal(g.state.players[1].lives,1);assert.equal(g.state.players[0].score,53625);
});

test('snapshots are independent and malformed economic states fall back safely',()=>{
  const g=playing();const saved=g.snapshot();saved.players[0].score=999;saved.wallet=999;
  assert.equal(g.state.players[0].score,0);const restored=new BubbleGame({pesetas:75,snapshot:saved});
  assert.equal(restored.state.wallet,75);assert.equal(restored.state.mode,'attract');
  const clean=new BubbleGame({snapshot:g.snapshot()});assert.deepEqual(clean.snapshot(),g.snapshot());
});
