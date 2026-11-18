/* storage.js — localStorage 封装，含 5MB 预算控制（支持多存档键） */
(function(CR){
  "use strict";
  const KEY="castleRaid.save.v1";
  const BUDGET=5*1024*1024;
  const WARN=BUDGET*0.90;
  let available=true,lastError="";
  try{const t="__cr_test__";localStorage.setItem(t,"1");localStorage.removeItem(t);}
  catch(e){available=false;lastError=String(e);}
  function bytesOf(str){
    let n=0;
    for(let i=0;i<str.length;i++)n+=str.charCodeAt(i)>0x7f?2:1;
    return n;
  }
  function read(key){
    key=key||KEY;
    if(!available)return null;
    try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}
    catch(e){lastError=String(e);return null;}
  }
  function write(obj,key){
    key=key||KEY;
    if(!available)return {ok:false,reason:"本地存储不可用（可能是隐私模式）",bytes:0};
    let str;
    try{str=JSON.stringify(obj);}catch(e){return {ok:false,reason:"序列化失败",bytes:0};}
    let bytes=bytesOf(str);
    if(bytes>WARN){
      const o=JSON.parse(str);
      if(o.log)o.log=[];
      if(o.stats&&o.stats.history)o.stats.history=[];
      if(o.inventory&&o.inventory.mats)
        for(const k in o.inventory.mats)o.inventory.mats[k]=Math.min(o.inventory.mats[k],9999);
      str=JSON.stringify(o);bytes=bytesOf(str);
    }
    if(bytes>BUDGET)return {ok:false,reason:"存档超出 5MB 预算",bytes};
    try{localStorage.setItem(key,str);}
    catch(e){lastError=String(e);return {ok:false,reason:"写入被拒绝（配额已满）",bytes};}
    return {ok:true,reason:"",bytes};
  }
  function usage(){
    if(!available)return {used:0,budget:BUDGET,ratio:0,available:false,error:lastError};
    let used=0;
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(k&&k.indexOf("castleRaid.save")===0)used+=bytesOf(k)+bytesOf(localStorage.getItem(k)||"");
      }
    }catch(e){}
    return {used,budget:BUDGET,ratio:used/BUDGET,available:true,error:lastError};
  }
  function clear(key){
    try{localStorage.removeItem(key||KEY);}catch(e){lastError=String(e);}
  }
  CR.store={read,write,usage,clear,bytesOf,BUDGET,get available(){return available;}};
})(window.CR=window.CR||{});
