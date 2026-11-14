/* world.js — 区域主题、场景装饰、波次、相机、连击与画面反馈 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,P=CR.ent.player;
  const INF=1e9;
  const props=[];
  const _p={x:0,y:0,s:1};
  let camX=0,camLock=INF,zoom=1,zoomTarget=1;
  let shake=0,shakeX=0,shakeY=0,flash=0,white=0;
  let waveIdx=0,zoneIdx=0,playTime=0,kills=0,combo=0,comboT=0,bestCombo=0;
  let winTimer=-1,finished=false,sceneMusic="menu",bossRef=null;
  const theme={skyTop:[0,0,0],skyMid:[0,0,0],skyLow:[0,0,0],
    hillA:[0,0,0],hillB:[0,0,0],hillC:[0,0,0],
    grass1:[0,0,0],grass2:[0,0,0],tint:[1,1,1],ambient:1};

  function zoneAt(x){
    for(let i=CFG.ZONES.length-1;i>=0;i--)if(x>=CFG.ZONES[i].start)return CFG.ZONES[i];
    return CFG.ZONES[0];
  }
  function zoneIndexAt(x){
    for(let i=CFG.ZONES.length-1;i>=0;i--)if(x>=CFG.ZONES[i].start)return i;
    return 0;
  }
  function updateTheme(){
    const Z=CFG.ZONES;
    const i=zoneIndexAt(P.x),j=Math.min(Z.length-1,i+1);
    const a=Z[i],b=Z[j];
    const band=380;
    let t=i===j?0:U.smooth(U.clamp((P.x-(b.start-band))/(band*2),0,1));
    const keys=["skyTop","skyMid","skyLow","hillA","hillB","hillC","grass1","grass2","tint"];
    keys.forEach(k=>{const v=U.mix(a[k],b[k],t);theme[k][0]=v[0];theme[k][1]=v[1];theme[k][2]=v[2];});
    theme.ambient=U.lerp(a.ambient,b.ambient,t);
  }
  function genProps(){
    props.length=0;U.srand(20261114);
    for(let x=50;x<CFG.LEVEL_W;x+=U.rr(58,132)){
      const z=zoneIndexAt(x),r=U.rnd();
      let type;
      if(z===0)type=r<.34?0:(r<.52?1:2);
      else if(z===1)type=r<.22?3:(r<.50?1:2);
      else type=r<.30?4:(r<.62?1:2);
      const depth=r<.34?U.rr(-98,-62):(r<.68?U.rr(60,100):U.rr(-70,80));
      props.push({x,depth,type,s:U.rr(.75,1.35),v:U.rr(0,6),_t:"prop"});
    }
  }
  function spawnWave(w){
    const viewW=CR.gl.W/CR.gl.S;
    const baseX=Math.min(CFG.LEVEL_W-120,camX+viewW*.82);
    // 中立怪：不会主动攻击，站在路边（蓝血条）
    for(let i=0;i<(w.neutral||0);i++){
      const e=CR.ent.spawnEnemy("neutral",baseX+U.rr(0,260),U.rr(-70,70));
      if(e){e.hostile=false;e.aggro=0;}
    }
    w.list.forEach((type,i)=>{
      const e=CR.ent.spawnEnemy(type,baseX+U.rr(10,290),U.rr(-66,66));
      if(e&&type==="boss"){
        bossRef=e;CR.audio.sfx("boss");CR.ui.banner("黑石城主 · 降临");
        CR.world.addWhite(.4);
      }
    });
    camLock=U.clamp(w.x-viewW*.28,0,Math.max(0,CFG.LEVEL_W-viewW));
    CR.audio.sfx("wave");
    CR.ui.banner(w.boss?"最终战 · 黑石城堡":("第 "+(waveIdx+1)+" 波 · "+w.list.length+" 名敌人来袭"));
    addShake(5);
  }
  function clearNeutrals(){
    CR.ent.enemies.each(e=>{
      if(e.alive&&!e.hostile){
        e.alive=false;
        CR.ent.burst(e.x,e.depth,24,C.cyan,8,90);
      }
    });
  }
  function updateWaves(dt){
    const W=CFG.WAVES;
    if(waveIdx<W.length&&camLock>=INF&&CR.ent.aliveEnemies(true)===0&&P.x>=W[waveIdx].x){
      clearNeutrals();
      spawnWave(W[waveIdx]);
    }
    if(waveIdx<W.length&&camLock<INF&&CR.ent.aliveEnemies(true)===0){
      camLock=INF;waveIdx++;
      CR.save.addGold(25);
      CR.audio.sfx("coin");
      if(waveIdx<W.length)CR.ui.banner("通路开启 · 继续前进");
    }
    const zi=zoneIndexAt(P.x);
    if(zi!==zoneIdx){
      zoneIdx=zi;
      CR.ui.banner("进入 · "+CFG.ZONES[zi].name);
      CR.audio.setScene(CFG.ZONES[zi].music);
      sceneMusic=CFG.ZONES[zi].music;
    }
  }
  function updateCamera(dt){
    const viewW=CR.gl.W/CR.gl.S;
    let target=P.x-viewW*.34;
    target=U.clamp(target,0,Math.max(0,CFG.LEVEL_W-viewW));
    if(camLock<INF)target=Math.min(target,camLock);
    camX=U.lerp(camX,target,1-Math.pow(.0015,dt));
    if(camLock<INF)P.x=U.clamp(P.x,camX+40,camX+viewW-70);
    else P.x=Math.min(P.x,camX+viewW-70);
    // 镜头缩放：冲刺拉远、BOSS 战轻微拉远、受击回弹
    zoomTarget=P.dash.t>0?.965:(bossRef&&bossRef.alive?.975:1);
    if(P.hurtT>0)zoomTarget=1.018;
    zoom=U.lerp(zoom,zoomTarget,1-Math.pow(.01,dt));
    if(shake>0){
      shake=Math.max(0,shake-dt*28);
      shakeX=(U.rnd()-.5)*shake*CR.gl.S;
      shakeY=(U.rnd()-.5)*shake*CR.gl.S*.65;
    }else shakeX=shakeY=0;
    if(flash>0)flash=Math.max(0,flash-dt*2.4);
    if(white>0)white=Math.max(0,white-dt*3.0);
  }
  function proj(x,depth,h){
    const S=CR.gl.S,W=CR.gl.W,H=CR.gl.H,z=zoom;
    const bx=(x-camX)*S;
    const by=H*.555+depth*.58*S-(h||0)*S;
    _p.x=(bx-W/2)*z+W/2+shakeX;
    _p.y=(by-H/2)*z+H/2+shakeY;
    _p.s=S*(1+depth*.0018)*z;
    return _p;
  }
  function addShake(n){shake=Math.max(shake,n);}
  function addFlash(n){flash=Math.max(flash,n);}
  function addWhite(n){white=Math.max(white,n);}
  function addCombo(){
    combo++;comboT=2.2;if(combo>bestCombo)bestCombo=combo;
    if(combo%10===0){CR.ui.banner(combo+" 连击！");CR.audio.sfx("uiBig");}
  }
  function resetCombo(){combo=0;comboT=0;}
  function addKill(){kills++;energyTick();}
  function energyTick(){P.energy=Math.min(P.maxEnergy,P.energy+3);}
  function onBossDead(){winTimer=1.8;addWhite(.6);addShake(14);CR.ui.banner("城主已倒下！");}
  function tick(dt){
    playTime+=dt;
    if(comboT>0){comboT-=dt;if(comboT<=0)combo=0;}
    if(winTimer>0){winTimer-=dt;if(winTimer<=0)finished=true;}
    updateTheme();
  }
  function init(){
    camX=0;camLock=INF;zoom=zoomTarget=1;shake=flash=white=0;
    shakeX=shakeY=0;waveIdx=0;zoneIdx=0;playTime=0;kills=0;combo=0;
    comboT=0;bestCombo=0;winTimer=-1;finished=false;bossRef=null;
    sceneMusic=CFG.ZONES[0].music;
    genProps();updateTheme();
  }
  CR.world={props,theme,proj,init,tick,spawnWave,updateWaves,updateCamera,zoneAt,zoneIndexAt,
    addShake,addFlash,addWhite,addCombo,resetCombo,addKill,onBossDead,
    get camX(){return camX;},set camX(v){camX=v;},
    get camLock(){return camLock;},get zoom(){return zoom;},
    get shake(){return shake;},get flash(){return flash;},get white(){return white;},
    get waveIdx(){return waveIdx;},get zoneIdx(){return zoneIdx;},
    get kills(){return kills;},get combo(){return combo;},get bestCombo(){return bestCombo;},
    get playTime(){return playTime;},get bossRef(){return bossRef;},
    get finished(){return finished;},get sceneMusic(){return sceneMusic;}};
})(window.CR=window.CR||{});
