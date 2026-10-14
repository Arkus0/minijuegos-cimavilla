export class ArcadeInput {
  constructor({shortcut,menu=()=>false,onPad=()=>{},interact=()=>{}}){
    this.keys=new Set();this.virtual=[{move:0,jump:false,shoot:false,burst:false},{move:0,jump:false,shoot:false,burst:false}];
    this.pads=[];this.previousPads=new Map();this.shortcut=shortcut;this.menu=menu;this.onPad=onPad;
    this.abort=new AbortController();const options={signal:this.abort.signal};
    window.addEventListener('keydown',e=>{
      if(e.target.matches('input,textarea,select')||e.target.isContentEditable)return;
      if(e.code==='Space'&&e.target.matches('button'))return;
      this.keys.add(e.code);
      interact();
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Escape'].includes(e.code))e.preventDefault();
      if(!e.repeat&&['KeyM','Digit1','Digit2','KeyP','Escape','KeyH','KeyV'].includes(e.code))this.shortcut(e.code);
    },options);
    window.addEventListener('keyup',e=>this.keys.delete(e.code),options);
    window.addEventListener('blur',()=>this.clear(),options);
    for(const button of document.querySelectorAll('[data-action]')){
      const i=Number(button.dataset.player),action=button.dataset.action,pointers=new Set();
      button.addEventListener('pointerdown',e=>{e.preventDefault();interact();button.setPointerCapture(e.pointerId);pointers.add(e.pointerId);this.virtual[i][action]=true;button.classList.add('held');},options);
      const up=e=>{pointers.delete(e.pointerId);this.virtual[i][action]=pointers.size>0;button.classList.toggle('held',pointers.size>0);};
      button.addEventListener('pointerup',up,options);button.addEventListener('pointercancel',up,options);
      button.addEventListener('click',e=>{if(e.detail===0){interact();this.virtual[i][action]=true;setTimeout(()=>{this.virtual[i][action]=false;},100);}},options);
    }
    for(const stick of document.querySelectorAll('[data-joystick]')){
      const i=Number(stick.dataset.joystick),ball=stick.querySelector('.stick-ball');let pointer=null;
      const move=e=>{if(pointer!==e.pointerId)return;const rect=stick.getBoundingClientRect();
        const dx=Math.max(-1,Math.min(1,(e.clientX-(rect.x+rect.width/2))/(rect.width*.42)));
        const dy=Math.max(-1,Math.min(1,(e.clientY-(rect.y+rect.height*.35))/(rect.height*.35)));
        this.virtual[i].move=Math.abs(dx)>.15?dx:0;this.virtual[i].jump=dy<-.35;ball.style.transform='translate('+dx*12+'px,'+dy*10+'px)';};
      stick.addEventListener('pointerdown',e=>{e.preventDefault();interact();pointer=e.pointerId;stick.setPointerCapture(pointer);move(e);},options);
      stick.addEventListener('pointermove',move,options);
      const up=e=>{if(e.pointerId!==pointer)return;pointer=null;this.virtual[i].move=0;this.virtual[i].jump=false;ball.style.transform='';};
      stick.addEventListener('pointerup',up,options);stick.addEventListener('pointercancel',up,options);
    }
  }
  clear(){this.keys.clear();this.virtual.forEach(v=>{v.move=0;v.jump=v.shoot=v.burst=false;});document.querySelectorAll('.held').forEach(el=>el.classList.remove('held'));document.querySelectorAll('.stick-ball').forEach(el=>el.style.transform='');}
  poll(){
    const available=[...(navigator.getGamepads?.()||[])].filter(Boolean).slice(0,2);this.pads=available;
    this.onPad(available.length);
    for(const p of available){
      const previous=this.previousPads.get(p.index)||[],buttons=p.buttons.map(b=>b.pressed);
      const rising=i=>buttons[i]&&!previous[i];
      if(rising(9))this.shortcut('KeyP');
      if(this.menu()){
        if(rising(3))this.shortcut('KeyM');if(rising(0))this.shortcut('Digit1');if(rising(2))this.shortcut('Digit2');
      }
      this.previousPads.set(p.index,buttons);
    }
    for(const index of this.previousPads.keys())if(!available.some(p=>p.index===index))this.previousPads.delete(index);
  }
  read(){
    const mappings=[{left:'KeyA',right:'KeyD',jump:['KeyW','Space'],shoot:'KeyF',burst:'KeyG'},
      {left:'ArrowLeft',right:'ArrowRight',jump:['ArrowUp'],shoot:'KeyK',burst:'KeyL'}];
    return mappings.map((m,i)=>{
      const v=this.virtual[i],pad=this.pads[i],pressed=j=>!!pad?.buttons[j]?.pressed;
      let axis=pad?.axes[0]||0;if(Math.abs(axis)<.2)axis=0;
      const digital=(pressed(15)?1:0)-(pressed(14)?1:0);
      const move=(this.keys.has(m.right)?1:0)-(this.keys.has(m.left)?1:0)||v.move||digital||axis;
      return {move,jump:m.jump.some(key=>this.keys.has(key))||v.jump||pressed(0),shoot:this.keys.has(m.shoot)||v.shoot||pressed(2),burst:this.keys.has(m.burst)||v.burst||pressed(1)};
    });
  }
  destroy(){this.abort.abort();this.clear();}
}
