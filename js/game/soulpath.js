/* soulpath.js — v1.4 dev5 · 灵路 / 副件（神兵）系统
 * 实现《9.1 副件、灵路系统整合规格 0.4》全部逻辑层：
 *   · 离散拆解 9 / 6+3 / 3+3+3 / 1×9（段长只取 1/3/6/9，不允许 5+4）
 *   · Q_req = W·e_R；Q_supply = Σ n_seg·min(e_seg,e_R)；E_power = min(1,Q_supply/Q_req)^β
 *   · 碎片惩罚 F(k)=max(.45,1-.08(k-1))；启动惩罚 L(C)=(C/3)^1.5（C=1→.192）
 *   · MP 总供能 G（0.8D 缓冲 + 1.5s 平滑）；属性阈值 S_attr（双攻非线性插值）
 *   · 同类型边际 M=0.9^(rank-1) + 低品质多配调度税 T_m + 含 Q 总战力
 *   · 显化槽：主 1 / 辅 1，其余隐性，最多 2 个局内实体，不影响数值
 *   · BOSS 战限时 BUFF「威力提升 · 神兵」45s / CD 450s；赤霄【碎灵】神兵技
 * 副件 ≠ 装备：不进 EQUIPMENT、不占装备槽、不改装备外观，独立存 SV.data.spirits / soulpath。
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save;
  const G=CFG.SOUL_G||{gMin:.55,alpha:1.3,buffer:.8,delay:1.5};
  const BB=CFG.SOUL_BOSS_BUFF||{duration:45,cd:450};
  const C=CR.C||{};
  const player=()=>CR.ent&&CR.ent.player;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  /* ---------- 每角色灵路状态 ---------- */
  function blankState(){
    return {color:"赤",split:"9",segs:[{n:9,color:"赤",id:null,feed:[]}],
      manifest:{main:0,aux:-1}};
  }
  function state(cls){
    cls=clamp(cls|0,0,CFG.MAX_CLASS===undefined?3:CFG.MAX_CLASS);
    const all=SV.data.soulpath||(SV.data.soulpath={});
    let s=all[cls];
    if(!s||typeof s!=="object"||!Array.isArray(s.segs)||!s.segs.length){
      s=blankState();all[cls]=s;SV.mark();
    }
    if(!s.manifest||typeof s.manifest!=="object")s.manifest={main:0,aux:-1};
    if(CFG.SOUL_COLORS[s.color]===undefined)s.color="赤";
    s.segs.forEach(g=>{
      g.n=[1,3,6,9].indexOf(g.n)>=0?g.n:9;
      if(CFG.SOUL_COLORS[g.color]===undefined)g.color=s.color;
      if(g.id&&(!CFG.SPIRITS[g.id]))g.id=null;
      if(!Array.isArray(g.feed))g.feed=[];
      g.feed=g.feed.filter(j=>Number.isInteger(j)&&j>=0&&j<s.segs.length&&j!==s.segs.indexOf(g));
    });
    return s;
  }
  function totalOf(s){return s.segs.reduce((a,g)=>a+g.n,0);}
  function setSplit(cls,id){
    const sp=(CFG.SOUL_SPLITS||[]).find(x=>x.id===id);
    if(!sp)return false;
    const s=state(cls),old=s.segs;
    /* 拆解变化时：保留前 min(len) 个仍可容纳的副件，其余归还背包 */
    const next=sp.seg.map((n,i)=>{
      const o=old[i];
      return {n,color:o&&o.color||s.color,id:(o&&o.id)||null,feed:[]};
    });
    const max=Math.min(old.length,next.length);
    for(let i=0;i<max;i++){next[i].id=old[i].id;next[i].color=old[i].color;}
    /* 装配采用「共享持有数占用」而非消耗，拆段缩减槽位时不能返还，否则会凭空多出一件 */
    s.segs=next;s.split=id;
    /* 合流索引可能指向被拆掉的段，统一清理越界 / 指向已装配段的引用 */
    s.segs.forEach((g,j)=>{
      g.feed=(g.feed||[]).filter(x=>Number.isInteger(x)&&x>=0&&x<next.length&&x!==j&&!next[x].id);
    });
    s.manifest={main:-1,aux:-1};
    if(next[0]&&next[0].id)s.manifest.main=0;
    else{const first=next.findIndex(g=>g.id);if(first>=0)s.manifest.main=first;}
    const second=next.findIndex((g,j)=>g.id&&j!==s.manifest.main);
    if(second>=0)s.manifest.aux=second;
    SV.mark();SV.flush();
    return true;
  }
  function returnSpirit(id){ if(CR.save&&SV.addSpirit)SV.addSpirit(id,1); }
  function setColor(cls,color){
    if(CFG.SOUL_COLORS[color]===undefined)return false;
    const s=state(cls);s.color=color;
    s.segs.forEach(g=>g.color=color);SV.mark();return true;
  }
  function usedIds(cls){
    const out=[];state(cls).segs.forEach(g=>{if(g.id)out.push(g.id);});return out;
  }
  function equip(cls,seg,id){
    const s=state(cls),g=s.segs[seg];
    if(!g||!CFG.SPIRITS[id])return {ok:false,reason:"没有这件神兵或槽位不存在"};
    if(g.id)return {ok:false,reason:"该灵路段已装配副件，请先卸下"};
    const used=usedIds(cls);
    if(used.indexOf(id)>=0)return {ok:false,reason:"同一角色不能把一件神兵装配两处"};
    /* 副件按全队共享持有数占用：商店买 1 件只能同时给 1 名角色装备 */
    const own=(SV.data.spirits[id]||0);
    if(own<=0)return {ok:false,reason:"背包里没有这件神兵"};
    const MAXC=CFG.MAX_CLASS===undefined?3:CFG.MAX_CLASS;
    let equippedElsewhere=0;
    for(let c=0;c<=MAXC;c++)if(c!==cls){
      const o=SV.data.soulpath&&SV.data.soulpath[c];
      if(o&&Array.isArray(o.segs))o.segs.forEach(x=>{if(x.id===id)equippedElsewhere++;});
    }
    if(equippedElsewhere>=own)return {ok:false,reason:"这件神兵已被其它角色装配（持有 "+own+" 件）"};
    g.id=id;g.feed=[];
    SV.mark();SV.flush();
    return {ok:true};
  }
  function unequip(cls,seg){
    const s=state(cls),g=s.segs[seg];
    if(!g||!g.id)return false;
    /* 装配不再扣持有数，卸下也不返还，避免「装配即消耗」让玩家不敢调整 build */
    g.id=null;g.feed=[];
    s.segs.forEach((o,j)=>{o.feed=(o.feed||[]).filter(x=>x!==seg);});
    if(s.manifest.main===seg)s.manifest.main=-1;
    if(s.manifest.aux===seg)s.manifest.aux=-1;
    SV.mark();SV.flush();return true;
  }
  /* 合流：把紧邻的下一段并入本段供能（k 增大触发 F(k) 碎片惩罚） */
  function merge(cls,seg){
    const s=state(cls),g=s.segs[seg],j=seg+1;
    if(!g||!g.id||!s.segs[j])return {ok:false,reason:"需要已装配且右侧还有空段"};
    if(s.segs[j].id)return {ok:false,reason:"右侧段已装配，先卸下"};
    if((g.feed||[]).indexOf(j)>=0)return {ok:false,reason:"该段已并入"};
    /* 别处已把 j 作为供能段则拒绝，避免双主争抢 */
    for(const o of s.segs)if(o!==g&&(o.feed||[]).indexOf(j)>=0)
      return {ok:false,reason:"该段已被其它副件合流占用"};
    g.feed.push(j);SV.mark();SV.flush();return {ok:true};
  }
  function unmerge(cls,seg){
    const s=state(cls),g=s.segs[seg];
    if(!g||!g.feed||!g.feed.length)return false;
    g.feed.pop();SV.mark();SV.flush();return true;
  }
  function setManifest(cls,which,seg){
    const s=state(cls),m=s.manifest;
    if(which!=="main"&&which!=="aux")return false;
    if(seg>=0&&(!s.segs[seg]||!s.segs[seg].id))return false;
    if(which==="main"&&m.aux===seg)m.aux=-1;
    if(which==="aux"&&m.main===seg)m.main=-1;
    m[which]=seg;SV.mark();SV.flush();return true;
  }

  /* ---------- 公式 ---------- */
  function colorE(c){return CFG.SOUL_COLORS[c]||95;}
  function gradeOf(sp){return CFG.SOUL_GRADE[sp.grade]||CFG.SOUL_GRADE.A;}
  function WOf(sp){const g=gradeOf(sp);return sp.gen==="old"?g.WOld:g.W;}
  function QOf(sp){const g=gradeOf(sp);return sp.gen==="old"?g.QOld:g.Q;}
  function DOf(sp){return gradeOf(sp).D;}
  function attrInterp(r){
    const cv=CFG.SOUL_ATTR_CURVE||[[.30,.26],[.50,.52],[.77,.95],[1,1]];
    if(r>=1)return 1;
    if(r<=0)return 0;
    if(r<cv[0][0])return cv[0][1]*r/cv[0][0];
    for(let i=1;i<cv.length;i++)if(r<=cv[i][0]){
      const a=cv[i-1],b=cv[i];
      return a[1]+(b[1]-a[1])*(r-a[0])/(b[0]-a[0]);
    }
    return 1;
  }
  function dualAtk(cls){
    const st=SV.effStats?SV.effStats(cls):{atk:26,matk:12};
    return (st.atk||0)+(st.matk||0);
  }
  function attrFor(cls,sp,kind){
    const req=(CFG.SOUL_ATTR_REQ[sp.grade]||CFG.SOUL_ATTR_REQ.A)[kind]||120;
    const d=dualAtk(cls),r=d/req;
    return {dual:d,req,r,s:attrInterp(r)};
  }
  /* 单件供能：可跨段合流，k=段数，C=最大段容量 */
  function segSupply(cls,segIdx,ev){
    const s=state(cls),g=s.segs[segIdx];
    if(!g||!g.id)return null;
    const sp=CFG.SPIRITS[g.id];if(!sp)return null;
    const idxs=[segIdx];
    (g.feed||[]).forEach(j=>{if(s.segs[j]&&!s.segs[j].id&&idxs.indexOf(j)<0)idxs.push(j);});
    let qsup=0,k=0,Cmax=0,waste=0,low=false;
    const er=colorE(sp.req);
    idxs.forEach(j=>{
      const o=s.segs[j];if(!o)return;
      const e=colorE(o.color||s.color);
      qsup+=o.n*Math.min(e,er);
      if(e>er)waste+=o.n*(e-er);
      if(e<er)low=true;
      k++;Cmax=Math.max(Cmax,o.n);
    });
    const W=WOf(sp),qreq=W*er,beta=gradeOf(sp).beta;
    const Ep=Math.pow(Math.min(1,qsup/Math.max(1,qreq)),beta);
    const F=Math.max(.45,1-.08*(k-1));
    const L=Cmax>=3?1:Math.pow(Cmax/3,1.5);
    const Gv=ev?ev.G:1;
    const ap=attrFor(cls,sp,"power"),ac=attrFor(cls,sp,"crit");
    const Epow=Ep*F*L*Gv*ap.s, Ecrit=Ep*F*L*Gv*ac.s;
    return {seg:segIdx,id:g.id,sp,feed:idxs.slice(),k,C:Cmax,qsup,qreq,waste,low,
      Ep,F,L,G:Gv,attrPower:ap,attrCrit:ac,Epow,Ecrit,
      Q:QOf(sp),W,D:DOf(sp)};
  }
  /* 总供能系数 G：0.8D 缓冲 + 1.5s 平滑，避免连发技能时效率抖动 */
  let gMP=0;   /* 进图时能量为 0，靠 0.8D 缓冲托底；tick 平滑跟随到当前 MP */
  function supplyG(entries,dt){
    const dsum=entries.reduce((a,x)=>a+x.D,0);
    const P=player(),mp=P?P.energy:100;
    /* dt 有值时由主循环平滑跟随；evaluate() 只读当前平滑值，不重置，避免连发技能抖动 */
    if(dt!==undefined){
      const step=clamp(dt/Math.max(.001,G.delay),0,1);
      gMP+=(mp-gMP)*step;
    }
    const eff=Math.max(gMP,dsum*G.buffer);
    if(dsum<=0||eff>=dsum)return {G:1,dsum,mp:eff,eff:1,ratio:1};
    const ratio=clamp(eff/dsum,0,1);
    return {G:G.gMin+(1-G.gMin)*Math.pow(ratio,G.alpha),dsum,mp:eff,eff,ratio};
  }
  function evaluate(cls){
    cls=clamp(cls|0,0,CFG.MAX_CLASS===undefined?3:CFG.MAX_CLASS);
    const s=state(cls),raw=[];
    s.segs.forEach((g,i)=>{if(g.id)raw.push(i);});
    const g0=supplyG(raw.map(i=>({D:DOf(CFG.SPIRITS[s.segs[i].id])})),undefined);
    const entries=raw.map(i=>segSupply(cls,i,g0)).filter(Boolean);
    /* 同类型分组（本版全部 type:"buff"），按 Q 降序排边际 */
    const groups={};
    entries.forEach(e=>{(groups[e.sp.type]=groups[e.sp.type]||[]).push(e);});
    const rankOrder={A:0,S:1,X:2};
    let totalPower=0,buffPower=0,critDmg=0;
    const warnings=[];
    Object.keys(groups).forEach(t=>{
      const arr=groups[t].slice().sort((a,b)=>b.Q-a.Q);
      const lowest=arr.reduce((m,e)=>Math.min(m,rankOrder[e.sp.grade]===undefined?0:rankOrder[e.sp.grade]),99);
      const taxKey=lowest===0?"A":(lowest===1?"S":"X");
      const tax=(CFG.SOUL_TAX[taxKey]||CFG.SOUL_TAX.A)[Math.min(arr.length,9)]||1;
      let gp=0,gBuff=0,gCrit=0;
      arr.forEach((e,i)=>{
        e.M=Math.pow(.9,i);e.T=tax;
        e.powerWithQ=e.Q*e.Epow*e.M;
        e.eff=e.Epow;
        gp+=e.Q*e.Epow*e.M;
        gBuff+=e.sp.powerBonus*e.Epow*e.M;
        gCrit+=e.sp.critDmg*e.Ecrit*e.M;
      });
      /* 规格 §8.3：先算含边际总和，每组再乘一次 T_m，多组不重复乘 */
      totalPower+=gp*tax;buffPower+=gBuff*tax;critDmg+=gCrit*tax;
      if(tax<1)warnings.push("多配调度税 T_m="+tax.toFixed(2)+"（"+taxKey+" 档 ×"+arr.length+" 件）");
    });
    /* V3.0：写明「至少 +1%」，装配后即使被阈值 / 效率压到极低也保底 1% */
    if(entries.length){buffPower=clamp(Math.max(.01,buffPower),0,.80);
      critDmg=clamp(Math.max(.01,critDmg),0,1.0);}
    else{buffPower=clamp(buffPower,0,.80);critDmg=clamp(critDmg,0,1.0);}
    /* 警告与推荐度 */
    entries.forEach(e=>{
      if(e.qsup<e.qreq)warnings.push("⚠ "+e.sp.name+" 欠容量：Q_supply "+Math.round(e.qsup)+" / Q_req "+Math.round(e.qreq)+
        "（E_power "+(e.Ep*100).toFixed(1)+"%）");
      if(e.k>1)warnings.push("⚠ "+e.sp.name+" 跨 "+e.k+" 段合流，碎片惩罚 F="+e.F.toFixed(2));
      if(e.C<3)warnings.push("⚠ "+e.sp.name+" C="+e.C+" 启动惩罚 L="+e.L.toFixed(3));
      if(e.waste>0)warnings.push("◌ "+e.sp.name+" 高色余量浪费 "+Math.round(e.waste)+"（封顶于 "+e.sp.req+"）");
      if(e.low)warnings.push("◌ "+e.sp.name+" 低色补偿：用更多容量补足需求品质");
      if(e.attrPower.s<1)warnings.push("⚠ 双攻未达阈值："+Math.round(e.attrPower.dual)+" / "+e.attrPower.req+
        " → S_attr="+(e.attrPower.s*100).toFixed(0)+"%");
      if(e.attrCrit.s<1)warnings.push("⚠ 爆伤阈值未达："+Math.round(e.attrCrit.dual)+" / "+e.attrCrit.req+
        " → S_attr="+(e.attrCrit.s*100).toFixed(0)+"%");
    });
    if(g0.G<1)warnings.push("⚠ 总供能不足：D_sum "+g0.dsum+" / 平滑 MP "+Math.round(g0.mp)+
      " → G="+g0.G.toFixed(2)+"（0.8D 缓冲线 "+(g0.dsum*G.buffer).toFixed(0)+"）");
    if(entries.length>2)warnings.push("◌ 显化槽只 1 主 + 1 辅，其余 "+(entries.length-2)+" 件为隐性供能");
    const split=s.split,byGrade=entries.filter(e=>e.sp.grade==="X").length;
    let recommend="推荐 · 单件满色宽";
    if(split==="19")recommend="收藏 / 娱乐级 · 1×9 被 L(1)=0.192 压制";
    else if(byGrade>=3)recommend="整活 / 极限输出 · 三 X 高成本";
    else if(byGrade===2)recommend="极限输出 / 高成本 · 双 X";
    else if(entries.length>=2)recommend="可玩 · 多配成本 / 供能 / 显化均不占优";
    return {cls,state:s,entries,G:g0.G,GInfo:g0,dSum:g0.dsum,mp:g0.mp,
      totalPower,buffPower,critDmg,warnings,recommend,
      buff:{active:BI().active,t:BI().t,cd:BI().cd,duration:BB.duration,v:BI().v}};
  }

  /* ---------- BOSS 战 BUFF「威力提升 · 神兵」 ---------- */
  /* dev5.1.1：BUFF 真值在 CR.buffs（按队伍槽位隔离），这里只留显示镜像与触发 CD。
     CD 也按契约者槽位独立，换人后另一名角色的神兵可正常触发。 */
  const bossBuff={t:0,cd:0,v:0};
  const cdMap={};
  const BNAME="威力提升 · 神兵";
  function slotKey(){return CR.buffs?CR.buffs.owner():"c0";}
  function cdOf(){return cdMap[slotKey()]||0;}
  function BI(){
    if(!CR.buffs)return {active:bossBuff.t>0,t:bossBuff.t,cd:bossBuff.cd,v:bossBuff.v};
    const k=slotKey(),L=CR.buffs.left(k,BNAME),V=CR.buffs.value(k,BNAME);
    return {active:CR.buffs.has(k,BNAME),t:L,cd:cdOf(),v:V};
  }
  let breakCd=0,skillAdd=0,inSkill=false,skillWindow=0;
  const visual={t:0,dur:.62,x:0,depth:0,face:1,color:null};
  function hasBoss(){
    let has=false;
    try{CR.ent.enemies.each(e=>{
      if(e.alive&&(e.type==="boss"||e.type==="miniboss"||(e.cfg&&e.cfg.boss)))has=true;
    });}catch(err){}
    try{if(CR.world&&CR.world.bossRef&&CR.world.bossRef.alive)has=true;}catch(err){}
    return has;
  }
  function activateBuff(v){
    /* V3.0：至少 +1%；写入通用 BUFF 容器走「同名顶替」规则，并按队伍槽位隔离 */
    v=Math.max(.01,v);
    if(CR.buffs){
      const r=CR.buffs.apply(slotKey(),{name:BNAME,value:v,dur:BB.duration,
        group:"power",icon:"⚔",bold:true,src:"神兵之力"});
      cdMap[slotKey()]=BB.cd;
      bossBuff.t=r.buff.left;bossBuff.v=r.buff.value;
      if(r.kept){/* 同名且剩余更长：保留旧 BUFF，不刷新 CD */}
      else cdMap[slotKey()]=BB.cd;
    }else{bossBuff.t=BB.duration;bossBuff.cd=BB.cd;bossBuff.v=v;}
    try{
      CR.ui.banner("⚔ 神兵觉醒 · 威力提升 · 神兵 +"+Math.round(v*100)+"%");
      CR.ui.toast("【威力提升 · 神兵】已激活：持续 "+BB.duration+"s，CD "+BB.cd+"s");
      CR.audio.sfx("buff");
    }catch(err){}
  }
  function tick(dt){
    const P=player();if(!P)return;
    /* G 平滑跟随（按当前出战角色的装配算一次） */
    try{
      const s=state(P.cls);
      const ds=[];s.segs.forEach(g=>{if(g.id)ds.push({D:DOf(CFG.SPIRITS[g.id])});});
      supplyG(ds,dt);
    }catch(err){}
    /* dev5.1.1：前台 + 后台所有角色的临时 BUFF 一起倒计时，常驻不动 */
    if(CR.buffs){
      CR.buffs.tick(dt);
      const bi=BI();bossBuff.t=bi.t;bossBuff.v=bi.v;bossBuff.cd=bi.cd;
      for(const k in cdMap)if(cdMap[k]>0)cdMap[k]=Math.max(0,cdMap[k]-dt);
    }else{
      if(bossBuff.t>0)bossBuff.t=Math.max(0,bossBuff.t-dt);
      if(bossBuff.cd>0)bossBuff.cd=Math.max(0,bossBuff.cd-dt);
    }
    if(breakCd>0)breakCd=Math.max(0,breakCd-dt);
    if(visual.t>0)visual.t=Math.max(0,visual.t-dt);
    /* 技能命中窗口：延迟弹道 / AoE 命中时也保留碎灵加成与飘字，1.25s 后关闭 */
    if(skillWindow>0){skillWindow=Math.max(0,skillWindow-dt);
      if(skillWindow<=0){inSkill=false;skillAdd=0;}}
    if(!cdOf()&&hasBoss()){
      try{
        const st=state(P.cls);
        if(st.segs.some(g=>g.id)){
          const ev=evaluate(P.cls);if(ev.buffPower>0)activateBuff(ev.buffPower);
        }
      }catch(err){}
    }
  }
  /* 同一乘区内不同名增益加算；切换角色不继承别人的 BUFF */
  function powerBuff(){
    if(CR.buffs)return CR.buffs.sum(slotKey(),"power");
    return bossBuff.t>0?bossBuff.v:0;
  }
  /* 爆伤是常驻面板值，但每次命中判定都会查；按 0.25s 缓存，避免逐帧重算 evaluate */
  const cdCache={t:-1,v:0,cls:-1};
  function critDmgBonus(){
    const P=player(),cls=P?P.cls:0,now=(CR.game&&CR.game.time)||0;
    if(cdCache.cls===cls&&now-cdCache.t<.25)return cdCache.v;
    let v=0;try{v=evaluate(cls).critDmg;}catch(err){v=0;}
    cdCache.t=now;cdCache.cls=cls;cdCache.v=v;return v;
  }
  function buffInfo(){
    const b=BI();
    return {active:b.active,t:b.t,cd:b.cd,duration:BB.duration,cdMax:BB.cd,
      v:b.v,label:BNAME,owner:slotKey()};
  }
  /* 技能释放：神兵技【碎灵】/【轩辕斩】基础威力加成 + 主显化立绘 */
  function onSkillCast(sk){
    skillAdd=0;inSkill=true;
    const P=player();if(!P)return 0;
    let ev;try{ev=evaluate(P.cls);}catch(err){return 0;}
    const s=ev.state;
    const candidates=ev.entries.filter(e=>e.sp.skill);
    if(!candidates.length)return 0;
    /* 主显化优先，其次效率最高的 */
    const main=s.manifest.main;
    let pick=candidates.find(e=>e.seg===main)||candidates.slice().sort((a,b)=>b.eff-a.eff)[0];
    if(!pick)return 0;
    /* 「激活至少 70% 的 a 效果」按双攻阈值 S_attr 判定（a 效果即威力提升 · 神兵） */
    const need=pick.sp.skill.unlock||0;
    if(pick.attrPower.s<need)return 0;
    if(breakCd>0)return 0;
    const boss=hasBoss();
    skillAdd=(pick.sp.skill.add[boss?"boss":"normal"]||0)*clamp(pick.eff,0,1);
    breakCd=pick.sp.skill.cd||1;
    /* 只有主显化槽（或没有显式主显化时的第一件）才生成局内实体 */
    if(main<0||main===pick.seg){
      visual.t=visual.dur;visual.x=P.x+P.facing*130;visual.depth=P.depth;
      visual.face=P.facing;visual.color=pick.sp.look==="heatGreatSword"?C.fire:C.steel;
    }
    try{
      CR.ui.toast("⚔ 神兵技【"+pick.sp.skill.name+"】· "+(boss?"头领":"非头领")+" 基础威力 +"+skillAdd.toFixed(2));
      CR.audio.sfx("boss");
    }catch(err){}
    return skillAdd;
  }
  function skillPowerAdd(){return inSkill?skillAdd:0;}
  function endSkillCast(){skillWindow=1.25;inSkill=true;}
  function onSkillHit(e,isBoss){
    if(!inSkill||skillAdd<=0)return;
    try{CR.ent.spawnFloat(e.x,e.depth,74,"碎灵 +"+skillAdd.toFixed(2),"crit",C.gold||[1,.84,.4],false);}catch(err){}
  }
  /* 局内神兵立绘：一把巨剑带热浪从高处拍下，仅主显化触发 */
  function renderVisual(r,pr,P){
    if(!visual.t||!r||!pr||!P)return;
    const a=clamp(visual.t/visual.dur,0,1);
    const p=pr(visual.x,visual.depth,210-(1-a)*170);
    if(!p)return;
    const s=p.s||1,hot=visual.color===C.fire;
    const glow=hot?C.fire:C.cyan,blade=hot?C.gold:C.steel;
    r.ell(p.x,p.y,52*s,20*s,glow,.10*a,0);
    r.ell(p.x,p.y-52*s,30*s,74*s,glow,.07*a,0);
    r.quad(p.x-8*s,p.y-96*s,16*s,112*s,blade,.82*a,0);
    r.tri(p.x-8*s,p.y-96*s,p.x+8*s,p.y-96*s,p.x,p.y-124*s,C.white||[1,1,1],.85*a,0);
    r.seg(p.x-26*s,p.y+14*s,p.x+26*s,p.y+14*s,9*s,C.gold||[1,.84,.4],.8*a,0);
    r.quad(p.x-3*s,p.y+16*s,6*s,30*s,C.brown||[.4,.28,.2],.8*a,0);
    for(let i=0;i<5;i++){
      const yy=p.y-70*s+i*26*s;
      r.ell(p.x+Math.sin(visual.t*9+i)*22*s,yy,20*s,7*s,glow,.055*a,0);
    }
    r.ring(p.x,p.y+16*s,70*s,26*s,3*s,glow,.22*a,0,16);
  }

  /* ---------- 悬浮说明（商店 / 背包） ---------- */
  function summary(id,cls){
    const sp=CFG.SPIRITS[id];if(!sp)return "";
    const g=gradeOf(sp),ap=attrFor(cls||0,sp,"power"),ac=attrFor(cls||0,sp,"crit");
    const lines=[
      sp.grade+" 级 · 原生可接受【"+sp.req+" "+colorE(sp.req)+"】 · 向下兼容",
      "需求容量 N=9　·　有效色宽 W="+WOf(sp).toFixed(1)+"　·　品质 Q="+QOf(sp).toFixed(2)+
        "　·　瓶颈 β="+g.beta+"　·　供能 D="+DOf(sp),
      "双攻 "+Math.round(ap.dual)+" / 威力阈值 "+ap.req+" → S_attr "+(ap.s*100).toFixed(0)+"%"+
        "　·　爆伤阈值 "+ac.req+" → "+(ac.s*100).toFixed(0)+"%",
      "效果：至多 +"+Math.round(sp.powerBonus*100)+"% <b>威力提升 · 神兵</b>（BOSS 战 45s / CD 450s）· +"+
        Math.round(sp.critDmg*100)+"% 常驻爆伤；均乘 S_attr × 灵路最终效率 E",
      "获取："+(sp.source||"巴恩工坊")
    ];
    if(sp.skill)lines.push("神兵技【"+sp.skill.name+"】CD "+sp.skill.cd+"s · "+
      (sp.skill.unlock?"需 a 效果 ≥"+Math.round(sp.skill.unlock*100)+"% · ":"")+
      "非头领基础威力 +"+sp.skill.add.normal+" / 头领 +"+sp.skill.add.boss);
    return lines.join("\n");
  }

  CR.soulpath={state,blankState,setSplit,setColor,equip,unequip,merge,unmerge,setManifest,
    usedIds,evaluate,colorE,gradeOf,WOf,QOf,DOf,attrInterp,attrFor,dualAtk,
    tick,powerBuff,critDmgBonus,buffInfo,activateBuff,slotKey,
    onSkillCast,skillPowerAdd,endSkillCast,onSkillHit,
    renderVisual,summary,hasBoss,
    get visual(){return visual;},get gMP(){return gMP;}};
})(window.CR=window.CR||{});
