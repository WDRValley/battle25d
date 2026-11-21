/* render_border.js — v1.4 dev2 · 雨沼边境走廊全部画面几何
 * WebGL 单 VBO；四段子区域各自天空 / 远景 / 地面 / 植被 / 雾 / 粒子 / 后期
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,B=CR.border,SV=CR.save;
  const G=CR.gl;
  const list=[],itemPool=[];
  function push(t,o){let it=itemPool[list.length];
    if(!it){it={_t:"",o:null};itemPool.push(it);}
    it._t=t;it.o=o;list.push(it);}
  function R(){return G.R;}
  function pr(x,d,h){return WLD.proj(x,d,h);}
  const HILL=[[0,.60],[.14,.42],[.28,.54],[.42,.36],[.58,.50],[.72,.34],[.88,.48],[1,.58]];

  function skyColors(){
    const z=CFG.BORDER_ZONES[B.zone]||CFG.BORDER_ZONES[1];
    if(B.isNight)return {top:[.02,.05,.10],mid:[.06,.11,.17],low:[.11,.18,.22],
      horizon:[.17,.24,.27],night:true,dusk:false,hill:[.05,.11,.14],fog:z.fog,z};
    if(B.phase==="dusk")return {top:[.12,.15,.22],mid:[.30,.28,.30],low:[.50,.42,.33],
      horizon:[.64,.54,.38],night:false,dusk:true,hill:[.17,.18,.16],fog:z.fog,z};
    return {top:U.mix([.15,.24,.32],z.sky[0],.62),mid:U.mix([.30,.39,.42],z.sky[1],.62),
      low:U.mix([.50,.56,.46],z.sky[2],.62),horizon:z.sky[2],
      night:false,dusk:false,hill:z.hill,fog:z.fog,z};
  }
  function vis(x,margin){
    const vl=WLD.camX-(margin||260),vr=WLD.camX+G.W/G.S+(margin||260);
    return x>=vl&&x<=vr;
  }
  function onScreen(p,pad){return p.x>-(pad||80)*p.s&&p.x<G.W+(pad||80)*p.s;}

  /* ================= 天空 / 远山 / 分区远景 ================= */
  function drawSky(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555,zi=B.zone;
    r.quadG(0,0,W,hy*.58,c.top,c.mid,1,0);
    r.quadG(0,hy*.58,W,hy*.42,c.mid,c.horizon,1,0);
    r.quadG(0,hy*.80,W,hy*.20,c.horizon,c.low,.42,0);
    const mx=W*.78,my=hy*.26;
    if(c.night){
      r.glow(mx,my,46*S,46*S,C.snow,.5,.7);
      r.ell(mx,my,17*S,17*S,[.88,.93,1],.92,0,true);
      r.ell(mx+8*S,my-3*S,15*S,15*S,c.top,.9,0,true);
      U.srand(2209);
      for(let i=0;i<62;i++)r.ell(U.rr(0,W),U.rr(0,hy*.66),U.rr(.6,1.5)*S,
        U.rr(.6,1.5)*S,C.white,U.rr(.10,.46),0);
    }else{
      r.glow(mx,my,66*S,66*S,c.dusk?C.orange:C.sun,c.dusk?.5:.30,.7);
      r.ell(mx,my,19*S,19*S,c.dusk?C.fire2:C.sun,.72,0,true);
    }
    const off=WLD.camX*.045;
    for(let layer=0;layer<3;layer++){
      const base=hy*(.30+layer*.085),amp=hy*(.15-layer*.026);
      const col=U.mix(c.hill,[.04,.08,.10],layer*.22);
      const shift=off*(1+layer*.7);
      for(let i=0;i<HILL.length-1;i++){
        const a=HILL[i],b=HILL[i+1];
        const x1=((a[0]*W*1.5-shift*(.04+layer*.03))%(W*1.5)+W*1.5)%(W*1.5)-W*.25;
        const x2=x1+(b[0]-a[0])*W*1.5;
        const y1=base+(1-a[1])*amp,y2=base+(1-b[1])*amp;
        if(x2<-40||x1>W+40)continue;
        r.tri(x1,y1,x2,y2,x1,hy+20,col,.80-layer*.10,0);
        r.tri(x1,y1,x2,y2,x2,hy+20,col,.80-layer*.10,0);
      }
    }
    /* 分区远景：洼地林冠 / 灌木雾林 / 村落残屋麦浪 / 城内楼房 */
    U.srand(1200+zi*37);
    for(let i=0;i<26;i++){
      const x=((i*97-off*.15)%(W+240)+W+240)%(W+240)-120,y=hy+8*S;
      if(zi===0){
        const h=U.rr(52,128)*S;
        r.tri(x,y,x+22*S,y-h,x+44*S,y,
          i%5===0?[.46,.32,.14]:[.10,.24,.16],.55,0);
      }else if(zi===1){
        const h=U.rr(46,96)*S;
        r.seg(x,y,x+U.rr(-12,12)*S,y-h,2.4*S,[.13,.17,.18],.6,0);
        r.ell(x,y-h,U.rr(20,38)*S,U.rr(10,18)*S,[.12,.19,.17],.42,0,true);
      }else if(zi===2){
        const h=U.rr(26,58)*S;
        r.quad(x,y-h,U.rr(26,58)*S,h,[.34,.30,.22],.5,0);
        r.tri(x-3*S,y-h,x+26*S,y-h-12*S,x+55*S,y-h,[.26,.22,.17],.5,0);
      }else{
        const h=U.rr(70,168)*S;
        r.quad(x,y-h,U.rr(28,54)*S,h,[.30,.34,.42],.45,0);
        r.tri(x-4*S,y-h,x+18*S,y-h-20*S,x+42*S,y-h,[.24,.28,.38],.45,0);
        if(B.isNight)for(let k=0;k<3;k++)
          r.quad(x+8*S+k*11*S,y-h+18*S+k*22*S,5*S,7*S,C.lantern,.5,0);
      }
    }
  }

  /* ================= 地面 / 水面 / 麦田 / 石垣 ================= */
  function drawGround(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555,zi=B.zone;
    const g1=zi===0?[.16,.30,.20]:(zi===1?[.12,.17,.16]:(zi===2?[.38,.34,.22]:[.34,.36,.40]));
    const g2=zi===0?[.07,.16,.12]:(zi===1?[.05,.10,.11]:(zi===2?[.20,.18,.13]:[.18,.20,.25]));
    r.quadG(0,hy,W,H-hy,c.horizon,c.night?g2:g1,1,0);
    const vl=WLD.camX-120,vr=WLD.camX+W/S+120;
    U.srand(5531+zi*91);
    for(let x=Math.floor(vl/72)*72;x<vr;x+=72){
      const p=pr(x,0,0),yy=hy+((x*7)%9+2)*S*4,w=72*S*1.06;
      if(zi===1||zi===0){
        r.quadG(p.x,yy,w,17*S,c.night?[.05,.12,.15]:[.16,.30,.28],
          c.night?[.02,.07,.09]:[.08,.19,.18],.5,0);
        const o=Math.sin(x*.01+CR.game.time*.9)*8*S;
        r.seg(p.x+o,yy+8*S,p.x+w*.7+o,yy+8*S,1.2*S,
          c.night?[.28,.48,.52]:C.foam,.26,0);
      }else if(zi===2){
        r.quad(p.x,yy+6*S,w,10*S,[.46,.40,.24],.32,0);
        for(let k=0;k<5;k++){
          const xx=p.x+k*14*S;
          r.seg(xx,yy+12*S,xx+Math.sin(CR.game.time+x*.01+k)*2*S,
            yy-4*S,1.2*S,[.62,.56,.30],.34,0);
        }
      }else{
        r.quad(p.x,yy+2*S,w,22*S,[.42,.44,.48],.30,0);
        r.seg(p.x,yy+2*S,p.x+w,yy+2*S,1*S,[.60,.62,.66],.22,0);
      }
    }
  }
  function drawPonds(){
    const r=R(),S=G.S,c=skyColors();
    B.ponds.forEach(o=>{
      if(!vis(o.x,180))return;
      const p=pr(o.x,o.depth,0);
      if(!onScreen(p,140))return;
      r.ell(p.x,p.y+o.ry*S*.2,o.rx*S,o.ry*S,
        c.night?[.05,.13,.16]:[.14,.28,.25],.88,0,true);
      r.ell(p.x,p.y-o.ry*S*.18,o.rx*.86*S,o.ry*.6*S,
        c.night?[.08,.18,.20]:[.22,.38,.31],.7,0,true);
      /* 浮萍与腐败水苔 */
      for(let k=0;k<5;k++){
        const a=o.phase+k*1.9,t=CR.game.time*.5;
        const xx=p.x+Math.cos(a+t*.2)*o.rx*S*.6;
        const yy=p.y+Math.sin(a+t*.2)*o.ry*S*.3;
        r.ell(xx,yy,U.rr(4,9)*S,2.6*S,[.20,.34,.20],.72,0,true);
      }
      /* 涟漪 */
      r.ring(p.x+Math.sin(CR.game.time*.8+o.phase)*8*S,p.y,
        (18+Math.sin(CR.game.time*1.4+o.phase)*4)*S,7*S,1.1*S,C.foam,.22,0,16);
    });
  }
  function drawMist(){
    const r=R(),S=G.S,c=skyColors();
    B.mist.forEach(o=>{
      if(!vis(o.x,o.w))return;
      const p=pr(o.x+Math.sin(CR.game.time*.06+o.phase)*o.v*3,o.depth,0);
      if(!onScreen(p,o.w))return;
      const y=G.H*.42+o.depth*S*.7;
      r.ell(p.x,y,o.w*S,o.h*S,c.night?[.40,.54,.58]:[.72,.78,.74],
        o.a*c.fog*2.5,0,true);
    });
  }

  /* ================= 分区植被与建筑 ================= */
  function drawTree(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,150))return;   /* dev3 树冠放大后扩大裁剪边界，避免边缘突然消失 */
    const h=o.h*s,c=skyColors();
    const trunk=o.wet?[.22,.24,.23]:(o.zone===2?[.30,.24,.17]:[.26,.20,.14]);
    /* dev3：按树高自适应树干粗细（魔法丛林规格），不再是大树配细牙签 */
    const tw=U.clamp(o.h*.035,6.5,11)*s;
    r.seg(p.x,p.y,p.x+o.lean*18*s,p.y-h*.62,tw,trunk,1,0);
    const cy=p.y-h*.78,rr=U.clamp(o.h*(o.wet?.25:.29),38,92)*s;
    const leaf=o.odd?[.74,.40,.16]:(o.wet?[.16,.24,.19]:(o.zone===2?[.38,.36,.22]:[.18,.36,.22]));
    r.ell(p.x+o.lean*12*s,cy,rr,rr*.82,c.night?U.mix(leaf,[.05,.10,.12],.45):leaf,.94,0,true);
    r.ell(p.x-rr*.42,cy+rr*.2,rr*.66,rr*.52,
      c.night?U.mix(leaf,[.04,.09,.10],.5):U.mix(leaf,[.06,.16,.10],.28),.9,0,true);
    r.ell(p.x+rr*.46,cy-rr*.18,rr*.6,rr*.48,
      c.night?U.mix(leaf,[.04,.09,.10],.5):U.mix(leaf,C.white,.10),.85,0,true);
    if(o.wet){ /* 湿黑老藤与青苔 */
      r.seg(p.x-4*s,p.y-h*.45,p.x-7*s,p.y-h*.95,1.8*s,[.16,.24,.18],.8,0);
      r.ell(p.x+6*s,p.y-14*s,12*s,4*s,[.20,.34,.20],.6,0,true);
    }
    if(o.odd){ /* 橙叶奇树：零星落叶光点 */
      for(let k=0;k<4;k++)
        r.ell(p.x+Math.sin(CR.game.time*.7+o.phase+k)*rr*.7,
          cy+Math.cos(CR.game.time*.5+k)*rr*.5,2.2*s,2.2*s,C.orange,.7,0);
    }
  }
  function drawVine(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,50))return;
    const sw=Math.sin(CR.game.time*.7+o.phase)*4*s;
    r.seg(p.x,-G.H*.05,p.x+sw,p.y-o.h*s,1.7*s,[.18,.32,.18],.82,0);
    for(let k=1;k<=5;k++){
      const yy=p.y-o.h*s*k/6;
      r.ell(p.x+sw*k/6+((k%2)?6:-6)*s,yy,7*s,3*s,[.22,.38,.20],.72,0,true);
    }
  }
  function drawReed(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,30))return;
    const sw=Math.sin(CR.game.time*1.1+o.phase)*3*s;
    r.seg(p.x,p.y,p.x+sw,p.y-o.h*s,2.1*s,[.30,.34,.22],.9,0);
    r.ell(p.x+sw,p.y-o.h*s,3.2*s,8*s,[.40,.38,.24],.85,0,true);
  }
  function drawWheat(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,30))return;
    const sw=Math.sin(CR.game.time*.9+o.phase)*2.2*s;
    const col=o.hue===0?[.62,.56,.30]:[.48,.46,.26];
    r.seg(p.x,p.y,p.x+sw,p.y-o.h*s,1.3*s,col,.8,0);
    r.ell(p.x+sw,p.y-o.h*s,2.2*s,5*s,col,.85,0,true);
  }
  /* ================= v1.4 dev3 · 农田&破败村落细节 ================= */
  function drawWheatFields(){
    const r=R();
    for(const o of B.wheatFields){
      const p=pr(o.x,o.depth,0),s=p.s,w=o.w*s;
      if(p.x+w*.5<-80||p.x-w*.5>G.W+80)continue;
      const base=o.hue===0?[.50,.44,.22]:[.42,.40,.21];
      /* 大片麦田：低矮黄褐地块 + 错落田垄 + 成排麦穗，远看是一整片农田 */
      r.quad(p.x-w/2,p.y-22*s,w,28*s,base,.34,0);
      for(let row=0;row<4;row++){
        const yy=p.y-18*s+row*7*s;
        r.seg(p.x-w/2,yy,p.x+w/2,yy-2*s,1.1*s,[.66,.58,.30],.42,0);
      }
      const n=Math.max(10,Math.round(o.w/34));
      for(let k=0;k<n;k++){
        const xx=p.x-w/2+(k+.5)*w/n;
        const sway=Math.sin(CR.game.time*.8+o.phase+k*.7)*2.4*s;
        const h=(18+(k%4)*5)*s;
        r.seg(xx,p.y-2*s,xx+sway,p.y-h,1.1*s,[.67,.58,.29],.72,0);
        r.ell(xx+sway,p.y-h,2*s,4.4*s,[.78,.66,.32],.78,0,true);
      }
    }
  }
  function drawHaystack(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,70))return;
    const w=o.w*s,h=o.h*s,x=p.x+o.lean*10*s;
    r.ell(x,p.y+2*s,w*.72,5*s,C.shadow,.22,0,true);
    r.tri(x-w*.58,p.y,x,p.y-h,x+w*.58,p.y,[.63,.52,.25],.95,0);
    r.ell(x,p.y-h*.48,w*.56,h*.38,[.72,.60,.29],.96,0,true);
    /* 捆扎草绳与散落 straw */
    r.seg(x-w*.32,p.y-h*.44,x+w*.32,p.y-h*.52,1.4*s,[.40,.31,.17],.9,0);
    for(let k=0;k<5;k++)
      r.seg(x-w*.4+k*w*.2,p.y-3*s,x-w*.46+k*w*.2+Math.sin(k+o.phase)*5*s,p.y+5*s,
        1*s,[.68,.56,.28],.62,0);
  }
  function drawCart(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,80))return;
    const w=o.w*s,h=o.h*s,x=p.x,y=p.y;
    r.ell(x,y+2*s,w*.55,5*s,C.shadow,.25,0,true);
    /* 破烂木车斗 + 倾斜断板 + 两只轮子 + 断辕 */
    r.quad(x-w*.44,y-h,w*.88,h*.56,[.34,.25,.16],.94,0);
    r.tri(x-w*.44,y-h,x+w*.08,y-h-(o.broken?10:4)*s,x+w*.42,y-h,[.28,.20,.14],.9,0);
    for(let k=1;k<4;k++)
      r.seg(x-w*.44+k*w*.22,y-h,x-w*.44+k*w*.22,y-h*.44,1.4*s,[.22,.17,.12],.75,0);
    const wy=y-h*.12;
    r.ring(x-w*.3,wy,10*s,10*s,2.2*s,[.22,.18,.13],.92,0,14);
    r.ring(x+w*.28,wy,10*s,10*s,2.2*s,[.22,.18,.13],.92,0,14);
    r.seg(x+w*.4,y-h*.32,x+w*.72,y-h*.1-(o.broken?12:0)*s,2.6*s,C.wood,.86,0);
    if(o.broken)r.seg(x-w*.2,y-h*.55,x-w*.05,y-h*.15,2*s,C.wood,.72,0);
  }
  function drawRuin(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,90))return;
    const w=o.w*s,h=o.h*s;
    const body=o.hue===0?[.42,.34,.26]:[.36,.31,.24];
    r.quad(p.x-w/2,p.y-h,w,h,body,.95,0);
    r.tri(p.x-w/2-4*s,p.y-h,p.x+o.lean*10*s,p.y-h-16*s,p.x+w/2+4*s,p.y-h,
      [.26,.22,.18],.9,0);
    /* 剥落墙体 / 塌损门窗 / 爬墙藤蔓 */
    r.quad(p.x-w*.18,p.y-h*.72,w*.28,h*.5,[.18,.17,.15],.8,0);
    r.quad(p.x+w*.16,p.y-h*.55,w*.2,h*.3,[.20,.18,.16],.75,0);
    for(let k=0;k<4;k++)
      r.seg(p.x-w/2+k*w/4,p.y-6*s,p.x-w/2+k*w/4+Math.sin(k)*3*s,
        p.y-h*.72,1.2*s,[.20,.34,.20],.65,0);
    if(B.isNight)r.glow(p.x,p.y-h*.45,14*s,12*s,C.lantern,1,.18);
  }
  function drawFence(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,20))return;
    r.seg(p.x,p.y,p.x+o.broken*4*s,p.y-o.h*s,2.4*s,[.30,.24,.17],.85,0);
    r.seg(p.x-8*s,p.y-o.h*.34,p.x+12*s,p.y-o.h*.62,1.6*s,[.28,.22,.16],.7,0);
  }
  function drawTool(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,20))return;
    if(o.kind===0){r.seg(p.x,p.y,p.x+12*s,p.y-16*s,2*s,C.iron,.8,0);
      r.tri(p.x+12*s,p.y-16*s,p.x+18*s,p.y-19*s,p.x+14*s,p.y-12*s,C.steel,.8,0);}
    else if(o.kind===1){r.seg(p.x-10*s,p.y-2*s,p.x+10*s,p.y-2*s,2*s,C.wood,.8,0);
      r.seg(p.x,p.y-2*s,p.x,p.y+9*s,1.6*s,C.wood,.8,0);}
    else{r.ell(p.x,p.y-2*s,7*s,3*s,C.steel,.7,0,true);}
  }
  function drawTower(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,90))return;
    const h=o.h*s,reed=o.style==="reed";
    /* 基座半浸在水里 */
    r.ell(p.x,p.y,26*s,6*s,[.10,.16,.14],.6,0,true);
    for(let k=0;k<4;k++)
      r.seg(p.x-15*s+k*10*s,p.y,p.x-15*s+k*10*s,p.y-h*.72,2.6*s,
        reed?[.26,.28,.20]:[.32,.24,.16],.92,0);
    const roof=reed?[.34,.36,.22]:[.44,.30,.18];
    r.tri(p.x-28*s,p.y-h*.72,p.x,p.y-h-22*s,p.x+28*s,p.y-h*.72,roof,.95,0);
    r.quad(p.x-20*s,p.y-h*.72,40*s,10*s,[.24,.20,.15],.85,0);
    if(reed){ /* 湿芦苇层与黏滑青苔、风干兽骨标记 */
      for(let k=0;k<5;k++)
        r.seg(p.x-18*s+k*9*s,p.y-h*.72,p.x-24*s+k*11*s,p.y-h*.86,1.4*s,
          [.40,.40,.24],.8,0);
      r.seg(p.x+22*s,p.y-h*.3,p.x+22*s,p.y-h*.62,1.8*s,C.bone||C.white,.7,0);
      r.ell(p.x+22*s,p.y-h*.64,3*s,3*s,C.bone||C.white,.7,0);
    }else{
      r.tri(p.x-10*s,p.y-h*.72,p.x,p.y-h*.9,p.x+10*s,p.y-h*.72,[.30,.22,.16],.8,0);
    }
    if(B.isNight)r.glow(p.x,p.y-h*.5,18*s,16*s,C.lantern,1,.22);
  }
  function drawGate(){
    const r=R(),o=B.gate;if(!o||!vis(o.x,300))return;
    const p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,300))return;
    const w=o.w*s,h=o.h*s;
    /* 石垣与拱门 */
    r.quad(p.x-w/2,p.y-h,w,h,[.40,.43,.48],.95,0);
    r.quad(p.x-w/2,p.y-h,w*.16,h,[.48,.50,.54],.9,0);
    r.quad(p.x+w/2-w*.16,p.y-h,w*.16,h,[.32,.35,.40],.9,0);
    r.ell(p.x,p.y-h*.32,w*.21,h*.34,[.08,.10,.14],.95,0,true);
    r.ell(p.x,p.y-h*.32,w*.17,h*.29,cityNightColor(),.9,0,true);
    for(let k=0;k<9;k++)
      r.quad(p.x-w/2+k*w/8,p.y-h,w/8-2*s,7*s,[.50,.52,.56],.8,0);
    /* 学院旗帜 */
    r.seg(p.x-w*.36,p.y-h,p.x-w*.36,p.y-h-46*s,2*s,C.steel,.9,0);
    const fl=Math.sin(CR.game.time*1.2)*5*s;
    r.tri(p.x-w*.36,p.y-h-46*s,p.x-w*.36+40*s+fl,p.y-h-38*s,
      p.x-w*.36,p.y-h-26*s,C.clothBlue,.9,0);
    r.ell(p.x-w*.36+13*s,p.y-h-36*s,3*s,3*s,C.gold,.9,0);
    /* 远处城内楼房剪影（门洞内） */
    for(let k=0;k<5;k++){
      const hh=(48+k%3*22)*s;
      r.quad(p.x-w*.14+k*w*.07,p.y-h*.32-hh,w*.055,hh,
        B.isNight?[.18,.22,.32]:[.34,.38,.46],.55,0);
      if(B.isNight)for(let j=0;j<2;j++)
        r.quad(p.x-w*.13+k*w*.07,p.y-h*.32-hh+10*s+j*16*s,4*s,6*s,C.lantern,.6,0);
    }
    if(B.isNight){
      r.glow(p.x,p.y-h*.62,70*s,44*s,C.lantern,1,.25);
      r.ell(p.x-w*.38,p.y-h*.78,7*s,7*s,C.lantern,.9,0);
      r.ell(p.x+w*.38,p.y-h*.78,7*s,7*s,C.lantern,.9,0);
    }
  }
  function cityNightColor(){return B.isNight?[.10,.14,.22]:[.30,.36,.42];}
  function drawGargoyle(){
    const r=R(),o=B.gargoyle;if(!o||!vis(o.x,200))return;
    const p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,160))return;
    const h=o.h*s,stone=[.52,.55,.60],dark=[.34,.37,.42];
    /* 基座、蝙蝠翼、羊角、石矛、蓝晶核 */
    r.quad(p.x-26*s,p.y-12*s,52*s,12*s,dark,.95,0);
    r.tri(p.x-16*s,p.y-h*.72,p.x-58*s,p.y-h*.9,p.x-20*s,p.y-h*.3,stone,.85,0);
    r.tri(p.x+16*s,p.y-h*.72,p.x+58*s,p.y-h*.9,p.x+20*s,p.y-h*.3,stone,.85,0);
    r.quad(p.x-17*s,p.y-h*.78,34*s,h*.62,stone,.95,0);
    r.ell(p.x,p.y-h*.84,16*s,15*s,stone,.95,0,true);
    r.tri(p.x-14*s,p.y-h*.92,p.x-26*s,p.y-h-14*s,p.x-6*s,p.y-h*.95,dark,.9,0);
    r.tri(p.x+14*s,p.y-h*.92,p.x+26*s,p.y-h-14*s,p.x+6*s,p.y-h*.95,dark,.9,0);
    r.ell(p.x-6*s,p.y-h*.86,3.4*s,3.4*s,C.cyan,.95,0);
    r.ell(p.x+6*s,p.y-h*.86,3.4*s,3.4*s,C.cyan,.95,0);
    r.glow(p.x,p.y-h*.86,18*s,15*s,C.cyan,1,.35);
    r.seg(p.x+24*s,p.y-h*.92,p.x+24*s,p.y-h-40*s,3*s,C.steel,.9,0);
    r.tri(p.x+24*s,p.y-h-52*s,p.x+18*s,p.y-h-36*s,p.x+30*s,p.y-h-36*s,C.steel,.9,0);
    /* 胸口学院旗帜刻纹 */
    r.quad(p.x-7*s,p.y-h*.58,14*s,11*s,C.clothBlue,.6,0);
    r.ell(p.x,p.y-h*.54,2.4*s,2.4*s,C.gold,.8,0);
    /* 扫描光圈：靠近或对话时亮起 */
    if(B.scanT>0||Math.abs(P.x-o.x)<220){
      const a=Math.max(B.scanT>0?B.scanT/1.8:.22,.14);
      r.ring(p.x,p.y-h*.5,(60+Math.sin(CR.game.time*2)*6)*s,
        (60+Math.sin(CR.game.time*2)*6)*s,2.4*s,C.cyan,a,0,24);
      r.seg(p.x-70*s,p.y-h*.5,p.x+70*s,p.y-h*.5,1.4*s,C.cyan,a*.7,0);
    }
  }
  function drawTent(){
    const r=R(),o=B.tent;if(!o||!vis(o.x,180))return;
    const p=pr(o.x,o.depth,0),s=p.s;
    if(!onScreen(p,140))return;
    const w=o.w*s,h=o.h*s;
    r.quad(p.x-w/2,p.y-h*.65,w,h*.65,[.24,.34,.52],.92,0);
    r.tri(p.x-w*.58,p.y-h*.65,p.x,p.y-h-18*s,p.x+w*.58,p.y-h*.65,C.clothBlue,.95,0);
    r.tri(p.x-w*.2,p.y-h*.65,p.x,p.y-h-18*s,p.x,p.y-h*.65,C.white,.22,0);
    r.quad(p.x-w*.42,p.y-h*.46,w*.26,h*.3,[.86,.90,.96],.85,0);
    r.seg(p.x-w*.42,p.y-h*.46,p.x-w*.16,p.y-h*.46,1.4*s,C.gold,.8,0);
    if(B.isNight){
      r.glow(p.x,p.y-h*.4,42*s,30*s,C.lantern,1,.35);
      r.ell(p.x-w*.44,p.y-h*.72,5*s,5*s,C.lantern,.9,0);
      r.ell(p.x+w*.44,p.y-h*.72,5*s,5*s,C.lantern,.9,0);
    }
    r.ell(p.x,p.y-h*.3,3*s,3*s,C.gold,.9,0);
  }

  /* ================= 粒子 ================= */
  function drawParticles(){
    const r=R(),S=G.S,c=skyColors(),t=CR.game.time;
    if(c.night){
      B.glowbugs.forEach(o=>{
        if(!vis(o.x,60))return;
        const p=pr(o.x+Math.sin(t*.5+o.phase)*11,o.depth,0);
        if(!onScreen(p,30))return;
        const y=p.y-o.y*S*.42+Math.sin(t*o.v+o.phase)*9*S;
        const a=.35+.35*Math.sin(t*2+o.phase);
        r.glow(p.x,y,o.size*3*S,o.size*3*S,C.leaf1,1,a*.3);
        r.ell(p.x,y,o.size*S,o.size*S,C.cyan,a,0);
      });
      B.fireflies.forEach(o=>{
        if(!vis(o.x,60))return;
        const p=pr(o.x,o.depth,0);if(!onScreen(p,30))return;
        const y=p.y-o.y*S*.42+Math.sin(t*o.v+o.phase)*7*S;
        r.glow(p.x,y,7*S,7*S,C.gold,1,.22);
        r.ell(p.x,y,1.8*S,1.8*S,C.lantern,.7,0);
      });
    }else{
      B.butterflies.forEach(o=>{
        if(!vis(o.x,60))return;
        const p=pr(o.x+Math.sin(t*.7+o.phase)*26,o.depth,0);
        if(!onScreen(p,30))return;
        const y=p.y-o.y*S*.42+Math.sin(t*1.7+o.phase)*10*S;
        const col=o.hue===0?C.sakura:(o.hue===1?C.gold:C.cyan);
        const flap=Math.abs(Math.sin(t*9+o.phase))*4*S+1*S;
        r.ell(p.x-2*S,y,flap,2.6*S,col,.8,0,true);
        r.ell(p.x+2*S,y,flap,2.6*S,col,.8,0,true);
      });
    }
    B.birds.forEach(o=>{
      const x=o.x+Math.sin(t*.16+o.phase)*200+t*o.v*.2;
      if(!vis(x,80))return;
      const px=(x-WLD.camX)*S;
      if(px<-40||px>G.W+40)return;
      const y=o.y*S*.42+Math.sin(t+o.phase)*8*S;
      const f=Math.sin(t*7+o.phase)*5*S;
      r.seg(px-9*S,y,px,y-f,1.3*S,c.night?[.30,.36,.42]:[.16,.20,.22],.7,0);
      r.seg(px,y-f,px+9*S,y,1.3*S,c.night?[.30,.36,.42]:[.16,.20,.22],.7,0);
    });
    B.leaves.forEach(o=>{
      if(!vis(o.x,40))return;
      const p=pr(o.x,0,0);if(!onScreen(p,20))return;
      const col=o.hue===0?[.52,.38,.18]:(o.hue===1?[.36,.46,.22]:[.44,.30,.16]);
      r.ell(p.x,o.y*S*.78,p.r*S,p.r*.6*S,col,.55,0,true);
    });
    /* 区域固有绵密冷雨（洼地 / 灌木更浓，全局天气层再叠加用户设置） */
    const density=B.zone<=1?1:.45;
    B.drops.forEach((o,i)=>{
      if(i>B.drops.length*density)return;
      const p=pr(o.x,0,0);
      r.seg(p.x,o.y*S*.85,p.x-3*S,o.y*S*.85+o.len*S,1*S,C.white,o.a,0);
    });
  }

  /* ================= 采集点 / 路人 / NPC ================= */
  function drawNode(n){
    const r=R(),p=pr(n.x,n.depth,0),s=p.s;
    if(!onScreen(p,60))return;
    const bob=Math.sin(CR.game.time*1.6+n.x*.01)*2*s;
    if(n.kind==="orange"){
      r.seg(p.x,p.y,p.x,p.y-52*s,4*s,C.wood,.95,0);
      r.ell(p.x,p.y-62*s,26*s,22*s,C.leaf2,.95,0,true);
      for(let k=0;k<5;k++)
        r.ell(p.x+Math.cos(k*1.7)*17*s,p.y-62*s+Math.sin(k*1.9)*13*s,
          5*s,5*s,C.orange,.95,0);
    }else if(n.kind==="ore"){
      r.ell(p.x,p.y-3*s,24*s,9*s,[.26,.26,.28],.95,0,true);
      for(let k=0;k<4;k++)
        r.tri(p.x-18*s+k*11*s,p.y-4*s,p.x-12*s+k*11*s,p.y-24*s,
          p.x-5*s+k*11*s,p.y-4*s,k%2?C.copper:C.iron,.9,0);
    }else if(n.kind==="lumber"){
      r.seg(p.x,p.y,p.x+8*s,p.y-88*s,10*s,C.wood,.95,0);
      r.ell(p.x+8*s,p.y-92*s,20*s,26*s,C.leaf2,.9,0,true);
      r.seg(p.x-6*s,p.y-20*s,p.x-20*s,p.y-60*s,3*s,C.wood,.8,0);
    }else if(n.kind==="mush"){
      for(let k=0;k<3;k++){
        const xx=p.x+(k-1)*11*s,hh=(12+k*3)*s;
        r.seg(xx,p.y,xx,p.y-hh,2.6*s,C.white,.9,0);
        r.ell(xx,p.y-hh,8*s,4.5*s,k===1?C.red:C.brown,.92,0,true);
      }
    }else{
      for(let k=0;k<7;k++)
        r.seg(p.x+(k-3)*6*s,p.y,p.x+(k-3)*6*s+Math.sin(CR.game.time+k)*2*s,
          p.y-(18+k%3*7)*s,1.7*s,C.leaf1,.85,0);
    }
    r.glow(p.x,p.y-26*s+bob,20*s,20*s,C.gold,1,.14);
    r.ring(p.x,p.y-4*s,18*s,6*s,1.1*s,C.gold,.32,0,14);
    if(B.gather&&B.gather.id===n.id){
      const k=U.clamp(B.gather.t/B.gather.dur,0,1);
      r.sector(p.x,p.y-26*s,20*s,25*s,-Math.PI/2,-Math.PI/2+k*Math.PI*2,
        C.cyan,.85,0,18);
    }
  }
  function drawWalker(w){
    const r=R(),p=pr(w.x,w.depth,0),s=p.s;
    if(!onScreen(p,40))return;
    const bob=Math.sin(CR.game.time*3+w.t)*1.5*s;
    r.ell(p.x,p.y,10*s,3*s,C.shadow,.25,0,true);
    r.quad(p.x-7*s,p.y-30*s+bob,14*s,22*s,w.color,.95,0);
    r.ell(p.x,p.y-38*s+bob,7*s,7*s,C.skin||C.sand,.95,0,true);
    r.quad(p.x-7*s,p.y-10*s,5*s,10*s,[.20,.18,.18],.9,0);
    r.quad(p.x+2*s,p.y-10*s,5*s,10*s,[.20,.18,.18],.9,0);
    if(w.icon==="●"||w.icon==="▣"){
      r.seg(p.x+10*s,p.y-24*s,p.x+15*s,p.y-6*s,2*s,C.wood,.75,0);
    }
    if(B.isNight&&w.zone===3)r.glow(p.x,p.y-26*s,12*s,12*s,C.lantern,1,.18);
  }
  function drawNPC(npc){
    const r=R(),p=pr(npc.x,npc.depth,0),s=p.s;
    if(!onScreen(p,60))return;
    const bob=Math.sin(CR.game.time*1.4+npc.x*.01)*1.8*s;
    r.ell(p.x,p.y,13*s,4*s,C.shadow,.3,0,true);
    if(npc.id==="gargoyle")return;   /* 石像鬼由 drawGargoyle 精绘 */
    r.quad(p.x-11*s,p.y-42*s+bob,22*s,34*s,npc.color,.95,0);
    r.ell(p.x,p.y-50*s+bob,9*s,9*s,C.skin||C.sand,.95,0,true);
    if(npc.id==="fallenMage"){
      r.tri(p.x-14*s,p.y-46*s,p.x,p.y-76*s,p.x+14*s,p.y-46*s,C.ghostDark,.95,0);
      r.ell(p.x,p.y-56*s,8*s,5*s,[.03,.03,.06],.9,0,true);
      r.glow(p.x,p.y-52*s,14*s,14*s,C.ghostViolet,1,.25);
    }else if(npc.id==="freshmanDesk"||npc.id==="wanderingMage"){
      r.tri(p.x-12*s,p.y-58*s,p.x,p.y-74*s,p.x+12*s,p.y-58*s,C.clothBlue,.9,0);
    }else if(npc.id==="patrolGuard"||npc.id==="mageGuard"){
      r.quad(p.x-13*s,p.y-40*s,26*s,8*s,C.steel,.9,0);
      r.seg(p.x+14*s,p.y-46*s,p.x+14*s,p.y-4*s,2*s,C.steel,.85,0);
    }else if(npc.id==="farmerTao"){
      r.tri(p.x-18*s,p.y-38*s,p.x,p.y-58*s,p.x+18*s,p.y-38*s,[.48,.42,.24],.9,0);
    }
    r.ring(p.x,p.y-6*s,17*s,6*s,1.2*s,npc.color,.42,0,14);
    if(B.isNight)r.glow(p.x,p.y-34*s,20*s,20*s,C.lantern,1,.18);
  }

  /* ================= 怪物立绘（动物 / 猪人 / 匪帮 / 灵体 / 幽灵 BOSS） ================= */
  function beast(e,r,p,s){
    const x=p.x,y=p.y,w=e.w||1,h=e.ht||1,S=s,face=e.facing||1,
      col=e.cfg.main,dk=e.cfg.dark,acc=e.cfg.acc||C.white,t=CR.game.time,
      bob=Math.sin(t*4+e.anim*.4)*1.4*S,A=1,F=e.flash>0?.7:0;
    r.ell(x,y+2*S,26*S*w,5*S,C.shadow,.26,0,true);
    const T=e.type;
    if(T==="poisonFrog"){
      r.ell(x,y-15*S*h+bob,26*S*w,14*S*h,col,A,F,true);
      r.ell(x-9*S,y-26*S*h+bob,7*S,7*S,acc,A,F,true);
      r.ell(x+9*S,y-26*S*h+bob,7*S,7*S,acc,A,F,true);
      r.ell(x-9*S,y-26*S*h+bob,3*S,3*S,C.black,A,F);
      r.ell(x+9*S,y-26*S*h+bob,3*S,3*S,C.black,A,F);
      for(let k=0;k<4;k++)r.ell(x+(k-1.5)*11*S,y-13*S*h+bob,3*S,3*S,C.greenDk,.7,F);
    }else if(T==="chameleon"){
      r.ell(x,y-14*S*h+bob,30*S*w,10*S*h,col,A,F,true);
      r.ell(x+face*24*S,y-20*S*h+bob,10*S,8*S,dk,A,F,true);
      r.ell(x+face*26*S,y-22*S*h+bob,2.4*S,2.4*S,C.gold,A,F);
      for(let k=0;k<5;k++)r.seg(x+(k-2)*10*S,y-6*S,x+(k-2)*10*S-4*S,y+1*S,2*S,dk,A,F);
      let lx=x-24*S,ly=y-12*S;
      for(let k=0;k<5;k++){const nx=lx-7*S,ny=ly+Math.sin(t*2+k)*4*S;
        r.seg(lx,ly,nx,ny,3*S,col,A,F);lx=nx;ly=ny;}
    }else if(T==="swampCroc"){
      r.ell(x,y-11*S*h+bob,38*S*w,11*S*h,dk,A,F,true);
      r.ell(x+face*30*S,y-14*S*h+bob,16*S,8*S,col,A,F,true);
      r.tri(x+face*38*S,y-18*S*h+bob,x+face*48*S,y-12*S*h+bob,x+face*38*S,y-9*S*h+bob,acc,A,F);
      for(let k=0;k<6;k++)r.tri(x+(k-3)*10*S,y-20*S*h+bob,
        x+(k-3)*10*S+4*S,y-28*S*h+bob,x+(k-3)*10*S+8*S,y-20*S*h+bob,col,A,F);
    }else if(T==="hound"||T==="boar"||T==="deer"){
      r.ell(x,y-16*S*h+bob,28*S*w,14*S*h,col,A,F,true);
      r.ell(x+face*22*S,y-24*S*h+bob,11*S,9*S,dk,A,F,true);
      r.ell(x+face*25*S,y-26*S*h+bob,2.6*S,2.6*S,C.red,A,F);
      for(let k=0;k<4;k++)r.seg(x+(k-1.5)*11*S,y-7*S,x+(k-1.5)*11*S,y+2*S,3*S,dk,A,F);
      if(T==="deer"){r.seg(x+face*18*S,y-32*S*h,x+face*24*S,y-48*S*h,2*S,C.brown,A,F);
        r.seg(x+face*18*S,y-32*S*h,x+face*10*S,y-46*S*h,2*S,C.brown,A,F);}
    }else if(T==="seed"||T==="squirrel"){
      r.ell(x,y-15*S*h+bob,18*S*w,17*S*h,col,A,F,true);
      r.ell(x-6*S,y-19*S*h+bob,2.4*S,2.4*S,C.black,A,F);
      r.ell(x+6*S,y-19*S*h+bob,2.4*S,2.4*S,C.black,A,F);
      r.seg(x,y-31*S*h+bob,x+face*7*S,y-42*S*h+bob,2*S,C.leaf2,A,F);
      r.ell(x+face*8*S,y-43*S*h+bob,6*S,3*S,C.leaf1,A,F,true);
    }else if(T==="grassWisp"){
      const f=Math.sin(t*2+e.anim)*4*S;
      r.glow(x,y-30*S*h+f,30*S,30*S,C.leaf1,1,.32);
      r.ell(x,y-30*S*h+f,15*S*w,19*S*h,col,.86,F,true);
      r.ell(x-6*S,y-34*S*h+f,4*S,4*S,C.cyan,A,F);
      r.ell(x+6*S,y-34*S*h+f,4*S,4*S,C.cyan,A,F);
      for(let k=0;k<4;k++){
        const a=t*1.3+k*1.6;
        r.ell(x+Math.cos(a)*24*S,y-30*S*h+Math.sin(a)*20*S+f,5*S,3*S,C.leaf2,.8,F,true);
      }
      return;
    }else if(T==="ogreMage"){
      /* 漂浮幽灵：无腿、下摆飘散、兜帽、暗紫光晕 */
      const f=Math.sin(t*1.6+e.anim*.3)*5*S;
      r.glow(x,y-52*S*h+f,62*S,62*S,C.ghostViolet,1,.30);
      r.ell(x,y+2*S,30*S,7*S,C.shadow,.20,0,true);
      r.tri(x-26*S,y-64*S*h+f,x,y-104*S*h+f,x+26*S,y-64*S*h+f,dk,A,F);
      r.ell(x,y-78*S*h+f,22*S,24*S,col,.92,F,true);
      r.tri(x-24*S,y-86*S*h+f,x,y-124*S*h+f,x+24*S,y-86*S*h+f,dk,.95,0);
      r.ell(x,y-92*S*h+f,10*S,7*S,[.02,.02,.05],.95,0,true);
      r.ell(x-4*S,y-93*S*h+f,2.4*S,2.4*S,C.ghostViolet,A,F);
      r.ell(x+4*S,y-93*S*h+f,2.4*S,2.4*S,C.ghostViolet,A,F);
      for(let k=0;k<5;k++){
        const yy=y-56*S*h+f+k*10*S;
        r.tri(x-24*S+k*3*S,yy,x-8*S+k*2*S,yy+16*S,x-4*S+k*3*S,yy,col,.55,F);
        r.tri(x+24*S-k*3*S,yy,x+8*S-k*2*S,yy+16*S,x+4*S-k*3*S,yy,col,.55,F);
      }
      r.seg(x+face*30*S,y-96*S*h+f,x+face*34*S,y-40*S*h+f,3*S,C.bone||C.white,.8,F);
      r.ell(x+face*34*S,y-100*S*h+f,7*S,7*S,C.ghostViolet,.9,F);
      return;
    }else{
      /* 通用人形野兽兜底 */
      r.ell(x,y-22*S*h+bob,18*S*w,22*S*h,col,A,F,true);
      r.ell(x,y-44*S*h+bob,11*S,11*S,dk,A,F,true);
    }
  }
  function humanoidMob(e,r,p,s){
    const x=p.x,y=p.y,S=s,face=e.facing||1,col=e.cfg.main,dk=e.cfg.dark,
      t=CR.game.time,bob=Math.sin(t*3+e.anim*.5)*1.5*S,A=1,F=e.flash>0?.7:0;
    const big=e.type==="pigman"||e.type==="banditChief";
    r.ell(x,y+2*S,16*S,4*S,C.shadow,.28,0,true);
    r.quad(x-11*S*(big?1.28:1),y-34*S+bob,22*S*(big?1.28:1),26*S,dk,A,F);
    r.quad(x-9*S,y-9*S,7*S,9*S,[.20,.18,.16],A,F);
    r.quad(x+2*S,y-9*S,7*S,9*S,[.20,.18,.16],A,F);
    if(e.type==="pigman"){
      /* 猪头：粉棕大鼻、獠牙、半裸皮革外衣 */
      r.ell(x,y-44*S+bob,14*S,12*S,[.72,.46,.40],A,F,true);
      r.ell(x+face*5*S,y-42*S+bob,6*S,4.5*S,[.52,.32,.30],A,F,true);
      r.ell(x+face*3*S,y-42*S+bob,1.6*S,1.6*S,C.black,A,F);
      r.ell(x+face*8*S,y-42*S+bob,1.6*S,1.6*S,C.black,A,F);
      r.tri(x-11*S,y-49*S,x-16*S,y-58*S,x-6*S,y-47*S,[.62,.38,.34],A,F);
      r.tri(x+11*S,y-49*S,x+16*S,y-58*S,x+6*S,y-47*S,[.62,.38,.34],A,F);
      r.quad(x-16*S,y-34*S,32*S,12*S,C.brown,.65,F);
      /* 大砍刀 */
      r.seg(x+face*13*S,y-24*S+bob,x+face*36*S,y-52*S+bob,3*S,C.wood,A,F);
      r.quad(x+face*30*S,y-60*S+bob,9*S,26*S,C.steel,.95,F);
      r.seg(x+face*39*S,y-60*S+bob,x+face*39*S,y-34*S+bob,1.4*S,C.white,.8,0);
    }else{
      r.ell(x,y-44*S+bob,10*S,10*S,C.sand||C.white,A,F,true);
      r.quad(x-11*S,y-49*S,22*S,6*S,e.type==="banditChief"?C.gold:C.cloth3,A,F);
      if(e.cfg.reach>200){ /* 远程：火绳枪 / 强弩 */
        r.seg(x+face*10*S,y-26*S+bob,x+face*36*S,y-30*S+bob,3*S,C.wood,A,F);
        r.seg(x+face*24*S,y-30*S+bob,x+face*38*S,y-38*S+bob,2*S,C.steel,A,F);
        r.ell(x+face*36*S,y-30*S+bob,2.4*S,2.4*S,C.gold,A,F);
      }else{ /* 近战：砍刀 */
        r.seg(x+face*11*S,y-24*S+bob,x+face*28*S,y-42*S+bob,2.6*S,C.wood,A,F);
        r.quad(x+face*24*S,y-48*S+bob,6*S,16*S,C.steel,.92,F);
      }
      if(e.type==="banditChief"){
        r.glow(x,y-40*S+bob,26*S,26*S,C.gold,1,.20);
        r.tri(x-9*S,y-52*S,x,y-62*S,x+9*S,y-52*S,C.red,.9,0);
      }
    }
  }
  function drawMob(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    if(!onScreen(p,110))return;
    const HUMAN=["pigman","bandit","banditChief","archer","thug","axeman"];
    /* 动物 / 灵体 / 幽灵一律只画专属形态，避免「人形底 + 动物」重影 */
    if(HUMAN.indexOf(e.type)>=0)humanoidMob(e,r,p,s);
    else beast(e,r,p,s);
    /* 血条与护盾条 */
    const bar=32*s*(e.w||1),yy=p.y-72*s*(e.ht||1);
    const col=e.hostile?(e.cfg.bar||C.hpRed):C.hpBlue;
    r.quad(p.x-bar/2-1*s,yy-1*s,bar+2*s,5*s,C.black,.75,0);
    r.quad(p.x-bar/2,yy,bar,3.6*s,C.hpbg,.9,0);
    r.quad(p.x-bar/2,yy,bar*U.clamp(e.hp/e.maxHp,0,1),3.6*s,col,1,0);
    if(!e.hostile)r.ring(p.x,yy+1.8*s,bar*.56,3.2*s,1*s,C.hpBlue,.42,0,12);
    CR.render.drawShieldBar(e,yy-7*s,bar);
  }

  /* ================= 世界标签（DOM 悬浮 / 长按说明） ================= */
  function drawWorldLabels(){
    if(CR.game&&CR.game.state==="menu"){CR.ui.setWorldLabels([]);return;}
    const out=[],RI=CFG.REGION_INFO.border,z=CFG.BORDER_ZONES[B.zone];
    out.push({text:"🌧 雨沼边境走廊 · 推荐 Lv.85+ · "+z.name,sx:G.W*.5,sy:G.H*.135,
      cls:"region",tip:{title:RI.icon+" "+RI.name,kind:"过渡带 · "+z.danger,
        lines:[RI.desc,"当前分区："+z.name+"（"+z.desc+"）","按 G 查看完整区域情报 · 鼠标悬浮 / 长按看对象说明"]}});
    const add=(o,title,lines,kind)=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:title,sx:p.x,sy:p.y-96*G.S,cls:kind||"npc",
        tip:{title,kind:kind==="mob"?"可攻击对象":(kind==="node"?"资源点":"NPC"),lines}});
    };
    for(const k in CFG.BORDER_NPCS){
      const n=CFG.BORDER_NPCS[k];
      add(n,n.icon+" "+n.name,[n.desc,
        "所在分区："+CFG.BORDER_ZONES[CFG.borderZoneAt(n.x)].name]);
    }
    B.nodes.forEach(n=>add(n,n.icon+" "+n.name,
      [n.desc,B.toolInfo(n),"每日 "+n.daily+" 次 · 今日剩余 "+SV.gatherLeft(n.id)+" 次"],"node"));
    [B.mobs,B.hostiles].forEach(arr=>arr.forEach(e=>{
      if(!e.alive)return;
      const p=pr(e.x,e.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:"",sx:p.x,sy:p.y-40*G.S,cls:"mob",
        tip:{title:e.cfg.label,kind:e.halfNeutral?"半中立":(e.hostile?"敌对 · 不死不休":"中立"),
          lines:[e.cfg.desc||"",e.cfg.behavior||CFG.AI_DOC.neutral,
            "数值 ×"+(CFG.BORDER_STAT_MUL||3.25)+" · 系别 "+(e.cfg.element||"普通系")+
            " · 掉落 "+(e.cfg.drops||[]).map(k=>(CFG.MATERIALS[k]||CFG.ITEMS[k]||CFG.EQUIPMENT[k]||{}).name||k).join(" / ")]}});
    }));
    /* v1.4 dev3：所有会走动的不可交互路人头顶加姓名标签（参考狂欢集市） */
    B.walkers.forEach(w=>{
      if(Math.abs(P.x-w.x)>480)return;
      const p=pr(w.x,w.depth,0);
      if(p.x<-80||p.x>G.W+80)return;
      out.push({text:w.name,sx:p.x,sy:p.y-62*G.S,cls:"walker",
        tip:{title:w.name,kind:"路人 · "+(CFG.BORDER_ZONES[w.zone]||{}).name,
          lines:[w.line||"只是路过这里的人","不会主动攻击 · 鼠标悬浮 / 长按可查看"]}});
    });
    CR.ui.setWorldLabels(out);
  }
  /* ================= BOSS 顶部血条 ================= */
  function drawBossHud(){
    const boss=B.hostiles.find(e=>e&&e.alive&&e.type==="ogreMage");
    if(!boss||!boss.alerted)return;
    const r=R(),S=G.S,W=G.W;
    const w=Math.min(W*.52,560*S),x=(W-w)/2,y=26*S;
    r.quad(x-3*S,y-3*S,w+6*S,15*S,C.black,.7,0);
    r.quad(x,y,w,9*S,C.hpbg,.9,0);
    r.quad(x,y,w*U.clamp(boss.hp/boss.maxHp,0,1),9*S,C.hpViolet,1,0);
    CR.render.drawText("🜏 食人魔 · 暗系 BOSS",W/2,y-13*S,11*S,C.ghostViolet,.9);
  }

  /* ================= 主绘制 ================= */
  function drawScene(){
    const r=R();
    drawSky();drawGround();drawPonds();drawMist();
    drawWheatFields();                    /* dev3：大片麦田铺在实体物件之前 */
    drawGate();drawTent();drawGargoyle();
    drawParticles();
    list.length=0;
    const vl=WLD.camX-260,vr=WLD.camX+G.W/G.S+260;
    B.trees.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("tree",o);});
    B.vines.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("vine",o);});
    B.reeds.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("reed",o);});
    B.wheat.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("wheat",o);});
    B.haystacks.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("haystack",o);});
    B.carts.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("cart",o);});
    B.ruins.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("ruin",o);});
    B.fences.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("fence",o);});
    B.tools.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("tool",o);});
    B.towers.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("tower",o);});
    B.nodes.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("node",o);});
    B.walkers.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("walker",o);});
    for(const k in CFG.BORDER_NPCS)push("npc",CFG.BORDER_NPCS[k]);
    B.mobs.forEach(e=>{if(e.alive)push("mob",e);});
    B.hostiles.forEach(e=>{if(e.alive)push("mob",e);});
    E.drops.each(d=>push("drop",d));
    push("player",P);
    list.sort((a,b)=>(a.o.depth||0)-(b.o.depth||0));
    for(let i=0;i<list.length;i++){
      const it=list[i],o=it.o;
      switch(it._t){
        case "tree":drawTree(o);break;
        case "vine":drawVine(o);break;
        case "reed":drawReed(o);break;
        case "wheat":drawWheat(o);break;
        case "haystack":drawHaystack(o);break;
        case "cart":drawCart(o);break;
        case "ruin":drawRuin(o);break;
        case "fence":drawFence(o);break;
        case "tool":drawTool(o);break;
        case "tower":drawTower(o);break;
        case "node":drawNode(o);break;
        case "walker":drawWalker(o);break;
        case "npc":drawNPC(o);break;
        case "mob":drawMob(o);break;
        case "drop":CR.render.drawDrop(o);break;
        case "player":{
          CR.render.drawHumanoid(o,true);
          const pp=pr(o.x,o.depth,0);
          CR.render.drawShieldBar(o,pp.y-72*pp.s*(o.ht||1),40*pp.s*(o.w||1));
          break;}
      }
    }
    E.beams.each(CR.render.drawBeam);
    E.shots.each(CR.render.drawShot);
    E.ghosts.each(CR.render.drawGhost);
    E.parts.each(CR.render.drawPart);
    E.floats.each(CR.render.drawFloat);
    drawBossHud();drawWorldLabels();
  }
  CR.renderBorder={drawScene,skyColors,drawMob,drawWorldLabels};
})(window.CR=window.CR||{});
