/* team.js — 原神式队伍：最多 4 位，1 号位出战，数字键区 1~4 随时切换登场 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save,E=CR.ent,P=E.player;
  let slotState=[null,null,null,null];
  let switchCd=0;

  function snapshot(i){
    if(i<0||i>3)return;
    slotState[i]={hp:P.hp,maxHp:P.maxHp,energy:P.energy,
      cd:P.cd.slice(),buff:{dmg:P.buff.dmg,spd:P.buff.spd,shield:P.buff.shield,t:P.buff.t},
      dead:P.dead};
  }
  function applyClass(cls,name){
    const c=CFG.CLASSES[cls],st=SV.effStats(cls);
    P.cls=cls;P.name=name||CFG.CLASSES[cls].defName;
    P.maxHp=st.hp;P.atk=st.atk;P.spd=st.spd;P.crit=st.crit;P.armor=st.armor;
    P.range=c.range;P.atkCd=st.atkCd;
    P.cdMax=(SV.equippedSkills?SV.equippedSkills(cls):c.skills).map(s=>s?(CFG.SKILLS[s]||{}).cd||3:3);
    P.level=SV.levelOf(cls);
  }
  function restore(i,cls){
    const s=slotState[i],st=SV.effStats(cls);
    if(s){
      P.maxHp=st.hp;
      P.hp=U.clamp(Math.round(s.hp/Math.max(1,s.maxHp)*st.hp),0,st.hp);
      P.energy=U.clamp(s.energy,0,P.maxEnergy);
      for(let k=0;k<4;k++)P.cd[k]=Math.min(s.cd[k]||0,P.cdMax[k]);
      P.buff.dmg=s.buff.dmg;P.buff.spd=s.buff.spd;
      P.buff.shield=s.buff.shield;P.buff.t=s.buff.t;
      /* 1.4 dev1.4：阵亡状态必须保留，旧版在这里无条件 P.dead=false，
         导致死亡队友被切回来就自动满血复活。 */
      if(s.dead){P.hp=0;P.dead=true;}
      else{P.dead=false;if(P.hp<=0)P.hp=Math.max(1,Math.round(st.hp*.3));}
    }else{
      P.maxHp=st.hp;P.hp=st.hp;P.energy=0;
      for(let k=0;k<4;k++)P.cd[k]=0;
      P.buff.dmg=0;P.buff.spd=0;P.buff.shield=0;P.buff.t=0;P.dead=false;
      /* 1.4 dev1.1：切换角色按新角色装备重新判定套装守护与视觉 */
      P.sakuraGuardCd=0;P.sakuraBuffT=0;P.sakuraArmed=true;
      P.petalAura=false;P.petalT=0;
    }
  }
  function init(){
    slotState=[null,null,null,null];switchCd=0;
    const i=U.clamp(SV.data.team.active|0,0,3);
    let idx=i;
    if(SV.teamClass(idx)===null){idx=0;SV.setActive(0);}
    const cls=SV.teamClass(idx)||0;
    E.reset(cls);
    applyClass(cls,SV.teamName(idx));
    P.hp=P.maxHp;P.energy=0;
    slotState[idx]={hp:P.hp,maxHp:P.maxHp,energy:0,cd:[0,0,0,0],
      buff:{dmg:0,spd:0,shield:0,t:0},dead:false};
  }
  function current(){return U.clamp(SV.data.team.active|0,0,3);}
  function isDead(i){
    if(i<0||i>3)return true;
    const s=slotState[i];
    return s?s.dead===true:false;
  }
  function canSwitch(i){return i>=0&&i<4&&SV.teamClass(i)!==null&&!isDead(i);}
  function markDead(i){
    if(i<0||i>3)return;
    snapshot(i);
    if(!slotState[i])slotState[i]={hp:0,maxHp:P.maxHp,energy:0,cd:P.cd.slice(),
      buff:{dmg:0,spd:0,shield:0,t:0},dead:true};
    slotState[i].dead=true;slotState[i].hp=0;
  }
  function aliveSlots(){
    const a=[];
    for(let i=0;i<4;i++)if(SV.teamClass(i)!==null&&!isDead(i))a.push(i);
    return a;
  }
  function nextAlive(from){
    const a=aliveSlots();
    if(!a.length)return -1;
    for(let k=1;k<=4;k++){
      const i=(from+k)%4;
      if(a.indexOf(i)>=0)return i;
    }
    return a[0];
  }
  /* 1.4 dev1.4 全队补给：脱战可用，恢复全部角色生命与法力 */
  function supplyAll(){
    for(let i=0;i<4;i++){
      const cls=SV.teamClass(i);if(cls===null)continue;
      const st=SV.effStats(cls);
      slotState[i]={hp:st.hp,maxHp:st.hp,energy:P.maxEnergy,
        cd:[0,0,0,0],buff:{dmg:0,spd:0,shield:0,t:0},dead:false};
    }
    const st=SV.effStats(P.cls);
    P.maxHp=st.hp;P.hp=st.hp;P.energy=P.maxEnergy;P.dead=false;
    P.buff.dmg=0;P.buff.spd=0;P.buff.shield=0;P.buff.t=0;
    for(let k=0;k<4;k++)P.cd[k]=0;
    if(CR.status)CR.status.clear(P);
    return 4;
  }
  /* 全员复活：全队恢复 ratio 生命、清空阵亡状态 */
  function reviveAll(ratio){
    ratio=ratio||.25;
    for(let i=0;i<4;i++){
      const cls=SV.teamClass(i);if(cls===null)continue;
      const st=SV.effStats(cls);
      slotState[i]={hp:Math.max(1,Math.round(st.hp*ratio)),maxHp:st.hp,energy:0,
        cd:[0,0,0,0],buff:{dmg:0,spd:0,shield:0,t:0},dead:false};
    }
    const cur=current(),st=SV.effStats(SV.teamClass(cur)||0);
    P.maxHp=st.hp;P.hp=Math.max(1,Math.round(st.hp*ratio));P.energy=0;
    P.dead=false;P.buff.dmg=0;P.buff.spd=0;P.buff.shield=0;P.buff.t=0;
    for(let k=0;k<4;k++)P.cd[k]=0;
    P.inv=1.4;P.hurtT=0;switchCd=0;
    if(CR.status)CR.status.clear(P);
    return aliveSlots().length;
  }
  function forceReady(){switchCd=0;}
  function switchTo(i,silent,force){
    if(switchCd>0&&!force)return false;
    /* 1.4 dev1.3：束缚 / 睡眠 / 害怕禁止切换 */
    /* force（阵亡自动换人）必须绕过束缚 / 睡眠等控制，否则会卡死在倒下状态 */
    if(CR.status&&!force&&CR.status.blockSwitch()){
      if(!silent){CR.audio.sfx("deny");CR.ui.toast(CR.status.blockReason());}
      return false;
    }
    if(!canSwitch(i)){if(!silent){CR.audio.sfx("deny");CR.ui.toast("该队伍位置暂无角色");}return false;}
    const cur=current();
    if(i===cur){if(!silent){CR.audio.sfx("ui");CR.ui.toast(SV.teamName(i)+" 已在场上");}return false;}
    snapshot(cur);
    const cls=SV.teamClass(i);
    applyClass(cls,SV.teamName(i));
    restore(i,cls);
    SV.setActive(i);
    switchCd=.30;
    /* 1.4 dev1.3：换人再换回会清除异常状态与 8 维战斗等级 */
    if(CR.status)CR.status.clear(P);
    // 登场演出
    P.inv=Math.max(P.inv,.45);
    P.skT=.45;
    for(let k=0;k<5;k++)E.spawnGhost();
    E.ringFx(P.x,P.depth,CFG.CLASSES[cls].color,110,.45);
    E.glowFx(P.x,P.depth,36,CFG.CLASSES[cls].color,54,.38);
    E.burst(P.x,P.depth,30,CFG.CLASSES[cls].color,20,190);
    E.spawnFloat(P.x,P.depth,96,0,"switch",CFG.CLASSES[cls].color,true);
    CR.world.addWhite(.16);CR.world.addShake(4);
    CR.audio.sfx("switch");
    if(!silent){
      CR.ui.banner(SV.teamName(i)+" · 登场");
      CR.ui.toast("切换为 "+CFG.CLASSES[cls].name+"「"+SV.teamName(i)+"」");
    }
    CR.ui.refreshPanels();
    CR.ui.buildSkills();
    return true;
  }
  function tick(dt){if(switchCd>0)switchCd-=dt;}
  /* 强化 / 升级后把新属性套到当前出战角色，并同步其他队友的存档比例 */
  function applyStats(){
    const cls=P.cls,ratio=P.maxHp>0?P.hp/P.maxHp:1;
    const st=SV.effStats(cls);
    P.maxHp=st.hp;P.hp=U.clamp(Math.round(st.hp*ratio),1,st.hp);
    P.atk=st.atk;P.spd=st.spd;P.crit=st.crit;P.armor=st.armor;
    P.level=SV.levelOf(P.cls);
    for(let i=0;i<4;i++){
      const s=slotState[i];if(!s)continue;
      const c=SV.teamClass(i);if(c===null)continue;
      const t=SV.effStats(c);
      const r=s.maxHp>0?s.hp/s.maxHp:1;
      s.hp=Math.round(t.hp*r);s.maxHp=t.hp;
    }
  }
  function onLevelUp(){applyStats();}
  CR.team={isDead,markDead,aliveSlots,nextAlive,supplyAll,reviveAll,forceReady,init,current,canSwitch,switchTo,tick,applyStats,onLevelUp,
    get switchCd(){return switchCd;}};
})(window.CR=window.CR||{});
