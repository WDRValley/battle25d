/* university.js — v1.4 dev4 · 魔法大学城（四子区域安全区）
 * 集市外街（默认落点）/ 旗帜广场 / 魔法工会堂（室内）/ 魔法公寓区
 * 8 套专属 BGM、12 NPC、21 路人、9 采集点、11 交互点、4 野怪、泉水全队恢复
 * 占位系统：服装店幻化、工坊强化/附魔/合成、公寓购买/租用、招生考核、PP —— 均不实装
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,SV=CR.save;
  const W=CFG.UNI_W||7600,MUL=CFG.UNI_STAT_MUL||6.5;
  const st={
    hour:20,phase:"night",isNight:true,clockSrc:"本机",dayT:0,zone:0,
    sway:0,ambT:0,stepDist:0,grace:0,spawnX:CFG.UNI_SPAWN_X||520,spawnDepth:0,
    houses:[],trees:[],banners:[],lamps:[],flowers:[],benches:[],flags:[],
    fountain:null,guild:null,apartments:[],clotheslines:[],props:[],
    glowbugs:[],birds:[],brooms:[],butterflies:[],petals:[],mist:[],rain:[],snow:[],
    nodes:[],mobs:[],hostiles:[],walkers:[],
    near:null,gather:null,fountainNear:false,fountainT:0,fountainDone:false,
    zoneVoiced:{},progressionWarned:false
  };

  /* ---------- 北京时间（与其余六图同算法） ---------- */
  function beijingDate(){
    const d=new Date();
    return new Date(d.getTime()+(d.getTimezoneOffset()*60000)+8*3600000)
      .toISOString().slice(0,10);
  }
  function beijingClock(){
    const now=new Date(),utc=now.getTime()+now.getTimezoneOffset()*60000;
    const bj=new Date(utc+8*3600000);
    if((SV.data.settings.clockSource||"beijing")==="local")
      return {hour:now.getHours(),src:"本机时间"};
    return {hour:bj.getHours(),src:"北京时间"};
  }
  function phaseOf(h){return h>=18||h<6?"night":(h>=16||h<8?"dusk":"day");}
  function zoneScene(){
    const z=CFG.UNI_ZONES[st.zone]||CFG.UNI_ZONES[0];
    return (z.bgm||"uniStreet")+(st.isNight?"Night":"");
  }
  function syncBgm(){CR.audio.setScene(zoneScene(),false);}
  function applyClock(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    CR.audio.setScene(zoneScene(),true);
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }

  /* ---------- 场景物件 ---------- */
  function buildScenery(){
    Object.keys(st).forEach(k=>{if(Array.isArray(st[k]))st[k].length=0;});
    U.srand(20261121);
    /* 沿街中世纪房屋（四区密度/风格不同） */
    for(let x=40;x<W;x+=U.rr(96,168)){
      const zi=CFG.uniZoneAt(Math.min(W-1,x)),depth=U.rr(-96,96);
      /* v1.4 dev4.1：工会堂是整座室内大厅，内部不摆户外街屋；
         旗帜广场按文案保持开阔，房屋只留在两端且推到画面远侧，中央泉水周围不遮挡。 */
      if(zi===2)continue;
      if(zi===1&&x>2180&&x<3480)continue;
      st.houses.push({x,depth:zi===1?-U.rr(88,132):depth,zone:zi,w:U.rr(64,118),h:U.rr(96,188),
        roof:zi===2?U.rr(150,220):U.rr(120,196),hue:U.ri(0,3),lean:U.rr(-.06,.06),
        indoor:zi===2,fancy:zi===3&&U.rnd()<.45,phase:U.rr(0,6.28)});
      if(zi===0||zi===1||zi===3)
        st.trees.push({x:x+U.rr(-28,28),depth:U.rr(-92,92),zone:zi,
          h:U.rr(150,245),glow:zi===0&&U.rnd()<.3,hue:U.ri(0,3),phase:U.rr(0,6.28)});
      if(zi===0||zi===3)st.lamps.push({x:x+U.rr(-14,14),depth:U.rr(-88,88),
        h:U.rr(58,86),phase:U.rr(0,6.28)});
      if(zi===1&&U.rnd()<.5)st.flags.push({x:x+U.rr(-20,20),depth:U.rr(-90,90),
        h:U.rr(70,118),phase:U.rr(0,6.28)});
      if(zi===0||zi===1||zi===3)st.flowers.push({x:x+U.rr(-30,30),depth:U.rr(-90,90),
        w:U.rr(24,52),hue:U.ri(0,3),phase:U.rr(0,6.28)});
      if(zi===1||zi===3)st.benches.push({x:x+U.rr(-16,16),depth:U.rr(-84,84),
        w:U.rr(36,58)});
    }
    /* 外街悬浮横幅：欢迎来到魔法大学城 */
    [420,980,1560].forEach((x,i)=>st.banners.push({x,y:U.rr(210,300),
      w:U.rr(190,260),phase:U.rr(0,6.28),idx:i}));
    /* 旗帜广场：魔法泉水雕塑、阴湿花池、巨杉 */
    st.fountain={x:2850,depth:0,w:210,h:170,phase:0};
    /* 工会堂室内：彩窗、石柱、回廊、长桌、书架、委托板 */
    st.guild={x:4750,depth:0,start:3800,end:5700,
      windows:[4000,4260,4520,4780,5040,5300],pillars:[3920,4200,4480,4760,5040,5320,5560]};
    /* 公寓区：尖顶/彩窗、晾衣绳 */
    for(let i=0;i<7;i++)st.apartments.push({x:5800+i*250,depth:i%2?-84:84,
      fancy:i%3===0,h:U.rr(150,220),phase:U.rr(0,6.28)});
    for(let i=0;i<6;i++)st.clotheslines.push({x:5900+i*260,depth:U.rr(-80,80),
      w:U.rr(70,120),phase:U.rr(0,6.28)});
    /* 交互点（未开启功能，仅入口与文案） */
    CFG.UNI_PROPS.forEach(p=>st.props.push(Object.assign({},p,{flash:0})));
    /* 粒子 */
    for(let i=0;i<90;i++)st.glowbugs.push({x:U.rr(0,W),depth:U.rr(-95,95),
      y:U.rr(30,230),phase:U.rr(0,6.28),v:U.rr(.4,1.2),size:U.rr(1.1,2.8)});
    for(let i=0;i<12;i++)st.birds.push({x:U.rr(0,W),y:U.rr(120,330),
      v:U.rr(16,38),phase:U.rr(0,6.28)});
    for(let i=0;i<5;i++)st.brooms.push({x:U.rr(0,1900),y:U.rr(150,300),
      v:U.rr(24,46),phase:U.rr(0,6.28)});
    for(let i=0;i<26;i++)st.butterflies.push({x:U.rr(0,3800),depth:U.rr(-92,92),
      y:U.rr(40,190),phase:U.rr(0,6.28),v:U.rr(.7,1.4),hue:U.ri(0,2)});
    for(let i=0;i<40;i++)st.petals.push({x:U.rr(0,W),y:U.rr(0,540),
      v:U.rr(7,22),sw:U.rr(0,6.28),r:U.rr(2,4.5),hue:U.ri(0,3)});
    for(let i=0;i<30;i++)st.mist.push({x:U.rr(0,W),depth:U.rr(-100,100),
      w:U.rr(160,360),h:U.rr(20,56),a:U.rr(.03,.09),v:U.rr(3,10)});
    for(let i=0;i<60;i++)st.rain.push({x:U.rr(0,GLW()),y:U.rr(0,640),
      v:U.rr(430,700),len:U.rr(11,22),a:U.rr(.12,.30)});
    for(let i=0;i<40;i++)st.snow.push({x:U.rr(0,GLW()),y:U.rr(0,640),
      v:U.rr(24,60),sw:U.rr(0,6.28),r:U.rr(1.4,3.2)});
    function GLW(){return 1440;}
    CFG.UNI_WALKERS.forEach(w=>st.walkers.push(Object.assign({},w,
      {x:w.x0,depth:w.d0,t:U.rr(0,6.28)})));
    CFG.UNI_NODES.forEach(n=>st.nodes.push(Object.assign({},n,{flash:0})));
  }

  /* ---------- 野怪：数值 × UNI_STAT_MUL（≥ 前图 2 倍） ---------- */
  function spawnMobs(){
    E.enemies.clear();st.mobs.length=0;st.hostiles.length=0;
    CFG.UNI_MOBS.forEach(m=>{
      const base=CFG.MOBS[m.type]||CFG.MOBS.normal;
      const cfg=Object.assign({},base,{
        hp:Math.round(base.hp*MUL),dmg:Math.round(base.dmg*MUL),
        xp:Math.round((base.xp||0)*MUL),gold:Math.round((base.gold||0)*MUL)
      });
      const e=E.spawnEnemy(m.type,m.x,m.depth);if(!e)return;
      e.cfg=cfg;e.maxHp=e.hp=cfg.hp;
      e.home={x:m.x,depth:m.depth};e.territory=m.territory||base.territory||210;
      e.patrolT=U.rr(0,6);e.aggroT=0;e.returnT=0;e.spawn=.42;
      e.alerted=false;e.warned=false;e.barT=0;e.sight=360;
      if(cfg.ai==="neutral"){
        e.hostile=false;e.aggro=0;e.hateZone=300;st.mobs.push(e);
      }else if(cfg.ai==="halfNeutral"){
        e.hostile=false;e.halfNeutral=true;st.mobs.push(e);
      }else{e.hostile=true;e.aggro=1;st.hostiles.push(e);}
    });
  }

  /* ---------- 三类 AI：沿用 dev3 边境标准 ---------- */
  function noticeMob(e,text,doc,color,rad){
    e.warned=true;e.barT=2.2;e.aggroT=0;
    WLD.markEngage();
    CR.ui.banner("⚠ "+text);
    CR.ui.toast(text+(doc?" · "+doc:""));
    CR.audio.sfx("aggro");
    E.ringFx(e.x,e.depth,color||C.hpAmber,rad||Math.max(100,e.territory||210),.6);
  }
  function calmMob(e,text){
    e.hostile=false;e.aggro=0;e.aggroT=0;e.returnT=1.2;
    e.hp=e.maxHp;e.barT=0;e.warned=false;
    CR.ui.toast(text);
    try{CR.audio.sfx("calm");}catch(err){}
    try{E.spawnFloat(e.x,e.depth,88,"0","aggro",C.hpBlue,false);}catch(err){}
  }
  function updateMobs(dt){
    const px=P.x,pd=P.depth;
    const nearSpawn=Math.hypot(px-st.spawnX,pd-st.spawnDepth)<(CFG.UNI_SAFE_R||240);
    const safe=(st.grace||0)>0||nearSpawn||P.dead;
    for(const e of st.mobs){
      if(!e||!e.alive)continue;
      const d=Math.hypot(px-e.x,pd-e.depth);
      if(e.halfNeutral){
        const T=e.territory||210;
        if(!e.hostile){
          if(!safe&&d<T&&e.spawn<=0){
            e.hostile=true;e.aggro=1;
            noticeMob(e,e.cfg.label+" 注意到了你！",CFG.AI_DOC.halfNeutral,C.hpAmber,T);
          }else if(e.spawn<=0){
            /* v1.4 dev4.1：大学城为安全区，半中立单位定点驻守，不来回巡逻 */
            e.vx=0;e.vd=0;e.facing=-1;
            if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.25);
          }
        }else{
          if(!e.warned)noticeMob(e,e.cfg.label+" 注意到了你！",CFG.AI_DOC.halfNeutral,C.hpAmber,T);
          if(d>T*1.65)e.aggroT+=dt;else e.aggroT=0;
          if(e.aggroT>1.05)calmMob(e,e.cfg.label+" 已离开领地 · 解除仇恨并回满状态");
          else if(e.cfg.reach>200&&d<168){
            e.vx=U.clamp(-Math.sign(px-e.x||1)*88,-88,88);
            e.vd=U.clamp(-Math.sign(pd-e.depth||1)*34,-34,34);
          }
        }
      }else{
        if(e.hostile&&!e.warned)
          noticeMob(e,"中立 · "+e.cfg.label+" 注意到你！",CFG.AI_DOC.neutral,C.hpBlue,e.hateZone||300);
        if(e.hostile){
          if(d>(e.hateZone||300))e.aggroT+=dt;else e.aggroT=0;
          if(e.aggroT>1.4)calmMob(e,"中立 · "+e.cfg.label+" 不再追你 · 回到原地并回满状态");
        }else{
          /* v1.4 dev4.1：中立怪同样驻守原地，人不犯我我不犯人 */
          e.vx=0;e.vd=0;e.facing=-1;
          if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.10);
        }
      }
      if(e.returnT>0){
        const dx=e.home.x-e.x,dd=e.home.depth-e.depth;
        if(Math.hypot(dx,dd)<9){
          e.x=e.home.x;e.depth=e.home.depth;e.vx=e.vd=0;e.returnT=0;
        }else{
          e.vx=U.clamp(dx*1.9,-70,70);e.vd=U.clamp(dd*1.7,-32,32);
          e.returnT=Math.max(.05,e.returnT-dt);
        }
      }
    }
  }

  /* ---------- 地面 / 脚步 ---------- */
  function groundAt(x){
    const zi=CFG.uniZoneAt(Math.max(0,Math.min(W-1,x)));
    const n=((Math.floor(x/120)*73+19)%17)/17;
    if(zi===0)return n<.18?"grass":"stone";
    if(zi===2)return "stone";
    if(zi===3)return n<.14?"grass":"stone";
    return "stone";
  }
  function stepSound(dt){
    if(!P.moving)return;
    st.stepDist+=Math.abs(P.vx||0)*dt;
    if(st.stepDist<64)return;st.stepDist=0;
    CR.audio.sfx(groundAt(P.x)==="grass"?"stepGrass":"stepStone");
  }

  /* ---------- 采集（与边境同规则，节点已在 save.nodeById 登记） ---------- */
  function hasTool(ids){
    const s=CR.equip?CR.equip.slots(P.cls):{},arr=Array.isArray(ids)?ids:[ids];
    return arr.some(id=>s.two===id||s.main===id||s.off===id);
  }
  function gatherCheck(node){
    const left=SV.gatherLeft(node.id);
    if(left<=0)return {ok:false,reason:"今日次数已用完（北京时间 0 点重置）"};
    if(st.gather)return {ok:false,reason:"正在采集中"};
    if(node.tool&&!hasTool(node.tool)){
      const names=(Array.isArray(node.tool)?node.tool:[node.tool])
        .map(id=>((CFG.EQUIPMENT[id]||{}).label||id)).join(" / ");
      return {ok:false,reason:"需要 "+names};
    }
    const speed=hasTool(["sickle","gathererGloves","moonSickle","hoe","longFishSpear"])?1.25:1;
    return {ok:true,speed,t:node.time/speed};
  }
  function toolInfo(node){
    if(!node.tool)return "徒手即可采集";
    const names=(Array.isArray(node.tool)?node.tool:[node.tool])
      .map(id=>((CFG.EQUIPMENT[id]||{}).label||id)).join(" / ");
    return "需要 "+names+"（专业工具可提速）";
  }
  function beginGather(node){
    const ck=gatherCheck(node);
    if(!ck.ok){CR.ui.toast(ck.reason);CR.audio.sfx("deny");return ck;}
    st.gather={id:node.id,node,t:0,dur:ck.t,x:P.x,depth:P.depth};
    CR.audio.sfx("gatherBegin");
    CR.ui.toast("开始采集 "+node.name+" · "+ck.t.toFixed(1)+"s");
    return {ok:true,dur:ck.t};
  }
  function updateGather(dt){
    const g=st.gather;if(!g)return;
    if(Math.abs(P.x-g.x)>90||Math.abs(P.depth-g.depth)>90){
      st.gather=null;CR.ui.toast("走开了，采集中断");CR.ui.setGather&&CR.ui.setGather(0,"");return;
    }
    g.t+=dt;CR.ui.setGather&&CR.ui.setGather(U.clamp(g.t/g.dur,0,1),g.node.name);
    if(g.t<g.dur)return;
    const n=g.node,r=U.ri(n.min,n.max),dropId=n.drops[U.ri(0,n.drops.length-1)];
    if(!SV.useGather(n.id)){
      CR.ui.toast("今日次数已用完");CR.audio.sfx("deny");
      CR.ui.setGather&&CR.ui.setGather(0,"");st.gather=null;return;
    }
    for(let i=0;i<r;i++){
      if(CFG.MATERIALS[dropId])SV.addMat(dropId,1);
      else if(CFG.ITEMS[dropId])SV.addItem(dropId,1);
    }
    SV.mark();SV.flush();
    const nm=(CFG.MATERIALS[dropId]||CFG.ITEMS[dropId]||{}).name||dropId;
    CR.ui.toast("采集完成 · "+nm+" ×"+r+"　今日剩 "+SV.gatherLeft(n.id)+" 次");
    CR.audio.sfx("pickup");E.burst(P.x,P.depth,26,C.leaf1,10,110);
    CR.ui.setGather&&CR.ui.setGather(0,"");
    CR.ui.refreshPanels();st.gather=null;
  }

  /* ---------- 限量交易（图拉 / 巴恩） ---------- */
  function bought(){if(!SV.data.universityBought)SV.data.universityBought={};return SV.data.universityBought;}
  function periodKey(row){
    if(row.period==="once")return "once";
    if(row.period==="weekly"){
      const d=new Date(beijingDate()+"T00:00:00Z"),dow=(d.getUTCDay()+6)%7;
      d.setUTCDate(d.getUTCDate()-dow);return "W"+d.toISOString().slice(0,10);
    }
    return beijingDate();
  }
  function leftOf(npc,row){
    const b=bought(),k=npc+"|"+row.id+"|"+periodKey(row);
    return Math.max(0,row.limit-(b[k]||0));
  }
  function buy(npc,id){
    const row=(CFG.UNI_GOODS[npc]||[]).find(r=>r.id===id);
    if(!row)return {ok:false,reason:"没有这件商品"};
    const left=leftOf(npc,row);
    if(left<=0)return {ok:false,reason:"已售罄（每日限量）"};
    if(SV.data.profile.gold<row.price)return {ok:false,reason:"金币不足"};
    SV.spendGold(row.price);
    if(row.k==="mat")SV.addMat(id,1);
    else if(row.k==="equip")SV.addEquip(id,1);
    else if(row.k==="spirit")SV.addSpirit(id,1);   /* v1.4 dev5：副件 ≠ 装备 */
    else SV.addItem(id,1);
    const b=bought(),k=npc+"|"+id+"|"+periodKey(row);
    b[k]=(b[k]||0)+1;SV.mark();SV.flush();
    CR.audio.sfx("buy");
    const eq=CFG.MATERIALS[id]||CFG.ITEMS[id]||CFG.EQUIPMENT[id]||CFG.SPIRITS[id]||{};
    const nm=(eq.label||eq.name)||id;
    CR.ui.toast("买下 "+nm+" ×1 · 剩余 "+leftOf(npc,row)+" 件");
    CR.ui.refreshPanels();return {ok:true,name:nm,left:leftOf(npc,row)};
  }
  function sell(id,n){
    n=n||1;const price=CFG.UNI_SELL[id];
    if(!price)return {ok:false,reason:"这位商人不收这件东西"};
    if((SV.data.inventory.mats[id]||0)<n)return {ok:false,reason:"数量不足"};
    SV.data.inventory.mats[id]-=n;SV.addGold(price*n);SV.mark();SV.flush();
    CR.audio.sfx("coin");
    CR.ui.toast("卖出 "+(CFG.MATERIALS[id]||{}).name+" ×"+n+" · +"+(price*n)+" 金币");
    CR.ui.refreshPanels();return {ok:true,gold:price*n};
  }

  /* ---------- 交互 ---------- */
  function nearest(){
    let best=null,bd=1e9;
    for(const key in CFG.UNI_NPCS){
      const n=CFG.UNI_NPCS[key],d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<140&&d<bd){bd=d;best={type:"npc",id:key,cfg:n,d};}
    }
    st.nodes.forEach(n=>{
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<105&&d<bd){bd=d;best={type:"node",id:n.id,cfg:n,d};}
    });
    st.props.forEach(n=>{
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<95&&d<bd){bd=d;best={type:"prop",id:n.id,cfg:n,d};}
    });
    return best;
  }
  function talk(id,cfg){
    CR.audio.sfx("talk");
    if(id==="tula"||id==="barn"){CR.ui.openSwampShop(id);return;}
    const placeholder=(id==="suan"||id==="dutyMage"||id==="apartAdmin");
    CR.ui.openDialogue({name:cfg.name,
      title:CFG.UNI_ZONES[CFG.uniZoneAt(cfg.x)].name+(placeholder?" · 功能未开启":""),
      icon:cfg.icon,color:cfg.color,
      reward:placeholder?"本版本仅保留入口与文案":"",
      lines:cfg.lines,onDone:null});
  }
  function interact(){
    const n=nearest();
    if(!n){CR.ui.toast("附近没有可交互对象 · 靠近 NPC、采集点或交互点");CR.audio.sfx("deny");return;}
    if(n.type==="node"){beginGather(n.cfg);return;}
    if(n.type==="prop"){
      CR.audio.sfx("quill");
      CR.ui.openDialogue({name:n.cfg.name,title:CFG.UNI_ZONES[n.cfg.zone].name+" · 交互点",
        icon:n.cfg.icon,color:C.gold,reward:"功能尚未开启",
        lines:[n.cfg.desc,"当前版本可查看说明，后续版本会开放对应系统。"],onDone:null});
      return;
    }
    talk(n.id,n.cfg);
  }

  /* ---------- 旗帜广场泉水：靠近即恢复全队生命 ---------- */
  function updateFountain(dt){
    const f=st.fountain;
    if(!f||st.zone!==1){st.fountainT=0;st.fountainNear=false;st.fountainDone=false;return;}
    const near=Math.hypot(P.x-f.x,P.depth-f.depth)<170;
    if(!near){st.fountainT=0;st.fountainNear=false;st.fountainDone=false;
      if(!st.gather&&CR.ui.setGather)CR.ui.setGather(0,"");return;}
    if(st.fountainDone)return;
    if(!st.fountainNear){
      st.fountainNear=true;st.fountainT=0;
      CR.ui.toast("✦ 魔法泉水 · 停留 2 秒恢复全队生命 / 法力 / 技能 PP");
    }
    st.fountainT+=dt;
    if(!st.gather&&CR.ui.setGather)CR.ui.setGather(U.clamp(st.fountainT/2,0,1),"魔法泉水");
    if(st.fountainT<2)return;
    st.fountainT=0;st.fountainDone=true;
    if(!st.gather&&CR.ui.setGather)CR.ui.setGather(0,"");
    try{CR.team.supplyAll();}catch(err){}
    CR.audio.sfx("fountain");
    CR.ui.toast("✦ 魔法泉水 · 全队生命 / 法力 / 技能 PP 已恢复满");
    E.burst(P.x,P.depth,34,C.cyan||[.55,.91,1],12,120);
    E.ringFx(f.x,f.depth,C.cyan||[.55,.91,1],200,.8);
  }

  /* ---------- 生命周期 ---------- */
  function init(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    st.zone=CFG.uniZoneAt(P.x);
    st.grace=CFG.UNI_GRACE||3;st.spawnX=P.x;st.spawnDepth=P.depth||0;
    st.dayT=0;st.ambT=0;st.sway=0;st.fountainNear=false;st.fountainT=0;
    st.fountainDone=false;st.zoneVoiced={};
    st.progressionWarned=false;st.stepDist=0;st.near=null;st.gather=null;
    SV.dailyReset();buildScenery();spawnMobs();
    WLD.bossRef=null;
    SV.data.progress.universityVisits=(SV.data.progress.universityVisits||0)+1;
    SV.mark();SV.flush();
    applyClock();syncBgm();
    CR.ui.banner("🏛 魔 法 大 学 城 · "+CFG.UNI_ZONES[st.zone].name);
    CR.ui.toast("安全区 · 四子区域：集市外街 → 旗帜广场 → 魔法工会堂 → 魔法公寓区（"+
      c.src+" "+c.hour+":00）");
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }
  function update(dt){
    st.dayT+=dt;st.grace=Math.max(0,(st.grace||0)-dt);
    if(st.dayT>20){st.dayT=0;applyClock();}
    st.sway+=dt;st.ambT+=dt;
    if(st.ambT>4.2){st.ambT=0;
      CR.audio.sfx(st.zone===2?"quill":(st.zone===1?"fountain":
        (st.zone===3&&st.isNight?"cat":"broom")));}
    updateMobs(dt);updateGather(dt);updateFountain(dt);stepSound(dt);
    st.walkers.forEach(w=>{
      w.t+=dt;
      w.x=w.x0+Math.sin(w.t*w.speed/90)*w.range*.5;
      w.depth=w.d0+Math.sin(w.t*.8)*9;
    });
    st.petals.forEach(o=>{o.y+=o.v*dt;o.x+=Math.sin(CR.game.time*.8+o.sw)*12*dt;
      if(o.y>620){o.y=-20;o.x=U.rr(0,W);}});
    st.nodes.forEach(n=>{n.flash=Math.max(0,(n.flash||0)-dt*1.6);});
    st.near=nearest();
    const zi=CFG.uniZoneAt(P.x);
    if(zi!==st.zone){
      st.zone=zi;const z=CFG.UNI_ZONES[zi];
      CR.ui.banner("进入 · "+z.name+"（"+z.danger+"）");
      CR.ui.toast(z.desc);
      CR.audio.sfx(zi===2?"quill":"wave");syncBgm();
      if(!st.zoneVoiced[zi]&&zi===1){
        st.zoneVoiced[zi]=1;
        CR.ui.toast("✦ 中央魔法泉水 · 靠近可恢复全队生命");
      }
      if(!st.zoneVoiced[zi]&&zi===2){
        st.zoneVoiced[zi]=1;
        CR.ui.toast("📜 委托板 / 公告板 / 登记柜台 · 接取功能后续版本开放");
      }
    }
    const key=CFG.KEY_LABELS[SV.data.settings.bindings.interact]||"F";
    CR.ui.setInteractHint(st.near?("按 "+key+" "+
      (st.near.type==="node"?
        ("采集 "+st.near.cfg.name+"（今日剩 "+SV.gatherLeft(st.near.id)+" 次 · "+toolInfo(st.near.cfg)+"）"):
        (st.near.type==="prop"?("查看 "+st.near.cfg.name):("与 "+st.near.cfg.name+" 交互")))):"");
  }
  function post(){
    const z=CFG.UNI_ZONES[st.zone]||CFG.UNI_ZONES[0];
    const tint=st.isNight?[.82,.88,1.10]:(st.phase==="dusk"?[1.06,.94,.84]:[1,1,1]);
    const wt=z.indoor?[1,1,1]:(()=>{
      const w=CR.weather&&CR.weather.current?CR.weather.current():null;
      return w?(w.tint||[1,1,1]):[1,1,1];})();
    const wa=z.indoor?1:(()=>{
      const w=CR.weather&&CR.weather.current?CR.weather.current():null;
      return w?(w.ambient||1):1;})();
    return {tint:[tint[0]*z.tint[0]*wt[0],tint[1]*z.tint[1]*wt[1],tint[2]*z.tint[2]*wt[2]],
      ambient:z.ambient*(st.isNight?.78:1)*wa,flash:0,white:WLD.white,
      vigBoost:z.indoor?.14:.06+z.fog*.16,time:CR.game.time,
      fog:z.fog};
  }

  CR.university={st,init,update,post,interact,nearest,beginGather,gatherCheck,toolInfo,
    buy,sell,leftOf,applyClock,groundAt,zoneScene,
    get hour(){return st.hour;},get isNight(){return st.isNight;},
    get phase(){return st.phase;},get clockSrc(){return st.clockSrc;},
    get zone(){return st.zone;},get nodes(){return st.nodes;},get mobs(){return st.mobs;},
    get hostiles(){return st.hostiles;},get walkers(){return st.walkers;},
    get props(){return st.props;},get houses(){return st.houses;},
    get trees(){return st.trees;},get banners(){return st.banners;},
    get lamps(){return st.lamps;},get flowers(){return st.flowers;},
    get benches(){return st.benches;},get flags(){return st.flags;},
    get fountain(){return st.fountain;},get guild(){return st.guild;},
    get apartments(){return st.apartments;},get clotheslines(){return st.clotheslines;},
    get glowbugs(){return st.glowbugs;},get birds(){return st.birds;},
    get brooms(){return st.brooms;},get butterflies(){return st.butterflies;},
    get petals(){return st.petals;},get mist(){return st.mist;},
    get rain(){return st.rain;},get snow(){return st.snow;}};
})(window.CR=window.CR||{});
