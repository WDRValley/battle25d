/* ui.js — 全部 DOM 界面：菜单、角色面板、背包、设置、改键、HUD、结算 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save;
  const $=id=>document.getElementById(id);
  let picked=0,panelOpen=false,curTab="char";
  let bannerT=0,toastT=0,hudT=0,fpsT=0,fps=60,frames=0;
  let captureAction=null;
  const skillEls=[];

  /* ================= 菜单 ================= */
  function buildCards(){
    const box=$("cards");box.innerHTML="";
    CFG.CLASSES.forEach((c,i)=>{
      const d=document.createElement("div");
      d.className="card"+(i===0?" sel":"");d.dataset.i=i;
      const labels=["生存","术能","机动","护甲"];
      d.innerHTML=`<div class="icon" style="color:${rgb(c.color)}">${c.icon}</div>
        <div class="cname">${c.name}</div><div class="ctitle">${c.title}</div>
        <div class="cdesc">${c.desc}</div>`+
        c.stats.map((v,j)=>`<div class="stat"><span>${labels[j]}</span><b><i style="width:${v}%"></i></b></div>`).join("")+
        `<div class="sks">`+c.skills.map((s,k)=>`<span>${"QERT"[k]}·${s.name}</span>`).join("")+`</div>`;
      d.addEventListener("click",()=>pick(i));
      box.appendChild(d);
    });
  }
  function rgb(c){return `rgb(${Math.round(c[0]*255)},${Math.round(c[1]*255)},${Math.round(c[2]*255)})`;}
  function pick(i){
    picked=i;
    const cs=$("cards").children;
    for(let j=0;j<cs.length;j++)cs[j].classList.toggle("sel",j===i);
    CR.audio.sfx("ui");
    CR.audio.init();
  }
  function buildSkills(){
    const box=$("skills");box.innerHTML="";skillEls.length=0;
    const c=CFG.CLASSES[SV.data.profile.cls];
    for(let i=0;i<4;i++){
      const d=document.createElement("div");d.className="skill";
      d.innerHTML=`<div class="ico">${c.skills[i].icon}</div>
        <div class="key">Q</div><div class="nm">${c.skills[i].name}</div>
        <div class="cdmask"></div><div class="cdnum"></div>`;
      box.appendChild(d);
      skillEls.push({root:d,key:d.querySelector(".key"),ico:d.querySelector(".ico"),
        nm:d.querySelector(".nm"),mask:d.querySelector(".cdmask"),num:d.querySelector(".cdnum")});
    }
  }

  /* ================= 状态切换 ================= */
  function showMenu(){
    document.body.classList.remove("playing");
    $("menu").classList.remove("hide");
    $("over").classList.add("hide");
    $("hud").classList.remove("on");
    closePanel();
    $("nameInput").value=SV.data.profile.name;
    CR.audio.setScene("menu");
  }
  function showPlay(){
    document.body.classList.add("playing");
    $("menu").classList.add("hide");
    $("over").classList.add("hide");
    $("hud").classList.add("on");
    closePanel();
    buildSkills();
    $("pname").textContent=SV.data.profile.name;
    syncHud(true);
  }
  function showOver(win,info){
    document.body.classList.remove("playing");
    $("hud").classList.remove("on");
    closePanel();
    $("over").classList.remove("hide");
    $("overTitle").textContent=win?"远 征 胜 利":"英 雄 倒 下";
    $("overTitle").style.color=win?"#ffd784":"#ff8a7a";
    $("overStats").innerHTML=
      `用时 <b>${info.time.toFixed(1)}</b> 秒　·　等级 <b>${SV.data.profile.level}</b><br>`+
      `击杀 <b>${info.kills}</b>　·　最高连击 <b>${info.combo}</b>　·　本局金币 <b>+${info.gold}</b><br>`+
      `总金币 <b>${SV.data.profile.gold}</b>　·　累计胜场 <b>${SV.data.stats.wins}</b><br>`+
      `<span class="dim">按 回车 或点击下方按钮再来一局</span>`;
  }

  /* ================= 面板 ================= */
  function openPanel(tab){
    panelOpen=true;curTab=tab||"char";
    $("panel").classList.remove("hide");
    switchTab(curTab);
    refreshPanels();
    CR.audio.sfx("ui");
  }
  function closePanel(){
    panelOpen=false;
    $("panel").classList.add("hide");
    $("captureMask").classList.add("hide");
    if(captureAction){CR.input.cancelCapture();captureAction=null;}
  }
  function togglePanel(){panelOpen?closePanel():openPanel("char");}
  function switchTab(t){
    curTab=t;
    const tabs=document.querySelectorAll("#panel .ptabs button[data-tab]");
    tabs.forEach(b=>b.classList.toggle("on",b.dataset.tab===t));
    ["char","bag","set","help"].forEach(k=>$("tab"+k[0].toUpperCase()+k.slice(1)).classList.toggle("on",k===t));
    if(t==="set"){renderSet();renderBind();renderQual();renderStorage();}
    if(t==="bag")renderBag();
    if(t==="char")renderChar();
  }
  function refreshPanels(){
    if(!panelOpen)return;
    renderBag();renderChar();renderStorage();
  }

  /* ---------- 角色 ---------- */
  function renderChar(){
    const d=SV.data,c=CFG.CLASSES[d.profile.cls],st=SV.effStats();
    $("charAvatar").textContent=c.icon;
    $("charAvatar").style.color=rgb(c.color);
    if(document.activeElement!==$("charName"))$("charName").value=d.profile.name;
    $("charLv").textContent="Lv."+d.profile.level;
    $("charMeta").innerHTML=`${c.name} · ${c.title}　|　经验 ${d.profile.exp} / ${SV.expNeed(d.profile.level)}　|　`+
      `总胜场 ${d.stats.wins} / ${d.stats.runs} 局`;
    const rows=[
      ["最大生命",st.hp,""],["攻击力",st.atk,""],["移动速度",st.spd.toFixed(2),""],
      ["暴击率",(st.crit*100).toFixed(1),"%"],["护甲",st.armor,""],
      ["射程",st.range,"px"],["技能数",4,"个"]
    ];
    $("charStats").innerHTML=rows.map(r=>
      `<div class="statCard"><div class="k">${r[0]}</div><div class="v">${r[1]}<small> ${r[2]}</small></div></div>`).join("");
    $("charUpgrades").innerHTML=CFG.UPGRADES.map(u=>{
      const lv=d.profile.upgrades[u.id]||0,cost=SV.upgradeCost(u.id);
      const txt=cost.map(x=>`${CFG.MATERIALS[x.m].name}×${x.n}`).join(" + ");
      const ok=SV.canUpgrade(u.id);
      return `<div class="upRow"><div class="un">${u.name} <span class="dim">Lv.${lv}</span></div>
        <div class="ud">${u.desc}</div><div class="uc">${txt}</div>
        <button data-up="${u.id}" ${ok?"":"disabled"}>强化</button></div>`;
    }).join("");
    $("charUpgrades").querySelectorAll("button[data-up]").forEach(b=>{
      b.addEventListener("click",()=>{
        if(SV.doUpgrade(b.dataset.up)){
          CR.audio.sfx("levelup");toast("强化成功！"+CFG.UPGRADES.find(u=>u.id===b.dataset.up).name+" 提升");
          renderChar();renderBag();SV.flush();
          if(CR.game.state==="play")CR.ent.applyStats(); // 原地套用新属性，不打断关卡
        }else{CR.audio.sfx("error");toast("材料不足");}
      });
    });
    const col=d.stats.collected;
    const mats=Object.keys(CFG.MATERIALS).map(k=>
      `<div>${CFG.MATERIALS[k].icon} ${CFG.MATERIALS[k].name} <b>${col[k]||0}</b></div>`).join("");
    $("charCollect").innerHTML=`<div class="collect">${mats}</div>
      <div class="dim" style="margin-top:9px;line-height:1.9">
      累计击杀 ${d.stats.kills} · 最高连击 ${d.stats.bestCombo} · 累计金币 ${d.stats.totalGold}<br>
      总游玩时长 ${(d.stats.playTime/60).toFixed(1)} 分钟 · 最近战绩 ${d.stats.history.length} 条</div>`;
  }
  /* ---------- 背包 ---------- */
  function renderBag(){
    const d=SV.data;
    $("bagGold").textContent=d.profile.gold;
    let count=0;for(const k in d.inventory.mats)count+=d.inventory.mats[k];
    for(const k in d.inventory.items)count+=d.inventory.items[k];
    $("bagCount").textContent="物品总数 "+count+" 件 · 自动保存到本地";
    $("bagMats").innerHTML=Object.keys(CFG.MATERIALS).map(k=>{
      const m=CFG.MATERIALS[k],n=d.inventory.mats[k]||0;
      return `<div class="cell ${n?"":"empty"}"><div class="ci" style="color:${rgb(m.color)}">${m.icon}</div>
        <div class="cn">${m.name}</div><div class="cq">${n}</div><div class="cd">${m.desc}</div></div>`;
    }).join("");
    $("bagItems").innerHTML=Object.keys(CFG.ITEMS).map(k=>{
      const it=CFG.ITEMS[k],n=d.inventory.items[k]||0;
      return `<div class="cell ${n?"":"empty"}" data-item="${k}"><div class="ci" style="color:${rgb(it.color)}">${it.icon}</div>
        <div class="cn">${it.name}</div><div class="cq">${n}</div><div class="cd">${it.desc}</div></div>`;
    }).join("");
    $("bagItems").querySelectorAll(".cell[data-item]:not(.empty)").forEach(el=>{
      el.addEventListener("click",()=>CR.combat.useItem(el.dataset.item));
    });
  }
  /* ---------- 设置 ---------- */
  function renderSet(){
    const s=SV.data.settings;
    $("setSfx").checked=s.sfx;$("setMusic").checked=s.music;
    $("setMusicVol").value=Math.round(s.musicVol*100);
    $("setSfxVol").value=Math.round(s.sfxVol*100);
    $("musicVolOut").textContent=Math.round(s.musicVol*100)+"%";
    $("sfxVolOut").textContent=Math.round(s.sfxVol*100)+"%";
    const names={menu:"主菜单 · 静谧",field:"翠风原野 · 行进",battle:"赤霞隘口 · 战斗",
      boss:"黑石城堡 · 决战",victory:"胜利",defeat:"败北"};
    $("musicScene").textContent=names[CR.audio.scene]||CR.audio.scene;
    $("audioState").textContent="音频状态："+(CR.audio.ready?CR.audio.ctxState:"待用户交互后启动");
  }
  function renderQual(){
    $("qualRow").innerHTML=Object.keys(CFG.QUALITY).map(k=>{
      const q=CFG.QUALITY[k];
      return `<button class="qual ${CR.gl.quality===k?"on":""}" data-q="${k}"><b>${q.name}</b><span>${q.label}</span></button>`;
    }).join("");
    $("qualRow").querySelectorAll("button[data-q]").forEach(b=>{
      b.addEventListener("click",()=>setQuality(b.dataset.q));
    });
  }
  function setQuality(q){
    SV.setSetting("quality",q);SV.flush();
    CR.gl.setQuality(q);CR.game.resize();
    renderQual();toast("画质已切换为「"+CFG.QUALITY[q].name+"」");
    CR.audio.sfx("ui");
  }
  function renderBind(){
    const kb=SV.data.settings.bindings,L=CFG.KEY_LABELS;
    $("bindList").innerHTML=CFG.ACTIONS.map(a=>
      `<div class="bindRow"><div class="bn">${a.name}</div>
       <div class="bk">${L[kb[a.id]]||kb[a.id]}</div>
       <button data-bind="${a.id}">修改</button></div>`).join("");
    $("bindList").querySelectorAll("button[data-bind]").forEach(b=>{
      b.addEventListener("click",()=>startCapture(b.dataset.bind));
    });
  }
  function startCapture(action){
    const a=CFG.ACTIONS.find(x=>x.id===action);
    captureAction=action;
    $("capAction").textContent=a?a.name:action;
    $("captureMask").classList.remove("hide");
    CR.input.setCapture(action,code=>{
      $("captureMask").classList.add("hide");
      captureAction=null;
      if(!code){renderBind();return;}
      SV.setBinding(action,code);SV.flush();
      CR.input.setBindings(SV.data.settings.bindings);
      renderBind();buildSkills();
      toast("已把 "+a.name+" 改为 "+(CFG.KEY_LABELS[code]||code));
      CR.audio.sfx("uiBig");
    });
  }
  function renderStorage(){
    const u=SV.usage();
    const kb=(u.used/1024).toFixed(1),pct=Math.min(100,(u.ratio*100)).toFixed(2);
    $("storageInfo").innerHTML=
      `<div class="dim">已用 <b style="color:var(--gold)">${kb} KB</b> / ${(u.budget/1024/1024).toFixed(0)} MB（${pct}%）`+
      `　·　${u.available?"localStorage 可用":"存储不可用"}　·　键： castleRaid.save.v3</div>
       <div class="storageBar"><i style="width:${Math.max(1,pct)}%"></i></div>
       <div class="dim">设置、角色名、等级、强化、背包、键位与战绩都会自动写入；超过 90% 预算时会自动裁剪历史记录。</div>`;
  }

  /* ================= HUD ================= */
  function syncHud(force){
    if(!force&&hudT>0)return;
    hudT=.08;
    const P=CR.ent.player,W=CR.world,d=SV.data;
    $("hpFill").style.width=(U.clamp(P.hp/P.maxHp,0,1)*100)+"%";
    $("hpTxt").textContent=Math.ceil(P.hp)+"/"+P.maxHp;
    $("mpFill").style.width=U.clamp(P.energy/P.maxEnergy,0,1)*100+"%";
    $("mpTxt").textContent=Math.floor(P.energy)+"/"+P.maxEnergy;
    $("xpFill").style.width=(U.clamp(d.profile.exp/SV.expNeed(d.profile.level),0,1)*100)+"%";
    $("pname").textContent=d.profile.name+" · "+CFG.CLASSES[P.cls].name;
    $("pzone").textContent="WAVE "+Math.min(W.waveIdx+1,CFG.WAVES.length)+" / "+CFG.WAVES.length;
    $("zoneName").textContent=CFG.ZONES[W.zoneIdx].name;
    $("gold").textContent=d.profile.gold;
    $("kills").textContent=W.kills;
    $("comboN").textContent=W.combo;
    $("runInfo").textContent="用时 "+W.playTime.toFixed(1)+"s · 最高连击 "+W.bestCombo;
    // 技能格
    const c=CFG.CLASSES[P.cls],kb=SV.data.settings.bindings;
    for(let i=0;i<4;i++){
      const el=skillEls[i];if(!el)continue;
      const sk=c.skills[i],cd=P.cd[i],mx=P.cdMax[i]||sk.cd;
      el.ico.textContent=sk.icon;el.nm.textContent=sk.name;
      el.key.textContent=CFG.KEY_LABELS[kb["s"+(i+1)]]||"?";
      const ratio=U.clamp(cd/mx,0,1);
      el.mask.style.height=(ratio*100)+"%";
      el.num.textContent=cd>0?cd.toFixed(1):"";
      el.num.style.opacity=cd>0?1:0;
      el.root.classList.toggle("noenergy",P.energy<sk.cost);
      el.root.classList.toggle("ready",cd<=0&&P.energy>=sk.cost);
      el.root.classList.toggle("charge",i===0&&CR.input.charging);
    }
    // 连击
    const cb=$("combo");
    if(W.combo>=2){cb.textContent=W.combo+" COMBO";cb.classList.add("on");}
    else cb.classList.remove("on");
    // BUFF
    const bs=[];
    if(P.buff.t>0){
      if(P.buff.dmg>0)bs.push("战吼 +"+(P.buff.dmg*100).toFixed(0)+"%攻击");
      if(P.buff.spd>0)bs.push("加速 +"+(P.buff.spd*100).toFixed(0)+"%");
      if(P.buff.shield>0)bs.push("护盾 "+Math.ceil(P.buff.shield));
      bs.push(P.buff.t.toFixed(1)+"s");
    }
    $("buffs").innerHTML=bs.map(t=>`<span class="buff">${t}</span>`).join("");
    // BOSS 血条
    const boss=W.bossRef;
    if(boss&&boss.alive&&boss.hp>0){
      $("bossbar").classList.remove("hide");
      $("bossName").textContent=CFG.MOBS.boss.label;
      $("bossFill").style.width=(U.clamp(boss.hp/boss.maxHp,0,1)*100)+"%";
    }else $("bossbar").classList.add("hide");
  }
  function tick(dt){
    hudT-=dt;bannerT-=dt;toastT-=dt;
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
  function banner(txt){
    const b=$("banner");b.textContent=txt;b.classList.add("on");bannerT=1.9;
  }
  function toast(txt){
    const t=$("toast");t.textContent=txt;t.classList.add("on");toastT=2.0;
  }

  /* ================= 事件绑定 ================= */
  function unlockAudio(){
    CR.audio.init();CR.audio.resume();
    const s=SV.data.settings;
    CR.audio.setSfx(s.sfx);CR.audio.setMusic(s.music);
    CR.audio.setSfxVol(s.sfxVol);CR.audio.setMusicVol(s.musicVol);
  }
  function init(){
    buildCards();buildSkills();
    $("nameInput").value=SV.data.profile.name;
    $("charName").value=SV.data.profile.name;
    // 音频需在首次用户手势后解锁
    window.addEventListener("pointerdown",unlockAudio,{once:true});
    window.addEventListener("keydown",unlockAudio,{once:true});
    // 菜单 / 结算
    $("start").addEventListener("click",()=>{unlockAudio();CR.game.start(picked);});
    $("btnRestart").addEventListener("click",()=>{unlockAudio();CR.game.start(picked);});
    $("btnBackMenu").addEventListener("click",()=>CR.game.backMenu());
    $("nameInput").addEventListener("change",e=>{
      SV.setName(e.target.value);SV.flush();$("charName").value=SV.data.profile.name;
      $("pname").textContent=SV.data.profile.name;toast("角色名已保存");
    });
    $("charName").addEventListener("change",e=>{
      SV.setName(e.target.value);SV.flush();$("nameInput").value=SV.data.profile.name;
      $("pname").textContent=SV.data.profile.name;toast("角色名已保存");
    });
    // 菜单键盘选人 / 快速开始
    window.addEventListener("keydown",e=>{
      if(CR.input.capturing)return;
      if(CR.game.state==="menu"){
        if(e.code==="Digit1")pick(0);if(e.code==="Digit2")pick(1);if(e.code==="Digit3")pick(2);
      }
    });
    // 面板
    $("panel").querySelectorAll(".ptabs button[data-tab]").forEach(b=>{
      b.addEventListener("click",()=>{switchTab(b.dataset.tab);CR.audio.sfx("ui");});
    });
    $("panelClose").addEventListener("click",closePanel);
    $("quickbar").querySelectorAll("button[data-panel]").forEach(b=>{
      b.addEventListener("click",()=>{panelOpen&&curTab===b.dataset.panel?closePanel():openPanel(b.dataset.panel);});
    });
    $("btnPause").addEventListener("click",()=>CR.game.togglePause());
    // 设置
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
    $("bindReset").addEventListener("click",()=>{
      SV.resetBindings();SV.flush();CR.input.setBindings(SV.data.settings.bindings);
      renderBind();buildSkills();toast("键位已恢复默认");CR.audio.sfx("uiBig");
    });
    $("wipeBtn").addEventListener("click",()=>{
      if(!window.confirm("确定清空全部存档？角色、强化、背包、键位与战绩都会丢失。"))return;
      SV.wipe();CR.input.setBindings(SV.data.settings.bindings);
      CR.gl.setQuality(SV.data.settings.quality);CR.game.resize();
      renderBind();renderSet();renderQual();renderChar();renderBag();renderStorage();
      $("nameInput").value=SV.data.profile.name;$("charName").value=SV.data.profile.name;
      toast("存档已清空");
    });
    renderQual();renderSet();renderBind();renderStorage();renderChar();renderBag();
    showMenu();
  }
  CR.ui={init,showMenu,showPlay,showOver,openPanel,closePanel,togglePanel,refreshPanels,
    syncHud,tick,banner,toast,setQuality,renderSet,
    get panelOpen(){return panelOpen;},get picked(){return picked;},get curTab(){return curTab;}};
})(window.CR=window.CR||{});
