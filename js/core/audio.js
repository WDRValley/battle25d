/* audio.js — 全程序化 WebAudio 合成，无外部音频文件
 * 结构：master ─┬─ musicGain ── (pad / bass / lead / drums)
 *               └─ sfxGain   ── (一次性音效 + 蓄力循环)
 */
(function(CR){
  "use strict";
  let ctx=null,master=null,musicG=null,sfxG=null,comp=null;
  let noiseBuf=null,ready=false,enabledMusic=true,enabledSfx=true;
  let musicVol=.55,sfxVol=.75,paused=false;
  let scene="menu",pendingScene=null,fadeT=0;
  let step=0,nextTime=0,stepDur=.25,lastUpdate=0;
  let chargeOsc=null,chargeGain=null,chargeFilter=null,chargeLevel=0;

  const mtof=m=>440*Math.pow(2,(m-69)/12);
  const SCENES={
    menu:{bpm:76,root:60,scale:[0,2,4,7,9],wave:"sine",padGain:.10,leadGain:.055,
      chords:[[0,4,7],[5,9,12],[3,7,10],[7,11,14]],
      lead:[0,-1,4,-1,7,-1,4,-1, 9,-1,7,-1,4,-1,2,-1],
      bass:[0,-1,-1,-1, 5,-1,-1,-1, 3,-1,-1,-1, 7,-1,-1,-1],
      drum:null,padEvery:16},
    field:{bpm:112,root:62,scale:[0,2,4,7,9],wave:"triangle",padGain:.075,leadGain:.075,
      chords:[[0,4,7],[7,11,14],[5,9,12],[2,7,11]],
      lead:[0,2,4,7, 9,7,4,2, 0,4,7,11, 9,7,4,-1],
      bass:[0,-1,0,-1, 7,-1,7,-1, 5,-1,5,-1, 2,-1,2,-1],
      drum:"light",padEvery:8},
    battle:{bpm:140,root:57,scale:[0,2,3,5,7,10],wave:"sawtooth",padGain:.055,leadGain:.09,
      chords:[[0,3,7],[0,3,7],[5,8,12],[3,7,10]],
      lead:[0,-1,3,7, 5,-1,3,0, 10,-1,7,5, 3,-1,0,-1],
      bass:[0,0,-1,0, 0,-1,0,-1, 5,5,-1,5, 3,-1,3,-1],
      drum:"full",padEvery:8},
    boss:{bpm:152,root:55,scale:[0,1,3,5,6,8,10],wave:"sawtooth",padGain:.05,leadGain:.10,
      chords:[[0,3,6],[0,3,6],[1,5,8],[0,3,7]],
      lead:[0,1,3,6, 5,3,1,0, 8,6,5,3, 10,8,6,5],
      bass:[0,0,0,-1, 0,0,1,-1, 5,5,5,-1, 3,3,0,-1],
      drum:"heavy",padEvery:8},
    victory:{bpm:104,root:65,scale:[0,4,7,12],wave:"triangle",padGain:.09,leadGain:.11,
      chords:[[0,4,7],[5,9,12],[7,11,14],[0,4,7]],
      lead:[0,4,7,12, 11,7,4,7, 9,12,16,12, 7,4,0,-1],
      bass:[0,-1,-1,-1, 5,-1,-1,-1, 7,-1,-1,-1, 0,-1,-1,-1],
      drum:"light",padEvery:8},
    defeat:{bpm:66,root:53,scale:[0,3,7,10],wave:"sine",padGain:.085,leadGain:.06,
      chords:[[0,3,7],[-2,3,5],[-4,0,3],[-5,-1,2]],
      lead:[7,-1,3,-1, 0,-1,-2,-1, -4,-1,-1,-1, -5,-1,-1,-1],
      bass:[0,-1,-1,-1, -2,-1,-1,-1, -4,-1,-1,-1, -5,-1,-1,-1],
      drum:null,padEvery:16}
  };

  function init(){
    if(ready)return true;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return false;
    try{ctx=new AC();}catch(e){return false;}
    master=ctx.createGain();master.gain.value=.92;
    comp=ctx.createDynamicsCompressor();
    comp.threshold.value=-18;comp.knee.value=22;comp.ratio.value=5;
    comp.attack.value=.004;comp.release.value=.20;
    musicG=ctx.createGain();sfxG=ctx.createGain();
    musicG.connect(master);sfxG.connect(master);
    master.connect(comp);comp.connect(ctx.destination);
    applyVolumes();
    // 1 秒白噪声，全程序化生成
    noiseBuf=ctx.createBuffer(1,Math.floor(ctx.sampleRate*1.2),ctx.sampleRate);
    const d=noiseBuf.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    nextTime=ctx.currentTime+.06;step=0;
    ready=true;return true;
  }
  function resume(){
    if(!ready&&!init())return;
    if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    nextTime=Math.max(nextTime,ctx.currentTime+.06);
  }
  function applyVolumes(){
    if(!ready)return;
    const t=ctx.currentTime;
    musicG.gain.setTargetAtTime(enabledMusic?(paused?musicVol*.22:musicVol*.62):0,t,.06);
    sfxG.gain.setTargetAtTime(enabledSfx?sfxVol*.85:0,t,.03);
  }
  function setMusic(on){enabledMusic=!!on;applyVolumes();}
  function setSfx(on){enabledSfx=!!on;applyVolumes();}
  function setMusicVol(v){musicVol=CR.u.clamp(v,0,1);applyVolumes();}
  function setSfxVol(v){sfxVol=CR.u.clamp(v,0,1);applyVolumes();}
  function setPaused(p){paused=!!p;applyVolumes();}

  /* ---------- 合成基元 ---------- */
  function tone(midi,t,dur,opt){
    if(!ready)return;
    opt=opt||{};
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=opt.wave||"sine";
    o.frequency.setValueAtTime(opt.freq||mtof(midi),t);
    if(opt.to)o.frequency.exponentialRampToValueAtTime(Math.max(20,opt.to),t+dur);
    if(opt.detune)o.detune.value=opt.detune;
    let node=o;
    if(opt.lp){
      const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=opt.lp;
      if(opt.lpTo)f.frequency.exponentialRampToValueAtTime(opt.lpTo,t+dur);
      o.connect(f);node=f;
    }
    const peak=Math.max(.0001,opt.gain||.1),atk=opt.atk||.006;
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+atk);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    node.connect(g);g.connect(opt.dest||sfxG);
    o.start(t);o.stop(t+dur+.02);
    o.onended=()=>{try{o.disconnect();g.disconnect();}catch(e){}};
    return o;
  }
  function noise(t,dur,opt){
    if(!ready)return;
    opt=opt||{};
    const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();
    s.buffer=noiseBuf;s.loop=true;
    f.type=opt.type||"bandpass";
    f.frequency.setValueAtTime(opt.freq||1200,t);
    if(opt.to)f.frequency.exponentialRampToValueAtTime(Math.max(40,opt.to),t+dur);
    f.Q.value=opt.q||1;
    const peak=Math.max(.0001,opt.gain||.1);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(peak,t+(opt.atk||.004));
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    s.connect(f);f.connect(g);g.connect(opt.dest||sfxG);
    s.start(t);s.stop(t+dur+.02);
    s.onended=()=>{try{s.disconnect();f.disconnect();g.disconnect();}catch(e){}};
  }
  function arp(notes,stepT,gain,wave,dest){
    notes.forEach((n,i)=>{if(n===null)return;
      tone(n,stepT+i*.085,.22,{wave:wave||"triangle",gain:gain||.09,dest:dest||sfxG});});
  }
  function pad(chord,t,dur,cfg){
    chord.forEach((n,i)=>tone(cfg.root+n-12,t,dur,{
      wave:"sine",gain:cfg.padGain*(i===0?1:.7),atk:.35,dest:musicG,
      lp:1100,detune:i*4-4}));
  }
  function kick(t,g){tone(38,t,.16,{wave:"sine",gain:g,freq:110,to:42,dest:musicG});}
  function snare(t,g){noise(t,.13,{type:"highpass",freq:1400,gain:g*.8,dest:musicG});
    tone(50,t,.09,{wave:"triangle",gain:g*.5,dest:musicG});}
  function hat(t,g){noise(t,.045,{type:"highpass",freq:6500,gain:g*.35,dest:musicG});}

  /* ---------- BGM 调度 ---------- */
  function scheduleStep(i,t){
    const cfg=SCENES[scene]||SCENES.menu;
    const bar=Math.floor(i/16),pos=i%16;
    if(pos%cfg.padEvery===0){
      pad(cfg.chords[bar%cfg.chords.length],t,stepDur*cfg.padEvery*1.05,cfg);
    }
    const ld=cfg.lead[pos];
    if(ld!==undefined&&ld>=0&&ld!==-1){
      const n=cfg.root+12+ld;
      tone(n,t,stepDur*1.5,{wave:cfg.wave,gain:cfg.leadGain,dest:musicG,lp:2600,atk:.012});
    }
    const bs=cfg.bass[pos];
    if(bs!==undefined&&bs!==-1){
      tone(cfg.root-12+bs,t,stepDur*1.8,{wave:"triangle",gain:.11,dest:musicG,lp:520});
    }
    if(cfg.drum){
      if(pos%4===0)kick(t,cfg.drum==="heavy"?.34:.24);
      if(pos%8===4)snare(t,cfg.drum==="light"?.13:.22);
      if(cfg.drum!=="light"&&pos%4===2)kick(t,.13);
      if(pos%2===0)hat(t,cfg.drum==="heavy"?.15:.10);
      if(cfg.drum==="heavy"&&pos%8===6)snare(t,.14);
    }
  }
  function setScene(name,immediate){
    if(!SCENES[name])return;
    if(!ready) {scene=name;return;}
    if(name===scene)return;
    if(immediate){scene=name;step=0;nextTime=ctx.currentTime+.04;return;}
    // 0.22s 淡出 → 切场景 → 淡入
    const t=ctx.currentTime;
    musicG.gain.cancelScheduledValues(t);
    musicG.gain.setTargetAtTime(0,t,.045);
    pendingScene=name;fadeT=.24;
  }
  function update(dt){
    if(!ready)return;
    if(pendingScene){
      fadeT-=dt;
      if(fadeT<=0){
        scene=pendingScene;pendingScene=null;step=0;
        nextTime=ctx.currentTime+.04;
        applyVolumes();
      }
    }
    if(!enabledMusic||paused||pendingScene)return;
    const cfg=SCENES[scene]||SCENES.menu;
    stepDur=60/cfg.bpm/4;
    const now=ctx.currentTime;
    let guard=0;
    while(nextTime<now+.16&&guard++<32){
      scheduleStep(step,nextTime);
      nextTime+=stepDur;step++;
    }
    if(nextTime<now-.5)nextTime=now+.04; // 切后台回来后重新对齐
  }

  /* ---------- 蓄力循环 ---------- */
  function chargeStart(){
    if(!ready||chargeOsc)return;
    const t=ctx.currentTime;
    chargeOsc=ctx.createOscillator();chargeGain=ctx.createGain();chargeFilter=ctx.createBiquadFilter();
    chargeOsc.type="sawtooth";chargeOsc.frequency.value=110;
    chargeFilter.type="lowpass";chargeFilter.frequency.value=420;
    chargeGain.gain.setValueAtTime(.0001,t);
    chargeGain.gain.exponentialRampToValueAtTime(.055,t+.12);
    chargeOsc.connect(chargeFilter);chargeFilter.connect(chargeGain);chargeGain.connect(sfxG);
    chargeOsc.start(t);chargeLevel=0;
  }
  function chargeSet(level){
    chargeLevel=level;
    if(!ready||!chargeOsc)return;
    const t=ctx.currentTime;
    chargeOsc.frequency.setTargetAtTime(110+level*150,t,.05);
    chargeFilter.frequency.setTargetAtTime(420+level*1500,t,.06);
  }
  function chargeStop(){
    if(!ready||!chargeOsc)return;
    const t=ctx.currentTime,o=chargeOsc,g=chargeGain,f=chargeFilter;
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(.0001,t,.03);
    o.stop(t+.18);
    o.onended=()=>{try{o.disconnect();f.disconnect();g.disconnect();}catch(e){}};
    chargeOsc=chargeGain=chargeFilter=null;chargeLevel=0;
  }

  /* ---------- 音效表 ---------- */
  function sfx(name,opt){
    if(!ready||!enabledSfx)return;
    opt=opt||{};
    const t=ctx.currentTime+.001,p=opt.pitch||1;
    switch(name){
      case "ui":      tone(72,t,.07,{wave:"square",gain:.045,lp:2200});break;
      case "uiBig":   arp([67,72,76],t,.055,"triangle");break;
      case "error":   tone(46,t,.18,{wave:"square",gain:.07,lp:700,to:120});break;
      case "swing":   noise(t,.13,{type:"bandpass",freq:2100*p,to:420,q:1.1,gain:.15});
                      tone(60,t,.09,{wave:"triangle",gain:.05,to:150});break;
      case "swingHeavy":noise(t,.24,{type:"bandpass",freq:2600,to:260,q:.9,gain:.22});
                      tone(48,t,.22,{wave:"sawtooth",gain:.09,lp:800,to:90});break;
      case "hit":     noise(t,.10,{type:"lowpass",freq:2600,to:500,gain:.17});
                      tone(38,t,.13,{wave:"sine",freq:130,to:48,gain:.16});break;
      case "crit":    noise(t,.15,{type:"bandpass",freq:3400,to:800,gain:.19});
                      tone(84,t,.20,{wave:"triangle",gain:.10,to:1800});
                      tone(38,t,.16,{wave:"sine",freq:150,to:45,gain:.18});break;
      case "hurt":    noise(t,.16,{type:"lowpass",freq:900,to:180,gain:.18});
                      tone(45,t,.24,{wave:"sawtooth",gain:.10,lp:600,to:70});break;
      case "jump":    tone(64,t,.17,{wave:"sine",freq:250,to:530,gain:.10});break;
      case "doubleJump":tone(70,t,.20,{wave:"triangle",freq:420,to:880,gain:.11});
                      noise(t,.10,{type:"highpass",freq:3000,gain:.06});break;
      case "land":    noise(t,.09,{type:"lowpass",freq:700,to:200,gain:.10});
                      tone(36,t,.09,{wave:"sine",freq:100,to:50,gain:.09});break;
      case "charge":  tone(58,t,.30,{wave:"triangle",freq:180,to:520,gain:.07,lp:1600});break;
      case "chargeRelease":noise(t,.30,{type:"bandpass",freq:3200,to:300,gain:.21});
                      tone(34,t,.34,{wave:"sine",freq:120,to:38,gain:.20});
                      tone(76,t,.20,{wave:"triangle",gain:.07,to:1500});break;
      case "arrow":   noise(t,.09,{type:"highpass",freq:2800,to:5200,gain:.09});break;
      case "bow":     tone(58,t,.10,{wave:"triangle",freq:300,to:130,gain:.06});break;
      case "fireball":noise(t,.28,{type:"lowpass",freq:2600,to:420,gain:.13});
                      tone(50,t,.26,{wave:"sawtooth",gain:.07,lp:1400,to:200});break;
      case "explosion":noise(t,.42,{type:"lowpass",freq:3400,to:120,gain:.24});
                      tone(30,t,.38,{wave:"sine",freq:110,to:32,gain:.22});break;
      case "ice":     [84,88,91].forEach((n,i)=>tone(n,t+i*.02,.42,{wave:"sine",gain:.055,detune:i*8}));
                      noise(t,.30,{type:"highpass",freq:4200,to:7800,gain:.10});break;
      case "thunder": noise(t,.30,{type:"bandpass",freq:1800,to:5200,q:.7,gain:.15});
                      tone(88,t,.16,{wave:"square",gain:.05,lp:4000,to:600});break;
      case "heal":    arp([67,72,76,79],t,.075,"sine");break;
      case "buff":    [60,64,67,72].forEach((n,i)=>tone(n,t+i*.055,.5,{wave:"triangle",gain:.055}));break;
      case "coin":    tone(88,t,.09,{wave:"square",gain:.055,lp:4000});
                      tone(95,t+.07,.13,{wave:"square",gain:.05,lp:5000});break;
      case "pickup":  arp([72,76,79],t,.06,"triangle");break;
      case "levelup": arp([60,64,67,72,76,79],t,.075,"triangle");break;
      case "wave":    [55,62,67].forEach((n,i)=>tone(n,t+i*.09,.55,{wave:"sawtooth",gain:.07,lp:1500}));break;
      case "boss":    tone(31,t,1.1,{wave:"sawtooth",gain:.14,lp:420,to:120});
                      noise(t,.9,{type:"lowpass",freq:600,to:90,gain:.14});break;
      case "victory": arp([60,64,67,72,76,79,84],t,.10,"triangle");break;
      case "defeat":  arp([60,57,53,48],t,.18,"sine");break;
      case "shield":  tone(72,t,.35,{wave:"sine",gain:.07,to:260});
                      noise(t,.22,{type:"highpass",freq:3800,gain:.06});break;
      default:break;
    }
  }
  CR.audio={init,resume,sfx,setScene,setMusic,setSfx,setMusicVol,setSfxVol,setPaused,
    update,chargeStart,chargeSet,chargeStop,
    get ready(){return ready;},get scene(){return scene;},get ctxState(){return ctx?ctx.state:"none";},
    get settings(){return {music:enabledMusic,sfx:enabledSfx,musicVol,sfxVol};}};
})(window.CR=window.CR||{});
