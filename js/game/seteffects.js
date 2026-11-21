/* seteffects.js — v1.4 dev4.1 · 套装动态效果（见习术士「魔法的指引V1」）
 * 2 件：技能命中后 80% 提升双攻 1 级，暴击额外双防 1 级（CD 3s）
 * 4 件：蓄力≥2 层速度 +33% 持续 3 秒（CD 40s）
 * 5 件：首次生命低于 80% 获得 40+20% 最大生命（上限 220）法术护盾（CD 80s）
 * 静态 5 件「速度 +7%」由 equipment.bonus() 汇总，本模块只管战斗时触发。
 * 六槽中双手武器占用主手与副手，最多只能同时穿 5 件，故最高档为 5 件。
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C;
  let cd2=0,cd4=0,cd5=0,speedT=0,speedAdd=0,lowArmed=true;
  function setCount(){
    if(!CR.equip||!CR.equip.bonus||!CR.ent||!CR.ent.player)return 0;
    try{
      const sets=CR.equip.bonus(CR.ent.player.cls).sets||[];
      for(const x of sets)if(x.key==="apprentice")return x.n;
    }catch(e){}
    return 0;
  }
  function toast(t){try{CR.ui.toast(t);}catch(e){}}
  function sfx(n){try{CR.audio.sfx(n);}catch(e){}}
  function onSkillHit(crit){
    if(cd2>0||setCount()<2||!CR.battlecore)return;
    cd2=3;
    if(U.rnd()>=.80)return;                 /* 80% 触发 */
    const side=CR.battlecore.playerSide();
    CR.battlecore.addLevel(side,"atk",1);
    CR.battlecore.addLevel(side,"matk",1);
    if(crit){CR.battlecore.addLevel(side,"pdef",1);CR.battlecore.addLevel(side,"mdef",1);}
    toast("✦ 魔法的指引 · 双攻 +1 级"+(crit?" · 双防 +1 级":"")+"（10 秒后回落）");
    sfx("buff");
  }
  function onCharge(lv){
    if(setCount()<4||lv<1||cd4>0)return;   /* lv 1 = 中蓄（2 层），lv 2 = 长蓄 */
    cd4=40;speedT=3;
    const P=CR.ent.player;
    speedAdd=.33;P.buff.spd+=speedAdd;
    toast("✦ 魔法的指引 · 蓄力加速 +33%（3 秒）");
    sfx("buff");
  }
  function onLowHp(P){
    const n=setCount();
    if(n<5){lowArmed=true;return;}
    if(!P||!P.maxHp||P.hp/P.maxHp>=.80){lowArmed=true;return;}
    if(!lowArmed||cd5>0||!CR.battlecore)return;
    lowArmed=false;cd5=80;
    const amt=Math.min(220,Math.round(40+P.maxHp*.20));
    CR.battlecore.addShield(P,"magic",amt);
    toast("✦ 魔法的指引 · 获得 "+amt+" 点法术护盾");
    sfx("shield");
    try{CR.ent.spawnFloat(P.x,P.depth,92,"⛨ "+amt,"shield",C.cyan||[.55,.91,1],false);}catch(e){}
  }
  function tick(dt){
    cd2=Math.max(0,cd2-dt);cd4=Math.max(0,cd4-dt);cd5=Math.max(0,cd5-dt);
    if(speedT>0){
      speedT-=dt;
      if(speedT<=0&&speedAdd>0){
        try{CR.ent.player.buff.spd-=speedAdd;}catch(e){}
        speedAdd=0;
      }
    }
    if(setCount()<5)lowArmed=true;
  }
  CR.setFx={setCount,onSkillHit,onCharge,onLowHp,tick,
    get cool2(){return cd2;},get cool4(){return cd4;},get cool5(){return cd5;},
    get speedBuffT(){return speedT;}};
})(window.CR=window.CR||{});
