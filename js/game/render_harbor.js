/* render_harbor.js — 星火港全部画面几何（WebGL 单批次）· v1.2.1 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,HB=CR.harbor,SV=CR.save;
  const G=CR.gl;
  const list=[],itemPool=[];
  function push(t,o){let it=itemPool[list.length];
    if(!it){it={_t:"",o:null};itemPool.push(it);}
    it._t=t;it.o=o;list.push(it);}
  function R(){return G.R;}
  function pr(x,d,h){return WLD.proj(x,d,h);}
  const HILL=[[0,.60],[.14,.46],[.28,.55],[.42,.40],[.58,.52],[.72,.38],[.86,.50],[1,.58]];

  /* ================= 天空 / 海面 / 远景 ================= */
  function skyColors(){
    const night=HB.isNight,dusk=HB.st.phase==="dusk";
    if(night)return {top:[.02,.04,.12],mid:[.06,.12,.26],low:[.18,.26,.40],horizon:[.26,.36,.50],night:true,dusk:false};
    if(dusk)return {top:[.14,.16,.38],mid:[.52,.32,.48],low:[1,.56,.34],horizon:[1,.72,.44],night:false,dusk:true};
    return {top:[.10,.28,.52],mid:[.32,.58,.74],low:[.72,.84,.86],horizon:[.86,.90,.88],night:false,dusk:false};
  }
  function drawSky(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555;
    r.quadG(0,0,W,hy*.58,c.top,c.mid,1,0);
    r.quadG(0,hy*.58,W,hy*.42,c.mid,c.low,1,0);
    // 日月
    const sunX=W*(c.dusk?.76:(c.night?.18:.24)),sunY=hy*(c.night?.30:.26);
    if(c.night){
      r.glow(sunX,sunY,26*S,26*S,C.snow,.55,.9);
      r.ell(sunX,sunY,15*S,15*S,[.88,.92,1],.9,0,true);
      r.ell(sunX+6*S,sunY-3*S,13*S,13*S,c.top,.85,0,true);
      U.srand(9182);
      for(let i=0;i<58;i++){
        const x=U.rr(0,W),y=U.rr(0,hy*.66);
        r.ell(x,y,U.rr(.7,1.7)*S,U.rr(.7,1.7)*S,C.white,U.rr(.18,.65)*
          (.7+.3*Math.sin(CR.game.time*1.4+i)),0);
      }
    }else{
      r.glow(sunX,sunY,60*S,60*S,c.dusk?C.orange:C.sun,c.dusk?.9:.55,.85);
      r.ell(sunX,sunY,20*S,20*S,c.dusk?C.fire2:C.sun,.95,0,true);
    }
    // 远山海平线剪影
    for(let i=0;i<HILL.length-1;i++){
      const a=HILL[i],b=HILL[i+1];
      const x0=a[0]*W,x1=b[0]*W,y0=hy-H*.10-a[1]*H*.10,y1=hy-H*.10-b[1]*H*.10;
      r.tri(x0,hy,x1,hy,x1,y1,c.night?[.05,.09,.18]:[.22,.34,.44],.85,0);
      r.tri(x0,hy,x1,y1,x0,y0,c.night?[.04,.07,.15]:[.18,.30,.40],.85,0);
    }
    // 海面：位于地平线之上的远处海带，近景地面从 hy 往下铺
    const seaTop=hy-H*.155,seaH=H*.145;
    r.quadG(0,seaTop,W,seaH*.45,c.horizon,c.night?C.seaDeep:C.sea,1,0);
    r.quadG(0,seaTop+seaH*.45,W,seaH*.55,c.night?C.seaDeep:C.sea,
      c.night?C.black:C.seaDeep,1,0);
    U.srand(20261115);
    const t=CR.game.time;
    for(let k=0;k<9;k++){
      const yy=seaTop+seaH*(.04+k*.105);
      const a=c.night?.16:.24;
      const col=c.night?C.seaLite:C.foam;
      for(let i=0;i<11;i++){
        const x=((i*137+k*61+t*(12+k*3))%(W+180))-90;
        const len=U.rr(18,64)*S*(1+k*.06);
        r.seg(x,yy,x+len,yy,U.rr(1,2.4)*S,col,a*(.6+.4*Math.sin(t*1.3+i+k)),0);
      }
    }
    // 日光 / 月光在海面上的反光柱
    if(!c.night){
      for(let k=0;k<7;k++){
        const y=seaTop+seaH*(.06+k*.13),w=(50+k*34)*S;
        r.ell(sunX+Math.sin(t*.7+k)*20*S,y,w,2.4*S,c.dusk?C.fire2:C.sun,.10-k*.011,0);
      }
    }
    // 帆船剪影
    HB.ships.forEach(sh=>{
      const x=((sh.x-WLD.camX*.22)%(W+360)+W+360)%(W+360)-180;
      const y=seaTop+seaH*.38+Math.sin(t*.8+sh.phase)*3*S;
      const s=sh.scale*S;
      r.quad(x-26*s,y,52*s,7*s,c.night?[.05,.08,.14]:[.16,.24,.32],.9,0);
      r.tri(x-24*s,y,x-30*s,y-6*s,x-24*s,y-6*s,c.night?[.05,.08,.14]:[.16,.24,.32],.9,0);
      r.seg(x,y,x,y-40*s,1.6*s,c.night?[.06,.10,.18]:[.18,.26,.34],.9,0);
      if(sh.sail){
        r.tri(x+1*s,y-38*s,x+1*s,y-6*s,x+19*s,y-9*s,
          c.night?[.12,.16,.26]:[.86,.88,.84],.72,0);
      }else{
        r.tri(x-18*s,y-36*s,x-1*s,y-8*s,x-1*s,y-36*s,
          c.night?[.10,.14,.24]:[.80,.84,.82],.66,0);
      }
    });
    // 海鸥（屏幕空间）
    HB.gulls.forEach(g=>{
      const w=g.size*S,flap=Math.sin(t*4+g.phase)*.5;
      r.seg(g.sx-w,g.sy-flap*w*.5,g.sx,g.sy,1.5*S,
        c.night?[.6,.7,.85]:[.20,.24,.30],.8,0);
      r.seg(g.sx,g.sy,g.sx+w,g.sy-flap*w*.5,1.5*S,
        c.night?[.6,.7,.85]:[.20,.24,.30],.8,0);
    });
    // 远处海雾
    r.quadG(0,seaTop-8*S,W,seaH*.28,c.horizon,c.horizon,.16,0);
  }

  /* ================= 地面：木甲板 / 沙滩 / 石板 / 草丛 ================= */
  function drawGround(){
    const r=R(),W=G.W,H=G.H,S=G.S,hy=H*.555;
    const bands=[-96,-58,-18,22,60,100];
    const segs=WLD.groundSegments();
    const viewL=WLD.camX-160,viewR=WLD.camX+W/S+160;
    for(let i=0;i<segs.length;i++){
      const g=segs[i];
      if(g.x1<viewL||g.x0>viewR)continue;
      const mat=CFG.GROUND[g.type]||CFG.GROUND.stone;
      const a=pr(g.x0,0,0).x,b=pr(g.x1,0,0).x;
      for(let j=0;j<bands.length-1;j++){
        const y0=hy+bands[j]*.58*S,y1=hy+bands[j+1]*.58*S;
        r.quadG(a,y0,b-a,y1-y0,mat.c1,mat.c2,1,0);
      }
      const yb=hy+bands[bands.length-1]*.58*S;
      r.quadG(a,yb,b-a,H-yb,mat.c2,U.shade(mat.c2,.58),1,0);
      if(g.type==="deck"){
        // 木板缝 + 铆钉
        for(let x=g.x0;x<g.x1;x+=34){
          const px=pr(x,0,0).x;
          r.seg(px,hy-96*.58*S,px,H,1.2*S,mat.c2,.42,0);
        }
        for(let j=1;j<bands.length;j++){
          const y=hy+bands[j]*.58*S;
          r.quad(a,y,b-a,1.1*S,mat.c2,.30,0);
        }
        U.srand(Math.floor(g.x0));
        for(let k=0;k<4;k++){
          const px=pr(g.x0+U.rr(4,116),0,0).x,py=hy+U.rr(-50,260)*.58*S;
          r.ell(px,py,1.3*S,1.3*S,C.iron,.45,0);
        }
      }else if(g.type==="stone"||g.type==="beach"||g.type==="sand"){
        U.srand(Math.floor(g.x0)+3);
        for(let k=0;k<10;k++){
          const px=pr(g.x0+U.rr(0,120),0,0).x;
          const py=hy+U.rr(-50,Math.min(500,(H-hy)/(.58*S)))*.58*S;
          r.ell(px,py,U.rr(2,6)*S,1.4*S,mat.c2,.26,0);
        }
      }else{
        U.srand(Math.floor(g.x0)+11);
        for(let k=0;k<6;k++){
          const px=pr(g.x0+U.rr(0,120),0,0).x;
          const py=hy+U.rr(60,Math.min(480,(H-hy)/(.58*S)))*.58*S;
          r.ell(px,py,U.rr(2,4)*S,1.2*S,mat.c2,.22,0);
        }
      }
    }
    // 码头边缘木沿 + 阴影
    r.quadG(0,hy-98*.58*S,W,5*S,C.deckLite,C.deckDk,.85,0);
    r.quadG(0,H*.88,W,H*.12,C.shadow,C.shadow,.16,0);
    // 木桩（沿纵深）
    for(let x=Math.floor(viewL/180)*180;x<viewR;x+=180){
      const p=pr(x,-96,0),s=p.s;
      r.seg(p.x,p.y,p.x,p.y-42*s,7*s,C.deckDk,.95,0);
      r.ell(p.x,p.y-42*s,5*s,2*s,C.deckLite,.9,0);
    }
  }

  /* ================= 港口物件 ================= */
  function drawBarrel(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s,h=o.h*s,w=11*s;
    r.ell(p.x,p.y+2*s,w*1.15,3.2*s,C.shadow,.28,0,true);
    r.quad(p.x-w,p.y-h,w*2,h,C.barrel,1,0);
    r.quad(p.x-w,p.y-h,w*.55,h,U.shade(C.barrel,1.18),.55,0);
    r.ell(p.x,p.y-h,w,3.4*s,C.barrelDk,1,0);
    r.ell(p.x,p.y-h+1*s,w*.82,2.4*s,U.shade(C.barrel,1.3),1,0);
    r.quad(p.x-w,p.y-h*.72,w*2,2.2*s,C.ironDk,.9,0);
    r.quad(p.x-w,p.y-h*.26,w*2,2.2*s,C.ironDk,.9,0);
    r.seg(p.x-w*.7,p.y-h*.92,p.x-w*.7,p.y-h*.1,1*s,C.rope,.35,0);
  }
  function drawCrate(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s,w=o.w*s,h=o.h*s;
    for(let k=0;k<o.stack;k++){
      const oy=p.y-k*(h*.82);
      r.ell(p.x,oy+2*s,w*.6,3*s,C.shadow,.24,0,true);
      r.quad(p.x-w/2,oy-h,w,h,C.crate,1,0);
      r.quad(p.x-w/2,oy-h,w,h*.16,U.shade(C.crate,1.16),.8,0);
      r.quad(p.x-w/2,oy-h,w*.14,h,C.crateDk,.7,0);
      r.seg(p.x-w/2,oy-h,p.x+w/2,oy,1.6*s,C.crateDk,.7,0);
      r.seg(p.x+w/2,oy-h,p.x-w/2,oy,1.6*s,C.crateDk,.7,0);
    }
  }
  function drawPalm(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s,h=o.h*s;
    const lean=o.lean*h+Math.sin(CR.game.time*.7+o.phase)*3*s;
    r.ell(p.x,p.y,18*s,4*s,C.shadow,.22,0,true);
    r.seg(p.x,p.y,p.x+lean,p.y-h,7*s,C.wood,1,0);
    r.seg(p.x+1*s,p.y,p.x+lean+1*s,p.y-h,2*s,C.deckLite,.35,0);
    const tx=p.x+lean,ty=p.y-h;
    for(let k=0;k<7;k++){
      const a=-Math.PI*.92+k*Math.PI*.30+Math.sin(CR.game.time*.9+o.phase+k)*.06;
      const L=(30+((k*7)%14))*s;
      const ex=tx+Math.cos(a)*L,ey=ty+Math.sin(a)*L*.55+8*s;
      r.seg(tx,ty,tx+Math.cos(a)*L*.55,ty+Math.sin(a)*L*.32+6*s,3*s,
        k%2?C.palm:C.palmDk,1,0);
      r.tri(tx+Math.cos(a)*L*.5,ty+Math.sin(a)*L*.3+5*s,ex,ey,
        tx+Math.cos(a)*L*.72+Math.sin(a)*7*s,ty+Math.sin(a)*L*.42+12*s,
        k%2?C.palm:C.leaf1,.9,0);
    }
    r.ell(tx-4*s,ty+5*s,4*s,4*s,C.brown,1,0);
    r.ell(tx+4*s,ty+7*s,3.6*s,3.6*s,C.brown,1,0);
  }
  function drawLamp(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s,h=o.h*s;
    const on=HB.isNight||HB.st.phase==="dusk";
    r.seg(p.x,p.y,p.x,p.y-h,4*s,C.ironDk,1,0);
    r.quad(p.x-7*s,p.y-h,14*s,4*s,C.ironDk,1,0);
    r.ell(p.x,p.y-h-6*s,7*s,8*s,on?C.lampGlow:C.iron,.95,0);
    if(on){
      r.glow(p.x,p.y-h-6*s,16*s,20*s,C.lampGlow,1.25,.9);
      r.quad(p.x-3*s,p.y-h-14*s,6*s,3*s,C.goldDk,1,0);
    }
    r.seg(p.x,p.y-h*.5,p.x-9*s,p.y-h*.55,2*s,C.rope,.6,0);
  }
  function drawRope(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const sw=Math.sin(CR.game.time*.8+o.phase)*6*s;
    r.seg(p.x-o.len*s*.5,p.y-52*s,p.x+sw,p.y-52*s+o.len*s*.32,2*s,C.rope,.75,0);
    r.seg(p.x+sw,p.y-52*s+o.len*s*.32,p.x+o.len*s*.5,p.y-52*s,2*s,C.rope,.75,0);
  }
  function drawBuoy(o){
    const r=R(),W=G.W,H=G.H,S=G.S;
    const x=((o.x-WLD.camX*.30)%(W+260)+W+260)%(W+260)-130;
    const y=H*.555-H*.105+Math.sin(CR.game.time*1.4+o.phase)*3*S;
    r.ell(x,y,5*S,7*S,C.flag,1,0);
    r.quad(x-3*S,y-7*S,6*S,3*S,C.white,.9,0);
    r.seg(x,y-7*S,x,y-15*S,1.4*S,C.ironDk,.9,0);
    r.ell(x,y-15*S,2.5*S,2.5*S,C.lampGlow,.8,0);
  }
  function drawLighthouse(){
    const r=R(),x=CFG.HARBOR_NPCS.trial.x+210,depth=-96;
    const p=pr(x,depth,0),s=p.s,h=210*s;
    r.ell(p.x,p.y,30*s,7*s,C.shadow,.3,0,true);
    r.trap(p.x,p.y-h,p.y,38*s,54*s,[.86,.88,.90],[.60,.64,.70],1,0);
    for(let k=0;k<4;k++)
      r.quad(p.x-26*s+k*3*s,p.y-h+k*44*s,54*s-k*6*s,7*s,C.flag,.55,0);
    r.quad(p.x-24*s,p.y-h-16*s,48*s,16*s,C.ironDk,1,0);
    r.ell(p.x,p.y-h-16*s,24*s,6*s,C.iron,1,0);
    const on=HB.isNight||HB.st.phase==="dusk";
    r.ell(p.x,p.y-h-6*s,11*s,11*s,on?C.lampGlow:C.iron,.95,0);
    if(on){
      r.glow(p.x,p.y-h-6*s,28*s,28*s,C.lampGlow,1.4,1);
      // 旋转光束
      const a=CR.game.time*.55;
      r.tri(p.x,p.y-h-6*s,
        p.x+Math.cos(a-.16)*340*s,p.y-h-6*s+Math.sin(a-.16)*90*s,
        p.x+Math.cos(a+.16)*340*s,p.y-h-6*s+Math.sin(a+.16)*90*s,
        C.lampGlow,.075,0);
    }
    r.tri(p.x-24*s,p.y-h-16*s,p.x+24*s,p.y-h-16*s,p.x,p.y-h-34*s,C.flag,1,0);
  }
  function drawGrass(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const sw=Math.sin(CR.game.time*1.8+o.phase)*2*s+o.sway*9*s;
    for(let k=0;k<3;k++)
      r.seg(p.x+(k-1)*3.5*s,p.y,p.x+(k-1)*2.5*s+sw,p.y-o.h*s*(.7+k*.16),
        2.1*s,k%2?C.leaf2:C.leaf1,1,0);
  }

  /* ================= 采集点 ================= */
  function drawNode(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s,left=SV.gatherLeft(o.id),used=left<=0;
    const flash=o.flash||0;
    r.ell(p.x,p.y+2*s,34*s,8*s,C.shadow,.26,0,true);
    if(o.kind==="ore"){
      for(let k=0;k<5;k++){
        const dx=(k-2)*10*s,hh=(16+((k*7)%13))*s;
        r.tri(p.x+dx-8*s,p.y,p.x+dx,p.y-hh,p.x+dx+9*s,p.y,
          k%2?C.stone:C.stoneDk,used?.55:1,0);
      }
      for(let k=0;k<4;k++){
        const gx=p.x+(k*13-20)*s,gy=p.y-(12+k*7)*s;
        r.ell(gx,gy,2.6*s,2.6*s,k%2?C.copper:C.iron,used?.35:1,0);
      }
      r.quad(p.x-30*s,p.y-3*s,60*s,4*s,C.wood,1,0);
      r.ell(p.x-30*s,p.y-1*s,4*s,4*s,C.ironDk,1,0);
      r.ell(p.x+30*s,p.y-1*s,4*s,4*s,C.ironDk,1,0);
    }else if(o.kind==="apple"){
      r.seg(p.x,p.y,p.x,p.y-78*s,9*s,C.wood,1,0);
      r.seg(p.x,p.y-52*s,p.x-24*s,p.y-66*s,4*s,C.wood,1,0);
      r.seg(p.x,p.y-46*s,p.x+25*s,p.y-62*s,4*s,C.wood,1,0);
      for(let k=0;k<5;k++){
        const a=k*1.257+o.pulse,ex=p.x+Math.cos(a)*30*s,ey=p.y-88*s+Math.sin(a)*16*s;
        r.ell(ex,ey,22*s,17*s,k%2?C.leaf1:C.leaf2,used?.6:1,0,true);
      }
      for(let k=0;k<6;k++){
        const a=k*1.05+.4,ex=p.x+Math.cos(a)*26*s,ey=p.y-84*s+Math.sin(a)*14*s;
        r.ell(ex,ey,4.2*s,4.6*s,C.red,used?.4:1,0);
        r.ell(ex-1.2*s,ey-1.4*s,1.3*s,1.4*s,C.white,.5,0);
      }
    }else{
      for(let k=0;k<7;k++){
        const dx=(k-3)*7*s,hh=(20+((k*5)%15))*s;
        const sw=Math.sin(CR.game.time*1.6+o.pulse+k)*4*s;
        r.seg(p.x+dx,p.y,p.x+dx+sw,p.y-hh,2.6*s,k%2?C.leaf1:C.leaf2,used?.6:1,0);
      }
      r.ell(p.x,p.y-6*s,4*s,4*s,C.egg||C.white,used?.4:1,0);
      r.ell(p.x+12*s,p.y-3*s,3*s,3*s,C.snow,used?.4:1,0);
    }
    // 可采集光环 / 用完变灰
    const col=used?C.stoneDk:(o.kind==="ore"?C.copper:(o.kind==="apple"?C.red:C.green));
    if(!used){
      const pulse=.55+.45*Math.sin(CR.game.time*2.4+o.pulse);
      r.ring(p.x,p.y-2*s,40*s,12*s,1.6*s,col,.22+.15*pulse,0,20);
      r.glow(p.x,p.y-40*s,10*s,14*s,col,.5,.35*pulse);
    }else{
      r.ring(p.x,p.y-2*s,40*s,12*s,1.4*s,C.stoneDk,.16,0,20);
    }
    if(flash>0)r.glow(p.x,p.y-42*s,44*s,44*s,col,1.2,flash*.55);
    // 采集进度环
    if(HB.gather&&HB.gather.id===o.id){
      const k=U.clamp(HB.gather.t/HB.gather.dur,0,1);
      r.ring(p.x,p.y-96*s,17*s,17*s,3.2*s,C.gold,.25,0,22);
      r.sector(p.x,p.y-96*s,11*s,17*s,-Math.PI/2,-Math.PI/2+k*U.TAU,C.gold,.95,0,22);
      r.ell(p.x,p.y-96*s,5*s,5*s,C.gold,.9,0);
    }
  }

  /* ================= NPC / 行人 / 半中立怪 ================= */
  function drawTrader(){
    const r=R(),n=CFG.HARBOR_NPCS.trader,p=pr(n.x,n.depth,0),s=p.s;
    r.ell(p.x,p.y,20*s,5*s,C.shadow,.3,0,true);
    r.quad(p.x-15*s,p.y-54*s,30*s,42*s,C.cloth3,1,0);      // 围裙
    r.quad(p.x-13*s,p.y-52*s,26*s,16*s,C.white,.55,0);
    r.ell(p.x,p.y-62*s,11*s,11*s,C.skin,1,0,true);
    r.ell(p.x,p.y-70*s,12*s,5*s,C.ironDk,1,0);
    r.seg(p.x-7*s,p.y-64*s,p.x-3*s,p.y-63*s,1.4*s,C.black,1,0);
    r.seg(p.x+3*s,p.y-64*s,p.x+7*s,p.y-63*s,1.4*s,C.black,1,0);
    r.seg(p.x-16*s,p.y-44*s,p.x-26*s,p.y-24*s,6*s,C.skin,1,0);
    r.seg(p.x+16*s,p.y-44*s,p.x+27*s,p.y-28*s,6*s,C.skin,1,0);
    // 秤
    r.seg(p.x+27*s,p.y-28*s,p.x+27*s,p.y-48*s,1.6*s,C.gold,1,0);
    r.seg(p.x+18*s,p.y-48*s,p.x+36*s,p.y-48*s,1.6*s,C.gold,1,0);
    r.ell(p.x+18*s,p.y-42*s,4*s,2*s,C.gold,1,0);
    r.ell(p.x+36*s,p.y-42*s,4*s,2*s,C.gold,1,0);
  }
  function drawBlack(){
    const r=R(),n=CFG.HARBOR_NPCS.black,p=pr(n.x,n.depth,0),s=p.s;
    r.ell(p.x,p.y,22*s,6*s,C.shadow,.35,0,true);
    r.tri(p.x-20*s,p.y,p.x+20*s,p.y,p.x,p.y-78*s,C.ghostDark,1,0);
    r.ell(p.x,p.y-62*s,13*s,14*s,C.ghostDark,1,0,true);
    r.ell(p.x,p.y-60*s,10*s,9*s,C.black,1,0);
    r.ell(p.x+4*s,p.y-60*s,2.4*s,2.4*s,C.ghostViolet,1,0);
    r.glow(p.x+4*s,p.y-60*s,6*s,6*s,C.ghostViolet,.7,.8);
    r.tri(p.x-15*s,p.y-70*s,p.x+15*s,p.y-70*s,p.x,p.y-90*s,C.ghostDark,1,0);
    r.quad(p.x-20*s,p.y-40*s,40*s,3*s,C.ghostViolet,.5,0);
    if(HB.isNight)r.glow(p.x,p.y-48*s,30*s,34*s,C.ghostViolet,.55,.55);
  }
  function drawTrialSakura(){
    const r=R(),n=CFG.HARBOR_NPCS.trial,p=pr(n.x,n.depth,0),s=p.s;
    const bob=Math.sin(CR.game.time*1.5)*4*s;
    r.ell(p.x,p.y,24*s,6*s,C.shadow,.24,0,true);
    // 幽灵尾（半透明）
    r.tri(p.x-16*s,p.y-6*s,p.x+16*s,p.y-6*s,p.x+bob*.4,p.y+22*s,C.ghostPink,.35,0);
    // 粉色汉服
    r.quad(p.x-17*s,p.y-58*s+bob,34*s,46*s,C.ghostPink,1,0);
    r.quad(p.x-17*s,p.y-58*s+bob,34*s,7*s,C.sakura,.9,0);
    r.quad(p.x-19*s,p.y-30*s+bob,38*s,5*s,C.pinkDk,.8,0);
    r.tri(p.x-17*s,p.y-58*s+bob,p.x-26*s,p.y-20*s+bob,p.x-13*s,p.y-24*s+bob,C.pink,1,0);
    r.tri(p.x+17*s,p.y-58*s+bob,p.x+26*s,p.y-20*s+bob,p.x+13*s,p.y-24*s+bob,C.pink,1,0);
    // 头 / 粉发
    r.ell(p.x,p.y-72*s+bob,12*s,12*s,C.skin,1,0,true);
    r.ell(p.x,p.y-78*s+bob,14*s,9*s,C.pink,1,0,true);
    r.ell(p.x-12*s,p.y-70*s+bob,5*s,13*s,C.pink,1,0,true);
    r.ell(p.x+12*s,p.y-70*s+bob,5*s,13*s,C.pink,1,0,true);
    r.seg(p.x-5*s,p.y-72*s+bob,p.x-2*s,p.y-71*s+bob,1.2*s,C.black,1,0);
    r.seg(p.x+2*s,p.y-72*s+bob,p.x+5*s,p.y-71*s+bob,1.2*s,C.black,1,0);
    // 樱花与幽光
    r.glow(p.x,p.y-50*s+bob,34*s,40*s,C.sakura,.7,.55);
    for(let k=0;k<5;k++){
      const a=CR.game.time*.7+k*1.257;
      const px=p.x+Math.cos(a)*34*s,py=p.y-56*s+bob+Math.sin(a)*24*s;
      r.tri(px,py-3*s,px+3*s,py,px,py+3*s,C.sakura,.85,0);
      r.tri(px,py-3*s,px-3*s,py,px,py+3*s,C.pink,.85,0);
    }
  }
  function drawWalker(w){
    const r=R(),p=pr(w.x,w.depth,0),s=p.s;
    const bob=Math.abs(Math.sin(CR.game.time*3+w.t))*3*s;
    r.ell(p.x,p.y,12*s,3.5*s,C.shadow,.28,0,true);
    r.quad(p.x-9*s,p.y-42*s-bob,18*s,30*s,w.color,1,0);
    r.ell(p.x,p.y-50*s-bob,8*s,8*s,C.skin,1,0,true);
    r.seg(p.x-4*s,p.y-12*s,p.x-6*s,p.y,5*s,C.ironDk,1,0);
    r.seg(p.x+4*s,p.y-12*s,p.x+6*s,p.y,5*s,C.ironDk,1,0);
    r.ell(p.x,p.y-57*s-bob,9*s,3*s,C.deckDk,.8,0);
  }
  function drawTerritory(e){
    const r=R(),p=pr(e.home.x,e.home.depth,0),s=p.s;
    const col=e.hostile?C.red:C.hpAmber;
    r.ring(p.x,p.y,e.territory*s,e.territory*s*.20,1.4*s,col,e.hostile?.20:.13,0,26);
    // 领地边界短刻度
    for(let k=0;k<12;k++){
      const a=k/12*U.TAU;
      const x=p.x+Math.cos(a)*e.territory*s,y=p.y+Math.sin(a)*e.territory*s*.20;
      r.quad(x-1.2*s,y-1.2*s,2.4*s,2.4*s,col,.28,0);
    }
  }
  function drawSeed(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    const bob=Math.abs(Math.sin(e.anim*1.8))*6*s;
    r.ell(p.x,p.y,15*s,4*s,C.shadow,.28,0,true);
    r.ell(p.x,p.y-15*s-bob,15*s,15*s,e.cfg.main,1,0,true);
    r.ell(p.x-4*s,p.y-20*s-bob,9*s,7*s,U.shade(e.cfg.main,1.2),.55,0,true);
    r.seg(p.x,p.y-30*s-bob,p.x+3*s,p.y-44*s-bob,2.4*s,C.leaf2,1,0);
    r.ell(p.x-7*s,p.y-42*s-bob,7*s,3.4*s,C.leaf1,1,0);
    r.ell(p.x+8*s,p.y-39*s-bob,6*s,3*s,C.leaf3||C.leaf1,1,0);
    r.ell(p.x-5*s,p.y-16*s-bob,2*s,2.6*s,C.black,1,0);
    r.ell(p.x+5*s,p.y-16*s-bob,2*s,2.6*s,C.black,1,0);
    r.seg(p.x-3*s,p.y-9*s-bob,p.x+3*s,p.y-9*s-bob,1.4*s,C.black,.8,0);
  }
  function drawHound(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s,f=e.facing||-1;
    r.ell(p.x,p.y,22*s,5*s,C.shadow,.3,0,true);
    r.ell(p.x,p.y-18*s,20*s,12*s,e.cfg.main,1,0,true);
    r.ell(p.x+f*17*s,p.y-24*s,10*s,10*s,e.cfg.dark,1,0,true);
    r.tri(p.x+f*14*s,p.y-32*s,p.x+f*20*s,p.y-32*s,p.x+f*17*s,p.y-42*s,e.cfg.dark,1,0);
    for(let k=0;k<5;k++){
      const x=p.x+(k-2)*7*s;
      r.tri(x-3*s,p.y-29*s,x+3*s,p.y-29*s,x,p.y-38*s,e.cfg.acc,1,0);
    }
    r.ell(p.x+f*22*s,p.y-25*s,2.4*s,2.4*s,C.red,1,0);
    r.glow(p.x+f*22*s,p.y-25*s,5*s,5*s,C.red,.65,.8);
    for(let k=0;k<4;k++){
      const x=p.x+(k<2?-12:12)*s+(k%2)*5*s;
      r.seg(x,p.y-12*s,x,p.y,4*s,e.cfg.dark,1,0);
    }
    r.seg(p.x-f*20*s,p.y-22*s,p.x-f*30*s,p.y-34*s+
      Math.sin(CR.game.time*6)*4*s,3*s,e.cfg.dark,1,0);
  }
  function drawThug(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    const axeman=e.type==="axeman",f=e.facing||-1;
    r.ell(p.x,p.y,16*s,4*s,C.shadow,.3,0,true);
    r.quad(p.x-12*s,p.y-54*s,24*s,40*s,e.cfg.main,1,0);
    r.ell(p.x,p.y-62*s,10*s,10*s,C.skin,1,0,true);
    r.ell(p.x,p.y-70*s,11*s,4*s,e.cfg.dark,1,0);
    r.seg(p.x-11*s,p.y-46*s,p.x-16*s,p.y-24*s,6*s,C.skin,1,0);
    r.seg(p.x+11*s,p.y-46*s,p.x+18*s,p.y-30*s,6*s,C.skin,1,0);
    r.seg(p.x-6*s,p.y-12*s,p.x-7*s,p.y,6*s,C.ironDk,1,0);
    r.seg(p.x+6*s,p.y-12*s,p.x+8*s,p.y,6*s,C.ironDk,1,0);
    const hx=p.x+f*18*s,hy=p.y-30*s;
    if(axeman){
      r.seg(hx,hy,hx+f*14*s,hy-34*s,3*s,C.wood,1,0);
      r.tri(hx+f*11*s,hy-30*s,hx+f*20*s,hy-30*s,hx+f*16*s,hy-44*s,C.iron,1,0);
      r.quad(p.x-12*s,p.y-54*s,24*s,5*s,C.crateDk,1,0);
    }else{
      r.seg(hx,hy,hx+f*22*s,hy-10*s,3*s,C.steel,1,0);
      r.seg(hx+f*16*s,hy-7*s,hx+f*24*s,hy-14*s,2*s,C.gold,1,0);
      r.quad(p.x-11*s,p.y-62*s,22*s,3*s,C.redDk,.9,0);
    }
    if(e.hostile)r.glow(p.x,p.y-62*s,13*s,13*s,C.red,.5,.5);
  }
  function drawHalfMob(e){
    if(e.type==="seed")drawSeed(e);
    else if(e.type==="hound")drawHound(e);
    else drawThug(e);
    /* v1.2.1：p/s/r 提升到函数作用域。原先声明在血条 if 块内，
       敌对感叹号在块外引用 p.y/s 会抛 ReferenceError，
       导致 frame() 中断、rAF 链断掉 → 画面冻结但面板仍可点。 */
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    // 血条（半中立：琥珀；敌对：红）
    if(e.barT>0||e.hostile||e.hp<e.maxHp){
      const y=p.y-84*s,w=34*s;
      r.quad(p.x-w/2,y,w,4*s,C.hpbg,.85,0);
      r.quad(p.x-w/2,y,w*U.clamp(e.hp/e.maxHp,0,1),4*s,
        e.hostile?C.red:C.hpAmber,1,0);
    }
    if(e.hostile)CR.render.drawText("!",p.x,p.y-100*s,13*s,C.red,.85);
  }
  function drawTrialBoss(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    const bob=Math.sin(CR.game.time*1.6)*5*s;
    r.ell(p.x,p.y,30*s,7*s,C.shadow,.3,0,true);
    r.glow(p.x,p.y-70*s+bob,52*s,60*s,C.sakura,.85,.6);
    r.quad(p.x-24*s,p.y-84*s+bob,48*s,66*s,C.ghostPink,1,0);
    r.quad(p.x-24*s,p.y-84*s+bob,48*s,9*s,C.sakura,.95,0);
    r.tri(p.x-24*s,p.y-84*s+bob,p.x-38*s,p.y-32*s+bob,p.x-18*s,p.y-38*s+bob,C.pink,1,0);
    r.tri(p.x+24*s,p.y-84*s+bob,p.x+38*s,p.y-32*s+bob,p.x+18*s,p.y-38*s+bob,C.pink,1,0);
    r.ell(p.x,p.y-100*s+bob,16*s,16*s,C.skin,1,0,true);
    r.ell(p.x,p.y-108*s+bob,18*s,11*s,C.pink,1,0,true);
    r.ell(p.x-16*s,p.y-98*s+bob,6*s,17*s,C.pink,1,0,true);
    r.ell(p.x+16*s,p.y-98*s+bob,6*s,17*s,C.pink,1,0,true);
    r.glow(p.x-5*s,p.y-100*s+bob,4*s,4*s,C.ghostViolet,.8,.9);
    r.glow(p.x+5*s,p.y-100*s+bob,4*s,4*s,C.ghostViolet,.8,.9);
    for(let k=0;k<8;k++){
      const a=CR.game.time*.8+k*.785;
      const px=p.x+Math.cos(a)*48*s,py=p.y-70*s+bob+Math.sin(a)*38*s;
      r.tri(px,py-4*s,px+4*s,py,px,py+4*s,C.sakura,.9,0);
      r.tri(px,py-4*s,px-4*s,py,px,py+4*s,C.pink,.9,0);
    }
  }

  /* ================= 星火粒子 ================= */
  function drawSparks(){
    const r=R(),S=G.S;
    HB.parts.each(p=>{
      const a=p.alpha;
      if(p.kind===1){
        r.ell(p.x,p.y,p.size*S*1.7,p.size*S*1.7,C.spark,a*.22,0,true);
        r.ell(p.x,p.y,p.size*S*.5,p.size*S*.5,C.fire2,a,0);
      }else{
        r.ell(p.x,p.y,p.size*S*.36,p.size*S*.36,C.spark,a*.55,0);
      }
    });
    // 海面泡沫点
    const hy=G.H*.555,t=CR.game.time;
    U.srand(4471);
    for(let i=0;i<16;i++){
      const x=(U.rr(0,G.W)+t*9)%G.W,y=hy+U.rr(2,G.H*.10);
      r.ell(x,y,U.rr(2,6)*S,1.2*S,C.foam,.16,0);
    }
  }

  /* ================= 世界标签（带区域情报 tip） ================= */
  function drawWorldLabels(){
    const out=[],S=G.S;
    // 常驻区域情报标签：任何位置都能悬浮 / 长按查看本区域概要
    const R=CFG.REGION_INFO.harbor;
    out.push({text:"⚓ 星火港 · 区域情报",sx:G.W*.5,sy:G.H*.135,cls:"region",
      tip:{title:R.icon+" "+R.name,kind:"区域情报",
        lines:[R.desc,"NPC "+R.npcs.length+" · 野怪 "+R.mobs.length+
          " · BOSS "+R.bosses.length+" · 资源点 "+R.nodes.length,
          "按 G 打开完整情报卡"]}});
    const add=(text,x,d,h,cls,tip)=>{
      const p=pr(x,d,h);
      if(p.x<-160||p.x>G.W+160)return;
      out.push({text,sx:p.x,sy:p.y,cls,tip});
    };
    for(const k in CFG.HARBOR_NPCS){
      const n=CFG.HARBOR_NPCS[k];
      add(n.icon+" "+n.name,n.x,n.depth,136,k,tipNpc(k));
    }
    HB.nodes.forEach(n=>{
      const left=SV.gatherLeft(n.id);
      add(n.icon+" "+n.name+(left>0?" · "+left:" · 已采完"),n.x,n.depth,104,"node",tipNode(n));
      if(Math.abs(P.x-n.x)<220){
        const p=pr(n.x,n.depth,70);
        out.push({text:left>0?"按 F 采集":"今日已采完",sx:p.x,sy:p.y,cls:"hint"});
      }
    });
    HB.mobs.forEach(e=>{
      if(!e.alive)return;
      if(Math.abs(P.x-e.x)<360)
        add((e.hostile?"! ":"· ")+e.cfg.label.replace("半中立·",""),e.x,e.depth,96,
          e.hostile?"hostile":"halfneutral",tipMob(e));
    });
    HB.walkers.forEach(w=>{
      if(Math.abs(P.x-w.x)<260)add(w.name,w.x,w.depth,76,"walker",null);
    });
    if(HB.st.near){
      const n=HB.st.near,p=pr(n.cfg.x,n.cfg.depth,152);
      out.push({text:"按 F 交互",sx:p.x,sy:p.y,cls:"hint"});
    }
    CR.ui.setWorldLabels(out);
  }
  function tipNpc(k){
    const n=CFG.HARBOR_NPCS[k];
    return {title:n.icon+" "+n.name,kind:"NPC",lines:[n.title,n.desc]};
  }
  function tipNode(n){
    const left=SV.gatherLeft(n.id);
    return {title:n.icon+" "+n.name,kind:"资源点",
      lines:[n.desc,"每日 "+n.daily+" 次 · 今日剩余 "+left+" 次",
        "产出："+n.drops.map(d=>CFG.MATERIALS[d].name).join(" / ")]};
  }
  function tipMob(e){
    return {title:e.cfg.label,kind:"野怪 · "+e.cfg.element,
      lines:[e.cfg.desc,"状态："+(e.hostile?"已仇恨（离开领地可脱战）":"领地内巡逻（进入即仇恨）"),
        "生命 "+Math.ceil(e.hp)+" / "+e.maxHp]};
  }

  /* ================= 主绘制 ================= */
  function drawScene(){
    const r=R();
    drawSky();
    drawGround();
    drawLighthouse();
    // 按纵深排序的实体
    list.length=0;
    const vl=WLD.camX-220,vr=WLD.camX+G.W/G.S+220;
    HB.palms.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("palm",o);});
    HB.lamps.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("lamp",o);});
    HB.ropes.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("rope",o);});
    HB.crates.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("crate",o);});
    HB.barrels.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("barrel",o);});
    HB.grass.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("grass",o);});
    HB.nodes.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("node",o);});
    HB.walkers.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("walker",o);});
    push("trader",CFG.HARBOR_NPCS.trader);
    push("black",CFG.HARBOR_NPCS.black);
    if(!(HB.trial.active&&HB.trial.ref&&HB.trial.ref.alive))
      push("trialSakura",CFG.HARBOR_NPCS.trial);
    HB.mobs.forEach(e=>{if(e.alive)push("territory",e);});
    E.enemies.each(e=>push(
      e.type==="sakuraBoss"?"trialboss":
      (e.cfg&&e.cfg.ai==="halfNeutral"?"halfmob":"mob"),e));
    E.drops.each(d=>push("drop",d));
    push("player",P);
    list.sort((a,b)=>(a.o.depth||0)-(b.o.depth||0));
    for(let i=0;i<list.length;i++){
      const it=list[i],o=it.o;
      switch(it._t){
        case "palm":drawPalm(o);break;
        case "lamp":drawLamp(o);break;
        case "rope":drawRope(o);break;
        case "crate":drawCrate(o);break;
        case "barrel":drawBarrel(o);break;
        case "grass":drawGrass(o);break;
        case "node":drawNode(o);break;
        case "walker":drawWalker(o);break;
        case "trader":drawTrader();break;
        case "black":drawBlack();break;
        case "trialSakura":drawTrialSakura();break;
        case "territory":drawTerritory(o);break;
        case "halfmob":drawHalfMob(o);break;
        case "trialboss":drawTrialBoss(o);break;
        case "mob":CR.render.drawHumanoid(o,false);break;
        case "drop":CR.render.drawDrop(o);break;
        case "player":CR.render.drawHumanoid(o,true);break;
      }
    }
    HB.buoys.forEach(drawBuoy);
    E.beams.each(CR.render.drawBeam);
    E.shots.each(CR.render.drawShot);
    E.ghosts.each(CR.render.drawGhost);
    E.parts.each(CR.render.drawPart);
    drawSparks();
    E.floats.each(CR.render.drawFloat);
    drawWorldLabels();
  }
  CR.renderHarbor={drawScene,skyColors};
})(window.CR=window.CR||{});
