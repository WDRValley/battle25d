/* battlecore.js — v1.4 dev1 · 统一数值口径（依据 1.md）
 * 核心原则：6 维是养成本体；8 维是战斗临时等级修正；通用属性是判定率；
 *           种族属性是减伤 / 特殊通道；伤害按
 *           判定 → 基础伤害 → 防守乘区 → 攻击乘区 → 护盾 顺序结算。
 *           同类百分比加算，不同乘区乘算。
 *
 * 本文件是纯计算层，不碰 DOM / WebGL / 存档，方便单独测试与后续 dev 校准。
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG;
  const clamp=(v,a,b)=>v<a?a:(v>b?b:v);

  /* ================= 待校准参数（集中在这里，dev2 可继续调） ================= */
  /* K：防御乘区校准常数。1.md 示例用 1000（千攻量级），本项目 6 维面板在
     几十~几百量级，按同水平攻防减伤约 50% 反推取 180。 */
  const K=180;
  /* 全角色基本统一的判定率基准 */
  const BASE_RATE={hit:.95,dodge:.05,crit:.05,critDmg:1.5,precise:.02};
  /* 种族属性默认值（特殊通道） */
  const RACE_DEFAULT={
    regenHp:1,regenMp:1,           // 每秒回血 / 回蓝，独立结算，不受速度影响
    res:.05,trueRes:.05,           // 一般抗性（减物法）/ 真抗（只减固伤）
    typeResist:.02,weakResist:.02, // 克制抵抗 / 微弱抵抗
    pierce:.02,pierceResist:.02,   // 穿透 / 穿透抵抗
    critDmgResist:.02,             // 爆伤抵抗
    precise:.02,                   // 精准：无视免疫 / 闪避 / 无效
    critDmg:1.5,                   // 攻方爆伤 150%，clamp 100%~300%
    fixed:0                        // 固伤是技能行为，默认无
  };
  /* 护盾类型：普通吸物法、魔法只吸法、真实吸一切 */
  const SHIELDS={
    normal:{id:"normal",name:"普通护盾",icon:"⛨",color:[.78,.82,.88],
      absorbs:{physical:1,magic:1,fixed:0}},
    magic: {id:"magic", name:"法术护盾",icon:"⛨",color:[.30,.62,1],
      absorbs:{physical:0,magic:1,fixed:0}},
    true:  {id:"true",  name:"真实护盾",icon:"⛨",color:[1,.68,.22],
      absorbs:{physical:1,magic:1,fixed:1}}
  };
  /* 8 维战斗等级键（生命不在其中，不按 ±10% 修正） */
  const LEVEL_KEYS=["atk","matk","pdef","mdef","hit","dodge","crit","spd"];
  const LEVEL_NAMES={atk:"物攻",matk:"法攻",pdef:"物防",mdef:"法防",
    hit:"命中",dodge:"闪避",crit:"暴击",spd:"速度"};
  /* 6 维养成本体（角色面板） */
  const CORE6=["atk","matk","pdef","mdef","hp","spd"];

  /* ================= 战斗等级 ================= */
  /* M(L)=1+0.1L, L=clamp(Σ来源等级,-6,+6)；-6→0.4, 0→1.0, +6→1.6 */
  function M(lv){return 1+.1*clamp(lv||0,-6,6);}
  function newLevels(){const o={};LEVEL_KEYS.forEach(k=>o[k]=0);o._t=0;return o;}
  function addLevel(side,key,n){
    if(!side.levels)side.levels=newLevels();
    if(LEVEL_KEYS.indexOf(key)<0)return 0;
    side.levels[key]=clamp((side.levels[key]||0)+(n||0),-6,6);
    return side.levels[key];
  }
  /* 每 10 秒各维向 0 自然回落 1 级（+6 → 0 需 60s，-6 → 0 同样 60s） */
  function tick(sides,dt){
    const arr=Array.isArray(sides)?sides:[sides];
    for(const s of arr){
      if(!s||!s.levels)continue;
      s.levels._t=(s.levels._t||0)+dt;
      while(s.levels._t>=10){
        s.levels._t-=10;
        LEVEL_KEYS.forEach(k=>{
          const v=s.levels[k]||0;
          if(v>0)s.levels[k]=v-1;else if(v<0)s.levels[k]=v+1;
        });
      }
    }
  }
  function levelText(side){
    if(!side||!side.levels)return "无";
    const out=[];
    LEVEL_KEYS.forEach(k=>{const v=side.levels[k]||0;if(v)out.push(LEVEL_NAMES[k]+(v>0?"+":"")+v);});
    return out.length?out.join(" · "):"无";
  }

  /* ================= 种族属性合并 ================= */
  function raceOf(side){
    const r=Object.assign({},RACE_DEFAULT,side.race||{});
    r.critDmg=clamp(r.critDmg,1,3);
    r.precise=clamp(r.precise,0,1);
    r.res=clamp(r.res,0,.9);r.trueRes=clamp(r.trueRes,0,.9);
    return r;
  }
  function ratesOf(side){
    const r=Object.assign({},BASE_RATE,side.rates||{});
    r.hit=clamp(r.hit,0,1);r.dodge=clamp(r.dodge,0,1);
    r.crit=clamp(r.crit,0,1);r.critDmg=clamp(r.critDmg,1,3);
    return r;
  }
  /* 8 维战斗值 */
  function warStats(side){
    const L=side.levels||newLevels(),s=side.core||{};
    const rates=ratesOf(side);
    return {
      atk :(s.atk ||0)*M(L.atk ),
      matk:(s.matk||0)*M(L.matk),
      pdef:(s.pdef||0)*M(L.pdef),
      mdef:(s.mdef||0)*M(L.mdef),
      spd :(s.spd ||0)*M(L.spd ),
      hit :rates.hit *M(L.hit ),
      dodge:rates.dodge*M(L.dodge),
      crit :rates.crit*M(L.crit),
      hp  :s.hp||0                      // 生命不列 8 维，不按等级修正
    };
  }

  /* ================= 系别克制（含守方抵抗） ================= */
  /* 原始倍率：微弱 0.5 / 普通 1.0 / 克制 1.5 / 绝克 2.0 */
  function rawType(atkEl,defEl){
    if(CFG&&CFG.rawTypeMultiplier)return CFG.rawTypeMultiplier(atkEl,defEl);
    return 1;
  }
  function typeZone(atk,def,race){
    const R=rawType(atk,def),r=raceOf(def);
    let v=R;
    if(R>1)v=Math.max(1,R-r.typeResist);        // 克制抵抗只减 >1
    else if(R<1)v=Math.min(1,R+r.weakResist);   // 微弱抵抗只加 <1
    return {raw:R,value:v};
  }

  /* ================= 判定 ================= */
  function judge(atk,def,opt){
    const A=warStats(atk),D=warStats(def),ra=raceOf(atk),rd=raceOf(def);
    opt=opt||{};
    /* 1) 精准：成功则无视免疫 / 闪避 / 无效 */
    const precise=opt.forcePrecise||(U.rnd()<ra.precise);
    /* 2) 命中：clamp(命中战率 - 闪避战率, 5%, 100%) */
    const hitRate=opt.fixed?1:clamp(A.hit-D.dodge,.05,1);
    const hit=opt.fixed||precise||opt.forceHit||opt.noDodge||(U.rnd()<hitRate);
    /* 3) 暴击：命中之后；最终暴击率 = clamp(暴击战率 - 守方暴击抵抗, 0, 1) */
    const critRate=opt.fixed?0:clamp(A.crit-(rd.critResist||0),0,1);
    const crit=!opt.fixed&&hit&&(opt.forceCrit||U.rnd()<critRate);
    /* 4) 最终爆伤倍率 = clamp(攻方爆伤 - 守方爆伤抵抗, 100%, 300%) */
    const critDmg=clamp(ra.critDmg-rd.critDmgResist,1,3);
    return {precise,hit,hitRate,crit,critRate,critDmg,A,D,ra,rd};
  }

  /* ================= 伤害结算主流程 ================= */
  /* payload: {base, kind:"physical"|"magic"|"fixed", element, mult,
   *           forceHit, forceCrit, forcePrecise, noDodge, bonus:[{name,v}] ,
   *           random:true, atkEl, defEl}
   * 返回完整分段，供漂字 / 战斗档案 / 帮助页演示使用。 */
  function resolve(atk,def,payload){
    payload=payload||{};
    const kind=payload.kind||"physical";
    const fixed=kind==="fixed";
    const J=judge(atk,def,{fixed,forceHit:payload.forceHit,forceCrit:payload.forceCrit,
      forcePrecise:payload.forcePrecise,noDodge:payload.noDodge});
    if(!J.hit)return {hit:false,damage:0,hpDamage:0,absorbed:0,parts:[],J};

    const A=J.A,D=J.D,ra=J.ra,rd=J.rd,parts=[];
    const push=(name,v)=>parts.push({name,value:v});
    /* 步骤3 基础伤害 */
    let dmg;
    if(fixed){
      dmg=Math.max(0,payload.base||0);
      push("固伤值",dmg);
    }else{
      const power=kind==="magic"?A.atk*0+A.matk:A.atk;
      dmg=Math.max(1,(payload.base!==undefined?payload.base:power*(payload.mult||1)));
      push("基础伤害",dmg);
    }
    /* 步骤4 防御乘区（固伤跳过） */
    if(!fixed){
      const dv=(kind==="magic"?D.mdef:D.pdef);
      const defMul=K/(Math.max(0,dv)+K);
      dmg*=defMul;push("防御乘区 K/(防+K)",defMul);
    }
    /* 步骤5 抗性乘区：穿透先被穿透抵抗抵消 */
    const effPierce=Math.max(0,ra.pierce-rd.pierceResist);
    if(fixed){
      const trueRes=Math.max(0,rd.trueRes-effPierce);
      const resMul=1-trueRes;dmg*=resMul;
      push("真抗乘区 (1-有效真抗)",resMul);
    }else{
      const res=Math.max(0,rd.res-effPierce);
      const resMul=1-res;dmg*=resMul;
      push("一般抗性乘区 (1-有效抗性)",resMul);
    }
    /* 步骤6 克制乘区（固伤不吃克制） */
    let typeR={raw:1,value:1};
    if(!fixed){
      typeR=typeZone(payload.atkEl||"普通系",payload.defEl||"普通系",def);
      dmg*=typeR.value;push("克制乘区 R'",typeR.value);
    }
    /* 步骤7 暴击乘区（固伤不暴击） */
    const critMul=J.crit?J.critDmg:1;
    if(!fixed){dmg*=critMul;if(J.crit)push("暴击乘区 爆伤",critMul);}
    /* 步骤8 其他增伤 / 减伤：同类百分比加算，异类乘算 */
    if(payload.bonus&&payload.bonus.length){
      const sum=payload.bonus.reduce((a,b)=>a+(b.v||0),0);
      const m=Math.max(.05,1+sum);dmg*=m;push("增伤乘区（同类加算）",m);
    }
    /* 步骤9 随机浮动（默认关，dev2 校准 ±5%） */
    if(payload.random){
      const r=1+U.rr(-.05,.05);dmg*=r;push("随机浮动",r);
    }
    /* 步骤10 护盾吸收：先得最终伤害，再按类型吸收 */
    const final=Math.max(1,Math.round(dmg));
    const sh=absorbShields(def,final,kind);
    const hpDamage=Math.max(0,final-sh.absorbed);
    return {hit:true,damage:final,hpDamage,absorbed:sh.absorbed,shieldUse:sh.use,
      crit:J.crit,precise:J.precise,typeR,parts,J};
  }

  /* ================= 护盾 ================= */
  /* 1.4 dev1.3：护盾至多保留 120 秒（即使未被攻击或吸收） */
  const SHIELD_TTL=120;
  function nowSec(){return Date.now()/1000;}
  function shieldsOf(side){
    if(!side.shields)side.shields={normal:0,magic:0,true:0};
    const exp=side.shieldExpire;
    if(exp){
      const now=nowSec();
      for(const k in exp){
        if(exp[k]&&now>=exp[k]){side.shields[k]=0;delete exp[k];}
      }
    }
    return side.shields;
  }
  function addShield(side,type,n){
    type=SHIELDS[type]?type:"normal";
    const sh=shieldsOf(side);
    sh[type]=Math.max(0,(sh[type]||0)+Math.max(0,n));
    if(!side.shieldExpire)side.shieldExpire={};
    /* 同类护盾叠加时刷新 120 秒计时 */
    side.shieldExpire[type]=nowSec()+SHIELD_TTL;
    return sh[type];
  }
  /* 吸收优先级：真实 → 对应专精 → 普通（同类加算只用于数值，护盾按类型逐层吸收） */
  function absorbShields(side,dmg,kind){
    const s=shieldsOf(side),use=[];
    const order=kind==="magic"?["true","magic","normal"]:
      (kind==="fixed"?["true"]:["true","normal"]);
    let left=dmg;
    for(const t of order){
      if(left<=0)break;
      if(!SHIELDS[t].absorbs[kind])continue;
      const have=s[t]||0;if(have<=0)continue;
      const useV=Math.min(have,left);
      s[t]=have-useV;left-=useV;use.push({type:t,value:useV});
    }
    return {absorbed:dmg-left,use};
  }
  function shieldTotal(side){const s=shieldsOf(side);return (s.normal||0)+(s.magic||0)+(s.true||0);}

  /* ================= 玩家 / 敌人 side 构造 ================= */
  function playerSide(){
    const P=CR.ent.player,SV=CR.save,st=SV.effStats?SV.effStats(P.cls):null;
    const eq=CR.equip?CR.equip.bonus(P.cls):null;
    /* 基础率统一，装备 / 养成带来的差值作为增量 */
    const dHit=(st?st.hit:.92)-.92,dCrit=(st?st.crit:.08)-.08,
          dDodge=(st?st.dodge:.05)-.05;
    const rates={hit:clamp(BASE_RATE.hit+dHit+(eq?eq.hit:0),0,1),
      dodge:clamp(BASE_RATE.dodge+dDodge+(eq?eq.dodge:0),0,1),
      crit:clamp(BASE_RATE.crit+dCrit+(eq?eq.crit:0),0,1),
      critDmg:clamp(BASE_RATE.critDmg+(eq?eq.critDmg:0),1,3)};
    if(!P.bcLevels)P.bcLevels=newLevels();
    /* 兼容 1.3.x 的单一护盾字段：统一迁移到 shieldsOf(实体)。
       HUD / 渲染器 / 结算层都通过 shieldsOf(实体) 读写同一对象，避免护盾显示却不生效。 */
    const sh=shieldsOf(P);
    if(P.buff&&P.buff.shield>0){
      sh.normal+=P.buff.shield;P.buff.shield=0;
    }
    P.bcShields=sh;
    const race=Object.assign({},RACE_DEFAULT);
    if(eq){
      race.res+=eq.res||0;race.trueRes+=eq.trueRes||0;
      race.typeResist+=eq.typeResist||0;race.weakResist+=eq.weakResist||0;
      race.pierce+=eq.pierce||0;race.pierceResist+=eq.pierceResist||0;
      race.critDmgResist+=eq.critDmgResist||0;race.precise+=eq.precise||0;
      race.regenHp+=eq.regenHp||0;race.regenMp+=eq.regenMp||0;
    }
    return {name:P.name||"勇者",core:{
        atk:st?st.atk:0,matk:st?st.matk:0,pdef:st?st.pdef:0,
        mdef:st?st.mdef:0,hp:st?st.hp:0,spd:st?st.spd:0},
      levels:P.bcLevels,rates,race,shields:sh,
      isPlayer:true,ref:P};
  }
  function enemySide(e){
    const c=e.cfg||{};
    if(!e.bcLevels)e.bcLevels=newLevels();
    const sh=shieldsOf(e);e.bcShields=sh;
    const scale=c.raceScale||1;
    return {name:c.label||"敌人",core:{
        atk:(c.atk||18)*scale,matk:(c.matk||(c.atk||18)*.7)*scale,
        pdef:(c.pdef||12)*scale,mdef:(c.mdef||10)*scale,
        hp:e.maxHp||c.hp||80,spd:(c.spd||1)*scale},
      levels:e.bcLevels,rates:Object.assign({},BASE_RATE,c.rates||{}),
      race:Object.assign({},RACE_DEFAULT,c.race||{}),
      shields:sh,element:c.element||"普通系",isPlayer:false,ref:e};
  }

  /* ================= 1.4 dev1.1 王者樱花套装 · 4/4 半血守护 =================
     生命首次低于 1/2 时：真实护盾（20% 最大生命）+ 移速 +15%，触发后 45 秒冷却。
     只有「重新回到 55% 以上」才会再次武装，避免低血状态反复刷护盾。 */
  function sakuraGuardTick(P,dt){
    const eq=CR.equip?CR.equip.bonus(P.cls):null;
    const ef=(CR.CFG.EQUIP_SETS&&CR.CFG.EQUIP_SETS.sakura&&
      CR.CFG.EQUIP_SETS.sakura.effect)||{};
    const on=!!(eq&&eq.sakuraGuard);
    P.petalAura=!!(eq&&eq.petalAura);
    if(!on){
      P.sakuraGuardCd=0;P.sakuraBuffT=0;P.sakuraArmed=true;return null;
    }
    if(P.sakuraGuardCd>0)P.sakuraGuardCd=Math.max(0,P.sakuraGuardCd-dt);
    if(P.sakuraBuffT>0)P.sakuraBuffT=Math.max(0,P.sakuraBuffT-dt);
    const ratio=ef.guardRatio||.5;
    if(P.hp>=P.maxHp*(ratio+.05))P.sakuraArmed=true;
    if(P.dead||P.hp<=0||P.hp>=P.maxHp*ratio||
       P.sakuraArmed===false||P.sakuraGuardCd>0)return null;
    P.sakuraArmed=false;
    const cd=ef.cooldown||45;
    P.sakuraGuardCd=cd;P.sakuraBuffT=cd;
    const amount=Math.round(P.maxHp*(ef.shieldRatio||.20));
    addShield(P,"true",amount);
    try{
      CR.ent.spawnFloat(P.x,P.depth,86,"⛨ "+amount,"shield",SHIELDS.true.color,false);
      CR.ent.burst(P.x,P.depth,34,CR.C.sakura||[1,.78,.88],14,130,{grav:160});
      CR.audio.sfx("shield");
      CR.ui.toast("🌸 樱色加护 · 真实护盾 "+amount+" · 移速 +15%（45 秒冷却）");
      CR.ui.banner&&CR.ui.banner("🌸 樱色加护发动");
    }catch(e){}
    return {shield:amount,cooldown:cd};
  }

  /* ================= 每秒回复 / 行动条 ================= */
  function regen(side,dt){
    const r=raceOf(side),ref=side.ref;
    if(!ref)return;
    side._regenT=(side._regenT||0)+dt;
    while(side._regenT>=1){
      side._regenT-=1;
      if(ref.hp!==undefined&&ref.hp>0&&ref.maxHp)
        ref.hp=Math.min(ref.maxHp,ref.hp+r.regenHp);
      if(ref.energy!==undefined&&ref.maxEnergy)
        ref.energy=Math.min(ref.maxEnergy,ref.energy+r.regenMp*2);
    }
  }
  /* 行动条制：行动值 = 10000 / 最终速度，越小越先 */
  function actionValue(side){
    const s=warStats(side);
    return 10000/Math.max(.01,s.spd*60);
  }

  /* ================= 对外 ================= */
  CR.battlecore={M,K,BASE_RATE,RACE_DEFAULT,SHIELDS,LEVEL_KEYS,LEVEL_NAMES,CORE6,
    newLevels,addLevel,tick,levelText,raceOf,ratesOf,warStats,rawType,SHIELD_TTL,
    rawTypeMultiplier:rawType,typeZone,
    judge,resolve,shieldsOf,addShield,absorbShields,shieldTotal,sakuraGuardTick,
    playerSide,enemySide,regen,actionValue,
    /* 帮助页 / 面板用的纯文本口径说明 */
    describe:()=>({K,BASE_RATE,RACE_DEFAULT,SHIELDS})};
})(window.CR=window.CR||{});
