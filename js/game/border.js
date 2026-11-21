/* border.js — v1.4 dev2 · 雨沼边境走廊（魔法大学城空间过渡带）
 * 9600px / 四段子区域 / 8 套专属 BGM / 7 NPC + 8 路人 + 17 采集点
 * 三类 AI 严格区分；野外单位数值统一 × BORDER_STAT_MUL（≥ 前图 3 倍）
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,SV=CR.save;
  const W=CFG.BORDER_W||9600,MUL=CFG.BORDER_STAT_MUL||3.25;
  const st={
    hour:20,phase:"night",isNight:true,clockSrc:"本机",clockT:0,dayT:0,zone:1,
    sway:0,ambT:0,stepDist:0,lastGround:"",ambient:"湿冷薄雾",
    trees:[],vines:[],ponds:[],reeds:[],wheat:[],wheatFields:[],haystacks:[],carts:[],
    ruins:[],fences:[],tools:[],
    towers:[],gargoyle:null,tent:null,gate:null,
    glowbugs:[],fireflies:[],butterflies:[],birds:[],mist:[],leaves:[],drops:[],
    nodes:[],mobs:[],hostiles:[],walkers:[],
    near:null,gather:null,bossIntro:false,scanT:0,bossSkillT:5,
    lowLvWarned:false,zoneVoiced:{},
    grace:0,spawnX:CFG.BORDER_SPAWN_X||2640,spawnDepth:0
  };

  /* ---------- 北京时间（与其余五图同算法，dev1.4 已修 8 小时偏差） ---------- */
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
    const z=CFG.BORDER_ZONES[st.zone]||CFG.BORDER_ZONES[1];
    return (z.bgm||"borderThicket")+(st.isNight?"Night":"");
  }
  function syncBgm(){CR.audio.setScene(zoneScene(),false);}
  function applyClock(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    CR.audio.setScene(zoneScene(),true);
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }
  function taoOpen(){return st.hour>=6&&st.hour<17;}

  /* ---------- 场景元素：四段风貌各自铺陈 ---------- */
  function buildScenery(){
    Object.keys(st).forEach(k=>{if(Array.isArray(st[k]))st[k].length=0;});
    U.srand(20261118);
    /* 树木：v1.4 dev3 按魔法丛林规格整体放大。
       洼地高树 190~320、灌木湿黑佝偻树 165~285、村落枯树 120~200、城门行道树 140~230；
       树冠半径与树干粗细在 render_border.js 同步按 h 自适应，避免「小树苗」。 */
    for(let x=20;x<W;x+=U.rr(62,118)){
      const zi=CFG.borderZoneAt(Math.min(W-1,x));
      const depth=U.rr(-92,92);
      st.trees.push({x,depth,zone:zi,
        h:zi===0?U.rr(190,320):(zi===1?U.rr(165,285):(zi===2?U.rr(120,200):U.rr(140,230))),
        odd:zi===0&&U.rnd()<.23,
        lean:zi===1?U.rr(-.3,.3):U.rr(-.12,.12),
        hue:U.ri(0,3),phase:U.rr(0,6.28),wet:zi===1});
      if((zi===0||zi===1)&&U.rnd()<.42)
        st.vines.push({x:x+U.rr(-12,12),depth:U.rr(-92,-36),
          h:U.rr(72,172),phase:U.rr(0,6.28),zi});
      if(zi===1&&U.rnd()<.55)
        st.ponds.push({x:x+U.rr(-40,40),depth:U.rr(-88,88),rx:U.rr(46,124),
          ry:U.rr(10,26),phase:U.rr(0,6.28)});
      if(zi===1&&U.rnd()<.7)
        st.reeds.push({x:x+U.rr(-10,10),depth:U.rr(-92,92),h:U.rr(52,116),
          phase:U.rr(0,6.28)});
      if(zi===2&&U.rnd()<.82)
        st.wheat.push({x:x+U.rr(-12,12),depth:U.rr(-90,90),h:U.rr(24,52),
          hue:U.ri(0,2),phase:U.rr(0,6.28)});
    }
    /* v1.4 dev3 农田&破败村落：大片麦田 + 稻草堆 + 破烂手推车 + 更密栅栏 */
    for(let x=4820;x<7100;x+=560)
      st.wheatFields.push({x:x+U.rr(-30,30),depth:U.rr(-72,72),w:U.rr(470,620),
        phase:U.rr(0,6.28),hue:U.ri(0,2)});
    for(let i=0;i<9;i++)st.haystacks.push({x:U.rr(4880,7060),depth:U.rr(-86,86),
      w:U.rr(34,58),h:U.rr(26,44),lean:U.rr(-.18,.18),hue:U.ri(0,2)});
    for(let i=0;i<5;i++)st.carts.push({x:U.rr(4960,7000),depth:U.rr(-82,82),
      w:U.rr(62,92),h:U.rr(28,42),broken:U.rnd()<.7,hue:U.ri(0,2)});
    /* 破败村落：土坯残屋、歪扭栅栏、锈蚀农具 */
    for(let i=0;i<13;i++)st.ruins.push({x:U.rr(4880,7020),depth:U.rr(-86,86),
      w:U.rr(58,124),h:U.rr(54,112),lean:U.rr(-.1,.1),hue:U.ri(0,2)});
    for(let x=4860;x<7160;x+=86)if(U.rnd()<.78)
      st.fences.push({x,depth:U.rr(-88,88),h:U.rr(24,46),broken:U.rnd()<.38});
    for(let i=0;i<24;i++)st.tools.push({x:U.rr(4900,7000),depth:U.rr(-88,88),
      kind:U.ri(0,2),phase:U.rr(0,6.28)});
    /* 食人族哨塔（洼地）与沼民简易哨点（灌木） */
    [520,1480,2080].forEach((x,i)=>st.towers.push({x,depth:i%2?66:-66,h:U.rr(104,142),
      zi:0,style:"hide"}));
    [2700,3420,4320].forEach((x,i)=>st.towers.push({x,depth:i%2?-70:70,h:U.rr(78,118),
      zi:1,style:"reed"}));
    st.gargoyle={x:9200,depth:-64,h:192};
    st.tent={x:8560,depth:48,w:154,h:88};
    st.gate={x:9480,depth:-30,w:260,h:250};
    /* 夜间发光虫 / 萤火 / 蝴蝶 / 飞鸟 / 雾团 / 落叶 / 细雨 */
    for(let i=0;i<120;i++)st.glowbugs.push({x:U.rr(0,W),depth:U.rr(-95,95),
      y:U.rr(24,210),phase:U.rr(0,6.28),v:U.rr(.4,1.2),size:U.rr(1.2,3.1)});
    for(let i=0;i<96;i++)st.fireflies.push({x:U.rr(0,W),depth:U.rr(-95,95),
      y:U.rr(18,170),phase:U.rr(0,6.28),v:U.rr(.3,.9)});
    for(let i=0;i<28;i++)st.butterflies.push({x:U.rr(0,2600),depth:U.rr(-90,90),
      y:U.rr(40,190),phase:U.rr(0,6.28),v:U.rr(.7,1.4),hue:U.ri(0,2)});
    for(let i=0;i<14;i++)st.birds.push({x:U.rr(0,W),y:U.rr(110,320),
      v:U.rr(14,36),phase:U.rr(0,6.28)});
    for(let i=0;i<76;i++)st.mist.push({x:U.rr(0,W),depth:U.rr(-100,100),
      w:U.rr(180,460),h:U.rr(28,80),a:U.rr(.05,.16),v:U.rr(4,15),phase:U.rr(0,6.28)});
    for(let i=0;i<32;i++)st.leaves.push({x:U.rr(0,W),y:U.rr(0,520),
      v:U.rr(8,24),sw:U.rr(0,6.28),r:U.rr(2.2,5),hue:U.ri(0,3)});
    for(let i=0;i<66;i++)st.drops.push({x:U.rr(0,W),y:U.rr(0,600),
      v:U.rr(420,700),len:U.rr(11,23),a:U.rr(.12,.34)});
    /* 路人：按配置带行走范围与分区 */
    CFG.BORDER_WALKERS.forEach(w=>st.walkers.push(Object.assign({},w,
      {x:w.x0,depth:w.d0,t:w.t})));
    CFG.BORDER_NODES.forEach(n=>st.nodes.push(Object.assign({},n,{flash:0})));
  }

  /* ---------- 怪物：实例级 cfg 副本，数值 ×3.25，不污染全局 MOBS ---------- */
  function spawnMobs(){
    E.enemies.clear();st.mobs.length=0;st.hostiles.length=0;
    CFG.BORDER_MOBS.forEach(m=>{
      const base=CFG.MOBS[m.type]||CFG.MOBS.normal;
      const cfg=Object.assign({},base,{
        hp:Math.round(base.hp*MUL),dmg:Math.round(base.dmg*MUL),
        xp:Math.round((base.xp||0)*MUL),gold:Math.round((base.gold||0)*MUL)
      });
      const e=E.spawnEnemy(m.type,m.x,m.depth);if(!e)return;
      e.cfg=cfg;
      e.maxHp=e.hp=cfg.hp;
      e.home={x:m.x,depth:m.depth};e.territory=m.territory||base.territory||240;
      e.patrolT=U.rr(0,6);e.aggroT=0;e.returnT=0;e.spawn=.42;
      e.alerted=false;e.hidden=false;e.called=false;e.bossSkill=0;
      e.sight=m.boss?560:(cfg.reach>200?430:360);
      e.barT=0;
      if(cfg.ai==="neutral"){
        e.hostile=false;e.aggro=0;e.hateZone=300;st.mobs.push(e);
      }else if(cfg.ai==="halfNeutral"){
        e.hostile=false;e.halfNeutral=true;st.mobs.push(e);
      }else{
        e.hostile=true;e.aggro=1;st.hostiles.push(e);
      }
    });
  }

  /* ================= v1.4 dev3 · 边境三类 AI 回归旧地图标准 =================
     1) 入图宽限 + 落点安全半径：刚传送、或仍在安全圈内不会被半中立一拥而上。
     2) 发现提示：横幅 + toast + aggro 音效 + 仇恨光环，回归沼泽 / 星火港口径。
     3) 脱战：不再瞬移回出生点，改由 returnT 平滑走回领地并回满状态。
     敌对「被 xx 发现了！」仍由 combat.updateAI 的视野逻辑统一处理。 */
  function noticeMob(e,text,doc,color,rad){
    e.warned=true;e.barT=2.2;e.aggroT=0;
    WLD.markEngage();
    CR.ui.banner("⚠ "+text);
    CR.ui.toast(text+(doc?" · "+doc:""));
    CR.audio.sfx("aggro");
    E.ringFx(e.x,e.depth,color||C.hpAmber,rad||Math.max(100,e.territory||220),.6);
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
    const nearSpawn=Math.hypot(px-st.spawnX,pd-st.spawnDepth)<(CFG.BORDER_SAFE_R||220);
    const safe=(st.grace||0)>0||nearSpawn||P.dead||
      (CR.combat.isStealth&&CR.combat.isStealth());
    for(const e of st.mobs){
      if(!e||!e.alive)continue;
      const d=Math.hypot(px-e.x,pd-e.depth);
      if(e.halfNeutral){
        const T=e.territory||240;
        if(!e.hostile){
          if(!safe&&d<T&&e.spawn<=0){
            e.hostile=true;e.aggro=1;
            noticeMob(e,e.cfg.label+" 注意到了你！",CFG.AI_DOC.halfNeutral,
              C.hpAmber||C.orange,T);
          }else if(e.spawn<=0){
            /* 未激活：只在领地内缓慢巡逻 */
            e.patrolT=(e.patrolT||0)+dt;
            const tx=e.home.x+Math.sin(e.patrolT*.55)*T*.42;
            const td=e.home.depth+Math.cos(e.patrolT*.42)*26;
            e.vx=U.clamp((tx-e.x)*1.6,-52,52);
            e.vd=U.clamp((td-e.depth)*1.4,-26,26);
            e.facing=e.vx>=0?1:-1;
            if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.25);
          }
        }else{
          if(!e.warned)noticeMob(e,e.cfg.label+" 注意到了你！",CFG.AI_DOC.halfNeutral,
            C.hpAmber||C.orange,T);
          if(d>T*1.65)e.aggroT+=dt;else e.aggroT=0;
          if(e.aggroT>1.05){
            calmMob(e,e.cfg.label+" 已离开领地 · 解除仇恨并回满状态");
          }else if(e.cfg.reach>200&&d<168){
            /* 远程匪帮 / 弓手：刻意与玩家拉开距离 */
            e.vx=U.clamp(-Math.sign(px-e.x||1)*92,-92,92);
            e.vd=U.clamp(-Math.sign(pd-e.depth||1)*36,-36,36);
          }
        }
      }else{
        /* 中立：人不犯我我不犯人；被攻击后反击，离开仇恨区域解除并平滑归位 */
        if(e.hostile&&!e.warned){
          noticeMob(e,"中立 · "+e.cfg.label+" 注意到你！",CFG.AI_DOC.neutral,
            C.hpBlue,e.hateZone||300);
        }
        if(e.hostile){
          if(d>(e.hateZone||300))e.aggroT+=dt;else e.aggroT=0;
          if(e.aggroT>1.4){
            calmMob(e,"中立 · "+e.cfg.label+" 不再追你 · 回到原地并回满状态");
          }
        }else{
          e.patrolT=(e.patrolT||0)+dt;
          if(U.rnd()<dt*.12){e.vx=U.rr(-34,34);e.vd=U.rr(-18,18);}
          e.vx=U.lerp(e.vx,0,.03);e.vd=U.lerp(e.vd,0,.03);
          e.facing=e.vx>=0?1:-1;
          if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.10);
        }
      }
      /* 平滑归位：只驱动速度，绝不直接改写 x / depth 造成瞬移 */
      if(e.returnT>0){
        const dx=e.home.x-e.x,dd=e.home.depth-e.depth;
        if(Math.hypot(dx,dd)<9){
          e.x=e.home.x;e.depth=e.home.depth;e.vx=e.vd=0;e.returnT=0;
        }else{
          e.vx=U.clamp(dx*1.9,-70,70);
          e.vd=U.clamp(dd*1.7,-32,32);
          e.returnT=Math.max(.05,e.returnT-dt);
        }
      }
    }
    /* 食人魔：暗系技能可致中毒 / 麻痹 */
    const boss=st.hostiles.find(e=>e&&e.alive&&e.type==="ogreMage");
    if(boss&&boss.alerted){
      st.bossSkillT-=dt;
      if(st.bossSkillT<=0){
        st.bossSkillT=U.rr(5.2,7.6);
        const d=Math.hypot(px-boss.x,pd-boss.depth);
        if(d<520&&!P.dead){
          const pick=U.rnd()<.5?"poison":"paralyze";
          try{CR.status.apply(P,pick,boss);}catch(err){}
          CR.combat.hurtPlayer(Math.round(boss.cfg.dmg*.42),boss.x,
            {magic:true,element:"暗系"});
          E.spawnFloat(P.x,P.depth,96,pick==="poison"?"☠ 中毒":"⚡ 麻痹","warn",
            C.ghostViolet,true);
          E.ringFx(P.x,P.depth,C.ghostViolet,150,.6);
          CR.audio.sfx("fireball");
          CR.ui.toast("🜏 食人魔的暗系法术命中 · "+(pick==="poison"?"中毒":"麻痹"));
        }
      }
    }
  }

  /* ---------- 地面 / 脚步声：四段各不相同 ---------- */
  function groundAt(x){
    const zi=CFG.borderZoneAt(Math.max(0,Math.min(W-1,x)));
    if(zi===0)return "grass";                       // 洼地湿草 / 池塘边
    if(zi===1){const n=((Math.floor(x/120)*73+19)%17)/17;return n<.62?"water":"grass";}
    if(zi===2){const n=((Math.floor(x/120)*73+19)%17)/17;return n<.26?"grass":(n>.84?"stone":"sand");}
    return "stone";                                  // 城门石垣铺地
  }
  function stepSound(dt){
    if(!P.moving)return;
    st.stepDist+=Math.abs(P.vx||0)*dt;
    if(st.stepDist<64)return;st.stepDist=0;
    const g=groundAt(P.x);
    CR.audio.sfx(g==="stone"?"stepStone":(g==="grass"?"stepGrass":
      (g==="sand"?"stepSand":"splash")));
  }

  /* ---------- 采集 ---------- */
  function hasTool(ids){
    const s=CR.equip?CR.equip.slots(P.cls):{};
    const arr=Array.isArray(ids)?ids:[ids];
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
    g.t+=dt;
    CR.ui.setGather&&CR.ui.setGather(U.clamp(g.t/g.dur,0,1),g.node.name);
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
    CR.audio.sfx("pickup");
    E.burst(P.x,P.depth,26,C.leaf1,10,110);
    CR.ui.setGather&&CR.ui.setGather(0,"");
    CR.ui.refreshPanels();
    st.gather=null;
  }

  /* ---------- 交易：日 / 周 / 永久限购，按北京时间结算 ---------- */
  function bought(){if(!SV.data.borderBought)SV.data.borderBought={};return SV.data.borderBought;}
  function periodKey(row){
    if(row.period==="once")return "once";
    if(row.period==="weekly"){
      const d=new Date(beijingDate()+"T00:00:00Z");
      const dow=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-dow);
      return "W"+d.toISOString().slice(0,10);
    }
    return beijingDate();
  }
  function leftOf(npc,row){
    const b=bought(),k=npc+"|"+row.id+"|"+periodKey(row);
    return Math.max(0,row.limit-(b[k]||0));
  }
  function buy(npc,id){
    const row=(CFG.BORDER_GOODS[npc]||[]).find(r=>r.id===id);
    if(!row)return {ok:false,reason:"没有这件商品"};
    if(npc==="farmerTao"&&!taoOpen())return {ok:false,reason:"老陶已经收摊了（每天 6:00 - 17:00 才摆摊）"};
    const left=leftOf(npc,row);
    if(left<=0)return {ok:false,reason:"已售罄（"+(row.period==="weekly"?"每周":(row.period==="once"?"永久":"每日"))+"限量）"};
    if(SV.data.profile.gold<row.price)return {ok:false,reason:"金币不足"};
    SV.spendGold(row.price);
    if(row.k==="mat")SV.addMat(id,1);
    else if(row.k==="equip")SV.addEquip(id,1);
    else SV.addItem(id,1);
    const b=bought(),k=npc+"|"+id+"|"+periodKey(row);
    b[k]=(b[k]||0)+1;SV.mark();SV.flush();
    CR.audio.sfx("buy");
    const eq=CFG.MATERIALS[id]||CFG.ITEMS[id]||CFG.EQUIPMENT[id]||{};
    const nm=(eq.label||eq.name)||id;
    CR.ui.toast("买下 "+nm+" ×1 · 剩余 "+leftOf(npc,row)+" 件");
    CR.ui.refreshPanels();
    return {ok:true,name:nm,left:leftOf(npc,row)};
  }
  function sell(id,n){
    n=n||1;const price=CFG.BORDER_SELL[id];
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
    for(const key in CFG.BORDER_NPCS){
      const n=CFG.BORDER_NPCS[key],d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<140&&d<bd){bd=d;best={type:"npc",id:key,cfg:n,d};}
    }
    st.nodes.forEach(n=>{
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<105&&d<bd){bd=d;best={type:"node",id:n.id,cfg:n,d};}
    });
    return best;
  }
  /* ================= v1.4 dev4.1 入学前置链 =================
     0 未报名 → 缴 9900 金币 + 领 11 件见习术士套件 → 1 待元素考核
     → 在城门一带释放任意元素技能 → 2 持入内凭据/徽章待核实
     → 城门石像鬼守卫核实 → 3 解锁【魔法大学城】大地图节点 */
  function grantKit(){
    (CFG.APP_EQUIP||[]).forEach(id=>SV.addEquip(id,1));
    SV.addMat("academyRobe",1);SV.addMat("academyMap",1);
    SV.mark();SV.flush();
    try{CR.ui.refreshPanels();}catch(e){}
  }
  function talkFreshman(cfg){
    const e=SV.enroll(),p=SV.data.progress;
    const zone=CFG.BORDER_ZONES[CFG.borderZoneAt(cfg.x)].name;
    if(e.stage===0){
      CR.ui.openDialogue({name:cfg.name,title:zone+" · 新生接待棚",icon:cfg.icon,color:cfg.color,
        reward:"入学费 "+CFG.ENROLL_FEE+" 金币 · 报名礼：见习术士套件 11 件 + 学院临时袍 + 西郊地图",
        lines:cfg.lines.concat(["（点【完成 ✓】即缴纳入学费并领取礼包；金币不足可先去打怪攒钱）"]),
        onDone:()=>{
          if(SV.data.profile.gold<CFG.ENROLL_FEE){
            CR.ui.toast("金币不足 · 入学需要 "+CFG.ENROLL_FEE+" 金币（当前 "+
              SV.data.profile.gold+"）");CR.audio.sfx("deny");return;}
          SV.spendGold(CFG.ENROLL_FEE);grantKit();
          p.freshmanRegistered=true;SV.setEnrollStage(1);
          CR.ui.banner("📋 报名完成 · 请展示任意元素技能");
          CR.ui.toast("已缴 "+CFG.ENROLL_FEE+" 金币 · 见习术士套件 11 件已入背包 · 在城门一带释放元素技能完成考核");
          CR.audio.sfx("uiBig");
        }});
      return;
    }
    if(e.stage===1){
      CR.ui.openDialogue({name:cfg.name,title:zone+" · 元素考核中",icon:cfg.icon,color:cfg.color,
        reward:"考核目标：释放任意带元素系别的技能（如土系【旋风斩】）",
        lines:["还没看到你的元素技能呢～","在城门一带用一次带元素系别的技能，我来给你盖章。",
          "通过后会拿到【入内凭据】与按等级分级的学员徽章，再去找石像鬼守卫核实。"],onDone:null});
      return;
    }
    CR.ui.openDialogue({name:cfg.name,title:zone+" · "+(e.stage>=3?"已入学":"考核已通过"),
      icon:cfg.icon,color:cfg.color,
      reward:e.stage>=3?"魔法大学城已解锁":"入内凭据已发放 · 待石像鬼核实",
      lines:[e.stage>=3?"欢迎回来，学员！城里四段都开放了，按 M 就能直接前往。":
        "拿着【入内凭据】去城门石像鬼守卫那儿核实吧，它会放行的。",
        "学员徽章按等级分铜 / 银 / 金；以后刷卡进图书馆、任务堂、宿舍、竞技场都用得上。"],onDone:null});
  }
  function talkGargoyle(cfg){
    st.scanT=1.8;CR.audio.sfx("buff");
    const e=SV.enroll(),zone=CFG.BORDER_ZONES[CFG.borderZoneAt(cfg.x)].name;
    if(e.stage>=3){
      CR.ui.openDialogue({name:cfg.name,title:zone+" · 核验",icon:cfg.icon,color:cfg.color,
        reward:"学员身份有效",lines:["（晶核亮起，扫描光圈掠过你的徽章）","身份已登记，请进。","（石像收拢翼，让出城门）"],onDone:null});
      return;
    }
    if(e.stage===2&&SV.hasEntryPass()){
      SV.grantCityPermit();
      CR.ui.banner("🏛 核实通过 · 魔法大学城已解锁");
      CR.ui.toast("按 M 打开大地图，选择【魔法大学城】即可前往");
      CR.audio.sfx("uiBig");
      CR.ui.openDialogue({name:cfg.name,title:zone+" · 核实通过",icon:cfg.icon,color:cfg.color,
        reward:"获得进入【魔法大学城】的许可",
        lines:["（蓝色晶核亮起，扫描光圈自上而下掠过入内凭据）","……凭据有效，学员徽章已登记。","城门为你敞开，按 M 选择【魔法大学城】即可前往。"],onDone:null});
      return;
    }
    CR.ui.openDialogue({name:cfg.name,title:zone+" · 未通过核验",icon:cfg.icon,color:cfg.color,
      reward:"需要入内凭据",
      lines:["（蓝色晶核亮起，一道扫描光圈自上而下掠过你）",
        "……身份未登记。请先到【新生接待棚】缴纳入学费、通过元素技能考核并领取入内凭据。",
        "（石像重新收拢翼，恢复静止）"],onDone:null});
  }
  /* 由 combat.doSkill 在技能成功释放后转发：stage 1 且为元素技能即通过考核 */
  function onSkillCast(sk){
    const e=SV.enroll();
    if(e.stage!==1||CR.world.mode!=="border"||!sk)return;
    const el=sk.element||"普通系";
    if(el==="普通系"||el==="无"||el==="none")return;
    const lv=(SV.levelOf&&SV.levelOf(CR.ent.player.cls))||1;
    const bd=SV.badgeFor(lv);
    SV.addMat(CFG.ENTRY_PASS,1);SV.addMat(bd.id,1);
    SV.setEnrollStage(2,bd.id);SV.mark();SV.flush();
    CR.ui.banner("✦ 考核通过 · "+bd.name+"学员徽章 + 入内凭据");
    CR.ui.toast("【"+sk.name+"】（"+el+"）展示成功 · 去找城门石像鬼守卫核实凭据");
    CR.audio.sfx("uiBig");
    try{CR.ui.refreshPanels();}catch(err){}
  }
  function talk(id,cfg){
    CR.audio.sfx("talk");
    if(id==="farmerTao"){
      if(!taoOpen()){
        CR.ui.openDialogue({name:cfg.name,title:"收摊中",icon:cfg.icon,color:cfg.color,
          reward:"每天 6:00 - 17:00 摆摊",
          lines:["太阳下山咯，摊子收了。","明早六点再来吧，橘子给你留着。"],onDone:null});
        return;
      }
      CR.ui.openSwampShop("farmerTao");return;
    }
    if(id==="wanderingMage"){CR.ui.openSwampShop("wanderingMage");return;}
    if(id==="freshmanDesk"){talkFreshman(cfg);return;}
    if(id==="gargoyle"){talkGargoyle(cfg);return;}
    CR.ui.openDialogue({name:cfg.name,title:CFG.BORDER_ZONES[CFG.borderZoneAt(cfg.x)].name,
      icon:cfg.icon,color:cfg.color,reward:cfg.desc.split("。")[0],lines:cfg.lines,onDone:null});
  }
  function interact(){
    const n=nearest();
    if(!n){CR.ui.toast("附近没有可交互对象 · 靠近 NPC 或采集点");CR.audio.sfx("deny");return;}
    if(n.type==="node"){beginGather(n.cfg);return;}
    talk(n.id,n.cfg);
  }

  /* ---------- 生命周期 ---------- */
  function init(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    st.zone=CFG.borderZoneAt(P.x);
    /* v1.4 dev3：入图宽限 + 落点安全圈。spawnX/Depth 记下本次传送点，
       grace 递减完之前半中立不主动仇恨；玩家仍在安全圈内也不主动仇恨。 */
    st.grace=CFG.BORDER_GRACE||3;
    st.spawnX=P.x;st.spawnDepth=P.depth||0;
    st.clockT=0;st.dayT=0;st.ambT=0;st.sway=0;st.bossIntro=false;
    st.bossSkillT=5;st.scanT=0;st.zoneVoiced={};st.lowLvWarned=false;
    SV.dailyReset();
    buildScenery();spawnMobs();
    st.near=null;st.gather=null;st.stepDist=0;
    WLD.bossRef=null;
    SV.data.progress.borderVisits=(SV.data.progress.borderVisits||0)+1;
    SV.mark();SV.flush();
    applyClock();syncBgm();
    CR.ui.banner("🌧 雨 沼 边 境 走 廊 · "+CFG.BORDER_ZONES[st.zone].name);
    CR.ui.toast("⚠ 推荐 Lv.85+ · 野外单位数值 ≥ 前图 3 倍 · 向右到大学城西郊，向左回雨沼洼地（"+
      c.src+" "+c.hour+":00）");
    const lv=SV.levelOf?SV.levelOf(P.cls):1;
    if(lv<85){CR.ui.toast("当前 Lv."+lv+" 低于推荐 Lv.85 · 建议先提升等级再来");st.lowLvWarned=true;}
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }
  function update(dt){
    st.dayT+=dt;
    if(st.dayT>20){st.dayT=0;applyClock();}
    st.grace=Math.max(0,(st.grace||0)-dt);
    st.sway+=dt;st.ambT+=dt;
    st.scanT=Math.max(0,st.scanT-dt);
    /* 虫鸣 / 蛙声 / 城门风声：每 3.6 秒一层环境音 */
    if(st.ambT>3.6){st.ambT=0;
      CR.audio.sfx(st.isNight?"swampNightAmb":(st.zone===3?"wave":"swampAmb"));}
    syncBgm();stepSound(dt);updateMobs(dt);updateGather(dt);
    st.walkers.forEach(w=>{
      w.t+=dt;
      w.x=w.x0+Math.sin(w.t*w.speed/90)*w.range*.5;
      w.depth=w.d0+Math.sin(w.t*.8)*9;
    });
    st.leaves.forEach(o=>{o.y+=o.v*dt;o.x+=Math.sin(CR.game.time*.8+o.sw)*12*dt;
      if(o.y>640){o.y=-20;o.x=U.rr(0,W);}});
    st.drops.forEach(o=>{o.y+=o.v*dt;o.x-=o.v*.1*dt;
      if(o.y>620){o.y=-20;o.x=U.rr(0,W);}});
    st.nodes.forEach(n=>{n.flash=Math.max(0,(n.flash||0)-dt*1.6);});
    st.near=nearest();
    const zi=CFG.borderZoneAt(P.x);
    if(zi!==st.zone){
      st.zone=zi;const z=CFG.BORDER_ZONES[zi];
      CR.ui.banner("进入 · "+z.name+"（"+z.danger+"）");
      CR.ui.toast(z.desc);
      CR.audio.sfx("wave");syncBgm();
      if(zi===0&&!st.bossIntro){
        st.bossIntro=true;
        const boss=st.hostiles.find(e=>e&&e.alive&&e.type==="ogreMage");
        if(boss){WLD.bossRef=boss;boss.barT=9999;}
        CR.ui.toast("🜏 洼地深处有食人魔的气息 · 暗系法术会致中毒 / 麻痹");
      }
      if(zi===3&&!st.zoneVoiced[3]){
        st.zoneVoiced[3]=1;
        CR.ui.toast("🏛 前方即【魔法大学城】西郊城门 · 主线区域将在 v1.4 dev2.1 开放");
      }
    }
    const key=CFG.KEY_LABELS[SV.data.settings.bindings.interact]||"F";
    CR.ui.setInteractHint(st.near?("按 "+key+" "+
      (st.near.type==="node"?
        ("采集 "+st.near.cfg.name+"（今日剩 "+SV.gatherLeft(st.near.id)+" 次 · "+toolInfo(st.near.cfg)+"）"):
        ("与 "+st.near.cfg.name+" 交互"+(st.near.id==="farmerTao"&&!taoOpen()?"（已收摊）":"")))):"");
  }
  function post(){
    const z=CFG.BORDER_ZONES[st.zone]||CFG.BORDER_ZONES[1];
    const tint=st.isNight?[.80,.90,1.12]:(st.phase==="dusk"?[1.06,.94,.86]:[1,1,1]);
    const gw=CR.weather&&CR.weather.activeFor&&CR.weather.activeFor("border")?
      CR.weather.current():null;
    const wt=gw?(gw.tint||[1,1,1]):[1,1,1],wa=gw?(gw.ambient||1):1;
    return {tint:[tint[0]*z.tint[0]*wt[0],tint[1]*z.tint[1]*wt[1],tint[2]*z.tint[2]*wt[2]],
      ambient:z.ambient*(st.isNight?.74:1)*wa,flash:0,white:WLD.white,
      vigBoost:.10+z.fog*.20+(gw&&gw.rain?.05:0),time:CR.game.time,
      fog:z.fog+(gw&&gw.rain?.10:0)};
  }

  CR.border={st,init,update,post,interact,nearest,beginGather,gatherCheck,toolInfo,onSkillCast,
    buy,sell,leftOf,applyClock,groundAt,zoneScene,taoOpen,
    get hour(){return st.hour;},get isNight(){return st.isNight;},
    get phase(){return st.phase;},get clockSrc(){return st.clockSrc;},
    get zone(){return st.zone;},get weather(){return st.ambient;},
    get nodes(){return st.nodes;},get mobs(){return st.mobs;},
    get hostiles(){return st.hostiles;},get walkers(){return st.walkers;},
    get trees(){return st.trees;},get vines(){return st.vines;},
    get ponds(){return st.ponds;},get reeds(){return st.reeds;},
    get wheat(){return st.wheat;},get wheatFields(){return st.wheatFields;},
    get haystacks(){return st.haystacks;},get carts(){return st.carts;},
    get ruins(){return st.ruins;},
    get fences(){return st.fences;},get tools(){return st.tools;},
    get towers(){return st.towers;},get gargoyle(){return st.gargoyle;},
    get tent(){return st.tent;},get gate(){return st.gate;},
    get glowbugs(){return st.glowbugs;},get fireflies(){return st.fireflies;},
    get butterflies(){return st.butterflies;},get birds(){return st.birds;},
    get mist(){return st.mist;},get leaves(){return st.leaves;},
    get drops(){return st.drops;},get sway(){return st.sway;},
    get scanT(){return st.scanT;},get gather(){return st.gather;}};
})(window.CR=window.CR||{});
