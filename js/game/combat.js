/* combat.js — 攻击、蓄力、12 个技能、敌人 AI、伤害漂字、掉落与拾取 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=CR.ent.player;
  let dashHits=null;

  /* ---------- 数值 ---------- */
  function rollDamage(mult,forceCrit){
    const crit=forceCrit||U.rnd()<P.crit;
    const base=P.atk*mult*(1+P.buff.dmg);
    return {v:Math.max(1,Math.round(base*(crit?1.8:1))),crit};
  }
  function addCombo(){CR.world.addCombo();}
  function energy(n){P.energy=Math.min(P.maxEnergy,P.energy+n);}

  /* ---------- 玩家受击 ---------- */
  function hurtPlayer(dmg,fromX){
    if(P.inv>0||P.dead||P.dash.inv>0)return;
    let real=Math.max(1,Math.round(dmg*60/(60+P.armor)));
    P.inv=.62;P.hurtT=.3;P.kb=(P.x<fromX?-1:1)*330;
    CR.world.addShake(8);CR.world.addFlash(.55);
    CR.ent.burst(P.x,P.depth,36,C.red,12,160);
    if(P.buff.shield>0){
      const absorb=Math.min(P.buff.shield,real);
      P.buff.shield-=absorb;real-=absorb;
      CR.ent.spawnFloat(P.x,P.depth,70,absorb,"shield",C.cyan,false);
      CR.audio.sfx("shield");
    }
    if(real>0){
      P.hp=Math.max(0,P.hp-real);
      CR.ent.spawnFloat(P.x,P.depth,72,real,"hurt",C.red,false);
      CR.audio.sfx("hurt");
    }
    energy(8);CR.world.resetCombo();
    if(P.hp<=0&&!P.dead){P.dead=true;CR.audio.setScene("defeat");}
  }

  /* ---------- 敌人受伤 / 死亡 ---------- */
  function damageEnemy(e,dmg,opt){
    if(!e.alive||e.inv>0||e.spawn>0)return false;
    opt=opt||{};
    e.hp-=dmg;e.inv=.085;e.flash=.16;e.barT=1.1;
    e.kb+=(opt.kb||2)*60*(opt.kbDir||(e.x>=P.x?1:-1));
    if(opt.knock)e.vh=opt.knock;
    if(e.frozen>0&&opt.thaw)e.frozen=0;
    // 中立怪：被玩家攻击后才转为敌对
    if(!e.hostile){
      e.hostile=true;e.aggro=1;e.cd=.35;
      CR.ent.spawnFloat(e.x,e.depth,88,"!","aggro",C.hpBlue,false);
      CR.audio.sfx("error");
    }
    CR.ent.spawnFloat(e.x,e.depth,58+U.rr(-6,10),dmg,opt.crit?"crit":"dmg",
      opt.crit?C.gold:(opt.c||C.white),opt.crit);
    CR.ent.burst(e.x,e.depth,32,opt.fx||C.fire2,opt.crit?12:6,140);
    CR.world.addShake(opt.crit?5:2.6);
    CR.audio.sfx(opt.crit?"crit":"hit");
    energy(opt.crit?5:2.6);addCombo();
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
    energy(7);
    CR.audio.sfx(e.cfg===CFG.MOBS.boss?"explosion":"hit");
    CR.ent.burst(e.x,e.depth,26,cfg===CFG.MOBS.boss?C.gold:cfg.main,
      cfg===CFG.MOBS.boss?40:16,cfg===CFG.MOBS.boss?300:200);
    CR.ent.burst(e.x,e.depth,12,C.white,7,120);
    CR.ent.ringFx(e.x,e.depth,cfg.bar,24,.34);
    const up=CR.save.addExp(cfg.xp);
    if(up>0){
      CR.ent.applyStats();
      CR.audio.sfx("levelup");
      CR.ent.spawnFloat(P.x,P.depth,110,CR.save.data.profile.level,"levelup",C.gold,true);
      CR.ui.toast("升级！等级 "+CR.save.data.profile.level);
    }
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
    CR.ent.ringFx(x,d,c,r*.85,.4);
    CR.ent.glowFx(x,d,14,c,r*.5,.3);
    CR.ent.burst(x,d,14,c,14,200);
    CR.world.addShake(opt.shake||6);
    CR.audio.sfx(opt.sound||"explosion");
  }
  function meleeArc(range,halfD,mult,fx,opt){
    opt=opt||{};
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
    CR.ent.spawnPart(P.x+P.facing*24,P.depth,38,fx,5,range,.22,
      {vx:P.facing,grav:0,drag:1});
    CR.ent.burst(P.x+P.facing*range*.62,P.depth,36,C.white,hit?7:3,110);
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
      visited[best.id]=1;hitIds.push(best.id);
      const pts=[[cx,cd,42]];
      const n=4;
      for(let i=1;i<n;i++){
        const t=i/n;
        pts.push([U.lerp(cx,best.x,t)+U.rr(-16,16),U.lerp(cd,best.depth,t)+U.rr(-12,12),U.rr(22,58)]);
      }
      pts.push([best.x,best.depth,38]);
      CR.ent.spawnBeam(pts,C.cyan,2.4,.22);
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
    const c=CFG.CLASSES[P.cls];
    P.atkCd=c.atkCd/(1+P.buff.dmg*.4);
    P.atkT=.2;P.comboN=(P.comboN+1)%3;
    if(P.cls===0){
      meleeArc(P.range,36,1,C.steel,{kb:5,sound:P.comboN===2?"swingHeavy":"swing"});
    }else if(P.cls===1){
      const s=CR.ent.spawnShot(1,P.x+P.facing*24,P.depth,34,P.facing*350,0,0,
        rollDamage(1).v,1.6,C.fire,false);
      if(s)s.r=10;
      CR.audio.sfx("fireball");
    }else{
      const s=CR.ent.spawnShot(2,P.x+P.facing*24,P.depth,34,P.facing*680,0,0,
        rollDamage(1).v,1.0,C.gold,false);
      if(s)s.pierce=1;
      CR.audio.sfx("arrow");
    }
  }
  function doCharge(lv){
    if(P.dead)return;
    const big=lv===2,mul=big?3.3:2.1;
    P.atkT=.34;P.skT=.34;
    CR.audio.sfx("chargeRelease");
    CR.world.addWhite(big?.30:.16);
    CR.world.addShake(big?9:5);
    CR.ent.ringFx(P.x,P.depth,big?C.gold:C.white,big?110:70,.34);
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
      CR.ent.spawnPart(P.x,P.depth,38,C.gold,5,big?190:140,.28,{vx:P.facing,grav:0,drag:1});
      CR.ent.burst(P.x+P.facing*100,P.depth,24,C.gold,big?24:12,240);
      if(big)CR.ent.ringFx(P.x,P.depth,C.fire,150,.4);
    }else if(P.cls===1){
      const s=CR.ent.spawnShot(1,P.x+P.facing*26,P.depth,36,P.facing*(big?300:360),0,0,
        rollDamage(mul).v,2.2,C.fire,false);
      if(s){s.r=big?30:20;s.dmg=rollDamage(mul).v;}
      CR.audio.sfx("fireball");
    }else{
      const s=CR.ent.spawnShot(6,P.x+P.facing*26,P.depth,36,P.facing*980,0,0,
        rollDamage(mul).v,1.4,C.gold,false);
      if(s){s.pierce=99;s.r=big?16:12;}
      CR.audio.sfx("bow");
    }
    CR.ent.glowFx(P.x+P.facing*20,P.depth,38,big?C.gold:C.white,big?46:30,.3);
  }
  function doJump(){
    if(P.dead)return;
    if(P.jumps>=2)return;
    const second=P.jumps===1;
    P.jumps++;
    P.vh=second?330:370;
    P.h=Math.max(P.h,1);
    CR.audio.sfx(second?"doubleJump":"jump");
    CR.ent.burst(P.x,P.depth,4,second?C.cyan:C.grass1,second?14:8,110,{grav:280});
    if(second){CR.ent.ringFx(P.x,P.depth,C.cyan,42,.3);CR.world.addWhite(.10);}
  }

  /* ---------- 4 技能 ---------- */
  function doSkill(i){
    if(P.dead||i<0||i>3)return;
    const c=CFG.CLASSES[P.cls],sk=c.skills[i];
    if(P.cd[i]>0){CR.ui.toast(sk.name+" 冷却中 "+P.cd[i].toFixed(1)+"s");CR.audio.sfx("error");return;}
    if(P.energy<sk.cost){CR.ui.toast("能量不足（需要 "+sk.cost+"）");CR.audio.sfx("error");return;}
    P.cd[i]=sk.cd;P.energy-=sk.cost;P.skT=.45;P.skIdx=i;
    CR.ui.banner(sk.name);
    CR.audio.sfx("buff");
    CR.ent.ringFx(P.x,P.depth,c.color,52,.34);
    const F=P.facing;
    if(P.cls===0){
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
        CR.ent.spawnPart(P.x,P.depth,26,C.gold,5,140,.30,{vx:F,grav:0,drag:1});
        CR.ent.ringFx(P.x+F*70,P.depth,C.gold,90,.4);
        CR.world.addShake(9);CR.audio.sfx("swingHeavy");
      }else if(i===1){ // 旋风斩（两段）
        const a=rollDamage(1.7),b=rollDamage(1.7);
        const hit=r=>CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          if(U.dist2(e.x,e.depth,P.x,P.depth)<r*r)
            damageEnemy(e,a.v,{crit:a.crit,fx:C.steel,c:C.steel,kb:6});
        });
        hit(140);
        CR.ent.ringFx(P.x,P.depth,C.steel,140,.42);
        CR.ent.spawnPart(P.x,P.depth,40,C.white,5,140,.4,{vx:F,grav:0,drag:1});
        CR.world.addShake(8);
        // 第二段：0.18s 后再次结算 140 范围
        const s=CR.ent.spawnShot(10,P.x,P.depth,0,0,0,0,0,.18,C.steel,false);
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
        CR.ent.burst(P.x,P.depth,20,C.fire,20,260);
        CR.world.addShake(7);CR.audio.sfx("swingHeavy");
      }else{ // 战吼
        P.buff.dmg=.35;P.buff.spd=.15;P.buff.shield=45;P.buff.t=8;
        const heal=Math.round(P.maxHp*.22);
        P.hp=Math.min(P.maxHp,P.hp+heal);
        CR.ent.spawnFloat(P.x,P.depth,88,heal,"heal",C.green,false);
        CR.ent.ringFx(P.x,P.depth,C.gold,180,.6);
        CR.ent.glowFx(P.x,P.depth,40,C.gold,80,.5);
        CR.world.addWhite(.22);CR.world.addShake(6);
        CR.audio.sfx("buff");CR.audio.sfx("heal");
      }
    }else if(P.cls===1){
      if(i===0){ // 爆裂火球
        const s=CR.ent.spawnShot(1,P.x+F*26,P.depth,36,F*360,0,0,rollDamage(1.4).v,2,C.fire,false);
        if(s)s.r=16;CR.audio.sfx("fireball");
      }else if(i===1){ // 冰霜新星
        const roll=rollDamage(2.0);
        CR.ent.enemies.each(e=>{
          if(!e.alive||e.spawn>0)return;
          if(U.dist2(e.x,e.depth,P.x,P.depth)<195*195)
            damageEnemy(e,roll.v,{crit:roll.crit,fx:C.ice,c:C.cyan,kb:3,slow:2.5,freeze:1.6});
        });
        CR.ent.ringFx(P.x,P.depth,C.ice,195,.55);
        CR.ent.glowFx(P.x,P.depth,20,C.ice,110,.45);
        CR.ent.burst(P.x,P.depth,18,C.ice,28,240,{grav:120});
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
          const s=CR.ent.spawnShot(2,P.x+F*26,P.depth,34,F*720,k*90,0,
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
          const s=CR.ent.spawnShot(2,P.x,P.depth,32,
            Math.cos(a)*640*F,Math.sin(a)*300,0,rollDamage(.8).v,.8,C.gold,false);
          if(s)s.pierce=1;
        }
        CR.ent.burst(P.x,P.depth,12,C.white,12,160);
        CR.audio.sfx("bow");
      }else{ // 贯穿狙击
        const s=CR.ent.spawnShot(6,P.x+F*28,P.depth,38,F*1500,0,0,
          rollDamage(5.0,true).v,1.2,C.cyan,true);
        if(s){s.pierce=99;s.r=18;}
        const b=CR.ent.spawnBeam([[P.x,P.depth,38],[P.x+F*760,P.depth,38]],C.cyan,5,.22);
        CR.world.addWhite(.28);CR.world.addShake(8);
        CR.audio.sfx("crit");
      }
    }
  }

  /* ---------- 道具使用 ---------- */
  function useItem(id){
    const it=CR.save.useItem(id);
    if(!it){CR.ui.toast("背包里没有 "+CFG.ITEMS[id].name);return;}
    CR.audio.sfx(it.type==="heal"?"heal":(it.type==="buff"?"buff":"pickup"));
    if(it.type==="heal"){
      P.hp=Math.min(P.maxHp,P.hp+it.val);
      CR.ent.spawnFloat(P.x,P.depth,80,it.val,"heal",C.green,false);
    }else if(it.type==="energy"){
      energy(it.val);CR.ent.spawnFloat(P.x,P.depth,80,"+"+it.val,"buff",C.cyan,false);
    }else if(it.type==="buff"){
      P.buff.dmg+=it.val;P.buff.t=Math.max(P.buff.t,30);
      CR.ui.toast("攻击力提升！");
    }else if(it.type==="speed"){
      P.buff.spd+=it.val;P.buff.t=Math.max(P.buff.t,30);
      CR.ui.toast("移速提升！");
    }else if(it.type==="bomb"){
      explode(P.x,P.depth,190,it.val,C.fire,{flat:true});
    }
    CR.ent.ringFx(P.x,P.depth,it.color,60,.35);
    CR.ui.refreshPanels();
  }

  /* ---------- 投射物 ---------- */
  function updateShots(dt){
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
          CR.ent.ringFx(s.x,s.depth,s.c,s.r,.32);
          CR.ent.spawnPart(s.x,s.depth,20,s.c,5,s.r,.3,{vx:P.facing,grav:0,drag:1});
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
          s.alive=false;hurtPlayer(s.dmg,s.x);
          CR.ent.burst(s.x,s.depth,30,C.red,8,120);
        }
      }else{
        let hit=false;
        CR.ent.enemies.each(e=>{
          if(hit||!e.alive||e.spawn>0||s.visited[e.id%30])return;
          if(Math.abs(e.x-s.x)<26+e.scale*9&&Math.abs(e.depth-s.depth)<30&&e.h<62){
            s.visited[e.id%30]=1;
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
        }else{
          CR.save.addItem(d.id,d.amount);
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
  function updateAI(dt){
    const px=P.x,pd=P.depth;
    CR.ent.enemies.each(e=>{
      if(!e.alive||e.spawn>0)return;
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
      if(dist<reach&&Math.abs(dd)<36&&e.cd<=0&&e.attack<=0&&!P.dead){
        e.attack=.36;e.cd=e.type==="boss"?1.7:U.rr(1.0,1.8);e.phase=0;
        if(e.type==="boss")CR.world.addShake(3);
      }
      if(e.attack>0&&e.attack<=.18&&e.phase!==1){
        e.phase=1;
        if(Math.abs(P.x-e.x)<reach+20&&Math.abs(P.depth-e.depth)<40&&P.h<48)
          hurtPlayer(cfg.dmg,e.x);
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

  CR.combat={doAttack,doCharge,doJump,doSkill,useItem,
    hurtPlayer,damageEnemy,killEnemy,explode,meleeArc,chainLightning,
    updateShots,updateDrops,updateAI,rollDamage};
})(window.CR=window.CR||{});
