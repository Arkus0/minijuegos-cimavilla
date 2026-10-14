import { WIDTH, HEIGHT, FLOOR, WORLDS } from './levels.mjs';
const TAU=Math.PI*2;
const art={heroes:'assets/art/heroes.png',enemies:'assets/art/enemies.png',garden:'assets/art/garden.jpg',crystal:'assets/art/crystal.jpg',factory:'assets/art/factory.jpg'};
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
const rounded=(ctx,x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};

export class ArcadeRenderer {
  constructor(canvas,{reduced=false}={}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.images={};this.particles=[];this.labels=[];
    this.rings=[];this.time=0;this.shake=0;this.flash=0;this.reduced=reduced;
    this.dpr=Math.min(devicePixelRatio||1,2);canvas.width=WIDTH*this.dpr;canvas.height=HEIGHT*this.dpr;
    this.ready=Promise.all(Object.entries(art).map(([key,url])=>new Promise(resolve=>{
      const image=new Image();image.onload=()=>{this.images[key]=image;resolve();};
      image.onerror=()=>{console.warn('Bubble Parade: no se pudo cargar '+url);resolve();};image.src=url;
    })));
  }
  reset(){this.particles=[];this.labels=[];this.rings=[];this.time=0;this.shake=this.flash=0;}
  tick(dt){
    this.time+=dt;this.shake=Math.max(0,this.shake-dt*25);this.flash=Math.max(0,this.flash-dt*4);
    for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=110*dt;p.rotation+=p.spin*dt;}
    this.particles=this.particles.filter(p=>p.life>0).slice(-230);
    for(const l of this.labels){l.life-=dt;l.y-=dt*25;}this.labels=this.labels.filter(l=>l.life>0);
    for(const ring of this.rings){ring.life-=dt;ring.r+=dt*(ring.speed||180);}this.rings=this.rings.filter(r=>r.life>0);
  }
  spark(x,y,color,count=14){
    count=this.reduced?Math.min(5,count):count;
    for(let i=0;i<count;i++){
      const seed=i+Math.floor(this.time*1000),angle=hash(seed)*TAU,speed=50+hash(seed+5)*150;
      const life=.35+hash(seed+8)*.4;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-50,life,max:life,color,
        size:2+hash(seed+2)*4,rotation:hash(seed+3)*TAU,spin:(hash(seed+4)-.5)*8,star:i%4===0});
    }
  }
  event(event){
    const mint=event.player===1?'#ffa9cf':'#a4ffe0';
    if(event.type==='pop'){
      this.spark(event.x,event.y,mint,22);this.spark(event.x,event.y,'#ffe6a2',7);
      this.rings.push({x:event.x,y:event.y,r:24,life:.32,color:mint});
      if(!this.reduced){this.shake=Math.min(4,1+event.chain*.4);this.flash=.12;}
    }
    if(event.type==='chain')this.labels.push({x:event.x,y:event.y-26,text:'+'+event.points,life:1.1,color:'#fff1ad',size:event.chain>1?24:17});
    if(event.type==='collect')this.labels.push({x:event.x,y:event.y-17,text:'+'+event.points,life:.65,color:'#d2ffc1',size:14});
    if(event.type==='capture')this.spark(event.x,event.y,'#dcf9ff',6);
    if(event.type==='burst')this.rings.push({x:event.x,y:event.y,r:19,life:.29,speed:320,color:mint});
    if(event.type==='hurt'){this.spark(event.x,event.y,'#ff98b0',13);if(!this.reduced)this.shake=7;}
    if(event.type==='life'||event.type==='revive')this.labels.push({x:event.player?850:110,y:440,text:'1 UP!',life:1.6,color:mint,size:25});
    if(event.type==='clear')for(let i=0;i<5;i++)this.spark(120+i*170,240,'#ffedac',10);
  }
  background(world){
    const c=this.ctx,image=this.images[world.id];
    c.fillStyle=['#153a4b','#302554','#363246'][WORLDS.indexOf(world)];c.fillRect(0,0,WIDTH,HEIGHT);
    if(image){
      const scale=Math.max(WIDTH/image.width,HEIGHT/image.height),w=image.width*scale,h=image.height*scale;
      c.drawImage(image,(WIDTH-w)/2,(HEIGHT-h)/2,w,h);
    }
    const shade=c.createLinearGradient(0,0,0,HEIGHT);shade.addColorStop(0,'#08183266');shade.addColorStop(.45,'#071c3010');shade.addColorStop(1,'#08293f77');
    c.fillStyle=shade;c.fillRect(0,0,WIDTH,HEIGHT);
    if(!this.reduced)for(let i=0;i<30;i++){
      const x=35+hash(i+71)*890+Math.sin(this.time*.28+i)*7,y=80+hash(i+119)*440+Math.sin(this.time*.19+i*3)*12;
      const glow=.25+.25*Math.sin(this.time*.7+i);c.globalAlpha=glow;c.fillStyle=i%3===0?'#ffc2e7':'#d0ffc0';
      c.beginPath();c.arc(x,y,i%6===0?2:1,0,TAU);c.fill();
    }c.globalAlpha=1;
  }
  platform(p,world,index){
    const c=this.ctx;
    c.fillStyle='#081f36aa';rounded(c,p.x+4,p.y+5,p.w,p.h+7,8);c.fill();
    const g=c.createLinearGradient(0,p.y,0,p.y+25);g.addColorStop(0,world.color);g.addColorStop(.17,world.edge);g.addColorStop(1,'#153745');
    c.fillStyle=g;rounded(c,p.x,p.y,p.w,p.h+5,6);c.fill();
    c.strokeStyle=world.color+'ad';c.lineWidth=1.3;c.stroke();
    c.fillStyle=world.color+'88';rounded(c,p.x+5,p.y+1,p.w-10,4,3);c.fill();
    c.fillStyle='#102b4140';for(let i=0;i<p.w/17;i++){const x=p.x+8+i*17;c.beginPath();c.moveTo(x,p.y+10);c.lineTo(x+8,p.y+21);c.lineTo(x-4,p.y+21);c.fill();}
    if(world.id==='garden'){
      for(let i=0;i<p.w/35;i++){
        const x=p.x+12+i*35;c.fillStyle=i%2?'#a8e8a6':'#67bb93';
        c.beginPath();c.ellipse(x,p.y+1,7,3,-.35,0,TAU);c.fill();
      }
      for(let i=0;i<Math.min(3,p.w/70);i++){
        const x=p.x+30+i*79;c.strokeStyle='#72a58799';c.beginPath();c.moveTo(x,p.y+20);c.quadraticCurveTo(x+6,p.y+33,x+2,p.y+45);c.stroke();
        c.fillStyle='#5c9478';c.beginPath();c.ellipse(x+3,p.y+33,5,2.5,-.6,0,TAU);c.fill();
      }
    }else if(world.id==='crystal'){
      for(let i=0;i<p.w/72;i++){
        const x=p.x+17+i*72;c.fillStyle=i%2?'#acc7ffa0':'#efa6eaa0';
        c.beginPath();c.moveTo(x,p.y+22);c.lineTo(x+8,p.y+39);c.lineTo(x+13,p.y+22);c.fill();
      }
    }else{
      c.strokeStyle='#947f5966';c.lineWidth=1;
      for(let i=0;i<p.w/54;i++){const x=p.x+17+i*54;c.strokeRect(x,p.y+10,16,8);c.fillStyle='#ffdc9577';c.fillRect(x+2,p.y+11,3,2);}
    }
  }
  sprite(image,col,row,columns,rows,x,y,w,h,flip=false){
    if(!image)return;
    const c=this.ctx,cw=image.width/columns,ch=image.height/rows;
    c.save();c.translate(x,y);if(flip)c.scale(-1,1);
    c.drawImage(image,col*cw,row*ch,cw,ch,-w/2,-h,w,h);c.restore();
  }
  hero(p,state,celebrate=false){
    if(p.lives<=0)return;const c=this.ctx;
    c.fillStyle='#061f384d';c.beginPath();c.ellipse(p.x+p.w/2,p.y+p.h+3,21,5,0,0,TAU);c.fill();
    let frame=0;
    if(celebrate)frame=7;else if(p.hurt>0)frame=6;else if(p.pose>0)frame=5;
    else if(!p.on)frame=4;else if(Math.abs(p.vx)>20)frame=1+Math.floor(p.run)%3;
    c.save();if(p.inv>0&&Math.floor(state.time*10)%2===0)c.globalAlpha=.6;
    const sx=Math.abs(p.vx)>20&&p.on?1+Math.sin(p.run*2)*.025:1;
    const bob=p.on&&Math.abs(p.vx)<20?Math.sin(this.time*3)*1.2:0;
    this.sprite(this.images.heroes,frame%4,Math.floor(frame/4)+p.id*2,4,4,p.x+p.w/2,p.y+p.h+bob,80*sx,80,p.dir<0);
    if(!this.images.heroes){c.fillStyle=p.id?'#ffa3c5':'#8cedc0';rounded(c,p.x,p.y,p.w,p.h,16);c.fill();}
    c.restore();
  }
  enemy(e,trapped=false){
    const c=this.ctx,types=['mush','hopper','bat','rotor'];
    if(!trapped){c.fillStyle='#061f3859';c.beginPath();c.ellipse(e.x+e.w/2,e.y+e.h+3,e.w*.62,4,0,0,TAU);c.fill();}
    const frame=e.windup>0?1:Math.floor(this.time*(e.type==='bat'?7:5)+e.phase)%2;
    const scale=trapped?.79:1;const bob=e.windup>0?2:0;
    c.save();if(trapped)c.globalAlpha=.91;
    this.sprite(this.images.enemies,types.indexOf(e.type),frame,4,2,e.x+e.w/2,e.y+e.h+bob,68*scale,68*scale,e.vx<0);
    if(!this.images.enemies){c.fillStyle=['#f798a3','#f5da7c','#ae9aee','#eab074'][types.indexOf(e.type)];rounded(c,e.x,e.y,e.w,e.h,12);c.fill();}
    if(e.angry&&!trapped){c.strokeStyle='#ff917199';c.lineWidth=2;c.beginPath();c.arc(e.x+e.w/2,e.y+e.h/2,29,Math.PI*1.12,Math.PI*1.87);c.stroke();}
    if(e.windup>0&&!trapped){c.font='22px Lilita';c.textAlign='center';c.fillStyle='#ffdaa0';c.strokeStyle='#293949';c.lineWidth=3;c.strokeText('!',e.x+e.w/2,e.y-14);c.fillText('!',e.x+e.w/2,e.y-14);}
    c.restore();
  }
  bubble(b){
    const c=this.ctx,r=b.r*(b.age<.1?.5+b.age*5:1),wobble=this.reduced?0:Math.sin(this.time*4+b.phase)*.025;
    c.save();c.translate(b.x,b.y);c.scale(1+wobble,1-wobble);
    const g=c.createRadialGradient(-r*.32,-r*.37,1,0,0,r);
    g.addColorStop(0,'#ffffff24');g.addColorStop(.45,b.enemy?'#fbcfff18':'#b0ffff0c');g.addColorStop(.80,'#a5f5fa1c');g.addColorStop(.96,b.enemy?'#e7acff90':'#d1ffe98c');g.addColorStop(1,'#eafaffbb');
    c.fillStyle=g;c.beginPath();c.arc(0,0,r,0,TAU);c.fill();
    c.lineWidth=1.3;c.strokeStyle=b.enemy?(b.life<2.2&&Math.floor(this.time*9)%2===0?'#ffe5ad':'#fbc2ed'):'#c9fbeccc';c.stroke();
    c.strokeStyle='#fffdf2';c.lineWidth=3.4;c.lineCap='round';c.beginPath();c.arc(0,0,r*.78,Math.PI*1.12,Math.PI*1.47);c.stroke();
    c.lineWidth=1.4;c.strokeStyle='#a0d3ffbb';c.beginPath();c.arc(0,0,r*.78,.12,.72);c.stroke();
    c.fillStyle='#fffef9cc';c.beginPath();c.ellipse(-r*.2,-r*.63,r*.12,r*.065,-.4,0,TAU);c.fill();
    c.restore();
  }
  item(item){
    const c=this.ctx;if(item.life<1.5&&Math.floor(this.time*8)%2===0)return;
    const x=item.x+12,y=item.y+12+Math.sin(this.time*4+item.id)*1.5;
    c.save();c.translate(x,y);c.shadowBlur=7;c.shadowColor='#fff6b866';
    if(item.kind===0){
      c.strokeStyle='#76c79d';c.lineWidth=2;c.beginPath();c.moveTo(-6,0);c.quadraticCurveTo(-3,-14,6,-8);c.lineTo(6,0);c.stroke();
      const g=c.createLinearGradient(-8,-3,4,9);g.addColorStop(0,'#ffadae');g.addColorStop(1,'#d8668a');c.fillStyle=g;
      for(const px of [-6,6]){c.beginPath();c.arc(px,4,7,0,TAU);c.fill();c.fillStyle='#ffd8c8';c.beginPath();c.arc(px-2,1,2,0,TAU);c.fill();c.fillStyle=g;}
    }else if(item.kind===1){
      c.fillStyle='#fff0b9';rounded(c,-10,-5,20,13,6);c.fill();c.fillStyle='#f897b3';rounded(c,-8,-8,16,9,5);c.fill();c.fillStyle='#fff5d5';c.fillRect(-3,-12,5,5);
    }else if(item.kind===2){
      c.rotate(Math.sin(this.time*2)*.14);c.fillStyle='#b4caff';c.strokeStyle='#e9eeff';c.lineWidth=1.3;
      c.beginPath();c.moveTo(0,-13);c.lineTo(10,-3);c.lineTo(7,9);c.lineTo(0,14);c.lineTo(-8,8);c.lineTo(-10,-3);c.closePath();c.fill();c.stroke();c.fillStyle='#e5ecff';c.beginPath();c.moveTo(0,-12);c.lineTo(3,0);c.lineTo(-7,4);c.closePath();c.fill();
    }else this.star(0,0,12,'#ffe7a2');
    c.restore();
  }
  star(x,y,r,color){const c=this.ctx;c.fillStyle=color;c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,v=i%2?r*.48:r;c.lineTo(x+Math.cos(a)*v,y+Math.sin(a)*v);}c.closePath();c.fill();}
  draw(game,{attract=false}={}){
    const s=game.state,world=WORLDS[game.level.world],c=this.ctx;
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.save();
    if(this.shake>0&&!this.reduced)c.translate(Math.sin(this.time*93)*this.shake,Math.cos(this.time*67)*this.shake*.5);
    this.background(world);
    for(const [i,p] of game.level.platforms.entries())this.platform(p,world,i);
    this.platform({x:0,y:FLOOR,w:WIDTH,h:48},world,12);
    for(const item of s.items)this.item(item);
    for(const e of s.enemies)if(!e.trapped)this.enemy(e);
    for(const b of s.bubbles){
      if(b.enemy){const e=s.enemies.find(e=>e.id===b.enemy);if(e)this.enemy({...e,x:b.x-e.w/2,y:b.y-e.h/2+5},true);}
      this.bubble(b);
    }
    for(const p of s.players)this.hero(p,s,s.mode==='clear'||s.mode==='victory');
    for(const r of this.rings){c.globalAlpha=Math.min(1,r.life*3);c.strokeStyle=r.color;c.lineWidth=2;c.beginPath();c.arc(r.x,r.y,r.r,0,TAU);c.stroke();}
    for(const p of this.particles){
      c.save();c.globalAlpha=Math.max(0,p.life/p.max);c.translate(p.x,p.y);c.rotate(p.rotation);
      if(p.star)this.star(0,0,p.size*1.6,p.color);else{c.fillStyle=p.color;c.beginPath();c.arc(0,0,p.size,0,TAU);c.fill();}c.restore();
    }c.globalAlpha=1;
    for(const l of this.labels){c.globalAlpha=Math.min(1,l.life*3);c.textAlign='center';c.font=l.size+'px Lilita';c.strokeStyle='#25324c';c.lineWidth=3.5;c.strokeText(l.text,l.x,l.y);c.fillStyle=l.color;c.fillText(l.text,l.x,l.y);}
    c.globalAlpha=1;if(this.flash>0&&!this.reduced){c.fillStyle='#fffde1';c.globalAlpha=this.flash;c.fillRect(0,0,WIDTH,HEIGHT);c.globalAlpha=1;}
    if(attract){c.fillStyle='#10233c22';c.fillRect(0,0,WIDTH,HEIGHT);}
    c.restore();
  }
}
