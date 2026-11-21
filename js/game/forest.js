/* forest.js — 魔法丛林五段林境：孵化室 / 德鲁伊小摊 / 薇薇安支线 / 果树菇丛 / 中立动物 · v1.3.1 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,SV=CR.save,E=CR.ent,P=E.player,WLD=CR.world;

  const st={
    hour:12,phase:"day",isNight:false,clockSrc:"北京时间",
    near:null,gather:null,
    trees:[],vines:[],mushrooms:[],ferns:[],stones:[],lamps:[],fireflies:[],
    walkers:[],mobs:[],animals:[],nodes:[],hut:null,
    fruit:[],deadwood:[],ancientVines:[],flowers:[],birds:[],leaves:[],
    zone:0,hatchT:0,
    parts:U.Pool(120,()=>({x:0,y:0,vx:0,vy:0,life:0,max:0,size:0,kind:0,alpha:1,alive:false})),
    stepDist:0,stepT:0,lastGround:"",dayT:0,sway:0
  };

  /* ---------- 北京时间（与集市 / 港口一致，可选联网校时） ---------- */
  let netHour=null;
  function beijingClock(){
    const now=new Date(),utc=now.getTime()+now.getTimezoneOffset()*60000;
    const bj=new Date(utc+8*3600000);
    let hour=bj.getHours(),src="北京时间";
    if(SV.data.settings.clockSource==="local"){hour=now.getHours();src="本机时间";}
    else if(netHour!==null){hour=netHour;src="联网校时";}
    return {hour,src};
  }
  function phaseOf(h){return (h>=18||h<6)?"night":((h>=16&&h<18)?"dusk":"day");}
  function tryNetworkTime(){
    if(!SV.data.settings.networkClock||typeof fetch!=="function")return;
    try{fetch("https://worldtimeapi.org/api/timezone/Asia/Shanghai",{cache:"no-store"})
      .then(r=>r.json()).then(j=>{if(j&&j.datetime){netHour=new Date(j.datetime).getHours();applyClock();}})
      .catch(()=>{});}catch(e){}
  }
  function applyClock(){
    const c=beijingClock(),was=st.isNight;
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    if(was!==st.isNight&&WLD.mode==="forest")
      CR.audio.setScene(st.isNight?"forestNight":"forest",true);
    if(CR.ui&&CR.ui.refreshWeather)CR.ui.refreshWeather();
    SV.dailyReset();
  }

  /* ---------- 场景生成（确定性） ---------- */
  function buildScenery(){
    U.srand(20261116);
    const W=CFG.FOREST_W||4800;
    st.trees.length=0;st.vines.length=0;st.mushrooms.length=0;st.ferns.length=0;
    st.stones.length=0;st.lamps.length=0;st.fireflies.length=0;
    /* 巨木：前中后三层，高矮胖瘦 */
    for(let x=-60;x<W+140;x+=U.rr(140,260)){
      st.trees.push({x,depth:U.rr(-110,-58),h:U.rr(150,290),w:U.rr(14,30),
        lean:U.rr(-.10,.10),tier:0,phase:U.rr(0,6),type:U.ri(0,2)});
    }
    for(let x=60;x<W;x+=U.rr(230,380)){
      st.trees.push({x,depth:U.rr(58,96),h:U.rr(110,185),w:U.rr(9,17),
        lean:U.rr(-.14,.14),tier:1,phase:U.rr(0,6),type:U.ri(0,2)});
    }
    for(let x=80;x<W;x+=U.rr(300,520)){
      st.vines.push({x,depth:U.rr(-92,-66),len:U.rr(56,128),phase:U.rr(0,6)});
    }
    for(let x=40;x<W;x+=U.rr(70,130)){
      const n=U.ri(2,4);
      for(let k=0;k<n;k++)st.mushrooms.push({x:x+U.rr(-18,18),depth:U.rr(52,94),
        r:U.rr(3,8),glow:U.rnd()<.34,hue:U.ri(0,2)});
    }
    for(let x=30;x<W;x+=U.rr(42,88)){
      st.ferns.push({x,depth:U.rr(48,98),h:U.rr(14,30),phase:U.rr(0,6)});
    }
    for(let x=120;x<W;x+=U.rr(190,320)){
      st.stones.push({x,depth:U.rr(-60,70),w:U.rr(20,44),h:U.rr(10,20)});
    }
    for(let x=260;x<W;x+=360){
      st.lamps.push({x,depth:-84,h:U.rr(64,86),phase:U.rr(0,6)});
    }
    for(let i=0;i<70;i++)st.fireflies.push({x:U.rr(0,W),y:U.rr(0,300),
      phase:U.rr(0,6),speed:U.rr(.35,1.1),size:U.rr(1.4,3.4)});
    st.hut={x:1180,depth:-72,w:150,h:112};
    st.walkers.length=0;
    CFG.FOREST_WALKERS.forEach(w=>st.walkers.push(Object.assign({},w,{
      x:w.x,x0:w.x,depth:w.d0,t:U.rr(0,6)})));
    /* 1.3.1 原始森林 (1200~2600)：果树、枯木、古藤、菇丛、野花、飞鸟、落叶 */
    st.fruit.length=0;st.deadwood.length=0;st.ancientVines.length=0;
    st.flowers.length=0;st.birds.length=0;st.leaves.length=0;
    CFG.FOREST_NODES.forEach(n=>{
      if(n.kind==="fruit")st.fruit.push({x:n.x,depth:n.depth,id:n.id,
        kind:n.id==="pearTree"?"pear":"grape",phase:U.rr(0,6),sway:0});
      if(n.kind==="mush")for(let k=0;k<5;k++)
        st.mushrooms.push({x:n.x+U.rr(-26,26),depth:n.depth+U.rr(-14,14),
          r:U.rr(4,9),glow:U.rnd()<.5,hue:U.ri(0,2),cluster:true});
    });
    for(let x=1260;x<2600;x+=U.rr(120,220))
      st.deadwood.push({x,depth:U.rr(-70,80),h:U.rr(46,96),lean:U.rr(-.3,.3),phase:U.rr(0,6)});
    for(let x=1300;x<2600;x+=U.rr(180,300))
      st.ancientVines.push({x,depth:U.rr(-96,-58),len:U.rr(70,150),phase:U.rr(0,6)});
    for(let x=1240;x<2650;x+=U.rr(34,66))
      st.flowers.push({x,depth:U.rr(46,96),h:U.rr(5,11),hue:U.ri(0,3),phase:U.rr(0,6)});
    for(let i=0;i<9;i++)st.birds.push({x:U.rr(1200,2700),y:U.rr(30,190),
      v:U.rr(28,64),phase:U.rr(0,6),size:U.rr(5,9)});
    for(let i=0;i<46;i++)st.leaves.push({x:U.rr(1100,2800),y:U.rr(0,260),
      phase:U.rr(0,6),v:U.rr(8,22),size:U.rr(2,5),hue:U.ri(0,2)});
    /* 原始森林与魔林森处补一层巨木，形成密度过渡 */
    for(let x=1240;x<2600;x+=U.rr(120,200))
      st.trees.push({x,depth:U.rr(-104,-62),h:U.rr(190,320),w:U.rr(16,32),
        lean:U.rr(-.12,.12),tier:0,phase:U.rr(0,6),type:U.ri(0,2)});
    for(let x=3440;x<4200;x+=U.rr(130,210))
      st.trees.push({x,depth:U.rr(-100,-58),h:U.rr(210,340),w:U.rr(18,34),
        lean:U.rr(-.16,.16),tier:0,phase:U.rr(0,6),type:2});
    st.nodes=CFG.FOREST_NODES.map(n=>Object.assign({},n,{pulse:U.rr(0,6),flash:0}));
  }
  function spawnMobs(){
    E.enemies.clear();st.mobs.length=0;st.animals.length=0;
    CFG.FOREST_MOBS.forEach(m=>{
      const e=E.spawnEnemy(m.type,m.x,m.depth);if(!e)return;
      e.hostile=false;e.spawn=0;e.halfNeutral=true;
      e.home={x:m.x,depth:m.depth};e.territory=m.territory;
      e.patrolT=U.rr(0,6);e.aggroT=0;e.returnT=0;
      st.mobs.push(e);
    });
    /* 中立动物：蓝血条，被攻击才反击，击败掉兽肉 */
    (CFG.FOREST_ANIMALS||[]).forEach(m=>{
      const e=E.spawnEnemy(m.type,m.x,m.depth);if(!e)return;
      e.hostile=false;e.aggro=0;e.spawn=0;e.barT=0;
      e.home={x:m.x,depth:m.depth};e.patrolT=U.rr(0,6);
      st.animals.push(e);
    });
  }

  /* ---------- 半中立野怪：领地巡逻 / 进入仇恨 / 走远脱战 ---------- */
  function updateMobs(dt){
    const px=P.x,pd=P.depth;
    for(let i=0;i<st.mobs.length;i++){
      const e=st.mobs[i];if(!e||!e.alive)continue;
      const dist=Math.hypot(px-e.x,pd-e.depth),T=e.territory;
      if(!e.hostile){
        const stealth=CR.combat&&CR.combat.isStealth?CR.combat.isStealth():false;
        if(dist<T&&!P.dead&&!stealth){
          e.hostile=true;e.aggro=1;e.aggroT=0;e.barT=2.2;
          if(WLD.markEngage)WLD.markEngage();
          CR.ui.banner("⚠ "+e.cfg.label+" 注意到了你！");
          CR.ui.toast(e.cfg.label+"（"+(e.cfg.element||"普通系")+"）进入仇恨 · 离开领地可脱战");
          CR.audio.sfx("aggro");
          E.ringFx(e.x,e.depth,C.hpAmber,T,.6);
          E.spawnFloat(e.x,e.depth,90,"!","warn",C.hpAmber,true);
        }else{
          e.patrolT+=dt;
          const tx=e.home.x+Math.sin(e.patrolT*.55)*T*.42;
          const td=e.home.depth+Math.cos(e.patrolT*.42)*26;
          e.vx=U.clamp((tx-e.x)*1.6,-52,52);
          e.vd=U.clamp((td-e.depth)*1.4,-26,26);
          e.facing=e.vx>=0?1:-1;
          if(e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*dt*.25);
        }
      }else{
        const lim=T*1.45;
        if(e.x<e.home.x-lim){e.x=e.home.x-lim;e.vx=Math.max(0,e.vx);}
        if(e.x>e.home.x+lim){e.x=e.home.x+lim;e.vx=Math.min(0,e.vx);}
        if(dist>T*1.65)e.aggroT+=dt;else e.aggroT=0;
        if(e.aggroT>1.05){
          e.hostile=false;e.aggro=0;e.aggroT=0;e.returnT=1;
          e.hp=e.maxHp;e.barT=0;
          CR.ui.toast(e.cfg.label+" 已脱离仇恨 · 回到领地");
          CR.audio.sfx("calm");
          E.burst(e.x,e.depth,20,C.hpBlue,8,90);
        }
      }
      if(e.returnT>0){
        e.returnT=Math.max(0,e.returnT-dt);
        e.vx=U.clamp((e.home.x-e.x)*1.9,-70,70);
        e.vd=U.clamp((e.home.depth-e.depth)*1.7,-32,32);
      }
      /* 削防等级自然回落（每 10 秒向 0 靠近 1 级） */
      if(e.defLv){
        e.defLvT=(e.defLvT||10)-dt;
        if(e.defLvT<=0){
          e.defLv+=e.defLv>0?-1:1;e.defLvT=10;
          if(!e.defLv)e.defLvT=0;
        }
      }
    }
  }

  /* ---------- 采集：伐木（需伐木斧 / 双人锯） ---------- */
  function toolInfo(){
    const cls=P.cls,cs=CR.equip&&CR.equip.combatState?CR.equip.combatState(cls):null;
    const two=CR.equip?CR.equip.slots(cls).two:null;
    return {tool:cs?cs.tool:null,toolId:two,hasAxe:cs?cs.tool==="lumber":false,
      speed:cs?cs.gatherSpeed:1,shatter:cs?cs.shatterChance:0,
      harvest:cs?cs.harvestChance:0,extra:cs?cs.extraGather:0,
      warriorAxe:!!(cs&&cs.tool==="lumber"&&cls===0)};
  }
  function gatherCheck(node){
    if(SV.gatherLeft(node.id)<=0)
      return {ok:false,reason:"今日采集次数已用完（"+node.daily+" 次 / 日 · 北京时间 0 点重置）"};
    const t=toolInfo();
    if(node.kind==="lumber"&&!t.hasAxe)
      return {ok:false,reason:"需要【伐木斧】或【双人锯】才能伐木 · 阿福摊位 / 林间货郎有售"};
    /* 1.3.1 果树 / 菇丛徒手可采，采集者手套等专业工具提效 */
    if(node.kind==="fruit"||node.kind==="mush")
      return {ok:true,t,barehand:true};
    return {ok:true,t};
  }
  function beginGather(node){
    if(st.gather)return {ok:false,reason:"正在采集中"};
    const ck=gatherCheck(node);
    if(!ck.ok){CR.ui.toast(ck.reason);CR.audio.sfx("deny");return ck;}
    const t=ck.t;
    let dur=node.time/(t.speed||1);
    if(t.warriorAxe)dur*=.90;
    if(t.shatter&&Math.random()<t.shatter){dur=.01;CR.ui.toast("击碎！本次伐木瞬间完成");}
    st.gather={id:node.id,node,t:0,dur,x:P.x,depth:P.depth};
    CR.audio.sfx("gatherBegin");
    CR.ui.toast("开始伐木 "+node.name+" · "+dur.toFixed(1)+"s");
    return {ok:true,dur};
  }
  function finishGather(){
    const g=st.gather;if(!g)return;
    const n=g.node,t=toolInfo();
    if(!SV.useGather(n.id)){st.gather=null;CR.ui.setGather(0,"");return;}
    let amount=U.ri(n.min,n.max);
    if(t.harvest&&Math.random()<t.harvest){amount+=1;CR.ui.toast("丰收！额外收获 1 份木材");}
    amount+=t.extra||0;
    const got={};
    for(let i=0;i<amount;i++){
      const id=U.pick(n.drops);SV.addMat(id,1);got[id]=(got[id]||0)+1;
    }
    const left=SV.gatherLeft(n.id);
    const txt=Object.keys(got).map(k=>CFG.MATERIALS[k].name+"×"+got[k]).join(" · ");
    const verb=n.kind==="lumber"?"伐木":(n.kind==="fruit"?"采摘":"采集");
    CR.ui.toast(verb+"完成："+txt+"　·　今日剩余 "+left+" 次");
    CR.ui.banner("✦ "+n.name+" "+verb+"完成");
    CR.audio.sfx(n.kind==="lumber"?"woodChop":"gather");
    E.burst(P.x,P.depth,26,C.wood,14,140);
    E.ringFx(P.x,P.depth,C.leaf1,70,.5);
    Object.keys(got).forEach((k,i)=>
      E.spawnFloat(P.x+i*24-18,P.depth,74,got[k],"mat",CFG.MATERIALS[k].color,false));
    const nd=st.nodes.find(x=>x.id===n.id);if(nd)nd.flash=1;
    SV.flush();CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
    st.gather=null;CR.ui.setGather(0,"");
  }
  function updateGather(dt){
    if(!st.gather)return;
    P.x=U.lerp(P.x,st.gather.x,.35);P.depth=U.lerp(P.depth,st.gather.depth,.35);
    P.vx=P.vd=0;P.moving=false;
    st.gather.t+=dt;
    const k=U.clamp(st.gather.t/st.gather.dur,0,1);
    CR.ui.setGather(k,st.gather.node.icon+" "+st.gather.node.name+" · "+
      Math.ceil(st.gather.dur-st.gather.t)+"s");
    if(k>=1)finishGather();
  }

  /* ---------- 脚步声：草丛 / 沙土 / 石板 ---------- */
  function stepSound(g,dt){
    st.stepT+=dt;
    if(!P.moving){st.stepDist=0;return;}
    st.stepDist+=Math.abs(P.vx||0)*dt;
    if(st.stepDist<64||st.stepT<.20)return;
    st.stepDist=0;st.stepT=0;
    if(g==="grass"){CR.audio.sfx("stepGrass");
      if(U.rnd()<.55){CR.audio.sfx("rustle");
        for(let i=0;i<6;i++)E.spawnPart(P.x+U.rr(-18,18),P.depth,8,
          U.rnd()<.5?C.leaf1:C.sakura,0,U.rr(2,5),.5,{vx:U.rr(-.4,.4),vh:U.rr(30,70),grav:120});
      }}
    else if(g==="sand")CR.audio.sfx("stepSand");
    else CR.audio.sfx("stepStone");
    st.lastGround=g;
  }

  /* ---------- 交互对象 ---------- */
  function nearest(){
    let best=null,bd=1e9;
    for(const key in CFG.FOREST_NPCS){
      const n=CFG.FOREST_NPCS[key],d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<135&&d<bd){bd=d;best={type:"npc",id:key,cfg:n,d};}
    }
    st.nodes.forEach(n=>{
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<104&&d<bd){bd=d;best={type:"node",id:n.id,cfg:n,d};}
    });
    return best;
  }
  /* 孵化成功时的全场演出（由孵化室面板领取时调用） */
  function hatchFx(){
    CR.audio.sfx("hatch");CR.audio.sfx("unlock");CR.audio.sfx("star");
    E.burst(P.x,P.depth,60,C.sakura,34,240,{grav:-40});
    E.ringFx(P.x,P.depth,C.sakura,180,.9);
    CR.world.addWhite(.32);CR.world.addShake(7);
    for(let i=0;i<18;i++)
      E.spawnPart(P.x+U.rr(-50,50),P.depth,U.rr(40,180),C.sakura,0,U.rr(3,7),1.1,
        {vx:U.rr(-.5,.5),vh:U.rr(-20,30),grav:14});
    CR.ui.banner("✿ 夜樱 加入了队伍！");
    CR.ui.toast("夜樱（✦ 法师 · 幽系）已入队，初始 Lv.10 · 按 C 查看技能表");
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
    CR.ui.buildTeamHud();CR.ui.buildSkills();
    if(CR.ui.buildCards)CR.ui.buildCards();
    SV.flush();
  }
  /* 兼容旧调用：直接孵化（不再由对话秒孵，正常流程走孵化室） */
  function hatch(){
    const r=SV.collectHatch?null:SV.hatchSakura();
    if(!r||!r.ok){CR.ui.toast("请与德鲁伊对话，打开【孵化室】放入夜樱蛋");
      CR.audio.sfx("deny");return {ok:false,reason:"需通过孵化室孵化"};}
    hatchFx();return r;
  }
  function interact(){
    const n=nearest();
    if(!n){CR.ui.toast("附近没有可交互对象 · 靠近德鲁伊、薇薇安、货郎或采集点");
      CR.audio.sfx("deny");return;}
    CR.audio.sfx("talk");
    if(n.type==="node"){beginGather(n.cfg);return;}
    if(n.id==="woodTrader"){CR.ui.openTrade("forest");return;}
    if(n.id==="druid"){
      /* 1.3.1：对话后打开【孵化室】面板（含德鲁伊的小摊页） */
      const have=SV.data.inventory.items.sakuraEgg||0;
      CR.ui.openDialogue({name:"德鲁伊 · 木隐",title:"孵化室与林间小摊",icon:"🌳",color:C.leaf2,
        reward:have>0?("持有【夜樱蛋】×"+have+" · 放入蛋巢后需 300 时间孵化"):
          (SV.data.progress.sakuraHatched?"夜樱已在队伍中 · 小摊仍可交易":"还没有夜樱蛋 · 星火港灯塔下打赢试炼形态夜樱"),
        lines:["树洞里铺了三个蛋巢，暖得很。",
          "蛋要慢慢孵，急不得——放进去，等上 300 时间再来取。",
          "顺带一提，我那小摊上有性格卡、学习力果和几样稀罕药水，每日每周都限量。"],
        onDone:()=>{if(CR.ui.openHatchery)CR.ui.openHatchery();}});
      return;
    }
    if(n.id==="vivian"){
      const q=CFG.FOREST_QUEST,a=SV.questAvailable?SV.questAvailable():{ok:false,reason:""};
      const need=Object.keys(q.need).map(k=>CFG.MATERIALS[k].name+"×"+q.need[k]).join(" + ");
      CR.ui.openDialogue({name:"薇薇安",title:"【支线】"+q.name,icon:"🧚",color:C.sakura,
        reward:SV.data.questDone?"委托已完成 · 谢谢你的梨和菌子":
          (a.ok?"材料齐了！交给我吧":"需要 "+need+" · 果树与菇丛都在【原始森林】"),
        lines:q.lines,
        onDone:()=>{
          if(SV.data.questDone)return;
          const r=SV.finishQuest?SV.finishQuest():{ok:false,reason:""};
          if(!r.ok){CR.ui.toast(r.reason);CR.audio.sfx("deny");return;}
          CR.audio.sfx("bounty");CR.audio.sfx("coin");
          E.burst(P.x,P.depth,34,C.sakura,20,180);
          CR.ui.banner("✦ 支线完成 · "+q.name);
          CR.ui.toast("获得 "+r.gold+" 金币与小型学习力果实");
          CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
        }});
    }
  }

  /* ---------- 货郎：买工具 / 装备 / 养成道具，也可卖材料 ---------- */
  function sell(id,n){
    const r=SV.sellMat(id,n||1);
    if(!r.ok){CR.ui.toast(r.reason);CR.audio.sfx("deny");return r;}
    CR.audio.sfx("coin");
    CR.ui.toast("出售 "+CFG.MATERIALS[id].name+" ×"+r.n+" → "+r.gold+" 金币");
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();return r;
  }
  function buy(key){
    let k="item",id=key;
    if(typeof key==="string"&&key.indexOf(":")>0){k=key.slice(0,key.indexOf(":") );id=key.slice(key.indexOf(":")+1);}
    const row=CFG.FOREST_GOODS.find(x=>x.id===id&&(x.k||"item")===k)||CFG.FOREST_GOODS.find(x=>x.id===id);
    if(!row){CR.audio.sfx("deny");return {ok:false};}
    k=row.k||"item";
    const it=k==="equip"?CFG.EQUIPMENT[id]:CFG.ITEMS[id];
    if(!it)return {ok:false};
    const price=row.price!==undefined?row.price:(it.price||100);
    if(!SV.spendGold(price)){CR.audio.sfx("deny");CR.ui.toast("金币不够啦");return {ok:false};}
    if(k==="equip")SV.addEquip(id,1);else SV.addItem(id,1);
    SV.flush();CR.audio.sfx("buy");
    CR.ui.toast("买下 "+(it.label||it.name)+" ×1"+(k==="equip"?" · 到装备栏穿戴":""));
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();return {ok:true};
  }

  /* ---------- 1.3.1 孵化室 / 德鲁伊的小摊（UI 调用入口） ---------- */
  function startHatch(i){
    const r=SV.startHatch(i);
    if(!r.ok){CR.ui.toast(r.reason);CR.audio.sfx("deny");return r;}
    CR.audio.sfx("gatherBegin");
    CR.ui.toast("夜樱蛋已放入 "+(i+1)+" 号蛋巢 · 需要 300 时间孵化");
    E.ringFx(P.x,P.depth,C.sakura,90,.5);
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();return r;
  }
  function collectHatch(i){
    const r=SV.collectHatch(i);
    if(!r.ok){CR.ui.toast(r.reason);CR.audio.sfx("deny");return r;}
    if(r.newChar)hatchFx();
    else{CR.audio.sfx("coin");CR.ui.banner("🥚 蛋已孵化 · 转化为 "+r.gold+" 金币与辉晶");
      CR.ui.toast("夜樱已经在队伍里了，额外的蛋换成金币与材料");}
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();return r;
  }
  function druidBuy(id){
    const r=SV.druidBuy(id);
    if(!r.ok){CR.ui.toast(r.reason);CR.audio.sfx("deny");return r;}
    CR.audio.sfx("buy");
    CR.ui.toast("买下 "+r.name+" ×1 · 本次限购剩余 "+r.left+" 件");
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();return r;
  }

  /* ---------- 生命周期 ---------- */
  function init(){
    const c=beijingClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";st.clockSrc=c.src;
    SV.dailyReset();
    buildScenery();spawnMobs();
    st.near=null;st.gather=null;st.stepDist=0;st.stepT=0;st.zone=0;st.hatchT=0;
    st.parts.clear();WLD.bossRef=null;
    SV.data.progress.forestVisits=(SV.data.progress.forestVisits||0)+1;SV.mark();SV.flush();
    CR.audio.setScene(st.isNight?"forestNight":"forest",true);
    CR.ui.toast("欢迎来到【魔法丛林 · 森林入口】 · "+(st.isNight?"萤火与幽光":"林间白昼")+
      "（"+c.src+" "+c.hour+":00）· 五段林境，按 G 查看区域情报");
    if(CR.ui.refreshWeather)CR.ui.refreshWeather();
  }
  function update(dt){
    st.dayT+=dt;
    if(st.dayT>30){st.dayT=0;applyClock();}
    /* 孵化室：低频刷新倒计时，面板打开时由 UI 自行读取 hatchStatus */
    st.hatchT+=dt;
    if(st.hatchT>1){st.hatchT=0;
      if(CR.ui&&CR.ui.refreshHatchery)CR.ui.refreshHatchery();}
    /* 五段子区域：自然过渡，进入时提示 */
    const zi=CFG.forestZoneAt?CFG.forestZoneAt(P.x):0;
    if(zi!==st.zone){st.zone=zi;
      if(CFG.FOREST_ZONES)CR.ui.banner("进入 · "+CFG.FOREST_ZONES[zi].name);}
    st.sway+=dt;
    stepSound(WLD.groundAt(P.x),dt);
    updateMobs(dt);
    updateGather(dt);
    st.walkers.forEach(w=>{
      w.t+=dt;
      w.x=w.x0+Math.sin(w.t*w.speed/90)*w.range*.5;
      w.depth=w.d0+Math.sin(w.t*.8)*10;
    });
    st.nodes.forEach(n=>{n.flash=Math.max(0,(n.flash||0)-dt*1.6);});
    st.near=nearest();
    const key=CFG.KEY_LABELS[SV.data.settings.bindings.interact]||"F";
    CR.ui.setInteractHint(st.near?("按 "+key+" "+
      (st.near.type==="node"?((st.near.cfg.kind==="lumber"?"伐木 ":
        (st.near.cfg.kind==="fruit"?"采摘 ":"采集 "))+st.near.cfg.name+
        "（今日剩 "+SV.gatherLeft(st.near.id)+" 次）"):
       (st.near.id==="druid"?"打开 孵化室 / 德鲁伊的小摊":
        (st.near.id==="vivian"?"与 薇薇安 对话（支线）":"与 "+st.near.cfg.name+" 交易")))):"");
  }
  function post(){
    const day=st.phase==="day"?1:(st.phase==="dusk"?.84:.58);
    const z=(CFG.FOREST_ZONES&&CFG.FOREST_ZONES[st.zone])?CFG.FOREST_ZONES[st.zone]:null;
    let tint=st.isNight?[.84,.92,1.18]:(st.phase==="dusk"?[1.08,.94,.86]:[.96,1.04,.96]);
    if(z&&z.tint)tint=[tint[0]*z.tint[0],tint[1]*z.tint[1],tint[2]*z.tint[2]];
    return {tint,ambient:(z?z.ambient:.92)*day,flash:0,white:WLD.white,
      vigBoost:st.isNight?.20:(st.phase==="dusk"?.08:.02),time:CR.game.time};
  }

  CR.forest={st,init,update,post,interact,nearest,beginGather,gatherCheck,toolInfo,
    sell,buy,hatch,startHatch,collectHatch,druidBuy,hatchFx,applyClock,tryNetworkTime,
    get hour(){return st.hour;},get isNight(){return st.isNight;},
    get phase(){return st.phase;},get clockSrc(){return st.clockSrc;},
    get nodes(){return st.nodes;},get walkers(){return st.walkers;},
    get mobs(){return st.mobs;},get trees(){return st.trees;},
    get vines(){return st.vines;},get mushrooms(){return st.mushrooms;},
    get ferns(){return st.ferns;},get stones(){return st.stones;},
    get lamps(){return st.lamps;},get fireflies(){return st.fireflies;},
    get hut(){return st.hut;},get sway(){return st.sway;},
    get fruit(){return st.fruit;},get deadwood(){return st.deadwood;},
    get ancientVines(){return st.ancientVines;},get flowers(){return st.flowers;},
    get birds(){return st.birds;},get leaves(){return st.leaves;},
    get animals(){return st.animals;},get zone(){return st.zone;}};
})(window.CR=window.CR||{});
