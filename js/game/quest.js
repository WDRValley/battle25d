/* quest.js — v1.4 dev1 任务档案（主线 / 支线）
 * 与薇拉对话打开【任务档案】面板；主线先立档案与进度追踪，
 * 完整剧情链与古神庙退潮进入留到 dev2。
 */
(function(CR){
  "use strict";
  const CFG=CR.CFG,SV=CR.save,U=CR.u;
  let open=false;

  function data(){
    const d=SV.data;
    if(!d.quests)d.quests={main:{},side:{},accepted:[],done:[]};
    if(!d.quests.main)d.quests.main={};
    if(!d.quests.side)d.quests.side={};
    if(!d.quests.accepted)d.quests.accepted=[];
    if(!d.quests.done)d.quests.done=[];
    return d.quests;
  }
  function all(){
    const out=[];
    (CFG.QUESTS.main||[]).forEach(q=>out.push(Object.assign({kind:"main"},q)));
    (CFG.QUESTS.side||[]).forEach(q=>out.push(Object.assign({kind:"side"},q)));
    return out;
  }
  function find(id){return all().find(q=>q.id===id)||null;}
  function state(id){
    const q=data(),q0=find(id);if(!q0)return "locked";
    if(q.done.indexOf(id)>=0)return "done";
    const rec=q[q0.kind][id];
    if(rec&&rec.state==="done")return "done";
    if(rec&&rec.state==="accepted")return "accepted";
    return q0.state||"open";
  }
  function progressOf(id){
    const q=find(id),rec=data()[q?q.kind:"main"][id];
    return rec?rec.prog||0:0;
  }
  function targetText(q){
    const t=q.target||{};
    if(t.type==="item")return CFG.MATERIALS[t.id]?
      CFG.MATERIALS[t.id].name+" ×"+t.n:(t.id+" ×"+t.n);
    if(t.type==="kill")return "击败 "+(CFG.MOBS[t.type2]?CFG.MOBS[t.type2].label:t.type2)+" ×"+t.n;
    if(t.type==="visit")return "前往 "+((CFG.MAPS.find(m=>m.id===t.map)||{}).name||t.map);
    if(t.type==="boss")return "击败 "+(CFG.MOBS[t.id]?CFG.MOBS[t.id].label:t.id);
    return "—";
  }
  function rewardText(q){
    const r=q.reward||{},a=[];
    if(r.gold)a.push(r.gold+" 金币");
    if(r.exp)a.push("可分配经验 +"+r.exp);
    if(r.beans)a.push("晶豆 +"+r.beans);
    if(r.items)for(const k in r.items){
      const n=r.items[k];
      a.push(((CFG.MATERIALS[k]||CFG.ITEMS[k]||{}).name||k)+" ×"+n);
    }
    if(r.spiritShard)a.push("灵石碎片 ×"+r.spiritShard);
    return a.join(" · ")||"无";
  }
  function accept(id){
    const q=find(id);if(!q)return {ok:false,reason:"任务不存在"};
    const d=data();
    if(state(id)!=="open")return {ok:false,reason:"该任务当前不可接取"};
    d[q.kind][id]={state:"accepted",prog:0};
    d.accepted.push(id);SV.mark();SV.flush();
    return {ok:true,name:q.title};
  }
  function canTurnIn(id){
    const q=find(id);if(!q||state(id)!=="accepted")return false;
    const t=q.target||{};
    if(t.type==="item")return (SV.data.inventory.mats[t.id]||0)>=t.n;
    if(t.type==="kill"||t.type==="visit")return progressOf(id)>=(t.n||1);
    if(t.type==="boss")return progressOf(id)>=1;
    return true;
  }
  /* 进度推送：kill / visit / item 变化时由各系统调用 */
  function push(type,payload){
    const d=data();let changed=false;
    all().forEach(q=>{
      if(state(q.id)!=="accepted")return;
      const t=q.target||{};
      let ok=false;
      if(t.type==="kill"&&type==="kill"&&payload.type===t.type2)ok=true;
      else if(t.type==="visit"&&type==="visit"&&payload.map===t.map)ok=true;
      else if(t.type==="boss"&&type==="kill"&&payload.type===t.id)ok=true;
      if(!ok)return;
      const rec=d[q.kind][q.id];if(!rec)return;
      rec.prog=(rec.prog||0)+1;changed=true;
      try{CR.ui.toast("任务进度 · "+q.title+" "+rec.prog+"/"+(t.n||1));}catch(e){}
    });
    if(changed){SV.mark();SV.flush();}
    return changed;
  }
  function turnIn(id){
    const q=find(id);if(!q)return {ok:false,reason:"任务不存在"};
    if(state(id)!=="accepted")return {ok:false,reason:"请先接取该任务"};
    if(!canTurnIn(id))return {ok:false,reason:"目标尚未完成："+targetText(q)};
    const d=data(),t=q.target||{},r=q.reward||{};
    if(t.type==="item")SV.data.inventory.mats[t.id]=Math.max(0,(SV.data.inventory.mats[t.id]||0)-t.n);
    if(r.gold)SV.addGold(r.gold);
    if(r.exp)SV.addExpPool(r.exp);
    if(r.beans){
      const cls=CR.ent&&CR.ent.player?CR.ent.player.cls:0;
      const ch=SV.charData(cls);ch.talent.beans=(ch.talent.beans||0)+r.beans;
    }
    if(r.items)for(const k in r.items){
      if(CFG.MATERIALS[k])SV.addMat(k,r.items[k]);else SV.addItem(k,r.items[k]);
    }
    if(r.spiritShard)SV.addMat("spiritShard",r.spiritShard);
    d[q.kind][id].state="done";d.done.push(id);
    SV.mark();SV.flush();
    CR.audio.sfx("bounty");CR.audio.sfx("coin");
    try{CR.ui.banner("📜 任务完成 · "+q.title);CR.ui.toast("奖励："+rewardText(q));}catch(e){}
    return {ok:true,name:q.title,reward:rewardText(q)};
  }
  function list(){
    return {main:(CFG.QUESTS.main||[]).map(q=>({q,state:state(q.id),prog:progressOf(q.id),
        target:targetText(q),reward:rewardText(q),canTurn:canTurnIn(q.id)})),
      side:(CFG.QUESTS.side||[]).map(q=>({q,state:state(q.id),prog:progressOf(q.id),
        target:targetText(q),reward:rewardText(q),canTurn:canTurnIn(q.id)}))};
  }
  function isOpen(){return open;}
  function setOpen(v){open=!!v;}
  CR.quest={data,all,find,state,progressOf,targetText,rewardText,
    accept,canTurnIn,push,turnIn,list,isOpen,setOpen};
})(window.CR=window.CR||{});
