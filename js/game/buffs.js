/* buffs.js — v1.4 dev5.1.1 通用 BUFF 容器
   《标准副件悬浮文本框架 V3.0》【名称解释】所对应的游戏内机制：
     1) 不同名增益在同一乘区里加算：
        技能威力 50 × (100% + 「威力提升」12% + 「威力提升 · 神兵」30%) = 71
     2) 同名 BUFF 顶替：先比「剩余时间长」，时间相同再比「数值高」：
        威力提升(33%,40s) 与 威力提升(45%,30s) → 生效 33%/40s
        威力提升(30%,40s) 与 威力提升(60%,40s) → 生效 60%/40s
     3) 常驻 BUFF（dur 为空 / 0）时间无限，不被计时清除。
     4) BUFF 按【队伍槽位】隔离，切换角色绝不传递；后台角色的临时 BUFF
        仍然继续倒计时，切回来看到的是已经走过的时间。
   护盾（battlecore.shieldsOf）与旧式 P.buff 由 team.js 按同样规则快照 / 恢复。 */
(function(CR){
  "use strict";
  const U=CR.u;
  /* key = "c0".."c3"（队伍槽位），与角色实体无关，换人自动换 key */
  const store={};
  let uid=1;

  function key(slot){
    /* 已是 "c0".."c3" 的槽位键直接返回；否则按数字槽位或当前出战槽位生成。
       早期版本对字符串做 (slot|0) 会把 "c1" 也折算成 c0，导致按角色隔离失效。 */
    if(typeof slot==="string"&&/^c\d$/.test(slot))return slot;
    if(slot!==undefined&&slot!==null)return "c"+(slot|0);
    try{return "c"+(CR.save.data.team.active|0);}catch(err){return "c0";}
  }
  function bag(k){
    if(!store[k])store[k]=[];
    return store[k];
  }
  function owner(){return key();}

  function remaining(b){return b.permanent?Infinity:Math.max(0,b.left);}
  function clone(o){
    const dur=(o.dur===undefined||o.dur===null||o.dur<=0)?null:o.dur;
    return {uid:uid++,name:String(o.name||"增益"),value:+o.value||0,
      group:o.group||"misc",icon:o.icon||"✦",kind:o.kind||"buff",
      bold:!!o.bold,desc:o.desc||"",
      dur:dur,permanent:!dur,left:dur||Infinity,max:dur||Infinity,
      src:o.src||""};
  }

  /* 同名顶替：剩余时间长优先 → 相同取数值高 */
  function apply(slot,o){
    const k=key(slot),arr=bag(k),n=clone(o);
    const idx=arr.findIndex(b=>b.name===n.name);
    if(idx<0){arr.push(n);return {kept:false,buff:n,replaced:null};}
    const old=arr[idx],ro=remaining(old),rn=remaining(n);
    let keepOld=false;
    if(ro>rn+1e-6)keepOld=true;
    else if(Math.abs(ro-rn)<=1e-6&&Math.abs(old.value)>=Math.abs(n.value))keepOld=true;
    if(keepOld)return {kept:true,buff:old,replaced:n};
    arr[idx]=n;
    return {kept:false,buff:n,replaced:old};
  }

  /* 同一乘区内：不同名增益加算（同名已被顶替，不会重复计入） */
  function sum(slot,group){
    const arr=bag(key(slot));
    let v=0;
    for(const b of arr)if(!group||b.group===group)v+=b.value;
    return v;
  }
  function value(slot,name){
    const b=bag(key(slot)).find(x=>x.name===name);
    return b?b.value:0;
  }
  function left(slot,name){
    const b=bag(key(slot)).find(x=>x.name===name);
    return b?remaining(b):0;
  }
  function has(slot,name){return bag(key(slot)).some(x=>x.name===name);}
  function list(slot){return bag(key(slot)).slice();}
  function clear(slot){store[key(slot)]=[];}
  function clearAll(){for(const k in store)delete store[k];}
  function remove(slot,name){
    const k=key(slot);store[k]=bag(k).filter(b=>b.name!==name);
  }

  /* 全局 tick：前台 + 后台所有角色一起走时间；常驻不动 */
  function tick(dt){
    if(!(dt>0))return;
    for(const k in store){
      const arr=store[k];
      for(let i=arr.length-1;i>=0;i--){
        const b=arr[i];
        if(b.permanent)continue;
        b.left-=dt;
        if(b.left<=1e-6)arr.splice(i,1);
      }
    }
  }
  /* 威力乘区：1 + 所有 power 组增益之和 */
  function powerMul(slot){return 1+sum(slot,"power");}
  /* 演示 / QA：按 V3.0 例子算一次最终威力 */
  function finalPower(slot,base){
    return Math.round((base||0)*powerMul(slot)*100)/100;
  }

  CR.buffs={key,owner,apply,sum,value,left,has,list,clear,clearAll,remove,
    tick,powerMul,finalPower,
    get store(){return store;}};
})(window.CR=window.CR||{});
