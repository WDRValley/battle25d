/* status.js — v1.4 dev1.3 异常状态 / 互斥 / 固伤通道 / 控制效果
 * 13 种异常：每秒按最大体力比例结算，伤害视为固伤（走真抗 + 真实护盾）。
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,P=()=>CR.ent.player;
  const MAX=CFG.STATUS_MAX||3;
  let acc=0;

  function list(t){if(!t.statusList)t.statusList=[];return t.statusList;}
  function cfg(id){return CFG.STATUS[id]||null;}
  function has(id){return list(P()).some(o=>o.id===id);}
  function get(id){return list(P()).find(o=>o.id===id)||null;}
  function elementOf(t){
    if(t===P())return (CFG.CLASSES[P().cls]||{}).element||"普通系";
    return (t.cfg&&t.cfg.element)||"普通系";
  }
  function dots(){return ["choke","burn","frost","poison","parasite","bind","curse","weak","nightmare"];}
  function conflicts(id){
    const burnFrost=["burn","frost"],tox=["burn","frost","poison"];
    let out=[];
    if(id==="burn"||id==="frost")out=burnFrost.filter(x=>x!==id).concat(["poison","weak"]);
    else if(id==="poison")out=tox.filter(x=>x!=="poison").concat(["weak"]);
    else if(id==="weak")out=tox;
    else if(id==="sleep")out=dots();
    /* 睡眠不与任何扣血状态共存（双向：扣血状态也会顶掉睡眠） */
    if(dots().indexOf(id)>=0)out=out.concat(["sleep"]);
    return out;
  }
  function remove(t,id){
    const a=list(t),i=a.findIndex(o=>o.id===id);
    if(i>=0)a.splice(i,1);
  }
  function toast(txt){try{CR.ui.toast(txt);}catch(e){}}
  function banner(txt){try{CR.ui.banner(txt);}catch(e){}}

  /* 施加异常：免疫 → 互斥 → 最多 3 种（替换剩余时间最短） */
  function apply(t,id,source){
    const cf=cfg(id);if(!cf)return false;
    const el=elementOf(t);
    if((id==="burn"&&el.indexOf("火")>=0)||
       (id==="frost"&&el.indexOf("冰")>=0)||
       (id==="parasite"&&el.indexOf("木")>=0)){
      if(t===P())toast("【"+cf.name+"】对"+el+"无效");return false;
    }
    const a=list(t);
    if(a.some(o=>o.id===id)){const o=a.find(x=>x.id===id);
      o.t=Math.min(o.max,o.t+2);return true;} // 重复施加只续 2 秒
    conflicts(id).forEach(k=>remove(t,k));
    const b=list(t);
    if(b.length>=MAX){
      let m=0;for(let i=1;i<b.length;i++)if((b[i].t)<(b[m].t))m=i;
      b.splice(m,1);
    }
    const dur=U.rr(cf.dur[0],cf.dur[1]);
    const o={id,t:dur,max:dur,step:0,source:source||null,failThisSec:false};
    b.push(o);
    if(t===P()){
      banner(cf.icon+" "+cf.name);
      toast("【"+cf.name+"】"+cf.desc+" · "+dur.toFixed(0)+"s");
      try{CR.audio.sfx("debuff");}catch(e){}
    }
    return true;
  }

  /* 火系伤害解除冻伤；其它元素不做处理 */
  function onElementHit(t,element){
    if(!element||String(element).indexOf("火")<0)return;
    if(list(t).some(o=>o.id==="frost")){
      remove(t,"frost");
      if(t===P())toast("🔥 火系伤害驱散了【冻伤】");
    }
  }
  /* 受到攻击伤害自动解除睡眠（异常状态伤害不调用此函数） */
  function onAttacked(t){
    if(list(t).some(o=>o.id==="sleep")){
      remove(t,"sleep");
      if(t===P())toast("受到攻击 · 从【睡眠】中惊醒");
    }
  }

  /* 固定伤害结算：真抗 → 真实护盾 → 生命 */
  function fixedDamage(t,dmg,label){
    if(!t||dmg<=0||!t.alive&&t!==P())return 0;
    const BC=CR.battlecore;
    const side=t===P()?BC.playerSide():BC.enemySide(t);
    const trueRes=Math.max(0,(side.race.trueRes||0));
    let v=dmg*(1-trueRes);
    if(BC&&BC.absorbShields){
      const ab=BC.absorbShields(t,v,"fixed");
      v-=ab.absorbed;
      (ab.use||[]).forEach(u=>{
        try{CR.ent.spawnFloat(t.x,t.depth,72,"⛨ "+Math.round(u.value),"shield",
          BC.SHIELDS[u.type].color,false);}catch(e){}
      });
    }
    v=Math.max(0,v);
    if(t===P()){
      t.hp=Math.max(0,t.hp-v);
      try{CR.ent.spawnFloat(t.x,t.depth,76,"-"+Math.round(v),"hurt",C.violet,false);}catch(e){}
      if(t.hp<=0){t.dead=true;}
    }else{
      t.hp=Math.max(0,t.hp-v);
      try{CR.ent.spawnFloat(t.x,t.depth,62,"-"+Math.round(v),"hurt",C.violet,false);}catch(e){}
      if(t.hp<=0&&t.alive){t.alive=false;try{CR.combat.onEnemyDead&&CR.combat.onEnemyDead(t);}catch(e){}}
    }
    return v;
  }

  function tickOnce(){
    const targets=[P()];
    try{CR.ent.enemies.each(e=>{if(e.alive)targets.push(e);});}catch(e){}
    for(const t of targets){
      const a=list(t);
      if(!a.length)continue;
      for(let i=a.length-1;i>=0;i--){
        const o=a[i],cf=cfg(o.id);if(!cf){a.splice(i,1);continue;}
        o.t-=1;o.step=(o.step||0)+1;
        o.failThisSec=(o.id==="paralyze")?U.rnd()<.5:false;
        if(cf.dmg){
          let ratio=cf.dmg;
          if(o.id==="choke")ratio=Math.min(cf.cap,cf.dmg+cf.grow*(o.step-1));
          else if(o.id==="weak")ratio=Math.max(.01,cf.dmg-cf.decay*(o.step-1));
          const maxHp=t.maxHp||t.cfg&&t.cfg.hp||100;
          const v=fixedDamage(t,maxHp*ratio,cf.name);
          if(o.id==="parasite"&&o.source&&o.source!==t&&o.source.hp!==undefined)
            o.source.hp=Math.min(o.source.maxHp||1e9,(o.source.hp||0)+v);
        }
        if(o.t<=0&&o.id!=="curse"){
          a.splice(i,1);
          if(t===P())toast("【"+cf.name+"】已结束");
        }
      }
    }
  }
  function update(dt){
    acc+=dt;
    let guard=0;
    while(acc>=1&&guard++<8){acc-=1;tickOnce();}
  }

  /* 控制判定 */
  function noAction(){const a=list(P());
    if(a.some(o=>o.id==="fear"||o.id==="sleep"))return true;
    return a.some(o=>o.id==="paralyze"&&o.failThisSec);}
  function failSkill(){const o=get("paralyze");return !!o&&U.rnd()<.5;}
  function confused(){return has("confuse")&&U.rnd()<.5;}
  function blockSwitch(){return has("bind")||has("fear")||has("sleep");}
  function blockReason(){
    if(has("bind"))return "被【束缚】缠绕，无法替换角色";
    if(has("sleep"))return "正在【睡眠】，无法行动";
    if(has("fear"))return "【害怕】得动不了";
    return "";
  }
  function clear(t){
    list(t).length=0;
    if(t===P()&&CR.battlecore)t.bcLevels=CR.battlecore.newLevels();
  }
  /* 特质药酒：净化异常（诅咒 noCure 不清除） */
  function purge(){
    const a=list(P()),n=a.length;
    for(let i=a.length-1;i>=0;i--)if(!cfg(a[i].id).noCure)a.splice(i,1);
    return n-a.length;
  }
  function info(){
    return list(P()).map(o=>{
      const cf=cfg(o.id);
      return {id:o.id,icon:cf.icon,name:cf.name,kind:cf.kind,desc:cf.desc,
        left:o.t,max:o.max,step:o.step};
    });
  }
  CR.status={apply,remove,has,get,list,update,clear,purge,info,onElementHit,onAttacked,
    fixedDamage,noAction,failSkill,confused,blockSwitch,blockReason,MAX};
})(window.CR=window.CR||{});
