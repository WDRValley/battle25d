/* utils.js — 数学 / 随机 / 颜色，无依赖 */
(function(CR){
  "use strict";
  const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
  const lerp=(a,b,t)=>a+(b-a)*t;
  let seed=1337;
  function srand(s){seed=s|0;}
  function rnd(){seed=(seed*1664525+1013904223)|0;return (seed>>>0)/4294967296;}
  const rr=(a,b)=>a+(b-a)*rnd();
  const ri=(a,b)=>Math.floor(rr(a,b+1));
  const pick=arr=>arr[Math.floor(rnd()*arr.length)];
  const dist2=(ax,ay,bx,by)=>{const dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
  const smooth=t=>t*t*(3-2*t);
  function mix(c1,c2,t){return [lerp(c1[0],c2[0],t),lerp(c1[1],c2[1],t),lerp(c1[2],c2[2],t)];}
  function shade(c,k){return [clamp(c[0]*k,0,1),clamp(c[1]*k,0,1),clamp(c[2]*k,0,1)];}
  function hex(h){
    const n=parseInt(h.replace("#",""),16);
    return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255];
  }
  function fmt(n){
    if(n>=1e6)return (n/1e6).toFixed(1)+"M";
    if(n>=1e4)return (n/1e3).toFixed(1)+"k";
    return String(Math.floor(n));
  }
  /* 固定长度的字符串池，避免逐帧分配 */
  function Pool(n,factory){
    const a=new Array(n);
    for(let i=0;i<n;i++){a[i]=factory();a[i].alive=false;}
    return {a,take(){for(let i=0;i<n;i++)if(!a[i].alive){a[i].alive=true;return a[i];}return null;},
      clear(){for(let i=0;i<n;i++)a[i].alive=false;},
      each(fn){for(let i=0;i<n;i++)if(a[i].alive)fn(a[i],i);},
      count(){let k=0;for(let i=0;i<n;i++)if(a[i].alive)k++;return k;}};
  }
  CR.u={clamp,lerp,srand,rnd,rr,ri,pick,dist2,smooth,mix,shade,hex,fmt,Pool,TAU:Math.PI*2};
})(window.CR=window.CR||{});
