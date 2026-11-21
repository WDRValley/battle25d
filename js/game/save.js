/* save.js — 持久化：设置 / 队伍 / 仓库 / 角色等级 / 经验池 / 装备 / 背包 / 进度 / 版本日志 */
(function(CR){
  "use strict";
  const CFG=CR.CFG,U=CR.u;
  const MAXC=CFG.MAX_CLASS===undefined?3:CFG.MAX_CLASS;
  /* 1.3.1 天赋重组修复：demo 的 5 档权重是「评级档位」权重，不是单项星级权重。
     先按权重抽一个评级档，再在该档分数区间内反推 6 项星级之和，最后随机分散到 6 项。 */
  function randomTalentStars(){
    const T=CFG.TIER_TABLE||[{min:0,max:305,weight:100}];
    const total=T.reduce((a,t)=>a+(t.weight||0),0);
    let r=Math.random()*total,tier=T[0];
    for(let k=0;k<T.length;k++){r-=T[k].weight||0;if(r<=0){tier=T[k];break;}}
    const score=Math.round(U.rr(tier.min,tier.max));
    let sum=U.clamp(Math.round(score/10),6,30);
    const out=[1,1,1,1,1,1];let left=sum-6,guard=0;
    while(left>0&&guard++<200){
      const k=Math.floor(Math.random()*6);
      if(out[k]<CFG.BEAN_MAX_STAR){out[k]++;left--;}
    }
    for(let i=5;i>0;i--){const j=Math.floor(Math.random()*(i+1));
      const t=out[i];out[i]=out[j];out[j]=t;}
    return out;
  }
  function defaultEquip(){
    const o={};
    for(let c=0;c<=MAXC;c++)o[c]=Object.assign({},CFG.DEFAULT_EQUIP[c]);
    return o;
  }
  function defaultChars(){
    const o={};
    for(let c=0;c<=MAXC;c++)o[c]={level:1,exp:0,
      nature:CFG.NATURE_KEYS[Math.floor(Math.random()*CFG.NATURE_KEYS.length)],
      talent:{stars:randomTalentStars(),beans:CFG.BEAN_START},
      ev:{atk:0,matk:0,pdef:0,mdef:0,hp:0,spd:0},
      skills:null};
    return o;
  }
  function blank(){
    return {
      version:CFG.VERSION,
      settings:{
        sfx:true,music:true,musicVol:.55,sfxVol:.75,quality:"high",
        weatherMode:"auto",clockSource:"beijing",networkClock:false,
        simpleTooltip:false,   /* v1.4 dev3 装备悬浮文本简略模式 */
        regionCard:true,       /* v1.4 dev5.1 显示右上角区域信息卡 */
        townCollapsed:null,    /* null=按设备自动（窄屏默认收起），boolean=玩家手动设定 */
        bindings:Object.assign({},CFG.DEFAULT_BINDINGS)
      },
      profile:{name:"无名勇者",gold:0,expPool:0,
        upgrades:{hp:0,atk:0,spd:0,crit:0,armor:0}},
      /* 每名角色独立等级 / 经验 / 性格 / 天赋 / 学习力 / 技能配置 */
      chars:defaultChars(),
      /* 装备：按职业 id 存放 6 个槽位（1.3.0 起工具并入双手槽） */
      equipment:defaultEquip(),
      /* 队伍：最多 4 位，值为职业 id 或 null；names 逐位命名 */
      team:{order:[0,1,2,null],names:[CFG.CLASSES[0].defName,CFG.CLASSES[1].defName,
        CFG.CLASSES[2].defName,null],active:0},
      /* 1.2.0 角色仓库：超出出战队列上限的角色存这里，不参战。
         等级 / 经验 / 装备按职业 id 存在 chars / equipment，移入移出不会丢养成数据。 */
      warehouse:[],
      slots:[null,null],
      progress:{duskCleared:false,mapUnlocked:false,bountyDay:"",bountyTaken:false,
        bountyGift:false,marketVisits:0,harborVisits:0,forestVisits:0,swampVisits:0,borderVisits:0,
        freshmanRegistered:false,sakuraHatched:false,
        /* v1.4 dev4.1 入学前置：cityPermit 为唯一解锁凭证；enroll.stage 0 未报名 / 1 待考核 / 2 待核实 / 3 已入学 */
        cityPermit:false,enroll:{stage:0,badge:null},
        gatherDay:"",gatherCount:{},trialDay:"",trialUsed:0,trialWins:0,eggGranted:false,
        dev12Applied:true,dev12Gift:0},
      /* 1.3.1 德鲁伊孵化室（3 个蛋巢）/ 小摊限购 / 薇薇安支线 */
      hatchery:{nests:[null,null,null]},
      druidBought:{},questDone:false,
      /* 1.4 dev1 任务档案与沼泽限购 */
      quests:{main:{},side:{},accepted:[],done:[]},
      swampBought:{},borderBought:{},
      inventory:{mats:{iron:0,dust:0,hide:0,crystal:0,rune:0,ember:0,petal:0,
                 copper:0,apple:0,egg:0,leaf:0,herb:0,berry:0,wood:0,
                 pear:0,grape:0,mushroom:0,meat:0},
        items:{potion:2,tonic:1,charm:0,feather:0,bomb:0,
               expSmall:0,expTasty:0,expLarge:0,wiseFruit:0,levelFruit:0,
               rewashPill:0,personaCard:0,effortFruit:0,sakuraEgg:0,
               personaEditCard:0,personaSpecCard:0,
               effortAtk:0,effortMatk:0,effortSpd:0,effortHp:0,effortDef:0,effortMdef:0,
               effortForget:0,forgetPotion:0},
        equips:{}},
      /* v1.4 dev5：副件（神兵）不是装备，独立存；soulpath 按角色 id 存灵路拆分 / 装配 / 显化 */
      soulpath:{},spirits:{},
      meta:{lastSeenVersion:"",changelogRead:false},
      stats:{kills:0,wins:0,runs:0,bestCombo:0,totalGold:0,playTime:0,
             collected:{},history:[]},
      log:[]
    };
  }
  let data=blank(),dirty=false,saveTimer=0,lastResult={ok:true,reason:"",bytes:0};
  let lastRosterRepair=[];   /* 1.4 dev1.5：本次读档找回的角色名列表 */

  /* ---------- 载入 + 从旧版存档迁移 ---------- */
  function migrate(raw,d){
    if(!raw||typeof raw!=="object")return;
    if(raw.settings){
      const s=raw.settings;
      d.settings.sfx=s.sfx!==false;d.settings.music=s.music!==false;
      d.settings.musicVol=U.clamp(Number(s.musicVol)||0,0,1);
      d.settings.sfxVol=U.clamp(Number(s.sfxVol)||0,0,1);
      d.settings.quality=CFG.QUALITY[s.quality]?s.quality:"high";
      d.settings.bindings=Object.assign({},CFG.DEFAULT_BINDINGS,s.bindings||{});
      // 旧档没有 bag/map/pause/panel，补默认；保留玩家已改过的键
      for(const k in CFG.DEFAULT_BINDINGS)
        if(!d.settings.bindings[k])d.settings.bindings[k]=CFG.DEFAULT_BINDINGS[k];
      /* 1.4 dev1.5：旧版每次读档都用 settings.cls 强制覆盖队伍，是历史上
         「角色被挤出队伍」的元凶之一。仅当存档完全没有 team 字段时才兜底。 */
      if(typeof s.cls==="number"&&!raw.team)
        d.team.order=[U.clamp(s.cls|0,0,MAXC),0,1,2].slice(0,4);
      /* 1.3.0：旧档没有 char 键，补默认 C；玩家若已把 C 用作别的动作则保留其自定义 */
      /* 1.4 dev1.4：技能默认键由 Q/E/R/T（或误设为 1~4）改为 U/I/O/L。
       仅当旧档仍是旧默认组合时迁移，玩家自定义过的键位一律保留。 */
    const old1={s1:"KeyQ",s2:"KeyE",s3:"KeyR",s4:"KeyT"};
    const old2={s1:"Digit1",s2:"Digit2",s3:"Digit3",s4:"Digit4"};
    const b=d.settings.bindings||{},match=o=>Object.keys(o).every(k=>b[k]===o[k]);
    if(match(old1)||match(old2)){
      d.settings.bindings.s1="KeyU";d.settings.bindings.s2="KeyI";
      d.settings.bindings.s3="KeyO";d.settings.bindings.s4="KeyL";
      dirty=true;
    }
    if(s.weatherMode)d.settings.weatherMode=s.weatherMode;
      if(s.clockSource)d.settings.clockSource=s.clockSource;
      d.settings.networkClock=s.networkClock===true;
      /* v1.4 dev5.1：区域信息卡开关 / 收起状态跨会话保留；旧档无该字段则按设备自动 */
      d.settings.regionCard=s.regionCard!==false;
      d.settings.townCollapsed=(typeof s.townCollapsed==="boolean")?s.townCollapsed:null;
    }
    if(raw.profile){
      if(typeof raw.profile.name==="string")d.profile.name=raw.profile.name;
      if(typeof raw.profile.gold==="number")d.profile.gold=raw.profile.gold;
      d.profile.upgrades=Object.assign({hp:0,atk:0,spd:0,crit:0,armor:0},raw.profile.upgrades||{});
      // 旧版为全队共享等级：迁移时把该等级复制给三名角色
      const lv=U.clamp(raw.profile.level|0,1,CFG.MAX_LEVEL);
      const ex=Math.max(0,raw.profile.exp|0);
      for(let c=0;c<3;c++){d.chars[c].level=lv;d.chars[c].exp=ex;}
      if(typeof raw.profile.expPool==="number")d.profile.expPool=raw.profile.expPool;
    }
    if(raw.chars){
      for(let c=0;c<=MAXC;c++)if(raw.chars[c]){
        d.chars[c].level=U.clamp(raw.chars[c].level|0,1,CFG.MAX_LEVEL);
        d.chars[c].exp=Math.max(0,raw.chars[c].exp|0);
        if(raw.chars[c].nature&&CFG.NATURES[raw.chars[c].nature])d.chars[c].nature=raw.chars[c].nature;
        if(raw.chars[c].talent){
          const t=raw.chars[c].talent;
          if(Array.isArray(t.stars)&&t.stars.length===6)
            d.chars[c].talent.stars=t.stars.map(v=>U.clamp(v|0,1,CFG.BEAN_MAX_STAR));
          if(typeof t.beans==="number")d.chars[c].talent.beans=Math.max(0,t.beans|0);
        }
        if(raw.chars[c].ev)Object.assign(d.chars[c].ev,raw.chars[c].ev);
        if(Array.isArray(raw.chars[c].skills))d.chars[c].skills=raw.chars[c].skills.slice(0,4);
      }
    }
    if(raw.equipment){
      for(let c=0;c<=MAXC;c++)if(raw.equipment[c])
        d.equipment[c]=Object.assign({},CFG.DEFAULT_EQUIP[c],raw.equipment[c]);
    }
    if(raw.inventory){
      /* 1.3.1：按配置表补齐全部材料 / 道具键，旧档里没有的新道具自动置 0 */
      for(const k in CFG.MATERIALS)d.inventory.mats[k]=Math.max(0,(raw.inventory.mats||{})[k]|0);
      for(const k in CFG.ITEMS)d.inventory.items[k]=Math.max(0,(raw.inventory.items||{})[k]|0);
      for(const k in (raw.inventory.equips||{}))d.inventory.equips[k]=Math.max(0,raw.inventory.equips[k]|0);
    }
    /* v1.4 dev5：旧档没有灵路 / 神兵字段，结构校验交给 CR.soulpath.ensure() */
    if(raw.soulpath&&typeof raw.soulpath==="object")d.soulpath=raw.soulpath;
    if(raw.spirits&&typeof raw.spirits==="object")d.spirits=raw.spirits;
    if(raw.hatchery&&Array.isArray(raw.hatchery.nests))
      d.hatchery.nests=raw.hatchery.nests.slice(0,3).map(n=>
        n&&typeof n.start==="number"?{start:n.start,egg:String(n.egg||"sakuraEgg")}:null);
    if(raw.druidBought&&typeof raw.druidBought==="object")d.druidBought=Object.assign({},raw.druidBought);
    if(raw.questDone===true)d.questDone=true;
    if(Array.isArray(raw.warehouse)){
      d.warehouse=raw.warehouse.filter(w=>w&&typeof w.cls==="number"&&w.cls>=0&&w.cls<=MAXC)
        .map(w=>({cls:U.clamp(w.cls|0,0,MAXC),name:String(w.name||CFG.CLASSES[w.cls|0].defName).slice(0,10)}));
    }
    if(raw.progress){
      const p=raw.progress;
      d.progress.harborVisits=Math.max(0,p.harborVisits|0);
      d.progress.gatherDay=String(p.gatherDay||"");
      d.progress.gatherCount=Object.assign({},p.gatherCount||{});
      d.progress.trialDay=String(p.trialDay||"");
      d.progress.trialUsed=Math.max(0,p.trialUsed|0);
      d.progress.trialWins=Math.max(0,p.trialWins|0);
    }
    if(raw.stats){
      Object.assign(d.stats,raw.stats);
      d.stats.collected=raw.stats.collected||{};
      d.stats.history=(raw.stats.history||[]).slice(-12);
    }
    if(raw.team){
      if(Array.isArray(raw.team.order))d.team.order=raw.team.order.slice(0,4);
      if(Array.isArray(raw.team.names))d.team.names=raw.team.names.slice(0,4);
      d.team.active=U.clamp(raw.team.active|0,0,3);
    }
    if(Array.isArray(raw.slots))d.slots=raw.slots.slice(0,2);
    if(raw.progress){
      const hadEgg=raw.progress.eggGranted;
      Object.assign(d.progress,raw.progress);
      /* 1.3.1：1.3.0 旧档没有 eggGranted，按「已孵化 / 已有胜场」推断，
         避免通关过的老玩家被再发一次夜樱蛋 */
      if(hadEgg===undefined)
        d.progress.eggGranted=!!(d.progress.sakuraHatched||(d.progress.trialWins|0)>0);
    }
    if(raw.meta)Object.assign(d.meta,raw.meta);
    /* 1.4 dev1.4 的「只补夜樱」已并入下方统一角色回收（在 load 末尾执行），
       这里只做去重与 1 号位兜底。 */
    /* 1.4 dev1.2 升级迁移（一次性）：用户反馈「挑战次数用完、刷了一堆重复
       装备凑不出 4 件套」，因此升级到本版时重置当日试炼次数，并从樱花池里
       补齐 4 件玩家尚未拥有的钻装，保证能立刻凑出 4/4 体验 sp1 樱花环绕。
       用 progress.dev12Applied 标记，避免每次读档都重复发放。 */
    if(!raw.progress||!raw.progress.dev12Applied){
      d.progress.dev12Applied=true;
      d.progress.trialDay="";d.progress.trialUsed=0;
      const pool=(CFG.EQUIP_DROPS&&CFG.EQUIP_DROPS.sakuraTrial)||[];
      const owned=d.inventory.equips||(d.inventory.equips={});
      let added=0;
      for(const id of pool){
        if(added>=4)break;
        if((owned[id]||0)<=0){owned[id]=1;added++;}
      }
      d.progress.dev12Gift=added;
    }
  }
  function fixTeam(d){
    const o=d.team.order,n=d.team.names;
    while(o.length<4)o.push(null);
    while(n.length<4)n.push(null);
    o.length=4;n.length=4;
    const seen={};
    for(let i=0;i<4;i++){
      if(o[i]===null||o[i]===undefined)continue;
      const c=U.clamp(o[i]|0,0,MAXC);
      if(seen[c]){o[i]=null;n[i]=null;}else{seen[c]=1;o[i]=c;
        if(!n[i])n[i]=CFG.CLASSES[c].defName;}
    }
    if(o[0]===null){
      for(let c=0;c<=MAXC;c++)if(!seen[c]){o[0]=c;n[0]=CFG.CLASSES[c].defName;break;}
      if(o[0]===null){o[0]=0;n[0]=CFG.CLASSES[0].defName;}
    }
    if(o[d.team.active]===null)d.team.active=0;
  }
  /* ================= 1.4 dev1.5 角色回收 =================
     历史 bug：1.0~1.3 的 setLeaderClass() 用 old.indexOf(c) 过滤候选，任何
     不在旧队伍里的角色都会被永久挤掉；旧迁移又只补夜樱，不补初始三职业，
     于是玩家存档里出现「小射既不在队伍也不在仓库」，且此后每次读档都找不回来。
     规则：0/1/2 为初始三职业，永远拥有；3 夜樱按孵化 / 领蛋 / 试炼胜场 /
     已在队伍或仓库判定解锁。凡「已拥有但队伍与仓库都不存在」的角色一律回收：
     优先补进出战队列的空位（保留原有顺序与自定义名），队列已满则放入仓库。
     主动入库的角色在 warehouse 里，不会被强行拉回，尊重玩家编排。 */
  function ownedClasses(d){
    const owned=[0,1,2];
    const p=d.progress||{},wh=Array.isArray(d.warehouse)?d.warehouse:[];
    const sakura=!!(p.sakuraHatched||p.eggGranted||(p.trialWins|0)>0||
      d.team.order.indexOf(3)>=0||wh.some(w=>w&&w.cls===3));
    if(sakura)owned.push(3);
    return owned;
  }
  function reconcileRoster(d){
    if(!Array.isArray(d.warehouse))d.warehouse=[];
    const o=d.team.order,n=d.team.names,fixed=[];
    for(const c of ownedClasses(d)){
      if(o.indexOf(c)>=0)continue;
      if(d.warehouse.some(w=>w&&w.cls===c))continue;   // 玩家主动入库，保留
      const empty=o.findIndex(x=>x===null||x===undefined);
      if(empty>=0){o[empty]=c;n[empty]=CFG.CLASSES[c].defName;}
      else d.warehouse.push({cls:c,name:CFG.CLASSES[c].defName});
      fixed.push(CFG.CLASSES[c].defName);
    }
    if(fixed.length){dirty=true;fixTeam(d);}
    return fixed;
  }
  function load(){
    let raw=CR.store.read("castleRaid.save.v1");
    let legacy=false;
    if(!raw){raw=CR.store.read("castleRaid.save.v3");legacy=!!raw;}
    data=blank();
    migrate(raw,data);
    data.version=CFG.VERSION;
    if(legacy){data.meta.lastSeenVersion="";data.meta.changelogRead=false;}
    fixTeam(data);
    /* 1.4 dev1.5：读档即回收丢失角色，并立刻写回，避免只在内存里修好 */
    lastRosterRepair=reconcileRoster(data);
    if(lastRosterRepair.length)flush();
    if(data.inventory.mats.petal===undefined)data.inventory.mats.petal=0;
    for(const k in CFG.ITEMS)if(data.inventory.items[k]===undefined)data.inventory.items[k]=0;
    /* v1.4 dev5：灵路 / 神兵字段兜底，四名角色默认 9 赤灵路由 CR.soulpath 初始化 */
    if(!data.soulpath||typeof data.soulpath!=="object")data.soulpath={};
    if(!data.spirits||typeof data.spirits!=="object")data.spirits={};
    for(const k in CFG.SPIRITS)if(data.spirits[k]===undefined)data.spirits[k]=0;
    for(const k in CFG.MATERIALS)if(data.inventory.mats[k]===undefined)data.inventory.mats[k]=0;
    if(!Array.isArray(data.warehouse))data.warehouse=[];
    if(!data.progress.gatherCount)data.progress.gatherCount={};
    /* 1.4 dev1：旧档自动补齐任务档案 / 沼泽限购 / 新材料道具键 */
    if(!data.quests)data.quests={main:{},side:{},accepted:[],done:[]};
    if(!data.quests.main)data.quests.main={};
    if(!data.quests.side)data.quests.side={};
    if(!data.quests.accepted)data.quests.accepted=[];
    if(!data.quests.done)data.quests.done=[];
    if(!data.swampBought)data.swampBought={};
    if(!data.borderBought)data.borderBought={};
    if(data.progress.swampVisits===undefined)data.progress.swampVisits=0;
    if(data.progress.borderVisits===undefined)data.progress.borderVisits=0;
    if(data.progress.freshmanRegistered===undefined)data.progress.freshmanRegistered=false;
    /* v1.4 dev4.1：dev4 老档能进大学城即视为已完成入学链，自动补发 cityPermit；
       从未进过城的存档必须老老实实走「报名 → 元素考核 → 石像鬼核实」。 */
    if(!data.progress.enroll||typeof data.progress.enroll!=="object")
      data.progress.enroll={stage:0,badge:null};
    if(!data.progress.cityPermit&&(data.progress.universityVisits||0)>0){
      data.progress.cityPermit=true;data.progress.enroll.stage=3;
    }
    if(data.progress.cityPermit&&data.progress.enroll.stage<3)data.progress.enroll.stage=3;
    /* 1.3.0：四名角色的养成字段一律补齐；旧档 tool 槽由 equipment.normalizeAll 迁移 */
    for(let c=0;c<=MAXC;c++){
      if(!data.chars[c])data.chars[c]=defaultChars()[c];
      const ch=data.chars[c];
      if(!CFG.NATURES[ch.nature])ch.nature=CFG.NATURE_KEYS[0];
      if(!ch.talent||!Array.isArray(ch.talent.stars)||ch.talent.stars.length!==6)
        ch.talent={stars:randomTalentStars(),beans:CFG.BEAN_START};
      if(typeof ch.talent.beans!=="number")ch.talent.beans=CFG.BEAN_START;
      if(!ch.ev)ch.ev={atk:0,matk:0,pdef:0,mdef:0,hp:0,spd:0};
      for(const k in {atk:0,matk:0,pdef:0,mdef:0,hp:0,spd:0})if(typeof ch.ev[k]!=="number")ch.ev[k]=0;
      if(ch.skills!==null&&!Array.isArray(ch.skills))ch.skills=null;
      if(!data.equipment[c])data.equipment[c]=Object.assign({},CFG.DEFAULT_EQUIP[c]);
      delete data.equipment[c].tool;
    }
    // 清掉固定键的误绑定（Enter / NumpadEnter / Escape 永远保留给系统）
    const b=data.settings.bindings;
    for(const a in b)if(CFG.RESERVED_CODES.indexOf(b[a])>=0)b[a]=CFG.DEFAULT_BINDINGS[a];
    /* 1.3.0：新增 C 键。若玩家旧档已把 C 用在别的动作上，保留玩家自定义，
       改把「角色 / 队伍」落到第一个空闲键，避免两个动作抢同一个键 */
    if(b.char){
      const used=Object.keys(b).filter(k=>k!=="char"&&b[k]===b.char);
      if(used.length){
        const free=["KeyC","KeyV","KeyN","KeyI","KeyO"].find(c=>
          Object.keys(b).every(k=>b[k]!==c)&&CFG.RESERVED_CODES.indexOf(c)<0);
        b.char=free||"KeyC";
      }
    }
    if(CR.equip)CR.equip.normalizeAll();
    lastResult=CR.store.usage();
    return data;
  }
  function flush(){
    const r=CR.store.write(data,"castleRaid.save.v1");
    lastResult={ok:r.ok,reason:r.reason,bytes:r.bytes||CR.store.usage().used};
    dirty=false;return lastResult;
  }
  function mark(){dirty=true;}
  function tick(dt){if(!dirty)return;saveTimer+=dt;if(saveTimer>1.2){saveTimer=0;flush();}}
  function usage(){const u=CR.store.usage();u.used=Math.max(u.used,lastResult.bytes||0);return u;}
  function setSetting(k,v){data.settings[k]=v;mark();}
  function setBinding(action,code){
    if(CFG.RESERVED_CODES.indexOf(code)>=0)return data.settings.bindings;
    const b=data.settings.bindings;
    for(const a in b)if(a!==action&&b[a]===code){b[a]=b[action];break;}
    b[action]=code;mark();return b;
  }
  function resetBindings(){data.settings.bindings=Object.assign({},CFG.DEFAULT_BINDINGS);mark();}

  /* ---------- 角色等级 / 经验 ---------- */
  function curCls(){
    return (CR.ent&&CR.ent.player)?U.clamp(CR.ent.player.cls|0,0,MAXC):0;
  }
  function charLevel(cls){
    cls=U.clamp(cls===undefined?curCls():cls,0,MAXC);
    if(!data.chars[cls])data.chars[cls]=defaultChars()[cls];
    return data.chars[cls];
  }
  function levelOf(cls){return charLevel(cls).level;}
  function expNeed(cls){
    const lv=levelOf(cls);
    return lv>=CFG.MAX_LEVEL?0:CFG.expFormula(lv);
  }
  function expNeedAt(lv){return lv>=CFG.MAX_LEVEL?0:CFG.expFormula(lv);}
  function addExp(n,cls){
    cls=cls===undefined?curCls():U.clamp(cls,0,MAXC);
    const c=charLevel(cls);
    if(c.level>=CFG.MAX_LEVEL){c.exp=0;mark();return 0;}
    let up=0;c.exp+=Math.max(0,Math.round(n));
    while(c.level<CFG.MAX_LEVEL){
      const need=expNeedAt(c.level);
      if(c.exp<need)break;
      c.exp-=need;c.level++;up++;
    }
    if(c.level>=CFG.MAX_LEVEL)c.exp=0;
    mark();return up;
  }
  function addExpPool(n){n=Math.max(0,Math.round(n));
    data.profile.expPool+=n;mark();return n;}
  function expToMax(cls){
    cls=cls===undefined?curCls():cls;
    const c=charLevel(cls);let t=0;
    for(let l=c.level;l<CFG.MAX_LEVEL;l++)t+=expNeedAt(l);
    return Math.max(0,t-c.exp);
  }
  /* 从经验池分配 n 点给某角色；返回实际消耗与升级次数 */
  function allocateExp(cls,n){
    if(!guardTrain().ok)return {used:0,up:0,blocked:true,reason:"战斗中无法培养角色"};
    n=Math.max(0,Math.min(Math.floor(n),data.profile.expPool,expToMax(cls)));
    if(n<=0)return {used:0,up:0};
    data.profile.expPool-=n;
    const up=addExp(n,cls);
    mark();return {used:n,up};
  }
  function useExpItem(id,cls){
    const it=CFG.ITEMS[id];if(!it||!it.type)return null;
    if(!guardTrain().ok)return {ok:false,msg:"战斗中无法使用经验道具"};
    cls=cls===undefined?curCls():U.clamp(cls,0,MAXC);
    const c=charLevel(cls);
    if(it.type==="levelUp"){
      if(c.level>=CFG.MAX_LEVEL)return {ok:false,msg:"已经满级了"};
      c.level=Math.min(CFG.MAX_LEVEL,c.level+(it.val||1));c.exp=0;
      mark();return {ok:true,msg:"等级提升至 Lv."+c.level,up:1};
    }
    if(it.type==="exp"){
      const up=addExp(it.val,cls);
      return {ok:true,msg:"获得 "+it.val+" 经验",up};
    }
    let amount=it.val||0;
    if(it.type==="expPoolRand"){
      const ratio=(c.level-1)/(CFG.MAX_LEVEL-1);
      amount=Math.round((30000+90000*ratio)/1000)*1000;
    }
    addExpPool(amount);
    return {ok:true,msg:"经验池 +"+amount,up:0,pool:true};
  }

  /* ---------- 角色属性（等级 / 强化 / 装备） ---------- */
  /* ================= 1.3.0 养成数据访问 ================= */
  function charData(cls){
    cls=U.clamp(cls|0,0,MAXC);
    if(!data.chars[cls])data.chars[cls]=defaultChars()[cls];
    return data.chars[cls];
  }
  function talentScore(cls){
    const s=charData(cls).talent.stars,ev=charData(cls).ev;
    let n=s.reduce((a,b)=>a+b,0)*10;
    n+=Math.floor(Object.keys(ev).reduce((a,k)=>a+(ev[k]||0),0)/32);
    return n;
  }
  function tierOf(score){
    const t=CFG.TIER_TABLE;
    for(let i=t.length-1;i>=0;i--)if(score>=t[i].min)return t[i];
    return t[0];
  }
  function talentOf(cls){
    const t=charData(cls).talent;
    return {stars:t.stars.slice(),beans:t.beans,score:talentScore(cls),tier:tierOf(talentScore(cls))};
  }
  function talentCost(cls,key){
    const i=CFG.TALENT_KEYS.findIndex(x=>x.k===key),s=charData(cls).talent.stars[i];
    if(i<0||s>=CFG.BEAN_MAX_STAR)return -1;
    return CFG.BEAN_COST[Math.min(CFG.BEAN_COST.length-1,s)];
  }
  function upgradeTalent(cls,key){
    if(!guardTrain().ok)return {ok:false,reason:"战斗中无法培养角色"};
    const i=CFG.TALENT_KEYS.findIndex(x=>x.k===key);if(i<0)return {ok:false,reason:"没有这项资质"};
    const t=charData(cls).talent,cost=talentCost(cls,key);
    if(cost<0)return {ok:false,reason:"该项已满星"};
    if(t.beans<cost)return {ok:false,reason:"晶豆不足（需要 "+cost+"）"};
    t.beans-=cost;t.stars[i]++;mark();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,cost,star:t.stars[i],score:talentScore(cls)};
  }
  function autoAllocateTalent(cls){
    if(!guardTrain().ok)return {ok:false,n:0,reason:"战斗中无法培养角色"};
    let n=0,last=null;
    for(let loop=0;loop<24;loop++){
      let best=null,bc=1e9;
      CFG.TALENT_KEYS.forEach(x=>{
        const c=talentCost(cls,x.k);if(c>=0&&c<bc){bc=c;best=x.k;}
      });
      if(best===null)break;
      const r=upgradeTalent(cls,best);if(!r.ok)break;
      n++;last=best;
    }
    if(n)flush();
    return {ok:n>0,n,last};
  }
  /* v1.4 dev5.1：重置天赋不再「一键清空到 1 星 + 返还晶豆」，
     改为消耗 1 枚【洗髓丹】随机刷新其中一项资质；其余 5 项与晶豆原样保留。
     「快速重组」(rollTalent) 仍是消耗 1 枚洗髓丹重随整套 6 项。 */
  function resetTalent(cls){
    if(!guardTrain().ok)return {ok:false,reason:"战斗中无法培养角色"};
    if((data.inventory.items.rewashPill||0)<=0)
      return {ok:false,reason:"需要洗髓丹 ×1 · 星火港黑市 / 德鲁伊的小摊有售"};
    data.inventory.items.rewashPill--;
    const t=charData(cls).talent;
    const idx=Math.floor(Math.random()*6);
    const before=t.stars[idx];
    /* 随机刷新的一项若与原值相同，玩家会以为「洗了没变化」；最多重抽 8 次，
       仍相同则按 ±1 级保底变化（方向随机），始终停留在 1~BEAN_MAX_STAR。 */
    let after=U.clamp(randomTalentStars()[idx]|0,1,CFG.BEAN_MAX_STAR);
    for(let k=0;k<8&&after===before;k++)
      after=U.clamp(randomTalentStars()[idx]|0,1,CFG.BEAN_MAX_STAR);
    if(after===before){
      const up=before<CFG.BEAN_MAX_STAR&&(before<=1||Math.random()<.5);
      after=U.clamp(before+(up?1:-1),1,CFG.BEAN_MAX_STAR);
    }
    t.stars[idx]=after;
    mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,idx,key:(CFG.TALENT_KEYS[idx]||{}).name||"资质",
      before,after:t.stars[idx],beans:t.beans,
      score:talentScore(cls),tier:tierOf(talentScore(cls)),
      left:data.inventory.items.rewashPill};
  }
  /* 1.3.1 修复：此前存在 free 分支与 randomizeTalent() 两个「不消耗道具」的入口，
     可以无限免费重随 6 项资质刷极品。现在所有重组一律消耗 1 枚【洗髓丹】，
     仅「新角色首次生成天赋」走内部 randomTalentStars()，不经过这里。 */
  function rollTalent(cls){
    if(!guardTrain().ok)return {ok:false,reason:"战斗中无法培养角色"};
    if((data.inventory.items.rewashPill||0)<=0)
      return {ok:false,reason:"没有洗髓丹 · 星火港黑市 / 德鲁伊的小摊有售"};
    data.inventory.items.rewashPill--;
    const t=charData(cls).talent;
    t.stars=randomTalentStars();mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,stars:t.stars.slice(),score:talentScore(cls),tier:tierOf(talentScore(cls))};
  }
  function applyTalentStars(cls,stars){
    if(!guardTrain().ok)return {ok:false,reason:"战斗中无法培养角色"};
    if(!Array.isArray(stars)||stars.length!==6)return {ok:false,reason:"资质数据无效"};
    charData(cls).talent.stars=stars.map(v=>U.clamp(v|0,1,CFG.BEAN_MAX_STAR));
    mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,score:talentScore(cls),tier:tierOf(talentScore(cls))};
  }
  /* 兼容旧调用名：语义已改为与 rollTalent 一致，同样必须消耗洗髓丹 */
  function randomizeTalent(cls){return rollTalent(cls);}
  function setNature(cls,n){
    if(!guardTrain().ok)return {ok:false,reason:"战斗中无法培养角色"};
    if(!CFG.NATURES[n])return {ok:false,reason:"无效性格"};
    charData(cls).nature=n;mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,nature:n};
  }
  function addEffort(cls,key,n){
    if(!guardTrain().ok)return {ok:false,reason:"战斗中无法培养角色"};
    const ev=charData(cls).ev;
    if(!(key in ev))return {ok:false,reason:"无效学习力项"};
    const total=Object.keys(ev).reduce((a,k)=>a+(ev[k]||0),0);
    const room=Math.min(CFG.EFFORT_MAX-(ev[key]||0),CFG.EFFORT_TOTAL-total,n|0);
    if(room<=0)return {ok:false,reason:"该项或总学习力已达上限"};
    ev[key]=(ev[key]||0)+room;mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,add:room,value:ev[key]};
  }
  /* 技能配置：null 表示使用职业默认 4 技能 */
  function equippedSkills(cls){
    const ch=charData(cls),def=CFG.CLASSES[U.clamp(cls|0,0,MAXC)].skills;
    if(!Array.isArray(ch.skills))return def.slice();
    const out=[];
    for(let i=0;i<4;i++)out.push(ch.skills[i]&&CFG.SKILLS[ch.skills[i]]?ch.skills[i]:null);
    return out;
  }
  function setSkill(cls,slot,id){
    if(!guardTrain().ok)return {ok:false,reason:"战斗中无法调整技能"};
    slot=U.clamp(slot|0,0,3);
    /* 1.3.1：未达到学习等级的技能不能装备 */
    if(id&&CFG.SKILLS[id]&&CFG.SKILLS[id].learnLv&&levelOf(cls)<CFG.SKILLS[id].learnLv)
      return {ok:false,reason:"【"+CFG.SKILLS[id].name+"】需要 Lv."+CFG.SKILLS[id].learnLv};
    const c=CFG.CLASSES[U.clamp(cls|0,0,MAXC)];
    if(id!==null&&(c.skillPool.indexOf(id)<0||!CFG.SKILLS[id]))return {ok:false,reason:"该角色无法学习此技能"};
    const ch=charData(cls);
    if(!Array.isArray(ch.skills))ch.skills=c.skills.slice();
    if(id!==null){
      const dup=ch.skills.indexOf(id);
      if(dup>=0&&dup!==slot)ch.skills[dup]=null;
    }
    ch.skills[slot]=id;mark();flush();
    if(CR.ent&&CR.ent.player&&CR.ent.player.cls===cls){
      CR.ent.player.cdMax=equippedSkills(cls).map(s=>s?CFG.SKILLS[s].cd:3);
    }
    if(CR.ui&&CR.ui.buildSkills)CR.ui.buildSkills();
    return {ok:true};
  }
  function hatchSakura(){
    if(data.progress.sakuraHatched)return {ok:false,reason:"夜樱已经入队了"};
    if((data.inventory.items.sakuraEgg||0)<=0)return {ok:false,reason:"没有【夜樱蛋】· 去星火港灯塔下打赢试炼形态夜樱"};
    if(!recruit(3,"夜樱"))return {ok:false,reason:"夜樱已经在队伍或仓库里"};
    data.inventory.items.sakuraEgg--;
    data.progress.sakuraHatched=true;
    /* 1.3.1：孵化后直接到 Lv.10，正好解锁默认 4 个技能（1 / 1 / 5 / 10 级） */
    data.chars[3].level=Math.max(data.chars[3].level|0,10);
    data.chars[3].exp=0;
    mark();flush();
    return {ok:true,name:"夜樱",level:data.chars[3].level};
  }

  /* ================= 1.3.0 有效属性：种族值 + 双轨攻 + 天赋 + 性格 + 学习力 ================= */
  function effStats(cls){
    cls=U.clamp(cls|0,0,MAXC);
    const c=CFG.CLASSES[cls],u=data.profile.upgrades,lv=levelOf(cls)-1;
    const eq=CR.equip?CR.equip.bonus(cls):null;
    const g=k=>eq?eq[k]:0;
    const ch=charData(cls),stars=ch.talent.stars,ev=ch.ev;
    const nat=CFG.NATURES[ch.nature]||{up:null,down:null};
    const race=c.race||{hp:80,atk:70,matk:70,pdef:70,mdef:70,spd:70};
    const tm=i=>1+stars[i]*.02;                 // 每星 +2%
    const nm=k=>k===nat.up?1.1:(k===nat.down?.9:1);
    const evv=k=>k==="hp"?(ev.hp||0):Math.floor((ev[k]||0)/4);
    const baseMatk=c.magic?Math.round(c.atk*1.45):Math.round(c.atk*.45);
    let hp=(c.hp+u.hp*12+lv*(7+race.hp/40)+g("hp")+evv("hp"))*tm(4)*nm("hp");
    let atk=(c.atk+u.atk*2+lv*(.9+race.atk/200)+g("atk")+evv("atk"))*tm(0)*nm("atk");
    let matk=(baseMatk+lv*(.9+race.matk/200)+g("matk")+evv("matk"))*tm(1)*nm("matk");
    /* 1.4 dev1.4：装备 pdef / mdef 分别接入双防（旧 armor 字段兼容折算到物防） */
    let pdef=(c.armor+u.armor*1.5+lv*(.4+race.pdef/260)+evv("pdef")+g("pdef")+g("armor"))*tm(2)*nm("pdef");
    let mdef=(c.armor*.7+lv*(.35+race.mdef/260)+evv("mdef")+g("mdef"))*tm(3)*nm("mdef");
    let spd=(c.spd*(1+u.spd*.03)+lv*.006+g("spd")+Math.floor((ev.spd||0)/4)/60)*tm(5)*nm("spd");
    let crit=c.crit+u.crit*.015+lv*.002+g("crit");
    let range=c.range+g("range");
    let atkCd=c.atkCd/(1+(eq?eq.atkSpd:0));
    if(eq){hp*=1+eq.hpPct;atk*=1+eq.atkPct;matk*=1+eq.atkPct;spd*=1+eq.spdPct;}
    const hit=U.clamp(.92+lv*.0008+g("hit"),0,1);
    const dodge=U.clamp(.05+spd*.004+g("dodge"),0,.55);
    return {hp:Math.round(hp),atk:+atk.toFixed(1),matk:+matk.toFixed(1),
      pdef:+pdef.toFixed(1),mdef:+mdef.toFixed(1),
      spd:+spd.toFixed(3),crit:+crit.toFixed(3),armor:+pdef.toFixed(1),
      range:Math.round(range),atkCd:+atkCd.toFixed(3),level:levelOf(cls),
      hit:+hit.toFixed(3),dodge:+dodge.toFixed(3),
      critDmg:g("critDmg"),dmgReduce:g("dmgReduce"),energyKill:g("energyKill"),
      meleeRange:g("meleeRange")};
  }
  function upgradeCost(id){
    const u=CFG.UPGRADES.find(x=>x.id===id),lv=data.profile.upgrades[id]||0;
    return u.cost.map((m,i)=>({m,n:(i+1)*(lv+1)*2}));}
  function canUpgrade(id){return upgradeCost(id).every(r=>data.inventory.mats[r.m]>=r.n);}
  function doUpgrade(id){if(!guardTrain().ok)return false;if(!canUpgrade(id))return false;
    upgradeCost(id).forEach(r=>data.inventory.mats[r.m]-=r.n);
    data.profile.upgrades[id]=(data.profile.upgrades[id]||0)+1;mark();return true;}
  function setName(n){n=String(n||"").trim().slice(0,12);data.profile.name=n||"无名勇者";mark();}

  /* ---------- 队伍 ---------- */
  function teamClass(i){return data.team.order[i];}
  function teamName(i){return data.team.names[i]||"空位";}
  function setTeamName(i,n){
    n=String(n||"").trim().slice(0,10);
    data.team.names[i]=n||(data.team.order[i]!==null?CFG.CLASSES[data.team.order[i]].defName:null);
    mark();}
  function setTeamOrder(arr){
    data.team.order=arr.slice(0,4).map(v=>v===null||v===undefined?null:U.clamp(v|0,0,MAXC));
    data.team.names=arr.slice(0,4).map((v,i)=>v===null||v===undefined?null:(data.team.names[i]||CFG.CLASSES[v].defName));
    while(data.team.order.length<4)data.team.order.push(null);
    while(data.team.names.length<4)data.team.names.push(null);
    fixTeam(data);mark();}
  function swapTeam(a,b){
    if(a<0||b<0||a>3||b>3||a===b)return;
    const o=data.team.order,n=data.team.names;
    const t=o[a];o[a]=o[b];o[b]=t;
    const t2=n[a];n[a]=n[b];n[b]=t2;
    if(o[data.team.active]===null||data.team.active===a||data.team.active===b)data.team.active=0;
    fixTeam(data);mark();}
  function moveTeam(from,to){swapTeam(from,to);}
  function setActive(i){
    if(data.team.order[i]===null)return false;
    data.team.active=U.clamp(i|0,0,3);mark();return true;}
  function setLeaderClass(cls){
    cls=U.clamp(cls|0,0,MAXC);
    const others=[0,1,2,3].filter(c=>c!==cls);
    const old=data.team.order.slice();
    /* 1.4 dev1.4：原实现用 old.indexOf(c) 过滤，一旦 4 号位角色不在旧队伍里
       就会被永久丢弃。改为基于旧队伍全量去重，保留全部已拥有角色。 */
    const rest=old.filter(c=>c!==null&&c!==cls)
      .concat(others.filter(c=>old.indexOf(c)<0&&(c!==3||data.progress.sakuraHatched||data.progress.eggGranted)));
    const seq=[cls];
    for(const c of rest)if(c!==cls&&!seq.includes(c)&&seq.length<4)seq.push(c);
    while(seq.length<4)seq.push(null);
    const names=seq.map(c=>{
      if(c===null)return null;
      const j=old.indexOf(c);return (j>=0?data.team.names[j]:null)||CFG.CLASSES[c].defName;});
    data.team.order=seq;data.team.names=names;data.team.active=0;
    fixTeam(data);mark();}

  /* ---------- 1.2.0 角色仓库（战斗锁定） ---------- */
  /* 对战中禁止把仓库角色放入出战队列，也禁止把出战角色入库；
     只有战斗解除（当前区域无敌对单位 / BOSS 已倒下 / 试炼结束）后才可编队 */
  function teamEditLocked(){
    try{return !!(CR.game&&CR.game.inCombat&&CR.game.inCombat());}catch(e){return false;}
  }
  function guardTeamEdit(){
    if(teamEditLocked())return {ok:false,reason:"战斗中无法调整队伍：请先脱离仇恨或清完敌人"};
    return {ok:true};
  }
  /* 1.3.1：升级 / 天赋 / 性格 / 学习力 / 洗髓 / 属性强化统一在战斗中锁定 */
  function guardTrain(){
    if(teamEditLocked())return {ok:false,reason:"战斗中无法培养角色：请先脱离仇恨或清完敌人"};
    return {ok:true};
  }
  function warehouseList(){return data.warehouse.slice();}
  function warehouseCount(){return data.warehouse.length;}
  function moveToWarehouse(i){
    const g=guardTeamEdit();if(!g.ok)return g;
    i=U.clamp(i|0,0,3);
    if(data.team.order[i]===null)return {ok:false,reason:"该位置没有角色"};
    const filled=data.team.order.filter(c=>c!==null).length;
    if(filled<=1)return {ok:false,reason:"出战队列至少要保留 1 名角色"};
    const cls=data.team.order[i],name=data.team.names[i]||CFG.CLASSES[cls].defName;
    data.warehouse.push({cls,name});
    data.team.order[i]=null;data.team.names[i]=null;
    if(i===data.team.active||data.team.order[data.team.active]===null)data.team.active=0;
    fixTeam(data);mark();
    return {ok:true,cls,name};
  }
  function moveFromWarehouse(idx,toSlot){
    const g=guardTeamEdit();if(!g.ok)return g;
    idx=U.clamp(idx|0,0,data.warehouse.length-1);
    const w=data.warehouse[idx];if(!w)return {ok:false,reason:"仓库里没有这个角色"};
    let slot=(toSlot===undefined||toSlot===null)?-1:U.clamp(toSlot|0,0,3);
    if(slot<0){for(let i=0;i<4;i++)if(data.team.order[i]===null){slot=i;break;}}
    if(slot<0)return {ok:false,reason:"出战队列已满，请先移入一位角色到仓库"};
    if(data.team.order[slot]!==null){
      // 指定位置有人 → 与仓库角色交换
      const old=data.team.order[slot],oldName=data.team.names[slot]||CFG.CLASSES[old].defName;
      data.team.order[slot]=w.cls;data.team.names[slot]=w.name;
      data.warehouse[idx]={cls:old,name:oldName};
    }else{
      data.team.order[slot]=w.cls;data.team.names[slot]=w.name;
      data.warehouse.splice(idx,1);
    }
    fixTeam(data);mark();
    return {ok:true,cls:w.cls,slot};
  }
  function swapTeamWithWarehouse(slot,idx){return moveFromWarehouse(idx,slot);}
  /* 未来新角色入队：队列满时自动进仓库（1.3.0 夜樱孵化走这里） */
  function recruit(cls,name){
    cls=U.clamp(cls|0,0,MAXC);
    if(data.team.order.indexOf(cls)>=0||data.warehouse.some(w=>w.cls===cls))return false;
    let slot=-1;for(let i=0;i<4;i++)if(data.team.order[i]===null){slot=i;break;}
    if(slot>=0){data.team.order[slot]=cls;data.team.names[slot]=name||CFG.CLASSES[cls].defName;}
    else data.warehouse.push({cls,name:name||CFG.CLASSES[cls].defName});
    fixTeam(data);mark();return true;
  }

  /* ---------- 1.2.0 每日采集 / 试炼（按北京时间自然日） ---------- */
  function beijingDay(){
    const now=new Date();
    const utc=now.getTime()+now.getTimezoneOffset()*60000;
    const bj=new Date(utc+8*3600000);
    return bj.getFullYear()+"-"+String(bj.getMonth()+1).padStart(2,"0")+"-"+
      String(bj.getDate()).padStart(2,"0");
  }
  function dailyReset(){
    const day=beijingDay(),p=data.progress;
    if(p.gatherDay!==day){p.gatherDay=day;p.gatherCount={};mark();}
    if(p.trialDay!==day){p.trialDay=day;p.trialUsed=0;mark();}
    return day;
  }
  function gatherUsed(id){dailyReset();return Math.max(0,data.progress.gatherCount[id]|0);}
  function nodeById(id){
    return CFG.HARBOR_NODES.find(x=>x.id===id)||
      (CFG.FOREST_NODES||[]).find(x=>x.id===id)||
      (CFG.SWAMP_NODES||[]).find(x=>x.id===id)||
      (CFG.BORDER_NODES||[]).find(x=>x.id===id)||
      (CFG.UNI_NODES||[]).find(x=>x.id===id);
  }
  function gatherLeft(id){
    const n=nodeById(id);
    return n?Math.max(0,n.daily-gatherUsed(id)):0;
  }
  function useGather(id){
    const n=nodeById(id);if(!n)return false;
    dailyReset();
    if(gatherUsed(id)>=n.daily)return false;
    data.progress.gatherCount[id]=gatherUsed(id)+1;mark();return true;
  }
  function trialLeft(){dailyReset();return Math.max(0,(CFG.TRIAL?CFG.TRIAL.limit:10)-data.progress.trialUsed);}
  function trialUsed(){dailyReset();return data.progress.trialUsed;}
  function useTrial(){
    dailyReset();
    if(trialLeft()<=0)return false;
    data.progress.trialUsed++;mark();flush();return true;
  }
  function winTrial(){
    data.progress.trialWins++;
    /* 1.3.1 修复：夜樱蛋全局只发一次，重复挑战改为金币补偿 */
    if(!data.progress.eggGranted){
      data.progress.eggGranted=true;
      addItem(CFG.TRIAL.egg,1);
      mark();flush();
      return {egg:true,gold:0};
    }
    addGold(120);mark();flush();
    return {egg:false,gold:120};
  }
  function sellPrice(id){
    const m=CFG.MATERIALS[id],base=m&&m.sell?m.sell:(CFG.TRADE_PRICE[id]||6);
    return Math.max(1,Math.round(base));
  }
  function sellMat(id,n){
    id=String(id);n=Math.max(1,Math.round(n||1));
    if(!CFG.MATERIALS[id])return {ok:false,reason:"无法出售的物品"};
    const have=data.inventory.mats[id]||0;
    if(have<n)return {ok:false,reason:"数量不足"};
    data.inventory.mats[id]=have-n;
    const gold=sellPrice(id)*n;
    addGold(gold);mark();flush();
    return {ok:true,gold,n,id};
  }

  /* ---------- 道具槽 ---------- */
  function setSlot(i,id){
    i=U.clamp(i|0,0,1);
    if(id===null){data.slots[i]=null;mark();return true;}
    const it=CFG.ITEMS[id];
    if(!it||it.noSlot)return false;            // 经验果 / 养成道具不可放入战斗槽
    if((data.inventory.items[id]||0)<=0)return false;
    if(data.slots[1-i]===id)return false;
    data.slots[i]=id;mark();return true;}
  function clearSlot(i){data.slots[U.clamp(i|0,0,1)]=null;mark();}

  /* ---------- 地图进度 ---------- */
  function clearDusk(){
    data.progress.duskCleared=true;data.progress.mapUnlocked=true;mark();flush();}
  function mapUnlocked(id){
    const m=CFG.MAPS.find(x=>x.id===id);if(!m||!m.unlock)return true;
    /* v1.4 dev4.1：魔法大学城改为完成入学链才开放，不再跟 duskCleared 走 */
    if(m.unlock==="cityPermit")return !!data.progress.cityPermit;
    if(!!data.progress[m.unlock])return true;
    /* 1.4 dev1.1：旧档兼容。1.0 用 mapUnlocked 字段点亮大地图按钮；
       而能进过集市 / 星火港 / 魔法丛林本身即证明已通关黄昏城堡。 */
    if(m.unlock==="duskCleared"){
      if(data.progress.mapUnlocked)return true;
      const p=data.progress;
      if((p.marketVisits||0)>0||(p.harborVisits||0)>0||(p.forestVisits||0)>0||
         (p.swampVisits||0)>0||(p.borderVisits||0)>0)return true;
    }
    return false;}
  /* ---------- v1.4 dev4.1 入学前置 ---------- */
  function enroll(){
    if(!data.progress.enroll||typeof data.progress.enroll!=="object")
      data.progress.enroll={stage:0,badge:null};
    return data.progress.enroll;
  }
  function setEnrollStage(n,badge){
    const e=enroll();e.stage=U.clamp(n|0,0,3);
    if(badge!==undefined)e.badge=badge;
    mark();flush();return e;
  }
  function grantCityPermit(){
    data.progress.cityPermit=true;enroll().stage=3;mark();flush();
  }
  function hasEntryPass(){return (data.inventory.mats[CFG.ENTRY_PASS]||0)>0;}
  function badgeFor(level){
    const t=CFG.APP_BADGES||[];
    for(const b of t)if((level|0)>=b.min)return b;
    return t[t.length-1]||{id:"badgeCopper",name:"铜级"};
  }
  function markBounty(day){
    data.progress.bountyDay=day;data.progress.bountyTaken=true;
    data.progress.bountyGift=true;mark();flush();}
  function bountyAvailable(day){
    return data.progress.bountyDay!==day||!data.progress.bountyTaken;}
  function visitMarket(){data.progress.marketVisits++;mark();}
  function markVersionSeen(){data.meta.lastSeenVersion=CFG.VERSION;
    data.meta.changelogRead=true;mark();flush();}
  function hasUnreadVersion(){return data.meta.lastSeenVersion!==CFG.VERSION;}

  /* ---------- 背包 / 战绩 ---------- */
  function addGold(n){n=Math.max(0,Math.round(n));data.profile.gold+=n;
    data.stats.totalGold+=n;mark();return n;}
  function spendGold(n){n=Math.max(0,Math.round(n));
    if(data.profile.gold<n)return false;data.profile.gold-=n;mark();return true;}
  function addMat(id,n){n=n||1;data.inventory.mats[id]=(data.inventory.mats[id]||0)+n;
    data.stats.collected[id]=(data.stats.collected[id]||0)+n;mark();return n;}
  function addItem(id,n){n=n||1;data.inventory.items[id]=(data.inventory.items[id]||0)+n;
    data.stats.collected[id]=(data.stats.collected[id]||0)+n;mark();return n;}
  /* v1.4 dev5：副件（神兵）独立背包，与 EQUIPMENT 完全隔离 */
  function addSpirit(id,n){n=n||1;if(!CFG.SPIRITS||!CFG.SPIRITS[id])return 0;
    data.spirits[id]=(data.spirits[id]||0)+n;mark();return n;}
  function spiritCount(id){return (data.spirits&&data.spirits[id])|0;}
  function ownedSpirits(){const out=[];
    for(const id in (CFG.SPIRITS||{}))if((data.spirits[id]||0)>0)out.push({id,n:data.spirits[id],it:CFG.SPIRITS[id]});
    return out;}
  function addEquip(id,n){n=n||1;if(!CFG.EQUIPMENT[id])return 0;
    data.inventory.equips[id]=(data.inventory.equips[id]||0)+n;
    data.stats.collected[id]=(data.stats.collected[id]||0)+n;mark();return n;}
  function useItem(id,cls){
    if((data.inventory.items[id]||0)<=0)return null;
    const it=CFG.ITEMS[id];
    if(!it)return null;
    /* 1.4 dev1：标记为「当前版本未开启」的预留道具不可误消耗 */
    if(it.disabled)return {blocked:true,msg:"【"+it.name+"】"+((it.desc||"").split("。")[0])+
      " · 该系统将在后续 dev 开启，道具已保留"};
    /* 1.3.0 养成道具：先打开对应面板预览 / 选择，确认后才真正消耗 */
    if(it.type==="rewash"||it.type==="persona"||it.type==="effort"||it.type==="egg")
      return Object.assign({},it,{deferred:true});
    /* 1.3.1 德鲁伊养成道具：战斗中锁定，生效后立即消耗 */
    if(it.type==="personaReroll"||it.type==="effortSmall"||
       it.type==="effortForget"||it.type==="resetLevel"){
      const g=guardTrain();if(!g.ok)return {blocked:true,msg:g.reason};
      let r;
      if(it.type==="personaReroll")r=rerollNature(cls);
      else if(it.type==="effortSmall")r=addEffort(cls,it.effortKey,5);
      else if(it.type==="effortForget")r=forgetEffort(cls);
      else r=resetLevelKeepSkills(cls);
      if(!r.ok)return {blocked:true,msg:r.reason};
      data.inventory.items[id]--;
      mark();flush();
      return Object.assign({},it,{msg:r.msg||"已生效"});
    }
    let result=null;
    if(it.type==="exp"||it.type==="expPool"||it.type==="expPoolRand"||it.type==="levelUp"){
      result=useExpItem(id,cls);
      if(!result.ok)return {blocked:true,msg:result.msg};
    }
    data.inventory.items[id]--;
    for(let i=0;i<2;i++)if(data.slots[i]===id&&data.inventory.items[id]<=0)data.slots[i]=null;
    mark();
    return Object.assign({},it,result||{});
  }
  function consumeItem(id){
    if((data.inventory.items[id]||0)<=0)return false;
    data.inventory.items[id]--;mark();flush();return true;
  }
  /* ================= 1.3.1 德鲁伊孵化室（3 个蛋巢 / 300 时间） ================= */
  function hatchStatus(i){
    i=U.clamp(i|0,0,2);
    const n=data.hatchery.nests[i];
    if(!n)return {state:"empty",progress:0,left:0};
    const need=(CFG.HATCHERY?CFG.HATCHERY.needTime:300)*1000;
    const t=Math.max(0,Date.now()-n.start);
    const k=U.clamp(t/need,0,1);
    return {state:k>=1?"ready":"incubating",progress:k,
      left:Math.max(0,Math.ceil((need-t)/1000)),egg:n.egg};
  }
  function startHatch(i){
    i=U.clamp(i|0,0,2);
    if(data.hatchery.nests[i])return {ok:false,reason:"这个蛋巢里已经有蛋了"};
    if(data.progress.sakuraHatched)return {ok:false,reason:"夜樱已经在队伍里了，不用再孵"};
    if((data.inventory.items.sakuraEgg||0)<=0)
      return {ok:false,reason:"没有【夜樱蛋】· 去星火港灯塔下打赢试炼形态夜樱"};
    data.inventory.items.sakuraEgg--;
    data.hatchery.nests[i]={start:Date.now(),egg:"sakuraEgg"};
    data.progress.eggGranted=true;
    mark();flush();
    return {ok:true,slot:i,need:CFG.HATCHERY?CFG.HATCHERY.needTime:300};
  }
  function collectHatch(i){
    i=U.clamp(i|0,0,2);
    const st=hatchStatus(i);
    if(st.state!=="ready")return {ok:false,reason:"还没有孵化完成"};
    data.hatchery.nests[i]=null;
    if(!data.progress.sakuraHatched&&recruit(3,"夜樱")){
      data.progress.sakuraHatched=true;data.progress.eggGranted=true;
      const ch=charData(3);ch.level=Math.max(ch.level|0,10);ch.exp=0;
      mark();flush();
      return {ok:true,newChar:true,name:"夜樱",level:ch.level};
    }
    /* 已有夜樱时：额外孵出的蛋转化为金币与材料补偿 */
    addGold(300);addMat("crystal",2);
    mark();flush();
    return {ok:true,newChar:false,compensation:true,gold:300};
  }
  function hatchNests(){return data.hatchery.nests.slice(0,3);}

  /* ================= 1.3.1 德鲁伊的小摊：每日 / 每周限量 ================= */
  function periodKey(period){
    const day=beijingDay();
    if(period!=="weekly")return "d"+day;
    const d=new Date(day+"T00:00:00Z"),wd=(d.getUTCDay()+6)%7;
    return "w"+new Date(d.getTime()-wd*86400000).toISOString().slice(0,10);
  }
  function druidLeft(row){
    const k=periodKey(row.period)+"|"+row.id;
    return Math.max(0,(row.limit||1)-(data.druidBought[k]||0));
  }
  function druidBuy(id){
    const row=(CFG.DRUID_GOODS||[]).find(r=>r.id===id);
    if(!row)return {ok:false,reason:"没有这件商品"};
    const left=druidLeft(row);
    if(left<=0)return {ok:false,reason:"本"+(row.period==="weekly"?"周":"日")+"限购已用完"};
    if(!spendGold(row.price))return {ok:false,reason:"金币不够啦"};
    const k=periodKey(row.period)+"|"+row.id;
    data.druidBought[k]=(data.druidBought[k]||0)+1;
    addItem(id,1);mark();flush();
    return {ok:true,left:left-1,name:(CFG.ITEMS[id]||{}).name||id};
  }
  function druidBoughtInfo(){return Object.assign({},data.druidBought);}

  /* ================= 1.3.1 新养成道具对应的角色操作 ================= */
  function rerollNature(cls){
    const g=guardTrain();if(!g.ok)return g;
    const keys=CFG.NATURE_KEYS,cur=charData(cls).nature;
    let n=cur,guard=0;
    while(n===cur&&guard++<30)n=keys[Math.floor(Math.random()*keys.length)];
    charData(cls).nature=n;mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,nature:n,msg:"性格改为【"+n+"】"};
  }
  function forgetEffort(cls){
    const g=guardTrain();if(!g.ok)return g;
    const ev=charData(cls).ev;
    CFG.TALENT_KEYS.forEach(x=>ev[x.k]=0);
    mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,msg:"6 项学习力已全部归零"};
  }
  function resetLevelKeepSkills(cls){
    const g=guardTrain();if(!g.ok)return g;
    const ch=charData(cls);ch.level=1;ch.exp=0;
    mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,msg:"已回到 Lv.1 · 技能配置与装备保留"};
  }
  function setCharLevel(cls,lv){
    const ch=charData(cls);
    ch.level=U.clamp(lv|0,1,CFG.MAX_LEVEL);ch.exp=0;
    mark();flush();
    if(CR.team&&CR.team.applyStats)CR.team.applyStats();
    return {ok:true,level:ch.level};
  }
  function questAvailable(){
    if(data.questDone)return {ok:false,reason:"薇薇安的委托已经完成了"};
    const q=CFG.FOREST_QUEST;
    for(const k in q.need)
      if((data.inventory.mats[k]||0)<q.need[k])return {ok:false,reason:"材料还不够"};
    return {ok:true};
  }
  function finishQuest(){
    const a=questAvailable();if(!a.ok)return a;
    const q=CFG.FOREST_QUEST;
    for(const k in q.need)data.inventory.mats[k]-=q.need[k];
    addGold(q.reward.gold);
    for(const k in q.reward.items)addItem(k,q.reward.items[k]);
    data.questDone=true;mark();flush();
    return {ok:true,gold:q.reward.gold};
  }

  function recordRun(win,kills,combo,gold,secs){
    data.stats.runs++;if(win)data.stats.wins++;
    data.stats.kills+=kills;data.stats.playTime+=secs;
    data.stats.bestCombo=Math.max(data.stats.bestCombo,combo);
    data.stats.history.push({t:Date.now(),win,kills,combo,gold,sec:Math.round(secs)});
    if(data.stats.history.length>12)data.stats.history.shift();
    mark();flush();}
  function wipe(){data=blank();CR.store.clear("castleRaid.save.v1");
    CR.store.clear("castleRaid.save.v3");flush();}

  CR.save={get data(){return data;},get level(){return levelOf(curCls());},
    get rosterRepair(){return lastRosterRepair.slice();},
    load,flush,mark,tick,usage,setSetting,setBinding,resetBindings,
    effStats,charLevel,levelOf,expNeed,expNeedAt,addExp,addExpPool,expToMax,
    allocateExp,useExpItem,
    upgradeCost,canUpgrade,doUpgrade,setName,
    teamClass,teamName,setTeamName,setTeamOrder,swapTeam,moveTeam,setActive,setLeaderClass,
    teamEditLocked,guardTeamEdit,guardTrain,warehouseList,warehouseCount,moveToWarehouse,
    moveFromWarehouse,swapTeamWithWarehouse,recruit,
    beijingDay,dailyReset,gatherUsed,gatherLeft,useGather,trialLeft,trialUsed,useTrial,winTrial,
    sellPrice,sellMat,
    setSlot,clearSlot,clearDusk,mapUnlocked,markBounty,bountyAvailable,visitMarket,
    enroll,setEnrollStage,grantCityPermit,hasEntryPass,badgeFor,
    markVersionSeen,hasUnreadVersion,
    addGold,spendGold,addMat,addItem,addEquip,addSpirit,spiritCount,ownedSpirits,useItem,consumeItem,recordRun,wipe,
    charData,randomTalentStars,talentScore,tierOf,talentOf,talentCost,
    upgradeTalent,autoAllocateTalent,resetTalent,rollTalent,randomizeTalent,applyTalentStars,
    setNature,addEffort,equippedSkills,setSkill,hatchSakura,nodeById,
    hatchStatus,startHatch,collectHatch,hatchNests,
    druidLeft,druidBuy,druidBoughtInfo,
    rerollNature,forgetEffort,resetLevelKeepSkills,setCharLevel,
    questAvailable,finishQuest,
    get lastResult(){return lastResult;}};
})(window.CR=window.CR||{});
