// Attract-mode controller uses a separate game instance and never spends the player's credit.
export function demoInput(game,index=0){
  const s=game.state,p=s.players[index];if(!p||p.lives<=0)return {};
  const targets=[...s.bubbles.filter(b=>b.enemy).map(b=>({x:b.x,y:b.y,rank:0})),
    ...s.enemies.filter(e=>!e.trapped).map(e=>({x:e.x+e.w/2,y:e.y+e.h/2,rank:1}))];
  targets.sort((a,b)=>Math.abs(a.x-p.x)+(Math.abs(a.y-p.y)*1.2)+a.rank*50-(Math.abs(b.x-p.x)+(Math.abs(b.y-p.y)*1.2)+b.rank*50));
  const target=targets[0];if(!target)return {};
  let goal=target.x,dy=target.y-(p.y+24),jump=false;
  if(dy<-55&&p.on){
    const foot=p.y+p.h,center=p.x+p.w/2;
    const candidates=game.level.platforms.filter(t=>foot-t.y>25&&foot-t.y<130&&
      Math.max(t.x-center,center-(t.x+t.w),0)<160);
    candidates.sort((a,b)=>Math.abs(Math.max(a.x+20,Math.min(a.x+a.w-20,center))-center)-
      Math.abs(Math.max(b.x+20,Math.min(b.x+b.w-20,center))-center));
    if(candidates.length){const t=candidates[0];goal=Math.max(t.x+24,Math.min(t.x+t.w-24,target.x));jump=true;}
  }
  if(p.on&&Math.abs(dy)<80&&Math.abs(target.x-p.x)<75&&s.time%1.3<.035)jump=true;
  const dx=goal-(p.x+p.w/2),move=Math.abs(dx)>28?Math.sign(dx):0;
  return {move,jump,shoot:Math.abs(dy)<70,burst:true};
}
