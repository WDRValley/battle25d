/* harbor.js — 星火港：开放港口 / 半中立野怪领地 / 采集点 / 夜樱 BOSS 试炼 / 两位商人 · v1.2.0 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,SV=CR.save,E=CR.ent,P=E.player,WLD=CR.world;
  let netHour=null;
  const st={
    hour:12,phase:"day",isNight:false,clockSrc:"北京时间",
    wind:0,seaT:0,flash:0,
    stepDist:0,lastGround:"",stepT:0,
    near:null,gather:null,
    barrels:[],crates:[],lamps:[],palms:[],grass:[],ropes:[],buoys:[],gulls:[],ships:[],
    walker:[],bubbles:[],mobs:[],nodes:[],
    trial:{active:false,ref:null,winT:0,failT:0,mode:"egg"},
    parts:U.Pool(140,()=>({x:0,y:0,vx:0,vy:0,life:0,max:0,size:0,kind:0,alpha:1,alive:false}))
  };

  /* ---------- 时间：与集市同一套北京时间换算 ---------- */
  function beijingClock(){
    const now=new Date();
    const utc=now.getTime()+now.getTimezoneOffset()*60000;
    const bj=new Date(utc+8*3600000);
    let day=bj.getFullYear()+"-"+String(bj.getMonth()+1).padStart(2,"0")+"-"+String(bj.getDate()).padStart(2,"0");
    let hour=bj.getHours(),src="北京时间";
    if(SV.data.settings.clockSource==="local"){hour=now.getHours();src="本机时间";}
    else if(netHour!==null){hour=netHour;src="联网校时";}
    return {hour,day,src};
  }
  function phaseOf(h){return (h>=18||h<6)?"night":((h>=16&&h<18)?"dusk":"day");}
  function tryNetworkTime(){
    if(!SV.data.settings.networkClock||typeof fetch!=="function")return;
    try{
      fetch("https://worldtimeapi.org/api/timezone/Asia/Shanghai",{cache:"no-store"})
        .then(r=>r.json()).then(j=>{
          if(!j||!j.datetime)return;
          const d=new Date(j.datetime);
          netHour=d.getHours();
          applyClock();
        }).catch(()=>{});
    }catch(e){}
  }
  function applyClock(){
    const c=beijingClock(),was=st.isNight;
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    if(was!==st.isNight&&WLD.mode==="harbor"&&!st.trial.active)
      CR.audio.setScene(st.isNight?"harborNight":"harbor");
    if(CR.ui&&CR.ui.refreshWeather)CR.ui.refreshWeather();
    SV.dailyReset();
  }

  /* ---------- 场景生成 ---------- */
  function buildScenery(){
    U.srand(20261115);
    st.barrels.length=0;st.crates.length=0;st.lamps.length=0;st.palms.length=0;
    st.grass.length=0;st.ropes.length=0;st.buoys.length=0;st.gulls.length=0;st.ships.length=0;
    for(let x=90;x<CFG.HARBOR_W;x+=U.rr(120,230)){
      const d=U.rr(-78,84),n=U.ri(1,3);
      for(let k=0;k<n;k++)st.barrels.push({x:x+k*U.rr(22,38),depth:d+U.rr(-8,8),
        h:U.rr(26,34),phase:U.rr(0,6),tilt:U.rr(-.12,.12)});
    }
    for(let x=180;x<CFG.HARBOR_W;x+=U.rr(190,340)){
      st.crates.push({x,depth:U.rr(-76,80),w:U.rr(34,58),h:U.rr(30,52),stack:U.ri(1,3)});
    }
    for(let x=240;x<CFG.HARBOR_W;x+=300){
      st.lamps.push({x,depth:-84,h:U.rr(84,106),phase:U.rr(0,6)});
    }
    for(let x=340;x<CFG.HARBOR_W;x+=U.rr(420,620)){
      st.palms.push({x,depth:U.rr(-92,-66),h:U.rr(120,168),lean:U.rr(-.16,.16),phase:U.rr(0,6)});
    }
    for(let x=60;x<CFG.HARBOR_W;x+=U.rr(46,96)){
      st.grass.push({x,depth:U.rr(56,96),h:U.rr(12,22),phase:U.rr(0,6),sway:0});
    }
    for(let x=420;x<CFG.HARBOR_W;x+=U.rr(280,460)){
      st.ropes.push({x,depth:U.rr(-80,-50),len:U.rr(60,110),phase:U.rr(0,6)});
    }
    for(let i=0;i<9;i++)st.buoys.push({x:U.rr(200,CFG.HARBOR_W-200),phase:U.rr(0,6)});
    for(let i=0;i<5;i++)st.gulls.push({sx:U.rr(0,CR.gl.W),sy:U.rr(40,CR.gl.H*.34),
      v:U.rr(16,34),phase:U.rr(0,6),size:U.rr(7,12)});
    for(let i=0;i<3;i++)st.ships.push({x:U.rr(300,CFG.HARBOR_W-300),scale:U.rr(.6,1.15),
      phase:U.rr(0,6),sail:U.ri(0,1)});
    st.walker.length=0;
    CFG.HARBOR_WALKERS.forEach(w=>st.walker.push(Object.assign({},w,{
      x:w.x,x0:w.x,depth:w.d0,t:U.rr(0,6),bubble:null,d:-1})));
    st.nodes=CFG.HARBOR_NODES.map(n=>Object.assign({},n,{pulse:U.rr(0,6),flash:0}));
  }
  function spawnMobs(){
    E.enemies.clear();
    st.mobs.length=0;
    CFG.HARBOR_MOBS.forEach(m=>{
      const e=E.spawnEnemy(m.type,m.x,m.depth);
      if(!e)return;
      e.hostile=false;e.spawn=0;e.halfNeutral=true;
      e.home={x:m.x,depth:m.depth};e.territory=m.territory;
      e.patrolT=U.rr(0,6);e.aggroT=0;e.returnT=0;
      st.mobs.push(e);
    });
  }

  /* ---------- 半中立野怪：领地巡逻 / 进入仇恨 / 远离脱战 ---------- */
  function updateMobs(dt){
    const px=P.x,pd=P.depth;
    for(let i=0;i<st.mobs.length;i++){
      const e=st.mobs[i];if(!e||!e.alive)continue;
      const dx=px-e.x,dd=pd-e.depth,dist=Math.hypot(dx,dd);
      const T=e.territory;
      if(!e.hostile){
        // 领地进入 → 吸引仇恨
        if(dist<T&&!P.dead){
          e.hostile=true;e.aggro=1;e.aggroT=0;e.barT=2.2;
          CR.ui.banner("⚠ "+e.cfg.label+" 注意到了你！");
          CR.ui.toast(e.cfg.label+"（"+e.cfg.element+"）进入仇恨 · 离开领地可脱战");
          CR.audio.sfx("aggro");
          E.ringFx(e.x,e.depth,C.hpAmber,T,.6);
          E.spawnFloat(e.x,e.depth,90,"!","warn",C.hpAmber,true);
        }else{
          // 领地内自行巡逻
          e.patrolT+=dt;
          const tx=e.home.x+Math.sin(e.patrolT*.55)*T*.42;
          const td=e.home.depth+Math.cos(e.patrolT*.42)*26;
          e.vx=U.clamp((tx-e.x)*1.6,-52,52);
          e.vd=U.clamp((td-e.depth)*1.4,-26,26);
          e.facing=e.vx>=0?1:-1;
          if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.25);
        }
      }else{
        // 追击中：限制不要跑出领地太远
        const lim=T*1.45;
        if(e.x<e.home.x-lim){e.x=e.home.x-lim;e.vx=Math.max(0,e.vx);}
        if(e.x>e.home.x+lim){e.x=e.home.x+lim;e.vx=Math.min(0,e.vx);}
        // 离开足够远 → 解除仇恨
        if(dist>T*1.65)e.aggroT+=dt;else e.aggroT=0;
        if(e.aggroT>1.05){
          e.hostile=false;e.aggro=0;e.aggroT=0;e.returnT=1;
          e.hp=e.maxHp;e.barT=0;
          CR.ui.toast(e.cfg.label+" 已脱离仇恨 · 回到领地");
          CR.audio.sfx("calm");
          E.burst(e.x,e.depth,20,C.hpBlue,8,90);
          E.spawnFloat(e.x,e.depth,88,"0","aggro",C.hpBlue,false);
        }
      }
      if(e.returnT>0){
        e.returnT=Math.max(0,e.returnT-dt);
        e.vx=U.clamp((e.home.x-e.x)*1.9,-70,70);
        e.vd=U.clamp((e.home.depth-e.depth)*1.7,-32,32);
      }
    }
  }

  /* ---------- 采集 ---------- */
  /* 1.3.0：工具并入双手槽，统一走 equipment.combatState */
  function toolInfo(){
    const cls=P.cls,cs=CR.equip&&CR.equip.combatState?CR.equip.combatState(cls):null;
    const two=CR.equip?CR.equip.slots(cls).two:null;
    const id=two||null;
    return {
      tool:cs?cs.tool:null,toolId:id,
      hasPick:cs?cs.tool==="mining":false,
      hasAxe:cs?cs.tool==="lumber":false,
      hasGloves:cs?cs.tool==="harvest":false,
      blocksCombat:cs?!cs.canAttack:false,
      warriorPick:!!(cs&&cs.tool&&cls===0&&cs.tool!=="harvest"),
      speed:cs?cs.gatherSpeed:1,
      shatter:cs?cs.shatterChance:0,
      harvest:cs?cs.harvestChance:0,
      extra:cs?cs.extraGather:0
    };
  }
  function gatherCheck(node){
    if(SV.gatherLeft(node.id)<=0)
      return {ok:false,reason:"今日采集次数已用完（"+node.daily+" 次 / 日）"};
    const t=toolInfo();
    if(node.kind==="ore"&&!t.hasPick)
      return {ok:false,reason:"需要装备【铁镐】才能敲开矿堆 · 阿福摊位 / 港口商人锻造可得"};
    if(st.trial.active)return {ok:false,reason:"试炼进行中，无法采集"};
    return {ok:true,t};
  }
  function beginGather(node){
    if(st.gather)return {ok:false,reason:"正在采集中"};
    const ck=gatherCheck(node);if(!ck.ok){CR.ui.toast(ck.reason);CR.audio.sfx("deny");return ck;}
    const t=ck.t;
    let dur=node.time;
    if(node.kind==="ore"&&t.hasPick)dur*=.85;
    if(node.kind==="lumber"&&t.hasAxe)dur*=.85;
    dur/=t.speed||1;
    if(t.warriorPick)dur*=.90;
    if(t.shatter&&Math.random()<t.shatter){dur=.01;CR.ui.toast("击碎！本次采集瞬间完成");}
    st.gather={id:node.id,node,t:0,dur,x:P.x,depth:P.depth};
    CR.audio.sfx("gatherBegin");
    CR.ui.toast("开始采集 "+node.name+" · "+dur.toFixed(1)+"s");
    return {ok:true,dur};
  }
  function finishGather(){
    const g=st.gather;if(!g)return;
    const n=g.node,t=toolInfo();
    if(!SV.useGather(n.id)){st.gather=null;CR.ui.setGather(0,"");return;}
    let amount=U.ri(n.min,n.max);
    if(t.hasGloves)amount=Math.ceil(amount*1.25);
    if(n.kind==="ore"&&t.warriorPick)amount=Math.ceil(amount*1.20);
    if(t.harvest&&Math.random()<t.harvest){amount+=1;CR.ui.toast("丰收！额外收获 1 个");}
    amount+=t.extra||0;
    const got={};
    for(let i=0;i<amount;i++){
      const id=U.pick(n.drops);
      SV.addMat(id,1);got[id]=(got[id]||0)+1;
    }
    const left=SV.gatherLeft(n.id);
    const txt=Object.keys(got).map(k=>CFG.MATERIALS[k].name+"×"+got[k]).join(" · ");
    CR.ui.toast("采集完成："+txt+"　·　今日剩余 "+left+" 次");
    CR.ui.banner("✦ "+n.name+" 采集完成");
    CR.audio.sfx(n.kind==="ore"?"mining":"gather");
    E.burst(P.x,P.depth,26,n.kind==="ore"?C.copper:C.green,14,140);
    E.ringFx(P.x,P.depth,n.kind==="ore"?C.copper:C.green,70,.5);
    for(let i=0;i<n.drops.length;i++)
      E.spawnFloat(P.x+i*22-20,P.depth,74,got[n.drops[i]]||0,"mat",
        CFG.MATERIALS[n.drops[i]].color,false);
    const nd=st.nodes.find(x=>x.id===n.id);if(nd)nd.flash=1;
    SV.flush();CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
    st.gather=null;CR.ui.setGather(0,"");
  }
  function updateGather(dt){
    if(!st.gather)return;
    // 采集期间站定：把玩家拉回起点
    P.x=U.lerp(P.x,st.gather.x,.35);P.depth=U.lerp(P.depth,st.gather.depth,.35);
    P.vx=P.vd=0;P.moving=false;
    st.gather.t+=dt;
    const k=U.clamp(st.gather.t/st.gather.dur,0,1);
    CR.ui.setGather(k,st.gather.node.icon+" "+st.gather.node.name+" · "+
      Math.ceil(st.gather.dur-st.gather.t)+"s");
    if(k>=1)finishGather();
  }

  /* ---------- 夜樱 BOSS 试炼 ---------- */
  function trialMode(){return SV.data.progress.eggGranted?"equip":"egg";}
  function startTrial(){
    if(st.trial.active){CR.ui.toast("试炼已经开始了");return false;}
    const left=SV.trialLeft();
    if(left<=0){CR.ui.toast("今日 10 次试炼机会已用完 · 明天再来");CR.audio.sfx("deny");return false;}
    if(!SV.useTrial())return false;
    const mode=trialMode();
    /* 1.3.1 修复：BOSS 必须以「玩家当下所在位置」为锚生成，
       此前写死 NPC 固定坐标 +150，导致试炼开始后 BOSS 落在地图远端、画面里看不见。 */
    const cfg=CFG.HARBOR_NPCS.trial;
    /* 1.4 dev1.2 根因修复：旧版 world.updateCamera 会把 P.x 往相机可视区
       强行回拽，导致「以 P.x 为锚」的 BOSS 落在星火港入口。相机已改为追玩家，
       这里再以对话点作二次保险：玩家永远在 NPC 附近（nearest < 125），
       若因意外被拉开则直接用对话点坐标锚定，并同步相机保证 BOSS 在眼前。 */
    const anchorX=(Math.abs(P.x-cfg.x)<600)?P.x:cfg.x;
    const bx=anchorX+P.facing*U.clamp(150,110,210);
    const bd=U.clamp(((Math.abs(P.x-cfg.x)<600)?P.depth:cfg.depth)+18,-70,80);
    const e=E.spawnEnemy("sakuraBoss",bx,bd);
    if(!e){CR.ui.toast("场地太拥挤了，稍等一下再试");return false;}
    e.spawn=.5;e.hostile=true;e.facing=P.facing>0?-1:1;
    /* ★★★★ 专属装备试炼：BOSS 生命 / 伤害强化 */
    if(mode==="equip"){
      e.maxHp=Math.round(e.maxHp*(CFG.TRIAL.equipHpMul||1.35));
      e.hp=e.maxHp;e.cfg=Object.assign({},e.cfg,{dmg:Math.round(e.cfg.dmg*(CFG.TRIAL.equipDmgMul||1.25))});
      e.equipTrial=true;
    }
    st.trial.active=true;st.trial.ref=e;st.trial.winT=0;st.trial.mode=mode;
    WLD.bossRef=e;
    WLD.updateCamera(0);
    CR.audio.setScene("boss",true);
    CR.audio.sfx("boss");
    CR.ui.banner(mode==="equip"?"✿ 夜樱 · 专属装备试炼 ★★★★ 开始":"✿ 夜樱 · BOSS 试炼 开始");
    CR.ui.toast(mode==="equip"?
      "难度 ★★★★ · 夜樱强化 35% 生命 / 25% 伤害 · 获胜随机得【樱花套件】王者钻装 · 今日剩 "+SV.trialLeft()+" 次":
      "试炼开始 · 今日剩余 "+SV.trialLeft()+" 次 · 失败也会消耗机会");
    if(mode==="equip"){
      const inv=SV.data.inventory.equips||{},pool=CFG.EQUIP_DROPS.sakuraTrial||[];
      const owned=pool.filter(id=>(inv[id]||0)>0).length;
      const full=pool.every(id=>(inv[id]||0)>=(CFG.TRIAL.maxSets||2));
      CR.ui.toast("樱花钻装已收集 "+owned+"/"+pool.length+" 件 · 优先掉落未拥有"+
        (full?" · 已集齐 2 套，获胜改发金币":" · 累计上限 2 套"));
    }
    WLD.addWhite(.35);WLD.addShake(6);
    return true;
  }
  function endTrial(win){
    st.trial.active=false;
    if(st.trial.ref&&st.trial.ref.alive){st.trial.ref.alive=false;E.burst(st.trial.ref.x,st.trial.ref.depth,40,C.sakura,24,200);}
    st.trial.ref=null;WLD.bossRef=null;
    CR.audio.setScene(st.isNight?"harborNight":"harbor",true);
    if(win){
      /* 1.3.1 修复：夜樱蛋全局只发一次，杜绝无限刷蛋；
         1.4 dev1：重复挑战升级为【樱花套件】专属装备试炼，产出王者钻装。 */
      if(st.trial.mode==="equip"){
        /* 1.4 dev1.2：优先掉玩家未拥有的装备；每件最多 2 个（累计 2 套完整钻装），
           集满后改发金币，杜绝「刷一堆重复凑不出 4 件套」。 */
        const pool=CFG.EQUIP_DROPS.sakuraTrial||[],inv=SV.data.inventory.equips||{},
          max=CFG.TRIAL.maxSets||2;
        let cand=pool.filter(id=>(inv[id]||0)<=0);
        if(!cand.length)cand=pool.filter(id=>(inv[id]||0)<max);
        const id=cand.length?cand[U.ri(0,cand.length-1)]:null;
        if(id){
          SV.addEquip(id,1);
          const eq=CFG.EQUIPMENT[id];
          const owned=pool.filter(k=>(inv[k]||0)>0).length;
          CR.ui.banner("🏆 装备试炼成功 · 获得【"+eq.name+"】");
          CR.ui.toast("王者·钻 · "+eq.name+" 已入背包 · 到【角色】面板穿戴（头饰↔帽子 / 衣服↔项链 / 鞋子↔足饰 互斥）");
          CR.ui.toast("已收集 "+owned+"/"+pool.length+" 件 · 优先未拥有 · 累计上限 2 套 · 今日剩 "+SV.trialLeft()+" 次");
        }else{
          SV.addGold(320);
          CR.ui.banner("🏆 试炼成功 · 樱花钻装已集齐 2 套");
          CR.ui.toast("全部 "+pool.length+" 件均已达 2 件上限 · 本次改为 320 金币");
        }
      }else{
        const rw=SV.winTrial()||{egg:false,gold:0};
        CR.ui.banner(rw.egg?"🏆 试炼成功 · 获得【夜樱蛋】":"🏆 试炼成功 · 获得金币");
        CR.ui.toast(rw.egg?
          "夜樱蛋已入背包 · 去【魔法丛林】找德鲁伊打开孵化室（需 300 时间）":
          "夜樱蛋已领取过 · 本次奖励 "+rw.gold+" 金币（夜樱蛋不可重复获得）");
      }
      CR.audio.sfx("victory");CR.audio.sfx("bounty");
      E.ringFx(P.x,P.depth,C.sakura,150,.7);
      WLD.addWhite(.5);
      CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
    }else{
      P.dead=false;P.hp=P.maxHp;P.inv=2.2;P.h=0;P.vh=0;
      P.x=Math.max(120,P.x-220);P.depth=10;
      CR.ui.banner("试炼失败 · 明日再战");
      CR.ui.toast("挑战失败 · 今日剩余 "+SV.trialLeft()+" 次机会");
      CR.audio.sfx("defeat");
    }
  }
  function updateTrial(dt){
    if(!st.trial.active)return;
    const e=st.trial.ref;
    if(!e||!e.alive){endTrial(true);return;}
    if(P.dead||P.hp<=0){endTrial(false);return;}
    /* 1.4 dev1.2：试炼 BOSS 专属攻击链。旧版只依赖通用 AI 近战判定，
       一旦 BOSS 因相机错位落在远处、或类型判断被跳过，玩家就完全不掉血，
       表现为「BOSS 攻击没有伤害」。这里独立保证近距离与远距离都有命中。 */
    e.trialMelee=(e.trialMelee||0)-dt;
    const dist=Math.hypot(P.x-e.x,P.depth-e.depth);
    if(e.trialMelee<=0&&dist<e.cfg.reach*e.scale+34&&P.h<60&&!P.dead){
      e.trialMelee=1.4;
      /* forceHit：试炼 BOSS 的贴身斩击必中，避免首击 MISS 让玩家误以为「没有伤害」 */
      CR.combat.hurtPlayer(Math.round(e.cfg.dmg*.85),e.x,
        {enemy:e,element:e.cfg.element,magic:true,forceHit:true});
      E.ringFx(e.x+e.facing*30,e.depth,C.sakura,70,.35);
      CR.audio.sfx("hit");
      WLD.addShake(3);
    }
    // 常规樱花弹幕（不再限定二阶段，远距离也有明确伤害来源）
    e.trialT=(e.trialT||0)+dt;
    const phase2=e.hp<e.maxHp*.55;
    if(e.trialT>(phase2?2.1:3.4)){
      e.trialT=0;
      for(let k=phase2?-1:0;k<=(phase2?1:0);k++){
        const a=Math.atan2(P.depth-e.depth,P.x-e.x)+k*.28;
        const s=E.spawnShot(7,e.x,e.depth,42,Math.cos(a)*260,Math.sin(a)*150,0,
          phase2?18:14,2.4,C.sakura,false);
        if(s){s.fromPlayer=false;s.r=10;s.magic=true;s.element=e.cfg.element;s.from=e;}
      }
      E.ringFx(e.x,e.depth,C.sakura,110,.4);
      CR.audio.sfx("ice");
    }
  }

  /* ---------- 星火 / 海鸥 / 海浪 ---------- */
  function spawnSpark(){
    const p=st.parts.take();if(!p)return;
    p.kind=U.rnd()<.22?1:0;
    p.x=U.rr(0,CR.gl.W);p.y=U.rr(CR.gl.H*.30,CR.gl.H*.88);
    p.vx=U.rr(-12,20);p.vy=U.rr(-26,-8);
    p.life=p.max=U.rr(1.4,3.4);p.size=U.rr(1.4,3.6);p.alpha=U.rr(.4,1);
  }
  function updateParts(dt){
    if(st.parts.count()<56&&U.rnd()<dt*30)spawnSpark();
    st.parts.each(p=>{
      p.life-=dt;if(p.life<=0){p.alive=false;return;}
      p.x+=p.vx*dt+Math.sin(CR.game.time*1.6+p.y*.02)*5*dt;
      p.y+=p.vy*dt;
      p.alpha=U.clamp(p.life/p.max,0,1);
    });
    st.gulls.forEach(g=>{
      g.sx+=g.v*dt;g.sy=Math.max(24,g.sy+Math.sin(CR.game.time*.9+g.phase)*7*dt);
      if(g.sx>CR.gl.W+30){g.sx=-30;g.sy=U.rr(40,CR.gl.H*.34);}
    });
    st.seaT-=dt;
    if(st.seaT<=0){st.seaT=U.rr(3.2,6.4);CR.audio.sfx("seaWave");}
    if(U.rnd()<dt*.08)CR.audio.sfx("seagull");
    if(st.isNight&&U.rnd()<dt*.10)CR.audio.sfx("lantern");
    st.wind=U.lerp(st.wind,.35+Math.sin(CR.game.time*.23)*.22,dt*.6);
    st.nodes.forEach(n=>{if(n.flash>0)n.flash=Math.max(0,n.flash-dt*1.6);});
  }

  /* ---------- 脚步：木甲板 / 沙滩 / 石板 / 草丛 ---------- */
  function stepSound(g,dt){
    if(!P.moving)return;
    st.stepDist+=dt*Math.abs(P.vx||180)*.8;
    if(st.stepDist<52)return;
    st.stepDist=0;
    const cfg=CFG.GROUND[g]||CFG.GROUND.stone;
    st.lastGround=g;
    CR.audio.sfx(cfg.step||"stepDeck",{pitch:U.rr(.92,1.08)});
    if(g==="grass"){
      st.grass.forEach(x=>{if(Math.abs(x.x-P.x)<64)x.sway=U.rr(.6,1.1);});
      CR.audio.sfx("rustle");
    }
    if(g==="deck"&&U.rnd()<.25)CR.audio.sfx("creak");
  }

  /* ---------- 交互对象 ---------- */
  function nearest(){
    let best=null,bd=1e9;
    for(const key in CFG.HARBOR_NPCS){
      const n=CFG.HARBOR_NPCS[key];
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<125&&d<bd){bd=d;best={type:"npc",id:key,cfg:n,d};}
    }
    st.nodes.forEach(n=>{
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<98&&d<bd){bd=d;best={type:"node",id:n.id,cfg:n,d};}
    });
    return best;
  }
  function interact(){
    const n=nearest();
    if(!n){CR.ui.toast("附近没有可交互对象 · 靠近商人、资源点或灯塔下的夜樱");
      CR.audio.sfx("deny");return;}
    CR.audio.sfx("talk");
    if(n.type==="node"){beginGather(n.cfg);return;}
    if(n.id==="trader"){CR.ui.openTrade("trade");return;}
    if(n.id==="black"){CR.ui.openTrade("black");return;}
    if(n.id==="trial"){
      const mode=trialMode();
      if(st.trial.active){CR.ui.toast("试炼进行中 · 击败夜樱即可领取奖励");return;}
      CR.ui.openDialogue({
        name:"夜樱 · 试炼形态",title:mode==="equip"?"樱色加护 · 专属装备试炼 ★★★★":"樱下试炼",
        icon:"✿",color:C.sakura,
        reward:mode==="equip"?
          ("难度 ★★★★ · 获胜随机得 1 件【樱花套件】王者钻装（共 23 件） · 今日剩余 "+SV.trialLeft()+" 次"):
          ("每日限 10 次 · 首次获胜得【夜樱蛋】 · 今日剩余 "+SV.trialLeft()+" 次"),
        lines:mode==="equip"?CFG.TRIAL.equipLines:CFG.TRIAL.lines,
        onDone:()=>startTrial()
      });
    }
  }

  /* ---------- 商人：出售 / 锻造 / 黑市 ---------- */
  function sell(id,n){
    const r=SV.sellMat(id,n||1);
    if(!r.ok){CR.ui.toast(r.reason);CR.audio.sfx("deny");return r;}
    CR.audio.sfx("coin");
    CR.ui.toast("出售 "+CFG.MATERIALS[id].name+" ×"+r.n+" → "+r.gold+" 金币");
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
    return r;
  }
  function forge(id){
    const f=CFG.FORGE.find(x=>x.id===id);if(!f)return {ok:false,reason:"没有这件配方"};
    const eq=CFG.EQUIPMENT[id];
    for(const m in f.mats)
      if((SV.data.inventory.mats[m]||0)<f.mats[m]){
        CR.ui.toast("材料不足："+CFG.MATERIALS[m].name+" 需要 "+f.mats[m]);
        CR.audio.sfx("deny");return {ok:false,reason:"材料不足"};}
    if(!SV.spendGold(f.gold)){CR.ui.toast("金币不够啦");CR.audio.sfx("deny");
      return {ok:false,reason:"金币不足"};}
    for(const m in f.mats)SV.data.inventory.mats[m]-=f.mats[m];
    SV.addEquip(id,1);SV.flush();
    CR.audio.sfx("forge");
    CR.ui.toast("锻造完成："+eq.name+" · 到角色面板穿戴");
    E.burst(P.x,P.depth,26,C.fire,12,150);
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
    return {ok:true};
  }
  function buy(key){
    let k="item",id=key;
    if(typeof key==="string"&&key.indexOf(":")>0){k=key.slice(0,key.indexOf(":"));id=key.slice(key.indexOf(":")+1);}
    const row=CFG.BLACK_MARKET.find(x=>x.id===id&&(x.k||"item")===k)
      ||CFG.BLACK_MARKET.find(x=>x.id===id);
    if(!row){CR.audio.sfx("deny");CR.ui.toast("没有这件商品");return {ok:false};}
    k=row.k||"item";
    const it=k==="equip"?CFG.EQUIPMENT[id]:(k==="mat"?CFG.MATERIALS[id]:CFG.ITEMS[id]);
    if(!it)return {ok:false};
    const price=row.price!==undefined?row.price:(it.price||SV.sellPrice(id)*3);
    if(!SV.spendGold(price)){CR.audio.sfx("deny");CR.ui.toast("金币不够啦");return {ok:false};}
    if(k==="equip")SV.addEquip(id,1);
    else if(k==="mat")SV.addMat(id,1);
    else SV.addItem(id,1);
    SV.flush();CR.audio.sfx("buy");
    CR.ui.toast("买下 "+it.name+" ×1"+(k==="equip"?" · 到装备栏穿戴":""));
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
    return {ok:true};
  }

  /* ---------- 生命周期 ---------- */
  function init(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    SV.dailyReset();
    buildScenery();spawnMobs();
    st.stepDist=0;st.seaT=1.2;st.flash=0;st.near=null;st.gather=null;
    st.bubbles.length=0;st.parts.clear();
    st.trial.active=false;st.trial.ref=null;st.trial.mode=trialMode();WLD.bossRef=null;
    for(let i=0;i<46;i++){spawnSpark();}
    SV.data.progress.harborVisits++;SV.mark();SV.flush();
    CR.audio.setScene(st.isNight?"harborNight":"harbor",true);
    CR.ui.toast("欢迎来到【星火港】 · "+(st.isNight?"夜间灯火":"海风白昼")+
      "（"+c.src+" "+c.hour+":00）· 按 G 查看区域情报");
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }
  function update(dt){
    /* 长时间在线跨过北京时间 0 点时，低频检查并重置每日采集 / 试炼次数 */
    st.dayT=(st.dayT||0)+dt;
    if(st.dayT>30){st.dayT=0;SV.dailyReset();}
    stepSound(WLD.groundAt(P.x),dt);
    updateMobs(dt);
    updateGather(dt);
    updateTrial(dt);
    st.walker.forEach(w=>{
      w.t+=dt;
      w.x=w.x0+Math.sin(w.t*w.speed/90)*w.range*.5;
      w.depth=w.d0+Math.sin(w.t*.8)*10;
    });
    updateParts(dt);
    st.near=nearest();
    const key=CFG.KEY_LABELS[SV.data.settings.bindings.interact]||"F";
    CR.ui.setInteractHint(st.near?("按 "+key+" "+
      (st.near.type==="node"?("采集 "+st.near.cfg.name+"（今日剩 "+SV.gatherLeft(st.near.id)+" 次）"):
       (st.near.id==="trial"?"与 夜樱 对话 / 开始 BOSS 试炼":"与 "+st.near.cfg.name+" 交易"))):"");
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }
  function post(){
    const day=st.phase==="day"?1:(st.phase==="dusk"?.86:.60);
    let tint=st.isNight?[.86,.92,1.16]:(st.phase==="dusk"?[1.10,.93,.84]:[1.01,1.02,1.0]);
    return {tint,ambient:.94*day,flash:0,white:WLD.white,
      vigBoost:st.isNight?.16:(st.phase==="dusk"?.07:0),time:CR.game.time};
  }

  CR.harbor={trialMode,st,init,update,post,interact,nearest,beginGather,gatherCheck,toolInfo,
    sell,forge,buy,startTrial,endTrial,applyClock,tryNetworkTime,
    get hour(){return st.hour;},get isNight(){return st.isNight;},
    get clockSrc(){return st.clockSrc;},get parts(){return st.parts;},
    get walkers(){return st.walker;},get grass(){return st.grass;},
    get mobs(){return st.mobs;},get nodes(){return st.nodes;},
    get trial(){return st.trial;},get gather(){return st.gather;},
    get barrels(){return st.barrels;},get crates(){return st.crates;},
    get lamps(){return st.lamps;},get palms(){return st.palms;},
    get ropes(){return st.ropes;},get buoys(){return st.buoys;},
    get gulls(){return st.gulls;},get ships(){return st.ships;}};
})(window.CR=window.CR||{});
