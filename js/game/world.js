/* world.js — 区域主题、场景装饰、波次、相机、连击与画面反馈 · v1.2.0 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,P=CR.ent.player;
  const INF=1e9;
  /* v1.4 dev2：所有地图宽度只在这里登记一次。
     之前 entities.js / updateCamera / groundSegments 各写一份三元链，
     每加一张新地图漏一处就会把玩家硬钳回 LEVEL_W=7200（dev1.1 与 dev2 各犯过一次）。 */
  function levelWidth(m){
    return m==="market"?CFG.MARKET_W:(m==="harbor"?CFG.HARBOR_W:
      (m==="forest"?(CFG.FOREST_W||4800):(m==="swamp"?(CFG.SWAMP_W||6000):
        (m==="border"?(CFG.BORDER_W||9600):(m==="university"?(CFG.UNI_W||7600):CFG.LEVEL_W)))));
  }
  const props=[];
  const _p={x:0,y:0,s:1};
  let camX=0,camLock=INF,zoom=1,zoomTarget=1;
  let shake=0,shakeX=0,shakeY=0,flash=0,white=0;
  let waveIdx=0,zoneIdx=0,playTime=0,kills=0,combo=0,comboT=0,bestCombo=0;
  let winTimer=-1,finished=false,cleared=false,sceneMusic="menu",bossRef=null;
  /* 1.3.1 交战标记：被敌人发现 / 攻击、或玩家出手时置位，3 秒无事件自动衰减；
     战斗状态不再由「进入黄昏城堡」或「波次未打完」决定 */
  let engageT=0,forestZone=0,spawnedWave=false;
  function markEngage(){
    engageT=3;
    /* 1.4 dev2：入战型护盾装备（抗魔斗篷 / 厚实布甲）在真正交战时触发，各带 CD */
    if(CR.equip&&CR.equip.onEnterCombat)try{CR.equip.onEnterCombat();}catch(e){}
  }
  let mode="menu";   // "menu" | "battle" | "market" | "harbor"
  let baseZoom=1;     // 桌面端拉近镜头，避免宽屏露出地面矩形边界
  function setBaseZoom(v){baseZoom=CR.u.clamp(v,1,1.4);zoom=zoomTarget=baseZoom;}
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
    if(mode==="market"||mode==="harbor"||mode==="forest"||mode==="swamp"||mode==="border"||mode==="university")return; // 各开放地图天空由专属渲染器绘制
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
    for(let x=50;x<levelWidth(mode);x+=U.rr(58,132)){
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
    /* 1.3.1 开放大世界：不再锁定镜头，也不显示副本式「第 N 波倒计时」 */
    CR.audio.sfx("wave");
    if(w.boss)CR.ui.banner("黑石城主 · 降临");
    else CR.ui.banner("⚔ 遭遇 · "+CFG.ZONES[zoneIndexAt(w.x)].name+" 的敌人");
    addShake(5);
    markEngage();
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
    if(mode!=="battle")return;
    const W=CFG.WAVES;
    if(waveIdx<W.length&&!spawnedWave&&CR.ent.aliveEnemies(true)===0&&P.x>=W[waveIdx].x){
      clearNeutrals();
      spawnWave(W[waveIdx]);spawnedWave=true;
    }
    /* 1.3.1 清完当前遭遇就推进索引，不弹「通路开启」，玩家可以自由往返 */
    if(waveIdx<W.length&&spawnedWave&&CR.ent.aliveEnemies(true)===0){
      spawnedWave=false;waveIdx++;
      CR.save.addGold(25);
      CR.audio.sfx("coin");
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
    const levelW=levelWidth(mode);
    let target=P.x-viewW*.34;
    target=U.clamp(target,0,Math.max(0,levelW-viewW));
    if(mode==="battle"&&camLock<INF)target=Math.min(target,camLock);
    camX=U.lerp(camX,target,1-Math.pow(.0015,dt));
    if(mode==="battle"&&camLock<INF)P.x=U.clamp(P.x,camX+40,camX+viewW-70);
    else if(P.x>camX+viewW-70){
      /* 1.4 dev1.2 根因修复：旧逻辑 P.x=Math.min(P.x,camX+viewW-70) 会在相机
         lerp 落后时把玩家强行往地图前方拖（瞬移、切换角色、进图后尤其明显），
         实测能把 P.x=4490 拽回 1482；连带使「以 P.x 为锚」生成的试炼 BOSS
         落在星火港入口而不是对话点，玩家也永远走不到沉没古神庙。
         改为相机追玩家：直接把 camX 对齐可视区，玩家坐标不被改写。 */
      camX=Math.min(Math.max(0,P.x-viewW+90),Math.max(0,levelW-viewW));
    }
    // 镜头缩放：冲刺拉远、BOSS 战轻微拉远、受击回弹
    zoomTarget=baseZoom*(P.dash.t>0?.965:(bossRef&&bossRef.alive?.975:1));
    if(P.hurtT>0)zoomTarget=baseZoom*1.018;
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
  /* 1.2.0 开放大世界：BOSS 倒下不再触发副本结算，只点亮通路与大地图 */
  function onBossDead(){
    cleared=true;winTimer=-1;finished=false;
    camLock=INF;waveIdx=CFG.WAVES.length;
    addWhite(.6);addShake(14);
    CR.ui.banner("🏆 黑石城主已被击败 · 黄昏城堡通路全开");
  }
  function tick(dt){
    playTime+=dt;
    if(engageT>0)engageT=Math.max(0,engageT-dt);
    /* 1.3.1 魔法丛林五段子区域：自然过渡，进入时提示区域名 */
    if(mode==="forest"&&CFG.FOREST_ZONES){
      const zi=CFG.forestZoneAt?CFG.forestZoneAt(P.x):0;
      if(zi!==forestZone){forestZone=zi;CR.ui.banner("进入 · "+CFG.FOREST_ZONES[zi].name);}
    }
    if(comboT>0){comboT-=dt;if(comboT<=0)combo=0;}
    if(winTimer>0){winTimer-=dt;if(winTimer<=0)winTimer=-1;}
    updateTheme();
  }
  /* 集市：草丛 / 沙土 / 石板；星火港：木甲板 / 沙滩 / 石板 / 草丛，按 120px 段确定性分布 */
  function groundAt(x){
    const i=Math.floor(x/120),n=((i*73+19)%17)/17;
    if(mode==="harbor"){
      const base=x<700?"beach":(x<2100?"deck":(x<2900?"stone":(x<4100?"deck":"beach")));
      if(n<.18)return "grass";
      if(n>.90)return "sand";
      return base;
    }
    /* 1.3.0 魔法丛林：苔草 / 泥土 / 落叶；踩过草丛有草叶与花瓣反馈 */
    if(mode==="forest"){
      if(n<.42)return "grass";
      if(n>.84)return "sand";
      return "stone";
    }
    /* 1.4 dev1 蛮荒沼泽：浅水 / 泥沼 / 芦苇丛 / 石阶，浅水与泥沼都是踩水声 */
    /* 1.4 dev2 雨沼边境走廊：四段地面（湿草 / 浅水 / 麦田 / 石板） */
    if(mode==="border"&&CR.border)return CR.border.groundAt(x);
    /* v1.4 dev4 魔法大学城：外街 / 广场 / 工会堂 / 公寓四段地面 */
    if(mode==="university"&&CR.university)return CR.university.groundAt(x);
    if(mode==="swamp"){
      const zi=CFG.swampZoneAt?CFG.swampZoneAt(x):0;
      if(zi===3)return n<.7?"stone":"water";   // 古神庙石阶
      if(zi===1)return n<.3?"grass":"sand";     // 部落踩实的红泥
      if(n<.34)return "water";
      if(n<.58)return "grass";
      return "sand";
    }
    const base=x<900?"grass":(x<1700?"stone":(x<2500?"sand":"stone"));
    if(n<.24)return "grass";
    if(n>.87)return "sand";
    return base;
  }
  const segCache=[];
  function groundSegments(){
    if(segCache.length)return segCache;
    const W=levelWidth(mode);
    for(let x=0;x<W;x+=120)
      segCache.push({x0:x,x1:Math.min(W,x+120),type:groundAt(x+60)});
    return segCache;
  }
  function init(m){
    mode=m||"battle";
    camX=0;camLock=INF;zoom=zoomTarget=1;shake=flash=white=0;
    shakeX=shakeY=0;waveIdx=0;zoneIdx=0;playTime=0;kills=0;combo=0;
    comboT=0;bestCombo=0;winTimer=-1;finished=false;cleared=false;bossRef=null;
    segCache.length=0;
    engageT=0;spawnedWave=false;forestZone=0;
    sceneMusic=CFG.ZONES[0].music;
    genProps();updateTheme();
  }
  CR.world={props,theme,proj,init,tick,spawnWave,updateWaves,updateCamera,levelWidth,setBaseZoom,zoneAt,zoneIndexAt,
    markEngage,
    groundAt,groundSegments,addShake,addFlash,addWhite,addCombo,resetCombo,addKill,onBossDead,
    get mode(){return mode;},set mode(v){mode=v;},
    get camX(){return camX;},set camX(v){camX=v;},
    get baseZoom(){return baseZoom;},
    get camLock(){return camLock;},set camLock(v){camLock=v;},get zoom(){return zoom;},
    set bossRef(v){bossRef=v;},get cleared(){return cleared;},
    /* 战斗中判定：主状态机用它锁住仓库 / 编队操作 */
    get combatActive(){
      /* 1.3.1：只有真的交战才锁培养 / 入库。
         条件 = 试炼进行中 / 最近 3 秒有攻击事件 / 附近有活着的敌对单位。
         进入黄昏城堡、波次未打完、地图远处有怪，都不再算战斗状态。 */
      if(mode==="harbor"&&CR.harbor&&CR.harbor.trial&&CR.harbor.trial.active)return true;
      if(engageT>0)return true;
      let found=false;
      try{
        CR.ent.enemies.each(e=>{
          if(found)return;
          /* 1.4 dev1.3：只有已发现玩家（alerted）的敌对单位才算交战状态 */
          if(e.alive&&e.hostile&&(mode==="battle"||e.alerted===true||e.type==="sakuraBoss")&&Math.abs(e.x-P.x)<680)found=true;
        });
      }catch(err){}
      return found;
    },
    get shake(){return shake;},get flash(){return flash;},get white(){return white;},
    get waveIdx(){return waveIdx;},get zoneIdx(){return zoneIdx;},
    get kills(){return kills;},get combo(){return combo;},get bestCombo(){return bestCombo;},
    get playTime(){return playTime;},get bossRef(){return bossRef;},
    get finished(){return finished;},get sceneMusic(){return sceneMusic;}};
})(window.CR=window.CR||{});
