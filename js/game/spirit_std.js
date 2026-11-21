/* spirit_std.js — 《标准副件悬浮文本框架 V3.0》
   主面板直出 + 细虚线分隔解释，不做二级悬浮。
   关键口径：
     · 「原生色宽色阶@实际段长段色」是【已契约】时的运行时装配信息，
       按 soulpath.state(cls).segs 动态生成，绝不写进神兵静态描述。
     · 未契约只显示「级别 | 原生色阶」，不带 @。
     · 面向玩家的文本统一为「碧 / 赤」，不出现代际称谓。
     · 【名称解释】完整保留计算方式与同名 BUFF 顶替规则（通用机制说明）。 */
(function(CR){
  "use strict";
  const CFG=CR.CFG,SV=CR.save,U=CR.u;
  const e=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>
    ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const pct=v=>Math.round((v||0)*100)+"%";
  const REQ_N={A:3,S:6,X:9};

  /* 找这件副件被谁、装在哪个段上（已契约） */
  function contract(id,viewCls){
    if(!CR.soulpath)return null;
    const order=[];
    for(let c=0;c<4;c++)order.push(c);
    /* 当前查看 / 出战角色优先 */
    if(viewCls!=null){const i=order.indexOf(viewCls);if(i>0){order.splice(i,1);order.unshift(viewCls);}}
    for(const c of order){
      const s=CR.soulpath.state(c);
      for(let k=0;k<s.segs.length;k++){
        const g=s.segs[k];
        if(g.id===id)return {cls:c,name:(SV.teamName?SV.teamName(c):("角色 "+(c+1))),
          segN:g.n,segColor:g.color,segIdx:k,color:s.color};
      }
    }
    return null;
  }
  function contractName(c){
    try{return SV.teamName?SV.teamName(c):("角色 "+(c+1));}catch(err){return "角色 "+(c+1);}
  }

  const NAME_EXPLAIN=
    "<div class='spExplain'>"+
      "<div class='spH'>【名称解释】</div>"+
      "<div class='spK'>威力提升 · 神兵</div>"+
      "<div class='spV'>战斗时临时获得的用于提高技能威力的 BUFF。</div>"+
      "<div class='spLi'>• <b>计算方式</b>：技能「突击」威力 50，经过该增益 30% 后变为 "+
        "<b>65</b>（50 × 130%）。若同时存在其他<b>非重名</b>威力增益（如「威力提升」12%），"+
        "则最终为 <b>50 × (12% + 30% + 100%) = 71</b>。</div>"+
      "<div class='spLi'>• <b>同名 BUFF 顶替规则</b>："+
        "<div class='spSub'>1) 获得同名 BUFF 时，优先取「<b>剩余时间长</b>」的。"+
          "例如「威力提升(33%)，剩余 40 秒」与「威力提升(45%)，剩余 30 秒」同时存在，"+
          "最终生效的是「威力提升(33%)，剩余 40 秒」。</div>"+
        "<div class='spSub'>2) 若同名 BUFF 剩余时间<b>相同</b>，优先取「<b>数值高</b>」的。"+
          "例如「威力提升(30%)，40 秒」与「威力提升(60%)，40 秒」同时获得，"+
          "最终生效的是「威力提升(60%)，40 秒」。</div>"+
      "</div>"+
      "<div class='spNote'>* 注：此规律适用于游戏内<b>任何同类 BUFF</b>"+
        "（神兵 · 威力提升、速度提升、爆伤提升等）。常驻 BUFF（未写持续时间）时间无限，"+
        "不会被计时清除；后台角色的临时 BUFF 仍会正常倒计时。</div>"+
    "</div>";

  function tooltipHTML(id,opt){
    opt=opt||{};
    const sp=CFG.SPIRITS[id];if(!sp)return "";
    const cls=opt.cls==null?((CR.ent&&CR.ent.player)?CR.ent.player.cls:0):opt.cls;
    const ct=contract(id,cls),g=CFG.SOUL_GRADE[sp.grade]||{};
    const own=SV.spiritCount?SV.spiritCount(id):((SV.data.spirits||{})[id]||0);
    const simple=!!opt.simple;
    const gradeTag=g.tag||(sp.grade+" 级");
    const reqN=sp.reqN||REQ_N[sp.grade]||9;
    const reqColor=sp.req||"碧";

    /* ① 标题：图标 子类别 · 名称 已/未契约 级别 */
    let h="<div class='spTip'>"+
      "<div class='spTitle'>"+sp.icon+" <span class='spCat'>神兵</span> · <b>"+e(sp.name)+"</b> "+
      "<span class='"+(ct?"spOn":"spOff")+"'>"+(ct?"已契约":"未契约")+"</span> "+
      "<span class='spGrade'>"+e(gradeTag)+"</span></div>";
    /* ② 契约者（仅已契约） */
    if(ct)h+="<div class='spRow'>契约者：<b>"+e(ct.name)+"</b></div>";
    /* ③ 级别：已契约才出现 @实际段（运行时信息） */
    h+="<div class='spRow'>级别：<b>"+e(gradeTag)+"</b> | "+
      e(reqN+reqColor)+
      (ct?"<span class='spAt'>@</span><b>"+e(ct.segN+ct.segColor)+"</b>"+
        "<span class='spDim'>（装配于 "+e(ct.segN)+" 段 · 第 "+(ct.segIdx+1)+" 槽）</span>":"")+
      "</div>";
    /* ④⑤ 数量与类型 / 简介 */
    h+="<div class='spRow'>数量与类型：<b>"+own+"</b> 件 · 战斗增益型 · 神兵</div>";
    h+="<div class='spIntro'>"+e(sp.intro||sp.desc)+"</div>";

    if(simple){
      h+="<div class='spDash'></div>"+
        "<div class='spRow'>被动：「 神兵之力 」至多 +"+pct(sp.powerBonus)+
        " 威力提升 · 神兵 · 爆伤 +"+pct(sp.critDmg)+"</div>"+
        (sp.skill?"<div class='spRow'>神兵技【"+e(sp.skill.name)+"】</div>":"")+
        "<div class='spSrc'>获取途径："+e(sp.source||"魔法大学城 · 巴恩工坊")+"</div></div>";
      return h;
    }

    /* ⑥ 被动 */
    h+="<div class='spDash'></div><div class='spH'>被动：</div>"+
      "<div class='spPassive'><div class='spPName'>「 神兵之力 」</div>"+
      "<div class='spCond'>[ 攻击性技能命中头领级目标时生效 ]：</div>"+
      "<div class='spLi'>a. 使契约者的技能获得<b class='spBuff'>威力提升 · 神兵</b>"+
        "（提升至多 <b class='spNum'>"+pct(sp.powerBonus)+"</b>，"+
        "至少 <b class='spNum'>1%</b>），持续 45 秒；cd：450 秒</div>"+
      "<div class='spLi'>b. 爆伤 +<b class='spNum'>"+pct(sp.critDmg)+"</b>"+
        "（至多 +"+pct(sp.critDmg)+"，至少 +1%；若未写明至少值，默认至少 +1%）</div>";
    if(sp.skill)h+="<div class='spLi'>c. 激活至少 <b class='spNum'>"+
      pct(sp.skill.unlock||.70)+"</b> 的 a 效果时才可激活此词条："+
      "技能命中后自动触发神兵技【"+e(sp.skill.name)+"】</div>";
    h+="</div>";

    /* ⑦ 神兵技 */
    if(sp.skill){
      const k=sp.skill;
      h+="<div class='spH'>神兵技【"+e(k.name)+"】</div>"+
        "<div class='spSkill'>神兵技：<br><b>【"+e(k.name)+"】</b> 威力："+k.power+
        " | cd："+k.cd+"s | 系别："+e(k.element||"普通系")+"</div>"+
        "<div class='spSp'><div class='spK2'>效果：</div>"+
        "<div>命中非头领目标时，该技能基础威力 +"+k.add.normal+"</div>"+
        "<div>命中头领目标时，该技能基础威力 +"+k.add.boss+"</div></div>";
    }

    /* ⑧ 名称解释（完整版） */
    h+="<div class='spDash'></div>"+NAME_EXPLAIN;

    /* ⑨ 获取途径 */
    h+="<div class='spDash'></div><div class='spSrc'>获取途径："+
      e(sp.source||("魔法大学城 · 巴恩工坊 · "+sp.price+" 金币 · 永久限 1"))+"</div>";
    h+="</div>";
    return h;
  }

  CR.spiritStd={tooltipHTML,contract,NAME_EXPLAIN,
    simpleMode:()=>!!(SV.data.settings&&SV.data.settings.simpleTooltip)};
})(window.CR=window.CR||{});
