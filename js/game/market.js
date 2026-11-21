/* market.js — 狂欢集市：昼夜 / 天气 / 地面材质 / 行人 / 草丛 / NPC 交互 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,SV=CR.save,E=CR.ent,P=E.player,WLD=CR.world;
  let netHour=null,netDay=null;
  const st={
    hour:12,phase:"day",isNight:false,weather:"sunny",wcfg:CFG.WEATHER.sunny,
    weatherT:0,lightningT:4,flash:0,clockT:0,
    stepDist:0,lastGround:"",rustleT:0,
    near:null,dialogueBusy:false,
    walker:[],bubbles:[],grass:[],lanterns:[],
    weatherParts:U.Pool(300,()=>({x:0,y:0,vx:0,vy:0,life:0,max:0,size:0,
      kind:0,alpha:1,spin:0,alive:false}))
  };

  /* ---------- 时间：优先北京时间（联网校时 > 系统时区换算 > 本机） ---------- */
  function beijingHour(){
    try{
      const s=new Intl.DateTimeFormat("en-GB",{
        timeZone:"Asia/Shanghai",hour:"2-digit",hour12:false}).format(new Date());
      const h=parseInt(s,10);
      if(!isNaN(h))return ((h%24)+24)%24;
    }catch(e){}
    return null;
  }
  function beijingDate(){
    try{
      return new Intl.DateTimeFormat("en-CA",{
        timeZone:"Asia/Shanghai",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    }catch(e){return new Date().toISOString().slice(0,10);}
  }
  function tryNetworkTime(){
    // 默认关闭：Intl 的 Asia/Shanghai 时区换算本身已能得到准确北京时间，无需联网。
    // 玩家可在设置里手动开启「联网校时」，用公共 API 校正；失败静默回退，不产生控制台错误。
    if(!SV.data.settings.networkClock)return;
    if(typeof fetch!=="function")return;
    let done=false;
    const finish=()=>{if(done)return;done=true;applyClock();};
    const timer=setTimeout(finish,2500);
    fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Shanghai")
      .then(r=>r.ok?r.json():null).then(j=>{
        if(j&&typeof j.hour==="number"){
          netHour=((j.hour%24)+24)%24;
          netDay=j.dateTime?j.dateTime.slice(0,10):today();
        }
      }).catch(()=>{}).finally(()=>{clearTimeout(timer);finish();});
  }
  function resolveClock(){
    const src=SV.data.settings.clockSource||"beijing";
    if(src==="beijing"){
      if(netHour!==null&&!isNaN(netHour))return {hour:netHour,day:netDay||beijingDate(),src:"联网北京时间"};
      const h=beijingHour();
      if(h!==null)return {hour:h,day:beijingDate(),src:"北京时间"};
      return {hour:new Date().getHours(),day:new Date().toISOString().slice(0,10),src:"本机时间"};
    }
    return {hour:new Date().getHours(),day:new Date().toISOString().slice(0,10),src:"本机时间"};
  }
  function phaseOf(h){return (h>=18||h<6)?"night":((h>=16&&h<18)?"dusk":"day");}
  function today(){const c=resolveClock();return c.day;}

  /* ---------- 天气 ---------- */
  function rollWeather(seed){
    U.srand(seed);
    const r=U.rnd();
    // 晴天略多，雷雨略少
    if(r<.40)return "sunny";
    if(r<.66)return "rain";
    if(r<.83)return "storm";
    return "snow";
  }
  function weatherSeed(){
    const d=today().replace(/-/g,"");
    return (parseInt(d,10)||20261114)+SV.data.progress.marketVisits*7919;
  }
  function setWeather(id,quiet){
    if(!CFG.WEATHER[id])return;
    st.weather=id;st.wcfg=CFG.WEATHER[id];
    st.weatherParts.clear();      // 切天气时清掉上一场雨/雪，避免串味
    st.weatherT=210+U.rnd()*150;
    st.lightningT=U.rr(2.5,7);
    if(!quiet){
      CR.audio.sfx(id==="storm"?"thunder":(id==="snow"?"snow":"rain"));
      CR.ui.toast("天气变为 "+st.wcfg.name+" · "+st.wcfg.desc);
    }
    CR.ui.refreshWeather&&CR.ui.refreshWeather();
  }
  function resolveWeather(){
    const mode=SV.data.settings.weatherMode||"auto";
    if(mode!=="auto"&&CFG.WEATHER[mode]){setWeather(mode,true);}
    else setWeather(rollWeather(weatherSeed()),true);
  }
  function spawnWeather(){
    const w=st.wcfg,q=CFG.QUALITY[CR.gl.quality],W=CR.gl.W,H=CR.gl.H;
    const scale=q.parts/360;
    if(w.rain>0){
      const n=Math.ceil(3*w.rain*scale);
      for(let i=0;i<n;i++){
        const p=st.weatherParts.take();if(!p)break;
        p.kind=0;p.x=U.rr(-60,W+60);p.y=U.rr(-H*.15,H*.72);
        p.vx=-150*w.wind-U.rr(0,60);p.vy=U.rr(620,900)*w.rain;
        p.life=p.max=U.rr(.5,1.0);p.size=U.rr(1,2.1);p.alpha=U.rr(.35,.75);
      }
    }
    if(w.snow>0){
      for(let i=0;i<Math.ceil(2*scale);i++){
        const p=st.weatherParts.take();if(!p)break;
        p.kind=1;p.x=U.rr(0,W);p.y=U.rr(-40,0);
        p.vx=U.rr(-30,20)*w.wind;p.vy=U.rr(45,95);
        p.life=p.max=U.rr(4,8);p.size=U.rr(2,4.6);p.alpha=U.rr(.5,1);p.spin=U.rr(0,6);
      }
    }
    if(w.petal>0){
      for(let i=0;i<Math.ceil(1.1*w.petal*scale);i++){
        const p=st.weatherParts.take();if(!p)break;
        p.kind=2;p.x=U.rr(-40,W+80);p.y=U.rr(-60,H*.4);
        p.vx=U.rr(18,55)*w.wind;p.vy=U.rr(24,58);
        p.life=p.max=U.rr(4,8);p.size=U.rr(3,6);p.alpha=U.rr(.45,.9);p.spin=U.rr(0,6);
      }
    }
    if(st.isNight){
      for(let i=0;i<Math.ceil(.7*scale);i++){
        const p=st.weatherParts.take();if(!p)break;
        p.kind=3;p.x=U.rr(0,W);p.y=U.rr(H*.35,H*.92);
        p.vx=U.rr(-14,14);p.vy=U.rr(-12,12);
        p.life=p.max=U.rr(2.5,6);p.size=U.rr(1.6,3.4);p.alpha=U.rr(.4,1);p.spin=U.rr(0,6);
      }
    }
  }
  function updateWeatherParts(dt){
    const W=CR.gl.W,H=CR.gl.H;
    st.weatherParts.each(p=>{
      p.life-=dt;
      if(p.life<=0){p.alive=false;return;}
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.spin+=dt*2;
      if(p.kind===1)p.x+=Math.sin(p.spin)*14*dt;
      if(p.kind===2){p.x+=Math.sin(p.spin*1.7)*20*dt;p.vy+=Math.cos(p.spin)*8*dt;}
      if(p.kind===3){p.vx+=U.rr(-30,30)*dt;p.vy+=U.rr(-30,30)*dt;
        p.vx=U.clamp(p.vx,-30,30);p.vy=U.clamp(p.vy,-30,30);}
      if(p.y>H+40||p.x<-90||p.x>W+90)p.alive=false;
    });
  }

  /* ---------- 场景静态物：灯笼 / 草丛 / 摊位 ---------- */
  function buildScenery(){
    st.lanterns.length=0;st.grass.length=0;
    U.srand(424242);
    for(let x=140;x<CFG.MARKET_W;x+=U.rr(150,235)){
      st.lanterns.push({x,depth:-72,h:U.rr(96,132),phase:U.rr(0,6),
        color:U.rnd()<.75?C.lantern:C.pink});
    }
    for(let x=60;x<CFG.MARKET_W;x+=U.rr(38,88)){
      const g=WLD.groundAt(x);
      if(g!=="grass")continue;
      for(let k=0;k<3;k++){
        st.grass.push({x:x+U.rr(-22,22),depth:U.rr(-80,92),
          h:U.rr(8,17),phase:U.rr(0,6),sway:0,kind:k});
      }
    }
    st.walker=CFG.WALKERS.map((w,i)=>({cfg:w,x:w.x,depth:w.d0,
      dir:i%2?1:-1,t:U.rr(0,3),bubbleT:0,name:w.name,color:w.color,icon:w.icon}));
  }

  /* ---------- 中立野怪 ---------- */
  function spawnMobs(){
    const spots=[520,1480,2050,3020,3320];
    U.srand(777+SV.data.progress.marketVisits);
    spots.forEach((x,i)=>{
      const type=i%2?"candy":"kite";
      const e=E.spawnEnemy(type,x+U.rr(-40,40),U.rr(-60,60));
      if(e){e.spawn=0;e.hostile=false;}
    });
  }

  /* ---------- 脚步 / 草丛交互 ---------- */
  function stepSound(g,dt){
    const speed=Math.hypot(P.vx,P.vd);
    if(speed<20||P.h>4){st.stepDist=Math.max(0,st.stepDist-dt*30);return;}
    st.stepDist+=speed*dt;
    if(st.stepDist<44)return;
    st.stepDist=0;
    const mat=CFG.GROUND[g]||CFG.GROUND.stone;
    CR.audio.sfx(mat.step,{pitch:U.rr(.92,1.12)});
    if(g!==st.lastGround){
      st.lastGround=g;
      CR.ui.flashGround&&CR.ui.flashGround(mat.name,mat.icon);
    }
    if(g==="grass"&&st.rustleT<=0){
      st.rustleT=.42;
      CR.audio.sfx("rustle");
      // 玩家身边的草丛被惊动：飞出花瓣 / 萤火 / 小虫
      const col=st.isNight?C.cyan:C.sakura;
      for(let i=0;i<12;i++){
        const p=E.spawnPart(P.x+U.rr(-34,34),P.depth+U.rr(-20,20),U.rr(2,16),
          col,0,U.rr(2,4.5),U.rr(.5,1.1),
          {vx:U.rr(-70,70),vd:U.rr(-30,30),vh:U.rr(40,140),grav:210});
      }
      E.spawnFloat(P.x,P.depth+14,26,"!","aggro",col,false);
      CR.ui.toast("草丛沙沙作响…有什么飞了出来");
    }
  }

  /* ---------- 行人 ---------- */
  function updateWalkers(dt){
    st.walker.forEach(w=>{
      w.t+=dt;
      w.x+=w.cfg.speed*w.dir*dt;
      if(w.x>w.cfg.x+w.cfg.range){w.x=w.cfg.x+w.cfg.range;w.dir=-1;}
      if(w.x<w.cfg.x-w.cfg.range){w.x=w.cfg.x-w.cfg.range;w.dir=1;}
      if(w.bubbleT>0)w.bubbleT-=dt;
      // 玩家靠近时冒一句气泡
      if(Math.abs(P.x-w.x)<110&&Math.abs(P.depth-w.depth)<60&&w.bubbleT<=0){
        w.bubbleT=U.rr(4,7);
        st.bubbles.push({text:w.cfg.line,x:w.x,depth:w.depth,life:2.8,max:2.8});
        if(st.bubbles.length>4)st.bubbles.shift();
      }
    });
    for(let i=st.bubbles.length-1;i>=0;i--){
      st.bubbles[i].life-=dt;
      if(st.bubbles[i].life<=0)st.bubbles.splice(i,1);
    }
    // 草丛摆动衰减
    st.grass.forEach(g=>{g.sway*=Math.pow(.90,dt*60);});
  }
  function rustleNear(x,d,r){
    st.grass.forEach(g=>{
      if(Math.abs(g.x-x)<r&&Math.abs(g.depth-d)<70)g.sway=U.rr(.6,1.1);
    });
    /* 1.1.0 采集工具被动：路过草丛 / 矿脉 / 木料时额外收获 */
    if(st.harvestT===undefined)st.harvestT=0;
    if(st.harvestT>0)return;
    const eq=CR.equip?CR.equip.bonus(P.cls):null;
    if(!eq||!eq.passives.length)return;
    const ground=WLD.groundAt(x);
    let mat=null,passive=null;
    if(ground==="grass"){mat="petal";passive="harvest";}
    else if(ground==="stone"){mat="iron";passive="mining";}
    else{mat="hide";passive="lumber";}
    if(eq.passives.indexOf(passive)<0)return;
    if(U.rnd()>.035)return;
    st.harvestT=3.2;
    SV.addMat(mat,1);SV.flush();
    E.spawnFloat(P.x,P.depth,60,1,"mat",CFG.MATERIALS[mat].color,false);
    CR.audio.sfx("pickup");
    CR.ui.toast("【"+CFG.PASSIVE_DESC[passive].split("：")[0]+"】额外获得 "+
      CFG.MATERIALS[mat].name+" ×1");
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
  }

  /* ---------- 交互 ---------- */
  function nearest(){
    let best=null,bd=1e9;
    for(const key in CFG.NPCS){
      const n=CFG.NPCS[key];
      const d=Math.hypot(P.x-n.x,P.depth-n.depth);
      if(d<105&&d<bd){bd=d;best={type:"npc",id:key,cfg:n,d};}
    }
    return best;
  }
  function interact(){
    const n=nearest();
    if(!n){CR.ui.toast("附近没有可以交谈的对象 · 靠近夜樱或阿福试试");
      CR.audio.sfx("deny");return;}
    CR.audio.sfx("talk");
    if(n.id==="vendor"){CR.ui.openShop();return;}
    if(n.id==="sakura"){
      const day=today();
      if(SV.bountyAvailable(day)){
        const B=CFG.BOUNTY;
        CR.ui.openDialogue({
          name:"夜樱",title:"樱下赏金委托人",color:C.sakura,icon:"✿",
          lines:B.lines,
          reward:`获得赏金 ${B.gold} 金币 · ${B.mats.map(m=>CFG.MATERIALS[m.id].name+"×"+m.n).join(" · ")}`+
            (B.gift&&!SV.data.progress.bountyGift?` · 初次赠礼【${CFG.EQUIPMENT[B.gift].name}】`:""),
          onDone:()=>{
            let extra="";
            SV.addGold(B.gold);
            B.mats.forEach(m=>SV.addMat(m.id,m.n));
            if(B.gift&&!SV.data.progress.bountyGift){
              SV.addEquip(B.gift,1);
              extra=" · 初次赠礼 "+CFG.EQUIPMENT[B.gift].name;
            }
            SV.markBounty(day);SV.flush();
            CR.audio.sfx("bounty");
            E.burst(P.x,P.depth,40,C.sakura,26,180);
            E.ringFx(P.x,P.depth,C.sakura,90,.5);
            CR.ui.toast("赏金已收入背包"+extra);
            CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
          }
        });
      }else{
        CR.ui.openDialogue({name:"夜樱",title:"樱下赏金委托人",color:C.sakura,icon:"✿",
          lines:["……今天的樱花已经数完了。","明天再来吧，我会在这儿等你。",
            "（她脚边的花瓣轻轻浮起来，像是打了个招呼）"]});
      }
    }
  }
  /* 1.1.0：支持 "item:id" / "equip:id"，并兼容旧版纯 id */
  function buy(key){
    let k="item",id=key;
    if(typeof key==="string"&&key.indexOf(":")>0){k=key.slice(0,key.indexOf(":"));id=key.slice(key.indexOf(":")+1);}
    const row=CFG.SHOP.find(s=>s.id===id&&(s.k||"item")===k)
      ||CFG.SHOP.find(s=>s.id===id);
    if(!row){CR.audio.sfx("deny");CR.ui.toast("没有这件商品");return;}
    k=row.k||"item";
    const it=k==="equip"?CFG.EQUIPMENT[id]:CFG.ITEMS[id];
    if(!it)return;
    const price=row.price!==undefined?row.price:(it.price||0);
    if(!SV.spendGold(price)){CR.audio.sfx("deny");CR.ui.toast("金币不够啦");return;}
    if(k==="equip")SV.addEquip(id,1);else SV.addItem(id,1);
    SV.flush();CR.audio.sfx("buy");
    E.burst(P.x,P.depth,30,C.gold,10,130);
    CR.ui.toast("买下 "+(it.label||it.name)+" ×1"+(k==="equip"?" · 到装备栏穿戴":""));
    CR.ui.refreshAll?CR.ui.refreshAll():CR.ui.refreshPanels();
  }

  /* ---------- 生命周期 ---------- */
  function init(){
    const c=resolveClock();
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";
    st.clockSrc=c.src;
    resolveWeather();
    buildScenery();
    spawnMobs();
    st.stepDist=0;st.lastGround="";st.rustleT=0;st.flash=0;st.clockT=0;
    st.bubbles.length=0;
    st.weatherParts.clear();
    SV.visitMarket();
    // 预铺一层天气粒子，进入即有效果
    for(let i=0;i<40;i++){spawnWeather();updateWeatherParts(1/60);}
    CR.audio.setScene(st.isNight?"marketNight":"market",true);
    CR.ui.toast("欢迎来到【狂欢集市】 · "+st.wcfg.icon+st.wcfg.name+" · "+
      (st.isNight?"夜间灯火":"白昼")+"（"+c.src+" "+c.hour+":00）");
    CR.ui.refreshWeather&&CR.ui.refreshWeather();
  }
  function update(dt){
    /* 1.3.1 修复：每 20 秒按当前时间重算昼夜，跨 18:00 / 6:00 会自动切换灯火与天色 */
    st.clockT=(st.clockT||0)+dt;
    if(st.clockT>=20){st.clockT=0;applyClock();}
    const g=WLD.groundAt(P.x);
    stepSound(g,dt);
    if(st.rustleT>0)st.rustleT-=dt;
    if(st.harvestT>0)st.harvestT-=dt;
    rustleNear(P.x,P.depth,55);
    updateWalkers(dt);
    spawnWeather();updateWeatherParts(dt);
    st.near=nearest();
    CR.ui.setInteractHint(st.near?("按 "+(CFG.KEY_LABELS[SV.data.settings.bindings.interact]||"F")+
      " 与 "+st.near.cfg.name+(st.near.id==="vendor"?" 交易":" 交谈")):"");
    // 天气自动轮换
    if((SV.data.settings.weatherMode||"auto")==="auto"){
      st.weatherT-=dt;
      if(st.weatherT<=0){
        const next=CFG.WEATHER_ORDER[(CFG.WEATHER_ORDER.indexOf(st.weather)+1+Math.floor(U.rnd()*2))%4];
        setWeather(next,false);
      }
    }
    // 雷雨闪电
    if(st.wcfg.lightning>0){
      st.lightningT-=dt;
      if(st.lightningT<=0){
        st.lightningT=U.rr(3.5,9);
        st.flash=.85;
        WLD.addWhite(.55);WLD.addShake(3);
        CR.audio.sfx("thunder");
      }
    }
    if(st.flash>0)st.flash=Math.max(0,st.flash-dt*2.6);
    // 夜间灯笼偶发轻响
    if(st.isNight&&U.rnd()<dt*.12)CR.audio.sfx("lantern");
  }
  function applyClock(){
    const c=resolveClock();
    const wasNight=st.isNight;
    st.hour=c.hour;st.phase=phaseOf(c.hour);st.isNight=st.phase==="night";
    st.clockSrc=c.src;
    if(wasNight!==st.isNight&&CR.game&&CR.game.state==="play"&&WLD.mode==="market")
      CR.audio.setScene(st.isNight?"marketNight":"market");
    CR.ui.refreshWeather&&CR.ui.refreshWeather();
  }
  function post(){
    const w=st.wcfg,day=st.phase==="day"?1:(st.phase==="dusk"?.88:.62);
    let tint=w.tint.slice(),ambient=w.ambient*day;
    if(st.isNight){tint=[tint[0]*.86,tint[1]*.90,tint[2]*1.14];}
    else if(st.phase==="dusk"){tint=[tint[0]*1.10,tint[1]*.92,tint[2]*.86];}
    // 雷雨白闪已在场景里铺全屏白 quad，这里不再触发受击红闪
    return {tint,ambient,flash:0,white:WLD.white,vigBoost:st.isNight?.14:0};
  }
  CR.market={st,init,update,post,interact,buy,setWeather,resolveClock,applyClock,
    today,phaseOf,tryNetworkTime,nearest,
    get hour(){return st.hour;},get isNight(){return st.isNight;},
    get weather(){return st.weather;},get wcfg(){return st.wcfg;},
    get parts(){return st.weatherParts;},get walkers(){return st.walker;},
    get grass(){return st.grass;},get lanterns(){return st.lanterns;},
    get bubbles(){return st.bubbles;},get flash(){return st.flash;},
    get clockSrc(){return st.clockSrc;}};
})(window.CR=window.CR||{});
