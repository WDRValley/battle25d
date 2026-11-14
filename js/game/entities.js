/* entities.js — 全部游戏对象与固定容量对象池（零 GC 抖动） */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C;

  /* ---------- 玩家 ---------- */
  const player={
    x:0,depth:0,h:0,vh:0,vx:0,vd:0,facing:1,
    hp:100,maxHp:100,energy:0,maxEnergy:100,
    atk:20,spd:2.5,crit:.08,armor:4,range:100,atkCd:.3,
    cls:0,name:"",level:1,
    cd:[0,0,0,0],cdMax:[1,1,1,1],
    inv:0,anim:0,moving:false,atkT:0,skT:0,skIdx:-1,
    chargeT:0,chargeLv:0,chargeActive:false,
    jumps:0,dead:false,slow:0,kb:0,scale:1,hurtT:0,landT:0,
    buff:{dmg:0,spd:0,shield:0,t:0},
    dash:{t:0,vx:0,inv:0},
    comboN:0,_t:"player"
  };

  /* ---------- 池 ---------- */
  const enemies=U.Pool(30,()=>({x:0,depth:0,h:0,vh:0,vx:0,vd:0,hp:0,maxHp:0,type:"minion",
    cfg:null,facing:-1,cd:0,inv:0,flash:0,anim:0,attack:0,slow:0,kb:0,scale:1,
    w:1,ht:1,hostile:true,spawn:0,phase:0,stun:0,frozen:0,aggro:0,barT:0,id:0,_t:"enemy"}));
  const shots=U.Pool(140,()=>({kind:0,x:0,depth:0,h:0,vx:0,vd:0,vh:0,life:0,dmg:0,
    pierce:0,delay:0,r:8,c:C.fire,crit:false,fromPlayer:true,trail:0,chain:0,
    visited:new Int8Array(30),fall:false,ang:0,alive:false}));
  const parts=U.Pool(420,()=>({x:0,depth:0,h:0,vx:0,vd:0,vh:0,life:0,max:0,size:0,
    c:C.fire,kind:0,grow:0,drag:.94,grav:520,alpha:1,ang:0,alive:false}));
  const floats=U.Pool(40,()=>({x:0,depth:0,h:0,vh:0,vx:0,life:0,max:0,val:0,
    kind:"dmg",c:C.white,size:1,crit:false,alive:false}));
  const drops=U.Pool(48,()=>({x:0,depth:0,h:0,vh:0,kind:"gold",id:"",amount:0,
    life:0,spin:0,alive:false,_t:"drop"}));
  const beams=U.Pool(16,()=>({pts:new Float32Array(24),n:0,life:0,max:0,c:C.cyan,w:3,alive:false}));
  const ghosts=U.Pool(14,()=>({x:0,depth:0,h:0,cls:0,facing:1,anim:0,life:0,max:0,alive:false}));
  let uid=1;

  /* ---------- 生成辅助 ---------- */
  function spawnEnemy(type,x,depth){
    const e=enemies.take();if(!e)return null;
    const cfg=CFG.MOBS[type]||CFG.MOBS.normal;
    e.type=type;e.cfg=cfg;e.x=x;e.depth=U.clamp(depth,-80,92);
    e.h=0;e.vh=0;e.vx=0;e.vd=0;
    e.maxHp=e.hp=Math.round(cfg.hp*(1+CR.world.waveIdx*.10));
    e.facing=-1;e.cd=U.rr(.3,1.0);e.inv=0;e.flash=0;e.anim=U.rr(0,8);
    e.attack=0;e.slow=0;e.kb=0;
    e.scale=cfg.scale*U.rr(.94,1.07);e.w=cfg.w;e.ht=cfg.h;
    e.hostile=(cfg.ai!=="neutral");e.spawn=.42;e.phase=0;e.stun=0;
    e.frozen=0;e.aggro=0;e.barT=0;e.id=uid++;
    return e;
  }
  function spawnShot(kind,x,depth,h,vx,vd,vh,dmg,life,c,crit){
    const s=shots.take();if(!s)return null;
    s.kind=kind;s.x=x;s.depth=depth;s.h=h;s.vx=vx;s.vd=vd;s.vh=vh;
    s.dmg=dmg;s.life=life;s.pierce=0;s.delay=0;s.r=kind===1?13:8;
    s.c=c||C.fire;s.crit=!!crit;s.fromPlayer=true;s.trail=0;s.chain=0;
    s.visited.fill(0);s.fall=false;s.ang=Math.atan2(vh,vx||1);
    return s;
  }
  function spawnPart(x,depth,h,c,kind,size,life,opt){
    const p=parts.take();if(!p)return null;
    opt=opt||{};
    p.x=x;p.depth=depth;p.h=h;
    p.vx=opt.vx||0;p.vd=opt.vd||0;p.vh=opt.vh||0;
    p.life=p.max=life;p.size=size;p.c=c;p.kind=kind||0;
    p.grow=opt.grow||0;p.drag=opt.drag===undefined?.94:opt.drag;
    p.grav=opt.grav===undefined?520:opt.grav;p.alpha=opt.alpha===undefined?1:opt.alpha;
    p.ang=opt.ang||0;
    return p;
  }
  function spawnFloat(x,depth,h,val,kind,c,crit){
    const f=floats.take();if(!f)return null;
    f.x=x+U.rr(-8,8);f.depth=depth;f.h=h;f.vh=U.rr(90,130);
    f.vx=U.rr(-18,18);f.life=f.max=crit?1.0:.78;f.val=val;f.kind=kind||"dmg";
    f.c=c||C.white;f.size=crit?1.45:1;f.crit=!!crit;
    return f;
  }
  function spawnDrop(x,depth,kind,id,amount){
    const d=drops.take();if(!d)return null;
    d.x=x+U.rr(-14,14);d.depth=U.clamp(depth+U.rr(-8,8),-80,92);
    d.h=0;d.vh=U.rr(150,230);d.kind=kind;d.id=id||"";
    d.amount=amount||1;d.life=16;d.spin=U.rr(0,6);
    return d;
  }
  function spawnBeam(pts,c,w,life){
    const b=beams.take();if(!b)return null;
    b.n=Math.min(8,pts.length);b.c=c||C.cyan;b.w=w||3;b.life=b.max=life||.18;
    for(let i=0;i<b.n;i++){b.pts[i*3]=pts[i][0];b.pts[i*3+1]=pts[i][1];b.pts[i*3+2]=pts[i][2]||20;}
    return b;
  }
  function spawnGhost(){
    const g=ghosts.take();if(!g)return;
    g.x=player.x;g.depth=player.depth;g.h=player.h;g.cls=player.cls;
    g.facing=player.facing;g.anim=player.anim;g.life=g.max=.26;
  }
  function burst(x,depth,h,c,n,spd,opt){
    const q=CR.CFG.QUALITY[CR.gl.quality];
    n=Math.ceil(n*(q.parts/360));
    opt=opt||{};
    for(let i=0;i<n;i++){
      const a=U.rr(0,U.TAU),v=U.rr(spd*.3,spd);
      spawnPart(x,depth,h,c,opt.kind||0,U.rr(2,5.5),U.rr(.3,.75),{
        vx:Math.cos(a)*v,vd:Math.sin(a)*v*.6,vh:U.rr(30,180),grav:opt.grav||520});
    }
  }
  function ringFx(x,depth,c,r,life){
    spawnPart(x,depth,4,c,1,r,life||.42,{grow:r*2.1,vx:0,vh:0,grav:0,drag:1});
  }
  function glowFx(x,depth,h,c,r,life){
    spawnPart(x,depth,h,c,3,r,life||.30,{grow:r*1.3,vx:0,vh:0,grav:0,drag:1});
  }

  /* ---------- 属性同步（强化 / 升级后不打断当前局） ---------- */
  function applyStats(){
    const st=CR.save.effStats(),c=CFG.CLASSES[player.cls];
    const ratio=player.maxHp>0?player.hp/player.maxHp:1;
    player.maxHp=st.hp;
    player.hp=Math.max(1,Math.min(st.hp,Math.round(st.hp*ratio)));
    player.atk=st.atk;player.spd=st.spd;player.crit=st.crit;player.armor=st.armor;
    player.range=c.range;player.atkCd=st.atkCd;
    player.level=CR.save.data.profile.level;
    player.name=CR.save.data.profile.name;
  }

  /* ---------- 状态重置 ---------- */
  function reset(cls){
    const st=CR.save.effStats(),c=CFG.CLASSES[cls];
    player.cls=cls;player.name=CR.save.data.profile.name;player.level=CR.save.data.profile.level;
    player.maxHp=st.hp;player.hp=st.hp;player.atk=st.atk;player.spd=st.spd;
    player.crit=st.crit;player.armor=st.armor;player.range=c.range;player.atkCd=st.atkCd;
    player.cdMax=c.skills.map(s=>s.cd);
    player.x=120;player.depth=0;player.h=0;player.vh=0;player.vx=0;player.vd=0;
    player.facing=1;player.energy=0;player.inv=0;player.anim=0;player.moving=false;
    player.atkT=0;player.skT=0;player.skIdx=-1;player.jumps=0;player.dead=false;
    player.slow=0;player.kb=0;player.scale=1;player.hurtT=0;player.landT=0;
    player.chargeT=0;player.chargeLv=0;player.chargeActive=false;player.comboN=0;
    player.buff.dmg=0;player.buff.spd=0;player.buff.shield=0;player.buff.t=0;
    player.dash.t=0;player.dash.vx=0;player.dash.inv=0;
    for(let i=0;i<4;i++)player.cd[i]=0;
    enemies.clear();shots.clear();parts.clear();floats.clear();drops.clear();
    beams.clear();ghosts.clear();uid=1;
  }
  function aliveEnemies(hostileOnly){
    let n=0;
    enemies.each(e=>{if(!hostileOnly||e.hostile)n++;});
    return n;
  }

  /* ---------- 每帧物理 / 视觉更新 ---------- */
  function updateVisuals(dt){
    parts.each(p=>{
      p.life-=dt;if(p.life<=0){p.alive=false;return;}
      if(p.kind===1||p.kind===3||p.kind===5){p.size+=p.grow*dt;return;}
      p.x+=p.vx*dt;p.depth+=p.vd*dt;p.h+=p.vh*dt;p.vh-=p.grav*dt;
      if(p.h<0){p.h=0;p.vh*=-.32;p.vx*=.72;p.vd*=.72;}
      const k=Math.pow(p.drag,dt*60);p.vx*=k;p.vd*=k;
    });
    floats.each(f=>{
      f.life-=dt;if(f.life<=0){f.alive=false;return;}
      f.h+=f.vh*dt;f.vh-=95*dt;f.x+=f.vx*dt;f.vx*=Math.pow(.94,dt*60);
    });
    beams.each(b=>{b.life-=dt;if(b.life<=0)b.alive=false;});
    ghosts.each(g=>{g.life-=dt;if(g.life<=0)g.alive=false;});
    drops.each(d=>{
      d.life-=dt;if(d.life<=0){d.alive=false;return;}
      d.spin+=dt*4;
      d.h+=d.vh*dt;d.vh-=920*dt;
      if(d.h<0){d.h=0;d.vh=0;}
    });
  }
  function updatePlayerPhysics(dt){
    const p=player;
    const spd=p.spd*(p.slow>0?.55:1)*(1+p.buff.spd)*120;
    const a=CR.input.axes();
    p.moving=a.moving;
    if(!p.dead){
      p.vx=U.lerp(p.vx,a.mx*spd,.26);
      p.vd=U.lerp(p.vd,a.md*spd*.62,.26);
      if(a.mx!==0)p.facing=a.mx>0?1:-1;
    }else{p.vx=U.lerp(p.vx,0,.2);p.vd=U.lerp(p.vd,0,.2);}
    if(p.dash.t>0){
      p.dash.t-=dt;p.vx=p.dash.vx;
      if(U.rnd()<.45)spawnGhost();
    }
    p.x+=(p.vx+p.kb)*dt;
    p.depth=U.clamp(p.depth+p.vd*dt,-82,96);
    p.kb*=Math.pow(.85,dt*60);
    p.h+=p.vh*dt;p.vh-=1150*dt;
    if(p.h<0){
      if(p.vh<-160){p.landT=.16;CR.audio.sfx("land");
        CR.ent.burst(p.x,p.depth,2,C.grass1,6,70,{grav:300});}
      p.h=0;p.vh=0;p.jumps=0;
    }
    p.x=U.clamp(p.x,36,CFG.LEVEL_W-36);
    p.anim+=dt*(p.moving?11:3.2);
    if(p.atkCd>0)p.atkCd-=dt;
    if(p.inv>0)p.inv-=dt;
    if(p.slow>0)p.slow-=dt;
    if(p.atkT>0)p.atkT-=dt;
    if(p.skT>0)p.skT-=dt;
    if(p.hurtT>0)p.hurtT-=dt;
    if(p.landT>0)p.landT-=dt;
    for(let i=0;i<4;i++)if(p.cd[i]>0)p.cd[i]-=dt;
    if(p.buff.t>0){p.buff.t-=dt;if(p.buff.t<=0){p.buff.dmg=0;p.buff.spd=0;p.buff.shield=0;}}
    p.energy=Math.min(p.maxEnergy,p.energy+dt*2.2);
    if(CR.input.charging){p.chargeActive=true;p.chargeLv=CR.input.chargeLevel;}
    else{p.chargeActive=false;}
  }
  function updateEnemyPhysics(dt){
    enemies.each(e=>{
      if(e.spawn>0){e.spawn-=dt;return;}
      if(e.inv>0)e.inv-=dt;
      if(e.flash>0)e.flash-=dt;
      if(e.cd>0)e.cd-=dt;
      if(e.slow>0)e.slow-=dt;
      if(e.stun>0)e.stun-=dt;
      if(e.frozen>0)e.frozen-=dt;
      if(e.barT>0)e.barT-=dt;
      if(e.attack>0)e.attack-=dt;
      e.anim+=dt*(e.frozen>0?1.2:8);
      e.x+=(e.vx+e.kb)*dt;
      e.depth=U.clamp(e.depth+e.vd*dt,-88,100);
      e.kb*=Math.pow(.84,dt*60);
      if(e.h>0){e.h+=e.vh*dt;e.vh-=1000*dt;if(e.h<0){e.h=0;e.vh=0;}}
    });
  }

  CR.ent={player,enemies,shots,parts,floats,drops,beams,ghosts,
    spawnEnemy,spawnShot,spawnPart,spawnFloat,spawnDrop,spawnBeam,spawnGhost,
    burst,ringFx,glowFx,reset,applyStats,aliveEnemies,
    updateVisuals,updatePlayerPhysics,updateEnemyPhysics};
})(window.CR=window.CR||{});
