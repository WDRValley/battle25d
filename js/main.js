/* main.js — 状态机 + 固定 60Hz 逻辑步长 + 单次 WebGL 渲染调度 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save,E=CR.ent,P=E.player;
  const $=id=>document.getElementById(id);
  const STEP=1/60;
  let state="menu",time=0,acc=0,last=0,startGold=0,deathT=-1;

  const game={
    get time(){return time;},
    get state(){return state;},
    start,backMenu,togglePause,closePanel,openPanel,resize
  };
  CR.game=game;

  /* ---------- 尺寸 ---------- */
  function resize(){
    const q=CFG.QUALITY[CR.gl.quality];
    const dpr=Math.min(window.devicePixelRatio||1,q.dpr);
    CR.gl.dpr=dpr;
    CR.gl.resize(Math.max(320,Math.floor(innerWidth*dpr)),Math.max(240,Math.floor(innerHeight*dpr)));
  }

  /* ---------- 菜单演示场景 ---------- */
  function setupMenuScene(){
    E.reset(SV.data.profile.cls);
    CR.world.init();
    P.x=330;P.depth=8;P.scale=1.12;P.facing=1;P.anim=0;
    const n=E.spawnEnemy("neutral",540,-42);if(n){n.hostile=false;n.spawn=0;}
    const a=E.spawnEnemy("minion",660,34);if(a)a.spawn=0;
    const b=E.spawnEnemy("elite",740,-16);if(b)b.spawn=0;
  }

  /* ---------- 状态切换 ---------- */
  function start(cls){
    cls=U.clamp(cls|0,0,2);
    SV.data.profile.cls=cls;SV.mark();SV.flush();
    CR.audio.init();CR.audio.resume();
    CR.audio.setPaused(false);
    CR.audio.setScene("field",true);
    E.reset(cls);CR.world.init();CR.input.reset();
    state="play";acc=0;deathT=-1;startGold=SV.data.profile.gold;
    CR.ui.showPlay();
    CR.ui.banner("第 1 波 · 准备迎击");
    CR.audio.sfx("uiBig");
  }
  function backMenu(){
    state="menu";
    CR.audio.setPaused(false);
    setupMenuScene();
    CR.ui.showMenu();
  }
  function togglePause(){
    if(CR.ui.panelOpen){closePanel();return;}
    if(state==="play"){
      state="pause";CR.audio.setPaused(true);CR.audio.chargeStop();
      CR.ui.banner("已 暂 停 · P 继续");
    }else if(state==="pause"){
      state="play";CR.audio.setPaused(false);CR.ui.syncHud(true);
    }
  }
  function closePanel(){
    if(!CR.ui.panelOpen)return;
    CR.ui.closePanel();   // 暂停状态保持不变，由玩家自行按 P 继续
  }
  function openPanel(tab){CR.ui.openPanel(tab||"char");}
  function finish(win){
    if(state!=="play")return;
    state=win?"win":"lose";
    const gold=Math.max(0,SV.data.profile.gold-startGold);
    SV.recordRun(win,CR.world.kills,CR.world.bestCombo,gold,CR.world.playTime);
    CR.audio.setScene(win?"victory":"defeat",true);
    CR.audio.chargeStop();
    CR.ui.showOver(win,{time:CR.world.playTime,kills:CR.world.kills,
      combo:CR.world.bestCombo,gold});
  }

  /* ---------- 更新 ---------- */
  function update(dt){
    if(CR.ui.panelOpen)return;   // 面板打开期间冻结战斗，但音乐与画面继续
    CR.input.update(dt);
    E.updatePlayerPhysics(dt);
    E.updateEnemyPhysics(dt);
    CR.combat.updateAI(dt);
    CR.combat.updateShots(dt);
    CR.combat.updateDrops(dt);
    E.updateVisuals(dt);
    CR.world.updateWaves(dt);
    CR.world.updateCamera(dt);
    CR.world.tick(dt);
    SV.tick(dt);
    CR.ui.syncHud(false);
    if(P.dead&&deathT<0)deathT=1.15;
    if(deathT>0){deathT-=dt;if(deathT<=0)finish(false);}
    if(CR.world.finished)finish(true);
  }

  /* ---------- 渲染 ---------- */
  function render(){
    CR.gl.begin();
    CR.render.drawScene();
    CR.gl.end({time:time,flash:CR.world.flash,white:CR.world.white,
      tint:CR.world.theme.tint,ambient:CR.world.theme.ambient});
  }

  /* ---------- 主循环 ---------- */
  function frame(now){
    const raw=Math.min((now-last)/1000,.05);last=now;
    const dt=(state==="pause")?0:raw;
    time+=dt;
    if(state==="play"){
      acc+=dt;
      let steps=0;
      while(acc>=STEP&&steps<3){update(STEP);acc-=STEP;steps++;}
      if(steps===3)acc=0;
    }
    CR.audio.update(dt);
    CR.ui.tick(dt);
    render();
    requestAnimationFrame(frame);
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
      pause:()=>{if(state==="play"||state==="pause")togglePause();},
      panel:()=>{
        if(state!=="play"&&state!=="pause")return;
        if(CR.ui.panelOpen)closePanel();else openPanel("char");
      },
      escape:()=>{
        if(CR.ui.panelOpen){closePanel();return;}
        if(state==="play"||state==="pause")togglePause();
      },
      confirm:()=>{
        if(state==="menu"||state==="win"||state==="lose")start(CR.ui.picked);
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
    window.addEventListener("resize",resize);
    bindInput();
    CR.ui.init();
    setupMenuScene();
    CR.audio.setScene("menu",true);
    last=performance.now();
    requestAnimationFrame(frame);
    // 页面隐藏时暂停音乐，回来后恢复
    document.addEventListener("visibilitychange",()=>{
      if(document.hidden){CR.audio.chargeStop();}
      else if(state==="play"){CR.audio.resume();last=performance.now();}
    });
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})(window.CR=window.CR||{});
