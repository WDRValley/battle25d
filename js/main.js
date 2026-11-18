/* main.js — 状态机 + 固定 60Hz 逻辑步长 + 单次 WebGL 渲染调度 v1.4 dev1 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save,E=CR.ent,P=E.player;
  const $=id=>document.getElementById(id);
  const STEP=1/60;
  let state="menu",time=0,acc=0,last=0,startGold=0,deathT=-1;
  let prevState="menu",idleTimer=null;
  /* v1.2.1：单帧异常隔离统计（QA 可读） */
  let frameErrCount=0,lastFrameErr="";

  const game={
    get time(){return time;},get state(){return state;},
    start,startBattle,enterMap,enterMarket,enterHarbor,enterForest,enterSwamp,backMenu,openMap,closeMap,togglePause,
    closePanel,openPanel,resize,inCombat,revive,
    get frameErrors(){return frameErrCount;}
  };
  function inCombat(){return state==="play"&&!!CR.world.combatActive;}
  CR.game=game;

  /* ---------- 尺寸 ---------- */
  function resize(){
    const q=CFG.QUALITY[CR.gl.quality];
    const dpr=Math.min(window.devicePixelRatio||1,q.dpr);
    CR.gl.dpr=dpr;
    CR.gl.resize(Math.max(320,Math.floor(innerWidth*dpr)),
      Math.max(240,Math.floor(innerHeight*dpr)));
  }
  /* 1.1.0 设备检测：移动端保持原镜头，桌面宽屏轻微拉近以消除地面边界穿帮 */
  function detectDevice(){
    const ua=navigator.userAgent||"";
    const coarse=!!(window.matchMedia&&window.matchMedia("(pointer:coarse)").matches);
    const mobile=coarse||/Android|webOS|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(ua)||innerWidth<768;
    CR.device={mobile,coarse,isDesktop:!mobile,
      label:mobile?"移动设备（镜头保持原距离）":"桌面设备（镜头已拉近）"};
    CR.world.setBaseZoom(mobile?1:1.085);
    return CR.device;
  }
  function wake(){
    // 仅当处于冻结轮询时才需要唤醒，避免和正常 rAF 链重复
    if(!idleTimer)return;
    clearTimeout(idleTimer);idleTimer=null;
    last=performance.now();acc=0;
    requestAnimationFrame(frame);
  }

  /* ---------- 菜单演示场景 ---------- */
  function setupMenuScene(){
    E.reset(SV.teamClass(0)||0);
    CR.world.init("menu");
    P.x=330;P.depth=8;P.scale=1.12;P.facing=1;P.anim=0;
    P.name=SV.teamName(0);
    const a=E.spawnEnemy("neutral",540,-42);if(a){a.hostile=false;a.spawn=0;}
    const b=E.spawnEnemy("minion",660,34);if(b)b.spawn=0;
    const c=E.spawnEnemy("elite",740,-16);if(c)c.spawn=0;
    CR.ui.buildSkills();CR.ui.buildSlots();CR.ui.buildTeamHud();
  }

  /* ---------- 进入战役（黄昏城堡） ---------- */
  function start(cls){return startBattle(cls);}
  function startBattle(cls,keepTeam){
    /* 1.4 dev1.4：取消入场选人，不再用 setLeaderClass 重排队伍。
       旧实现会把第 4 位角色挤掉；现在完全沿用存档里的队伍编排与出战位。 */
    SV.flush();
    CR.audio.init();CR.audio.resume();CR.audio.setPaused(false);
    CR.world.init("battle");
    CR.team.init();               // 按 1 号位初始化出战角色（内含 E.reset）
    CR.combat.resetSlots();
    CR.input.reset();
    CR.audio.setScene("field",true);
    state="play";acc=0;deathT=-1;startGold=SV.data.profile.gold;
    wake();
    CR.ui.showPlay("battle");
    /* 1.3.1：取消副本式「第 1 波准备迎击」倒计时，进入即是开放世界 */
    CR.ui.banner("黄昏城堡 · 开放世界 · 靠近敌人才会交战");
    CR.audio.sfx("uiBig");
  }
  /* ---------- 进入狂欢集市 ---------- */
  function enterMarket(){
    CR.audio.init();CR.audio.resume();CR.audio.setPaused(false);
    CR.world.init("market");
    CR.team.init();               // E.reset → x=120，正好是集市入口
    P.x=160;P.depth=0;P.h=0;P.vh=0;P.facing=1;
    CR.combat.resetSlots();
    CR.input.reset();
    CR.market.init();             // 天气 / 行人 / 中立野怪 / 配乐
    state="play";acc=0;deathT=-1;startGold=SV.data.profile.gold;
    wake();
    CR.ui.showPlay("market");
    CR.ui.banner("狂欢集市 · 自由城镇");
  }
  /* ---------- 进入星火港（开放港口） ---------- */
  function enterHarbor(){
    CR.audio.init();CR.audio.resume();CR.audio.setPaused(false);
    CR.world.init("harbor");
    CR.team.init();
    P.x=170;P.depth=0;P.h=0;P.vh=0;P.facing=1;
    CR.combat.resetSlots();
    CR.input.reset();
    CR.harbor.init();
    state="play";acc=0;deathT=-1;startGold=SV.data.profile.gold;
    wake();
    CR.ui.showPlay("harbor");
    CR.ui.banner("星 火 港 · 自 由 港 口");
  }
  /* ---------- 进入魔法丛林（含【原始森林】采伐区） ---------- */
  function enterForest(){
    CR.audio.init();CR.audio.resume();CR.audio.setPaused(false);
    CR.world.init("forest");
    CR.team.init();
    P.x=170;P.depth=0;P.h=0;P.vh=0;P.facing=1;
    CR.combat.resetSlots();CR.combat.resetBattleFlags();
    CR.input.reset();
    CR.forest.init();
    state="play";acc=0;deathT=-1;startGold=SV.data.profile.gold;
    wake();
    CR.ui.showPlay("forest");
    CR.ui.banner("魔 法 丛 林 · 森 林 入 口");
  }
  /* ---------- 进入蛮荒沼泽（危险区 · 五段子区域） ---------- */
  function enterSwamp(){
    CR.audio.init();CR.audio.resume();CR.audio.setPaused(false);
    CR.world.init("swamp");
    CR.team.init();
    P.x=170;P.depth=0;P.h=0;P.vh=0;P.facing=1;
    CR.combat.resetSlots();CR.combat.resetBattleFlags();
    CR.input.reset();
    CR.swamp.init();
    state="play";acc=0;deathT=-1;startGold=SV.data.profile.gold;
    wake();
    CR.ui.showPlay("swamp");
  }
  /* ---------- 进入雨沼边境走廊（v1.4 dev2 · 9600px 四段过渡带） ---------- */
  function enterBorder(){
    CR.audio.init();CR.audio.resume();CR.audio.setPaused(false);
    CR.world.init("border");
    CR.team.init();
    P.x=CFG.BORDER_SPAWN_X||3120;P.depth=0;P.h=0;P.vh=0;P.facing=1;
    CR.combat.resetSlots();CR.combat.resetBattleFlags();
    CR.input.reset();
    CR.border.init();
    state="play";acc=0;deathT=-1;startGold=SV.data.profile.gold;
    wake();
    CR.ui.showPlay("border");
  }
  function enterMap(id){
    if(id==="dusk")startBattle(SV.teamClass(0)||0);
    else if(id==="market"){
      if(!SV.mapUnlocked("market")){CR.ui.toast("尚未解锁狂欢集市");backMenu();return;}
      enterMarket();
    }else if(id==="harbor"){
      if(!SV.mapUnlocked("harbor")){CR.ui.toast("尚未解锁星火港");backMenu();return;}
      enterHarbor();
    }else if(id==="forest"){
      if(!SV.mapUnlocked("forest")){CR.ui.toast("尚未解锁魔法丛林");backMenu();return;}
      enterForest();
    }else if(id==="swamp"){
      if(!SV.mapUnlocked("swamp")){CR.ui.toast("尚未解锁蛮荒沼泽");backMenu();return;}
      enterSwamp();
    }else if(id==="border"){
      if(!SV.mapUnlocked("border")){CR.ui.toast("尚未解锁雨沼边境走廊");backMenu();return;}
      enterBorder();
    }
  }
  /* ---------- 大地图 ---------- */
  function openMap(){
    prevState=state;
    state="map";
    CR.ui.openMap();
  }
  function closeMap(){
    CR.ui.closeMap();
    if(prevState==="menu"||prevState==="win"||prevState==="lose"){backMenu();return;}
    state="play";wake();
    CR.ui.showPlay(CR.world.mode==="menu"?"battle":CR.world.mode);
  }
  /* ---------- 菜单 ---------- */
  function backMenu(){
    state="menu";wake();
    CR.audio.setPaused(false);
    CR.world.mode="menu";
    setupMenuScene();
    CR.ui.showMenu();
  }
  function togglePause(){
    if(CR.ui.panelOpen){closePanel();return;}
    if(state==="play"){
      state="pause";CR.audio.setPaused(true);CR.audio.chargeStop();
      CR.ui.banner("已 暂 停 · P 继续");
    }else if(state==="pause"){
      state="play";CR.audio.setPaused(false);CR.ui.syncHud(true);wake();
    }
  }
  function closePanel(){
    if(!CR.ui.panelOpen)return;
    CR.ui.closePanel();
  }
  function openPanel(tab){CR.ui.openPanel(tab||"char");}
  /* 1.2.0：通关不再弹副本结算，只给祝贺词 + 点亮大地图，玩家继续留在开放世界里 */
  function onDuskCleared(){
    if(state!=="play"||CR.world.mode!=="battle"||SV.data.progress.duskCleared)return;
    const gold=Math.max(0,SV.data.profile.gold-startGold);
    SV.recordRun(true,CR.world.kills,CR.world.bestCombo,gold,CR.world.playTime);
    SV.clearDusk();
    CR.audio.setScene("victory",true);
    CR.audio.chargeStop();CR.audio.sfx("unlock");
    CR.ui.refreshMapLock();CR.ui.refreshVersionDot();
    CR.ui.banner("🏆 城主已倒下！黄昏城堡全部关卡通关");
    CR.ui.toast("大地图已点亮 · 按 M 可随时前往【狂欢集市】/【星火港】，也可继续在此探索");
    CR.ui.syncHud(true);
    setTimeout(()=>{if(state==="play"&&CR.world.mode==="battle")CR.audio.setScene("field",true);},5200);
  }
  /* ================= 1.4 dev1.4 阵亡 / 自动换人 / 复活 ================= */
  function sceneFor(mode){
    if(mode==="market")return "market";
    if(mode==="harbor")return "harbor";
    if(mode==="forest")return "forest";
    if(mode==="swamp"&&CR.swamp&&CR.swamp.zoneScene)return CR.swamp.zoneScene();
    if(mode==="border"&&CR.border&&CR.border.zoneScene)return CR.border.zoneScene();
    return "field";
  }
  function entryX(mode){
    if(mode==="battle")return 120;
    if(mode==="market")return 160;
    if(mode==="border")return CFG.BORDER_SPAWN_X||3120;
    return 170;
  }
  function onPlayerDown(){
    const cur=CR.team.current();
    CR.team.markDead(cur);
    const next=CR.team.nextAlive(cur);
    if(next>=0){
      CR.team.forceReady();
      CR.team.switchTo(next,false,true);
      if(CR.status)CR.status.clear(P);
      P.inv=Math.max(P.inv,1.0);
      CR.audio.setScene(sceneFor(CR.world.mode),true);
      CR.ui.banner("⚔ "+SV.teamName(cur)+" 已倒下 · "+SV.teamName(next)+" 接替登场");
      CR.ui.toast("自动切换存活队友 · 倒下的角色需要复活或补给恢复");
      CR.audio.sfx("switch");
      CR.ui.syncHud(true);
      deathT=-1;
      return;
    }
    /* 全员阵亡：冻结画面，显示复活面板 */
    state="revive";
    CR.audio.chargeStop();CR.audio.setPaused(true);
    CR.ui.showRevive({mode:CR.world.mode,
      zone:(CR.world.mode==="swamp"&&CR.swamp&&CFG.SWAMP_ZONES[CR.swamp.zone]?
        CFG.SWAMP_ZONES[CR.swamp.zone].name:
        (CR.world.mode==="border"&&CR.border&&CFG.BORDER_ZONES[CR.border.zone]?
          CFG.BORDER_ZONES[CR.border.zone].name:"")),
      names:[0,1,2,3].map(i=>SV.teamClass(i)===null?null:SV.teamName(i)).filter(Boolean),
      gold:SV.data.profile.gold});
    deathT=-1;
  }
  function revive(){
    if(state!=="revive")return;
    const mode=CR.world.mode;
    CR.team.reviveAll(.25);
    P.x=entryX(mode);P.depth=0;P.h=0;P.vh=0;P.vx=0;P.vd=0;P.facing=1;
    P.inv=1.6;
    CR.world.updateCamera(0);
    /* 复活后脱战：清掉敌对单位的激活标记，避免刚落地又被围 */
    try{CR.ent.enemies.each(e=>{if(e.alive&&e.type!=="sakuraBoss"){
      e.alerted=false;e.aggro=0;e.hostile=e.type==="neutral"?false:e.hostile;}});}catch(err){}
    if(CR.status)CR.status.clear(P);
    CR.ui.hideScreen("revive");
    CR.ui.showPlay(mode);
    CR.audio.setScene(sceneFor(mode),true);
    CR.audio.setPaused(false);
    state="play";acc=0;deathT=-1;
    wake();
    CR.ui.banner("✨ 全队复归 · 恢复 25% 生命 · 已回到地图入口");
    CR.ui.syncHud(true);
  }
  function finish(win){
    if(state!=="play"||CR.world.mode!=="battle")return;
    if(win){onDuskCleared();return;}       // 胜利不再切结算界面
    state="lose";
    const gold=Math.max(0,SV.data.profile.gold-startGold);
    SV.recordRun(false,CR.world.kills,CR.world.bestCombo,gold,CR.world.playTime);
    CR.audio.setScene("defeat",true);
    CR.audio.chargeStop();
    CR.ui.showOver(false,{time:CR.world.playTime,kills:CR.world.kills,
      combo:CR.world.bestCombo,gold,level:SV.levelOf(P.cls)},false);
  }

  /* ---------- 逻辑更新 ---------- */
  function update(dt){
    if(CR.ui.panelOpen||CR.ui.dialogueOpen||CR.ui.shopOpen||CR.ui.libOpen||
       CR.ui.tradeOpen||CR.ui.regionOpen||CR.ui.growOpen||CR.ui.questOpen||
       CR.ui.swampShopOpen)return;
    CR.input.update(dt);
    /* 1.4 dev1.3 异常状态结算 / 全局天气 / 混乱反向移动 */
    if(CR.status){
      CR.status.update(dt);
      if(CR.status.noAction()){P.vx=0;P.vd=0;}
      else if(CR.status.confused()){P.vx=-P.vx;P.vd=-P.vd;}
    }
    if(CR.weather)CR.weather.update(dt);
    CR.team.tick(dt);
    E.updatePlayerPhysics(dt);
    E.updateEnemyPhysics(dt);
    CR.combat.updateAI(dt);
    CR.combat.updateShots(dt);
    CR.combat.updateDrops(dt);
    CR.combat.updateSlots(dt);
    CR.combat.tickCore(dt);        // 1.4 dev1：8 维等级回落 + 每秒回血回蓝
    E.updateVisuals(dt);
    if(CR.world.mode==="market")CR.market.update(dt);
    else if(CR.world.mode==="harbor")CR.harbor.update(dt);
    else if(CR.world.mode==="forest")CR.forest.update(dt);
    else if(CR.world.mode==="swamp")CR.swamp.update(dt);
    else if(CR.world.mode==="border")CR.border.update(dt);
    else CR.world.updateWaves(dt);
    CR.world.updateCamera(dt);
    CR.world.tick(dt);
    SV.tick(dt);
    CR.ui.syncHud(false);
    /* 1.4 dev1.4：所有地图统一处理阵亡；先自动换人，全员倒下才弹复活 */
    if(P.dead){
      if(deathT<0)deathT=.80;
      if(deathT>0){deathT-=dt;if(deathT<=0)onPlayerDown();}
    }else deathT=-1;
    if(CR.world.mode==="battle"&&CR.world.cleared)onDuskCleared();
  }

  /* ---------- 渲染 ---------- */
  function render(){
    CR.gl.begin();
    let post;
    if(CR.world.mode==="market"&&state!=="menu"){
      CR.renderMarket.drawScene();post=CR.market.post();
    }else if(CR.world.mode==="harbor"&&state!=="menu"){
      CR.renderHarbor.drawScene();post=CR.harbor.post();
    }else if(CR.world.mode==="forest"&&state!=="menu"){
      CR.renderForest.drawScene();post=CR.forest.post();
    }else if(CR.world.mode==="swamp"&&state!=="menu"){
      CR.renderSwamp.drawScene();post=CR.swamp.post();
    }else if(CR.world.mode==="border"&&state!=="menu"){
      CR.renderBorder.drawScene();post=CR.border.post();
    }else{
      CR.render.drawScene();
      post={time:time,flash:CR.world.flash,white:CR.world.white,
        tint:CR.world.theme.tint,ambient:CR.world.theme.ambient};
    }
    /* 1.4 dev1.3：全局天气层（集市 / 沼泽各有专属层，模块内部自动跳过） */
    if(CR.weather){CR.weather.draw();post=CR.weather.decorate(post);}
    CR.gl.end(post);
  }
  /* v1.2.1：任何单帧异常都不允许切断 rAF 链。
     旧实现把续帧放在 frame() 最末尾，一旦 update/render 抛错就再也调度不到下一帧，
     表现为「画面静止但背包 / 大地图等 DOM 面板仍可点」——极难排查。 */
  function onFrameError(err){
    frameErrCount++;
    acc=0;                         // 丢弃积压步长，避免异常在补帧里连爆
    const msg=String((err&&err.message)||err);
    if(msg===lastFrameErr)return; // 同一种错误只上报一次，不刷屏
    lastFrameErr=msg;
    try{console.error("[CR] 单帧异常已隔离，渲染继续：",(err&&err.stack)||err);}catch(e){}
    try{CR.ui.toast("画面已自动恢复 · 单帧异常已隔离");}catch(e){}
  }
  function frame(now){
    let needNext=true;
    try{
      const raw=Math.min((now-last)/1000,.05);last=now;
      const frozen=(state==="pause"||state==="map"||state==="win"||state==="lose"||state==="revive");
      const dt=frozen?0:raw;
      /* 暂停 / 大地图 / 结算：不再调用 render()，上一帧留在 canvas 上定格；
         GPU 零提交，CPU 也从 60Hz rAF 降到 5Hz 轮询，显卡真正休息 */
      if(frozen){
        CR.audio.update(0);
        if(!idleTimer)idleTimer=setTimeout(()=>{
          idleTimer=null;last=performance.now();
          requestAnimationFrame(frame);
        },200);
        needNext=false;            // 冻结轮询自行负责续帧，避免重复 rAF
        return;
      }
      time+=dt;
      if(state==="play"){
        acc+=dt;let steps=0;
        while(acc>=STEP&&steps<3){update(STEP);acc-=STEP;steps++;}
        if(steps===3)acc=0;
      }
      CR.audio.update(dt);
      CR.ui.tick(dt);
      render();
    }catch(err){
      onFrameError(err);
    }finally{
      if(needNext)requestAnimationFrame(frame);
    }
  }

  /* ---------- 输入回调 ---------- */
  function bindInput(){
    CR.input.init({
      attack:()=>{if(state==="play")CR.combat.doAttack();},
      chargeBegin:()=>{if(state==="play")CR.audio.sfx("charge");},
      charge:lv=>{if(state==="play")CR.combat.doCharge(lv);},
      chargeEnd:()=>{},
      jump:()=>{if(state==="play")CR.combat.doJump();},
      skill:i=>{if(state==="play")CR.combat.doSkill(i);},
      slot:i=>{if(state==="play")CR.combat.useSlot(i);},
      team:i=>{if(state==="play")CR.team.switchTo(i);},
      interact:()=>{
        if(state!=="play")return;
        if(CR.world.mode==="market")CR.market.interact();
        else if(CR.world.mode==="harbor")CR.harbor.interact();
        else if(CR.world.mode==="forest")CR.forest.interact();
        else if(CR.world.mode==="swamp")CR.swamp.interact();
        else if(CR.world.mode==="border")CR.border.interact();
      },
      region:()=>{if(state==="play"||state==="pause")CR.ui.toggleRegion();},
      pause:()=>{if(state==="play"||state==="pause")togglePause();},
      bag:()=>{
        if(state==="win"||state==="lose"||state==="revive")return;
        if(CR.ui.panelOpen&&CR.ui.curTab==="bag")closePanel();
        else openPanel("bag");
      },
      map:()=>{
        if(state==="map"){closeMap();return;}
        openMap();
      },
      panel:()=>{
        if(state!=="play"&&state!=="pause")return;
        if(CR.ui.panelOpen)closePanel();else openPanel("char");
      },
      char:()=>{
        if(state==="win"||state==="lose"||state==="revive")return;
        if(CR.ui.panelOpen&&CR.ui.curTab==="char")closePanel();
        else openPanel("char");
      },
      escape:()=>{
        if(CR.ui.growOpen){CR.ui.closeGrow();return;}
        if(CR.ui.panelOpen){closePanel();return;}
        if(CR.ui.dialogueOpen){CR.ui.hideScreen("dialogue");return;}
        if(CR.ui.shopOpen){CR.ui.hideScreen("shop");return;}
        if(CR.ui.libOpen){CR.ui.closeEquipLib();return;}
        if(CR.ui.regionOpen){CR.ui.closeRegion();return;}
        if(CR.ui.tradeOpen){CR.ui.closeTrade();return;}
        if(CR.ui.hatcheryOpen){CR.ui.closeHatchery();return;}
        if(CR.ui.questOpen){CR.ui.closeQuest();return;}
        if(CR.ui.swampShopOpen){CR.ui.closeSwampShop();return;}
        if(CR.ui.growOpen){CR.ui.closeGrow();return;}
        if(state==="map"){closeMap();return;}
        if(state==="play"||state==="pause")togglePause();
      },
      confirm:()=>{
        if(state==="revive")revive();
        else if(state==="menu"||state==="win"||state==="lose")startBattle();
        else if(CR.ui.dialogueOpen)$("dlgNext").click();
      }
    });
  }

  /* ---------- 启动 ---------- */
  function boot(){
    SV.load();
    const cv=$("gl");
    if(!CR.gl.init(cv)){
      document.body.innerHTML='<div style="padding:48px;font-size:17px;line-height:2;'+
        'color:#eaf1ff;font-family:sans-serif">当前浏览器不支持 WebGL。<br>'+
        '请使用 Chrome / Edge / Firefox，并确认已开启硬件加速。</div>';
      return;
    }
    CR.gl.setQuality(SV.data.settings.quality);
    resize();
    detectDevice();
    window.addEventListener("resize",()=>{resize();detectDevice();});
    bindInput();
    CR.weather.init();          /* 1.4 dev1.3 全局天气初始化 */
    try{CR.ui.init();}catch(e){try{console.error("[CR] UI 初始化异常已隔离",e);}catch(_){}}
    setupMenuScene();
    CR.audio.setScene("menu",true);
    CR.market.tryNetworkTime();     // 联网则优先采用权威北京时间，失败静默回退
    if(CR.harbor)CR.harbor.tryNetworkTime();
    if(CR.forest)CR.forest.tryNetworkTime();
    /* 1.4 dev1.5：把找回的角色明确告诉玩家，不再默默消失 */
    const repaired=SV.rosterRepair||[];
    if(repaired.length)CR.ui.toast("🔎 已找回丢失角色："+repaired.join(" / ")+" · 可在【角色 / 队伍】里调整顺序");
    else if(SV.hasUnreadVersion())CR.ui.toast("v"+CFG.VERSION+" 已发布 · 菜单「版本预告」查看更新内容");
    last=performance.now();
    requestAnimationFrame(frame);
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden)CR.audio.chargeStop();
      else if(state==="play"){CR.audio.resume();last=performance.now();}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})(window.CR=window.CR||{});
