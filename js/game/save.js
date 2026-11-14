/* save.js — 持久化数据模型：设置、角色档案、背包、强化、键位 */
(function(CR){
  "use strict";
  const CFG=CR.CFG;
  function blank(){
    return {
      version:3,
      settings:{
        sfx:true,music:true,musicVol:.55,sfxVol:.75,quality:"high",
        bindings:Object.assign({},CFG.DEFAULT_BINDINGS)
      },
      profile:{
        name:"无名勇者",cls:0,level:1,exp:0,gold:0,
        upgrades:{hp:0,atk:0,spd:0,crit:0,armor:0}
      },
      inventory:{mats:{iron:0,dust:0,hide:0,crystal:0,rune:0,ember:0},
                 items:{potion:2,tonic:1,charm:0,feather:0,bomb:0}},
      stats:{kills:0,wins:0,runs:0,bestCombo:0,totalGold:0,playTime:0,
             collected:{},history:[]},
      log:[]
    };
  }
  let data=blank();
  let dirty=false,saveTimer=0,lastResult={ok:true,reason:"",bytes:0};

  function load(){
    const raw=CR.store.read();
    data=blank();
    if(raw&&typeof raw==="object"){
      if(raw.settings){
        const s=raw.settings;
        data.settings.sfx=s.sfx!==false;
        data.settings.music=s.music!==false;
        data.settings.musicVol=CR.u.clamp(Number(s.musicVol)||0,0,1);
        data.settings.sfxVol=CR.u.clamp(Number(s.sfxVol)||0,0,1);
        data.settings.quality=CFG.QUALITY[s.quality]?s.quality:"high";
        data.settings.bindings=Object.assign({},CFG.DEFAULT_BINDINGS,s.bindings||{});
      }
      if(raw.profile){
        Object.assign(data.profile,raw.profile);
        data.profile.upgrades=Object.assign({hp:0,atk:0,spd:0,crit:0,armor:0},raw.profile.upgrades||{});
        data.profile.level=Math.max(1,data.profile.level|0);
        data.profile.cls=CR.u.clamp(data.profile.cls|0,0,2);
      }
      if(raw.inventory){
        for(const k in data.inventory.mats)data.inventory.mats[k]=Math.max(0,(raw.inventory.mats||{})[k]|0);
        for(const k in data.inventory.items)data.inventory.items[k]=Math.max(0,(raw.inventory.items||{})[k]|0);
      }
      if(raw.stats){
        Object.assign(data.stats,raw.stats);
        data.stats.collected=raw.stats.collected||{};
        data.stats.history=(raw.stats.history||[]).slice(-12);
      }
    }
    lastResult=CR.store.usage();
    return data;
  }
  function flush(){
    const r=CR.store.write(data);
    lastResult={ok:r.ok,reason:r.reason,bytes:r.bytes||CR.store.usage().used};
    dirty=false;
    return lastResult;
  }
  function mark(){dirty=true;}
  function tick(dt){
    if(!dirty)return;
    saveTimer+=dt;
    if(saveTimer>1.2){saveTimer=0;flush();}
  }
  function usage(){const u=CR.store.usage();u.used=Math.max(u.used,lastResult.bytes||0);return u;}

  /* ---------- 设置 ---------- */
  function setSetting(k,v){data.settings[k]=v;mark();}
  function setBinding(action,code){
    const b=data.settings.bindings;
    // 与已有绑定冲突时交换，保证不会两个动作抢同一个键
    for(const a in b)if(a!==action&&b[a]===code){b[a]=b[action];break;}
    b[action]=code;mark();return b;
  }
  function resetBindings(){data.settings.bindings=Object.assign({},CFG.DEFAULT_BINDINGS);mark();}

  /* ---------- 角色 ---------- */
  function effStats(){
    const c=CFG.CLASSES[data.profile.cls],u=data.profile.upgrades,lv=data.profile.level-1;
    return {
      hp:Math.round(c.hp+u.hp*12+lv*6),
      atk:+(c.atk+u.atk*2+lv*.7).toFixed(1),
      spd:+(c.spd*(1+u.spd*.03)+lv*.004).toFixed(3),
      crit:+(c.crit+u.crit*.015+lv*.002).toFixed(3),
      armor:+(c.armor+u.armor*1.5+lv*.4).toFixed(1),
      range:c.range,atkCd:c.atkCd
    };
  }
  function expNeed(lv){return 60+lv*45;}
  function addExp(n){
    data.profile.exp+=n;
    let up=0;
    while(data.profile.exp>=expNeed(data.profile.level)){
      data.profile.exp-=expNeed(data.profile.level);
      data.profile.level++;up++;
    }
    mark();return up;
  }
  function upgradeCost(id){
    const u=CFG.UPGRADES.find(x=>x.id===id),lv=data.profile.upgrades[id]||0;
    return u.cost.map((m,i)=>({m,n:(i+1)*(lv+1)*2}));
  }
  function canUpgrade(id){return upgradeCost(id).every(r=>data.inventory.mats[r.m]>=r.n);}
  function doUpgrade(id){
    if(!canUpgrade(id))return false;
    upgradeCost(id).forEach(r=>{data.inventory.mats[r.m]-=r.n;});
    data.profile.upgrades[id]=(data.profile.upgrades[id]||0)+1;
    mark();return true;
  }
  function setName(n){
    n=String(n||"").trim().slice(0,12);
    data.profile.name=n||"无名勇者";mark();
  }

  /* ---------- 背包 ---------- */
  function addGold(n){
    n=Math.max(0,Math.round(n));
    data.profile.gold+=n;data.stats.totalGold+=n;mark();return n;
  }
  function addMat(id,n){
    n=n||1;
    data.inventory.mats[id]=(data.inventory.mats[id]||0)+n;
    data.stats.collected[id]=(data.stats.collected[id]||0)+n;
    mark();return n;
  }
  function addItem(id,n){
    n=n||1;
    data.inventory.items[id]=(data.inventory.items[id]||0)+n;
    data.stats.collected[id]=(data.stats.collected[id]||0)+n;
    mark();return n;
  }
  function useItem(id){
    if((data.inventory.items[id]||0)<=0)return null;
    data.inventory.items[id]--;mark();
    return CFG.ITEMS[id];
  }
  function recordRun(win,kills,combo,gold,secs){
    data.stats.runs++;if(win)data.stats.wins++;
    data.stats.kills+=kills;data.stats.playTime+=secs;
    data.stats.bestCombo=Math.max(data.stats.bestCombo,combo);
    data.stats.history.push({t:Date.now(),win,kills,combo,gold,sec:Math.round(secs)});
    if(data.stats.history.length>12)data.stats.history.shift();
    mark();flush();
  }
  function wipe(){data=blank();CR.store.clear();flush();}

  CR.save={get data(){return data;},load,flush,mark,tick,usage,setSetting,setBinding,
    resetBindings,effStats,expNeed,addExp,upgradeCost,canUpgrade,doUpgrade,setName,
    addGold,addMat,addItem,useItem,recordRun,wipe,
    get lastResult(){return lastResult;}};
})(window.CR=window.CR||{});
