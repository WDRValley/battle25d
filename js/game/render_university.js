/* render_university.js — v1.4 dev4 · 魔法大学城全部画面几何
 * WebGL 单 VBO；四段子区域各自天空 / 地面 / 建筑 / 室内 / 粒子 / 后期
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,B=CR.university,SV=CR.save;
  const G=CR.gl;
  const list=[],itemPool=[];
  function push(t,o){let it=itemPool[list.length];
    if(!it){it={_t:"",o:null};itemPool.push(it);}
    it._t=t;it.o=o;list.push(it);}
  function R(){return G.R;}
  function pr(x,d,h){return WLD.proj(x,d,h);}
  const HILL=[[0,.60],[.14,.44],[.28,.56],[.42,.38],[.58,.52],[.72,.36],[.88,.50],[1,.60]];

  function skyColors(){
    const z=CFG.UNI_ZONES[B.zone]||CFG.UNI_ZONES[0];
    if(z.indoor)return {top:[.045,.055,.09],mid:[.12,.11,.14],low:[.24,.20,.18],
      horizon:[.36,.30,.24],night:true,dusk:false,hill:[.16,.14,.16],fog:z.fog,z};
    if(B.isNight)return {top:[.02,.04,.10],mid:[.07,.11,.20],low:[.13,.18,.28],
      horizon:[.20,.25,.34],night:true,dusk:false,hill:[.07,.10,.16],fog:z.fog,z};
    if(B.phase==="dusk")return {top:[.13,.15,.26],mid:[.34,.30,.36],low:[.56,.44,.36],
      horizon:[.68,.54,.40],night:false,dusk:true,hill:[.20,.18,.20],fog:z.fog,z};
    return {top:U.mix([.16,.26,.42],z.sky[0],.68),mid:U.mix([.34,.44,.60],z.sky[1],.68),
      low:U.mix([.56,.60,.66],z.sky[2],.68),horizon:z.sky[2],
      night:false,dusk:false,hill:z.hill,fog:z.fog,z};
  }
  function onScreen(p,pad){return p.x>-(pad||80)*p.s&&p.x<G.W+(pad||80)*p.s;}
  function vis(x,m){return x>=WLD.camX-(m||300)&&x<=WLD.camX+G.W/G.S+(m||300);}

  /* ================= 天空 / 远景 / 室内穹顶 ================= */
  function drawSky(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555,zi=B.zone;
    r.quadG(0,0,W,hy*.58,c.top,c.mid,1,0);
    r.quadG(0,hy*.58,W,hy*.42,c.mid,c.horizon,1,0);
    r.quadG(0,hy*.80,W,hy*.20,c.horizon,c.low,.42,0);
    if(c.z.indoor){
      /* 工会堂：高穹顶 + 彩绘玻璃光束，不画月亮与远山 */
      for(let k=0;k<7;k++){
        const x=W*(k+.5)/7;
        r.tri(x,0,x-70*S,hy*.66,x+70*S,hy*.66,[.20,.18,.26],.45,0);
      }
      r.quadG(0,0,W,hy*.16,[.16,.14,.20],[.26,.22,.24],.9,0);
      for(const wx of (B.guild?B.guild.windows:[])){
        const p=pr(wx,-100,0),xx=p.x;
        if(xx<-100||xx>W+100)continue;
        const yy=hy*.16,ww=30*S,hh=92*S;
        r.quad(xx-ww/2,yy,ww,hh,[.24,.44,.72],.72,0);
        r.quad(xx-ww/2,yy,ww,hh*.32,[.92,.58,.44],.62,0);
        r.quad(xx-ww/2,yy+hh*.66,ww,hh*.34,[.58,.82,.56],.55,0);
        r.seg(xx,yy,xx,yy+hh,2*S,[.14,.12,.16],.8,0);
        r.seg(xx-ww/2,yy+hh/2,xx+ww/2,yy+hh/2,2*S,[.14,.12,.16],.8,0);
        r.tri(xx-ww/2,yy+hh,xx+ww/2,yy+hh,xx+ww*1.5,hy+60*S,[.46,.62,.86],.10,0);
      }
      return;
    }
    const mx=W*.78,my=hy*.26;
    if(c.night){
      r.glow(mx,my,48*S,48*S,C.snow,.5,.7);
      r.ell(mx,my,17*S,17*S,[.88,.93,1],.92,0,true);
      r.ell(mx+8*S,my-3*S,15*S,15*S,c.top,.9,0,true);
      U.srand(2209);
      for(let i=0;i<64;i++)r.ell(U.rr(0,W),U.rr(0,hy*.66),U.rr(.6,1.5)*S,
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
    /* 分区远景：外街街屋 / 广场旗帜与尖顶 / 公寓屋顶 */
    U.srand(1300+zi*41);
    for(let i=0;i<26;i++){
      const x=((i*97-off*.15)%(W+240)+W+240)%(W+240)-120,y=hy+8*S;
      const h=U.rr(70,170)*S;
      r.quad(x,y-h,U.rr(28,56)*S,h,zi===2?[.28,.26,.30]:[.30,.34,.44],.45,0);
      if(zi===1){
        /* 旗帜广场远处可见工会堂尖顶与公寓屋顶，而不是一排街屋 */
        const tw=U.rr(18,30)*S;
        r.tri(x-6*S,y-h,x+20*S,y-h-tw*2.2,x+46*S,y-h,[.22,.28,.44],.58,0);
        r.seg(x+20*S,y-h-tw*2.2,x+20*S,y-h-tw*2.2-10*S,2*S,[.86,.78,.48],.55,0);
      }else r.tri(x-4*S,y-h,x+18*S,y-h-20*S,x+42*S,y-h,[.24,.28,.38],.45,0);
      if(B.isNight)for(let k=0;k<3;k++)
        r.quad(x+8*S+k*11*S,y-h+18*S+k*22*S,5*S,7*S,C.lantern,.55,0);
    }
  }
  function drawGround(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555,zi=B.zone;
    const g1=zi===2?[.30,.28,.26]:(zi===0?[.40,.42,.48]:(zi===1?[.44,.46,.52]:[.38,.36,.36]));
    const g2=zi===2?[.16,.14,.14]:(zi===0?[.22,.24,.30]:(zi===1?[.24,.27,.32]:[.20,.19,.20]));
    r.quadG(0,hy,W,H-hy,c.horizon,c.night?g2:g1,1,0);
    const vl=WLD.camX-120,vr=WLD.camX+W/S+120;
    U.srand(6631+zi*71);
    for(let x=Math.floor(vl/72)*72;x<vr;x+=72){
      const p=pr(x,0,0),yy=hy+((x*7)%9+2)*S*4,w=72*S*1.06;
      /* 石板路：横向砖缝 + 高光 */
      r.quad(p.x,yy+2*S,w,22*S,[.44,.46,.50],.30,0);
      r.seg(p.x,yy+2*S,p.x+w,yy+2*S,1*S,[.62,.64,.68],.24,0);
      r.seg(p.x+w*.5,yy+2*S,p.x+w*.5,yy+22*S,.8*S,[.30,.32,.36],.18,0);
      if(zi===2){ /* 室内：抛光石地反光 */
        r.quad(p.x,yy+8*S,w,8*S,[.52,.48,.42],.10,0);
      }
    }
    if(zi===1){ /* 广场环形铺装 */
      const f=pr(B.fountain.x,B.fountain.depth,0);
      r.ring(f.x,f.y+18*S,190*S,34*S,2*S,[.62,.68,.76],.22,0,28);
    }
  }

  /* ================= 标志性物件 ================= */
  function drawFountain(){
    const r=R(),S=G.S,c=skyColors(),f=B.fountain;
    if(!f||B.zone!==1)return;
    const p=pr(f.x,f.depth,0);
    if(!onScreen(p,260))return;
    const x=p.x,y=p.y,t=CR.game.time;
    r.ell(x,y+4*S,120*S,20*S,C.shadow,.30,0,true);
    r.ell(x,y-4*S,108*S,26*S,[.34,.44,.54],.95,0,true);
    r.ell(x,y-10*S,92*S,18*S,[.20,.56,.68],.92,0,true);
    r.ring(x,y-10*S,92*S,20*S,7*S,[.56,.62,.66],.95,0,26);
    r.seg(x,y-18*S,x,y-104*S,12*S,[.58,.62,.66],.95,0);
    r.ell(x,y-108*S,20*S,9*S,[.66,.72,.76],.95,0,true);
    for(let k=0;k<6;k++){
      const a=t*.7+k*1.047;
      const jx=x+Math.cos(a)*72*S,jy=y-16*S+Math.sin(a)*12*S;
      r.seg(jx,y-12*S,jx+Math.cos(a)*10*S,jy-26*S,2*S,C.foam,.55,0);
      r.ell(jx+Math.cos(a)*10*S,jy-26*S,3*S,3*S,C.white,.65,0,true);
    }
    r.glow(x,y-60*S,120*S,120*S,C.cyan||[.55,.91,1],1,.22);
    for(let k=0;k<9;k++){
      const a=t*.35+k*.7,rr=(38+Math.sin(t+k)*12)*S;
      r.ell(x+Math.cos(a)*rr,y-26*S+Math.sin(a)*10*S,2*S,2*S,C.white,.42,0,true);
    }
  }
  function drawGuildInterior(){
    const r=R(),S=G.S,hy=G.H*.555,g=B.guild;
    if(!g||B.zone!==2)return;
    /* 二楼回廊 */
    r.quad(0,hy*.22,G.W,12*S,[.22,.20,.22],.9,0);
    r.quad(0,hy*.22+12*S,G.W,4*S,[.42,.36,.30],.9,0);
    for(let x=0;x<G.W;x+=46*S)r.seg(x,hy*.22,x,hy*.22+12*S,2*S,[.36,.32,.30],.7,0);
    /* 石柱 */
    for(const wx of g.pillars){
      const p=pr(wx,-96,0);
      if(p.x<-80||p.x>G.W+80)continue;
      r.quad(p.x-12*S,hy*.28,24*S,hy*.60,[.42,.42,.46],.92,0);
      r.quad(p.x-16*S,hy*.28,32*S,10*S,[.54,.52,.50],.92,0);
      r.quad(p.x-16*S,hy*.84,32*S,10*S,[.30,.30,.32],.92,0);
      for(let k=0;k<4;k++)r.seg(p.x-10*S,hy*(.34+k*.12),p.x+10*S,hy*(.34+k*.12),1*S,[.30,.30,.32],.35,0);
    }
    /* 长桌 / 书架 / 卷轴柜 / 委托板 / 公告板 */
    for(let x=3900;x<5600;x+=360){
      const p=pr(x,72,0);
      if(p.x<-100||p.x>G.W+100)continue;
      r.quad(p.x-44*S,hy+34*S,88*S,12*S,[.36,.26,.18],.92,0);
      r.quad(p.x-40*S,hy+20*S,6*S,16*S,[.28,.20,.14],.92,0);
      r.quad(p.x+34*S,hy+20*S,6*S,16*S,[.28,.20,.14],.92,0);
      r.quad(p.x-26*S,hy+24*S,18*S,10*S,[.78,.72,.56],.75,0);
    }
    for(let x=3980;x<5560;x+=520){
      const p=pr(x,-92,0);
      if(p.x<-100||p.x>G.W+100)continue;
      r.quad(p.x-26*S,hy-96*S,52*S,86*S,[.30,.22,.16],.94,0);
      for(let k=0;k<4;k++)r.quad(p.x-22*S,hy-90*S+k*20*S,44*S,4*S,[.62,.50,.34],.8,0);
      for(let k=0;k<10;k++)r.quad(p.x-20*S+k*4*S,hy-84*S+(k%4)*20*S,3*S,14*S,
        k%3===0?C.clothBlue:(k%3===1?C.gold:C.paper||C.white),.72,0);
    }
    /* v1.4 dev4.1：整座室内大厅的地面 / 穹顶肋 / 吊灯 / 中央红毯，
       明确「玩家在一间大屋子里」，而不是户外摆了一排房子。 */
    r.quadG(0,hy,G.W,G.H-hy,[.34,.32,.30],[.19,.18,.18],1,0);
    for(let k=1;k<9;k++){
      const yy=hy+k*k*2.4*S;
      if(yy>G.H)break;
      r.seg(0,yy,G.W,yy,1.2*S,[.27,.26,.26],.42,0);
    }
    for(let x=0;x<G.W;x+=64*S)r.seg(x,hy,x,G.H,1*S,[.25,.24,.24],.30,0);
    r.quad(G.W*.30,hy+34*S,G.W*.40,G.H-hy-34*S,[.42,.16,.18],.55,0);
    r.seg(G.W*.30,hy+34*S,G.W*.70,hy+34*S,3*S,C.gold||[.9,.75,.4],.35,0);
    for(let k=0;k<7;k++){
      const wx=G.W*(k+.5)/7;
      r.seg(wx,0,G.W*.5,hy*.30,1.4*S,[.30,.27,.30],.42,0);
      r.ell(wx,hy*.18,10*S,15*S,[.96,.82,.52],.30,0,true);
      r.seg(wx,0,wx,hy*.18,1*S,[.40,.36,.30],.55,0);
    }
  }
  function drawBanners(){
    const r=R(),S=G.S,t=CR.game.time;
    for(const b of B.banners){
      if(!vis(b.x,300))continue;
      const p=pr(b.x,0,0),x=p.x,y=p.y-300*S+Math.sin(t*.8+b.phase)*5*S;
      r.seg(x-40*S,y-30*S,x+40*S,y-30*S,2*S,C.gold,.8,0);
      r.quad(x-70*S,y-26*S,140*S,52*S,[.22,.30,.56],.92,0);
      r.quad(x-70*S,y-26*S,140*S,4*S,C.gold,.9,0);
      r.quad(x-70*S,y+22*S,140*S,4*S,C.gold,.9,0);
      for(let k=0;k<5;k++)r.tri(x-52*S+k*26*S,y-2*S,x-44*S+k*26*S,y-10*S,
        x-36*S+k*26*S,y-2*S,C.snow,.85,0);
      r.glow(x,y,86*S,42*S,C.clothBlue||[.5,.7,1],1,.14);
    }
  }
  function drawLamp(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,60))return;
    const lit=B.isNight||B.phase==="dusk";
    r.seg(p.x,p.y,p.x,p.y-o.h*S,3*S,[.26,.28,.34],.95,0);
    r.ell(p.x,p.y-o.h*S,9*S,6*S,[.34,.36,.42],.95,0,true);
    if(lit){
      r.glow(p.x,p.y-o.h*S,30*S,30*S,C.lantern||C.gold,1,.30);
      r.ell(p.x,p.y-o.h*S,5*S,5*S,C.gold,.95,0,true);
    }
  }
  function drawTree(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,140))return;
    const h=o.h*S,tw=U.clamp(o.h*.035,6,10)*S;
    r.seg(p.x,p.y,p.x+Math.sin(o.phase)*6*S,p.y-h*.62,tw,[.30,.24,.18],1,0);
    const cy=p.y-h*.78,rr=U.clamp(o.h*.27,40,78)*S;
    const leaf=o.hue===0?[.20,.42,.26]:(o.hue===1?[.28,.48,.30]:[.36,.40,.24]);
    r.ell(p.x,cy,rr,rr*.72,leaf,.92,0,true);
    r.ell(p.x-rr*.36,cy+rr*.18,rr*.58,rr*.46,leaf,.78,0,true);
    r.ell(p.x+rr*.38,cy+rr*.14,rr*.58,rr*.44,leaf,.78,0,true);
    if(o.glow&&(B.isNight||B.phase==="dusk")){
      for(let k=0;k<6;k++){
        const a=CR.game.time*.6+o.phase+k;
        r.glow(p.x+Math.cos(a)*rr*.7,cy+Math.sin(a)*rr*.5,5*S,5*S,C.cyan||C.white,1,.22);
      }
    }
  }
  function drawHouse(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,170))return;
    const w=o.w*S,h=o.h*S,x=p.x,y=p.y;
    const wall=o.indoor?[.40,.38,.40]:(o.fancy?[.52,.44,.42]:[.46,.42,.38]);
    r.ell(x,y+2*S,w*.62,5*S,C.shadow,.24,0,true);
    r.quad(x-w/2,y-h,w,h,wall,.96,0);
    r.tri(x-w*.62,y-h,x,y-h-o.roof*S,x+w*.62,y-h,
      o.fancy?[.30,.36,.56]:[.38,.28,.26],.96,0);
    for(let k=0;k<2;k++){
      const wx=x-w*.26+k*w*.52,wy=y-h*.62;
      r.quad(wx-9*S,wy,18*S,22*S,[.20,.22,.28],.9,0);
      if(B.isNight||o.indoor||o.fancy)
        r.quad(wx-8*S,wy+1*S,16*S,20*S,C.lantern||C.gold,.58,0);
      r.seg(wx,wy,wx,wy+22*S,1*S,[.30,.26,.24],.8,0);
    }
    r.quad(x-10*S,y-34*S,20*S,34*S,[.26,.20,.16],.95,0);
    if(o.fancy){ /* 阳台与彩窗 */
      r.quad(x-w*.34,y-h*.46,w*.68,4*S,C.gold,.7,0);
      for(let k=0;k<5;k++)r.seg(x-w*.34+k*w*.17,y-h*.46,x-w*.34+k*w*.17,y-h*.32,1.2*S,C.gold,.6,0);
    }
  }
  function drawApartment(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,150))return;
    const w=64*S,h=o.h*S,x=p.x,y=p.y;
    r.tri(x-w*.6,y-h,x,y-h-42*S,x+w*.6,y-h,o.fancy?[.30,.34,.58]:[.40,.28,.24],.94,0);
    r.quad(x-w/2,y-h,w,h,o.fancy?[.50,.46,.44]:[.44,.38,.32],.94,0);
    if(o.fancy){r.quad(x-w*.3,y-h*.7,14*S,22*S,[.34,.58,.78],.8,0);
      r.quad(x+w*.14,y-h*.7,14*S,22*S,[.86,.56,.44],.8,0);}
    for(let k=0;k<2;k++)r.quad(x-w*.26+k*w*.36,y-h*.42,16*S,20*S,
      B.isNight?C.lantern||C.gold:[.22,.24,.28],B.isNight?.65:.9,0);
  }
  function drawClothesline(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,90))return;
    const y=p.y-96*S+Math.sin(CR.game.time+o.phase)*2*S;
    r.seg(p.x-o.w*S/2,y,p.x+o.w*S/2,y-6*S,1*S,[.70,.66,.58],.8,0);
    for(let k=0;k<4;k++){
      const x=p.x-o.w*S/2+(k+.5)*o.w*S/4;
      r.quad(x-5*S,y+2*S,10*S,16*S,k%2?[.68,.74,.88]:[.88,.72,.70],.85,0);
    }
  }
  function drawFlag(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,110))return;
    const sw=Math.sin(CR.game.time*1.5+o.phase)*6*S;
    r.seg(p.x,p.y,p.x,p.y-o.h*S,2.4*S,C.steel||[.6,.6,.7],.95,0);
    r.tri(p.x,p.y-o.h*S,p.x+42*S+sw,p.y-o.h*S+10*S,p.x,p.y-o.h*S+24*S,
      [.28,.46,.78],.92,0);
    r.ell(p.x+14*S,p.y-o.h*S+12*S,3*S,3*S,C.white,.9,0,true);
  }
  function drawFlower(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,50))return;
    r.quad(p.x-o.w*S/2,p.y-4*S,o.w*S,8*S,[.34,.30,.24],.8,0);
    for(let k=0;k<5;k++){
      const x=p.x-o.w*S/2+(k+.5)*o.w*S/5;
      r.seg(x,p.y-4*S,x+Math.sin(CR.game.time+o.phase+k)*2*S,p.y-16*S,1*S,[.24,.46,.26],.8,0);
      r.ell(x,p.y-16*S,3*S,3*S,o.hue===0?C.pink:(o.hue===1?C.gold:C.white),.85,0,true);
    }
  }
  function drawBench(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,60))return;
    r.quad(p.x-o.w*S/2,p.y-22*S,o.w*S,6*S,[.40,.30,.20],.92,0);
    r.quad(p.x-o.w*S/2,p.y-16*S,o.w*S,5*S,[.34,.26,.18],.9,0);
    r.seg(p.x-o.w*S*.36,p.y-16*S,p.x-o.w*S*.36,p.y,2.4*S,[.28,.22,.18],.9,0);
    r.seg(p.x+o.w*S*.36,p.y-16*S,p.x+o.w*S*.36,p.y,2.4*S,[.28,.22,.18],.9,0);
  }
  function drawNode(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,80))return;
    const t=CR.game.time;
    r.ell(p.x,p.y+2*S,26*S,6*S,C.shadow,.22,0,true);
    if(o.kind==="orange"){
      r.seg(p.x,p.y,p.x,p.y-62*S,6*S,[.34,.26,.18],.95,0);
      r.ell(p.x,p.y-70*S,30*S,26*S,[.24,.44,.24],.92,0,true);
      for(let k=0;k<5;k++)r.ell(p.x+Math.cos(k*1.3)*20*S,p.y-70*S+Math.sin(k*1.3)*14*S,
        5*S,5*S,C.orange||[1,.6,.2],.95,0,true);
    }else if(o.kind==="grass"){
      for(let k=0;k<7;k++)r.seg(p.x+(k-3)*5*S,p.y,p.x+(k-3)*7*S+Math.sin(t+k)*2*S,
        p.y-(18+(k%3)*8)*S,1.6*S,[.30,.52,.28],.85,0);
    }else if(o.kind==="mush"){
      for(let k=0;k<4;k++){
        const x=p.x+(k-1.5)*10*S;
        r.seg(x,p.y,x,p.y-12*S,2*S,C.white,.9,0);
        r.ell(x,p.y-13*S,8*S,5*S,k%2?[.72,.36,.30]:[.62,.52,.38],.92,0,true);
      }
    }else if(o.kind==="ore"){
      r.tri(p.x-24*S,p.y,p.x-6*S,p.y-30*S,p.x+8*S,p.y,[.38,.38,.40],.95,0);
      r.tri(p.x-4*S,p.y,p.x+16*S,p.y-24*S,p.x+28*S,p.y,[.30,.32,.34],.95,0);
      r.ell(p.x+2*S,p.y-18*S,4*S,4*S,C.copper||C.gold,.8,0,true);
    }else{
      r.seg(p.x,p.y,p.x,p.y-96*S,9*S,[.34,.26,.18],.95,0);
      r.tri(p.x-34*S,p.y-50*S,p.x,p.y-130*S,p.x+34*S,p.y-50*S,[.18,.38,.22],.92,0);
      r.tri(p.x-28*S,p.y-78*S,p.x,p.y-142*S,p.x+28*S,p.y-78*S,[.22,.44,.24],.9,0);
    }
    if(o.flash>0)r.glow(p.x,p.y-30*S,50*S,50*S,C.white,1,o.flash*.28);
    r.ring(p.x,p.y-2*S,28*S,6*S,1.2*S,C.gold,.36,0,16);
  }
  function drawProp(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,70))return;
    const x=p.x,y=p.y;
    if(o.id.indexOf("board")>=0||o.id==="counter"||o.id==="scrollCab"){
      r.quad(x-26*S,y-76*S,52*S,54*S,[.34,.26,.18],.94,0);
      r.quad(x-22*S,y-72*S,44*S,46*S,[.72,.66,.52],.88,0);
      for(let k=0;k<4;k++)r.seg(x-18*S,y-64*S+k*10*S,x+18*S,y-64*S+k*10*S,1*S,[.36,.30,.24],.55,0);
      if(o.id==="scrollCab")for(let k=0;k<6;k++)
        r.quad(x-20*S+k*7*S,y-72*S,5*S,42*S,k%2?C.clothBlue:C.gold,.7,0);
    }else if(o.id.indexOf("lamp")>=0){
      drawLamp({x:o.x,depth:o.depth,h:70,phase:0});
    }else if(o.id.indexOf("bench")>=0){
      drawBench({x:o.x,depth:o.depth,w:48});
    }else if(o.id==="flowerBed"){
      drawFlower({x:o.x,depth:o.depth,w:52,hue:0,phase:0});
    }else{
      r.quad(x-12*S,y-28*S,24*S,28*S,C.gold,.6,0);
    }
    r.ring(x,y-2*S,22*S,5*S,1*S,C.cyan||C.white,.28,0,14);
  }
  function drawNPC(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,90))return;
    const x=p.x,y=p.y,bob=Math.sin(CR.game.time*2+o.x*.01)*1.4*S;
    r.ell(x,y+2*S,16*S,4*S,C.shadow,.26,0,true);
    r.quad(x-11*S,y-32*S+bob,22*S,28*S,o.color||C.cloth,.95,0);
    r.ell(x,y-42*S+bob,10*S,10*S,C.sand||C.white,.95,0,true);
    r.quad(x-11*S,y-50*S+bob,22*S,6*S,C.gold,.7,0);
    r.quad(x-9*S,y-8*S,7*S,9*S,[.24,.20,.18],.95,0);
    r.quad(x+2*S,y-8*S,7*S,9*S,[.24,.20,.18],.95,0);
    r.glow(x,y-30*S,32*S,32*S,C.gold,1,.10);
  }
  function drawWalker(o){
    const r=R(),p=pr(o.x,o.depth,0),S=p.s;
    if(!onScreen(p,70))return;
    const x=p.x,y=p.y,bob=Math.sin(CR.game.time*3+o.t)*1.2*S;
    r.ell(x,y+1*S,12*S,3*S,C.shadow,.2,0,true);
    r.quad(x-9*S,y-28*S+bob,18*S,24*S,o.color||C.cloth,.92,0);
    r.ell(x,y-36*S+bob,8*S,8*S,C.sand||C.white,.92,0,true);
    r.quad(x-7*S,y-7*S,5*S,8*S,[.26,.22,.20],.9,0);
    r.quad(x+2*S,y-7*S,5*S,8*S,[.26,.22,.20],.9,0);
  }
  function drawMob(e){
    const r=R(),p=pr(e.x,e.depth,0),S=p.s;
    if(!onScreen(p,110))return;
    const x=p.x,y=p.y,t=CR.game.time,bob=Math.sin(t*3+e.anim)*1.4*S;
    const w=e.w||1,h=e.ht||1;
    r.ell(x,y+2*S,22*S*w,5*S,C.shadow,.24,0,true);
    if(e.type==="seed"){
      r.ell(x,y-15*S*h+bob,20*S*w,15*S*h,[.22,.50,.26],1,0,true);
      r.ell(x,y-16*S*h+bob,14*S*w,11*S*h,[.34,.66,.34],.9,0,true);
      r.ell(x-6*S,y-20*S*h+bob,2.4*S,2.4*S,C.black,.9,0);
      r.ell(x+6*S,y-20*S*h+bob,2.4*S,2.4*S,C.black,.9,0);
      r.tri(x-10*S,y-28*S*h+bob,x-16*S,y-40*S*h+bob,x-2*S,y-28*S*h+bob,[.30,.60,.30],.9,0);
      r.tri(x+10*S,y-28*S*h+bob,x+16*S,y-40*S*h+bob,x+2*S,y-28*S*h+bob,[.30,.60,.30],.9,0);
    }else{
      /* 草浮灵：悬浮木系灵体 */
      const fy=y-34*S*h+bob;
      r.glow(x,fy,30*S,30*S,C.cyan||C.white,1,.20);
      r.ell(x,fy,15*S*w,18*S*h,[.30,.62,.42],.86,0,true);
      r.ell(x,fy-4*S,10*S*w,12*S*h,[.62,.92,.72],.72,0,true);
      r.ell(x-5*S,fy-3*S,2*S,2*S,C.black,.8,0);
      r.ell(x+5*S,fy-3*S,2*S,2*S,C.black,.8,0);
      for(let k=0;k<3;k++){
        const a=t*.9+k*2.1;
        r.ell(x+Math.cos(a)*22*S,fy+Math.sin(a)*10*S,3*S,3*S,C.leaf1,.7,0,true);
      }
    }
    const bar=34*S*w,yy=y-72*S*h;
    const col=e.hostile?(e.cfg.bar||C.hpRed):C.hpBlue;
    r.quad(x-bar/2-1*S,yy-1*S,bar+2*S,5*S,C.black,.75,0);
    r.quad(x-bar/2,yy,bar,3.6*S,C.hpbg,.9,0);
    r.quad(x-bar/2,yy,bar*U.clamp(e.hp/e.maxHp,0,1),3.6*S,col,1,0);
    if(!e.hostile)r.ring(x,yy+1.8*S,bar*.56,3.2*S,1*S,C.hpBlue,.42,0,12);
    CR.render.drawShieldBar(e,yy-7*S,bar);
  }

  /* ================= 粒子 / 天气 ================= */
  function drawParticles(){
    const r=R(),S=G.S,t=CR.game.time,W=G.W,H=G.H,c=skyColors();
    const indoor=c.z.indoor;
    if(!indoor){
      for(const o of B.birds){
        const x=((o.x-WLD.camX*.25+t*o.v)%(W+160)+W+160)%(W+160)-80;
        const y=o.y+Math.sin(t+o.phase)*7*S;
        r.seg(x-8*S,y,x,y-3*S,1.4*S,[.20,.22,.28],.55,0);
        r.seg(x,y-3*S,x+8*S,y,1.4*S,[.20,.22,.28],.55,0);
      }
      if(B.zone===0)for(const o of B.brooms){
        const x=((o.x-WLD.camX*.35+t*o.v)%(W+200)+W+200)%(W+200)-100;
        const y=o.y+Math.sin(t*.7+o.phase)*9*S;
        r.seg(x-22*S,y+6*S,x+18*S,y-4*S,2*S,[.38,.28,.20],.8,0);
        r.tri(x+18*S,y-4*S,x+30*S,y+4*S,x+18*S,y+8*S,[.62,.48,.28],.75,0);
        r.ell(x-6*S,y-8*S,6*S,7*S,C.clothBlue,.9,0,true);
        r.quad(x-10*S,y-2*S,14*S,10*S,[.22,.30,.58],.85,0);
      }
      for(const o of B.butterflies){
        if(!vis(o.x,200))continue;
        const p=pr(o.x,o.depth,0),y=p.y-o.y*.3*S;
        const fl=Math.sin(t*9+o.phase)*4*S;
        r.ell(p.x-3*S,y,3*S+fl,2*S,o.hue?C.pink:C.gold,.8,0,true);
        r.ell(p.x+3*S,y,3*S-fl,2*S,o.hue?C.pink:C.gold,.8,0,true);
      }
      /* 分区天气：仅室外 0 / 1 区落雨雪 */
      const w=CR.weather&&CR.weather.current?CR.weather.current():null;
      if(B.zone<2&&w){
        if(w.rain>0)for(const o of B.rain){
          const x=((o.x+WLD.camX*.15)%(W+60)+W+60)%(W+60);
          r.seg(x,o.y,x-4*S,o.y+o.len*S,1.1*S,C.white,o.a,0);
        }
        if(w.snow>0)for(const o of B.snow){
          const x=((o.x+WLD.camX*.1)%(W+60)+W+60)%(W+60);
          r.ell(x+Math.sin(t*.7+o.sw)*20*S,o.y,o.r*S,o.r*S,C.snow,.6,0,true);
        }
      }
      for(const o of B.mist){
        if(!vis(o.x,300))continue;
        const p=pr(o.x,o.depth,0);
        r.ell(p.x,p.y-30*S+Math.sin(t*.3+o.x)*4*S,o.w*S,o.h*S,c.horizon,o.a,0,true);
      }
    }
    for(const o of B.petals){
      if(!vis(o.x,300))continue;
      const p=pr(o.x,0,0);
      r.ell(p.x+Math.sin(t+o.sw)*10*S,o.y,o.r*S,o.r*.6*S,
        o.hue===0?C.pink:(o.hue===1?C.sakura||C.pink:C.white),.55,0,true);
    }
    if(B.isNight||indoor)for(const o of B.glowbugs){
      if(!vis(o.x,260))continue;
      const p=pr(o.x,o.depth,0);
      const a=.25+.35*Math.sin(t*o.v+o.phase);
      r.glow(p.x,p.y-o.y*.25*S,7*S,7*S,C.lantern||C.gold,1,a*.22);
      r.ell(p.x,p.y-o.y*.25*S,o.size*S,o.size*S,C.gold,a,0,true);
    }
  }

  /* ================= 世界标签 ================= */
  function drawWorldLabels(){
    if(CR.game&&CR.game.state==="menu"){CR.ui.setWorldLabels([]);return;}
    const out=[],RI=CFG.REGION_INFO.university,z=CFG.UNI_ZONES[B.zone],S=G.S;
    out.push({text:"🏛 魔法大学城 · "+z.name,sx:G.W*.5,sy:G.H*.135,
      cls:"region",tip:{title:RI.icon+" "+RI.name,kind:"安全区 · "+z.danger,
        lines:[RI.desc,"当前分区："+z.name+"（"+z.desc+"）","BGM："+B.zoneScene()+" · 按 G 查看完整区域情报"]}});
    /* 悬浮横幅文字用 DOM 标签，中文可读（WebGL glyph 只支持数字/符号） */
    B.banners.forEach((b,i)=>{
      if(!vis(b.x,300))return;
      const p=pr(b.x,0,0);
      out.push({text:"欢迎来到魔法大学城",sx:p.x,sy:p.y-330*S,cls:"banner",
        tip:{title:"魔法悬浮横幅",kind:"集市外街 · 装饰",lines:["由魔法能量悬在半空，风吹过时轻轻摆动","外街路灯也靠同样的能量照明"]}});
    });
    const add=(o,title,lines,kind)=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:title,sx:p.x,sy:p.y-96*S,cls:kind||"npc",
        tip:{title,kind:kind==="mob"?"可攻击对象":(kind==="node"?"资源点":(kind==="prop"?"交互点":"NPC")),lines}});
    };
    for(const k in CFG.UNI_NPCS){
      const n=CFG.UNI_NPCS[k];
      add(n,n.icon+" "+n.name,[n.desc,"所在分区："+CFG.UNI_ZONES[CFG.uniZoneAt(n.x)].name]);
    }
    B.nodes.forEach(n=>add(n,n.icon+" "+n.name,
      [n.desc,B.toolInfo(n),"每日 "+n.daily+" 次 · 今日剩余 "+SV.gatherLeft(n.id)+" 次"],"node"));
    B.props.forEach(n=>add(n,n.icon+" "+n.name,[n.desc,"功能尚未开启 · 当前仅可查看"],"prop"));
    [B.mobs,B.hostiles].forEach(arr=>arr.forEach(e=>{
      if(!e.alive)return;
      const p=pr(e.x,e.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:"",sx:p.x,sy:p.y-40*S,cls:"mob",
        tip:{title:e.cfg.label,kind:e.halfNeutral?"半中立":(e.hostile?"敌对 · 不死不休":"中立"),
          lines:[e.cfg.desc||"",e.cfg.behavior||CFG.AI_DOC.neutral,
            "数值 ×"+(CFG.UNI_STAT_MUL||6.5)+"（≥ 前图 2 倍） · 系别 "+(e.cfg.element||"普通系")]}});
    }));
    B.walkers.forEach(w=>{
      if(Math.abs(P.x-w.x)>480)return;
      const p=pr(w.x,w.depth,0);
      if(p.x<-80||p.x>G.W+80)return;
      out.push({text:w.name,sx:p.x,sy:p.y-62*S,cls:"walker",
        tip:{title:w.name,kind:"路人 · "+CFG.UNI_ZONES[w.zone].name,
          lines:[w.line||"只是路过这里的人","不会主动攻击 · 鼠标悬浮 / 长按可查看"]}});
    });
    if(B.fountain&&B.zone===1){
      const p=pr(B.fountain.x,B.fountain.depth,0);
      if(p.x>-80&&p.x<G.W+80)
        out.push({text:"✦ 魔法泉水",sx:p.x,sy:p.y-180*S,cls:"node",
          tip:{title:"魔法泉水雕塑",kind:"恢复节点",lines:["靠近即可让全队生命值恢复满","水雾带淡蓝微光，夜间更亮"]}});
    }
    CR.ui.setWorldLabels(out);
  }

  /* ================= 主绘制 ================= */
  function drawScene(){
    const r=R();
    drawSky();drawGround();
    if(B.zone===2)drawGuildInterior();
    drawBanners();drawFountain();
    drawParticles();
    list.length=0;
    const vl=WLD.camX-300,vr=WLD.camX+G.W/G.S+300;
    const inView=o=>o.x>=vl&&o.x<=vr;
    /* v1.4 dev4.1：工会堂为室内大厅，跳过全部户外房屋/树木/公寓/晾衣绳/路灯/旗帜/花池 */
    if(B.zone!==2){
      B.houses.forEach(o=>{if(inView(o))push("house",o);});
      B.trees.forEach(o=>{if(inView(o))push("tree",o);});
      B.apartments.forEach(o=>{if(inView(o))push("apart",o);});
      B.clotheslines.forEach(o=>{if(inView(o))push("line",o);});
      B.lamps.forEach(o=>{if(inView(o))push("lamp",o);});
      B.flags.forEach(o=>{if(inView(o))push("flag",o);});
      B.flowers.forEach(o=>{if(inView(o))push("flower",o);});
    }
    B.benches.forEach(o=>{if(inView(o))push("bench",o);});
    B.nodes.forEach(o=>{if(inView(o))push("node",o);});
    B.props.forEach(o=>{if(inView(o))push("prop",o);});
    B.walkers.forEach(o=>{if(inView(o))push("walker",o);});
    for(const k in CFG.UNI_NPCS)push("npc",CFG.UNI_NPCS[k]);
    B.mobs.forEach(e=>{if(e.alive)push("mob",e);});
    B.hostiles.forEach(e=>{if(e.alive)push("mob",e);});
    E.drops.each(d=>push("drop",d));
    push("player",P);
    list.sort((a,b)=>(a.o.depth||0)-(b.o.depth||0));
    for(let i=0;i<list.length;i++){
      const it=list[i],o=it.o;
      switch(it._t){
        case "house":drawHouse(o);break;
        case "tree":drawTree(o);break;
        case "apart":drawApartment(o);break;
        case "line":drawClothesline(o);break;
        case "lamp":drawLamp(o);break;
        case "flag":drawFlag(o);break;
        case "flower":drawFlower(o);break;
        case "bench":drawBench(o);break;
        case "node":drawNode(o);break;
        case "prop":drawProp(o);break;
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
    drawWorldLabels();
  }
  CR.renderUniversity={drawScene,skyColors,drawMob,drawWorldLabels};
})(window.CR=window.CR||{});
