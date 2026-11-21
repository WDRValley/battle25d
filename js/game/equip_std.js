/* equip_std.js — v1.4 dev3 · 装备系统与悬浮文本规范 v4.0
 * 统一命名 / 统一悬浮文本 / 统一数据字段；渲染层不再为单件装备写特判。
 * 依赖：config.js（EQUIPMENT / EQUIP_SETS / QUALITY_COLOR）、equipment.js、save.js
 * 附魔 / 鉴定 / 强化系统本版未实装，仅按规范渲染框架（Lv0 / [未鉴定]）。
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG;

  /* ---------- 第一章：品级前缀 / 标签 ---------- */
  const PREFIX={white:"普通之",green:"入门之",blue:"进阶之",purple:"史诗之",gold:"传说之"};
  const QNAME={white:"普通",green:"入门",blue:"进阶",purple:"史诗",gold:"传说"};
  const QCHAR={white:"白",green:"绿",blue:"蓝",purple:"紫",gold:"金",diamond:"钻",red:"红"};
  const ALL_PREFIX=["王者钻装之","异界钻装之","传奇神装之","不朽神装之",
    "普通之","入门之","进阶之","史诗之","传说之"];
  function themeOf(it){
    return {diamond:(it.diamondTheme==="异界"?"异界":"王者"),
            red:(it.redTheme==="传奇"?"传奇":"不朽")}[it.q]||QNAME[it.q]||"普通";
  }
  function prefixOf(it){
    if(it.q==="diamond")return (it.diamondTheme==="异界"?"异界钻装之":"王者钻装之");
    if(it.q==="red")return (it.redTheme==="传奇"?"传奇神装之":"不朽神装之");
    return PREFIX[it.q]||"普通之";
  }
  function qualityTag(it){return "["+themeOf(it)+" · "+QCHAR[it.q]+"]";}
  function baseName(it){
    let n=it.name||"";
    for(const p of ALL_PREFIX){if(n.indexOf(p)===0){n=n.slice(p.length);break;}}
    return n;
  }
  function fullName(it){return prefixOf(it)+baseName(it);}
  function name(id){const it=CFG.EQUIPMENT[id];return it?fullName(it):id;}

  /* ---------- 第二章：槽位 / 武器系别 / 重量 / 职业 ---------- */
  const SLOT_CN={head:"头部",chest:"躯干",main:"主手",off:"副手",two:"双手",feet:"足部"};
  const SUB_CN={circlet:"头饰",hat:"帽子",clothes:"衣服",necklace:"项链",shoes:"鞋子",anklet:"足饰"};
  const WTYPE_CN={sword:"剑系",dagger:"剑系",axe:"斧系",greatsword:"剑系",shield:"盾系",
    bow:"弓系",crossbow:"弓系",gun:"铳系",staff:"杖系",book:"书系",orb:"书系",
    ring:"戒系",focus:"法器系",spear:"矛系",hammer:"锤系",saw:"锯系",sickle:"镰系",rod:"竿系"};
  const WEIGHT_CN={light:"轻武",medium:"中武",heavy:"重武"};
  const ARCH_CN={warrior:"战士",tank:"坦克",assassin:"刺客",mage:"法师",ranger:"射手"};
  const CLASS_ARCH=["warrior","mage","ranger","mage"];   /* 4 位角色当前体质 */
  const OWNER_BY_WTYPE={sword:"战士系",dagger:"战士系",axe:"战士系",greatsword:"战士系",
    shield:"战士系",spear:"战士系",hammer:"战士系",saw:"战士系",sickle:"战士系",
    staff:"法师系",book:"法师系",orb:"法师系",ring:"法师系",focus:"法师系",
    bow:"射手系",crossbow:"射手系",gun:"射手系",rod:"工具系"};

  function inferWeight(it){
    if(it.weight)return it.weight;
    if(it.slot!=="main"&&it.slot!=="off"&&it.slot!=="two")return null;
    if(it.tool)return {harvest:"light",mining:"medium",lumber:"medium"}[it.tool]||"medium";
    const w=it.wtype;
    if(w==="greatsword"||w==="hammer")return "heavy";
    if(w==="axe"&&it.slot==="two")return "heavy";          /* 双手战斧 */
    if(w==="shield"&&it.slot==="two")return "heavy";       /* 巨盾 */
    if(["dagger","focus","book","orb","ring"].indexOf(w)>=0)return "light";
    if(w==="staff"&&it.slot==="main")return "light";        /* 魔棒 */
    if(w==="bow"&&it.slot==="main")return "light";          /* 袖箭 */
    return "medium";
  }
  function inferFit(it){
    if(it.fit)return it.fit;
    const a=it.allow;
    if(a&&a.length===1)return {best:[CLASS_ARCH[a[0]]||"warrior"],normal:[],bad:[]};
    return {best:[],normal:["warrior","mage","ranger"],bad:[]};
  }
  const GATHER_MAP={harvest:["草丛","菇丛","果树","农田","钓鱼点"],
    mining:["废弃铜铁矿堆"],lumber:["森林巨杉","枯木"],fish:["钓鱼点","浅水"]};
  function gatherTypes(it){return it.gatherTypes||(it.tool?GATHER_MAP[it.tool]||null:null);}
  function ownerOf(it){
    /* 工具身份由「可采集类型」行表达；定位/适配仍按武器系别归属，避免重复写「工具」。 */
    if(!it.wtype)return SUB_CN[it.sub]||"";
    return OWNER_BY_WTYPE[it.wtype]||"";
  }

  /* ---------- 第三章：强化等级（公式就绪，系统未开放） ---------- */
  function statValue(v,isPct,lv){
    const L=U.clamp(lv|0,0,3),out=v*(1+.20*L/3);
    if(isPct)return (Math.round(out*1000)/10)+"%";
    return String(Math.round(out));
  }
  /* 固定顺序：物攻→法攻→物防→法防→体力→暴击→爆伤→移速→攻速→闪避→射程 */
  const STATS=[["atk","物攻",0],["matk","法攻",0],["pdef","物防",0],["mdef","法防",0],
    ["hp","体力",0],["crit","暴击",1],["critDmg","爆伤",1],["spd","移速",1],
    ["atkSpd","攻速",1],["dodge","闪避",1],["hit","命中",1],["range","射程",0]];
  function statRows(it,lv){
    const s=it.stats||{},out=[];
    STATS.forEach(row=>{
      const v=s[row[0]];if(v===undefined||v===0)return;
      /* 负值 statValue 自带负号，正值补 "+"：移速-4% / 移速+12% */
      out.push({key:row[0],label:row[1],
        html:row[1]+(v<0?"":"+")+statValue(v,row[2],lv)});
    });
    return out;
  }

  /* ---------- 第 4.1 章：13 段结构 ---------- */
  const TERMS={
    "净化":"消除自身所有负面的异常状态（烧伤、中毒、恐惧等）",
    "速度降低":"移动速度降低。",
    "弱化":"全属性能力值降低。",
    "威力提升":"全技能威力增加。",
    "暴击提升":"全攻击手段（包括技能、普攻）暴击率提升。",
    "星梦":"自身全属性能力值临时提升。",
    "圣裁之剑":"攻击无视目标一定物防。",
    "真实护盾":"可吸收含固伤在内的一切伤害。",
    "抗性":"受到的一般伤害按百分比降低。",
    "法术护盾":"只吸收法术伤害，固伤与物理伤害无法抵御。",
    "普通护盾":"可吸收物理、法术伤害，不可吸收固伤。",
    "锁灵":"无法提升（战斗时的 8 维）属性。"
  };
  const SP_TYPE_CN={visual:"视觉系",audio:"听觉系",audioVisual:"视听觉系"};
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,c=>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
  function line(){return '<div class="st-rule"></div>';}
  function sec(t){return '<div class="st-sec">'+esc(t)+'</div>';}
  function row(t,cls){return '<div class="st-row '+(cls||"")+'">'+t+'</div>';}

  /* 套装档位：单条目单行，多条目 1. 2. 3. 编号 */
  function setBonusHTML(it,ctx){
    if(!it.set)return "";
    const S=CFG.EQUIP_SETS[it.set];if(!S)return "";
    const n=ctx.setCount||0,total=S.max||(S.any?23:(S.parts||[]).length);
    let h=sec("套装【"+S.name+"】：");
    (S.bonus||[]).forEach(b=>{
      const active=n>=b.n,label=b.label||"["+b.n+"/"+total+"]";
      const parts=String(b.desc).split(/　·　|　|；/).filter(Boolean);
      const clean=parts.map(x=>x.replace(/　/g," ").trim());
      if(clean.length<=1){
        h+=row('<span class="st-setn'+(active?" on":"")+'">'+esc(label)+'</span> ：'+
          '<span class="st-detail">'+bold(clean[0]||b.desc)+'</span>');
      }else{
        h+=row('<span class="st-setn'+(active?" on":"")+'">'+esc(label)+'</span> ：');
        clean.forEach((c,i)=>{
          h+=row('<span class="st-detail st-sub">'+(i+1)+'. '+bold(c)+(i<clean.length-1?"；":"")+'</span>');
        });
      }
    });
    return h;
  }
  function bold(t){
    const keys=["净化","速度降低","弱化","威力提升","暴击提升","星梦","圣裁之剑",
      "真实护盾","普通护盾","法术护盾","抗性","锁灵"];
    let s=esc(t);
    keys.forEach(k=>{s=s.split(k).join("<b>"+k+"</b>");});
    return s;
  }
  function spHTML(it,ctx){
    if(!it.set)return "";
    const S=CFG.EQUIP_SETS[it.set];if(!S)return "";
    const list=S.sp||[];if(!list.length)return "";
    const total=S.max||(S.any?23:(S.parts||[]).length);
    return list.map(sp=>{
      const id=String(sp.id||""),num=id.replace(/\D/g,"")||"1";
      const label=sp.label||"["+sp.slot+"/"+total+"]";
      const brief="sp"+num+"「"+esc(sp.name)+"」"+
        (SP_TYPE_CN[sp.type]?"（"+SP_TYPE_CN[sp.type]+"）":"");
      return row('<span class="st-sp-brief">'+brief+'</span>'+
        '<span class="st-detail">sp'+num+"「"+esc(sp.name)+"」当穿戴"+esc(label)+"："+
        esc(sp.desc)+"（"+SP_TYPE_CN[sp.type]+"，无战力加成）</span>");
    }).join("");
  }
  /* ⑫ 被动：采集组 / 战斗时机组（固定顺序）/ 使用限制 */
  function passiveHTML(it,ctx){
    const p=it.passive||[],tool=!!it.tool,groups={};
    p.forEach(k=>{
      const raw=CFG.PASSIVE_DESC[k]||k;
      const m=/^〔(采集|战斗)〕\s*(.*)$/.exec(raw);
      const tag=m?m[1]:"战斗",txt=m?m[2]:raw;
      (groups[tag]=groups[tag]||[]).push(txt);
    });
    let h=sec("被动：");
    if(!p.length&&!it.combatPassive)return h+row("无");
    if(tool&&(groups["采集"]||[]).length){
      groups["采集"].forEach(t=>{
        const i=t.indexOf("：");
        h+=row('<span class="st-pass-brief">「采集」'+(i>0?esc(t.slice(0,i)):esc(t))+'</span>'+
          '<span class="st-detail">「采集」'+bold(t)+'</span>');
      });
    }
    if((groups["战斗"]||[]).length||it.combatPassive){
      h+=row('「战斗」：');
      (groups["战斗"]||[]).forEach(t=>{
        const i=t.indexOf("：");
        h+=row('<span class="st-pass-brief st-sub">「战斗」'+(i>0?esc(t.slice(0,i)):esc(t))+'</span>'+
          '<span class="st-detail st-sub">'+bold(t)+'</span>');
      });
      const order=["进入战斗时","每次替换上场时","当我方同时在场人数>2时","对抗头领级目标时"];
      (it.combatPassive||[]).forEach(g=>{
        if(order.indexOf(g.timing)<0)return;
        /* 红装套装的战斗效果为规划文本，明确标注避免玩家误判为已生效 */
        h+=row('　['+esc(g.timing)+']<span class="st-plan">（规划中）</span>：');
        (g.lines||[]).forEach((t,i)=>{
          h+=row('<span class="st-pass-brief st-sub">'+esc(t.replace(/[：:].*$/,""))+'</span>'+
            '<span class="st-detail st-sub">'+(i+1)+'. '+bold(t)+'</span>');
        });
      });
    }
    if(tool){
      let rule=it.toolRule||"";
      if(!rule){try{rule=CR.equip.toolRuleText(ctx.cls||0,it)||"";}catch(e){}}
      if(!rule)rule="战士持工具可正常战斗；法师 / 射手仅可采集，无法释放普攻与依赖武器的技能。";
      h+=row('<span class="st-limit">使用限制：'+esc(rule)+'</span>');
    }
    return h;
  }
  function termsHTML(allText){
    const hit=Object.keys(TERMS).filter(k=>allText.indexOf(k)>=0);
    if(!hit.length)return "";
    return '<div class="st-terms"><div class="st-terms-h">▸ 名词备注（简略模式隐藏）</div>'+
      hit.map(k=>row('<span class="st-term">'+esc(k)+'：'+esc(TERMS[k])+'</span>')).join("")+'</div>';
  }

  /* ---------- 规范化对象（渲染层唯一入口） ---------- */
  function norm(id){
    const raw=CFG.EQUIPMENT[id];if(!raw)return null;
    const it=Object.assign({},raw,{id:id});
    it.baseName=baseName(raw);
    it.fullName=fullName(raw);
    it.tag=qualityTag(raw);
    it.color=CFG.QUALITY_COLOR[raw.q]||"#cfd6e4";
    it.qname=themeOf(raw);
    it.weight=inferWeight(raw);
    it.weightCn=WEIGHT_CN[it.weight]||"";
    it.wtypeCn=WTYPE_CN[raw.wtype]||"";
    it.slotCn=SLOT_CN[raw.slot]||raw.slot;
    it.subCn=SUB_CN[raw.sub]||"";
    it.owner=ownerOf(raw);
    it.gatherTypes=gatherTypes(raw);
    it.fit=inferFit(raw);
    it.appraisal=raw.appraisal||[];
    it.enchant=raw.enchant||[];
    return it;
  }

  /* ---------- 主渲染入口：renderItemTooltip(it, ctx) ---------- */
  function tooltipHTML(id,ctx){
    const it=norm(id);if(!it)return "";
    ctx=ctx||{};
    const lv=U.clamp(ctx.lv|0,0,3),count=ctx.count==null?(CR.equip?CR.equip.owned(id):0):ctx.count;
    const equipped=!!ctx.equipped,cls=ctx.cls|0,simple=!!ctx.simple;
    /* 当前穿戴件数（套装高亮） */
    let setCount=0;
    if(it.set&&CR.equip){
      try{
        const S=CFG.EQUIP_SETS[it.set],s=CR.equip.slots(cls);
        if(S.any){["head","chest","main","off","two","feet"].forEach(k=>{
          const e=CFG.EQUIPMENT[s[k]];if(e&&e.set===it.set)setCount++;});}
        else (S.parts||[]).forEach(pid=>{
          const e=pid?CFG.EQUIPMENT[pid]:null;
          if(e&&["head","chest","main","off","two","feet"].some(k=>s[k]===pid))setCount++;
        });
      }catch(err){}
    }
    const c2=Object.assign({},ctx,{setCount:setCount});
    const rawText=[it.desc||"",(it.passive||[]).map(k=>CFG.PASSIVE_DESC[k]||k).join(" "),
      (it.combatPassive||[]).map(g=>(g.lines||[]).join(" ")).join(" "),
      ((CFG.EQUIP_SETS[it.set]||{}).bonus||[]).map(b=>b.desc).join(" "),
      ((CFG.EQUIP_SETS[it.set]||{}).sp||[]).map(s=>s.desc).join(" ")].join(" ");

    let h='<div class="st-card'+(simple?" simple":"")+' q-'+it.q+'">';
    /* ① 标题行 */
    h+='<div class="st-title"><span class="st-icon">'+esc(it.icon||"◆")+'</span>'+
      '<span class="st-name" style="color:'+it.color+'">'+esc(it.fullName)+'</span>'+
      '<span class="st-lv">Lv'+lv+(lv===3?" (MAX)":"")+'</span>'+
      '<span class="st-tag" style="color:'+it.color+';border-color:'+it.color+
      ';background:'+it.color+'33">'+esc(it.tag)+'</span></div>';
    /* ② 状态行 */
    h+='<div class="st-status">持有数量：'+count+'件 · '+esc(it.slotCn)+
      (it.subCn?" · "+esc(it.subCn):"")+" · "+(equipped?"已装备":"未装备")+'</div>';
    /* ③ 工具行 */
    if(it.gatherTypes)h+='<div class="st-tool">可采集类型：'+esc(it.gatherTypes.join("、"))+'</div>';
    /* ④ 介绍行 + 互斥独立行 */
    if(it.desc)h+='<div class="st-desc">介绍：'+esc(it.desc)+'</div>';
    if(it.exclusive)h+='<div class="st-excl">互斥：'+esc(it.exclusive)+'</div>';
    h+=line();
    /* ⑤ 基础属性 */
    h+=sec("基础属性（Lv"+lv+"时增加的属性项目）：");
    const sr=statRows(it,lv);
    if(sr.length)sr.forEach(r=>{h+=row('<span class="st-stat">'+esc(r.html)+'</span>');});
    else h+=row('<span class="st-stat">无</span>');
    h+=line();
    /* ⑥ 附加属性 */
    h+=sec("附加属性（主要来源于鉴定/附魔）：");
    if(!it.appraisal.length&&!it.enchant.length){
      h+=row('<span class="st-unid">[未鉴定]</span>');
    }else{
      it.appraisal.forEach((a,i)=>{
        h+=row('<span class="st-appr-brief">「鉴定'+(i+1)+'」'+esc(a.stat)+'</span>'+
          '<span class="st-detail">「鉴定'+(i+1)+'」'+esc(a.stat)+"+"+esc(a.val)+'</span>');
      });
      it.enchant.forEach((a,i)=>{
        h+=row('<span class="st-appr-brief">「附魔'+(i+1)+'」'+esc(a.name)+'</span>'+
          '<span class="st-detail">「附魔'+(i+1)+'」'+esc(a.name)+"："+bold(a.desc)+'</span>');
      });
    }
    h+=line();
    /* ⑦ 定位 */
    h+='<div class="st-loc">定位：'+esc(it.slotCn)+(it.owner?" · "+esc(it.owner):"")+'</div>';
    /* ⑧ 适配（仅武器 / 工具） */
    const isWeapon=["main","off","two"].indexOf(it.slot)>=0;
    if(isWeapon&&it.wtypeCn){
      h+='<div class="st-fitline">适配：'+esc(it.slotCn)+"·"+esc(it.owner)+"·"+
        esc(it.wtypeCn)+" | "+esc(it.weightCn)+'</div>';
      /* ⑨ 适配度 */
      const ar=CLASS_ARCH[cls]||"warrior";
      const f=it.fit,list=k=>(f[k]||[]).map(a=>ARCH_CN[a]||a).join(" / ")||"无";
      h+='<div class="st-adapt">适配度：</div>';
      h+=row('　更优：'+esc(list("best")));
      h+=row('　平：'+esc(list("normal")));
      h+=row('　更劣：'+esc(list("bad"))+((f.bad||[]).indexOf(ar)>=0?"（当前）":""));
    }
    h+=line();
    /* ⑩ 套装 */
    h+=setBonusHTML(it,c2);
    /* ⑪ sp 段 */
    h+=spHTML(it,c2);
    /* ⑫ 被动 */
    h+=passiveHTML(it,c2);
    /* ⑬ 名词备注 */
    h+=termsHTML(rawText);
    h+='</div>';
    return h;
  }
  function simpleMode(){
    try{return !!(CR.save&&CR.save.data&&CR.save.data.settings.simpleTooltip);}catch(e){return false;}
  }
  CR.equipStd={norm,name,fullName,baseName,qualityTag,prefixOf,themeOf,inferWeight,inferFit,
    gatherTypes,ownerOf,statRows,statValue,tooltipHTML,simpleMode,
    SLOT_CN,SUB_CN,WTYPE_CN,WEIGHT_CN,ARCH_CN,CLASS_ARCH,TERMS,SP_TYPE_CN,STATS};
})(window.CR=window.CR||{});
