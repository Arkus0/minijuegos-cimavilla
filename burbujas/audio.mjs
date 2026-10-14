// Original FM score and foley: all sound is generated locally, including the music.
const scale=[0,2,4,7,9,12,14,16];
const melody=[0,2,4,5,4,2,1,2, 4,-1,2,1,0,-1,2,4, 5,6,5,4,2,1,2,-1, 4,2,1,0,2,4,5,-1,
  5,4,2,1,0,2,4,5, 6,-1,5,4,2,-1,4,2, 1,2,4,5,4,2,1,0, 2,-1,1,-1,0,-1,-1,-1];
const note = midi => 440*Math.pow(2,(midi-69)/12);

export class BubbleAudio {
  constructor(context=null){this.context=context;this.muted=false;this.paused=false;this.volume=.75;this.nodes=new Set();this.musicNodes=new Set();this.world=0;this.beat=0;this.nextBeat=0;this.active=false;}
  setup(){
    if(this.master)return;const c=this.context;
    this.master=c.createGain();this.master.gain.value=this.muted?0:this.volume;
    const limiter=c.createDynamicsCompressor();limiter.threshold.value=-13;limiter.knee.value=9;limiter.ratio.value=4;limiter.attack.value=.003;limiter.release.value=.18;
    this.master.connect(limiter).connect(c.destination);this.music=c.createGain();this.music.gain.value=.58;this.music.connect(this.master);
    this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const data=this.noise.getChannelData(0);let seed=911;
    for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed/4294967296*2-1;}
  }
  async unlock(){
    try{if(!this.context)this.context=new(window.AudioContext||window.webkitAudioContext)();this.setup();
      if(this.context.state==='suspended')await this.context.resume();this.active=true;if(!this.nextBeat)this.nextBeat=this.context.currentTime+.03;
    }catch{/* The game remains fully playable without audio. */}
  }
  track(source,music=false){this.nodes.add(source);if(music)this.musicNodes.add(source);source.onended=()=>{this.nodes.delete(source);this.musicNodes.delete(source);};}
  tone(freq,duration=.12,when=0,gain=.12,type='sine',music=false,pan=0,endFreq=null){
    if(!this.context||!this.master)return;const c=this.context,now=c.currentTime+when;
    const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);
    if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,now+duration);
    g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(gain,now+.004);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    o.connect(g);if(pan&&c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;g.connect(p).connect(music?this.music:this.master);}else g.connect(music?this.music:this.master);
    this.track(o,music);o.start(now);o.stop(now+duration+.03);
  }
  fm(freq,duration,when,gain,music=false,pan=0){
    if(!this.context||!this.master)return;const c=this.context,now=c.currentTime+when;
    const carrier=c.createOscillator(),mod=c.createOscillator(),depth=c.createGain(),envelope=c.createGain();
    carrier.frequency.value=freq;mod.frequency.value=freq*2;depth.gain.setValueAtTime(freq*1.35,now);depth.gain.exponentialRampToValueAtTime(freq*.025,now+duration);
    mod.connect(depth).connect(carrier.frequency);envelope.gain.setValueAtTime(0,now);envelope.gain.linearRampToValueAtTime(gain,now+.004);envelope.gain.exponentialRampToValueAtTime(.0001,now+duration);
    carrier.connect(envelope);if(c.createStereoPanner){const p=c.createStereoPanner();p.pan.value=pan;envelope.connect(p).connect(music?this.music:this.master);}else envelope.connect(music?this.music:this.master);
    this.track(carrier,music);this.track(mod,music);carrier.start(now);mod.start(now);carrier.stop(now+duration+.04);mod.stop(now+duration+.04);
  }
  noiseHit(freq,duration,when=0,gain=.1,music=false){
    if(!this.context||!this.noise)return;const c=this.context,now=c.currentTime+when,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
    s.buffer=this.noise;f.type='bandpass';f.frequency.value=freq;f.Q.value=.8;g.gain.setValueAtTime(gain,now);g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    s.connect(f).connect(g).connect(music?this.music:this.master);this.track(s,music);s.start(now);s.stop(now+duration);
  }
  setWorld(world){
    if(this.world===world)return;this.world=world;this.beat=0;
    for(const node of this.musicNodes)try{node.stop();}catch{}this.musicNodes.clear();
    if(this.context)this.nextBeat=this.context.currentTime+.04;
  }
  scheduleMusic(until=this.context?.currentTime+.16){
    if(!this.active||this.paused||!this.context||this.context.state!=='running')return;
    const c=this.context,tempo=[132,124,144][this.world],eighth=60/tempo/2;
    if(this.nextBeat<c.currentTime-.1)this.nextBeat=c.currentTime+.02;
    while(this.nextBeat<until){
      const index=this.beat%64,section=Math.floor(this.beat/64)%2,bar=Math.floor(this.beat/8)%16,chords=[0,0,5,5,9,9,7,7,5,5,0,0,9,5,7,0],root=48+chords[bar]+[0,2,-2][this.world];
      const when=Math.max(0,this.nextBeat-c.currentTime);let m=melody[(index+(this.world===1?16:0))%64];
      if(section&&m>=0)m=(m+(index<32?1:3))%8;
      if(m>=0)this.fm(note(72+scale[m]+[0,2,-2][this.world]),eighth*1.6,when,.045,true,.13);
      if(index%2===0)this.tone(note(root-12+(index%8===6?7:0)),eighth*1.3,when,.10,'triangle',true,-.12);
      if(index%4===0){this.tone(92,.10,when,.12,'sine',true,0,35);this.noiseHit(220,.03,when,.03,true);}
      if(index%4===2)this.noiseHit(1800,.075,when,.055,true);
      this.noiseHit(7900,.022,when,index%2?.023:.015,true);
      if(index%2===1)this.fm(note(root+12+[0,4,7,12][Math.floor(index/2)%4]),eighth*.65,when,.018,true,-.32);
      this.nextBeat+=eighth;this.beat++;
    }
  }
  tick(){this.scheduleMusic();}
  event(e){
    if(this.muted||this.paused||!this.active||!this.context)return;
    const pan=e.player===1?.25:-.25;
    if(e.type==='coin'){this.noiseHit(2200,.08,0,.12);this.fm(1950,.18,.03,.1);}
    if(e.type==='shoot'){this.tone(760,.105,0,.07,'sine',false,pan,430);this.fm(1180,.055,.025,.028,false,pan);}
    if(e.type==='capture'){this.fm(1047,.2,0,.055,false,pan);this.fm(1568,.25,.045,.04,false,pan);}
    if(e.type==='pop'){this.noiseHit(2100,.07,0,.09);this.tone(290,.08,0,.06,'sine',false,pan,80);this.fm(note(76+Math.min(9,e.chain)*2),.28,.025,.065,false,pan);}
    if(e.type==='burst')this.tone(440,.1,0,.032,'sine',false,pan,190);
    if(e.type==='jump')this.tone(260,.11,0,.038,'triangle',false,pan,640);
    if(e.type==='collect')this.fm(1760,.13,0,.035,false,pan);
    if(e.type==='hurt'){this.tone(220,.28,0,.11,'triangle',false,pan,65);this.noiseHit(450,.12,0,.055);}
    if(e.type==='escape'){this.tone(630,.21,0,.06,'square',false,0,230);}
    if(e.type==='life'||e.type==='revive')[72,76,79,84].forEach((n,i)=>this.fm(note(n),.28,i*.07,.07));
    if(e.type==='start')[72,76,79,84].forEach((n,i)=>this.fm(note(n),.3,i*.08,.085));
    if(e.type==='clear')[72,76,79,84,83,84,88].forEach((n,i)=>this.fm(note(n),.42,i*.11,.08));
    if(e.type==='end'){
      const notes=e.won?[72,76,79,84,88,91,96]:[76,74,72,69,64];notes.forEach((n,i)=>this.fm(note(n),.4,i*.14,.08));
    }
  }
  setMuted(muted){this.muted=!!muted;if(this.master)this.master.gain.setTargetAtTime(muted?0:this.volume,this.context.currentTime,.035);}
  pause(paused){this.paused=paused;if(!this.context)return;const promise=paused?this.context.suspend():this.context.resume();promise?.catch(()=>{});}
  stop(){this.active=false;for(const node of this.nodes)try{node.stop();}catch{}this.nodes.clear();this.musicNodes.clear();this.nextBeat=this.beat=0;}
}
