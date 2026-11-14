/* storage.js — localStorage 封装，含 5MB 预算控制 */
(function(CR){
  "use strict";
  const KEY="castleRaid.save.v3";
  const BUDGET=5*1024*1024;          // 浏览器 localStorage 通常 5MB
  const WARN=BUDGET*0.90;
  let available=true,lastError="";
  try{
    const t="__cr_test__";localStorage.setItem(t,"1");localStorage.removeItem(t);
  }catch(e){available=false;lastError=String(e);}

  function bytesOf(str){
    // UTF-16 近似：ASCII 1B / 中文 2B（localStorage 实际按 UTF-16 计）
    let n=0;
    for(let i=0;i<str.length;i++)n+=str.charCodeAt(i)>0x7f?2:1;
    return n;
  }
  function read(){
    if(!available)return null;
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw)return null;
      return JSON.parse(raw);
    }catch(e){lastError=String(e);return null;}
  }
  function write(obj){
    if(!available)return {ok:false,reason:"本地存储不可用（可能是隐私模式）",bytes:0};
    let str;
    try{str=JSON.stringify(obj);}catch(e){return {ok:false,reason:"序列化失败",bytes:0};}
    let bytes=bytesOf(str);
    // 超预算时逐层裁剪：先丢运行日志，再丢统计明细，最后裁剪背包堆叠上限
    if(bytes>WARN){
      const o=JSON.parse(str);
      if(o.log){o.log=[];}
      if(o.stats&&o.stats.history)o.stats.history=[];
      if(o.inventory&&o.inventory.mats){
        for(const k in o.inventory.mats)o.inventory.mats[k]=Math.min(o.inventory.mats[k],9999);
      }
      str=JSON.stringify(o);bytes=bytesOf(str);
    }
    if(bytes>BUDGET)return {ok:false,reason:"存档超出 5MB 预算",bytes};
    try{localStorage.setItem(KEY,str);}
    catch(e){lastError=String(e);return {ok:false,reason:"写入被拒绝（配额已满）",bytes};}
    return {ok:true,reason:"",bytes};
  }
  function usage(){
    if(!available)return {used:0,budget:BUDGET,ratio:0,available:false,error:lastError};
    let used=0;
    try{used=bytesOf(localStorage.getItem(KEY)||"");}catch(e){}
    return {used,budget:BUDGET,ratio:used/BUDGET,available:true,error:lastError};
  }
  function clear(){
    try{localStorage.removeItem(KEY);}catch(e){lastError=String(e);}
  }
  CR.store={read,write,usage,clear,bytesOf,BUDGET,get available(){return available;}};
})(window.CR=window.CR||{});
