/* combat.js — 攻击、蓄力、12 个技能、敌人 AI、伤害漂字、掉落与拾取 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=CR.ent.player,SV=CR.save;
  let dashHits=null;
  /* 1.3.0 攻击上下文：系别 / 首次技能必中 / 普攻击穿（供 damageEnemy 单点结算） */
  let currentElement=null,pendingForceHit=false,pendingBreak=false,currentMagic=false;
  let currentAttackMagic=false;   // 1.4 dev1：本次基础伤害用的是法攻还是物攻
  /* 1.3.1 夜樱潜行状态 + 交战标记 */
  const stealth={t:0,burst:0};
  function isStealth(){return stealth.t>0;}
  function markEngage(){if(CR.world&&CR.world.markEngage)CR.world.markEngage();}

  /* ---------- 1.1.0 攻击特效高度上下文 ----------
     以 P.x 为起点的攻击几何统一走 FX，自动叠加玩家当前跳跃高度 P.h，
     修复「跳起来攻击、斩击弧 / 火球 / 爆点却留在地面」的问题。
     以 e.x / s.x / x（落点预警）为起点的敌人特效与地面预警圈仍走 CR.ent。 */
  const FX={
    spawnShot:(kind,x,d,h,vx,vd,vh,dmg,life,c,crit)=>
      E.spawnShot(kind,x,d,P.h+h,vx,vd,vh,dmg,life,c,crit),
    spawnPart:(x,d,h,c,kind,size,life,opt)=>E.spawnPart(x,d,P.h+h,c,kind,size,life,opt),
    burst:(x,d,h,c,n,spd,opt)=>E.burst(x,d,P.h+h,c,n,spd,opt),
    glowFx:(x,d,h,c,r,life)=>E.glowFx(x,d,P.h+h,c,r,life),
    ringFx:(x,d,c,r,life)=>E.spawnPart(x,d,P.h+4,c,1,r,life||.42,
      {grow:r*2.1,vx:0,vh:0,grav:0,drag:1}),
    spawnFloat:(x,d,h,v,k,c,crit)=>E.spawnFloat(x,d,P.h+h,v,k,c,crit),
    spawnBeam:(pts,c,w,life)=>E.spawnBeam(
      pts.map(pt=>[pt[0],pt[1],P.h+(pt[2]||20)]),c,w,life)
  };

  /* ---------- 数值（1.3.0） ---------- */
  function combatState(){
    return CR.equip&&CR.equip.combatState?CR.equip.combatState(P.cls):
      {canAttack:true,atkMul:1,provides:["warrior"],tool:null,firstSkillHit:false,
       breakChance:0,hit:0,dodge:0,reason:""};
  }
  /* 当前装备下能不能做「需要武器的动作」；不能时给出可读原因 */
  function attackBlocked(){
    const cs=combatState();
    if(cs.canAttack)return false;
    CR.ui.toast(cs.reason||"当前装备无法攻击");
    CR.audio.sfx("deny");
    return true;
  }
  /* 战斗内临时的「首技能必中」标记：每次进入新战斗重置 */
  const battleFlag={firstSkillUsed:false};
  function resetBattleFlags(){battleFlag.firstSkillUsed=false;}
  /* 1.4 dev1：基础伤害 = 攻方 8 维战斗值 × 技能威力系数 × 增伤 × 装备攻击倍率。
     暴击 / 克制 / 防御 / 抗性 / 护盾全部下沉到 battlecore.resolve 统一结算。 */
  function rollDamage(mult,forceCrit,magic){
    const m=magic===undefined?currentMagic:!!magic;
    currentAttackMagic=m;
    const cs=combatState();
    const side=CR.battlecore.playerSide();
    const A=CR.battlecore.warStats(side);
    const power=m?A.matk:A.atk;
    const base=Math.max(1,power*mult*(1+P.buff.dmg)*cs.atkMul);
    return {v:Math.round(base),crit:!!forceCrit,magic:m,mult,power};
  }
  function addCombo(){CR.world.addCombo();}
  function energy(n){P.energy=Math.min(P.maxEnergy,P.energy+n);}

  /* ---------- 玩家受击 ---------- */
  function hurtPlayer(dmg,fromX,opt){
    opt=opt||{};
    if(P.inv>0||P.dead||P.dash.inv>0)return;
    markEngage();
    /* 1.4 dev1.3 异常联动：睡眠被攻击唤醒 / 火系驱散冻伤 / 敌对怪概率施加异常 */
    if(CR.status){
      CR.status.onAttacked(P);
      CR.status.onElementHit(P,opt.element||(opt.enemy&&opt.enemy.cfg&&opt.enemy.cfg.element));
      const et=opt.enemy&&opt.enemy.type;
      const onHit={mosquitoSwarm:"poison",musketeer:"burn",shaman:"poison",
        boarKing:"fear",mireLizard:"paralyze"};
      if(onHit[et]&&U.rnd()<.28)CR.status.apply(P,onHit[et],opt.enemy);
    }
    if(stealth.t>0){stealth.t=0;stealth.burst=0;CR.ui.toast("潜行被击破");}
    const BC=CR.battlecore,def=BC.playerSide();
    const e=opt.enemy||null;
    const src=e?BC.enemySide(e):BC.enemySide({cfg:{label:"敌人",element:opt.element||"普通系"}});
    src.core.atk=dmg;src.core.matk=dmg;
    const kind=opt.fixed?"fixed":(opt.magic?"magic":"physical");
    const R=BC.resolve(src,def,{mult:opt.mult||1,kind,
      atkEl:opt.element||(e&&e.cfg&&e.cfg.element)||"普通系",
      defEl:CFG.CLASSES[P.cls].element||"普通系",
      forceHit:opt.forceHit,forceCrit:opt.forceCrit});
    if(!R.hit){
      CR.ent.spawnFloat(P.x,P.depth,72,"MISS","aggro",C.white,false);
      CR.audio.sfx("miss");P.inv=.28;return;
    }
    P.inv=.62;P.hurtT=.3;P.kb=(P.x<fromX?-1:1)*330;
    CR.world.addShake(8);CR.world.addFlash(.55);
    FX.burst(P.x,P.depth,36,C.red,12,160);
    /* 护盾：银灰 / 蓝 / 橙黄三色分别提示 */
    (R.shieldUse||[]).forEach(u=>{
      const sh=BC.SHIELDS[u.type];
      CR.ent.spawnFloat(P.x,P.depth,70+u.value%9,"⛨ "+Math.round(u.value),
        "shield",sh.color,false);
    });
    if(R.absorbed>0)CR.audio.sfx("shield");
    const real=R.hpDamage;
    if(real>0){
      P.hp=Math.max(0,P.hp-real);
      FX.spawnFloat(P.x,P.depth,72,Math.round(real),R.crit?"crit":"hurt",
        R.crit?C.gold:C.red,R.crit);
      CR.audio.sfx("hurt");
      CR.ui.toastDamage&&CR.ui.toastDamage(R);
    }
    energy(8);CR.world.resetCombo();
    if(P.hp<=0){
      if(CR.world.mode==="market"||CR.world.mode==="harbor"){
        P.hp=Math.max(1,Math.round(P.maxHp*.35));P.inv=1.2;
        CR.audio.sfx("heal");
        FX.spawnFloat(P.x,P.depth,78,"!","aggro",C.cyan,false);
        CR.ui.toast("镇上的护卫把你扶了起来 · 安全区不会战败");
        FX.ringFx(P.x,P.depth,C.cyan,60,.4);
      }else if(!P.dead){P.dead=true;CR.audio.setScene("defeat");}
    }
  }

  /* ---------- 敌人受伤 / 死亡（1.3.0：命中·闪避 / 系别克制 / 削防等级） ---------- */
  function damageEnemy(e,dmg,opt){
    if(!e.alive||e.inv>0||e.spawn>0)return false;
    opt=opt||{};
    if(CR.status)CR.status.onElementHit(e,opt.element||currentElement);
    markEngage();
    const BC=CR.battlecore,atk=BC.playerSide(),def=BC.enemySide(e);
    const kind=opt.fixed?"fixed":((opt.magic!==undefined?opt.magic:currentAttackMagic)?"magic":"physical");
    const atkEl=opt.element||currentElement||CFG.CLASSES[P.cls].element||"普通系";
    const defEl=(e.cfg&&e.cfg.element)||"普通系";
    const bonus=[];
    /* 夜樱潜行破隐 +50%：作为增伤乘区进入同类加算 */
    if(stealth.burst>0){
      bonus.push({name:"破隐",v:stealth.burst});
      stealth.burst=0;stealth.t=0;
      CR.ent.spawnFloat(P.x,P.depth,96,"破隐 +50%","crit",C.ghostViolet,true);
      CR.audio.sfx("crit");
    }
    const R=BC.resolve(atk,def,{base:dmg,kind,atkEl,defEl,
      forceHit:opt.forceHit||pendingForceHit,
      forceCrit:opt.crit||opt.forceCrit,bonus,noDodge:opt.noDodge});
    if(!R.hit){
      CR.ent.spawnFloat(e.x,e.depth,62,"--","aggro",C.white,false);
      CR.audio.sfx("miss");return false;
    }
    const real=R.damage;
    /* 护盾提示 */
    (R.shieldUse||[]).forEach(u=>{
      CR.ent.spawnFloat(e.x+14,e.depth,84,"⛨ "+Math.round(u.value),
        "shield",BC.SHIELDS[u.type].color,false);
    });
    /* 击穿：从旧 defLv 改为 8 维【物防等级 -1】，由 battlecore.tick 每 10s 回落 */
    if((opt.basic||pendingBreak)&&combatState().breakChance&&U.rnd()<combatState().breakChance){
      pendingBreak=false;
      const lv=BC.addLevel(def,"pdef",-1);
      CR.ent.spawnFloat(e.x+18,e.depth,80,"!","aggro",C.orange,false);
      if(CR.ui&&CR.ui.toast)CR.ui.toast("击穿！目标物防等级 "+lv+"（每 10 秒向 0 回落）");
    }
    e.hp-=R.hpDamage;e.inv=.085;e.flash=.16;e.barT=1.1;
    /* 1.4 dev1.1 王者樱花套装 4/4：攻击造成伤害的 10% 回血（按最终伤害，含被护盾吸收部分） */
    const ls=CR.equip?CR.equip.bonus(P.cls).lifesteal:0;
    if(ls>0&&R.damage>0&&!P.dead&&P.hp<P.maxHp){
      const heal=Math.min(P.maxHp-P.hp,R.damage*ls);
      if(heal>=1){
        P.hp+=heal;
        CR.ent.spawnFloat(P.x,P.depth,82,Math.round(heal),"heal",C.grass1,false);
      }
    }
    e.kb+=(opt.kb||2)*60*(opt.kbDir||(e.x>=P.x?1:-1));
    if(opt.knock)e.vh=opt.knock;
    if(e.frozen>0&&opt.thaw)e.frozen=0;
    if(!e.hostile){
      e.hostile=true;e.aggro=1;e.cd=.35;
      CR.ent.spawnFloat(e.x,e.depth,88,"!","aggro",C.hpBlue,false);
      CR.audio.sfx("error");
    }
    const tv=R.typeR?R.typeR.value:1;
    const mark=tv>1.001?"!":(tv<0.999?".":"");
    const col=tv>1?C.gold:(tv<1?C.steel:(R.crit?C.gold:(opt.c||C.white)));
    CR.ent.spawnFloat(e.x,e.depth,58+U.rr(-6,10),mark+Math.round(real),
      R.crit?"crit":"dmg",col,R.crit);
    if(tv!==1&&CR.ui&&CR.ui.toast)
      CR.ui.toast((tv>1?"克制！":"效果不理想…")+" "+atkEl+" → "+defEl+" ×"+tv.toFixed(2));
    CR.ent.burst(e.x,e.depth,32,opt.fx||C.fire2,R.crit?12:6,140);
    CR.world.addShake(R.crit?5:2.6);
    CR.audio.sfx(R.crit?"crit":"hit");
    energy(R.crit?5:2.6);addCombo();
    if(opt.slow)e.slow=Math.max(e.slow,opt.slow);
    if(opt.freeze)e.frozen=Math.max(e.frozen,opt.freeze);
    if(opt.stun)e.stun=Math.max(e.stun,opt.stun);
    if(e.hp<=0)killEnemy(e);
    return true;
  }
  function killEnemy(e){
    e.alive=false;
    const cfg=e.cfg;
    CR.world.addKill();
    /* 1.4 dev1：任务档案进度推送（击败指定怪 / BOSS） */
    if(CR.quest&&CR.quest.push)CR.quest.push("kill",{type:e.type});
    /* 1.4 dev1：沼泽怪物专属概率掉落（cfg.drops） */
    if(cfg.drops&&cfg.drops.length){
      const n=cfg===CFG.MOBS.boarKing?3:(U.rnd()<.34?2:1);
      for(let i=0;i<n;i++){
        const id=cfg.drops[U.ri(0,cfg.drops.length-1)];
        const kind=CFG.MATERIALS[id]?"mat":(CFG.ITEMS[id]?"item":"mat");
        CR.ent.spawnDrop(e.x+U.rr(-16,16),e.depth+U.rr(-10,10),kind,id,1);
      }
    }
    const kb=CR.equip?CR.equip.bonus(P.cls):null;
    energy(7+Math.round(7*(kb?kb.energyKill:0)));
    CR.audio.sfx(e.cfg===CFG.MOBS.boss?"explosion":"hit");
    CR.ent.burst(e.x,e.depth,26,cfg===CFG.MOBS.boss?C.gold:cfg.main,
      cfg===CFG.MOBS.boss?40:16,cfg===CFG.MOBS.boss?300:200);
    CR.ent.burst(e.x,e.depth,12,C.white,7,120);
    CR.ent.ringFx(e.x,e.depth,cfg.bar,24,.34);
    const up=SV.addExp(cfg.xp,P.cls);
    if(up>0){
      if(CR.team&&CR.team.onLevelUp)CR.team.onLevelUp();else CR.ent.applyStats();
      CR.audio.sfx("levelup");
      FX.spawnFloat(P.x,P.depth,110,SV.levelOf(P.cls),"levelup",C.gold,true);
      CR.ui.toast("升级！"+SV.teamName(SV.data.team.active)+" Lv."+SV.levelOf(P.cls));
      CR.ui.refreshPanels();
    }
    // 1.3.1 原始森林中立动物：必定掉落兽肉
    if(cfg.animal)CR.ent.spawnDrop(e.x,e.depth,"mat","meat",1+U.ri(0,1));
    // 金币
    const g=cfg.gold+U.ri(0,Math.round(cfg.gold*.4));
    CR.ent.spawnDrop(e.x,e.depth,"gold","",g);
    // 材料 / 道具
    if(U.rnd()<cfg.drop){
      let total=0;CFG.DROP_TABLE.forEach(d=>total+=d.w);
      let r=U.rnd()*total,pickD=CFG.DROP_TABLE[0];
      for(const d of CFG.DROP_TABLE){r-=d.w;if(r<=0){pickD=d;break;}}
      const amount=pickD.k==="mat"?(cfg===CFG.MOBS.boss?3:(cfg===CFG.MOBS.elite?2:1)):1;
      CR.ent.spawnDrop(e.x,e.depth,pickD.k,pickD.id,amount);
      if(cfg===CFG.MOBS.elite||cfg===CFG.MOBS.miniboss)
        CR.ent.spawnDrop(e.x,e.depth,"mat",U.pick(["iron","dust","crystal"]),1);
    }
    if(cfg===CFG.MOBS.miniboss||cfg===CFG.MOBS.boss){
      CR.ent.spawnDrop(e.x,e.depth,"mat","rune",cfg===CFG.MOBS.boss?3:1);
      CR.ent.spawnDrop(e.x,e.depth,"item",U.pick(["potion","tonic","bomb"]),1);
      CR.ent.spawnDrop(e.x,e.depth,"item",cfg===CFG.MOBS.boss?"levelFruit":"expTasty",1);
    }
    // 装备掉落：精英 / 小统领 / BOSS
    const tier=e.type==="boss"?"boss":(e.type==="miniboss"?"miniboss":(e.type==="elite"?"elite":null));
    if(tier&&CFG.EQUIP_DROPS[tier]){
      const chance=tier==="boss"?1:(tier==="miniboss"?.55:.18);
      if(U.rnd()<chance)CR.ent.spawnDrop(e.x,e.depth,"equip",U.pick(CFG.EQUIP_DROPS[tier]),1);
    }
    if(cfg===CFG.MOBS.boss){
      CR.ent.spawnDrop(e.x,e.depth,"mat","ember",2);
      CR.save.addGold(200);
      CR.audio.sfx("victory");
      CR.world.onBossDead();
    }
  }

  /* ---------- 范围伤害 / 特效 ---------- */
  function explode(x,d,r,dmg,c,opt){
    opt=opt||{};
    const roll=opt.flat?{v:Math.round(dmg),crit:!!opt.forceCrit}:rollDamage(dmg,opt.forceCrit);
    CR.ent.enemies.each(e=>{
      if(!e.alive||e.spawn>0)return;
      if(U.dist2(e.x,e.depth,x,d)<r*r)
        damageEnemy(e,roll.v,{crit:roll.crit,fx:c,c:c,kb:opt.kb||3,slow:opt.slow,freeze:opt.freeze});
    });
    FX.ringFx(x,d,c,r*.85,.4);
    FX.glowFx(x,d,14,c,r*.5,.3);
    FX.burst(x,d,14,c,14,200);
    CR.world.addShake(opt.shake||6);
    CR.audio.sfx(opt.sound||"explosion");
  }
  function meleeArc(range,halfD,mult,fx,opt){
    opt=opt||{};
    const mb=CR.equip?CR.equip.bonus(P.cls):null;
    range*=1+(mb?mb.meleeRange:0);
    const roll=rollDamage(mult,opt.forceCrit);
    const cx=P.x+P.facing*14,cd=P.depth;
    let hit=0;
    CR.ent.enemies.each(e=>{
      if(!e.alive||e.spawn>0)return;
      const dx=(e.x-cx)*P.facing;
      if(dx>-22&&dx<range&&Math.abs(e.depth-cd)<halfD&&e.h<56){
        damageEnemy(e,roll.v,{crit:roll.crit,fx:fx,c:fx,kb:opt.kb||5,slow:opt.slow,stun:opt.stun});
        hit++;
      }
    });
    // 斩击弧光（kind 5：p.vx 存朝向，p.size 存半径）
    FX.spawnPart(P.x+P.facing*24,P.depth,38,fx,5,range,.22,
      {vx:P.facing,grav:0,drag:1});
    FX.burst(P.x+P.facing*range*.62,P.depth,36,C.white,hit?7:3,110);
    CR.audio.sfx(opt.sound||"swing");
    return hit;
  }
  function chainLightning(x,d,dmg,jumps){
    let cx=x,cd=d;
    const visited={};
    for(let k=0;k<jumps;k++){
      let best=null,bd=1e9;
      CR.ent.enemies.each(e=>{
        if(!e.alive||visited[e.id]||e.spawn>0)return;
        const dd=U.dist2(e.x,e.depth,cx,cd);
        if(dd<240*240&&dd<bd){bd=dd;best=e;}
      });
      if(!best)break;
      visited[best.id]=1;
      const pts=[[cx,cd,P.h+42]];
      const n=4;
      for(let i=1;i<n;i++){
        const t=i/n;
        pts.push([U.lerp(cx,best.x,t)+U.rr(-16,16),U.lerp(cd,best.depth,t)+U.rr(-12,12),P.h+U.rr(22,58)]);
      }
      pts.push([best.x,best.depth,P.h+38]);
      FX.spawnBeam(pts,C.cyan,2.4,.22);
      const roll=rollDamage(dmg*(1-k*.12));
      damageEnemy(best,roll.v,{crit:roll.crit,fx:C.cyan,c:C.cyan,kb:1,stun:.18});
      CR.ent.glowFx(best.x,best.depth,36,C.cyan,26,.24);
      cx=best.x;cd=best.depth;
    }
    CR.audio.sfx("thunder");
  }
  function delayedAOE(x,d,r,dmg,c,delay,opt){
    const s=CR.ent.spawnShot(9,x,d,0,0,0,0,0,delay,c,false);
    if(s){s.r=r;s.life=delay;s.dmg=dmg;s.c=c;s.delay=delay;}
    return s;
  }

  /* ---------- 普攻 / 蓄力 / 跳跃 ---------- */
  function doAttack(){
    if(P.dead||P.atkCd>0||CR.input.charging)return;
    if(CR.status&&CR.status.noAction()){CR.ui.toast(CR.status.blockReason()||"异常状态 · 无法行动");return;}
    if(CR.status&&CR.status.failSkill()){
      P.atkCd=Math.max(P.atkCd,.22);
      CR.ui.toast("⚡ 麻痹 · 普攻失效");CR.audio.sfx("deny");return;
    }
    if(attackBlocked())return;
    currentElement=CFG.CLASSES[P.cls].element||"普通系";
    pendingBreak=combatState().breakChance>0;
    const c=CFG.CLASSES[P.cls];
    P.atkCd=c.atkCd/(1+P.buff.dmg*.4);
    P.atkT=.2;P.comboN=(P.comboN+1)%3;
    if(P.cls===0){
      meleeArc(P.range,36,1,C.steel,{kb:5,sound:P.comboN===2?"swingHeavy":"swing"});
    }else if(P.cls===1||P.cls===3){
      /* 1.3.1 修复：此前误写为未定义的 branch，导致法师 / 射手 / 夜樱普攻整帧抛错 */
      const magic=P.cls===1;
      const s=FX.spawnShot(1,P.x+P.facing*24,P.depth+P.h,34,P.facing*(magic?350:420),0,0,
        rollDamage(1,false,magic).v,1.6,magic?C.fire:C.sakura,false);
      if(s){s.r=10;s.basic=true;s.fromPlayer=true;}
      CR.audio.sfx(magic?"fireball":"bow");
    }else{
      const s=FX.spawnShot(2,P.x+P.facing*24,P.depth,34,P.facing*680,0,0,
        rollDamage(1).v,1.0,C.gold,false);
      if(s){s.pierce=1;s.basic=true;}
      CR.audio.sfx("arrow");
    }
  }
  function doCharge(lv){
    if(P.dead)return;
    if(attackBlocked())return;
    currentElement=CFG.CLASSES[P.cls].element||"普通系";
    const big=lv===2,mul=big?3.3:2.1;
    P.atkT=.34;P.skT=.34;
    CR.audio.sfx("chargeRelease");
    CR.world.addWhite(big?.30:.16);
    CR.world.addShake(big?9:5);
    FX.ringFx(P.x,P.depth,big?C.gold:C.white,big?110:70,.34);
    if(P.cls===0){
      const roll=rollDamage(mul);
      const cx=P.x+P.facing*16;let hit=0;
      CR.ent.enemies.each(e=>{
        if(!e.alive||e.spawn>0)return;
        const dx=(e.x-cx)*P.facing;
        if(dx>-26&&dx<(big?190:140)&&Math.abs(e.depth-P.depth)<(big?70:52)&&e.h<62){
          damageEnemy(e,roll.v,{crit:roll.crit,fx:C.gold,c:C.gold,kb:12,knock:180,stun:.2});hit++;
        }
      });
      FX.spawnPart(P.x,P.depth,38,C.gold,5,big?190:140,.28,{vx:P.facing,grav:0,drag:1});
      FX.burst(P.x+P.facing*100,P.depth,24,C.gold,big?24:12,240);
      if(big)FX.ringFx(P.x,P.depth,C.fire,150,.4);
    }else if(P.cls===1||P.cls===3){
      const s=FX.spawnShot(1,P.x+P.facing*26,P.depth+P.h,36,P.facing*(big?300:360),0,0,
        rollDamage(mul).v,2.2,C.fire,false);
      if(s){s.r=big?30:20;s.dmg=rollDamage(mul).v;}
      CR.audio.sfx("fireball");
    }else{
      const s=FX.spawnShot(6,P.x+P.facing*26,P.depth,36,P.facing*980,0,0,
        rollDamage(mul).v,1.4,C.gold,false);
      if(s){s.pierce=99;s.r=big?16:12;}
      CR.audio.sfx("bow");
    }
    FX.glowFx(P.x+P.facing*20,P.depth,38,big?C.gold:C.white,big?46:30,.3);
  }
  function doJump(){
    if(CR.status&&CR.status.noAction()){CR.ui.toast("异常状态 · 无法跳跃");return;}
    if(P.dead)return;
    if(P.jumps>=2)return;
    const second=P.jumps===1;
    P.jumps++;
    P.vh=second?330:370;
    P.h=Math.max(P.h,1);
    CR.audio.sfx(second?"doubleJump":"jump");
    FX.burst(P.x,P.depth,4,second?C.cyan:C.grass1,second?14:8,110,{grav:280});
    if(second){FX.ringFx(P.x,P.depth,C.cyan,42,.3);CR.world.addWhite(.10);}
  }

  /* ---------- 4 技能 ---------- */
  /* 1.3.0 技能模板化：模板 id → 动画执行器分派，新增技能不再重复写特效 */
  const LEGACY_ANIM={
    cleave:[0,0],whirlwind:[0,1],charge:[0,2],warcry:[0,3],
    fireball:[1,0],frostNova:[1,1],chainLight:[1,2],meteor:[1,3],
    tripleArrow:[2,0],arrowRain:[2,1],rollShot:[2,2],pierceShot:[2,3]
  };
  /* 1.3.1 夜樱专属动画执行器集合（交给 execSakura，不再套用射手 / 法师旧特效） */
  const SAKURA_ANIMS={sakuraArc:1,nightStab:1,blink:1,fan8:1,bind:1,reverse:1,
    combo4:1,blizzard:1,stealth:1,wave:1,slam:1,flash6:1,execute:1,ultimate:1};
  function doSkill(i){
    if(P.dead||i<0||i>3)return;
    if(CR.status&&CR.status.noAction()){CR.ui.toast(CR.status.blockReason()||"异常状态 · 无法释放技能");return;}
    const list=SV.equippedSkills?SV.equippedSkills(P.cls):CFG.CLASSES[P.cls].skills;
    const sid=list[i];
    if(!sid){CR.ui.toast("技能槽 "+(i+1)+" 为空 · 按 C 打开角色面板配置");CR.audio.sfx("deny");return;}
    const sk=CFG.SKILLS[sid];if(!sk)return;
    /* 1.3.1 技能学习等级：未达到 learnLv 不能释放 */
    if(sk.learnLv&&SV.levelOf&&SV.levelOf(P.cls)<sk.learnLv){
      CR.ui.toast("【"+sk.name+"】需要 Lv."+sk.learnLv+"（当前 Lv."+SV.levelOf(P.cls)+"）");
      CR.audio.sfx("deny");return;
    }
    const allow=CR.equip&&CR.equip.skillAllowed?CR.equip.skillAllowed(P.cls,sid):{ok:true,reason:""};
    if(!allow.ok){CR.ui.toast(allow.reason);CR.audio.sfx("deny");return;}
    if(P.cd[i]>0){CR.ui.toast(sk.name+" 冷却中 "+P.cd[i].toFixed(1)+"s");CR.audio.sfx("error");return;}
    if(P.energy<sk.cost){CR.ui.toast("能量不足（需要 "+sk.cost+"）");CR.audio.sfx("error");return;}
    P.cd[i]=sk.cd;P.energy-=sk.cost;P.skT=.45;P.skIdx=i;
    /* 麻痹：能量已扣、CD 已转，但技能没有释放出来 */
    if(CR.status&&CR.status.failSkill()){
      CR.ui.toast("⚡ 麻痹 · 【"+sk.name+"】被打断（能量与冷却已消耗）");
      CR.audio.sfx("deny");return;
    }
    CR.ui.banner(sk.name);
    currentElement=sk.element||"普通系";currentMagic=!!sk.magic;
    const cs=combatState();
    pendingForceHit=cs.firstSkillHit&&!battleFlag.firstSkillUsed;
    if(pendingForceHit){battleFlag.firstSkillUsed=true;CR.ui.toast("细心 · 本场首次技能必定命中");}
    const lg=LEGACY_ANIM[sid];
    if(lg)execLegacy(lg[0],lg[1],sk);else execGeneric(sk);
    pendingForceHit=false;currentMagic=false;pendingBreak=false;
  }
  /* 复用 1.0~1.2 的手写技能特效（branch: 0 战士 / 1 法师 / 2 射手） */
  function execLegacy(branch,i,sk){
    const c=CFG.CLASSES[P.cls];
    CR.audio.sfx("buff");
    FX.ringFx(P.x,P.depth,c.color,52,.34);
    const F=P.facing;
    if(branch===0){
      if(i===0){ // 裂地斩
        const roll=rollDamage(2.2);
        const cx=P.x+F*18;let n=0;
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          const dx=(e.x-cx)*F;
          if(dx>-24&&dx<140&&Math.abs(e.depth-P.depth)<52&&e.h<60){
            damageEnemy(e,roll.v,{crit:roll.crit,fx:C.gold,c:C.gold,kb:13,knock:150});n++;
          }
        });
        FX.spawnPart(P.x,P.depth,26,C.gold,5,140,.30,{vx:F,grav:0,drag:1});
        FX.ringFx(P.x+F*70,P.depth,C.gold,90,.4);
        CR.world.addShake(9);CR.audio.sfx("swingHeavy");
      }else if(i===1){ // 旋风斩（两段）
        const a=rollDamage(1.7),b=rollDamage(1.7);
        const hit=r=>CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          if(U.dist2(e.x,e.depth,P.x,P.depth)<r*r)
            damageEnemy(e,a.v,{crit:a.crit,fx:C.steel,c:C.steel,kb:6});
        });
        hit(140);
        FX.ringFx(P.x,P.depth,C.steel,140,.42);
        FX.spawnPart(P.x,P.depth,40,C.white,5,140,.4,{vx:F,grav:0,drag:1});
        CR.world.addShake(8);
        // 第二段：0.18s 后再次结算 140 范围
        const s=FX.spawnShot(10,P.x,P.depth,0,0,0,0,0,.18,C.steel,false);
        if(s){s.delay=0;s.life=.18;s.r=140;s.dmg=b.v;s.c=C.steel;s.crit=b.crit;}
      }else if(i===2){ // 冲锋
        P.dash.t=.30;P.dash.vx=F*820;P.dash.inv=.30;
        const roll=rollDamage(1.9);
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          const dx=(e.x-P.x)*F;
          if(dx>-30&&dx<260&&Math.abs(e.depth-P.depth)<58){
            damageEnemy(e,roll.v,{crit:roll.crit,fx:C.fire,c:C.orange,kb:16,knock:210,stun:.3});
          }
        });
        FX.burst(P.x,P.depth,20,C.fire,20,260);
        CR.world.addShake(7);CR.audio.sfx("swingHeavy");
      }else{ // 战吼
        P.buff.dmg=.35;P.buff.spd=.15;P.buff.shield=45;P.buff.t=8;
        const heal=Math.round(P.maxHp*.22);
        P.hp=Math.min(P.maxHp,P.hp+heal);
        FX.spawnFloat(P.x,P.depth,88,heal,"heal",C.green,false);
        FX.ringFx(P.x,P.depth,C.gold,180,.6);
        FX.glowFx(P.x,P.depth,40,C.gold,80,.5);
        CR.world.addWhite(.22);CR.world.addShake(6);
        CR.audio.sfx("buff");CR.audio.sfx("heal");
      }
    }else if(P.cls===1){
      if(i===0){ // 爆裂火球
        const s=FX.spawnShot(1,P.x+F*26,P.depth,36,F*360,0,0,rollDamage(1.4).v,2,C.fire,false);
        if(s)s.r=16;CR.audio.sfx("fireball");
      }else if(i===1){ // 冰霜新星
        const roll=rollDamage(2.0);
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          if(U.dist2(e.x,e.depth,P.x,P.depth)<195*195)
            damageEnemy(e,roll.v,{crit:roll.crit,fx:C.ice,c:C.cyan,kb:3,slow:2.5,freeze:1.6});
        });
        FX.ringFx(P.x,P.depth,C.ice,195,.55);
        FX.glowFx(P.x,P.depth,20,C.ice,110,.45);
        FX.burst(P.x,P.depth,18,C.ice,28,240,{grav:120});
        CR.world.addWhite(.18);CR.audio.sfx("ice");
      }else if(i===2){ // 连锁闪电
        chainLightning(P.x,P.depth,2.0,6);
        CR.world.addWhite(.12);
      }else{ // 天陨
        for(let k=0;k<3;k++){
          const x=P.x+F*(160+k*85)+U.rr(-20,20),d=P.depth+U.rr(-40,40);
          const s=CR.ent.spawnShot(4,x,d,300,0,0,-260,rollDamage(3.4).v,1.2,C.fire,false);
          if(s){s.delay=.20+k*.14;s.dmg=rollDamage(3.4).v;s.r=100;}
          CR.ent.ringFx(x,d,C.fire,80,.9);
        }
        CR.world.addShake(5);CR.audio.sfx("boss");
      }
    }else{
      if(i===0){ // 三连箭
        for(let k=-1;k<=1;k++){
          const s=FX.spawnShot(2,P.x+F*26,P.depth,34,F*720,k*90,0,
            rollDamage(1).v,1.0,C.gold,false);
          if(s)s.pierce=1;
        }
        CR.audio.sfx("bow");
      }else if(i===1){ // 箭雨
        for(let k=0;k<12;k++){
          const x=P.x+F*(80+k*40)+U.rr(-18,18),d=P.depth+U.rr(-52,52);
          const s=CR.ent.spawnShot(3,x,d,250,0,0,-460,rollDamage(.85).v,1.2,C.gold,false);
          if(s){s.delay=k*.05;s.fall=true;}
        }
        CR.audio.sfx("bow");
      }else if(i===2){ // 翻滚齐射
        P.dash.t=.22;P.dash.vx=-F*620;P.dash.inv=.22;
        for(let k=0;k<8;k++){
          const a=(-.55+k*.16)*F;
          const s=FX.spawnShot(2,P.x,P.depth,32,
            Math.cos(a)*640*F,Math.sin(a)*300,0,rollDamage(.8).v,.8,C.gold,false);
          if(s)s.pierce=1;
        }
        FX.burst(P.x,P.depth,12,C.white,12,160);
        CR.audio.sfx("bow");
      }else{ // 贯穿狙击
        const s=FX.spawnShot(6,P.x+F*28,P.depth,38,F*1500,0,0,
          rollDamage(5.0,true).v,1.2,C.cyan,true);
        if(s){s.pierce=99;s.r=18;}
        const b=FX.spawnBeam([[P.x,P.depth,38],[P.x+F*760,P.depth,38]],C.cyan,5,.22);
        CR.world.addWhite(.28);CR.world.addShake(8);
        CR.audio.sfx("crit");
      }
    }
  }

  /* 1.3.0 通用动画执行器：突刺 / 藤蔓 / 星轮 / 大火球 / 水龙卷共用 */
  function execGeneric(sk){
    if(SAKURA_ANIMS[sk.anim]){execSakura(sk);return;}
    const F=P.facing,mul=sk.power||1.5,magic=!!sk.magic;
    const col=CFG.ELEMENT_COLOR[sk.element]||C.white;
    const roll=()=>rollDamage(mul,false,magic);
    CR.audio.sfx("buff");
    if(sk.anim==="thrust"||sk.anim==="dash"){
      P.dash.t=.28;P.dash.vx=F*(sk.anim==="thrust"?860:760);P.dash.inv=.28;
      const r=roll();
      CR.ent.enemies.each(e=>{
        if(!e.alive||e.spawn>0)return;
        const dx=(e.x-P.x)*F;
        if(dx>-34&&dx<250&&Math.abs(e.depth-P.depth)<58)
          damageEnemy(e,r.v,{crit:r.crit,fx:col,c:col,kb:14,knock:170,
            stun:sk.id==="lightningRush"?1.0:0,element:sk.element});
      });
      FX.burst(P.x,P.depth,20,col,20,250);
      FX.ringFx(P.x+F*110,P.depth,col,90,.38);
      CR.audio.sfx(sk.id==="lightningRush"?"thunder":"swingHeavy");
    }else if(sk.anim==="vine"||sk.anim==="aoe"){
      const r=roll(),radius=sk.anim==="vine"?175:190;
      CR.ent.enemies.each(e=>{
        if(!e.alive||e.spawn>0)return;
        if(U.dist2(e.x,e.depth,P.x,P.depth)<radius*radius)
          damageEnemy(e,r.v,{crit:r.crit,fx:col,c:col,kb:sk.anim==="vine"?2:12,
            stun:sk.anim==="vine"?1.2:0,slow:sk.anim==="vine"?2:0,element:sk.element});
      });
      FX.ringFx(P.x,P.depth,col,radius,.55);
      FX.glowFx(P.x,P.depth,20,col,radius*.6,.45);
      FX.burst(P.x,P.depth,18,col,26,220,{grav:120});
      CR.audio.sfx(sk.anim==="vine"?"ice":"boss");
    }else if(sk.anim==="projectile"){
      const s=FX.spawnShot(1,P.x+F*26,P.depth,36,F*360,0,0,roll().v,2,col,false);
      if(s){s.r=22;s.element=sk.element;}
      CR.audio.sfx("fireball");
    }else if(sk.anim==="meteor"){
      for(let k=0;k<3;k++){
        const x=P.x+F*(160+k*85)+U.rr(-20,20),d=P.depth+U.rr(-40,40);
        const s=CR.ent.spawnShot(4,x,d,300,0,0,-260,roll().v,1.2,col,false);
        if(s){s.delay=.20+k*.14;s.dmg=roll().v;s.r=100;}
        CR.ent.ringFx(x,d,col,80,.9);
      }
      CR.world.addShake(5);CR.audio.sfx("boss");
    }
  }

  /* ================= 1.3.1 夜樱专属技能执行器（按【夜樱技能表.csv】） =================
     全部复用同一组辅助：hitFront / hitAround / delayAoE / petals / nearestEnemy，
     14 个技能只描述「打哪里、打几段、附加什么状态」，不重复写特效代码。 */
  function execSakura(sk){
    const F=P.facing,col=CFG.ELEMENT_COLOR[sk.element]||C.sakura;
    const dmg=(m)=>rollDamage(m===undefined?(sk.power||1):m,false,!!sk.magic).v;
    const petals=(n,spread,up)=>{
      for(let i=0;i<n;i++)FX.spawnPart(P.x+U.rr(-spread,spread),P.depth+U.rr(-40,40),
        U.rr(16,100),i%3===0?C.ghostViolet:C.sakura,0,U.rr(2,5),U.rr(.5,1.2),
        {vx:U.rr(-.35,.35),vh:U.rr(up?20:-40,up?90:30),grav:up?-18:110});
    };
    const hitFront=(range,halfD,dv,o)=>{
      CR.ent.enemies.each(e=>{
        if(!e.alive||e.spawn>0)return;
        const dx=(e.x-P.x)*F;
        if(dx>-34&&dx<range&&Math.abs(e.depth-P.depth)<halfD)
          damageEnemy(e,dv,Object.assign({fx:C.sakura,c:col,element:sk.element,kb:6},o||{}));
      });
    };
    const hitAround=(radius,dv,o)=>{
      CR.ent.enemies.each(e=>{
        if(!e.alive||e.spawn>0)return;
        if(U.dist2(e.x,e.depth,P.x,P.depth)<radius*radius)
          damageEnemy(e,dv,Object.assign({fx:C.sakura,c:col,element:sk.element,kb:8},o||{}));
      });
    };
    const delayAoE=(x,d,r,dv,delay,color)=>{
      const q=FX.spawnShot(10,x,d,18,0,0,0,dv,.01,color||C.sakura,false);
      if(q){q.delay=delay;q.life=.01;q.r=r;q.c=color||C.sakura;}
    };
    const nearest=(range)=>{
      let best=null,bd=1e9;
      CR.ent.enemies.each(e=>{
        if(!e.alive||e.spawn>0)return;
        const d=Math.abs(e.x-P.x);
        if(d<range&&d<bd){bd=d;best=e;}
      });
      return best;
    };
    markEngage();
    CR.audio.sfx("buff");
    FX.ringFx(P.x,P.depth,C.sakura,46,.28);
    switch(sk.anim){
      case "sakuraArc":{ /* 樱刃斩：身前 1 身位粉白弧刀 */
        hitFront(96,48,dmg(),{kb:5});
        FX.spawnBeam([[P.x+P.facing*10,P.depth,44],[P.x+F*96,P.depth,10]],
          C.sakura,9,.22);
        petals(5,40,true);CR.audio.sfx("swing");
        CR.world.addShake(3);break;
      }
      case "nightStab":{ /* 夜影刺：突进 1 身位，背后命中 +20% */
        const from=P.x;P.dash.t=.22;P.dash.vx=F*520;P.dash.inv=.22;
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          const dx=e.x-(from+F*70);
          if(Math.abs(dx)<90&&Math.abs(e.depth-P.depth)<48){
            const behind=(e.x-from)*F>0&&e.facing===F;
            damageEnemy(e,Math.round(dmg()*(behind?1+(sk.backBonus||.2):1)),
              {fx:C.ghostViolet,c:C.ghostViolet,element:sk.element,kb:8});
          }
        });
        FX.burst(from+F*70,P.depth,18,C.ghostViolet,16,220);
        petals(4,26,true);CR.audio.sfx("swingHeavy");break;
      }
      case "blink":{ /* 幽影步：3 身位位移 + 0.4s 无敌 + 路径擦伤 */
        const from=P.x;P.dash.t=.4;P.dash.vx=F*470;P.dash.inv=sk.invuln||.4;
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          const lo=Math.min(from,from+F*190),hi=Math.max(from,from+F*190);
          if(e.x>lo-30&&e.x<hi+30&&Math.abs(e.depth-P.depth)<52)
            damageEnemy(e,dmg(),{fx:C.ghostViolet,c:C.ghostViolet,element:sk.element,kb:3});
        });
        for(let i=0;i<5;i++){
          FX.glowFx(from+(from+F*190-from)*i/5,P.depth,30,C.ghostViolet,26,.3);
          petals(2,30,true);
        }
        CR.audio.sfx("switch");break;
      }
      case "fan8":{ /* 樱花弹幕：8 枚扇形樱刃，后续命中衰减 30% */
        const n=sk.hits||8,base=dmg();
        for(let i=0;i<n;i++){
          const a=(i-(n-1)/2)*.115;
          const q=FX.spawnShot(2,P.x+F*26,P.depth+P.h,38,
            F*Math.cos(a)*560,Math.sin(a)*300,Math.sin(a)*40,
            i===0?base:Math.round(base*(sk.decay||.3)),1.25,C.sakura,false);
          if(q){q.r=8;q.fromPlayer=true;q.element=sk.element;}
        }
        petals(6,32,true);CR.audio.sfx("arrow");break;
      }
      case "bind":{ /* 落樱缚：地面法阵 + 40% 减速 2s + 击落浮空 */
        const cx=P.x+F*150;
        FX.ringFx(cx,P.depth,C.sakura,96,.8);
        FX.glowFx(cx,P.depth,10,C.pink,90,.7);
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          if(U.dist2(e.x,e.depth,cx,P.depth)<96*96){
            damageEnemy(e,dmg(),{fx:C.pink,c:C.pink,element:sk.element,slow:2,kb:2});
            if(e.h>20)e.vh=-140;
          }
        });
        petals(12,90,true);CR.audio.sfx("ice");break;
      }
      case "reverse":{ /* 逆影斩：闪至最近敌人身后，0.3s 闪避 */
        const e=nearest(520);
        if(e){P.x=e.x-F*46;P.facing=e.x>=P.x?1:-1;}
        else P.x-=F*120;
        P.inv=Math.max(P.inv,sk.dodge||.3);
        FX.glowFx(P.x,P.depth,40,C.ghostViolet,70,.35);
        hitFront(120,54,dmg(),{kb:10,stun:.2});
        petals(8,44,true);CR.world.addWhite(.12);CR.audio.sfx("swingHeavy");break;
      }
      case "combo4":{ /* 飞樱连斩：4 段推进斩，末段击飞 */
        const n=sk.hits||4;
        for(let i=0;i<n;i++){
          const x=P.x+F*(60+i*52);
          delayAoE(x,P.depth,62,dmg(),i*.12,i===n-1?C.gold:C.sakura);
          FX.spawnBeam([[x-F*24,P.depth,50],[x+F*24,P.depth,12]],C.sakura,5,.2);
        }
        petals(10,80,true);CR.audio.sfx("swing");break;
      }
      case "blizzard":{ /* 樱吹雪：2 秒 10 段雪幕，敌移速 -25% */
        const n=sk.hits||10;
        P.h=Math.max(P.h,70);P.vh=Math.max(P.vh,60);
        for(let i=0;i<n;i++)delayAoE(P.x+F*70,P.depth,150,dmg(),i*.2,C.sakura);
        CR.ent.enemies.each(e=>{if(e.alive)e.slow=Math.max(e.slow,2);});
        for(let i=0;i<26;i++)petals(1,150,false);
        CR.world.addWhite(.18);CR.audio.sfx("ice");break;
      }
      case "stealth":{ /* 夜樱潜行：4 秒潜行，破隐首击 +50% */
        stealth.t=sk.stealth||4;stealth.burst=sk.burst||.5;
        P.buff.spd=Math.max(P.buff.spd,.30);P.buff.t=Math.max(P.buff.t,stealth.t);
        for(let i=0;i<20;i++)petals(1,50,true);
        CR.ui.toast("进入潜行 · 敌人不会主动攻击，下一次攻击 +50%");
        CR.audio.sfx("shield");break;
      }
      case "wave":{ /* 影断樱华：蓄力 0.3s 贯穿斩波 + 眩晕 */
        const q=FX.spawnShot(6,P.x+F*30,P.depth+P.h,40,F*900,0,0,dmg(),.5,C.ghostViolet,false);
        if(q){q.delay=.3;q.pierce=99;q.r=30;q.fromPlayer=true;}
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          const dx=(e.x-P.x)*F;
          if(dx>-30&&dx<300&&Math.abs(e.depth-P.depth)<60){
            const bonus=(e.slow>0||e.stun>0)?(1+(sk.bonus||.3)):1;
            damageEnemy(e,Math.round(dmg()*bonus),
              {fx:C.ghostViolet,c:col,element:sk.element,stun:sk.stun||1,kb:12});
          }
        });
        FX.spawnBeam([[P.x,P.depth,44],[P.x+F*300,P.depth,24]],C.ghostViolet,14,.4);
        petals(14,120,true);CR.world.addShake(8);CR.audio.sfx("boss");break;
      }
      case "slam":{ /* 樱华葬：周身爆发，中心额外 50%，击退 */
        const R0=150;
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          const d=Math.hypot(e.x-P.x,e.depth-P.depth);
          if(d<R0)damageEnemy(e,Math.round(dmg()*(d<60?1+(sk.centerBonus||.5):1)),
            {fx:C.sakura,c:col,element:sk.element,kb:18,knock:190,stun:.2});
        });
        FX.ringFx(P.x,P.depth,C.sakura,R0,.6);
        FX.ringFx(P.x,P.depth,C.ghostViolet,60,.4);
        petals(24,150,true);CR.world.addWhite(.28);CR.world.addShake(11);
        CR.audio.sfx("explosion");break;
      }
      case "flash6":{ /* 影舞樱华：6 段随机影闪，全程无敌 */
        const n=sk.hits||6;P.inv=Math.max(P.inv,sk.invuln||1.4);
        for(let i=0;i<n;i++){
          const x=P.x+U.rr(-30,180)*F,d=P.depth+U.rr(-50,50);
          delayAoE(x,d,86,dmg(),i*.22,C.ghostViolet);
          FX.glowFx(x,d,34,C.ghostViolet,40,.3);
          petals(3,80,true);
        }
        CR.audio.sfx("switch");break;
      }
      case "execute":{ /* 彼岸归引：标记低血目标，斩杀追加 200% */
        let target=null,bd=1e9;
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          const d=Math.abs(e.x-P.x);
          if(d<560&&d<bd){bd=d;target=e;}
        });
        FX.ringFx(P.x+F*120,P.depth,C.ghostViolet,120,.7);
        if(target){
          const low=target.hp/target.maxHp;
          let v=dmg();
          if(low<(sk.execute||.2))v+=Math.round(dmg(sk.execBonus||2.0));
          const willKill=low<(sk.execute||.2);
          damageEnemy(target,v,{fx:C.ghostViolet,c:C.ghostViolet,
            element:sk.element,kb:14,stun:.3,crit:willKill});
          FX.spawnBeam([[P.x,P.depth,44],[target.x,target.depth,30]],C.ghostViolet,9,.4);
          if(willKill){
            const list=SV.equippedSkills?SV.equippedSkills(P.cls):[];
            const k=list.indexOf("shadowStep");
            if(k>=0)P.cd[k]=0;
            P.hp=Math.min(P.maxHp,P.hp+Math.round(P.maxHp*.12));
            CR.ui.toast("彼岸归引 · 斩杀！幽影步冷却已刷新");
          }
        }else petals(10,100,true);
        petals(18,130,true);CR.world.addWhite(.22);CR.audio.sfx("boss");break;
      }
      case "ultimate":{ /* 夜樱万华斩：3 秒 15 段风暴 + 终结一击 */
        const n=sk.hits||15,dur=sk.duration||3;
        P.h=Math.max(P.h,110);P.vh=Math.max(P.vh,90);
        for(let i=0;i<n;i++)
          delayAoE(P.x+F*(40+i*11),P.depth,170,dmg(),i*(dur/n),i%2?C.ghostViolet:C.sakura);
        delayAoE(P.x+F*180,P.depth,260,dmg(sk.finish||2.0),dur,C.gold);
        CR.ent.enemies.each(e=>{if(e.alive){e.slow=Math.max(e.slow,dur);e.dodge=0;}});
        for(let i=0;i<40;i++)petals(1,200,true);
        FX.ringFx(P.x+F*120,P.depth,C.sakura,260,.9);
        CR.world.addWhite(.55);CR.world.addShake(14);
        CR.audio.sfx("victory");break;
      }
    }
  }

  /* ---------- 道具使用 ---------- */
  function useItem(id){
    const it=SV.useItem(id,P.cls);
    if(!it){CR.ui.toast("背包里没有 "+(CFG.ITEMS[id]?CFG.ITEMS[id].name:id));return;}
    if(it.blocked){CR.ui.toast(it.msg);CR.audio.sfx("deny");return;}
    /* 1.3.0 养成道具：先打开面板预览 / 选择，确认后才消耗 */
    if(it.deferred){
      CR.audio.sfx("ui");
      if(it.type==="rewash"){CR.ui.openTalent("rewash",id);return;}
      if(it.type==="persona"){CR.ui.openTalent("persona",id);return;}
      if(it.type==="effort"){CR.ui.openTalent("effort",id);return;}
      if(it.type==="egg"){
        CR.ui.toast("带【夜樱蛋】去【魔法丛林】找德鲁伊 · 木隐对话孵化");
        return;
      }
    }
    if(it.type==="exp"||it.type==="expPool"||it.type==="expPoolRand"||it.type==="levelUp"){
      CR.audio.sfx(it.up>0?"levelup":"pickup");
      CR.ui.toast(it.msg+(it.up?" · 升了 "+it.up+" 级":""));
      if(it.up>0&&CR.team&&CR.team.onLevelUp)CR.team.onLevelUp();
      CR.ent.ringFx(P.x,P.depth,C.gold,70,.35);
      CR.ui.refreshPanels();
      return;
    }
    CR.audio.sfx(it.type==="heal"?"heal":(it.type==="buff"?"buff":"pickup"));
    if(it.type==="heal"){
      P.hp=Math.min(P.maxHp,P.hp+it.val);
      FX.spawnFloat(P.x,P.depth,80,it.val,"heal",C.green,false);
    }else if(it.type==="energy"){
      energy(it.val);FX.spawnFloat(P.x,P.depth,80,"+"+it.val,"buff",C.cyan,false);
    }else if(it.type==="buff"){
      P.buff.dmg+=it.val;P.buff.t=Math.max(P.buff.t,30);
      CR.ui.toast("攻击力提升！");
    }else if(it.type==="speed"){
      P.buff.spd+=it.val;P.buff.t=Math.max(P.buff.t,30);
      CR.ui.toast("移速提升！");
    }else if(it.type==="bomb"){
      explode(P.x,P.depth,190,it.val,C.fire,{flat:true});
    }
    FX.ringFx(P.x,P.depth,it.color,60,.35);
    CR.ui.refreshPanels();
  }

  /* ---------- 投射物 ---------- */
  function updateShots(dt){
    if(stealth.t>0){
      stealth.t=Math.max(0,stealth.t-dt);
      if(stealth.t===0)stealth.burst=0;
    }
    CR.ent.shots.each(s=>{
      if(s.delay>0){s.delay-=dt;return;}
      // 延时 AOE（旋风斩第二段）
      if(s.kind===10){
        s.life-=dt;
        if(s.life<=0){
          s.alive=false;
          CR.ent.enemies.each(t=>{
            if(!t.alive||t.spawn>0)return;
            if(U.dist2(t.x,t.depth,s.x,s.depth)<s.r*s.r)
              damageEnemy(t,s.dmg,{crit:s.crit,fx:s.c,c:s.c,kb:6});
          });
          CR.ent.spawnPart(s.x,s.depth,s.h+4,s.c,1,s.r,.32,{grow:s.r*2.1,vx:0,vh:0,grav:0,drag:1});
          CR.ent.spawnPart(s.x,s.depth,s.h+20,s.c,5,s.r,.3,{vx:P.facing,grav:0,drag:1});
          CR.world.addShake(4);
        }
        return;
      }
      if(s.kind===9){s.alive=false;return;}
      // 落体类：陨石 / 箭雨
      if(s.kind===4||s.kind===3){
        s.h+=s.vh*dt;s.vh-=980*dt;
        if(s.kind===3&&U.rnd()<.35)
          CR.ent.spawnPart(s.x,s.depth,s.h,C.gold,0,2,.2,{vx:0,vh:40,grav:0});
        if(s.h<=0){
          s.alive=false;
          const r=s.kind===4?s.r:36;
          const c=s.kind===4?C.fire:C.gold;
          const roll={v:s.dmg,crit:s.crit};
          CR.ent.enemies.each(e=>{
            if(!e.alive||e.spawn>0)return;
            if(U.dist2(e.x,e.depth,s.x,s.depth)<r*r)
              damageEnemy(e,roll.v,{crit:false,fx:c,c:c,kb:s.kind===4?9:3});
          });
          CR.ent.ringFx(s.x,s.depth,c,r*.8,.38);
          CR.ent.burst(s.x,s.depth,10,c,s.kind===4?24:8,220);
          CR.world.addShake(s.kind===4?9:2);
          CR.audio.sfx(s.kind===4?"explosion":"hit");
        }
        return;
      }
      s.x+=s.vx*dt;s.depth+=s.vd*dt;s.h+=s.vh*dt;s.life-=dt;
      s.trail+=dt;
      if(s.trail>.035){
        s.trail=0;
        const col=s.kind===1?C.fire:(s.kind===6?C.cyan:C.gold);
        CR.ent.spawnPart(s.x,s.depth,s.h,col,3,s.kind===6?12:7,.22,
          {vx:-s.vx*.10,vh:0,grav:0,drag:.9});
      }
      if(!s.fromPlayer){
        if(U.dist2(s.x,s.depth,P.x,P.depth)<34*34&&P.h<52){
          s.alive=false;hurtPlayer(s.dmg,s.x,{enemy:s.from||null,magic:!!s.magic,fixed:!!s.fixed,element:s.element});
          CR.ent.burst(s.x,s.depth,30,C.red,8,120);
        }
      }else{
        let hit=false;
        CR.ent.enemies.each(e=>{
          if(hit||!e.alive||e.spawn>0||s.visited[e.id%64])return;
          if(Math.abs(e.x-s.x)<26+e.scale*9&&Math.abs(e.depth-s.depth)<30&&e.h<62){
            s.visited[e.id%64]=1;
            if(s.kind===1){
              s.alive=false;hit=true;
              const roll={v:s.dmg,crit:s.crit};
              CR.ent.enemies.each(t=>{
                if(!t.alive||t.spawn>0)return;
                if(U.dist2(t.x,t.depth,s.x,s.depth)<(s.r*4.4)*(s.r*4.4))
                  damageEnemy(t,Math.round(roll.v*.72),{fx:C.fire,c:C.orange,kb:4});
              });
              damageEnemy(e,roll.v,{crit:roll.crit,fx:C.fire,c:C.fire,kb:5});
              CR.ent.ringFx(s.x,s.depth,C.fire,s.r*4.2,.36);
              CR.ent.glowFx(s.x,s.depth,s.h,C.fire,s.r*2.4,.28);
              CR.world.addShake(5);CR.audio.sfx("explosion");
            }else{
              damageEnemy(e,s.dmg,{crit:s.crit,fx:s.c,c:s.c,kb:4});
              if(s.pierce>0)s.pierce--;else{s.alive=false;hit=true;}
            }
          }
        });
      }
      if(s.life<=0||s.x<CR.world.camX-140||s.x>CR.world.camX+CR.gl.W/CR.gl.S+200||Math.abs(s.depth)>140){
        if(s.kind===1&&s.life<=0){
          CR.ent.ringFx(s.x,s.depth,C.fire,s.r*3,.3);
          CR.audio.sfx("explosion");
        }
        s.alive=false;
      }
    });
  }

  /* ---------- 掉落拾取 ---------- */
  function updateDrops(dt){
    CR.ent.drops.each(d=>{
      const dx=P.x-d.x,dd=P.depth-d.depth,dd2=dx*dx+dd*dd;
      if(dd2<95*95&&dd2>1){
        const k=Math.min(1,dt*5.5);
        d.x+=dx*k;d.depth+=dd*k;
      }
      if(dd2<48*48){
        d.alive=false;
        CR.audio.sfx(d.kind==="gold"?"coin":"pickup");
        if(d.kind==="gold"){
          CR.save.addGold(d.amount);
          CR.ent.spawnFloat(d.x,d.depth,30,d.amount,"gold",C.gold,false);
        }else if(d.kind==="mat"){
          CR.save.addMat(d.id,d.amount);
          const m=CFG.MATERIALS[d.id];
          CR.ent.spawnFloat(d.x,d.depth,30,d.amount,"mat",m.color,false);
          CR.ui.toast("获得 "+m.name+" ×"+d.amount);
        }else if(d.kind==="equip"){
          SV.addEquip(d.id,d.amount);
          const eq=CFG.EQUIPMENT[d.id];
          CR.ent.spawnFloat(d.x,d.depth,30,d.amount,"item",C.gold,false);
          CR.ui.toast("获得装备 "+eq.name+" · 到角色面板穿戴");
        }else{
          SV.addItem(d.id,d.amount);
          const it=CFG.ITEMS[d.id];
          CR.ent.spawnFloat(d.x,d.depth,30,d.amount,"item",it.color,false);
          CR.ui.toast("获得 "+it.name+" ×"+d.amount);
        }
        CR.ent.burst(d.x,d.depth,20,d.kind==="gold"?C.gold:C.white,7,110,{grav:200});
        CR.ui.refreshPanels();
      }
    });
  }

  /* ---------- 敌人 AI ---------- */
  let hadHostile=false;
  function updateAI(dt){
    const px=P.x,pd=P.depth;
    /* 1.3.0：每场战斗首次技能必中；敌对单位清空后自动重置，下一场可再次触发 */
    let hostile=false;
    CR.ent.enemies.each(e=>{if(e.alive&&e.hostile){hostile=true;return false;}});
    if(hadHostile&&!hostile)resetBattleFlags();
    hadHostile=hostile;
    CR.ent.enemies.each(e=>{
      if(!e.alive||e.spawn>0)return;
      /* 1.4 dev1.3 敌对视野：开放大世界里敌对单位有自己的视野 / 巡逻领地，
         未发现玩家时只在家附近巡逻，进入视野才激活并不死不休。
         黄昏城堡波次与试炼 BOSS 不受此限制（落地即交战）。 */
      const cfg0=e.cfg||{};
      if(CR.world.mode!=="battle"&&e.type!=="sakuraBoss"&&!e.alerted&&
         (cfg0.ai==="chase"||cfg0.ai==="boss")){
        const sight=e.sight||cfg0.sight||380;
        const dd=Math.hypot(px-e.x,pd-e.depth);
        if(dd>sight||stealth.t>0||(CR.combat.isStealth&&CR.combat.isStealth())){
          e.patrolT=(e.patrolT||0)+dt;
          const hx=(e.home&&e.home.x)||e.x,hd=(e.home&&e.home.depth)||e.depth;
          const tx=hx+Math.sin(e.patrolT*.42)*58,td=hd+Math.cos(e.patrolT*.31)*18;
          e.vx=U.clamp((tx-e.x)*1.2,-42,42);e.vd=U.clamp((td-e.depth)*1.1,-20,20);
          e.facing=e.vx>=0?1:-1;
          return;
        }
        e.alerted=true;e.hostile=true;e.barT=2.2;e.aggro=1;
        markEngage();
        CR.ui.banner("⚠ 被 "+cfg0.label+" 发现了！");
        CR.audio.sfx("aggro");
        E.ringFx(e.x,e.depth,C.orange,120,.5);
      }
      /* 夜樱潜行：敌人不会主动攻击（但已经进入仇恨的仍会失去目标） */
      if(stealth.t>0){e.vx=U.lerp(e.vx,0,.2);e.vd=U.lerp(e.vd,0,.2);return;}
      const cfg=e.cfg;
      const dx=px-e.x,dd=pd-e.depth,dist=Math.hypot(dx,dd);
      const reach=cfg.reach*e.scale;
      const frozen=e.frozen>0,stunned=e.stun>0;
      // 中立怪：未被激怒时只悠闲游走，绝不主动攻击
      if(!e.hostile){
        if(!frozen&&U.rnd()<.012){e.vx=U.rr(-40,40);e.vd=U.rr(-24,24);}
        e.vx=U.lerp(e.vx,0,.02);e.vd=U.lerp(e.vd,0,.02);
        e.facing=e.vx>=0?1:-1;
        return;
      }
      if(frozen||stunned){e.vx=U.lerp(e.vx,0,.25);e.vd=U.lerp(e.vd,0,.25);return;}
      const spd=cfg.spd*95*(e.slow>0?.42:1);
      if(dist>reach*.78&&e.attack<=0&&Math.abs(e.kb)<45){
        e.vx=U.lerp(e.vx,Math.sign(dx)*spd,.12);
        e.vd=U.lerp(e.vd,Math.sign(dd)*spd*.6,.12);
        e.facing=dx>=0?1:-1;
      }else{e.vx=U.lerp(e.vx,0,.2);e.vd=U.lerp(e.vd,0,.2);}
      // BOSS / 精英远程
      if((e.type==="elite"||e.type==="boss"||e.type==="miniboss")&&e.cd<=0&&dist>110&&dist<540&&U.rnd()<.02){
        const a=Math.atan2(dd,dx);
        const s=CR.ent.spawnShot(7,e.x,e.depth,34,Math.cos(a)*300,Math.sin(a)*160,0,
          Math.round(cfg.dmg*.7),2.2,C.red,false);
        if(s){s.fromPlayer=false;s.r=11;}
        e.cd=2.6;CR.audio.sfx("fireball");
      }
      /* 1.4 dev1.2：试炼 BOSS 的近战伤害交给 harbor.updateTrial 专属链，避免双份 */
      if(dist<reach&&Math.abs(dd)<36&&e.cd<=0&&e.attack<=0&&!P.dead&&e.type!=="sakuraBoss"){
        e.attack=.36;e.cd=e.type==="boss"?1.7:U.rr(1.0,1.8);e.phase=0;
        if(e.type==="boss")CR.world.addShake(3);
      }
      if(e.attack>0&&e.attack<=.18&&e.phase!==1){
        e.phase=1;
        if(Math.abs(P.x-e.x)<reach+20&&Math.abs(P.depth-e.depth)<40&&P.h<48)
          hurtPlayer(cfg.dmg,e.x,{enemy:e,element:cfg.element,magic:!!cfg.magic,fixed:!!cfg.fixed});
        CR.ent.burst(e.x+e.facing*40,e.depth,30,cfg.main,7,110);
        CR.audio.sfx("swing");
        if(e.type==="boss"){CR.ent.ringFx(e.x,e.depth,C.red,90,.4);CR.world.addShake(6);}
      }
      if(e.attack<=0)e.phase=0;
      // BOSS 二阶段：召唤小啰啰
      if(e.type==="boss"&&e.hp<e.maxHp*.5){
        e.phase2=(e.phase2||0)+dt;
        if(e.phase2>6.5){
          e.phase2=0;
          for(let k=0;k<2;k++)CR.ent.spawnEnemy("minion",e.x+U.rr(-90,90),U.rr(-50,50));
          CR.ent.ringFx(e.x,e.depth,C.violet,140,.5);
          CR.ui.banner("城主召唤援军！");
          CR.audio.sfx("wave");
        }
      }
    });
  }

  /* ---------- 1.0.0 道具槽（默认 Z / X，可在设置里改键） ---------- */
  const slotCd=[0,0],slotCdMax=[0,0];
  function useSlot(i){
    i=U.clamp(i|0,0,1);
    const id=SV.data.slots[i];
    if(!id){CR.ui.toast("道具槽 "+(i+1)+" 为空 · 从背包拖入道具");CR.audio.sfx("deny");return false;}
    if(slotCd[i]>0){CR.ui.toast("冷却中 "+slotCd[i].toFixed(1)+"s");CR.audio.sfx("deny");return false;}
    if((SV.data.inventory.items[id]||0)<=0){
      SV.clearSlot(i);CR.ui.refreshPanels();
      CR.ui.toast(CFG.ITEMS[id].name+" 已用完，槽位已清空");CR.audio.sfx("deny");return false;
    }
    const it=CFG.ITEMS[id];
    useItem(id);
    slotCd[i]=slotCdMax[i]=it.cd||9;
    CR.audio.sfx("slot");
    CR.ui.refreshPanels();
    return true;
  }
  /* 1.4 dev1：8 维等级每 10 秒向 0 回落；每秒回血 / 回蓝独立结算 */
  function tickCore(dt){
    const BC=CR.battlecore,ps=BC.playerSide();
    const sides=[ps];
    E.enemies.each(e=>{if(e.alive)sides.push(BC.enemySide(e));});
    BC.tick(sides,dt);
    BC.regen(ps,dt);
  }
  function updateSlots(dt){for(let i=0;i<2;i++)if(slotCd[i]>0)slotCd[i]=Math.max(0,slotCd[i]-dt);}
  function resetSlots(){slotCd[0]=slotCd[1]=0;slotCdMax[0]=slotCdMax[1]=0;}
  function slotRatio(i){return slotCdMax[i]>0?slotCd[i]/slotCdMax[i]:0;}

  CR.combat={doAttack,doCharge,doJump,doSkill,useItem,
    hurtPlayer,damageEnemy,killEnemy,explode,meleeArc,chainLightning,
    updateShots,updateDrops,updateAI,rollDamage,
    combatState,resetBattleFlags,execGeneric,execSakura,isStealth,tickCore,
    skillAllowed:(cls,id)=>CR.equip.skillAllowed(cls,id),
    useSlot,updateSlots,resetSlots,slotRatio,get slotCd(){return slotCd;}};
})(window.CR=window.CR||{});
