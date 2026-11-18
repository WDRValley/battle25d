/* ui.js — 全部 DOM 界面 · v1.4 dev1 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save,C=CR.C;
  const $=id=>document.getElementById(id);
  let picked=0,panelOpen=false,curTab="char",selectedMap=null,pendingSlot=null;
  let bannerT=0,toastT=0,hudT=0,fpsT=0,fps=60,frames=0;
  let captureAction=null,groundT=0;
  let dialogue=null,dlgIdx=0;
  let eqViewCls=null,eqSlotTarget=null,tipTimer=null,tipTouchTimer=null;
  let whView="team",tradeMode="sell",hatchMode="nests",questMode="main",
      swampShopNpc="hank",swampShopMode="buy",regionTipTimer=null,regionTouchTimer=null;
  const skillEls=[],slotEls=[],labelPool=[];

  function rgb(c){return `rgb(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)})`;}

  /* ================= 屏幕层（显式 display，鼠标事件不再被透明层吃掉） ================= */
  function showScreen(id){const e=$(id);if(e)e.classList.add("on");}
  function hideScreen(id){const e=$(id);if(e)e.classList.remove("on");}
  /* 1.4 dev1.4：战士 / 射手 / 法师只作职业标签，角色一律用名字（小战 / 小法 / 小射 / 夜樱） */
  function charName(cls){
    const o=SV.data.team.order,i=o.indexOf(cls);
    const n=i>=0?SV.teamName(i):"";
    return (n&&n!=="空位")?n:(CFG.CLASSES[cls]?CFG.CLASSES[cls].defName:"角色");
  }
  function classTag(cls){
    const c=CFG.CLASSES[cls];if(!c)return "";
    const a=CFG.ARCHETYPES&&CFG.ARCHETYPES[c.archetype];
    return (c.mark||"")+((a&&a.name)||c.classLabel||c.name);
  }
  function hideAllScreens(){
    ["menu","over","mapScreen","panel","dialogue","shop","captureMask",
     "equipLib","regionPanel","trade","grow","hatchery",
     "questPanel","swampShop","revive"].forEach(hideScreen);
  }
  function showMenu(){
    document.body.classList.remove("playing");
    hideAllScreens();showScreen("menu");
    $("hud").classList.remove("on");
    $("nameInput").value=SV.data.profile.name;
    buildCards();                 /* 1.4 dev1.4：每次回菜单重绘当前队伍一览 */
    refreshMapLock();refreshVersionDot();
    CR.audio.setScene("menu");
  }
  function showPlay(mode){
    document.body.classList.add("playing");
    hideAllScreens();
    $("hud").classList.add("on");
    $("pname").textContent=SV.data.profile.name;
    const town=mode==="market"||mode==="harbor"||mode==="forest"||mode==="swamp"||mode==="border";
    const harbor=mode==="harbor",forest=mode==="forest",swamp=mode==="swamp",border=mode==="border";
    $("rinfo").classList.toggle("hide",town);
    $("townInfo").classList.toggle("hide",!town);
    const tt=$("townInfo").querySelector(".townTitle");
    if(tt)tt.textContent=harbor?"⚓ 星火港 · 自由港口":
      (forest?"🌲 魔法丛林 · 森林入口":
       (swamp?"🪷 蛮荒沼泽 · ⚠ 危险区域":
        (border?"🌧 雨沼边境走廊 · 推荐 Lv.85+":"🏮 狂欢集市 · 自由城镇")));
    if($("townTip"))$("townTip").textContent=harbor?
      "木甲板 / 沙滩 / 石板 / 草丛 · 按 F 采集 · 按 G 看区域情报":
      (forest?"五段林境：森林入口 → 原始森林 → 林间小道 → 魔林森处 → 森林出口 · 按 F 采集/对话 · 按 G 看情报":
       (swamp?"四段：迷雾芦苇荡 → 红泥食人部落 → 毒瘴泥潭 → 沉没古神庙 · 推荐 Lv.40+ · 薇拉处看任务档案":
        (border?"四段过渡带：雨沼洼地 → 灌木丛林（默认落点）→ 农田&破败村落 → 大学城西郊城门 · 按 F 采集/对话 · 按 G 看情报":
         "草丛 / 沙土 / 石板，脚步声各不相同")));
    $("bossbar").classList.add("hide");
    buildSkills();buildSlots();buildTeamHud();
    setWorldLabels([]);setInteractHint("");
    syncHud(true);refreshWeather();
  }
  function showOver(win,info,firstClear){
    document.body.classList.remove("playing");
    hideAllScreens();showScreen("over");
    $("hud").classList.remove("on");
    $("overTitle").textContent=win?"远 征 胜 利":"英 雄 倒 下";
    $("overTitle").style.color=win?"#ffd784":"#ff8a7a";
    /* 1.4 dev1.4：黄昏城堡不再是副本，结算不再显示「用时」 */
    $("overStats").innerHTML=
      `等级 <b>${info.level||SV.level}</b>　·　击杀 <b>${info.kills}</b>　·　最高连击 <b>${info.combo}</b><br>`+
      `本局金币 <b>+${info.gold}</b>　·　总金币 <b>${SV.data.profile.gold}</b>　·　累计胜场 <b>${SV.data.stats.wins}</b>`;
    $("unlockNote").style.display=firstClear?"block":"none";
    $("unlockNote").innerHTML=firstClear?
      "🎉 黄昏城堡全部关卡已通关！<b>大地图按钮已解锁</b>，新地图【狂欢集市】开放。":  "";
    $("btnOverMap").disabled=!SV.mapUnlocked("market");
  }

  /* ================= 1.4 dev1.4 全员倒下 ================= */
  function showRevive(info){
    document.body.classList.remove("playing");
    hideAllScreens();showScreen("revive");
    $("hud").classList.remove("on");
    $("reviveStats").innerHTML=
      `<div>当前区域：<b>${info.mode==="battle"?"黄昏城堡":info.mode==="market"?"狂欢集市":
        info.mode==="harbor"?"星火港":info.mode==="forest"?"魔法丛林":"蛮荒沼泽"}</b>`+
        (info.zone?" · "+info.zone:"")+`</div>`+
      `<div>出战队伍：${(info.names||[]).join(" / ")||"—"}</div>`+
      `<div>持有金币：<b>${info.gold}</b>　·　复活不消耗金币，可在脱战后用【一键补给】补满（100 金币）</div>`+
      `<div class="dim">倒下的角色不会自动回血；复活后全队保留 25% 生命，建议先脱离仇恨再整备。</div>`;
  }
  /* ================= 主菜单队伍一览（1.4 dev1.4 取消角色挑选） ================= */
  function buildCards(){
    const box=$("teamLineup");if(!box)return;
    const o=SV.data.team.order;
    box.innerHTML=[0,1,2,3].map(i=>{
      const cls=o[i];
      if(cls===null)return `<div class="tl empty"><span>＋</span><b>${i+1} 号位</b><span class="pos">空</span></div>`;
      const c=CFG.CLASSES[cls]||{};
      return `<div class="tl"><span style="color:${rgb(c.color||[.6,.8,1])}">${c.icon||"•"}</span>`+
        `<b>${SV.teamName(i)||c.defName}</b><span class="pos">${i+1} 号位 · ${classTag(cls)}</span></div>`;
    }).join("");
  }
  function pick(i,silent){ /* 兼容旧调用：不再改变队伍，仅反馈 */ }
  function buildSkills(){
    const box=$("skills");box.innerHTML="";skillEls.length=0;
    const cls=CR.ent.player.cls||0;
    const list=SV.equippedSkills?SV.equippedSkills(cls):CFG.CLASSES[cls].skills;
    for(let i=0;i<4;i++){
      const sk=CFG.SKILLS[list[i]]||{icon:"·",name:"空技能",cd:3};
      const kb=SV.data.settings.bindings||{};
      const d=document.createElement("div");d.className="skill";
      d.innerHTML=`<div class="ico">${sk.icon}</div>
        <div class="key">${CFG.KEY_LABELS[kb["s"+(i+1)]]||["U","I","O","L"][i]}</div>`+
        `<div class="nm">${sk.name}</div><div class="cdmask"></div><div class="cdnum"></div>`;
      box.appendChild(d);
      skillEls.push({root:d,key:d.querySelector(".key"),ico:d.querySelector(".ico"),
        nm:d.querySelector(".nm"),mask:d.querySelector(".cdmask"),num:d.querySelector(".cdnum")});
    }
  }
  function buildSlots(){
    const box=$("slots");box.innerHTML="";slotEls.length=0;
    for(let i=0;i<2;i++){
      const d=document.createElement("div");d.className="slot";d.dataset.slot=i;
      d.innerHTML=`<div class="ico">＋</div><div class="key">Z</div><div class="nm">道具槽</div>
        <div class="qty"></div><div class="cdmask"></div><div class="cdnum"></div>`;
      d.addEventListener("click",()=>{
        pendingSlot=i;openPanel("bag");
        toast("点选一个道具放入槽位 "+(i+1)+"（也可直接拖拽）");
      });
      d.addEventListener("contextmenu",e=>{e.preventDefault();SV.clearSlot(i);SV.flush();
        refreshPanels();toast("已清空槽位 "+(i+1));});
      d.addEventListener("dragover",e=>{e.preventDefault();d.classList.add("dragover");});
      d.addEventListener("dragleave",()=>d.classList.remove("dragover"));
      d.addEventListener("drop",e=>{
        e.preventDefault();d.classList.remove("dragover");
        const id=e.dataTransfer.getData("text/plain");
        if(id)putSlot(i,id);
      });
      box.appendChild(d);
      slotEls.push({root:d,ico:d.querySelector(".ico"),key:d.querySelector(".key"),
        nm:d.querySelector(".nm"),qty:d.querySelector(".qty"),
        mask:d.querySelector(".cdmask"),num:d.querySelector(".cdnum")});
    }
  }
  function putSlot(i,id){
    if(SV.setSlot(i,id)){
      SV.flush();CR.audio.sfx("slot");
      toast(CFG.ITEMS[id].name+" 已放入槽位 "+(i+1));
      refreshPanels();pendingSlot=null;
    }else{
      CR.audio.sfx("deny");
      toast("无法放置：背包没有该道具，或另一个槽位已放同种道具");
    }
  }
  function buildTeamHud(){
    const box=$("teamHud");box.innerHTML="";
    for(let i=0;i<4;i++){
      const cls=SV.teamClass(i);
      const d=document.createElement("div");
      d.className="tm"+(cls===null?" empty":"");d.dataset.team=i;
      const c=cls===null?null:CFG.CLASSES[cls];
      d.innerHTML=`<span>${i+1}</span>${c?(c.mark||c.icon):"·"}`+
        `<small>${i===0?"出战":""}${c?" · "+charName(cls):""}</small>`;
      d.addEventListener("click",()=>{if(CR.game.state==="play")CR.team.switchTo(i);});
      box.appendChild(d);
    }
  }

  /* ================= 面板 ================= */
  function openPanel(tab){
    /* 1.4 dev1.4：全员倒下时只允许复活，不打开其它面板 */
    if(CR.game&&CR.game.state==="revive"){
      toast("全员已倒下 · 请先点击【复活】");return;
    }
    panelOpen=true;curTab=tab||"char";
    showScreen("panel");switchTab(curTab);refreshPanels();
    CR.audio.sfx("ui");
  }
  function closePanel(){
    panelOpen=false;pendingSlot=null;
    hideScreen("panel");hideScreen("captureMask");
    if(captureAction){CR.input.cancelCapture();captureAction=null;}
  }
  function togglePanel(){panelOpen?closePanel():openPanel("char");}
  function switchTab(t){
    curTab=t;
    document.querySelectorAll("#panel .ptabs button[data-tab]").forEach(b=>
      b.classList.toggle("on",b.dataset.tab===t));
    ["char","bag","set","ver","help"].forEach(k=>
      $("tab"+k[0].toUpperCase()+k.slice(1)).classList.toggle("on",k===t));
    if(t==="char"){renderChar();renderTeam();}
    if(t==="bag")renderBag();
    if(t==="set"){renderSet();renderBind();renderQual();renderStorage();}
    if(t==="ver"){renderVersion();SV.markVersionSeen();refreshVersionDot();}
  }
  function refreshPanels(){
    if(!panelOpen)return;
    renderBag();renderChar();renderTeam();renderStorage();renderShop();
  }
  /* 1.1.0：装备 / 经验变化后立即刷新（无需打开面板也调用） */
  function refreshAll(){
    refreshPanels();
    if($("equipLib")&&$("equipLib").classList.contains("on"))renderEquipLib();
    syncHud(true);
  }

  /* ---------- 队伍编排 ---------- */
  function renderTeam(){
    const box=$("teamEditor");box.innerHTML="";
    const locked=SV.teamEditLocked();
    const tgl=$("whToggle");
    if(tgl)tgl.textContent=whView==="team"?"切换到：角色仓库":"切换到：出战队列";
    const lk=$("whLockTip");
    if(lk){lk.textContent=locked?"🔒 战斗中禁止调整队伍与仓库，请先解除战斗":
      "非战斗状态可自由编排队伍 / 仓库（未来新角色超出 4 位会自动入库）";
      lk.classList.toggle("locked",locked);}
    box.classList.toggle("hide",whView!=="team");
    for(let i=0;i<4;i++){
      const cls=SV.teamClass(i),active=SV.data.team.active===i;
      const row=document.createElement("div");
      row.className="teamRow"+(active?" active":"")+(cls===null?" empty":"");
      row.innerHTML=`<div class="pos">${i+1}</div>
        <div class="ti">${cls===null?"＋":CFG.CLASSES[cls].icon}</div>
        <div class="tn">${cls===null?'<span class="dim">空位</span>':
          `<input class="teamName" data-team-name="${i}" maxlength="10" value="${escapeHtml(SV.teamName(i))}">`}</div>
        <div class="tc">${cls===null?"未来角色":charName(cls)+" · "+classTag(cls)+" · "+CFG.CLASSES[cls].title}</div>
        ${active?'<span class="badge">出战中</span>':""}
        <button data-move-up="${i}" ${i===0||locked?"disabled":""}>↑</button>
        <button data-move-down="${i}" ${i===3||locked?"disabled":""}>↓</button>
        ${cls!==null?`<button data-to-warehouse="${i}" ${locked?"disabled":""}>入库</button>`:""}`;
      box.appendChild(row);
    }
    box.querySelectorAll("input[data-team-name]").forEach(inp=>{
      inp.disabled=locked;
      inp.addEventListener("change",e=>{
        SV.setTeamName(+e.target.dataset.teamName,e.target.value);SV.flush();
        CR.ent.player.name=SV.teamName(SV.data.team.active);
        renderTeam();syncHud(true);toast("角色名已保存");
      });
      inp.addEventListener("keydown",e=>{if(e.key==="Enter")e.target.blur();});
    });
    box.querySelectorAll("button[data-move-up]").forEach(b=>b.addEventListener("click",()=>{
      const i=+b.dataset.moveUp;SV.swapTeam(i,i-1);SV.flush();
      CR.team.init();buildSkills();buildTeamHud();renderTeam();renderChar();
      CR.audio.sfx("switch");toast("队伍顺序已调整");
    }));
    box.querySelectorAll("button[data-move-down]").forEach(b=>b.addEventListener("click",()=>{
      const i=+b.dataset.moveDown;SV.swapTeam(i,i+1);SV.flush();
      CR.team.init();buildSkills();buildTeamHud();renderTeam();renderChar();
      CR.audio.sfx("switch");toast("队伍顺序已调整");
    }));
    box.querySelectorAll("button[data-to-warehouse]").forEach(b=>b.addEventListener("click",()=>{
      const r=SV.moveToWarehouse(+b.dataset.toWarehouse);
      if(!r.ok){toast(r.reason);CR.audio.sfx("deny");return;}
      SV.flush();CR.team.init();buildSkills();buildTeamHud();renderTeam();renderChar();
      renderWarehouse();syncHud(true);
      CR.audio.sfx("switch");toast(charName(r.cls)+" 已移入角色仓库");
    }));
    renderWarehouse();
  }
  function renderWarehouse(){
    const box=$("warehouseBox");if(!box)return;
    const locked=SV.teamEditLocked(),list=SV.warehouseList();
    box.classList.toggle("hide",whView!=="warehouse");
    if(!list.length){
      box.innerHTML=`<div class="whEmpty">仓库空空如也。<br>
        可以把 2 / 3 / 4 号位队员点「入库」放进来；未来获得第 5 位角色时会自动入库。<br>
        <span class="dim">仓库角色不参与战斗，等级 / 经验 / 装备都会完整保留。</span></div>`;
      return;
    }
    box.innerHTML=list.map((w,i)=>{
      const c=CFG.CLASSES[w.cls];
      return `<div class="whRow ${locked?"locked":""}">
        <div class="wi" style="color:${rgb(c.color)}">${c.icon}</div>
        <div class="wn"><b>${escapeHtml(w.name)}</b> · ${c.name} · ${c.title}
          <small>Lv.${SV.levelOf(w.cls)} · 仓库角色不参战 · 养成数据保留</small></div>
        <button data-out="${i}" data-slot="-1" ${locked?"disabled":""}>出库到空位</button>
        ${[0,1,2,3].map(k=>`<button data-out="${i}" data-slot="${k}" ${locked?"disabled":""}>换入 ${k+1}</button>`).join("")}
      </div>`;
    }).join("");
    box.querySelectorAll("button[data-out]").forEach(b=>b.addEventListener("click",()=>{
      const idx=+b.dataset.out,slot=+b.dataset.slot;
      const r=SV.moveFromWarehouse(idx,slot<0?undefined:slot);
      if(!r.ok){toast(r.reason);CR.audio.sfx("deny");return;}
      SV.flush();CR.team.init();buildSkills();buildTeamHud();renderTeam();renderChar();
      syncHud(true);
      CR.audio.sfx("switch");
      toast(charName(r.cls)+" 已加入出战队列 "+(r.slot+1)+" 号位");
    }));
  }
  function toggleWarehouseView(){
    whView=whView==="team"?"warehouse":"team";
    renderTeam();CR.audio.sfx("ui");
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}

  /* ================= 1.3.0 天赋星图 / 技能配置 / 养成弹窗 ================= */
  let growMode=null,growItemId=null,growChoice=null,growPreview=null;

  function tierBarHTML(score){
    const max=305,pct=U.clamp(score/max,0,1)*100;
    const segs=CFG.TIER_TABLE.map(t=>{
      const h=(t.max-t.min+1)/max*100;
      const on=score>=t.min&&score<=t.max;
      return `<div class="tSeg ${on?"on":""}" style="height:${h}%">
        <span class="tIco">${t.icon}</span><span class="tNm">${t.name}</span></div>`;
    }).reverse().join("");
    return `<div class="tierBarWrap"><div class="tierBar">
      <div class="tierFill" style="height:${pct}%"></div>
      <div class="tierMark" style="bottom:${pct}%"></div></div>
      <div class="tierSegs">${segs}</div></div>`;
  }
  function starHTML(n,cost){
    let h="";
    for(let i=1;i<=CFG.BEAN_MAX_STAR;i++)
      h+=`<span class="star ${i<=n?"filled":"empty"}">★</span>`;
    return h;
  }
  function renderTalent(){
    const box=$("talentBox");if(!box)return;
    const cls=viewCls(),c=CFG.CLASSES[cls];
    const t=SV.talentOf(cls),ch=SV.charData(cls);
    const nat=CFG.NATURES[ch.nature]||{up:null,down:null},ev=ch.ev;
    const tot=Object.keys(ev).reduce((a,k)=>a+(ev[k]||0),0);
    const natTxt=nat.up?`${CFG.STAT_NAMES[nat.up]}↑10% · ${CFG.STAT_NAMES[nat.down]}↓10%`:"平衡（无增减）";
    const rows=CFG.TALENT_KEYS.map((x,i)=>{
      const n=t.stars[i],cost=SV.talentCost(cls,x.k);
      return `<div class="tRow ${n>=5?"max":""}">
        <div class="tName">${x.icon} ${x.name}</div>
        <div class="tStars">${starHTML(n,cost)}</div>
        <div class="tVal"><b class="cur">${n}</b><span class="max">/5</span></div>
        <button data-talent="${x.k}" ${cost<0||t.beans<cost?"disabled":""}>
          ${cost<0?"满星":("+"+cost+" 晶豆")}</button></div>`;
    }).join("");
    const eff=CFG.TALENT_KEYS.map(x=>
      `<span class="evChip">${x.name} ${ev[x.k]||0}/256</span>`).join("");
    box.innerHTML=`<div class="tHead">
      <div class="tRating">
        <div class="tIcon">${t.tier.icon}</div>
        <div><div class="tLabel">${c.icon} ${c.name} · 评级分数</div>
          <div class="tScore">${t.score}</div><div class="tTier">${t.tier.name}</div></div>
      </div>
      <div class="tBeans"><span class="bean"></span> 晶豆 <b>${t.beans}</b></div>
      <button id="tierTableBtn" class="ghostbtn small">📊 评级对照表</button>
    </div>
    <div class="tBody"><div class="tStats">${rows}</div>${tierBarHTML(t.score)}</div>
    <div class="tMeta">性格：<b>${ch.nature}</b> <span class="dim">${natTxt}</span>
      　·　学习力 <b>${tot}/512</b> <span class="evLine">${eff}</span></div>
    <div class="tActions">
      <button id="talentAuto">一键加点</button>
      <button id="talentReset">重置天赋</button>
      <button id="talentRandom">💠 快速重组 <span class="dim">×${SV.data.inventory.items.rewashPill||0}</span></button>
      <button id="talentRewash">💠 洗髓丹 <span class="dim">×${SV.data.inventory.items.rewashPill||0}</span></button>
      <button id="talentPersona">🃏 改性格 <span class="dim">×${SV.data.inventory.items.personaCard||0}</span></button>
      <button id="talentEffort">📘 学习力 <span class="dim">×${SV.data.inventory.items.effortFruit||0}</span></button>
    </div>`;
    box.querySelectorAll("[data-talent]").forEach(b=>b.addEventListener("click",()=>{
      const r=SV.upgradeTalent(cls,b.dataset.talent);
      if(!r.ok){CR.audio.sfx("deny");toast(r.reason);return;}
      CR.audio.sfx("star");toast("资质提升 · 评级 "+r.score);
      if(CR.team&&CR.team.applyStats)CR.team.applyStats();
      renderTalent();renderChar();
    }));
    const bind=(id,fn)=>{const b=$(id);if(b)b.addEventListener("click",fn);};
    bind("tierTableBtn",()=>openGrow("tier"));
    bind("talentAuto",()=>{
      const r=SV.autoAllocateTalent(cls);
      CR.audio.sfx(r.ok?"levelup":"deny");
      toast(r.ok?("一键加点完成 · 提升 "+r.n+" 级"):"晶豆不足或已满星");
      if(CR.team&&CR.team.applyStats)CR.team.applyStats();
      renderTalent();renderChar();
    });
    bind("talentReset",()=>{
      const r=SV.resetTalent(cls);
      CR.audio.sfx("ui");toast("天赋已重置 · 返还 "+r.refund+" 晶豆");
      renderTalent();renderChar();
    });
    /* 1.3.1：不再提供免费重抽。快速重组消耗 1 枚洗髓丹并立刻生效；
       想先看结果再决定，用旁边的【洗髓丹】预览面板。 */
    bind("talentRandom",()=>{
      const r=SV.rollTalent(cls);
      if(!r.ok){CR.audio.sfx("deny");toast(r.reason);return;}
      CR.audio.sfx("star");
      toast("资质重组完成 · 消耗 1 枚洗髓丹 · 评级 "+r.tier.icon+r.tier.name);
      if(CR.team&&CR.team.applyStats)CR.team.applyStats();
      renderTalent();renderChar();refreshAll();
    });
    bind("talentRewash",()=>{
      if((SV.data.inventory.items.rewashPill||0)<=0){CR.audio.sfx("deny");toast("没有洗髓丹 · 星火港黑市 / 林间货郎有售");return;}
      openGrow("rewash","rewashPill");
    });
    bind("talentPersona",()=>{
      if((SV.data.inventory.items.personaCard||0)<=0){CR.audio.sfx("deny");toast("没有性格重塑卡片");return;}
      openGrow("persona","personaCard");
    });
    bind("talentEffort",()=>{
      if((SV.data.inventory.items.effortFruit||0)<=0){CR.audio.sfx("deny");toast("没有学习力果实");return;}
      openGrow("effort","effortFruit");
    });
  }

  function skillReqText(sk,cls){
    const parts=[];
    if(sk.learnLv)parts.push("Lv."+sk.learnLv+" 习得");
    if(sk.weapon===null)parts.push("不依赖武器");
    else if(sk.weapon==="any")parts.push("任意武器 / 徒手");
    else parts.push("需 "+sk.weapon+" 类武器");
    const r=sk.requires;
    if(r){
      if(r.classes)parts.push("限 "+r.classes.map(i=>CFG.CLASSES[i].name).join("/"));
      if(r.elements)parts.push("限 "+r.elements.join("/"));
      if(r.weapons)parts.push("需 "+r.weapons.join("/"));
    }
    return parts.join(" · ");
  }
  function renderSkillCfg(){
    const box=$("skillCfg");if(!box)return;
    const cls=viewCls(),c=CFG.CLASSES[cls];
    const eq=SV.equippedSkills(cls);
    const slots=eq.map((id,i)=>{
      const sk=CFG.SKILLS[id];
      const allow=sk?CR.equip.skillAllowed(cls,id):null;
      return `<div class="skSlot ${sk?"filled":""} ${sk&&!allow.ok?"blocked":""}"
        data-skill-slot="${i}">
        <div class="skKey">${["Q","E","R","T"][i]}</div>
        <div class="skIco">${sk?sk.icon:"＋"}</div>
        <div class="skNm">${sk?sk.name:"空技能槽"}</div>
        ${sk?`<div class="skInfo">${sk.element} · 威力 ${sk.power} · CD ${sk.cd}s</div>`:
          `<div class="skInfo">点击下方技能装备</div>`}
        ${sk&&!allow.ok?`<div class="skWarn">⚠ ${escapeHtml(allow.reason)}</div>`:""}
        ${sk?'<div class="skX">✕ 卸下</div>':""}</div>`;
    }).join("");
    const lv=SV.levelOf?SV.levelOf(cls):1;
    const pool=c.skillPool.map(id=>{
      const sk=CFG.SKILLS[id];if(!sk)return "";
      const used=eq.indexOf(id)>=0,allow=CR.equip.skillAllowed(cls,id);
      const locked=!!(sk.learnLv&&lv<sk.learnLv);
      return `<div class="skPoolItem ${used?"used":""} ${(allow.ok&&!locked)?"":"disabled"}"
        data-skill="${id}">
        <b>${sk.icon} ${sk.name}${sk.learnLv?` <i style="font-size:11px;color:#ffd784">Lv.${sk.learnLv}</i>`:""}</b>
        <span class="q">${sk.school||sk.element} · 威力 ${sk.power} · CD ${sk.cd}s</span>
        <span class="r">${escapeHtml(skillReqText(sk,cls))}${used?" · 已装备":""}</span>
        <span class="d">${escapeHtml(sk.desc)}</span>
        ${locked?`<span class="bad">🔒 需要 Lv.${sk.learnLv}（当前 Lv.${lv}）</span>`:""}
        ${(!locked&&!allow.ok)?`<span class="bad">⚠ ${escapeHtml(allow.reason)}</span>`:""}</div>`;
    }).join("");
    box.innerHTML=`<div class="skCfgTop">${c.mark||c.icon} ${charName(cls)} · ${classTag(cls)}（${c.element}） · 私有技能池 ${c.skillPool.length} 个模板 · 当前 Lv.${lv}
      <span class="dim">· 夜樱技能按等级 1~60 逐级解锁；通用技能【突刺】人人可学；职业/系别/武器限定技能按前置校验</span></div>
      <div class="skSlots">${slots}</div>
      <div class="dim" style="margin:8px 0 4px">点击技能装备到第一个空槽（也可先卸下再换）</div>
      <div class="skPool">${pool}</div>`;
    box.querySelectorAll("[data-skill-slot]").forEach(el=>el.addEventListener("click",()=>{
      const i=+el.dataset.skillSlot;
      if(eq[i]===null){toast("这个槽位已经是空的");return;}
      SV.setSkill(cls,i,null);CR.audio.sfx("unequip");
      renderSkillCfg();renderChar();
    }));
    box.querySelectorAll("[data-skill]").forEach(el=>el.addEventListener("click",()=>{
      const id=el.dataset.skill;
      const sk0=CFG.SKILLS[id];
      if(sk0&&sk0.learnLv&&SV.levelOf&&SV.levelOf(cls)<sk0.learnLv){
        toast("【"+sk0.name+"】需要 Lv."+sk0.learnLv);CR.audio.sfx("deny");return;
      }
      if(eq.indexOf(id)>=0){toast("该技能已在装备栏里");return;}
      const allow=CR.equip.skillAllowed(cls,id);
      if(!allow.ok){CR.audio.sfx("deny");toast(allow.reason);return;}
      let slot=eq.indexOf(null);
      if(slot<0){toast("4 个槽位都满了 · 先点上方槽位卸下一个");CR.audio.sfx("deny");return;}
      const r=SV.setSkill(cls,slot,id);
      if(!r.ok){toast(r.reason);return;}
      CR.audio.sfx("equip");toast("已装备【"+CFG.SKILLS[id].name+"】到槽位 "+(slot+1));
      renderSkillCfg();renderChar();
    }));
  }

  /* ---------- 养成弹窗：洗髓 / 性格 / 学习力 / 评级表 ---------- */
  function openGrow(mode,itemId){
    growMode=mode;growItemId=itemId||null;growChoice=null;growPreview=null;
    if(mode==="rewash")growPreview=SV.randomTalentStars();
    showScreen("grow");renderGrow();CR.audio.sfx("ui");
  }
  function closeGrow(){
    hideScreen("grow");growMode=null;growItemId=null;growChoice=null;growPreview=null;
  }
  function openTalent(mode,itemId){openGrow(mode,itemId);}
  function starsRow(stars){
    return `<div class="gStars">`+CFG.TALENT_KEYS.map((x,i)=>
      `<div class="gStar"><span>${x.icon}${x.name}</span>
       <b>${"★".repeat(stars[i])}${"☆".repeat(5-stars[i])}</b></div>`).join("")+`</div>`;
  }
  function renderGrow(){
    if(!$("grow").classList.contains("on"))return;
    const body=$("growBody"),cls=viewCls(),c=CFG.CLASSES[cls],e=escapeHtml;
    const titles={rewash:"💠 洗髓丹 · 洗练资质",persona:"🃏 性格重塑卡片",
      effort:"📘 学习力果实",tier:"📊 评级分数对照表"};
    $("growTitle").textContent=titles[growMode]||"天赋星图";
    const head=`<div class="growChar">${c.icon} ${c.name}　<span class="dim">${c.element} · ${c.title}</span></div>`;
    let html=head;
    if(growMode==="tier"){
      html+=`<p class="dim">评级分数 = 6 项资质星级之和 × 10 + 学习力折算。天赋 demo 的 5 档称号与权重如下：</p>
        <table class="tierTable"><thead><tr><th>分数区间</th><th>称号</th><th>图标</th><th>随机权重</th></tr></thead><tbody>`+
        CFG.TIER_TABLE.map(t=>`<tr class="${SV.talentOf(cls).tier.name===t.name?"hl":""}">
          <td>${t.min} ~ ${t.max}</td><td>${t.name}</td><td>${t.icon}</td><td>${t.weight}%</td></tr>`).join("")+
        `</tbody></table><button class="growClose2">关闭</button>`;
    }else if(growMode==="rewash"){
      const old=SV.talentOf(cls);
      const nw=growPreview||SV.randomTalentStars();
      const ns=nw.reduce((a,b)=>a+b,0)*10;
      const nt=CFG.TIER_TABLE.filter(t=>ns>=t.min&&ns<=t.max)[0]||CFG.TIER_TABLE[0];
      html+=`<p class="dim">洗练会重新随机 6 项天生资质，按评级档概率分布（极品稀有）。每次进入只生成一次结果：确认消耗 1 枚【洗髓丹】并生效，取消不消耗也不改动。</p>
        <div class="gCompare"><div><h4>当前</h4>${starsRow(old.stars)}
          <div class="gScore">${old.score} · ${old.tier.icon} ${old.tier.name}</div></div>
          <div class="gArrow">→</div>
          <div><h4>预览</h4>${starsRow(nw)}
          <div class="gScore new">${ns} · ${nt.icon} ${nt.name}</div></div></div>
        <div class="growBtns"><button id="growApply" class="primary">确认洗练（消耗 1 洗髓丹）</button>
          <button id="growCancel">取消</button></div>`;
    }else if(growMode==="persona"){
      const cur=SV.charData(cls).nature;
      html+=`<p class="dim">选择新性格：提升一项属性 10%，同时降低一项 10%。确认后消耗 1 张【性格重塑卡片】。</p>
        <div class="natGrid">`+CFG.NATURE_KEYS.map(n=>{
          const v=CFG.NATURES[n];
          const d=v.up?`${CFG.STAT_NAMES[v.up]}↑ ${CFG.STAT_NAMES[v.down]}↓`:"平衡";
          return `<div class="natOpt ${growChoice===n?"sel":""} ${cur===n?"cur":""}" data-nat="${n}">
            <b>${n}</b><span>${d}</span></div>`;
        }).join("")+`</div>
        <div class="growBtns"><button id="growApply" class="primary" ${growChoice?"":"disabled"}>确认修改（消耗 1 张）</button>
          <button id="growCancel">取消</button></div>`;
    }else if(growMode==="effort"){
      const ev=SV.charData(cls).ev;
      html+=`<p class="dim">选择一项学习力 +32（单项上限 256，总和上限 512；4 点学习力 = 1 点属性，体力 1:1）。确认后消耗 1 个【学习力果实】。</p>
        <div class="effGrid">`+CFG.TALENT_KEYS.map(x=>
          `<div class="effOpt ${growChoice===x.k?"sel":""}" data-eff="${x.k}">
            <b>${x.icon} ${x.name}</b>
            <div class="effBar"><i style="width:${(ev[x.k]||0)/256*100}%"></i></div>
            <span>${ev[x.k]||0} / 256</span></div>`).join("")+`</div>
        <div class="growBtns"><button id="growApply" class="primary" ${growChoice?"":"disabled"}>确认使用（消耗 1 个）</button>
          <button id="growCancel">取消</button></div>`;
    }
    body.innerHTML=html;
    const close=()=>{closeGrow();};
    body.querySelectorAll("#growCancel,.growClose2,#growCancel").forEach(b=>b.addEventListener("click",close));
    const q=sel=>body.querySelector(sel);
    body.querySelectorAll("[data-nat]").forEach(el=>el.addEventListener("click",()=>{
      growChoice=el.dataset.nat;CR.audio.sfx("ui");renderGrow();}));
    body.querySelectorAll("[data-eff]").forEach(el=>el.addEventListener("click",()=>{
      growChoice=el.dataset.eff;CR.audio.sfx("ui");renderGrow();}));
    if(q("#growApply"))q("#growApply").addEventListener("click",()=>{
      const item=growItemId;
      if(item&&(SV.data.inventory.items[item]||0)<=0){CR.audio.sfx("deny");toast("道具不足");return;}
      let r={ok:false,reason:""};
      if(growMode==="rewash")r=SV.applyTalentStars(cls,growPreview||SV.randomTalentStars());
      else if(growMode==="persona")r=SV.setNature(cls,growChoice);
      else if(growMode==="effort")r=SV.addEffort(cls,growChoice,32);
      if(!r.ok){CR.audio.sfx("deny");toast(r.reason||"操作失败");return;}
      if(item)SV.consumeItem(item);
      CR.audio.sfx("levelup");CR.audio.sfx("star");
      toast(growMode==="rewash"?"资质洗练完成":
        (growMode==="persona"?("性格改为 "+growChoice):"学习力提升完成"));
      if(CR.team&&CR.team.applyStats)CR.team.applyStats();
      closeGrow();renderChar();renderTalent();refreshAll();
    });
  }

  /* ---------- 角色 ---------- */
  function renderChar(){
    const d=SV.data,P=CR.ent.player,cls=P.cls||0,c=CFG.CLASSES[cls],st=SV.effStats(cls);
    $("charAvatar").textContent=c.mark||c.icon;$("charAvatar").style.color=rgb(c.color);
    if(document.activeElement!==$("charName"))$("charName").value=d.profile.name;
    const cl=SV.charLevel(P.cls||0);
    $("charLv").textContent="Lv."+cl.level+(cl.level>=CFG.MAX_LEVEL?" · MAX":"");
    $("curCharName").textContent="当前出战："+(P.name||charName(cls))+" · "+classTag(cls);
    $("charMeta").innerHTML=`${charName(cls)} · ${classTag(cls)} · ${c.title}　|　等级 ${cl.level} / ${CFG.MAX_LEVEL}　|　`+
      `经验 ${cl.exp} / ${SV.expNeed(P.cls)}　|　总胜场 ${d.stats.wins} / ${d.stats.runs} 局`;
    const rows=[["最大生命",st.hp,""],["物攻",st.atk,""],["法攻",st.matk,""],
      ["物防",st.pdef,""],["法防",st.mdef,""],["移动速度",st.spd.toFixed(2),""],
      ["暴击率",(st.crit*100).toFixed(1),"%"],["命中 / 闪避",
        (st.hit*100).toFixed(0)+"% / "+(st.dodge*100).toFixed(0)+"%",""],
      ["射程",st.range,"px"],["系别",c.element,""],
      ["职业",classTag(cls),""]];
    $("charStats").innerHTML=rows.map(r=>
      `<div class="statCard"><div class="k">${r[0]}</div><div class="v">${r[1]}<small> ${r[2]}</small></div></div>`).join("");
    $("charUpgrades").innerHTML=CFG.UPGRADES.map(u=>{
      const lv=d.profile.upgrades[u.id]||0,cost=SV.upgradeCost(u.id),ok=SV.canUpgrade(u.id);
      return `<div class="upRow"><div class="un">${u.name} <span class="dim">Lv.${lv}</span></div>
        <div class="ud">${u.desc}</div><div class="uc">`+
        cost.map(x=>`${CFG.MATERIALS[x.m].name}×${x.n}`).join(" + ")+
        `</div><button data-up="${u.id}" ${ok?"":"disabled"}>强化</button></div>`;
    }).join("");
    $("charUpgrades").querySelectorAll("button[data-up]").forEach(b=>{
      b.addEventListener("click",()=>{
        if(SV.doUpgrade(b.dataset.up)){
          CR.audio.sfx("levelup");toast("强化成功！");
          if(CR.team&&CR.team.applyStats)CR.team.applyStats();
          renderChar();renderBag();SV.flush();
        }else{CR.audio.sfx("error");toast("材料不足");}
      });
    });
    const col=d.stats.collected;
    $("charCollect").innerHTML=`<div class="collect">`+
      Object.keys(CFG.MATERIALS).map(k=>
        `<div>${CFG.MATERIALS[k].icon} ${CFG.MATERIALS[k].name} <b>${col[k]||0}</b></div>`).join("")+
      `</div><div class="dim" style="margin-top:9px;line-height:1.9">
      累计击杀 ${d.stats.kills} · 最高连击 ${d.stats.bestCombo} · 累计金币 ${d.stats.totalGold}<br>
      总游玩时长 ${(d.stats.playTime/60).toFixed(1)} 分钟 · 集市到访 ${d.progress.marketVisits} 次</div>`;
    renderEquip();renderExpPool();renderTalent();renderSkillCfg();renderBattleBox();
  }
  /* 1.4 dev1：6 维本体 / 8 维战斗等级 / 通用判定率 / 种族特殊属性 / 三类护盾 */
  function renderBattleBox(){
    const box=$("battleBox");if(!box||!CR.battlecore)return;
    const BC=CR.battlecore,cls=CR.ent.player.cls||0,side=BC.playerSide();
    const war=BC.warStats(side),rates=BC.ratesOf(side),race=BC.raceOf(side);
    const L=side.levels||{};
    const lvRow=BC.LEVEL_KEYS.map(k=>{
      const v=L[k]||0;
      return `<div class="bcCell ${v>0?"up":(v<0?"down":"")}"><b>${BC.LEVEL_NAMES[k]}</b>
        <span>${v>0?"+":""}${v} 级 · ×${BC.M(v).toFixed(2)}</span></div>`;
    }).join("");
    const coreRow=[["物攻",war.atk],["法攻",war.matk],["物防",war.pdef],["法防",war.mdef],
      ["生命",war.hp],["速度",war.spd]].map(x=>
      `<div class="bcCell"><b>${x[0]}</b><span>${(+x[1]).toFixed(1)}</span></div>`).join("");
    const rateRow=[["命中率",rates.hit*BC.M(L.hit)],["闪避率",rates.dodge*BC.M(L.dodge)],
      ["暴击率",rates.crit*BC.M(L.crit)],["暴击伤害",race.critDmg],["精准",race.precise]]
      .map(x=>`<div class="bcCell"><b>${x[0]}</b><span>${(+x[1]*100).toFixed(1)}%</span></div>`).join("");
    const raceRow=[["一般抗性",race.res],["真抗",race.trueRes],["克制抵抗",race.typeResist],
      ["微弱抵抗",race.weakResist],["穿透",race.pierce],["穿透抵抗",race.pierceResist],
      ["爆伤抵抗",race.critDmgResist],["每秒回血",race.regenHp]]
      .map(x=>`<div class="bcCell"><b>${x[0]}</b><span>${x[0].indexOf("回血")>=0?x[1]:(+x[1]*100).toFixed(0)+"%"}</span></div>`).join("");
    const sh=BC.shieldsOf(CR.ent.player);
    const shRow=["normal","magic","true"].map(k=>{
      const c=BC.SHIELDS[k];
      return `<span class="bcSh" style="color:rgb(${c.color.map(v=>Math.round(v*255)).join(",")})">
        ${c.icon} ${c.name} <b>${Math.ceil(sh[k]||0)}</b></span>`;
    }).join("");
    box.innerHTML=`
      <div class="bcSec"><div class="bcH">基础 6 维（养成本体 · 角色面板）</div>
        <div class="bcGrid">${coreRow}</div></div>
      <div class="bcSec"><div class="bcH">战斗 8 维（临时等级 · M(L)=1+0.1L，±6 封顶，每 10 秒向 0 回落）</div>
        <div class="bcGrid">${lvRow}</div>
        <div class="bcNote">生命不列 8 维，不按 ±10% 等级修正；速度与行动值 10000/最终速度 挂钩。</div></div>
      <div class="bcSec"><div class="bcH">通用判定率 / 倍率</div><div class="bcGrid">${rateRow}</div></div>
      <div class="bcSec"><div class="bcH">种族特殊属性（不按 ±6 等级修正）</div>
        <div class="bcGrid">${raceRow}</div></div>
      <div class="bcSec"><div class="bcH">三类护盾</div><div class="bcShRow">${shRow}</div>
        <div class="bcNote">普通护盾吸物/法；法术护盾只吸法；真实护盾吸一切含固伤。固伤只走真抗，不吃防御 / 一般抗性 / 暴击 / 克制。</div></div>`;
  }
  /* ---------- 背包 ---------- */
  function renderBag(){
    const d=SV.data;
    $("bagGold").textContent=d.profile.gold;
    let count=0;
    for(const k in d.inventory.mats)count+=d.inventory.mats[k];
    for(const k in d.inventory.items)count+=d.inventory.items[k];
    for(const k in d.inventory.equips)count+=d.inventory.equips[k];
    $("bagCount").textContent="物品总数 "+count+" 件 · 悬浮 / 长按看详情 · 自动保存到本地";
    /* 1.4 dev1.4：一键补给只在脱战且金币够时可用 */
    const sb=$("btnSupply");
    if(sb){
      const fighting=CR.game&&CR.game.inCombat&&CR.game.inCombat();
      sb.disabled=!!fighting||d.profile.gold<100;
      sb.title=fighting?"战斗中无法补给 · 先脱离仇恨":
        (d.profile.gold<100?"金币不足（需要 100）":"消耗 100 金币，恢复全队生命与法力");
    }
    // 槽位编辑
    $("bagSlots").innerHTML=`<div class="slotEditor">`+[0,1].map(i=>{
      const id=d.slots[i],it=id?CFG.ITEMS[id]:null;
      const key=CFG.KEY_LABELS[d.settings.bindings["use"+(i+1)]]||"?";
      return `<div class="se ${pendingSlot===i?"dragover":""}" data-slot="${i}">
        <div class="si" style="color:${it?rgb(it.color):"#8fa0bd"}">${it?it.icon:"＋"}</div>
        <div class="sl"><b>槽位 ${i+1} · ${key} 键</b><br><span class="dim">${it?
          it.name+" · CD "+it.cd+"s · 余 "+(d.inventory.items[id]||0):"拖入道具或点选（经验果不可入槽）"}</span></div>
        ${it?'<button data-clear-slot="'+i+'" class="ghostbtn small">清空</button>':""}</div>`;
    }).join("")+`</div>`;
    $("bagSlots").querySelectorAll(".se").forEach(se=>{
      const i=+se.dataset.slot;
      se.addEventListener("click",e=>{
        if(e.target.dataset.clearSlot!==undefined){
          SV.clearSlot(+e.target.dataset.clearSlot);SV.flush();refreshPanels();return;
        }
        pendingSlot=i;renderBag();toast("点选下方道具放入槽位 "+(i+1));
      });
      se.addEventListener("dragover",e=>{e.preventDefault();se.classList.add("dragover");});
      se.addEventListener("dragleave",()=>se.classList.remove("dragover"));
      se.addEventListener("drop",e=>{
        e.preventDefault();se.classList.remove("dragover");
        const id=e.dataTransfer.getData("text/plain");if(id)putSlot(i,id);
      });
    });
    $("bagMats").innerHTML=Object.keys(CFG.MATERIALS).map(k=>{
      const m=CFG.MATERIALS[k],n=d.inventory.mats[k]||0;
      return `<div class="cell ${n?"":"empty"} tipTarget" data-tip-kind="mat" data-tip-id="${k}">
        <div class="ci" style="color:${rgb(m.color)}">${m.icon}</div>
        <div class="cn">${m.name}</div><div class="cq">${n}</div><div class="cd">${m.desc}</div></div>`;
    }).join("");
    $("bagItems").innerHTML=Object.keys(CFG.ITEMS).map(k=>{
      const it=CFG.ITEMS[k],n=d.inventory.items[k]||0;
      return `<div class="cell ${n?"":"empty"} tipTarget" ${n&&!it.noSlot?'draggable="true"':""}
        data-tip-kind="item" data-tip-id="${k}" data-item="${k}">
        <div class="ci" style="color:${rgb(it.color)}">${it.icon}</div>
        <div class="cn">${it.name}</div><div class="cq">${n}</div><div class="cd">${it.desc}</div></div>`;
    }).join("");
    $("bagItems").querySelectorAll(".cell[data-item]:not(.empty)").forEach(el=>{
      el.addEventListener("dragstart",e=>{
        e.dataTransfer.setData("text/plain",el.dataset.item);
        e.dataTransfer.effectAllowed="copy";
      });
      el.addEventListener("click",()=>{
        const id=el.dataset.item,it=CFG.ITEMS[id];
        if(pendingSlot!==null){
          if(it.noSlot){toast(it.name+" 是养成道具，不能放入战斗槽位");CR.audio.sfx("deny");return;}
          putSlot(pendingSlot,id);
        }else CR.combat.useItem(id);
      });
    });
    const own=CR.equip?CR.equip.ownedList():[];
    $("bagEquips").innerHTML=own.length?own.map(o=>{
      const it=o.it,q=CFG.QUALITY_NAME[it.q]||"普通";
      return `<div class="cell tipTarget" data-tip-kind="equip" data-tip-id="${o.id}">
        <div class="ci q-${it.q}">${it.icon}</div>
        <div class="cn q-${it.q}">${it.name}</div><div class="cq">${o.n}</div>
        <div class="cd">${q} · ${CR.equip.slotName(it.slot)} · ${it.desc}</div></div>`;
    }).join(""):`<div class="dim" style="grid-column:1/-1;padding:12px">还没有装备。去【狂欢集市 → 阿福摊位】购买，或击败精英 / 小统领 / 黑石城主获得。</div>`;
    bindItemTips($("tabBag"));
  }
  /* ---------- 设置 ---------- */
  function renderSet(){
    const s=SV.data.settings;
    $("setSfx").checked=s.sfx;$("setMusic").checked=s.music;
    $("setMusicVol").value=Math.round(s.musicVol*100);
    $("setSfxVol").value=Math.round(s.sfxVol*100);
    $("musicVolOut").textContent=Math.round(s.musicVol*100)+"%";
    $("sfxVolOut").textContent=Math.round(s.sfxVol*100)+"%";
    const names={menu:"主菜单",field:"翠风原野",battle:"赤霞隘口",boss:"黑石城堡",
      market:"狂欢集市·白昼",marketNight:"狂欢集市·夜间",victory:"胜利",defeat:"败北"};
    $("musicScene").textContent=names[CR.audio.scene]||CR.audio.scene;
    $("audioState").textContent="音频状态："+(CR.audio.ready?CR.audio.ctxState:"待用户交互后启动");
    $("setClock").value=s.clockSource||"beijing";
    $("setWeather").value=s.weatherMode||"auto";
    $("setNetClock").checked=!!s.networkClock;
    if($("clockState"))$("clockState").textContent=CR.market?
      ("当前 "+CR.market.hour+":00 · "+CR.market.clockSrc+" · "+(CR.market.isNight?"夜间":"白昼")):"";
    if($("weatherState"))$("weatherState").textContent=CR.market?
      ("当前 "+CR.market.wcfg.icon+CR.market.wcfg.name):"";
    const dv=CR.device||{mobile:false,label:"检测中"};
    if($("deviceTag"))$("deviceTag").textContent=dv.mobile?"移动端":"桌面端";
    if($("deviceHint"))$("deviceHint").textContent=dv.label+
      " · 镜头 "+(CR.world.baseZoom||1).toFixed(3)+"× · 暂停时停止渲染";
  }
  function renderQual(){
    $("qualRow").innerHTML=Object.keys(CFG.QUALITY).map(k=>{
      const q=CFG.QUALITY[k];
      return `<button class="qual ${CR.gl.quality===k?"on":""}" data-q="${k}"><b>${q.name}</b><span>${q.label}</span></button>`;
    }).join("");
    $("qualRow").querySelectorAll("button[data-q]").forEach(b=>
      b.addEventListener("click",()=>setQuality(b.dataset.q)));
  }
  function setQuality(q){
    SV.setSetting("quality",q);SV.flush();
    CR.gl.setQuality(q);CR.game.resize();
    renderQual();toast("画质已切换为「"+CFG.QUALITY[q].name+"」");CR.audio.sfx("ui");
  }
  function renderBind(){
    const kb=SV.data.settings.bindings,L=CFG.KEY_LABELS;
    let html="",last="";
    CFG.ACTIONS.forEach(a=>{
      const g=a.group||"其他";
      if(g!==last){html+=`<div class="bindGroup">${g}</div>`;last=g;}
      html+=`<div class="bindRow"><div class="bn">${a.name}</div>
        <div class="bk">${L[kb[a.id]]||kb[a.id]}</div>
        <button data-bind="${a.id}">修改</button></div>`;
    });
    html+=`<div class="bindGroup">固定键（不可修改）</div>`;
    CFG.FIXED_KEYS.forEach(f=>{
      html+=`<div class="bindRow"><div class="bn">${f.name}</div>
        <div class="bk">${L[f.code]||f.code}</div><button disabled>固定</button></div>`;
    });
    $("bindList").innerHTML=html;
    $("bindList").querySelectorAll("button[data-bind]").forEach(b=>
      b.addEventListener("click",()=>startCapture(b.dataset.bind)));
  }
  function startCapture(action){
    const a=CFG.ACTIONS.find(x=>x.id===action);
    captureAction=action;$("capAction").textContent=a?a.name:action;
    showScreen("captureMask");
    CR.input.setCapture(action,code=>{
      hideScreen("captureMask");captureAction=null;
      if(!code){renderBind();return;}
      SV.setBinding(action,code);SV.flush();
      CR.input.setBindings(SV.data.settings.bindings);
      renderBind();buildSkills();buildSlots();buildTeamHud();
      toast("已把 "+a.name+" 改为 "+(CFG.KEY_LABELS[code]||code));
      CR.audio.sfx("uiBig");
    });
  }
  function renderStorage(){
    const u=SV.usage(),kb=(u.used/1024).toFixed(1),pct=Math.min(100,u.ratio*100).toFixed(2);
    $("storageInfo").innerHTML=
      `<div class="dim">已用 <b style="color:var(--gold)">${kb} KB</b> / 5 MB（${pct}%）`+
      `　·　${u.available?"localStorage 可用":"存储不可用"}　·　键： castleRaid.save.v1（自动迁移 beta 存档）</div>
       <div class="storageBar"><i style="width:${Math.max(1,pct)}%"></i></div>
       <div class="dim">设置、队伍、键位、等级、强化、背包、地图进度与战绩都会自动写入；超过 90% 预算自动裁剪历史。</div>`;
  }
  /* ---------- 版本预告 ---------- */
  function renderVersion(){
    const cur=CFG.VERSIONS.find(v=>v.ver===CFG.VERSION)||CFG.VERSIONS[1];
    $("versionHead").innerHTML=`<div class="verHead"><div class="vn">v${CFG.VERSION}</div>
      <div class="vt"><b>${cur.codename} · ${cur.type}</b><br>${cur.summary}<br>
      <span class="dim">发布日期 ${cur.date} · 上一版本 ${CFG.PRERELEASE}</span></div></div>`;
    const plan=CFG.VERSIONS.find(v=>v.status==="planned");
    const announce=CFG.VERSIONS.find(v=>v.status==="preview")||cur;
    /* 1.4 dev1.1 修复：预览区原本只有下一版计划卡，当前预览版的更新公告看不到。
       这里置顶渲染「当前预览版 · 更新公告」，再接下一版预告。 */
    $("versionPreview").innerHTML=
      '<div class="verNoticeTitle">📢 当前预览版 · 更新公告</div>'+
      verCard(announce,false,"current")+
      (plan?'<div class="verNoticeTitle next">🔭 下一版计划</div>'+verCard(plan,true):"");
    $("versionList").innerHTML=CFG.VERSIONS.filter(v=>v.status==="released")
      .map(v=>verCard(v,false)).join("");
  }
  function verCard(v,plan,tag){
    const sec=(cls,label,arr)=>arr&&arr.length?
      `<div class="vsec ${cls}"><b>${label}</b><ul>${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`:"";
    return `<div class="verCard ${plan?"plan":(tag==="current"?"cur":"")}">
      <div class="verTop"><span class="vv">v${v.ver}</span>
        <span class="vd">${v.codename} · ${v.date}</span>
        <span class="vs">${plan?"版本预告":(tag==="current"?"当前预览版 · 更新公告":(v.status==="preview"?"当前预览版":"已发布"))}</span></div>
      <div class="verBody"><div class="vsum">${escapeHtml(v.summary)}</div>
        ${sec("a","✚ 新增内容",v.added)}${sec("f","✖ 修复 Bug",v.fixed)}
        ${sec("o","⚡ 优化改进",v.optimized)}${sec("c","◇ 变更调整",v.changed)}</div></div>`;
  }
  function refreshVersionDot(){
    const d=$("versionDot");if(d)d.style.display=SV.hasUnreadVersion()?"inline-block":"none";
  }

  /* ================= 大地图 ================= */
  function openMap(){
    hideAllScreens();showScreen("mapScreen");
    selectedMap=null;refreshMapLock();
    $("mapEnter").disabled=true;$("mapEnter").textContent="请选择目的地";
    $("mapDetail").textContent="点击地图节点查看简介并进入 · 开放大世界，六张地图可自由往返（⚠ 蛮荒沼泽 / 雨沼边境走廊为危险区）";
    CR.audio.sfx("portal");
  }
  function refreshMapLock(){
    const m=SV.mapUnlocked("market"),h=SV.mapUnlocked("harbor"),
          f=SV.mapUnlocked("forest"),sw=SV.mapUnlocked("swamp"),bd=SV.mapUnlocked("border");
    $("nodeMarket").classList.toggle("locked",!m);
    $("marketLockTip").style.display=m?"none":"block";
    $("nodeHarbor").classList.toggle("locked",!h);
    $("harborLockTip").style.display=h?"none":"block";
    $("nodeForest").classList.toggle("locked",!f);
    $("forestLockTip").style.display=f?"none":"block";
    if($("nodeSwamp"))$("nodeSwamp").classList.toggle("locked",!sw);
    if($("swampLockTip"))$("swampLockTip").style.display=sw?"none":"block";
    if($("nodeBorder"))$("nodeBorder").classList.toggle("locked",!bd);
    if($("borderLockTip"))$("borderLockTip").style.display=bd?"none":"block";
    const lm=$("mapLock");if(lm)lm.textContent=m?"":"🔒";
    const b=$("btnMapMenu");if(b)b.classList.toggle("lockedBtn",!m);
    $("mapSub").textContent=m?
      "开放大世界 · 六图自由往返 · 雨沼边境走廊是通往【魔法大学城】的空间过渡带（⚠ 推荐 Lv.85+）":
      "通关【黄昏城堡】全部关卡后点亮下一片区域";
  }
  function selectMap(id){
    const m=CFG.MAPS.find(x=>x.id===id);if(!m)return;
    if(!SV.mapUnlocked(id)){
      CR.audio.sfx("deny");
      toast("🔒 尚未解锁【"+m.name+"】：请先用任意角色通关【黄昏城堡】全部关卡（可先选黄昏城堡前往）");
      return;
    }
    selectedMap=id;
    ["dusk","market","harbor","forest","swamp","border"].forEach(k=>{
      const el=$("node"+k[0].toUpperCase()+k.slice(1));
      if(el)el.classList.toggle("sel",id===k);
    });
    $("mapDetail").innerHTML=`<b style="color:${m.accent}">${m.icon} ${m.name}</b> · ${m.sub}<br>${m.desc}`;
    $("mapEnter").disabled=false;
    $("mapEnter").textContent="前往【"+m.name+"】";
    CR.audio.sfx("ui");
  }

  /* ================= 对话 / 商店 ================= */
  function openDialogue(cfg){
    dialogue=cfg;dlgIdx=0;
    showScreen("dialogue");
    $("dlgIcon").textContent=cfg.icon||"✿";
    $("dlgName").textContent=cfg.name;
    $("dlgTitle").textContent=cfg.title||"";
    $("dlgReward").textContent=cfg.reward||"";
    $("dlgReward").style.display=cfg.reward?"block":"none";
    renderDialogue();
  }
  function renderDialogue(){
    if(!dialogue)return;
    const lines=dialogue.lines||[];
    $("dlgText").textContent=lines[Math.min(dlgIdx,lines.length-1)]||"";
    $("dlgPage").textContent=(dlgIdx+1)+" / "+lines.length;
    $("dlgNext").textContent=dlgIdx>=lines.length-1?"完 成 ✓":"继 续 ▸";
    CR.audio.sfx("talk");
  }
  function nextDialogue(){
    if(!dialogue)return;
    const lines=dialogue.lines||[];
    if(dlgIdx<lines.length-1){dlgIdx++;renderDialogue();return;}
    hideScreen("dialogue");
    const cb=dialogue.onDone;dialogue=null;
    if(cb)cb();
  }
  function openShop(){
    showScreen("shop");renderShop();CR.audio.sfx("talk");
  }
  function renderShop(){
    if(!$("shop").classList.contains("on"))return;
    $("shopGold").textContent=SV.data.profile.gold;
    $("shopList").innerHTML=CFG.SHOP.map(row=>{
      const isEq=row.k==="equip";
      const it=isEq?CFG.EQUIPMENT[row.id]:CFG.ITEMS[row.id];
      if(!it)return "";
      const price=row.price!==undefined?row.price:it.price;
      const can=SV.data.profile.gold>=price;
      const sub=isEq?`${CFG.QUALITY_NAME[it.q]} · ${CR.equip.slotName(it.slot)} · ${it.desc}`:
        `${it.desc}${it.cd?" · CD "+it.cd+"s":""}${it.noSlot?" · 不可入槽":""}`;
      const col=isEq?"#ffd27a":rgb(it.color);
      return `<div class="shopRow tipTarget" data-tip-kind="${isEq?"equip":"item"}" data-tip-id="${row.id}">
        <div class="si" style="color:${col}">${it.icon}</div>
        <div class="sn"><b class="${isEq?"q-"+it.q:""}">${it.name}</b><small>${sub}</small></div>
        <button data-buy="${row.k}:${row.id}" ${can?"":"disabled"}>${price} 金币</button></div>`;
    }).join("");
    $("shopList").querySelectorAll("button[data-buy]").forEach(b=>
      b.addEventListener("click",()=>{CR.market.buy(b.dataset.buy);renderShop();}));
    bindItemTips($("shopList"));
  }
  /* ================= HUD 同步 ================= */
  function syncHud(force){
    if(!force&&hudT>0)return;
    hudT=.08;
    const P=CR.ent.player,W=CR.world,d=SV.data;
    const town=W.mode==="market"||W.mode==="harbor"||W.mode==="forest"||W.mode==="swamp"||W.mode==="border";
    const harbor=W.mode==="harbor",forest=W.mode==="forest",swamp=W.mode==="swamp",border=W.mode==="border";
    $("hpFill").style.width=(U.clamp(P.hp/P.maxHp,0,1)*100)+"%";
    $("hpTxt").textContent=Math.ceil(P.hp)+"/"+P.maxHp;
    $("mpFill").style.width=U.clamp(P.energy/P.maxEnergy,0,1)*100+"%";
    $("mpTxt").textContent=Math.floor(P.energy)+"/"+P.maxEnergy;
    const cl=SV.charLevel(P.cls),need=SV.expNeed(P.cls);
    $("xpFill").style.width=(cl.level>=CFG.MAX_LEVEL?100:
      U.clamp(cl.exp/(need||1),0,1)*100)+"%";
    $("pname").textContent=(P.name||charName(P.cls))+" · "+classTag(P.cls);
    /* 1.4 dev1 局内显示当前出战角色等级 */
    $("hudLv").textContent="Lv."+SV.levelOf(P.cls);
    $("hudLvName").textContent=(P.name||charName(P.cls))+" · "+classTag(P.cls);
    $("pzone").textContent=harbor?"自由港口":(swamp?"⚠ 危险区":(border?"⚠ 边境 · Lv.85+":(town?"自由区域":
      ("WAVE "+Math.min(W.waveIdx+1,CFG.WAVES.length)+" / "+CFG.WAVES.length))));
    $("zoneName").textContent=harbor?"星火港":(forest?"魔法丛林":
      (swamp?(CFG.SWAMP_ZONES[CR.swamp?CR.swamp.zone:0]||{}).name+" · 危险区":
        (border?(CFG.BORDER_ZONES[CR.border?CR.border.zone:1]||{}).name+" · 边境":
         (town?"狂欢集市":CFG.ZONES[W.zoneIdx].name))));
    $("gold").textContent=d.profile.gold;
    $("kills").textContent=W.kills;
    $("comboN").textContent=W.combo;
    /* 1.4 dev1.4：局内不再显示用时（黄昏城堡不是副本） */
    // 技能格
    const kb=d.settings.bindings;
    const skList=SV.equippedSkills?SV.equippedSkills(P.cls):CFG.CLASSES[P.cls].skills;
    for(let i=0;i<4;i++){
      const el=skillEls[i];if(!el)continue;
      const sk=CFG.SKILLS[skList[i]]||{icon:"·",name:"空技能",cd:3};
      const cd=P.cd[i],mx=P.cdMax[i]||sk.cd;
      el.ico.textContent=sk.icon;el.nm.textContent=sk.name;
      el.key.textContent=CFG.KEY_LABELS[kb["s"+(i+1)]]||"?";
      const ratio=U.clamp(cd/mx,0,1);
      /* 1.1.0 顺时针圆形扫描：暗扇从 12 点起，随剩余 CD 顺时针缩短 */
      el.root.style.setProperty("--cd",(ratio*360).toFixed(1)+"deg");
      el.mask.style.height="0%";
      el.num.textContent=cd>0?cd.toFixed(1):"";
      el.num.style.opacity=cd>0?1:0;
      const tsk=$("sk"+(i+1));
      if(tsk){tsk.style.setProperty("--cd",(ratio*360).toFixed(1)+"deg");
        const tt=tsk.querySelector(".cdtext");if(tt)tt.textContent=cd>0?cd.toFixed(1):"";}
      el.root.classList.toggle("noenergy",P.energy<sk.cost);
      el.root.classList.toggle("ready",cd<=0&&P.energy>=sk.cost);
      el.root.classList.toggle("charge",i===0&&CR.input.charging);
      /* 1.4 dev1.3：工具 / 不匹配武器导致技能不可用时灰化并给出警告 */
      const allow=CR.equip&&CR.equip.skillAllowed?
        CR.equip.skillAllowed(P.cls,skList[i]):{ok:true,reason:""};
      el.root.classList.toggle("blocked",!allow.ok);
      el.root.title=allow.ok?sk.name:"⚠ 无法使用【"+sk.name+"】："+allow.reason+
        " · 请注意周围环境安全，先换回匹配武器";
      const tb=$("tbtn_sk"+i);if(tb)tb.classList&&tb.classList.toggle("blocked",!allow.ok);
    }
    /* 武器兼容标识：→ 绿 / 黄 / 红 */
    const wm=$("weaponMark");
    if(wm&&CR.equip){
      const cs=CR.equip.combatState(P.cls),v=CR.equip.view(P.cls);
      const two=v.two,main=v.main;
      let lv="green",tip="→ 已配备远程 / 正确武器：普攻与技能正常";
      if(!cs.canAttack){lv="red";tip="⚠ "+cs.reason+" · 普攻与依赖武器的技能不可用";}
      else if(cs.tool||cs.atkMul<1||cs.heavyPenalty>0||(two&&two.weight==="heavy")){
        lv="yellow";tip="△ 可兼容但效果不佳：攻击 "+Math.round(cs.atkMul*100)+"%"+
          (cs.heavyPenalty?" · 重武移速惩罚":"");
      }
      wm.className="wm-"+lv;wm.textContent=cs.canAttack?"→":"✕";
      wm.title=tip+"（当前："+((two||main||{}).name||"默认武器")+"）";
    }
    // 道具槽
    for(let i=0;i<2;i++){
      const el=slotEls[i];if(!el)continue;
      const id=d.slots[i],it=id?CFG.ITEMS[id]:null;
      const ratio=CR.combat.slotRatio(i),cd=CR.combat.slotCd[i];
      el.ico.textContent=it?it.icon:"＋";
      el.ico.style.color=it?rgb(it.color):"#8fa0bd";
      el.nm.textContent=it?it.name:"道具槽";
      el.key.textContent=CFG.KEY_LABELS[kb["use"+(i+1)]]||"?";
      el.qty.textContent=it?(d.inventory.items[id]||0):"";
      el.root.style.setProperty("--cd",(ratio*360).toFixed(1)+"deg");
      el.mask.style.height="0%";
      el.num.textContent=cd>0?cd.toFixed(1):"";
      el.num.style.opacity=cd>0?1:0;
      const ti=$("ti"+(i+1));
      if(ti){ti.style.setProperty("--cd",(ratio*360).toFixed(1)+"deg");
        const tt=ti.querySelector(".cdtext");if(tt)tt.textContent=cd>0?cd.toFixed(1):"";}
      el.root.classList.toggle("filled",!!it);
      el.root.classList.toggle("noitem",!it||(d.inventory.items[id]||0)<=0);
      el.root.classList.toggle("ready",!!it&&cd<=0&&(d.inventory.items[id]||0)>0);
    }
    // 队伍 HUD
    const tms=$("teamHud").children;
    for(let i=0;i<tms.length;i++){
      tms[i].classList.toggle("on",d.team.active===i&&SV.teamClass(i)!==null);
      tms[i].classList.toggle("empty",SV.teamClass(i)===null);
    }
    // 连击 / BUFF
    const cb=$("combo");
    if(W.combo>=2){cb.textContent=W.combo+" COMBO";cb.classList.add("on");}
    else cb.classList.remove("on");
    const bs=[];
    if(P.buff.t>0){
      if(P.buff.dmg>0)bs.push("攻击 +"+(P.buff.dmg*100).toFixed(0)+"%");
      if(P.buff.spd>0)bs.push("加速 +"+(P.buff.spd*100).toFixed(0)+"%");
      if(P.buff.shield>0)bs.push("护盾 "+Math.ceil(P.buff.shield));
      bs.push(P.buff.t.toFixed(1)+"s");
    }
    /* 1.4 dev1 三类护盾：银灰 / 蓝 / 橙黄，⛨ 图标 */
    const BC=CR.battlecore,sh=BC?BC.shieldsOf(P):{normal:0,magic:0,true:0};
    const shTotal=(sh.normal||0)+(sh.magic||0)+(sh.true||0);
    /* 1.4 dev1.3：护盾条已改为玩家 / 怪物头顶的局内条，旧 HUD 行不再显示 */
    $("shieldHud").classList.add("hide");
    if(shTotal>0){
      $("shNormal").textContent=Math.ceil(sh.normal||0);
      $("shMagic").textContent=Math.ceil(sh.magic||0);
      $("shTrue").textContent=Math.ceil(sh.true||0);
      $("shieldHud").querySelectorAll(".shTag").forEach(el=>{
        el.style.opacity=(sh[el.dataset.sh]||0)>0?1:.25;});
      bs.push("⛨ 护盾 "+Math.ceil(shTotal));
    }
    /* 8 维战斗等级提示 */
    if(BC&&P.bcLevels){
      const lt=BC.levelText({levels:P.bcLevels});
      if(lt!=="无")bs.push("等级修正 "+lt);
    }
    /* 1.4 dev1.3：旧版纯文本 buff 行已被状态卡里的圆盘扫描方块取代，
       这里不再覆盖 #buffs；增益 / 护盾 / 等级信息都在方块的悬浮说明里。 */
    // BOSS
    const boss=W.bossRef;
    if(boss&&boss.alive&&boss.hp>0){
      $("bossbar").classList.remove("hide");
      /* 1.3.1 修复：名称随当前 BOSS 配置动态显示，不再硬编码黑石城主 */
      $("bossName").textContent=(boss.cfg&&boss.cfg.label)||
        (boss.cfg&&boss.cfg.element?boss.cfg.element+" BOSS":"BOSS");
      $("bossFill").style.width=(U.clamp(boss.hp/boss.maxHp,0,1)*100)+"%";
    }else $("bossbar").classList.add("hide");
    // 城镇信息
    if(town||W.mode==="battle")refreshWeather();
    /* 放在最后，确保没有其它 HUD 逻辑覆盖状态方块 */
    renderStatusBoxes(!!force);
  }
  /* ================= 1.4 dev1.3 局内 buff / 八维等级方块 ================= */
  let buffBoxT=0;
  function showBuffTip(el,html){
    const tip=$("buffTip");if(!tip)return;
    tip.innerHTML=html;tip.classList.remove("hide");
    const r=el.getBoundingClientRect();
    tip.style.left=Math.min(window.innerWidth-280,r.left+34)+"px";
    tip.style.top=Math.max(8,r.top-10)+"px";
  }
  function hideBuffTip(){const t=$("buffTip");if(t)t.classList.add("hide");}
  function scan(el,ratio,color){
    const deg=Math.max(0,Math.min(360,U.clamp(ratio,0,1)*360));
    el.style.background="conic-gradient(from -90deg,"+color+" 0deg "+deg.toFixed(1)+
      "deg,rgba(0,0,0,0) "+deg.toFixed(1)+"deg 360deg)";
  }
  function bindBoxTip(el,html){
    el.onmouseenter=()=>showBuffTip(el,html);
    el.onmouseleave=hideBuffTip;
    el.onclick=()=>showBuffTip(el,html);
  }
  function renderStatusBoxes(force){
    if(!$("buffs")||!$("rankCol"))return;
    buffBoxT-=.08;if(!force&&buffBoxT>0)return;buffBoxT=.22;
    /* 任务 / 状态卡下方：异常状态与特殊能力小方块 */
    const box=$("buffs");box.innerHTML="";
    const infos=CR.status?CR.status.info():[];
    infos.forEach(o=>{
      const d=document.createElement("div");
      d.className="buffBox "+(o.kind==="dot"?"dot":"control");
      d.innerHTML=o.icon+'<span class="bnum">'+Math.ceil(o.left)+"</span>";
      scan(d,o.left/Math.max(o.max,1),"rgba(255,120,120,.42)");
      bindBoxTip(d,"<b>"+o.icon+" "+o.name+"</b> · "+(o.kind==="dot"?"持续伤害":"控制")+
        "<br>剩余 "+o.left.toFixed(1)+"s / "+o.max.toFixed(0)+"s<br>"+o.desc+
        "<br><span class='dim'>切换角色可解除（束缚禁止切换）</span>");
      box.appendChild(d);
    });
    /* 樱花 4/4 sp1、护盾、增益等特殊能力 */
    const P=CR.ent.player,BC=CR.battlecore;
    if(P.petalAura){
      const d=document.createElement("div");d.className="buffBox";d.innerHTML="🌸";
      scan(d,1,"rgba(255,170,210,.32)");
      bindBoxTip(d,"<b>🌸 樱花环绕</b> · 特殊能力<br>王者樱花套装 4/4 触发，纯视觉特效，不影响战力");
      box.appendChild(d);
    }
    if(BC){
      const sh=BC.shieldsOf(P),tot=(sh.normal||0)+(sh.magic||0)+(sh.true||0);
      if(tot>0){
        const d=document.createElement("div");d.className="buffBox";
        d.innerHTML="⛨"+'<span class="bnum">'+Math.round(tot)+"</span>";
        const exp=P.shieldExpire||{},left=Math.max(0,
          Math.max(exp.normal||0,exp.magic||0,exp.true||0)-Date.now()/1000);
        scan(d,left/BC.SHIELD_TTL,"rgba(127,240,255,.38)");
        bindBoxTip(d,"<b>⛨ 护盾</b><br>普通 "+Math.round(sh.normal||0)+" / 法术 "+
          Math.round(sh.magic||0)+" / 真实 "+Math.round(sh.true||0)+
          "<br>剩余 "+Math.ceil(left)+"s（最多保留 120 秒）");
        box.appendChild(d);
      }
    }
    /* 屏幕左侧单列：8 维战斗等级（只显示非 0 项，垂直居中） */
    const col=$("rankCol");col.innerHTML="";
    if(BC){
      const L=P.bcLevels||BC.newLevels();
      const icons={atk:"⚔",matk:"✦",pdef:"🛡",mdef:"✨",hit:"◎",dodge:"↝",crit:"✹",spd:"➤"};
      (BC.LEVEL_KEYS||[]).forEach(k=>{
        const v=L[k]||0;if(!v)return;
        const d=document.createElement("div");d.className="rankBox";
        d.innerHTML=(icons[k]||"•")+'<span class="bnum">'+(v>0?"+":"")+v+"</span>";
        scan(d,1-(L._t||0)/10,v>0?"rgba(110,230,140,.38)":"rgba(255,110,110,.38)");
        bindBoxTip(d,"<b>"+(BC.LEVEL_NAMES&&BC.LEVEL_NAMES[k]||k)+" "+(v>0?"+":"")+v+" 级</b>"+
          "<br>战斗临时等级：每级 ±10%，最多 ±6<br>每 10 秒向 0 回落 1 级（下一次 "+
          Math.max(0,10-(L._t||0)).toFixed(1)+"s）<br>切换角色后等级归零");
        col.appendChild(d);
      });
    }
  }
  function refreshWeather(){
    const g=CFG.GROUND[CR.world.groundAt(CR.ent.player.x)]||CFG.GROUND.stone;
    const prefix=SV.data.settings.clockSource==="local"?"本机时间":"北京时间";
    const gw=CR.weather?CR.weather.current():null;
    const wTag=gw&&CR.weather.activeFor(CR.world.mode)?" · "+gw.icon+gw.name:"";
    if(CR.world.mode==="harbor"&&CR.harbor){
      const h=CR.harbor;
      $("weatherLine").textContent=(h.isNight?"🌙 夜间灯火":(h.st.phase==="dusk"?"🌇 黄昏海风":"☀ 海风白昼"))+
        " · 星火港"+wTag;
      $("clockLine").textContent=prefix+" "+String(h.hour).padStart(2,"0")+":00（"+h.clockSrc+"）";
      $("groundLine").textContent="脚下："+g.name+" · 试炼剩余 "+SV.trialLeft()+" 次";
      return;
    }
    if(CR.world.mode==="swamp"&&CR.swamp){
      const w=CR.swamp,z=CFG.SWAMP_ZONES[w.zone];
      $("weatherLine").textContent=(w.isNight?"🌙 夜沼 · 发光虫":(w.phase==="dusk"?"🌇 沼上暮色":"☀ 薄雾白昼"))+
        " · "+w.weather+" · ⚠ 危险区";
      /* 1.4 dev1.3 修复：跟随校时设置，不再写死北京时间 */
      $("clockLine").textContent=prefix+" "+String(w.hour).padStart(2,"0")+":00（"+w.clockSrc+"）";
      $("groundLine").textContent="分区："+z.name+"（"+z.danger+"危险）· 脚下："+g.name;
      return;
    }
    if(CR.world.mode==="border"&&CR.border){
      const b=CR.border,z=CFG.BORDER_ZONES[b.zone];
      $("weatherLine").textContent=(b.isNight?"🌙 幽光与萤火":
        (b.phase==="dusk"?"🌇 边境暮色":"☀ 湿冷薄雾"))+" · "+z.name+" · 推荐 Lv.85+";
      $("clockLine").textContent=prefix+" "+String(b.hour).padStart(2,"0")+":00（"+b.clockSrc+"）"+
        (CFG.BORDER_NPCS.farmerTao&&!b.taoOpen()?" · 老陶已收摊":" · 老陶摆摊中");
      $("groundLine").textContent="分区："+z.name+"（"+z.danger+"）· 脚下："+g.name+
        " · 采集点今日剩余 "+CFG.BORDER_NODES.reduce((a,n)=>a+SV.gatherLeft(n.id),0)+" 次";
      return;
    }
    if(CR.world.mode==="forest"&&CR.forest){
      const f=CR.forest;
      $("weatherLine").textContent=(f.isNight?"🌙 萤火与幽光":
        (f.phase==="dusk"?"🌇 林间暮色":"☀ 林间白昼"))+" · 魔法丛林"+wTag;
      $("clockLine").textContent=prefix+" "+String(f.hour).padStart(2,"0")+":00（"+f.clockSrc+"）";
      $("groundLine").textContent="脚下："+g.name+" · 伐木点 3 处，今日剩余 "+
        CFG.FOREST_NODES.reduce((a,n)=>a+SV.gatherLeft(n.id),0)+" 次";
      return;
    }
    if(CR.world.mode==="market"&&CR.market){
      const m=CR.market,w=m.wcfg;
      $("weatherLine").textContent=w.icon+" "+w.name+" · "+(m.st.phase==="night"?"夜间":(m.st.phase==="dusk"?"黄昏":"白昼"))+" · "+w.desc;
      $("clockLine").textContent=prefix+" "+String(m.hour).padStart(2,"0")+":00（"+m.clockSrc+"）";
      $("groundLine").textContent="脚下："+g.name+(groundT>0?" · 刚踩过":"");
      return;
    }
    /* 1.4 dev1.3：黄昏城堡（以及未来新图）显示全局天气 */
    const w=gw||{icon:"☀",name:"晴天",desc:""};
    $("weatherLine").textContent=w.icon+" "+w.name+" · "+w.desc;
    $("clockLine").textContent=prefix+" "+String(new Date().getHours()).padStart(2,"0")+":00";
    $("groundLine").textContent="脚下："+g.name+(groundT>0?" · 刚踩过":"");
  }
  function flashGround(name,icon){
    groundT=.7;
    $("groundLine").textContent="脚下："+icon+" "+name;
    $("groundLine").style.color="#a8f5c2";
    setTimeout(()=>{$("groundLine").style.color="";},700);
  }
  function setInteractHint(txt){
    const e=$("interactHint");e.textContent=txt||"";
    e.classList.toggle("on",!!txt);
  }
  function setWorldLabels(arr){
    const box=$("worldLabels");
    while(labelPool.length<24){const d=document.createElement("div");
      d.className="wlabel";box.appendChild(d);labelPool.push(d);
      // 1.2.0：世界标签悬浮 / 长按显示对象情报（只绑定一次，逐帧只换数据）
      d.addEventListener("pointerenter",e=>{
        if(e.pointerType==="touch"||!d._tip)return;
        clearTimeout(regionTipTimer);
        regionTipTimer=setTimeout(()=>showRegionTip(d._tip,e.clientX,e.clientY),180);
      });
      d.addEventListener("pointermove",e=>{
        if(e.pointerType==="touch"||!d._tip)return;
        if($("regionTip").classList.contains("on"))showRegionTip(d._tip,e.clientX,e.clientY);
      });
      d.addEventListener("pointerleave",hideRegionTip);
      d.addEventListener("touchstart",e=>{
        if(!d._tip)return;
        const t=e.touches[0];clearTimeout(regionTouchTimer);
        regionTouchTimer=setTimeout(()=>showRegionTip(d._tip,t.clientX,t.clientY),420);
      },{passive:true});
      d.addEventListener("touchend",()=>{clearTimeout(regionTouchTimer);
        setTimeout(hideRegionTip,2600);});
      d.addEventListener("touchmove",hideRegionTip);
      d.addEventListener("touchcancel",hideRegionTip);
    }
    for(let i=0;i<labelPool.length;i++){
      const d=labelPool[i],a=arr[i];
      if(!a){d.style.display="none";d._tip=null;delete d.dataset.tip;continue;}
      d.style.display="block";
      d.textContent=a.text;
      d.className="wlabel "+(a.cls||"")+(a.tip?" tipOn":"");
      d._tip=a.tip||null;
      if(a.tip)d.dataset.tip="1";else delete d.dataset.tip;
      d.style.left=a.sx+"px";d.style.top=a.sy+"px";
      d.style.opacity=a.alpha===undefined?1:a.alpha;
    }
  }
  function tick(dt){
    hudT-=dt;bannerT-=dt;toastT-=dt;groundT=Math.max(0,groundT-dt);
    updateChargeHud();
    if(bannerT<=0)$("banner").classList.remove("on");
    if(toastT<=0)$("toast").classList.remove("on");
    frames++;fpsT+=dt;
    if(fpsT>=.5){
      fps=frames/fpsT;frames=0;fpsT=0;
      const s=CR.gl.stats,Q=CFG.QUALITY[CR.gl.quality];
      $("perf").textContent=`FPS ${fps.toFixed(0)} · TRIS ${s.tris} · DRAW ${s.draws} · `+
        `${CR.gl.W}×${CR.gl.H} · ${Q.name}档 · 音乐 ${CR.audio.scene}`;
    }
  }
  function banner(txt){const b=$("banner");b.textContent=txt;b.classList.add("on");bannerT=1.9;}
  function toast(txt){const t=$("toast");t.textContent=txt;t.classList.add("on");toastT=2.1;}

  /* ================= 1.1.0 物品浮动说明（悬浮 / 长按） ================= */
  function eqStatLine(it){
    const st=it.stats||{},a=[];
    if(st.atk)a.push("物攻 +"+st.atk);
    if(st.matk)a.push("法攻 +"+st.matk);
    if(st.hp)a.push("生命 +"+st.hp);
    /* 1.4 dev1.4：护甲除名 → 物防 / 法防 */
    if(st.pdef||st.armor)a.push("物防 +"+((st.pdef||0)+(st.armor||0)));
    if(st.mdef)a.push("法防 +"+st.mdef);
    if(st.crit)a.push("暴击 +"+(st.crit*100).toFixed(1)+"%");
    if(st.spd)a.push("移速 +"+st.spd);
    if(st.critDmg)a.push("爆伤 +"+st.critDmg+"%");
    if(st.range)a.push("射程 +"+st.range);
    return a.length?a.join("　"):"无属性加成";
  }
  function tipOf(kind,id){
    const d=SV.data,e=escapeHtml;
    if(kind==="slot"){
      const sl=CFG.EQUIP_SLOTS.find(x=>x.id===id);if(!sl)return "";
      const worn=CR.equip.slots(eqViewCls)[id];
      const it=worn?CFG.EQUIPMENT[worn]:null;
      return {title:sl.icon+" "+sl.name,q:"",qty:it?"已穿戴："+e(it.name):"当前：空槽位",
        eff:it?e(eqStatLine(it)):e(sl.desc),
        desc:it?e(it.desc):"点击槽位打开装备库，选择一件装备穿戴。",
        passive:it&&it.passive?it.passive.map(p=>e(CFG.PASSIVE_DESC[p]||p)).join("<br>"):"",
        set:it&&it.set?e("套装【"+CFG.EQUIP_SETS[it.set].name+"】"):"",
        src:it?e(it.source||"商店 / 掉落"):"获取：阿福摊位、精英 / 小统领 / 黑石城主掉落"};
    }
    if(kind==="mat"){
      const m=CFG.MATERIALS[id];if(!m)return "";
      return {title:m.icon+" "+e(m.name),q:"",qty:"持有数量："+(d.inventory.mats[id]||0)+" 个",
        eff:"作用："+e(m.desc),desc:"用于属性强化与锻造。",passive:"",set:"",
        src:"获取方法："+e(m.source||"击败怪物 / 采集")};
    }
    if(kind==="item"){
      const it=CFG.ITEMS[id];if(!it)return "";
      return {title:it.icon+" "+e(it.name),q:"",qty:"持有数量："+(d.inventory.items[id]||0)+" 个",
        eff:"作用："+e(it.desc)+(it.cd?" · 冷却 "+it.cd+"s":"")+(it.noSlot?" · 不可放入战斗槽位":""),
        desc:(it.lockedSystem?"⚠ "+e(it.lockedSystem)+" 将在 v"+it.lockedVer+" 开放，当前不可使用":
          (it.price?"参考售价："+it.price+" 金币":"")),passive:"",set:"",
        src:"获取方法："+e(it.source||"商店 / 怪物掉落")};
    }
    if(kind==="equip"){
      const it=CFG.EQUIPMENT[id];if(!it)return "";
      const q=CFG.QUALITY_NAME[it.q]||"普通";
      /* 1.4 dev1.1 修复：樱花套件 parts=[]（any 模式），旧判定 parts.indexOf 永远查不到 */
      const sets=Object.keys(CFG.EQUIP_SETS).filter(k=>{
        const S=CFG.EQUIP_SETS[k];
        return S.any?(it.set===k):(S.parts.indexOf(id)>=0);
      });
      const setDetail=sets.map(k=>{
        const S=CFG.EQUIP_SETS[k];
        return "套装【"+e(S.name)+"】<br>"+
          (S.bonus||[]).map(b=>"　"+b.n+" 件："+e(b.desc)).join("<br>")+
          (S.sp1?"<br>　✦ sp1「"+e(S.sp1.name)+"」"+e(S.sp1.desc)+"（"+S.sp1.n+" 件触发）":"");
      }).join("<br>");
      return {title:it.icon+" "+e(it.name),q:"【"+q+"】",
        qty:"持有数量："+(CR.equip.owned(id))+" 件 · "+e(CR.equip.slotName(it.slot)),
        eff:"作用："+e(eqStatLine(it)),
        desc:e(it.desc),passive:it.passive?it.passive.map(p=>e(CFG.PASSIVE_DESC[p]||p)).join("<br>"):"",
        set:setDetail,
        src:"获取方法："+e(it.source||"商店 / 掉落")};
    }
    return "";
  }
  function showItemTip(kind,id,x,y){
    const t=tipOf(kind,id);if(!t)return;
    const box=$("itemTip");if(!box)return;
    box.innerHTML=`<div class="it-title">${t.title}${t.q?`<span class="it-q q-${"white"}">${t.q}</span>`:""}</div>`+
      `<div class="it-qty">${t.qty}</div>`+
      (t.eff?`<div class="it-eff">${t.eff}</div>`:"")+
      (t.desc?`<div class="it-desc">${t.desc}</div>`:"")+
      (t.passive?`<div class="it-passive">被动：${t.passive}</div>`:"")+
      (t.set?`<div class="it-set">${t.set}</div>`:"")+
      `<div class="it-src">${t.src}</div>`;
    box.classList.add("on");
    const r=box.getBoundingClientRect();
    let l=x+14,tp=y+14;
    if(l+r.width>innerWidth)l=x-r.width-14;
    if(tp+r.height>innerHeight)tp=y-r.height-14;
    box.style.left=Math.max(4,l)+"px";box.style.top=Math.max(4,tp)+"px";
  }
  function hideItemTip(){
    const box=$("itemTip");if(box)box.classList.remove("on");
    clearTimeout(tipTimer);clearTimeout(tipTouchTimer);tipTimer=tipTouchTimer=null;
  }
  function bindItemTips(container){
    if(!container)return;
    container.querySelectorAll("[data-tip-kind]").forEach(el=>{
      const k=el.dataset.tipKind,id=el.dataset.tipId;
      el.addEventListener("pointerenter",e=>{
        if(e.pointerType==="touch")return;
        clearTimeout(tipTimer);
        tipTimer=setTimeout(()=>showItemTip(k,id,e.clientX,e.clientY),180);
      });
      el.addEventListener("pointermove",e=>{
        if(e.pointerType==="touch")return;
        if($("itemTip").classList.contains("on"))showItemTip(k,id,e.clientX,e.clientY);
      });
      el.addEventListener("pointerleave",hideItemTip);
      el.addEventListener("touchstart",e=>{
        const t=e.touches[0];
        clearTimeout(tipTouchTimer);
        tipTouchTimer=setTimeout(()=>showItemTip(k,id,t.clientX,t.clientY),420);
      },{passive:true});
      el.addEventListener("touchend",()=>{clearTimeout(tipTouchTimer);
        setTimeout(hideItemTip,2600);});
      el.addEventListener("touchmove",hideItemTip);
      el.addEventListener("touchcancel",hideItemTip);
    });
  }

  /* ================= 1.1.0 装备栏 ================= */
  function viewCls(){
    if(eqViewCls===null)eqViewCls=CR.ent.player.cls||0;
    return eqViewCls;
  }
  function renderEquip(){
    if(!$("equipGrid"))return;
    const cls=viewCls(),d=SV.data,cur=CR.equip.slots(cls);
    const hasSakura=SV.data.progress.sakuraHatched||SV.data.team.order.indexOf(3)>=0||
      SV.data.warehouse.some(w=>w.cls===3);
    const cl=CFG.CLASSES.filter(c=>c.id<3||hasSakura).map(c=>c.id);
    $("eqViewBtns").innerHTML=cl.map(c=>
      `<button data-eq-view="${c}" class="${c===cls?"on":""}">${CFG.CLASSES[c].icon} ${charName(c)}</button>`).join("");
    $("eqViewBtns").querySelectorAll("button[data-eq-view]").forEach(b=>
      b.addEventListener("click",()=>{eqViewCls=+b.dataset.eqView;
        renderEquip();renderExpPool();renderTalent();renderSkillCfg();CR.audio.sfx("ui");}));
    $("eqPower").textContent="Lv."+SV.levelOf(cls)+" · "+CR.equip.statLine(cls);
    $("equipGrid").innerHTML=CFG.EQUIP_SLOTS.map(sl=>{
      const id=cur[sl.id],it=id?CFG.EQUIPMENT[id]:null;
      const locked=(sl.id==="two"&&(cur.main||cur.off));
      return `<div class="eqSlot tipTarget ${it?"filled":""}" data-tip-kind="slot" data-tip-id="${sl.id}"
        data-eq-slot="${sl.id}">
        <div class="es-k">${sl.icon} ${sl.name}${locked?" · 需先卸下主副手":""}</div>
        <div class="es-i">${it?it.icon:sl.icon}</div>
        <div class="es-n ${it?"q-"+it.q:"dim"}">${it?it.name:"空"}</div>
        <div class="es-q ${it?"q-"+it.q:""}">${it?"【"+CFG.QUALITY_NAME[it.q]+"】":"点击穿戴"}</div>
        ${it?'<div class="es-x">✕ 卸下</div>':""}</div>`;
    }).join("");
    $("equipGrid").querySelectorAll("[data-eq-slot]").forEach(el=>
      el.addEventListener("click",()=>openEquipLib(el.dataset.eqSlot)));
    const b=CR.equip.bonus(cls);
    $("equipBonus").innerHTML="▸ 已穿戴 "+b.count+" 件 · "+escapeHtml(CR.equip.statLine(cls))+
      (b.passives.length?`<br>▸ 被动：`+b.passives.map(p=>escapeHtml(p+"："+(CFG.PASSIVE_DESC[p]||""))).join("；"):"")+
      `<br>▸ 提示：弓 / 弩 / 铳、法杖、巨剑与全部工具都占用【双手】槽，会卸下主副手；`+
      `三职业均可穿戴工具，但战斗能力按职业与工具种类判定（见装备说明）。`;
    const active={};b.sets.forEach(x=>active[x.key]=x);
    $("equipSets").innerHTML=Object.keys(CFG.EQUIP_SETS).map(k=>{
      const set=CFG.EQUIP_SETS[k],a=active[k];
      /* 1.4 dev1.1：any 套件 parts=[]，按实际穿戴的 set 标记计数 */
      const total=set.any?Object.keys(CFG.EQUIPMENT)
        .filter(id=>CFG.EQUIPMENT[id].set===k).length:set.parts.length;
      const n=a?a.n:Object.values(cur)
        .filter(id=>id&&CFG.EQUIPMENT[id]&&CFG.EQUIPMENT[id].set===k).length;
      const tip=(set.bonus||[]).map(x=>x.n+" 件："+x.desc).join("；")+
        (set.sp1?"；sp1 "+set.sp1.name+"："+set.sp1.desc:"");
      return `<span class="setChip ${n>=2?"":"off"}" title="${escapeHtml(tip)}">`+
        `${escapeHtml(set.name)} ${n}/${total}`+
        (a?" · "+escapeHtml(a.active.join(" / ")):" · 集齐 2 件激活")+
        (a&&a.sp1?` · ✦ sp1「${escapeHtml(a.sp1.name)}」`:"")+`</span>`;
    }).join("");
    bindItemTips($("equipGrid"));
  }
  function renderExpPool(){
    if(!$("expPoolVal"))return;
    const cls=viewCls(),c=SV.charLevel(cls),need=SV.expNeed(cls),d=SV.data;
    $("expPoolVal").textContent=U.fmt(d.profile.expPool);
    $("expCharName").textContent=charName(cls)+" · "+classTag(cls);
    $("expLv").textContent=c.level;
    $("expCur").textContent=U.fmt(c.exp);
    $("expNeed").textContent=c.level>=CFG.MAX_LEVEL?"MAX":U.fmt(need);
    $("expBar").style.width=(c.level>=CFG.MAX_LEVEL?100:U.clamp(c.exp/(need||1),0,1)*100)+"%";
    $("expToMaxLine").textContent=c.level>=CFG.MAX_LEVEL?
      "该角色已到 100 级满级。":"距离 Lv.100 还需 "+U.fmt(SV.expToMax(cls))+" 经验；"+
      "1→100 累计约 "+U.fmt(CFG.totalExpToMax())+" 经验。";
    document.querySelectorAll(".expBtns button[data-exp]").forEach(b=>{
      b.disabled=c.level>=CFG.MAX_LEVEL||d.profile.expPool<=0;
    });
  }
  function allocateExp(act){
    const cls=viewCls(),c=SV.charLevel(cls);
    let n=0;
    if(act==="1000"||act==="10000")n=+act;
    else if(act==="level1")n=Math.max(0,SV.expNeed(cls)-c.exp);
    else if(act==="level10"){
      for(let l=c.level;l<Math.min(CFG.MAX_LEVEL,c.level+10);l++)n+=CFG.expFormula(l);
      n=Math.max(0,n-c.exp);
    }else if(act==="max")n=SV.expToMax(cls);
    n=Math.min(n,SV.data.profile.expPool);
    if(n<=0){toast(SV.data.profile.expPool<=0?"经验池为空，去打怪或用经验果吧":"已经满级了");
      CR.audio.sfx("deny");return;}
    const r=SV.allocateExp(cls,n);
    if(r.used<=0){toast("经验池不足");CR.audio.sfx("deny");return;}
    SV.flush();
    if(cls===(CR.ent.player.cls||0)){
      if(CR.team&&CR.team.applyStats)CR.team.applyStats();else CR.ent.applyStats();
    }
    CR.audio.sfx(r.up>0?"levelup":"uiBig");
    toast("为 "+charName(cls)+" 分配 "+r.used+" 经验"+(r.up?" · 升了 "+r.up+" 级！":""));
    if(r.up>0)banner("升级！"+charName(cls)+" Lv."+SV.levelOf(cls));
    renderExpPool();renderChar();renderEquip();syncHud(true);
  }
  function openEquipLib(slot){
    eqSlotTarget=slot;
    showScreen("equipLib");
    renderEquipLib();
    CR.audio.sfx("ui");
  }
  function closeEquipLib(){
    hideScreen("equipLib");eqSlotTarget=null;hideItemTip();
  }
  function renderEquipLib(){
    if(!eqSlotTarget)return;
    const cls=viewCls(),sl=CFG.EQUIP_SLOTS.find(x=>x.id===eqSlotTarget);
    if(!sl)return;
    const cur=CR.equip.slots(cls)[eqSlotTarget];
    $("eqLibTitle").textContent=sl.icon+" "+sl.name+" · "+charName(cls)+" · "+classTag(cls);
    $("eqLibSub").textContent="双手武器会占用主手与副手；带【工具属性】的装备（月牙镰 / 铁镐 / 钓竿 / 锄头等）任何职业都能穿，主手槽也会一并列出，点击即自动放入双手槽。职业不符的战斗限制会在局内技能格提示。";
    let html="";
    if(cur){
      const it=CFG.EQUIPMENT[cur];
      html+=`<div class="eqLibRow"><div class="el-i q-${it.q}">${it.icon}</div>
        <div class="el-body"><b class="q-${it.q}">${it.name}</b> <span class="q-${it.q}">【${CFG.QUALITY_NAME[it.q]}】</span>
        <small>当前穿戴 · ${eqStatLine(it)}</small></div>
        <button class="unequip" data-eq-unequip="1">卸下</button></div>`;
    }
    /* 1.4 dev2：主手槽额外列出「双手 + 工具属性」装备，解决法 / 射点主手看不到工具的回归问题 */
    const isMain=eqSlotTarget==="main";
    const list=CR.equip.ownedList().filter(o=>{
      const hit=o.it.slot===eqSlotTarget||(isMain&&o.it.slot==="two"&&!!o.it.tool);
      return hit&&CR.equip.classOk(cls,o.id);
    });
    if(!list.length)html+=`<div class="dim" style="padding:14px">背包里没有可放入${sl.name}的装备。`+
      `去【狂欢集市 → 阿福摊位】购买，或击败精英 / 小统领 / 黑石城主获得。</div>`;
    list.forEach(o=>{
      const it=o.it;
      html+=`<div class="eqLibRow tipTarget" data-tip-kind="equip" data-tip-id="${o.id}">
        <div class="el-i q-${it.q}">${it.icon}</div>
        <div class="el-body"><b class="q-${it.q}">${it.name}</b>
          <span class="q-${it.q}">【${CFG.QUALITY_NAME[it.q]}】</span> ×${o.n}
          ${isMain&&o.it.slot==="two"&&o.it.tool?'<span class="q-blue">［双手 · 工具］</span>':""}
          <small>${eqStatLine(it)}${it.passive?" · 被动 "+it.passive.join("/"):""}</small></div>
        <button data-eq-wear="${o.id}">穿戴</button></div>`;
    });
    $("eqLibList").innerHTML=html;
    $("eqLibList").querySelectorAll("[data-eq-unequip]").forEach(b=>
      b.addEventListener("click",()=>{CR.equip.unequip(cls,eqSlotTarget);SV.flush();
        renderEquipLib();renderEquip();renderBag();syncHud(true);toast("已卸下装备");}));
    $("eqLibList").querySelectorAll("[data-eq-wear]").forEach(b=>
      b.addEventListener("click",()=>{
        /* 工具装备本体在 two 槽，从主手槽点击时自动重定向 */
        const wid=b.dataset.eqWear;
        const target=(eqSlotTarget==="main"&&CFG.EQUIPMENT[wid]&&CFG.EQUIPMENT[wid].slot==="two")?
          "two":eqSlotTarget;
        const r=CR.equip.equip(cls,target,wid);
        if(!r.ok){toast(r.reason);CR.audio.sfx("deny");return;}
        SV.flush();renderEquipLib();renderEquip();renderBag();syncHud(true);
        toast("已穿戴 "+CFG.EQUIPMENT[b.dataset.eqWear].name+" · 外观已更新");
      }));
    bindItemTips($("eqLibList"));
  }

  /* ================= 1.1.0 蓄力环 / 层次提示 ================= */
  function updateChargeHud(){
    const box=$("chargeHud");if(!box)return;
    const inp=CR.input,atk=$("btnAtk");
    const active=CR.game.state==="play"&&(inp.chargeHeld||inp.charging);
    if(!active){
      box.classList.add("hide");
      if(atk){atk.style.setProperty("--p","0deg");atk.style.setProperty("--on","0");}
      return;
    }
    box.classList.remove("hide");
    let deg,col,label,sub;
    if(!inp.charging){
      deg=inp.chargePre()*360;col="#7fa8d0";label="起蓄";sub="至少长按 0.3s";
    }else{
      const r=inp.chargeRatio(),lv=inp.chargeLevel;
      deg=r*360;
      if(lv>=2){col="#ffd166";label="满蓄";sub="松开释放 · 3.3×";}
      else if(lv>=1){col="#ffae5c";label="长蓄";sub="松开释放 · 2.1×";}
      else if(r>=.30){col="#9be8ff";label="中蓄";sub="继续长按可满蓄";}
      else{col="#7fc47f";label="短蓄";sub="继续长按";}
    }
    const ring=box.querySelector(".ch-ring");
    ring.style.setProperty("--p",deg.toFixed(1)+"deg");
    ring.style.setProperty("--c",col);
    $("chLabel").textContent=label;$("chSub").textContent=sub;
    if(atk){atk.style.setProperty("--p",deg.toFixed(1)+"deg");
      atk.style.setProperty("--c",col);atk.style.setProperty("--on","1");}
  }

  /* ================= 1.3.0 区域情报（四张地图） ================= */
  function regionMode(){
    const m=CR.world?CR.world.mode:"battle";
    return m==="harbor"?"harbor":(m==="forest"?"forest":
      (m==="swamp"?"swamp":(m==="border"?"border":(m==="market"?"market":"dusk"))));
  }
  function showRegionTip(tip,x,y){
    if(!tip)return;
    const box=$("regionTip");if(!box)return;
    box.innerHTML=`<div class="rt-title">${escapeHtml(tip.title||"")}`+
      (tip.kind?`<span class="rt-kind">${escapeHtml(tip.kind)}</span>`:"")+`</div>`+
      (tip.lines||[]).map(l=>`<div class="rt-line">${escapeHtml(l)}</div>`).join("");
    box.classList.add("on");
    const r=box.getBoundingClientRect();
    let l=x+14,tp=y+14;
    if(l+r.width>innerWidth)l=x-r.width-14;
    if(tp+r.height>innerHeight)tp=y-r.height-14;
    box.style.left=Math.max(4,l)+"px";box.style.top=Math.max(4,tp)+"px";
  }
  function hideRegionTip(){
    const box=$("regionTip");if(box)box.classList.remove("on");
    clearTimeout(regionTipTimer);clearTimeout(regionTouchTimer);
    regionTipTimer=regionTouchTimer=null;
  }
  function regionMapTip(id){
    const R=CFG.REGION_INFO[id];if(!R)return null;
    return {title:R.icon+" "+R.name,kind:"地图 · "+R.desc.slice(0,14),
      lines:[R.desc,"NPC "+R.npcs.length+" · 野怪 "+R.mobs.length+
        " · BOSS "+R.bosses.length+" · 资源点 "+R.nodes.length]};
  }
  function renderRegion(){
    const R=CFG.REGION_INFO[regionMode()],e=escapeHtml;
    if(!R)return;
    $("regionTitle").textContent=R.icon+" "+R.name+" · 区域情报";
    $("regionSub").textContent="NPC / 野怪 / BOSS / 资源点 · 开放大世界";
    const sec=(cls,label,arr)=>arr&&arr.length?
      `<div class="regionGroup ${cls}"><h4>${label}</h4>`+arr.map(x=>
        `<div class="regionItem"><span class="rt">${e(x.t)}</span>`+
        `<span class="rn">${e(x.n)}</span><span class="rd">${e(x.d)}</span></div>`).join("")+
      `</div>`:"";
    $("regionBody").innerHTML=
      `<div class="regionHead"><b>${e(R.name)}</b>　${e(R.desc)}<br>`+
      `<span class="dim">鼠标悬浮世界标签 / 移动端长按，可查看单个对象的详细情报。</span></div>`+
      sec("npc","👤 NPC 与商人",R.npcs)+sec("mob","⚔ 野怪",R.mobs)+
      sec("boss","☠ BOSS",R.bosses)+sec("node","✦ 资源点与环境",R.nodes);
  }
  function openRegion(){
    showScreen("regionPanel");renderRegion();hideRegionTip();CR.audio.sfx("ui");
  }
  function closeRegion(){
    hideScreen("regionPanel");hideRegionTip();
  }
  function toggleRegion(){
    if($("regionPanel").classList.contains("on"))closeRegion();else openRegion();
  }

  /* ================= 1.2.0 星火港：出售 / 锻造 / 黑市 ================= */
  function openTrade(mode){
    tradeMode=mode||"sell";
    showScreen("trade");renderTrade();CR.audio.sfx("talk");
  }
  function closeTrade(){hideScreen("trade");hideItemTip();}
  /* ================= 1.3.1 德鲁伊孵化室 + 小摊 ================= */
  function openHatchery(){
    hatchMode="nests";showScreen("hatchery");renderHatchery();CR.audio.sfx("ui");
  }
  function closeHatchery(){hideScreen("hatchery");hideItemTip();}
  /* ================= 1.4 dev1 任务档案 ================= */
  function openQuest(){
    if(!CR.quest)return;
    questMode="main";showScreen("questPanel");renderQuest();CR.audio.sfx("ui");
  }
  function closeQuest(){hideScreen("questPanel");hideItemTip();}
  function switchQuest(m){
    questMode=m;
    document.querySelectorAll(".tradeTabs button[data-quest]").forEach(b=>
      b.classList.toggle("on",b.dataset.quest===m));
    renderQuest();CR.audio.sfx("ui");
  }
  function renderQuest(){
    if(!CR.quest)return;
    const L=CR.quest.list(),arr=questMode==="main"?L.main:L.side;
    $("questShard").textContent=SV.data.inventory.mats.spiritShard||0;
    $("questHint").textContent=questMode==="main"?"主线剧情链 · dev2 起逐步开放":
      "支线可反复接取与交付 · 奖励含灵石碎片 / 可分配经验 / 晶豆";
    document.querySelectorAll(".tradeTabs button[data-quest]").forEach(b=>
      b.classList.toggle("on",b.dataset.quest===questMode));
    const badge={open:"可接取",accepted:"进行中",locked:"未解锁",done:"已完成"};
    $("questBody").innerHTML=arr.map(x=>{
      const q=x.q,t=q.target||{},prog=x.prog,need=t.n||1;
      const pct=x.state==="done"?100:(t.type==="item"?
        Math.min(100,(SV.data.inventory.mats[t.id]||0)/need*100):Math.min(100,prog/need*100));
      let btn="";
      if(x.state==="open")btn=`<button class="buy" data-qa="${q.id}">接取</button>`;
      else if(x.state==="accepted")btn=`<button class="buy" data-qt="${q.id}" ${x.canTurn?"":"disabled"}>
        ${x.canTurn?"交付":"未完成"}</button>`;
      else if(x.state==="locked")btn=`<button class="buy" disabled>🔒 未解锁</button>`;
      else btn=`<button class="buy" disabled>✓ 已完成</button>`;
      return `<div class="qRow ${x.state}" data-q="${q.id}">
        <div class="qIco">${questMode==="main"?"⚔":"🧺"}</div>
        <div class="qMain"><b>${escapeHtml(q.title)}</b>
          <span class="qBadge ${x.state}">${badge[x.state]}</span>
          <small>${escapeHtml(q.chapter||"支线委托")} · ${escapeHtml(q.desc)}</small>
          <small>目标：${escapeHtml(x.target)}　奖励：<i>${escapeHtml(x.reward)}</i></small>
          <div class="qBar"><i style="width:${pct}%"></i></div>
          <small class="qProg">${x.state==="done"?"已完成":(t.type==="item"?
            ((SV.data.inventory.mats[t.id]||0)+" / "+need):(prog+" / "+need))}</small></div>
        <div class="qAct">${btn}</div></div>`;
    }).join("")+`<div class="hatchNote">📜 任务档案由薇拉保管。主线「沉没古神庙」需等退潮机制（后续 dev）；
      当前可交付的支线是 <b>薇拉的药篓</b>：10 张猪皮 → 灵石碎片 ×128、可分配经验 ×4000、晶豆 ×120。</div>`;
    $("questBody").querySelectorAll("[data-qa]").forEach(b=>b.addEventListener("click",()=>{
      const r=CR.quest.accept(b.dataset.qa);
      if(r.ok){CR.audio.sfx("ui");toast("已接取 · "+r.name);}else{CR.audio.sfx("deny");toast(r.reason);}
      renderQuest();
    }));
    $("questBody").querySelectorAll("[data-qt]").forEach(b=>b.addEventListener("click",()=>{
      const r=CR.quest.turnIn(b.dataset.qt);
      if(!r.ok){CR.audio.sfx("deny");toast(r.reason);}
      renderQuest();refreshPanels();
    }));
  }

  /* ================= 1.4 dev1 沼泽限量商店 ================= */
  function openSwampShop(npc){
    swampShopNpc=npc||"hank";swampShopMode="buy";
    showScreen("swampShop");renderSwampShop();CR.audio.sfx("talk");
  }
  function closeSwampShop(){hideScreen("swampShop");hideItemTip();}
  function switchSwampShop(m){
    swampShopMode=m;
    document.querySelectorAll(".tradeTabs button[data-swampShop]").forEach(b=>
      b.classList.toggle("on",b.dataset.swampShop===m));
    renderSwampShop();CR.audio.sfx("ui");
  }
  function renderSwampShop(){
    /* 1.4 dev2：同一个面板服务沼泽与雨沼边境走廊两组商人，按当前地图切换数据源 */
    const bd=CR.world&&CR.world.mode==="border";
    const shop=bd?CR.border:CR.swamp;
    const goods=bd?CFG.BORDER_GOODS:CFG.SWAMP_GOODS;
    const sellTable=bd?CFG.BORDER_SELL:CFG.SWAMP_SELL;
    const npc=(bd?(CFG.BORDER_NPCS||{})[swampShopNpc]:CFG.SWAMP_NPCS[swampShopNpc])||
      CFG.SWAMP_NPCS[swampShopNpc],e=escapeHtml;
    $("swampShopTitle").textContent=npc.icon+" "+npc.name;
    $("swampShopSub").textContent=npc.desc;
    $("swampShopGold").textContent=SV.data.profile.gold;
    $("swampShopHint").textContent=swampShopMode==="buy"?
      (bd?"每日 / 周限购 · 按北京时间刷新 · 老陶 6:00-17:00 摆摊":"每日 / 每周 / 永久限购 · 按北京时间刷新"):
      (bd?"老陶收果蔬鱼肉与部分材料":"薇拉收芥菜与荆棘草，汉克与杰克也收部分沼泽材料");
    document.querySelectorAll(".tradeTabs button[data-swampShop]").forEach(b=>
      b.classList.toggle("on",b.dataset.swampShop===swampShopMode));
    const body=$("swampShopBody");
    if(swampShopMode==="buy"){
      const rows=(goods[swampShopNpc]||[]).map(row=>{
        const it=CFG.MATERIALS[row.id]||CFG.ITEMS[row.id]||CFG.EQUIPMENT[row.id]||{};
        const left=shop.leftOf(swampShopNpc,row);
        const lim=row.period==="once"?"永久限 "+row.limit:(row.period==="weekly"?"每周限 "+row.limit:"每日限 "+row.limit);
        return `<div class="dgRow" data-tip-kind="${row.k==="equip"?"equip":(row.k==="mat"?"mat":"item")}"
          data-tip-id="${row.id}">
          <div class="ic">${it.icon||"📦"}</div>
          <div class="nm"><b>${e(it.name||row.id)}</b><small>${e(it.desc||"")}　·　${lim}　·　剩余 ${left}</small></div>
          <div class="pr">${row.price} 金币</div>
          <button class="buy" data-sbuy="${row.id}" ${left<=0?"disabled":""}>${left<=0?"已售罄":"购买"}</button></div>`;
      }).join("");
      body.innerHTML=`<div class="hatchNote">🛒 ${e(npc.desc)}</div>${rows}`;
      body.querySelectorAll("[data-sbuy]").forEach(b=>b.addEventListener("click",()=>{
        const r=shop.buy(swampShopNpc,b.dataset.sbuy);
        if(!r.ok){CR.audio.sfx("deny");toast(r.reason);}
        renderSwampShop();
      }));
      bindItemTips(body);
      return;
    }
    const keys=Object.keys(sellTable).filter(k=>(SV.data.inventory.mats[k]||0)>0);
    body.innerHTML=`<div class="hatchNote">💰 点击出售 1 个；按住 Shift 点击一次卖 10 个。</div>`+
      (keys.length?keys.map(k=>{
        const m=CFG.MATERIALS[k],price=sellTable[k];
        return `<div class="dgRow" data-tip-kind="mat" data-tip-id="${k}">
          <div class="ic">${m.icon}</div>
          <div class="nm"><b>${e(m.name)} ×${SV.data.inventory.mats[k]}</b><small>${e(m.desc)}</small></div>
          <div class="pr">${price} 金币 / 个</div>
          <button class="buy" data-ssell="${k}">出售</button></div>`;
      }).join(""):`<div class="hatchNote">背包里暂时没有商人要收的材料。</div>`);
    body.querySelectorAll("[data-ssell]").forEach(b=>b.addEventListener("click",ev=>{
      const r=shop.sell(b.dataset.ssell,ev.shiftKey?10:1);
      if(!r.ok){CR.audio.sfx("deny");toast(r.reason);}
      renderSwampShop();refreshPanels();
    }));
    bindItemTips(body);
  }

  function switchHatch(m){
    hatchMode=m;
    document.querySelectorAll(".tradeTabs button[data-hatch]").forEach(b=>
      b.classList.toggle("on",b.dataset.hatch===m));
    renderHatchery();CR.audio.sfx("ui");
  }
  /* 低频刷新（由 forest.update 每秒调用）：只更新倒计时，不重建 DOM，避免打断点击 */
  function refreshHatchery(){
    if(!$("hatchery")||!$("hatchery").classList.contains("on"))return;
    if(hatchMode!=="nests")return;
    const body=$("hatchBody");if(!body)return;
    body.querySelectorAll("[data-nest]").forEach(el=>{
      const i=+el.dataset.nest,st=SV.hatchStatus(i);
      const bar=el.querySelector(".nestBar i"),tm=el.querySelector(".tm"),
            lab=el.querySelector(".st"),btn=el.querySelector(".nestBtn");
      if(bar)bar.style.width=(st.progress*100).toFixed(1)+"%";
      if(tm)tm.textContent=st.state==="ready"?"可以领取了":
        (st.state==="incubating"?"还需 "+st.left+" 时间":`需要 ${CFG.HATCHERY.needTime} 时间`);
      if(lab)lab.textContent=st.state==="empty"?"空蛋巢":
        (st.state==="ready"?"✦ 孵化完成":"孵化中…");
      if(btn&&st.state==="ready"&&btn.dataset.act!=="collect"){
        btn.dataset.act="collect";btn.textContent="✦ 领取夜樱";
      }
      if(st.state==="ready")el.classList.add("ready");
    });
  }
  function renderHatchery(){
    const d=SV.data,e=escapeHtml;
    $("hatchGold").textContent=d.profile.gold;
    $("hatchHint").textContent=hatchMode==="nests"?
      ("持有【夜樱蛋】×"+(d.inventory.items.sakuraEgg||0)+
       (d.progress.sakuraHatched?" · 夜樱已入队":"")):
      "每日 / 每周限量 · 按北京时间自然日与周一刷新";
    document.querySelectorAll(".tradeTabs button[data-hatch]").forEach(b=>
      b.classList.toggle("on",b.dataset.hatch===hatchMode));
    const body=$("hatchBody");
    if(hatchMode==="nests"){
      const cards=[0,1,2].map(i=>{
        const st=SV.hatchStatus(i);
        const empty=st.state==="empty",ready=st.state==="ready";
        const btn=empty?`<button class="nestBtn" data-act="put" ${(d.inventory.items.sakuraEgg||0)<=0?"disabled":""}>🥚 放入夜樱蛋</button>`:
          (ready?`<button class="nestBtn" data-act="collect">✦ 领取夜樱</button>`:
            `<button class="nestBtn" disabled>孵化中…</button>`);
        return `<div class="nest ${ready?"ready":""}" data-nest="${i}">
          <div class="egg">${empty?"🕳️":"🥚"}</div>
          <div class="st">${empty?"空蛋巢":(ready?"✦ 孵化完成":"孵化中…")}</div>
          <div class="tm">${empty?`需要 ${CFG.HATCHERY.needTime} 时间`:
            (ready?"可以领取了":"还需 "+st.left+" 时间")}</div>
          <div class="nestBar"><i style="width:${(st.progress*100).toFixed(1)}%"></i></div>
          ${btn}</div>`;
      }).join("");
      body.innerHTML=`<div class="nestGrid">${cards}</div>
        <div class="hatchNote">🌳 与德鲁伊对话即可打开孵化室。<b>放入【夜樱蛋】后需 300 时间</b>才会孵化完成，
        进度按本机时间持续推进，关掉游戏也不会中断。<br>
        夜樱蛋来自【星火港】灯塔下的夜樱 BOSS 试炼（首次获胜必得，重复获胜改为金币奖励）。<br>
        孵出的夜樱是 <b>✦ 法师 · 幽系</b>，初始 Lv.10，正好解锁她的 1 / 1 / 5 / 10 级技能。</div>`;
      body.querySelectorAll("[data-nest]").forEach(el=>{
        const btn=el.querySelector(".nestBtn");if(!btn)return;
        btn.addEventListener("click",ev=>{
          ev.stopPropagation();const i=+el.dataset.nest,act=btn.dataset.act;
          if(act==="put")CR.forest.startHatch(i);
          else if(act==="collect")CR.forest.collectHatch(i);
          renderHatchery();
        });
      });
      return;
    }
    const rows=(CFG.DRUID_GOODS||[]).map(row=>{
      const it=CFG.ITEMS[row.id];if(!it)return "";
      const left=SV.druidLeft(row),own=d.inventory.items[row.id]||0;
      const lim=row.period==="weekly"?"每周限 "+row.limit:"每日限 "+row.limit;
      return `<div class="dgRow" data-goods="${row.id}" data-tip-kind="item" data-tip-id="${row.id}">
        <div class="ic">${it.icon}</div>
        <div class="nm"><b>${e(it.name)}</b><small>${e(it.desc)}　·　${lim}　·　剩余 ${left}　·　持有 ${own}</small></div>
        <div class="pr">${row.price} 金币</div>
        <button class="buy" data-buy="${row.id}" ${left<=0?"disabled":""}>${left<=0?"已售罄":"购买"}</button></div>`;
    }).join("");
    body.innerHTML=`<div class="hatchNote">🧺 <b>德鲁伊的小摊</b>：性格、天赋与学习力相关的稀罕物。
      每日限量按北京时间自然日刷新，每周限量每周一刷新。</div>${rows}`;
    body.querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>{
      CR.forest.druidBuy(b.dataset.buy);renderHatchery();
    }));
    bindItemTips(body);
  }

  function switchTrade(mode){
    tradeMode=mode;renderTrade();CR.audio.sfx("ui");
  }
  function renderTrade(){
    if(!$("trade").classList.contains("on"))return;
    const d=SV.data,e=escapeHtml;
    const titles={sell:["港口商人 · 老锚","把用不上的材料卖给我，换点金币"],
      forge:["港口商人 · 老锚 · 锻炉","矿石 + 金币打造装备，穿戴后外观与属性都会变化"],
      black:["黑市商人 · 鸦","稀有的东西，价钱自然也稀罕"],
      forest:["林间货郎 · 阿桐","木材我收，伐木的家伙什我也卖"]};
    $("tradeTitle").textContent=titles[tradeMode][0];
    $("tradeSub").textContent=titles[tradeMode][1];
    $("tradeGold").textContent=d.profile.gold;
    $("tradeHint").textContent=tradeMode==="black"?
      "洗髓丹 / 性格重塑卡 / 学习力果实已开放 · 在背包点击使用，或按 C 打开天赋星图":
      (tradeMode==="forest"?"伐木斧 / 双人锯占【双手】槽：战士照常战斗，法师射手只能伐木":
       (tradeMode==="forge"?"锻造消耗背包材料，装备会进入背包的装备分类":"出售价格按材料品质计算"));
    document.querySelectorAll(".tradeTabs button[data-trade]").forEach(b=>
      b.classList.toggle("on",b.dataset.trade===tradeMode));
    let html="";
    if(tradeMode==="forest"){
      html=`<div class="shopRow"><div class="si">🪵</div>
        <div class="sn"><b>出售原木</b><small>持有时可点下方「出售材料」列表；单价 18 金币</small></div>
        <button id="forestToSell">切换出售</button></div>`+
        CFG.FOREST_GOODS.map(row=>{
          const k=row.k||"item";
          const it=k==="equip"?CFG.EQUIPMENT[row.id]:CFG.ITEMS[row.id];
          if(!it)return "";
          const price=row.price!==undefined?row.price:(it.price||100);
          return `<div class="shopRow tipTarget" data-tip-kind="${k==="equip"?"equip":"item"}" data-tip-id="${row.id}">
            <div class="si ${k==="equip"?"q-"+it.q:""}">${it.icon}</div>
            <div class="sn"><b class="${k==="equip"?"q-"+it.q:""}">${e(it.name)}</b>
              <small>${k==="equip"?CFG.QUALITY_NAME[it.q]+" · "+CR.equip.slotName(it.slot)+" · ":""}${e(it.desc)}</small></div>
            <button data-buy="${k}:${row.id}" ${d.profile.gold>=price?"":"disabled"}>${price} 金币</button></div>`;
        }).join("");
      html+=`<div class="dim" style="margin-top:10px">也可把林间材料卖给货郎：</div>`+
        Object.keys(CFG.MATERIALS).map(k=>{
          const mm=CFG.MATERIALS[k],n=d.inventory.mats[k]||0,price=SV.sellPrice(k);
          return `<div class="shopRow tipTarget" data-tip-kind="mat" data-tip-id="${k}">
            <div class="si" style="color:${rgb(mm.color)}">${mm.icon}</div>
            <div class="sn"><b>${e(mm.name)}</b><small>${e(mm.desc)} · 单价 ${price} 金币</small></div>
            <div class="qty">持有 ${n}</div>
            <button data-sell="${k}" ${n<=0?"disabled":""}>出售 1</button>
            <button data-sell-all="${k}" ${n<=0?"disabled":""}>全部</button></div>`;
        }).join("");
    }else if(tradeMode==="sell"){
      html=Object.keys(CFG.MATERIALS).map(k=>{
        const m=CFG.MATERIALS[k],n=d.inventory.mats[k]||0,price=SV.sellPrice(k);
        return `<div class="shopRow tipTarget" data-tip-kind="mat" data-tip-id="${k}">
          <div class="si" style="color:${rgb(m.color)}">${m.icon}</div>
          <div class="sn"><b>${e(m.name)}</b><small>${e(m.desc)} · 单价 ${price} 金币</small></div>
          <div class="qty">持有 ${n}</div>
          <button data-sell="${k}" ${n<=0?"disabled":""}>出售 1</button>
          <button data-sell-all="${k}" ${n<=0?"disabled":""}>全部</button></div>`;
      }).join("");
    }else if(tradeMode==="forge"){
      html=CFG.FORGE.map(f=>{
        const it=CFG.EQUIPMENT[f.id];if(!it)return "";
        const mats=Object.keys(f.mats).map(k=>{
          const have=d.inventory.mats[k]||0;
          return `<span class="cost">${CFG.MATERIALS[k].icon} ${CFG.MATERIALS[k].name} ${have}/${f.mats[k]}</span>`;
        }).join("");
        const ok=Object.keys(f.mats).every(k=>(d.inventory.mats[k]||0)>=f.mats[k])&&
          d.profile.gold>=f.gold;
        return `<div class="shopRow tipTarget" data-tip-kind="equip" data-tip-id="${f.id}">
          <div class="si q-${it.q}">${it.icon}</div>
          <div class="sn"><b class="q-${it.q}">${e(it.name)}</b>
            <small>${CFG.QUALITY_NAME[it.q]} · ${CR.equip.slotName(it.slot)} · ${e(it.desc)}</small>${mats}</div>
          <button data-forge="${f.id}" ${ok?"":"disabled"}>锻造 ${f.gold} 金</button></div>`;
      }).join("");
    }else{
      html=CFG.BLACK_MARKET.map(row=>{
        const k=row.k||"item";
        const it=k==="equip"?CFG.EQUIPMENT[row.id]:
          (k==="mat"?CFG.MATERIALS[row.id]:CFG.ITEMS[row.id]);
        if(!it)return "";
        const price=row.price!==undefined?row.price:(it.price||SV.sellPrice(row.id)*3);
        const locked=!!(k==="item"&&it.lockedSystem);
        const sub=k==="equip"?`${CFG.QUALITY_NAME[it.q]} · ${CR.equip.slotName(it.slot)} · ${e(it.desc)}`:
          (k==="mat"?e(it.desc):e(it.desc)+(locked?` · ⚠ v${it.lockedVer} ${e(it.lockedSystem)} 开放`:""));
        return `<div class="shopRow tipTarget ${locked?"lockedItem":""}"
            data-tip-kind="${k==="mat"?"mat":(k==="equip"?"equip":"item")}" data-tip-id="${row.id}">
          <div class="si" style="color:${rgb(it.color||C.gold)}">${it.icon}</div>
          <div class="sn"><b class="${k==="equip"?"q-"+it.q:""}">${e(it.name)}</b><small>${sub}</small></div>
          <button data-buy="${k}:${row.id}" ${d.profile.gold>=price?"":"disabled"}>${price} 金币</button></div>`;
      }).join("");
    }
    $("tradeList").innerHTML=html;
    const merchant=tradeMode==="forest"?CR.forest:CR.harbor;
    $("tradeList").querySelectorAll("[data-sell]").forEach(b=>b.addEventListener("click",()=>{
      merchant.sell(b.dataset.sell,1);renderTrade();
    }));
    $("tradeList").querySelectorAll("[data-sell-all]").forEach(b=>b.addEventListener("click",()=>{
      merchant.sell(b.dataset.sellAll,SV.data.inventory.mats[b.dataset.sellAll]||1);renderTrade();
    }));
    $("tradeList").querySelectorAll("[data-forge]").forEach(b=>b.addEventListener("click",()=>{
      CR.harbor.forge(b.dataset.forge);renderTrade();
    }));
    $("tradeList").querySelectorAll("[data-buy]").forEach(b=>b.addEventListener("click",()=>{
      merchant.buy(b.dataset.buy);renderTrade();
    }));
    const fts=$("forestToSell");if(fts)fts.addEventListener("click",()=>switchTrade("sell"));
    bindItemTips($("tradeList"));
  }

  /* ================= 1.2.0 采集进度环 ================= */
  function setGather(k,label){
    const box=$("gatherHud");if(!box)return;
    if(k<=0){box.classList.add("hide");return;}
    box.classList.remove("hide");
    const ring=box.querySelector(".gr-ring");
    if(ring)ring.style.setProperty("--p",(U.clamp(k,0,1)*360).toFixed(1)+"deg");
    $("grLabel").textContent=label||"采集中";
    $("grPct").textContent=Math.round(U.clamp(k,0,1)*100)+"%";
  }

  /* ================= 事件绑定 ================= */
  function unlockAudio(){
    CR.audio.init();CR.audio.resume();
    const s=SV.data.settings;
    CR.audio.setSfx(s.sfx);CR.audio.setMusic(s.music);
    CR.audio.setSfxVol(s.sfxVol);CR.audio.setMusicVol(s.musicVol);
  }
  /* 1.4 dev1.5：初始化分段容错。
     旧版把 4 个 build 放在最前面且无 try，一旦缓存到旧 JS（buildCards 访问已删除的
     #cards）就会抛错，导致后面所有 addEventListener 全部没执行 → 菜单按钮集体失灵。
     现在：先绑定最关键的菜单入口（逐个 try），再跑构建（逐个 try），最后置 booted。 */
  let booted=false;
  function safeBind(id,fn){
    try{const el=$(id);if(el)el.addEventListener("click",fn);}catch(e){
      try{console.warn("[CR] 绑定 "+id+" 失败",e);}catch(_){}
    }
  }
  function safeBuild(fn,name){
    try{fn();}catch(e){try{console.warn("[CR] "+name+" 构建失败",e);}catch(_){}}
  }
  function init(){
    /* ---- 第 1 段：菜单关键入口，最先绑定、互相隔离 ---- */
    safeBind("start",()=>{unlockAudio();CR.game.startBattle();});
    safeBind("btnMapMenu",()=>{unlockAudio();CR.game.openMap();});
    safeBind("btnVersion",()=>{unlockAudio();openPanel("ver");});
    safeBuild(buildCards,"buildCards");
    safeBuild(buildSkills,"buildSkills");
    safeBuild(buildSlots,"buildSlots");
    safeBuild(buildTeamHud,"buildTeamHud");
    try{$("nameInput").value=SV.data.profile.name;}catch(e){}
    try{$("charName").value=SV.data.profile.name;}catch(e){}
    /* ---- 第 2 段：其余绑定，整体兜底，任何一处失败都不阻断第 1 段 ---- */
    try{
    window.addEventListener("pointerdown",unlockAudio,{once:true});
    window.addEventListener("keydown",unlockAudio,{once:true});
    $("charName").value=SV.data.profile.name;
    window.addEventListener("pointerdown",unlockAudio,{once:true});
    window.addEventListener("keydown",unlockAudio,{once:true});
    $("nameInput").addEventListener("change",e=>{
      SV.setName(e.target.value);SV.flush();$("charName").value=SV.data.profile.name;
      toast("队伍名已保存");
    });
    $("nameInput").addEventListener("keydown",e=>{if(e.key==="Enter")e.target.blur();});
    // ---- 结算 ----
    $("btnRestart").addEventListener("click",()=>{unlockAudio();CR.game.startBattle(undefined,true);});
    $("btnOverMap").addEventListener("click",()=>{if(SV.mapUnlocked("market"))CR.game.openMap();});
    $("btnBackMenu").addEventListener("click",()=>CR.game.backMenu());
    // ---- 1.4 dev1.4 复活 / 一键补给 ----
    $("btnRevive").addEventListener("click",()=>{unlockAudio();CR.game.revive();});
    $("btnReviveMenu").addEventListener("click",()=>CR.game.backMenu());
    $("btnSupply").addEventListener("click",()=>{
      if(CR.game.inCombat&&CR.game.inCombat()){
        toast("战斗中无法补给 · 请先脱离仇恨");CR.audio.sfx("deny");return;
      }
      if(SV.data.profile.gold<100){toast("金币不足 · 一键补给需要 100 金币");CR.audio.sfx("deny");return;}
      SV.spendGold(100);SV.flush();
      const n=CR.team.supplyAll();
      CR.audio.sfx("heal");toast("💚 一键补给完成 · 全队 "+n+" 位生命 / 法力已回满 · -100 金币");
      renderBag();refreshPanels();syncHud(true);
    });
    $("charName").addEventListener("change",e=>{
      SV.setName(e.target.value);SV.flush();$("nameInput").value=SV.data.profile.name;toast("队伍名已保存");
    });
    /* 1.4 dev1.4：菜单不再用 1/2/3 选人；数字键只用于局内切换登场角色 */
    window.addEventListener("keydown",e=>{
      if(CR.game.state==="revive"&&e.code==="Enter"&&
         !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){
        CR.game.revive();
      }
    });
    // ---- 面板 ----
    $("panel").querySelectorAll(".ptabs button[data-tab]").forEach(b=>
      b.addEventListener("click",()=>{switchTab(b.dataset.tab);CR.audio.sfx("ui");}));
    $("panelClose").addEventListener("click",closePanel);
    $("quickbar").querySelectorAll("button[data-panel]").forEach(b=>
      b.addEventListener("click",()=>{
        if(panelOpen&&curTab===b.dataset.panel)closePanel();else openPanel(b.dataset.panel);
      }));
    $("btnMap").addEventListener("click",()=>CR.game.openMap());
    $("btnRegion").addEventListener("click",toggleRegion);
    $("btnPause").addEventListener("click",()=>CR.game.togglePause());
    // ---- 大地图 ----
    $("mapClose").addEventListener("click",()=>CR.game.closeMap());
    $("nodeDusk").addEventListener("click",()=>selectMap("dusk"));
    $("nodeMarket").addEventListener("click",()=>selectMap("market"));
    $("nodeHarbor").addEventListener("click",()=>selectMap("harbor"));
    $("nodeForest").addEventListener("click",()=>selectMap("forest"));
    /* 1.4 dev1.1 修复：dev1 新增节点时漏绑 click，导致沼泽点击完全无响应 */
    $("nodeSwamp").addEventListener("click",()=>selectMap("swamp"));
    /* 1.4 dev2：新地图节点，漏绑会导致点击无效（dev1.1 曾出现过同类问题） */
    if($("nodeBorder"))$("nodeBorder").addEventListener("click",()=>selectMap("border"));
    // 地图节点悬浮 / 长按显示区域情报
    document.querySelectorAll(".mapNode[data-map]").forEach(n=>{
      const tip=()=>regionMapTip(n.dataset.map);
      n.addEventListener("pointerenter",e=>{
        if(e.pointerType==="touch")return;
        clearTimeout(regionTipTimer);
        regionTipTimer=setTimeout(()=>showRegionTip(tip(),e.clientX,e.clientY),180);
      });
      n.addEventListener("pointerleave",hideRegionTip);
      n.addEventListener("touchstart",e=>{
        const t=e.touches[0];clearTimeout(regionTouchTimer);
        regionTouchTimer=setTimeout(()=>showRegionTip(tip(),t.clientX,t.clientY),420);
      },{passive:true});
      n.addEventListener("touchend",()=>{clearTimeout(regionTouchTimer);
        setTimeout(hideRegionTip,2600);});
    });
    $("mapEnter").addEventListener("click",()=>{
      if(!selectedMap)return;
      hideScreen("mapScreen");
      CR.game.enterMap(selectedMap);
    });
    // ---- 设置 ----
    $("setSfx").addEventListener("change",e=>{
      SV.setSetting("sfx",e.target.checked);SV.flush();CR.audio.setSfx(e.target.checked);
      if(e.target.checked)CR.audio.sfx("ui");
    });
    $("setMusic").addEventListener("change",e=>{
      SV.setSetting("music",e.target.checked);SV.flush();CR.audio.setMusic(e.target.checked);
    });
    $("setMusicVol").addEventListener("input",e=>{
      const v=+e.target.value/100;SV.setSetting("musicVol",v);
      CR.audio.setMusicVol(v);$("musicVolOut").textContent=e.target.value+"%";
    });
    $("setSfxVol").addEventListener("input",e=>{
      const v=+e.target.value/100;SV.setSetting("sfxVol",v);
      CR.audio.setSfxVol(v);$("sfxVolOut").textContent=e.target.value+"%";
    });
    $("setSfxVol").addEventListener("change",()=>{CR.audio.sfx("ui");SV.flush();});
    $("setMusicVol").addEventListener("change",()=>SV.flush());
    $("setClock").addEventListener("change",e=>{
      SV.setSetting("clockSource",e.target.value);SV.flush();
      if(CR.market)CR.market.applyClock();
      if(CR.harbor&&CR.world.mode==="harbor")CR.harbor.applyClock();
      renderSet();toast("时间来源已切换："+(e.target.value==="beijing"?"优先北京时间":"跟随本机时间"));
    });
    $("setNetClock").addEventListener("change",e=>{
      SV.setSetting("networkClock",e.target.checked);SV.flush();
      if(e.target.checked){CR.market.tryNetworkTime();
        if(CR.harbor)CR.harbor.tryNetworkTime();}
      toast(e.target.checked?"已开启联网校时（失败会自动回退）":"已关闭联网校时");
    });
    $("setWeather").addEventListener("change",e=>{
      SV.setSetting("weatherMode",e.target.value);SV.flush();
      const v=e.target.value;
      if(CR.game.state==="play"&&CR.world.mode==="market"){
        if(v==="auto")CR.market.setWeather(
          CR.CFG.WEATHER_ORDER[Math.floor(Math.random()*4)],false);
        else CR.market.setWeather(v,false);
      }
      /* 1.4 dev1.2 修复：天气设置此前只对狂欢集市生效，沼泽改天气完全无效。 */
      if(CR.game.state==="play"&&CR.world.mode==="swamp"&&CR.swamp.setWeather){
        CR.swamp.setWeather(v,false);
      }
      /* 1.4 dev1.3：黄昏城堡 / 魔法丛林 / 星火港 / 未来新图共用全局天气层 */
      if(CR.weather)CR.weather.setMode(v,
        CR.game.state==="play"&&(CR.world.mode==="market"||CR.world.mode==="swamp"));
      renderSet();refreshWeather();
      toast("天气设置已保存"+(CR.game.state==="play"&&CR.world.mode==="swamp"?" · 沼泽天气已切换":""));
    });
    /* 1.4 dev1.3 一键卸下 */
    const unAll=$("btnUnequipAll");
    if(unAll)unAll.addEventListener("click",()=>{
      const cls=CR.ent.player.cls||0;
      const n=CR.equip.unequipAll(cls);
      CR.audio.sfx(n?"unequip":"deny");
      toast(n?("已卸下 "+n+" 件装备 · 全部放回背包"):"当前角色没有穿戴装备");
      refreshPanels();syncHud(true);
    });
    $("bindReset").addEventListener("click",()=>{
      SV.resetBindings();SV.flush();CR.input.setBindings(SV.data.settings.bindings);
      renderBind();buildSkills();buildSlots();toast("键位已恢复默认");CR.audio.sfx("uiBig");
    });
    $("wipeBtn").addEventListener("click",()=>{
      if(!window.confirm("确定清空全部存档？队伍、强化、背包、地图进度与版本记录都会丢失。"))return;
      SV.wipe();CR.input.setBindings(SV.data.settings.bindings);
      CR.gl.setQuality(SV.data.settings.quality);CR.game.resize();
      renderBind();renderSet();renderQual();renderChar();renderTeam();renderBag();
      renderStorage();renderVersion();refreshMapLock();refreshVersionDot();
      $("nameInput").value=SV.data.profile.name;$("charName").value=SV.data.profile.name;
      buildTeamHud();toast("存档已清空");
    });
    // ---- 对话 / 商店 ----
    $("dlgNext").addEventListener("click",nextDialogue);
    $("dlgClose").addEventListener("click",()=>{hideScreen("dialogue");dialogue=null;});
    $("shopClose").addEventListener("click",()=>hideScreen("shop"));
    // ---- 1.2.0 区域情报 / 交易 / 仓库 ----
    $("regionClose").addEventListener("click",closeRegion);
    $("regionPanel").addEventListener("click",e=>{
      if(e.target===$("regionPanel"))closeRegion();});
    $("tradeClose").addEventListener("click",closeTrade);
    $("trade").addEventListener("click",e=>{if(e.target===$("trade"))closeTrade();});
    document.querySelectorAll(".tradeTabs button[data-trade]").forEach(b=>
      b.addEventListener("click",()=>switchTrade(b.dataset.trade)));
    $("whToggle").addEventListener("click",toggleWarehouseView);
    // ---- 1.3.1 孵化室 / 德鲁伊小摊 ----
    $("hatchClose").addEventListener("click",closeHatchery);
    $("hatchery").addEventListener("click",ev=>{if(ev.target===$("hatchery"))closeHatchery();});
    document.querySelectorAll(".tradeTabs button[data-hatch]").forEach(b=>
      b.addEventListener("click",()=>switchHatch(b.dataset.hatch)));
    // ---- 1.4 dev1 任务档案 / 沼泽商店 ----
    $("questClose").addEventListener("click",closeQuest);
    $("questPanel").addEventListener("click",ev=>{if(ev.target===$("questPanel"))closeQuest();});
    document.querySelectorAll(".tradeTabs button[data-quest]").forEach(b=>
      b.addEventListener("click",()=>switchQuest(b.dataset.quest)));
    $("swampShopClose").addEventListener("click",closeSwampShop);
    $("swampShop").addEventListener("click",ev=>{if(ev.target===$("swampShop"))closeSwampShop();});
    document.querySelectorAll(".tradeTabs button[data-swampShop]").forEach(b=>
      b.addEventListener("click",()=>switchSwampShop(b.dataset.swampShop)));
    // ---- 1.1.0 装备库 / 经验池 / 物品提示 ----
    $("eqLibClose").addEventListener("click",closeEquipLib);
    $("equipLib").addEventListener("click",e=>{if(e.target===$("equipLib"))closeEquipLib();});
    $("growClose").addEventListener("click",closeGrow);
    $("grow").addEventListener("click",e=>{if(e.target===$("grow"))closeGrow();});
    document.querySelectorAll(".expBtns button[data-exp]").forEach(b=>
      b.addEventListener("click",()=>allocateExp(b.dataset.exp)));
    window.addEventListener("scroll",()=>{hideItemTip();hideRegionTip();},{passive:true});
    setGather(0,"");
    // ---- 初始化渲染 ----
    renderQual();renderSet();renderBind();renderStorage();renderVersion();
    renderChar();renderTeam();renderBag();refreshMapLock();refreshVersionDot();
    renderRegion();renderTrade();renderHatchery();renderQuest();renderSwampShop();
    showMenu();
    }catch(e){
      try{console.error("[CR] UI 次级初始化异常已隔离",e);}catch(_){}
    }
    booted=true;   /* 启动自检据此判断菜单入口已就绪 */
  }
  CR.ui={init,showMenu,showPlay,showOver,openPanel,closePanel,togglePanel,refreshPanels,
    syncHud,tick,banner,toast,setQuality,renderSet,renderVersion,refreshVersionDot,
    renderBag,renderChar,renderTeam,renderBind,renderStorage,renderQual,
    buildCards,buildSkills,buildSlots,buildTeamHud,showRevive,charName,classTag,openMap,closeMap:()=>hideScreen("mapScreen"),
    refreshMapLock,selectMap,openDialogue,openShop,renderShop,putSlot,
    setWorldLabels,setInteractHint,flashGround,refreshWeather,showScreen,hideScreen,hideAllScreens,
    renderEquip,renderExpPool,renderEquipLib,openEquipLib,closeEquipLib,bindItemTips,
    hideItemTip,refreshAll,updateChargeHud,tipOf,showItemTip,allocateExp,
    renderWarehouse,toggleWarehouseView,
    openRegion,closeRegion,toggleRegion,renderRegion,showRegionTip,hideRegionTip,regionMapTip,
    openTrade,closeTrade,switchTrade,renderTrade,setGather,
    openHatchery,closeHatchery,switchHatch,renderHatchery,refreshHatchery,
    openQuest,closeQuest,switchQuest,renderQuest,renderBattleBox,
    openSwampShop,closeSwampShop,switchSwampShop,renderSwampShop,
    openGrow,closeGrow,openTalent,renderGrow,renderTalent,renderSkillCfg,
    get panelOpen(){return panelOpen;},get picked(){return picked;},get booted(){return booted;},
    get libOpen(){return $("equipLib").classList.contains("on");},
    get regionOpen(){return $("regionPanel").classList.contains("on");},
    get tradeOpen(){return $("trade").classList.contains("on");},
    get hatcheryOpen(){return $("hatchery").classList.contains("on");},
    get questOpen(){return $("questPanel").classList.contains("on");},
    get swampShopOpen(){return $("swampShop").classList.contains("on");},
    get growOpen(){return $("grow").classList.contains("on");},
    get curTab(){return curTab;},get selectedMap(){return selectedMap;},
    get dialogueOpen(){return $("dialogue").classList.contains("on");},
    get shopOpen(){return $("shop").classList.contains("on");}};
})(window.CR=window.CR||{});
