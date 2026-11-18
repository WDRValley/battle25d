/* equipment.js — 装备槽 / 穿戴校验 / 属性·套装·被动 / 工具战斗规则 / 外观查询 · v1.4 dev1 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save;
  const MAXC=CFG.MAX_CLASS===undefined?3:CFG.MAX_CLASS;

  function bag(){return SV.data.inventory.equips;}
  function slots(cls){
    const e=SV.data.equipment;
    if(!e[cls])e[cls]=Object.assign({},CFG.DEFAULT_EQUIP[cls]||{});
    return e[cls];
  }
  function view(cls){
    const s=slots(cls),o={};
    for(const k in s)o[k]=s[k]?CFG.EQUIPMENT[s[k]]:null;
    return o;
  }
  function owned(id){return bag()[id]||0;}
  function add(id,n){
    n=n||1;if(!CFG.EQUIPMENT[id])return 0;
    bag()[id]=owned(id)+n;SV.mark();return bag()[id];
  }
  function take(id,n){
    n=n||1;
    if(owned(id)<n)return false;
    bag()[id]-=n;if(bag()[id]<=0)delete bag()[id];SV.mark();return true;
  }
  function giveBack(id){if(!id)return;add(id,1);}
  function classOk(cls,id){
    const it=CFG.EQUIPMENT[id];if(!it)return false;
    /* 1.4 dev2 回归修复：带 tool（工具属性）的装备一律豁免职业限制。
       哪怕这件装备最适配战士（如月牙镰 allow:[0]），法师 / 射手 / 夜樱也能穿戴；
       穿戴后的战斗限制由 combatState() 按职业区分（战士可战斗，法 / 射仅采集），
       而不是在「能不能穿」这一层直接把角色挡在门外。 */
    if(it.tool)return true;
    if(!it.allow)return true;                    // 工具性武器：任何职业可穿戴
    cls=U.clamp(cls|0,0,MAXC);
    if(it.allow.indexOf(cls)>=0)return true;
    /* 1.3.1：坦克 / 刺客是战士特化体质，可混搭战士系装备（但重装备有移速惩罚） */
    const c=CFG.CLASSES[cls],a=c&&CFG.ARCHETYPES?CFG.ARCHETYPES[c.archetype]:null;
    if(a&&a.parent==="warrior"&&it.allow.indexOf(0)>=0)return true;
    return false;
  }
  function validate(cls,slot,id){
    const it=CFG.EQUIPMENT[id];
    if(!it)return {ok:false,reason:"不存在的装备"};
    if(it.slot!==slot)return {ok:false,reason:"这件装备不能放在"+slotName(slot)};
    if(!classOk(cls,id))return {ok:false,reason:CFG.CLASSES[cls].name+"不能装备「"+it.name+"」"};
    if(owned(id)<=0)return {ok:false,reason:"背包里没有这件装备"};
    return {ok:true,reason:""};
  }
  function slotName(k){const s=CFG.EQUIP_SLOTS.find(x=>x.id===k);return s?s.name:k;}

  /* 卸下：把装备放回库存 */
  function unequip(cls,slot){
    const s=slots(cls),id=s[slot];
    if(!id)return false;
    s[slot]=null;giveBack(id);SV.mark();
    CR.audio&&CR.audio.sfx&&CR.audio.sfx("unequip");
    afterChange(cls);
    return true;
  }
  /* 1.4 dev1.3：一键卸下当前角色全部装备（放回背包，套装/视觉即时重算） */
  function unequipAll(cls){
    const s=slots(cls);let n=0;
    for(const k in s){if(s[k]){giveBack(s[k]);s[k]=null;n++;}}
    if(n){SV.mark();try{CR.audio.sfx("unequip");}catch(e){}afterChange(cls);}
    return n;
  }
  /* 穿戴：自动处理双手互斥与旧装备归还 */
  function equip(cls,slot,id){
    const v=validate(cls,slot,id);
    if(!v.ok)return v;
    const s=slots(cls);
    if(slot==="two"){
      if(s.two&&s.two!==id)giveBack(s.two);
      giveBack(s.main);giveBack(s.off);
      s.main=null;s.off=null;s.two=null;
    }else if(slot==="main"||slot==="off"){
      if(s.two){giveBack(s.two);s.two=null;}
      if(s[slot])giveBack(s[slot]);
      s[slot]=null;
    }else{
      if(s[slot])giveBack(s[slot]);
      s[slot]=null;
    }
    /* 1.4 dev1：衣服↔项链、鞋子↔足饰同槽互斥（只留一种） */
    const it0=CFG.EQUIPMENT[id],old=s[slot]?CFG.EQUIPMENT[s[slot]]:null;
    if(it0&&it0.sub&&CFG.subExclusive){
      const excl=CFG.subExclusive(slot,it0.sub)||[];
      for(const k in s){
        const o=s[k]?CFG.EQUIPMENT[s[k]]:null;
        if(k!==slot&&o&&o.slot===slot&&o.sub&&excl.indexOf(o.sub)>=0){
          giveBack(s[k]);s[k]=null;
        }
      }
    }
    take(id,1);
    s[slot]=id;SV.mark();
    CR.audio&&CR.audio.sfx&&CR.audio.sfx("equip");
    afterChange(cls);
    const it=CFG.EQUIPMENT[id];
    if(it&&it.tool)try{CR.ui.toast(toolRuleText(cls,it));}catch(e){}
    return {ok:true,reason:""};
  }
  function afterChange(cls){
    if(CR.ent&&CR.ent.player&&CR.ent.player.cls===cls){
      /* 1.4 dev1.1：穿卸装备后立刻同步 sp1 樱花环绕视觉标志，无需等下一帧 tick */
      CR.ent.player.petalAura=!!bonus(cls).petalAura;
      if(CR.team&&CR.team.applyStats)CR.team.applyStats();
      else CR.ent.applyStats();
    }
    if(CR.ui&&CR.ui.refreshAll)CR.ui.refreshAll();
    else if(CR.ui&&CR.ui.refreshPanels)CR.ui.refreshPanels();
    if(CR.ui&&CR.ui.buildSkills)CR.ui.buildSkills();
  }

  /* ---------- 属性 / 套装 / 被动汇总 ---------- */
  function bonus(cls){
    const s=slots(cls);
    /* 1.4 dev1.4：物防 / 法防独立通道，取代模糊的「护甲」 */
    const out={atk:0,matk:0,hp:0,armor:0,pdef:0,mdef:0,crit:0,spd:0,critDmg:0,range:0,atkSpd:0,
      atkPct:0,spdPct:0,hpPct:0,energyKill:0,dmgReduce:0,meleeRange:0,
      hit:0,dodge:0,passives:[],sets:[],count:0,heavyPenalty:0,heavyNames:[],
      /* 1.4 dev1 种族特殊属性（装备可追加，交由 battlecore.raceOf 合并） */
      res:0,trueRes:0,typeResist:0,weakResist:0,pierce:0,pierceResist:0,
      critDmgResist:0,precise:0,regenHp:0,regenMp:0,fitEff:1,fitNotes:[],
      /* 1.4 dev1.1 王者樱花套装 */
      lifesteal:0,sakuraGuard:false,petalAura:false};
    const worn=[];
    for(const k in s){
      const id=s[k];if(!id)continue;
      const it=CFG.EQUIPMENT[id];if(!it)continue;
      worn.push(id);out.count++;
      /* 适配效率：更优 105% / 平 100% / 更劣 92%；重中轻武在数值 / 攻速 / 移速上的梯度
         已写进各件 stats，这里只对带 fit 的装备按当前体质缩放数值属性。 */
      let eff=1;
      if(it.fit&&CFG.FIT_EFF){
        const ar=CFG.CLASSES[cls]?(CFG.CLASSES[cls].archetype||"warrior"):"warrior";
        if((it.fit.best||[]).indexOf(ar)>=0)eff=CFG.FIT_EFF.best;
        else if((it.fit.bad||[]).indexOf(ar)>=0)eff=CFG.FIT_EFF.bad;
        else eff=CFG.FIT_EFF.normal;
        out.fitNotes.push({name:it.name,eff,ar});
      }
      const st=it.stats||{};
      const scaleKeys={atk:1,matk:1,hp:1,armor:1,pdef:1,mdef:1,crit:1,critDmg:1,spd:1,atkSpd:1,
        hit:1,dodge:1,res:1,trueRes:1,pierce:1,precise:1};
      for(const a in st)if(typeof out[a]==="number"){
        out[a]+=(scaleKeys[a]?st[a]*eff:st[a]);
      }
      if(it.passive)it.passive.forEach(p=>{if(out.passives.indexOf(p)<0)out.passives.push(p);});
    }
    // 套装
    for(const key in CFG.EQUIP_SETS){
      const set=CFG.EQUIP_SETS[key];
      const n=set.any?worn.filter(id=>CFG.EQUIPMENT[id]&&CFG.EQUIPMENT[id].set===key).length:
        set.parts.filter(id=>worn.indexOf(id)>=0).length;
      if(n>=2){
        out.sets.push({key,name:set.name,n,active:set.bonus.filter(b=>n>=b.n).map(b=>b.desc),
          sp1:(set.sp1&&n>=set.sp1.n)?set.sp1:null});
        if(key==="wind"){
          if(n>=2)out.spdPct+=.10;
          if(n>=3)out.atkSpd+=.12;
        }else if(key==="ironguard"){
          if(n>=2){out.pdef+=6;out.mdef+=3;}
          if(n>=3)out.hp+=50;
        }else if(key==="starfrost"){
          if(n>=2)out.atkPct+=.08;
          if(n>=3)out.energyKill+=.35;
        }else if(key==="sakura"){
          /* 1.4 dev1.1 王者樱花套装：2/2 双攻 +4；4/4 抗性 / 吸血 / 半血守护 / sp1 视觉 */
          const ef=set.effect||{};
          if(n>=2){out.atk+=4;out.matk+=4;}
          if(n>=4){
            out.res+=ef.res===undefined?.30:ef.res;
            out.lifesteal+=ef.lifesteal===undefined?.10:ef.lifesteal;
            out.sakuraGuard=true;
            out.petalAura=true;
          }
        }
      }
    }
    /* 1.3.1 重装备适配：坦克不受影响，战士轻微影响，刺客 / 法师 / 射手明显降速 */
    const hs=CFG.heavyPenalty?CFG.heavyPenalty(cls):1;
    const heavy=CFG.HEAVY_ITEMS||[];
    /* 1.4 dev1.4：只有「重武」才吃适配惩罚，中武圆盾不再被误判为重装备 */
    const heavyOn=worn.filter(id=>{
      const it=CFG.EQUIPMENT[id];if(!it)return false;
      if(heavy.indexOf(id)>=0)return true;
      return !!(CFG.HEAVY_WTYPES&&CFG.HEAVY_WTYPES.indexOf(it.wtype)>=0&&
        (it.weight==="heavy"||it.weight===undefined));
    });
    if(heavyOn.length&&hs<1){
      out.heavyPenalty=1-hs;
      out.spdPct-=out.heavyPenalty*Math.min(1,heavyOn.length);
      out.heavyNames=heavyOn.map(id=>CFG.EQUIPMENT[id].name);
    }
    // 被动折算
    if(out.passives.indexOf("swift")>=0)out.spdPct+=.05;
    if(out.passives.indexOf("ward")>=0)out.dmgReduce+=.04;
    if(out.passives.indexOf("arcane")>=0)out.energyKill+=.50;
    if(out.passives.indexOf("cleave")>=0)out.meleeRange+=.12;
    if(out.passives.indexOf("pierce")>=0)out.atk+=3;
    return out;
  }
  function has(cls,key){return bonus(cls).passives.indexOf(key)>=0;}
  function setOf(cls){return bonus(cls).sets;}
  function statLine(cls){
    const b=bonus(cls),p=[];
    if(b.atk)p.push("物攻 +"+U.fmt(b.atk));
    if(b.matk)p.push("法攻 +"+U.fmt(b.matk));
    if(b.hp)p.push("生命 +"+U.fmt(b.hp));
    /* 1.4 dev1.4：护甲除名，明确为物防 / 法防 */
    if(b.pdef||b.armor)p.push("物防 +"+U.fmt(b.pdef+b.armor));
    if(b.mdef)p.push("法防 +"+U.fmt(b.mdef));
    if(b.crit)p.push("暴击 +"+(b.crit*100).toFixed(1)+"%");
    if(b.spd)p.push("移速 +"+b.spd.toFixed(2));
    if(b.critDmg)p.push("爆伤 +"+b.critDmg+"%");
    if(b.range)p.push("射程 +"+b.range);
    if(b.atkPct)p.push("物攻 +"+(b.atkPct*100).toFixed(0)+"%");
    if(b.spdPct)p.push("移速 "+(b.spdPct>=0?"+":"")+(b.spdPct*100).toFixed(0)+"%");
    if(b.heavyPenalty>0)p.push("⚠ 重装备不适配 · 移速 -"+(b.heavyPenalty*100).toFixed(0)+"%（"+
      (b.heavyNames||[]).join("/")+"）");
    if(b.hit)p.push("命中 +"+(b.hit*100).toFixed(1)+"%");
    if(b.dodge)p.push("闪避 +"+(b.dodge*100).toFixed(1)+"%");
    if(b.res)p.push("抗性 +"+(b.res*100).toFixed(0)+"%");
    if(b.lifesteal)p.push("吸血 +"+(b.lifesteal*100).toFixed(0)+"%");
    return p.length?p.join("　"):"无额外加成";
  }
  function ownedList(){
    return Object.keys(bag()).filter(id=>CFG.EQUIPMENT[id]&&bag()[id]>0)
      .map(id=>({id,n:bag()[id],it:CFG.EQUIPMENT[id]}));
  }

  /* ---------- 1.3.0 武器 / 工具提供的「能力标签」 ---------- */
  function wtypeTags(out,wt){
    if(!wt)return;
    if(wt==="bow"||wt==="crossbow"||wt==="gun")out.push("bow");
    else if(wt==="staff"||wt==="book"||wt==="orb"||wt==="focus")out.push("arcane");
    else out.push("warrior");
    if(out.indexOf(wt)<0)out.push(wt);
  }
  function weaponProvides(cls){
    const s=slots(cls),out=[];
    const two=s.two?CFG.EQUIPMENT[s.two]:null;
    if(two){
      if(two.tool){
        const t=two.tool;
        if(t==="harvest"){
          if(cls===1||cls===3){out.push("arcane","harvest");}
          else if(cls===0){out.push("warrior","harvest");}
          else{out.push("harvest");}
        }else{
          if(cls===0){out.push("warrior",t);}
          else{out.push(t);}
        }
      }else{
        wtypeTags(out,two.wtype);
      }
    }else{
      [s.main,s.off].forEach(id=>{
        const it=id?CFG.EQUIPMENT[id]:null;
        if(it&&!it.tool)wtypeTags(out,it.wtype);
      });
      if(!out.length){
        if(cls===0)out.push("warrior");                 // 战士徒手
        else if(cls===1||cls===3)out.push("arcane");   // 法术系自身魔力
      }
    }
    return out;
  }
  /* 工具职业规则文字（装备说明 / toast 复用） */
  function toolRuleText(cls,it){
    if(!it||!it.tool)return "";
    const n=CFG.CLASSES[cls].name;
    if(it.tool==="harvest"){
      if(cls===0)return n+"戴【"+it.name+"】视为徒手搏斗：仍可战斗，但攻击 -45%";
      if(cls===1||cls===3)return n+"戴【"+it.name+"】视为法戒 / 悬浮法器：可正常普攻与施法";
      return n+"戴【"+it.name+"】只能采集：无法普攻、无法放弓弩类技能，但「藤蔓缠绕」等不依赖武器的技能仍可释放";
    }
    if(cls===0)return n+"持【"+it.name+"】视为双手武器：照常战斗（攻击 +8%），采集效率额外提升";
    return n+"持【"+it.name+"】只能采集：无法普攻，也无法释放需要武器的技能";
  }
  /* 战斗状态：普攻 / 技能是否可用、攻击倍率、被动汇总 */
  /* ================= 1.4 dev2 入战型护盾装备 =================
     抗魔斗篷：进入战斗立即获得 200 点法术护盾（CD 75s）
     厚实布甲：300 点普通护盾 + 15% 最大生命的真实护盾（CD 60s）
     真正交战时由 world.markEngage() 调用；CD 用游戏时间，切角色 / 换装不重置。 */
  const shieldCd={};
  function onEnterCombat(){
    const cls=U.clamp((CR.ent&&CR.ent.player)?CR.ent.player.cls:0,0,MAXC);
    const s=slots(cls),it=CFG.EQUIPMENT[s.chest];
    if(!it||!it.enterShield)return;
    const cfg=it.enterShield,key=cls+"|"+s.chest,now=CR.game?CR.game.time:0;
    if(shieldCd[key]&&now<shieldCd[key])return;
    shieldCd[key]=now+(cfg.cd||60);
    const BC=CR.battlecore,PL=CR.ent&&CR.ent.player;
    if(!BC||!PL)return;
    let total=0;
    if(cfg.normal){BC.addShield(PL,"normal",cfg.normal);total+=cfg.normal;}
    if(cfg.magic){BC.addShield(PL,"magic",cfg.magic);total+=cfg.magic;}
    if(cfg.trueHp){
      const n=Math.round((PL.maxHp||100)*cfg.trueHp);
      BC.addShield(PL,"true",n);total+=n;
    }
    if(total>0){
      try{CR.audio.sfx("shield");}catch(e){}
      try{CR.ui.toast("⛨ "+it.name+" · 入战获得 "+Math.round(total)+" 点护盾（CD "+(cfg.cd||60)+"s）");}catch(e){}
      try{CR.ent.spawnFloat(PL.x,PL.depth,92,"⛨ "+Math.round(total),"shield",C.cyan||[.55,.91,1],false);}catch(e){}
    }
  }
  function combatState(cls){
    cls=U.clamp(cls|0,0,MAXC);
    const c=CFG.CLASSES[cls],s=slots(cls),b=bonus(cls);
    const two=s.two?CFG.EQUIPMENT[s.two]:null;
    const tool=two&&two.tool?two.tool:null;
    const provides=weaponProvides(cls);
    const need=c.attackNeed;
    const canAttack=provides.indexOf(need)>=0;
    let atkMul=1;
    if(tool==="harvest"&&cls===0)atkMul=.55;                 // 战士徒手 -45%
    else if(tool&&tool!=="harvest"&&cls===0)atkMul=1.08;     // 战士持镐 / 斧 / 锯 +8%
    const ps=b.passives;
    return {
      cls,tool,toolId:tool?s.two:null,provides,canAttack,atkMul,
      archetype:c.archetype||"warrior",mark:c.mark||"╋",
      heavyPenalty:b.heavyPenalty||0,heavyNames:b.heavyNames||[],
      need,reason:canAttack?"":(tool?toolRuleText(cls,two):"没有可用武器，无法普攻"),
      hit:b.hit,dodge:b.dodge,
      gatherSpeed:ps.indexOf("strong")>=0?1.25:1,
      harvestChance:ps.indexOf("harvest")>=0?.15:0,
      shatterChance:ps.indexOf("shatter")>=0?.05:0,
      extraGather:(ps.indexOf("mining")>=0||ps.indexOf("lumber")>=0)?1:0,
      breakChance:ps.indexOf("breakArmor")>=0?.10:0,
      firstSkillHit:ps.indexOf("keen")>=0,
      passives:ps
    };
  }
  /* 技能释放判定：武器需求 + 职业 / 系别 / 武器三重限定 */
  function skillAllowed(cls,skillId){
    const sk=CFG.SKILLS[skillId];
    if(!sk)return {ok:false,reason:"技能模板不存在"};
    const cs=combatState(cls),c=CFG.CLASSES[U.clamp(cls|0,0,MAXC)];
    if(sk.requires){
      const r=sk.requires;
      if(r.classes&&r.classes.indexOf(cls)<0)
        return {ok:false,reason:"【"+sk.name+"】仅限 "+r.classes.map(i=>CFG.CLASSES[i].name).join(" / ")};
      if(r.elements&&r.elements.indexOf(c.element)<0)
        return {ok:false,reason:"【"+sk.name+"】要求 "+r.elements.join(" / ")+" 角色（当前 "+c.element+"）"};
      if(r.weapons&&!r.weapons.some(w=>cs.provides.indexOf(w)>=0))
        return {ok:false,reason:"【"+sk.name+"】需要装备 "+r.weapons.join(" / ")};
    }
    if(sk.weapon===null)return {ok:true,reason:"",intrinsic:true};
    if(sk.weapon==="any")
      return cs.canAttack?{ok:true,reason:""}:{ok:false,reason:cs.reason||"当前武器无法释放该技能"};
    if(cs.provides.indexOf(sk.weapon)>=0)return {ok:true,reason:""};
    return {ok:false,reason:"【"+sk.name+"】需要 "+sk.weapon+" 类武器；"+(cs.tool?"当前手持工具":"当前武器不匹配")};
  }

  /* 旧档迁移：tool 槽 → two 槽，冲突的主副手装备归还库存 */
  function normalizeAll(){
    for(let c=0;c<=MAXC;c++){
      const s=slots(c);
      if(s.tool){
        const id=s.tool;delete s.tool;
        if(CFG.EQUIPMENT[id]&&CFG.EQUIPMENT[id].slot==="two"){
          if(s.two&&s.two!==id)add(s.two,1);
          if(s.main)add(s.main,1);if(s.off)add(s.off,1);
          s.main=null;s.off=null;s.two=id;
        }else add(id,1);
        SV.mark();
      }
      CFG.EQUIP_SLOTS.forEach(sl=>{
        const id=s[sl.id];
        if(id&&(!CFG.EQUIPMENT[id]||CFG.EQUIPMENT[id].slot!==sl.id||!classOk(c,id))){
          add(id,1);s[sl.id]=null;
        }
      });
      if(s.two){if(s.main){add(s.main,1);s.main=null;}
        if(s.off){add(s.off,1);s.off=null;}}
    }
  }
  /* 1.4 dev1：装备适配说明（供物品悬浮 / 装备库显示） */
  function fitText(cls,id){
    const it=CFG.EQUIPMENT[id];if(!it||!it.fit)return "";
    const ar=CFG.CLASSES[cls]?(CFG.CLASSES[cls].archetype||"warrior"):"warrior";
    const nm=(CFG.ARCHETYPES&&CFG.ARCHETYPES[ar]&&CFG.ARCHETYPES[ar].name)||ar;
    const best=it.fit.best||[],normal=it.fit.normal||[],bad=it.fit.bad||[];
    let eff=(CFG.FIT_EFF||{best:1.05,normal:1,bad:.92}).normal;
    if(best.indexOf(ar)>=0)eff=CFG.FIT_EFF.best;
    else if(bad.indexOf(ar)>=0)eff=CFG.FIT_EFF.bad;
    const lv=eff>1?"更优":(eff<1?"更劣":"平");
    const nmOf=k=>(CFG.ARCHETYPES&&CFG.ARCHETYPES[k]&&CFG.ARCHETYPES[k].name)||k;
    return "适配："+lv+"（"+Math.round(eff*100)+"% 效率 · 当前体质 "+nm+"）"+
      "｜更优 "+(best.length?best.map(nmOf).join("/"):"无")+
      " · 更劣 "+(bad.length?bad.map(nmOf).join("/"):"无")+
      (it.weight?"｜"+(it.weight==="heavy"?"重武":(it.weight==="light"?"轻武":"中武")):"");
  }
  CR.equip={bag,slots,view,owned,add,take,validate,slotName,equip,unequip,unequipAll,onEnterCombat,
    bonus,has,setOf,statLine,ownedList,normalizeAll,classOk,fitText,
    weaponProvides,combatState,skillAllowed,toolRuleText};
})(window.CR=window.CR||{});
