/* swamp.js — v1.4 dev1 · 蛮荒沼泽：泥沼与獠牙
 * 四段子区域 / 薄雾浅水 / NPC 与限量交易 / 采集 / 三类 AI / 任务推送
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,SV=CR.save;
  const st={
    hour:20,phase:"night",isNight:true,clockSrc:"本机",clockT:0,dayT:0,zone:0,
    sway:0,fogT:0,ambT:0,stepDist:0,stepT:0,lastGround:"",wet:true,weather:"薄雾",
    /* 1.4 dev1.2 天气 / 后期 / BOSS 登场 */
    weatherMode:"auto",wcfg:null,weatherT:0,lightningT:0,lightning:0,bossIntro:false,
    rain:[],snow:[],leaves:[],
    nodes:[],mobs:[],hostiles:[],walkers:[],reeds:[],islands:[],deadwoods:[],
    towers:[],glowbugs:[],fireflies:[],flowers:[],birds:[],mist:[],
    near:null,gather:null,bought:{},hut:null,temple:null,
    questVoiced:false,lowLvWarned:false,dangerVoiced:false
  };

  /* ---------- 北京时间 ---------- */
  function beijingDate(){
    const d=new Date();
    return new Date(d.getTime()+(d.getTimezoneOffset()*60000)+8*3600000)
      .toISOString().slice(0,10);
  }
  function beijingClock(){
    /* 1.4 dev1.4 根因修复：dev1.3 这里用 getUTCHours() 读「UTC + (8 - 本地时区)」，
       在北京时区实际等于 UTC 小时，比北京时间整差 8 小时（其它三图用的是 getHours()，
       换算后恰好等于 UTC+8）。现在与集市 / 星火港 / 魔法丛林使用完全相同的算法。 */
    const now=new Date();
    const utc=now.getTime()+now.getTimezoneOffset()*60000;
    const bj=new Date(utc+8*3600000);
    if((SV.data.settings.clockSource||"beijing")==="local")
      return {hour:now.getHours(),src:"本机时间"};
    return {hour:bj.getHours(),src:"北京时间"};
  }
  function phaseOf(h){return h>=18||h<6?"night":(h>=16||h<8?"dusk":"day");}
  /* ---------- 1.4 dev1.2 天气：真实响应设置面板 ---------- */
  function baseWeather(){return st.wet?"潮湿 · 蚊群活跃":"薄雾";}
  function rollWeather(){
    return CFG.WEATHER_ORDER[U.ri(0,CFG.WEATHER_ORDER.length-1)];
  }
  function setWeather(id,quiet){
    const mode=id||"auto";
    st.weatherMode=mode;
    const pick=mode==="auto"?rollWeather():mode;
    if(!CFG.WEATHER[pick])return;
    st.wcfg=CFG.WEATHER[pick];
    st.weather=baseWeather()+" · "+st.wcfg.name;
    st.lightning=0;
    /* 雨丝 / 雪片粒子按天气重建 */
    st.rain.length=0;st.snow.length=0;
    const W=CFG.SWAMP_W||6000;
    if(st.wcfg.rain>0){
      for(let i=0;i<74;i++)st.rain.push({x:U.rr(0,W),y:U.rr(0,600),
        v:U.rr(420,760)*st.wcfg.rain,len:U.rr(12,26),a:U.rr(.25,.65)});
    }
    if(st.wcfg.snow>0){
      for(let i=0;i<48;i++)st.snow.push({x:U.rr(0,W),y:U.rr(0,600),
        v:U.rr(24,62),sw:U.rr(0,6.28),r:U.rr(1.4,3.6)});
    }
    if(!quiet){
      CR.ui.banner(st.wcfg.icon+" "+st.wcfg.name+" · "+st.wcfg.desc);
      CR.audio.sfx(pick==="storm"?"thunder":(pick==="rain"?"rain":"wave"));
      CR.ui.refreshWeather&&CR.ui.refreshWeather();
    }
  }
  function zoneScene(){
    const z=CFG.SWAMP_ZONES[st.zone]||CFG.SWAMP_ZONES[0];
    return (z.bgm||"swamp")+(st.isNight?"Night":"");
  }
  function syncBgm(){CR.audio.setScene(zoneScene(),false);}

  function applyClock(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    CR.audio.setScene(zoneScene(),true);
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }

  /* ---------- 场景元素 ---------- */
  function buildScenery(){
    st.nodes.length=0;st.reeds.length=0;st.islands.length=0;st.deadwoods.length=0;
    st.towers.length=0;st.glowbugs.length=0;st.fireflies.length=0;
    st.flowers.length=0;st.birds.length=0;st.mist.length=0;st.walkers.length=0;
    st.leaves.length=0;
    U.srand(91731);
    /* 1.4 dev1.2 画面增强：苔藓 / 垂藤 / 浮萍睡莲 / 菇丛 / 水草 / 气泡 / 落叶 */
    st.moss=[];st.vines=[];st.lilies=[];st.mushrooms=[];st.seaweed=[];st.bubbles=[];
    st.roots=[];st.totems=[];st.bones=[];
    for(let x=40;x<CFG.SWAMP_W;x+=56){
      if(U.rnd()<.72)st.moss.push({x:x+U.rr(-16,16),depth:U.rr(-88,88),
        w:U.rr(16,52),h:U.rr(4,11),hue:U.ri(0,3)});
      if(U.rnd()<.30)st.vines.push({x:x+U.rr(-10,10),depth:U.rr(-90,-30),
        h:U.rr(48,140),phase:U.rr(0,6.28)});
      if(U.rnd()<.42)st.lilies.push({x:x+U.rr(-14,14),depth:U.rr(-86,86),
        r:U.rr(9,24),flower:U.rnd()<.22,phase:U.rr(0,6.28)});
      if(U.rnd()<.26)st.mushrooms.push({x:x+U.rr(-12,12),depth:U.rr(-88,88),
        h:U.rr(9,22),hue:U.ri(0,3)});
      if(U.rnd()<.52)st.seaweed.push({x:x+U.rr(-12,12),depth:U.rr(-88,88),
        h:U.rr(18,52),phase:U.rr(0,6.28)});
      if(U.rnd()<.34)st.bubbles.push({x:x+U.rr(-12,12),depth:U.rr(-86,86),
        phase:U.rr(0,6.28),v:U.rr(.4,1.4)});
      if(U.rnd()<.18)st.roots.push({x:x+U.rr(-8,8),depth:U.rr(-88,88),w:U.rr(22,58)});
    }
    for(let i=0;i<20;i++)st.leaves.push({x:U.rr(0,CFG.SWAMP_W),y:U.rr(0,520),
      v:U.rr(9,26),sw:U.rr(0,6.28),r:U.rr(2.4,5.2),hue:U.ri(0,3)});
    /* 红泥部落：图腾柱与骨堆 */
    [1880,2140,2620,2980,3320].forEach((x,i)=>st.totems.push({x,depth:i%2?58:-58,h:U.rr(96,150)}));
    for(let i=0;i<22;i++)st.bones.push({x:U.rr(1850,3600),depth:U.rr(-80,80),w:U.rr(8,22)});

    /* 芦苇：四段密度不同，按分区 density 铺 */
    for(let x=-200;x<CFG.SWAMP_W+300;x+=26){
      const z=CFG.SWAMP_ZONES[CFG.swampZoneAt(Math.max(0,Math.min(CFG.SWAMP_W-1,x)))];
      if(U.rnd()>Math.min(1,.72*z.density))continue;
      st.reeds.push({x:x+U.rr(-8,8),depth:U.rr(-92,92),h:U.rr(88,168),
        w:U.rr(2.2,4.4),phase:U.rr(0,6.28),hue:U.ri(0,3)});
    }
    /* 泥沼小岛 */
    for(let i=0;i<26;i++){
      st.islands.push({x:U.rr(120,CFG.SWAMP_W-120),depth:U.rr(-86,86),
        rx:U.rr(46,130),ry:U.rr(9,24),hue:U.ri(0,3)});
    }
    /* 枯木（薇拉树屋在毒瘴泥潭） */
    for(let i=0;i<18;i++){
      st.deadwoods.push({x:U.rr(200,CFG.SWAMP_W-200),depth:U.rr(-88,88),
        h:U.rr(70,150),lean:U.rr(-.25,.25),phase:U.rr(0,6.28)});
    }
    st.hut={x:4100,depth:-72,h:132};
    /* 红泥部落哨塔 */
    [1960,2320,2780,3160].forEach((x,i)=>st.towers.push({x,depth:i%2?64:-64,h:U.rr(112,148)}));
    /* 沉没古神庙（水下石柱与雕像，退潮机制后续 dev） */
    st.temple={x:5400,depth:-90};
    /* 夜间发光虫 / 萤火 / 雾团 */
    for(let i=0;i<90;i++)st.glowbugs.push({x:U.rr(0,CFG.SWAMP_W),depth:U.rr(-90,90),
      y:U.rr(30,190),phase:U.rr(0,6.28),v:U.rr(.4,1.2),size:U.rr(1.2,3.2)});
    for(let i=0;i<70;i++)st.fireflies.push({x:U.rr(0,CFG.SWAMP_W),depth:U.rr(-90,90),
      y:U.rr(20,160),phase:U.rr(0,6.28),v:U.rr(.3,.9)});
    for(let i=0;i<44;i++)st.mist.push({x:U.rr(0,CFG.SWAMP_W),depth:U.rr(-100,100),
      w:U.rr(180,420),h:U.rr(30,72),a:U.rr(.05,.16),v:U.rr(4,14),phase:U.rr(0,6.28)});
    for(let i=0;i<36;i++)st.flowers.push({x:U.rr(0,CFG.SWAMP_W),depth:U.rr(-88,88),
      h:U.rr(10,22),phase:U.rr(0,6.28),hue:U.ri(0,3)});
    for(let i=0;i<10;i++)st.birds.push({x:U.rr(0,CFG.SWAMP_W),y:U.rr(120,300),
      v:U.rr(14,34),phase:U.rr(0,6.28)});
    /* 路人：渔夫帮工 / 采药人 / 逃难的旅人 */
    st.walkers=[
      {name:"晒网的帮工",x0:700,d0:62,color:C.cloth3,icon:"●",t:0,speed:26,range:180},
      {name:"背药篓的学徒",x0:3940,d0:56,color:C.leaf1,icon:"✿",t:1,speed:24,range:220},
      {name:"迷路的旅人",x0:1500,d0:-58,color:C.cloth,icon:"▣",t:2,speed:36,range:260}
    ];
    CFG.SWAMP_NODES.forEach(n=>st.nodes.push(Object.assign({},n,{flash:0})));
  }

  /* ---------- 怪物生成：三类行为严格区分 ---------- */
  function spawnMobs(){
    E.enemies.clear();st.mobs.length=0;st.hostiles.length=0;
    CFG.SWAMP_MOBS.forEach(m=>{
      const e=E.spawnEnemy(m.type,m.x,m.depth);if(!e)return;
      const ai=e.cfg.ai;
      e.home={x:m.x,depth:m.depth};e.territory=m.territory||220;
      e.patrolT=U.rr(0,6);e.aggroT=0;e.returnT=0;e.spawn=0;
      /* 1.4 dev1.3：敌对单位未被发现前只在领地内巡逻 */
      e.alerted=false;
      e.sight=m.type==="boarKing"?560:(m.type==="mosquitoSwarm"?300:
        (e.cfg&&e.cfg.reach>200?460:360));
      e.hidden=(m.type==="mireLizard");
      e.called=false;e.horn=false;e.stole=false;e.healT=U.rr(2,7);
      e.temple=!!m.temple;
      if(ai==="neutral"){
        /* 中立：蓝血条、无领地、被攻击才反击 */
        e.hostile=false;e.aggro=0;e.barT=0;e.hateZone=280;
        st.mobs.push(e);
      }else if(ai==="halfNeutral"){
        /* 半中立：有领地环，入侵才仇恨，离开即解除回满 */
        e.hostile=false;e.halfNeutral=true;e.barT=0;
        st.mobs.push(e);
      }else{
        /* 敌对：被发现即不死不休 */
        e.hostile=true;e.aggro=1;e.barT=0;
        st.hostiles.push(e);
      }
    });
    /* 潮湿天气 → 吸血蚊群大量出现 */
    if(st.wet){
      for(let i=0;i<5;i++){
        const e=E.spawnEnemy("mosquitoSwarm",U.rr(600,4800),U.rr(-70,70));
        if(e){e.hostile=true;e.spawn=0;e.barT=0;e.wetSwarm=true;
          e.alerted=false;e.sight=300;e.home={x:e.x,depth:e.depth};
          st.hostiles.push(e);}
      }
    }
  }

  /* ---------- 敌对怪特殊行为 ---------- */
  function spawnReinforce(x,depth,type){
    const e=E.spawnEnemy(type,x+U.rr(-70,70),U.clamp(depth+U.rr(-20,20),-80,80));
    if(e){e.hostile=true;e.spawn=.4;e.barT=0;st.hostiles.push(e);}
    return e;
  }
  function stealMat(e){
    const mats=SV.data.inventory.mats,keys=Object.keys(mats).filter(k=>mats[k]>0);
    if(!keys.length)return;
    const k=keys[U.ri(0,keys.length-1)];
    mats[k]=Math.max(0,mats[k]-1);SV.mark();
    CR.ui.toast("😈 捣蛋鬼顺走了 1 个【"+((CFG.MATERIALS[k]||{}).name||k)+"】！");
    CR.audio.sfx("deny");
    E.spawnFloat(e.x,e.depth,92,"偷!","warn",C.gold,true);
  }
  function updateHostileBehaviors(dt){
    for(const e of st.hostiles){
      if(!e||!e.alive)continue;
      /* 1.4 dev1.3：未被发现的敌对单位不会呼唤同伴 / 吹号角 / 开枪 / 治疗；
         水下潜伏的泥沼蜥蜴仍可在玩家靠近时跃起并激活。 */
      if(!e.alerted){
        if(e.hidden&&Math.hypot(P.x-e.x,P.depth-e.depth)<170){
          e.alerted=true;e.hidden=false;e.vh=220;e.spawn=.2;
          CR.ui.toast("🐊 泥沼蜥蜴从水下跃起！");
          CR.audio.sfx("splash");E.burst(e.x,e.depth,26,C.cyan,12,150);
        }
        continue;
      }
      /* 暴躁小猪：受击呼唤同伴（只触发一次） */
      if(e.type==="angryPiglet"&&!e.called&&e.hp<e.maxHp){
        e.called=true;
        CR.ui.toast("🐗 暴躁小猪尖叫着呼唤同伴！");
        CR.audio.sfx("aggro");
        E.ringFx(e.x,e.depth,C.pink,110,.5);
        spawnReinforce(e.x,e.depth,"angryPiglet");
        spawnReinforce(e.x,e.depth,"angryPiglet");
      }
      /* 斥候：发现玩家吹号角召唤增援（只触发一次） */
      if(e.type==="scout"&&!e.horn&&Math.hypot(P.x-e.x,P.depth-e.depth)<330&&!CR.combat.isStealth()){
        e.horn=true;
        CR.ui.banner("📯 斥候吹响了号角 · 增援正在赶来");
        CR.audio.sfx("boss");
        spawnReinforce(e.x,e.depth,"spearThrower");
        spawnReinforce(e.x,e.depth,"angryPiglet");
      }
      /* 捣蛋鬼：被攻击后概率偷材料 */
      if(e.type==="trickster"&&!e.stole&&e.hp<e.maxHp&&U.rnd()<dt*.75){
        e.stole=true;stealMat(e);
      }
      /* 萨满：召唤毒雾并为周围食人族回血 */
      if(e.type==="shaman"){
        e.healT-=dt;
        if(e.healT<=0){
          e.healT=8;
          let healed=0;
          E.enemies.each(o=>{
            if(o.alive&&o.hostile&&o!==e&&Math.hypot(o.x-e.x,o.depth-e.depth)<260&&o.hp<o.maxHp){
              o.hp=Math.min(o.maxHp,o.hp+Math.round(o.maxHp*.18));healed++;
            }
          });
          E.ringFx(e.x,e.depth,C.green,200,.7);
          CR.ui.toast("☠ 部落萨满召来毒雾，为 "+healed+" 名同伴回复了生命");
          CR.audio.sfx("buff");
        }
      }
      /* 泥沼蜥蜴：潜伏水下，玩家靠近突然跃起 */
      if(e.hidden&&Math.hypot(P.x-e.x,P.depth-e.depth)<170){
        e.hidden=false;e.vh=220;e.spawn=.2;
        CR.ui.toast("🐊 泥沼蜥蜴从水下跃起！");
        CR.audio.sfx("splash");
        E.burst(e.x,e.depth,26,C.cyan,12,150);
      }
      /* 远程：投矛手 / 火枪手 / 萨满定期发射（fromPlayer=false） */
      if(e.cfg&&e.cfg.ranged!==undefined){}
      if(["spearThrower","musketeer","shaman"].indexOf(e.type)>=0){
        e.rangeCd=(e.rangeCd||U.rr(1,3))-dt;
        const dist=Math.hypot(P.x-e.x,P.depth-e.depth);
        if(e.rangeCd<=0&&dist<e.cfg.reach*1.6&&dist>70&&e.hostile&&e.alerted){
          e.rangeCd=e.type==="musketeer"?2.8:2.1;
          const a=Math.atan2(P.depth-e.depth,P.x-e.x);
          const s=E.spawnShot(e.type==="musketeer"?1:7,e.x,e.depth,30,
            Math.cos(a)*320,Math.sin(a)*150,0,Math.round(e.cfg.dmg*.7),2.4,
            e.type==="musketeer"?C.orange:C.green,false);
          if(s){s.fromPlayer=false;s.r=e.type==="musketeer"?9:12;
            s.from=e;s.element=e.cfg.element;s.magic=e.type==="shaman";}
          CR.audio.sfx(e.type==="musketeer"?"bow":"arrow");
        }
      }
    }
  }

  /* ---------- 中立 / 半中立：领地、仇恨、解除回满 ---------- */
  function updateMobs(dt){
    const px=P.x,pd=P.depth;
    for(const e of st.mobs){
      if(!e||!e.alive)continue;
      const dist=Math.hypot(px-e.x,pd-e.depth);
      if(e.halfNeutral){
        const T=e.territory;
        if(!e.hostile){
          if(dist<T&&!P.dead&&!CR.combat.isStealth()){
            e.hostile=true;e.aggro=1;e.aggroT=0;e.barT=2.2;
            WLD.markEngage();
            CR.ui.banner("⚠ "+e.cfg.label+" 注意到了你！");
            CR.ui.toast(CFG.AI_DOC.halfNeutral);
            CR.audio.sfx("aggro");
            E.ringFx(e.x,e.depth,C.hpAmber||C.orange,T,.6);
          }else{
            e.patrolT+=dt;
            const tx=e.home.x+Math.sin(e.patrolT*.55)*T*.42;
            const td=e.home.depth+Math.cos(e.patrolT*.42)*26;
            e.vx=U.clamp((tx-e.x)*1.6,-52,52);e.vd=U.clamp((td-e.depth)*1.4,-26,26);
            e.facing=e.vx>=0?1:-1;
            if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.25);
          }
        }else{
          if(dist>T*1.65)e.aggroT+=dt;else e.aggroT=0;
          if(e.aggroT>1.05){
            e.hostile=false;e.aggro=0;e.aggroT=0;e.returnT=1;e.hp=e.maxHp;e.barT=0;
            CR.ui.toast(e.cfg.label+" 已离开领地 · 解除仇恨并回满状态");
            CR.audio.sfx("calm");
          }
        }
      }else{
        /* 中立：没领地，只有被玩家打了才反击；玩家离开仇恨区域解除并回满 */
        if(e.hostile){
          if(dist>(e.hateZone||280))e.aggroT+=dt;else e.aggroT=0;
          if(e.aggroT>1.4){
            e.hostile=false;e.aggro=0;e.aggroT=0;e.hp=e.maxHp;e.barT=0;
            CR.ui.toast(e.cfg.label+" 不再追你 · 回到原地并回满状态");
            CR.audio.sfx("calm");
          }
        }else{
          e.patrolT+=dt;
          if(U.rnd()<dt*.12){e.vx=U.rr(-34,34);e.vd=U.rr(-18,18);}
          e.vx=U.lerp(e.vx,0,.03);e.vd=U.lerp(e.vd,0,.03);
          e.facing=e.vx>=0?1:-1;
          /* 未交战状态缓慢回满，与「离开仇恨区域回满」口径一致 */
          if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.10);
        }
      }
      if(e.returnT>0){
        e.returnT=Math.max(0,e.returnT-dt);
        e.vx=U.clamp((e.home.x-e.x)*1.9,-70,70);
        e.vd=U.clamp((e.home.depth-e.depth)*1.7,-32,32);
      }
    }
  }

  /* ---------- 地面 / 脚步声 ---------- */
  function groundAt(x){
    if(WLD.groundAt)return WLD.groundAt(x);
    return "water";
  }
  function stepSound(g,dt){
    if(!P.moving)return;
    st.stepDist+=Math.abs(P.vx||0)*dt;
    if(st.stepDist<64)return;st.stepDist=0;
    const k=g==="stone"?"stepStone":(g==="grass"?"stepGrass":(g==="sand"?"stepSand":"splash"));
    CR.audio.sfx(k);
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
    let hurt=false;
    if(node.kind==="thorn"&&!hasTool(node.tool)){
      hurt=true;   // 徒手可以采，但会受伤
    }else if(node.tool&&!hasTool(node.tool)){
      const names=(Array.isArray(node.tool)?node.tool:[node.tool])
        .map(id=>((CFG.EQUIPMENT[id]||{}).label||id)).join(" / ");
      return {ok:false,reason:"需要 "+names};
    }
    const speed=hasTool(["sickle","gloveHarvest"])?1.25:1;
    return {ok:true,hurt,speed,t:node.time/speed};
  }
  function toolInfo(node){
    if(!node.tool)return "徒手即可采集";
    const names=(Array.isArray(node.tool)?node.tool:[node.tool])
      .map(id=>((CFG.EQUIPMENT[id]||{}).label||id)).join(" / ");
    return node.kind==="thorn"?("徒手采集会受伤；推荐 "+names):("需要 "+names);
  }
  function beginGather(node){
    const ck=gatherCheck(node);
    if(!ck.ok){CR.ui.toast(ck.reason);CR.audio.sfx("deny");return ck;}
    if(ck.hurt){
      CR.combat.hurtPlayer(8,P.x+40,{fixed:true,element:"毒系"});
      CR.ui.toast("🌵 徒手拨开荆棘，被刺伤了（固伤 8）· 戴上【镰刀】就不会受伤");
    }
    st.gather={id:node.id,node,t:0,dur:ck.t,x:P.x,depth:P.depth};
    CR.audio.sfx(node.kind==="fish"?"splash":"gatherBegin");
    CR.ui.toast("开始采集 "+node.name+" · "+ck.t.toFixed(1)+"s");
    return {ok:true,dur:ck.t};
  }
  function updateGather(dt){
    const g=st.gather;if(!g)return;
    if(Math.abs(P.x-g.x)>90||Math.abs(P.depth-g.depth)>90){
      st.gather=null;CR.ui.toast("走开了，采集中断");return;
    }
    g.t+=dt;
    CR.ui.setGather&&CR.ui.setGather(U.clamp(g.t/g.dur,0,1),g.node.name);
    if(g.t<g.dur)return;
    const n=g.node,r=U.ri(n.min,n.max);
    const dropId=n.drops[U.ri(0,n.drops.length-1)];
    for(let i=0;i<r;i++){
      if(CFG.MATERIALS[dropId])SV.addMat(dropId,1);
      else if(CFG.ITEMS[dropId])SV.addItem(dropId,1);
    }
    /* 基础农作物 / 野菜：概率获得鸟蛋、毒蘑菇 */
    if(n.kind==="crop"&&U.rnd()<.32){
      const bonus=U.rnd()<.5?"egg":"poisonMushroom";
      SV.addMat(bonus,1);
      CR.ui.toast("还顺手捡到 "+(CFG.MATERIALS[bonus]||{}).name+" ×1");
    }
    if(!SV.useGather(n.id)){
      CR.ui.toast("今日次数已用完");CR.audio.sfx("deny");
      CR.ui.setGather&&CR.ui.setGather(0,"");st.gather=null;return;
    }
    SV.mark();SV.flush();
    CR.ui.toast("采集完成 · 获得 "+(CFG.MATERIALS[dropId]||CFG.ITEMS[dropId]||{}).name+" ×"+r+
      "　今日剩 "+SV.gatherLeft(n.id)+" 次");
    CR.audio.sfx("pickup");
    E.burst(P.x,P.depth,26,C.leaf1,10,110);
    CR.ui.setGather&&CR.ui.setGather(0,"");
    CR.ui.refreshPanels();
    st.gather=null;
  }

  /* ---------- 交易 / 限购 ---------- */
  function bought(){if(!SV.data.swampBought)SV.data.swampBought={};return SV.data.swampBought;}
  function periodKey(row){
    if(row.period==="once")return "once";
    if(row.period==="weekly"){
      /* 以北京时间周一为一周起点 */
      const d=new Date(beijingDate()+"T00:00:00Z");
      const dow=(d.getUTCDay()+6)%7;
      d.setUTCDate(d.getUTCDate()-dow);
      return "W"+d.toISOString().slice(0,10);
    }
    return beijingDate();
  }
  function leftOf(npc,row){
    const b=bought(),k=npc+"|"+row.id+"|"+periodKey(row);
    return Math.max(0,row.limit-(b[k]||0));
  }
  function buy(npc,id){
    const row=(CFG.SWAMP_GOODS[npc]||[]).find(r=>r.id===id);
    if(!row)return {ok:false,reason:"没有这件商品"};
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
    const nm=(CFG.MATERIALS[id]||CFG.ITEMS[id]||CFG.EQUIPMENT[id]||{}).name||id;
    CR.ui.toast("买下 "+nm+" ×1 · 剩余 "+leftOf(npc,row)+" 件");
    CR.ui.refreshPanels();
    return {ok:true,name:nm,left:leftOf(npc,row)};
  }
  function sell(id,n){
    n=n||1;const price=CFG.SWAMP_SELL[id];
    if(!price)return {ok:false,reason:"这位商人不收这件东西"};
    if((SV.data.inventory.mats[id]||0)<n)return {ok:false,reason:"数量不足"};
    SV.data.inventory.mats[id]-=n;SV.addGold(price*n);SV.mark();SV.flush();
    CR.audio.sfx("coin");
    CR.ui.toast("卖出 "+(CFG.MATERIALS[id]||{}).name+" ×"+n+" · +"+(price*n)+" 金币");
    CR.ui.refreshPanels();
    return {ok:true,gold:price*n};
  }

  /* ---------- 交互 ---------- */
  function nearest(){
    let best=null,bd=1e9;
    for(const key in CFG.SWAMP_NPCS){
      const n=CFG.SWAMP_NPCS[key];
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<130&&d<bd){bd=d;best={type:"npc",id:key,cfg:n,d};}
    }
    st.nodes.forEach(n=>{
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<100&&d<bd){bd=d;best={type:"node",id:n.id,cfg:n,d};}
    });
    return best;
  }
  function interact(){
    const n=nearest();
    if(!n){CR.ui.toast("附近没有可交互对象 · 靠近 NPC 或采集点");CR.audio.sfx("deny");return;}
    CR.audio.sfx("talk");
    if(n.type==="node"){beginGather(n.cfg);return;}
    if(n.id==="vera"){
      CR.ui.openDialogue({
        name:"沼泽药师 · 薇拉",title:"枯木林树屋",icon:"🧪",color:C.leaf1,
        reward:"收购芥菜 / 荆棘草 · 售解毒剂与回血药剂 · 可打开【任务档案】",
        lines:["这雾一浓，药篓就见底了……","芥菜、荆棘草我都收，解毒剂与回血药剂也可以卖你。",
          "对了，我的【任务档案】里还压着一桩委托，你要看看吗？"],
        onDone:()=>CR.ui.openQuest()
      });
      return;
    }
    if(n.id==="hank"){CR.ui.openSwampShop("hank");return;}
    if(n.id==="jack"){CR.ui.openSwampShop("jack");return;}
  }

  /* ---------- 生命周期 ---------- */
  function init(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    st.wet=U.rnd()<.62;st.weather=baseWeather();
    st.zone=0;st.clockT=0;st.dayT=0;st.ambT=0;st.dangerVoiced=false;st.lowLvWarned=false;
    st.bossIntro=false;st.weatherT=0;st.lightningT=U.rr(4,9);st.lightning=0;
    setWeather(SV.data.settings.weatherMode||"auto",true);
    SV.dailyReset();
    buildScenery();spawnMobs();
    st.near=null;st.gather=null;st.stepDist=0;st.stepT=0;
    st.parts&&st.parts.clear&&st.parts.clear();
    WLD.bossRef=null;
    SV.data.progress.swampVisits=(SV.data.progress.swampVisits||0)+1;
    SV.mark();SV.flush();
    applyClock();syncBgm();
    CR.ui.banner("🪷 蛮荒 沼 泽 · 迷雾芦苇荡");
    CR.ui.toast("⚠ 危险区域 · 非中立敌对单位密集 · 推荐 Lv.40 以上（"+c.src+" "+
      c.hour+":00 · "+st.weather+"）");
    const lv=SV.levelOf?SV.levelOf(P.cls):1;
    if(lv<40){CR.ui.toast("当前 Lv."+lv+" 低于推荐 Lv.40 · 这里的怪物明显更强，小心");st.lowLvWarned=true;}
    CR.quest&&CR.quest.push("visit",{map:"swamp"});
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }
  /* 1.4 dev1.2：进入沉没古神庙时的 BOSS 登场演出（此前玩家看不到 BOSS） */
  function introBoss(){
    const b=st.hostiles.find(e=>e&&e.alive&&e.type==="boarKing");
    if(!b||st.bossIntro)return;
    st.bossIntro=true;
    b.barT=9999;WLD.bossRef=b;
    CR.ui.banner("🐗 野 蛮 猪 王 · 沉没古神庙的守护者");
    CR.ui.toast("祭坛苏醒 · 野蛮猪王现身（Lv.40+ 推荐）· 顶部血条已开启");
    CR.audio.sfx("boss");
    WLD.addShake(8);WLD.addWhite(.22);
    E.ringFx(b.x,b.depth,C.gold,240,.9);
  }
  function update(dt){
    st.dayT+=dt;
    if(st.dayT>20){st.dayT=0;applyClock();}
    st.sway+=dt;st.fogT+=dt;st.ambT+=dt;
    /* 天气自动轮换（每 ~34s）+ 雷光 */
    st.weatherT+=dt;
    if(st.weatherMode==="auto"&&st.weatherT>34){st.weatherT=0;setWeather("auto",false);}
    if(st.wcfg&&st.wcfg.lightning){
      st.lightningT-=dt;
      if(st.lightningT<=0){st.lightningT=U.rr(4.5,10);st.lightning=1;CR.audio.sfx("thunder");}
    }
    st.lightning=Math.max(0,st.lightning-dt*3.2);
    st.leaves.forEach(o=>{o.y+=o.v*dt;o.x+=Math.sin(CR.game.time*.8+o.sw)*13*dt;
      if(o.y>640){o.y=-20;o.x=U.rr(0,CFG.SWAMP_W);}});
    syncBgm();
    /* 虫鸣蛙声：每 3.4 秒一层环境音 */
    if(st.ambT>3.4){st.ambT=0;CR.audio.sfx(st.isNight?"swampNightAmb":"swampAmb");}
    stepSound(groundAt(P.x),dt);
    updateMobs(dt);updateHostileBehaviors(dt);updateGather(dt);
    st.walkers.forEach(w=>{
      w.t+=dt;
      w.x=w.x0+Math.sin(w.t*w.speed/90)*w.range*.5;
      w.depth=w.d0+Math.sin(w.t*.8)*10;
    });
    st.nodes.forEach(n=>{n.flash=Math.max(0,(n.flash||0)-dt*1.6);});
    st.near=nearest();
    /* 分区过渡 + 危险区提示 */
    const zi=CFG.swampZoneAt(P.x);
    if(zi!==st.zone){
      st.zone=zi;const z=CFG.SWAMP_ZONES[zi];
      CR.ui.banner("进入 · "+z.name+"（"+z.danger+"危险）");
      CR.ui.toast(z.desc);
      CR.audio.sfx("wave");
      syncBgm();
      if(zi===3&&!st.dangerVoiced){
        st.dangerVoiced=true;
        introBoss();
        CR.ui.toast("沉没古神庙只有退潮或特定时机才能进入 · 退潮机制将在后续 dev 开启");
      }
    }
    const key=CFG.KEY_LABELS[SV.data.settings.bindings.interact]||"F";
    CR.ui.setInteractHint(st.near?("按 "+key+" "+
      (st.near.type==="node"?("采集 "+st.near.cfg.name+"（今日剩 "+SV.gatherLeft(st.near.id)+" 次 · "+toolInfo(st.near.cfg)+"）"):
       (st.near.id==="vera"?"与 薇拉 对话 / 打开任务档案":
        (st.near.id==="hank"?"与 汉克 交易":"与 独眼杰克 交易（限量）")))):"");
  }
  function post(){
    const z=CFG.SWAMP_ZONES[st.zone]||CFG.SWAMP_ZONES[0];
    const tint=st.isNight?[.80,.90,1.10]:(st.phase==="dusk"?[1.06,.94,.86]:[.92,1.02,.94]);
    const wt=(st.wcfg&&st.wcfg.tint)||[1,1,1],wa=(st.wcfg?st.wcfg.ambient:1);
    return {tint:[tint[0]*z.tint[0]*wt[0],tint[1]*z.tint[1]*wt[1],tint[2]*z.tint[2]*wt[2]],
      ambient:z.ambient*(st.isNight?.72:1)*wa,flash:0,white:WLD.white+st.lightning*.42,
      vigBoost:.12+z.fog*.20+(st.wcfg&&st.wcfg.rain?0.05:0),time:CR.game.time,
      fog:z.fog+(st.wcfg&&st.wcfg.rain?0.12:0)+(st.wcfg&&st.wcfg.snow?0.06:0)};
  }

  CR.swamp={st,init,update,post,interact,nearest,beginGather,gatherCheck,toolInfo,
    buy,sell,leftOf,applyClock,groundAt,setWeather,zoneScene,introBoss,
    get hour(){return st.hour;},get isNight(){return st.isNight;},
    get phase(){return st.phase;},get clockSrc(){return st.clockSrc;},
    get zone(){return st.zone;},get wet(){return st.wet;},
    get weather(){return st.weather;},get nodes(){return st.nodes;},
    get mobs(){return st.mobs;},get hostiles(){return st.hostiles;},
    get walkers(){return st.walkers;},get reeds(){return st.reeds;},
    get islands(){return st.islands;},get deadwoods(){return st.deadwoods;},
    get towers(){return st.towers;},get glowbugs(){return st.glowbugs;},
    get fireflies(){return st.fireflies;},get flowers(){return st.flowers;},
    get birds(){return st.birds;},get mist(){return st.mist;},
    get hut(){return st.hut;},get temple(){return st.temple;},
    get weatherMode(){return st.weatherMode;},get wcfg(){return st.wcfg;},
    get rain(){return st.rain;},get snow(){return st.snow;},
    get leaves(){return st.leaves;},get lightning(){return st.lightning;},
    get bossIntro(){return st.bossIntro;},
    get moss(){return st.moss;},get vines(){return st.vines;},get lilies(){return st.lilies;},
    get mushrooms(){return st.mushrooms;},get seaweed(){return st.seaweed;},
    get bubbles(){return st.bubbles;},get roots(){return st.roots;},
    get totems(){return st.totems;},get bones(){return st.bones;},
    get sway(){return st.sway;},get gather(){return st.gather;}};
})(window.CR=window.CR||{});
