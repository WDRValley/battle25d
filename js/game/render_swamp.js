/* render_swamp.js — 蛮荒沼泽全部画面几何（WebGL 单 VBO）· v1.4 dev1 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,SW=CR.swamp,SV=CR.save;
  const G=CR.gl;
  const list=[],itemPool=[];
  function push(t,o){let it=itemPool[list.length];
    if(!it){it={_t:"",o:null};itemPool.push(it);}
    it._t=t;it.o=o;list.push(it);}
  function R(){return G.R;}
  function pr(x,d,h){return WLD.proj(x,d,h);}
  const HILL=[[0,.60],[.14,.42],[.28,.54],[.42,.36],[.58,.50],[.72,.34],[.88,.48],[1,.58]];

  function skyColors(){
    const z=CFG.SWAMP_ZONES[SW.zone]||CFG.SWAMP_ZONES[0];
    if(SW.isNight)return {top:[.02,.05,.09],mid:[.06,.12,.16],low:[.12,.20,.21],
      horizon:[.20,.28,.26],night:true,dusk:false,hill:[.06,.13,.13],fog:z.fog};
    if(SW.phase==="dusk")return {top:[.12,.16,.20],mid:[.32,.30,.28],low:[.52,.42,.30],
      horizon:[.66,.56,.36],night:false,dusk:true,hill:[.18,.20,.16],fog:z.fog};
    const top=U.mix([.16,.26,.30],z.sky[0],.6),mid=U.mix([.30,.40,.38],z.sky[1],.6),
      low=U.mix([.48,.54,.44],z.sky[2],.6);
    return {top,mid,low,horizon:low,night:false,dusk:false,hill:z.hill,fog:z.fog};
  }

  /* ================= 天空 / 远景 ================= */
  function drawSky(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555;
    r.quadG(0,0,W,hy*.58,c.top,c.mid,1,0);
    r.quadG(0,hy*.58,W,hy*.42,c.mid,c.horizon,1,0);
    r.quadG(0,hy*.80,W,hy*.20,c.horizon,c.low,.40,0);
    const mx=W*.78,my=hy*.26;
    if(c.night){
      r.glow(mx,my,44*S,44*S,C.snow,.5,.7);
      r.ell(mx,my,17*S,17*S,[.88,.93,1],.92,0,true);
      r.ell(mx+8*S,my-3*S,15*S,15*S,c.top,.9,0,true);
      U.srand(3311);
      for(let i=0;i<54;i++)r.ell(U.rr(0,W),U.rr(0,hy*.68),U.rr(.6,1.4)*S,
        U.rr(.6,1.4)*S,C.white,U.rr(.1,.45),0);
    }else{
      r.glow(mx,my,64*S,64*S,c.dusk?C.orange:C.sun,c.dusk?.5:.30,.7);
      r.ell(mx,my,19*S,19*S,c.dusk?C.fire2:C.sun,.72,0,true);
    }
    const off=WLD.camX*.05;
    for(let layer=0;layer<3;layer++){
      const base=hy*(.32+layer*.08),amp=hy*(.15-layer*.026);
      const col=U.mix(c.hill,[.05,.09,.10],layer*.22);
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
    /* 水下古神庙远景：只在第四段可见 */
    if(SW.zone===3){
      const tp=pr(SW.temple.x,SW.temple.depth,0);
      if(tp.x>-300&&tp.x<W+300){
        for(let i=0;i<6;i++){
          const x=tp.x+(i-2.5)*74*S,y=hy+52*S;
          r.quad(x,y,22*S,120*S,[.26,.34,.38],.42,0);
          r.quad(x-6*S,y,34*S,8*S,[.32,.40,.44],.5,0);
        }
        r.ell(tp.x,hy+40*S,68*S,26*S,[.30,.42,.46],.35,0,true);
        r.tri(tp.x-30*S,hy+18*S,tp.x,hy-70*S,tp.x+30*S,hy+18*S,[.24,.34,.40],.40,0);
      }
    }
  }

  /* ================= 水面 / 泥沼小岛 ================= */
  function drawWater(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555;
    r.quadG(0,hy,W,H-hy,c.horizon,c.night?[.03,.09,.09]:[.08,.16,.12],1,0);
    const vl=WLD.camX-120,vr=WLD.camX+W/S+120;
    /* 浅水波纹与反光 */
    U.srand(5519);
    for(let x=Math.floor(vl/64)*64;x<vr;x+=64){
      const p=pr(x,0,0);
      const yy=hy+((x*7)%9+2)*S*4;
      const w=64*S*1.05;
      r.quadG(p.x,yy,w,16*S,c.night?[.06,.16,.20]:[.16,.32,.30],
        c.night?[.03,.10,.14]:[.09,.22,.20],.55,0);
      const off=Math.sin(x*.01+CR.game.time*.9)*8*S;
      r.seg(p.x+off,yy+8*S,p.x+w*.7+off,yy+8*S,1.3*S,
        c.night?[.30,.52,.56]:C.foam,.28,0);
      /* 水下石柱倒影 */
      if(SW.zone===3&&x>5000){
        r.quad(p.x+10*S,yy+20*S,10*S,66*S,[.20,.34,.38],.18,0);
      }
    }
    /* 泥沼小岛 */
    SW.islands.forEach(o=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-180*S||p.x>W+180*S)return;
      const col=o.hue===0?[.24,.30,.18]:(o.hue===1?[.28,.26,.18]:[.20,.28,.20]);
      r.ell(p.x,p.y+o.ry*S*.2,o.rx*S,o.ry*S,col,.92,0,true);
      r.ell(p.x,p.y-o.ry*S*.18,o.rx*.86*S,o.ry*.62*S,
        [col[0]*1.25,col[1]*1.25,col[2]*1.15],.85,0,true);
      for(let k=0;k<4;k++){
        const xx=p.x+(k-1.5)*o.rx*S*.34;
        r.seg(xx,p.y-o.ry*S*.3,xx+Math.sin(CR.game.time*.7+k)*2*S,
          p.y-o.ry*S*.3-10*S,1.1*S,C.leaf2,.55,0);
      }
    });
  }

  /* ================= 薄雾（半透明层） ================= */
  function drawMist(){
    const r=R(),W=G.W,S=G.S,c=skyColors();
    SW.mist.forEach(o=>{
      const p=pr(o.x+Math.sin(CR.game.time*.06+o.phase)*o.v*3,o.depth,0);
      if(p.x<-o.w*S||p.x>W+o.w*S)return;
      const y=G.H*.42+o.depth*S*.7;
      const fog=c.fog+(SW.wcfg&&SW.wcfg.rain?.14:0)+(SW.wcfg&&SW.wcfg.lightning?.06:0);
      r.ell(p.x,y,o.w*S,o.h*S,c.night?[.42,.55,.58]:[.72,.78,.72],o.a*fog*2.4,0,true);
    });
  }

  /* ================= 芦苇 ================= */
  function drawReed(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(p.x<-40*s||p.x>G.W+40*s)return;
    const h=o.h*s,sw=Math.sin(CR.game.time*1.1+o.phase)*6*s;
    const col=o.hue===0?C.leaf2:(o.hue===1?C.gold:C.leaf1);
    r.seg(p.x,p.y,p.x+sw,p.y-h,o.w*s,U.mix(col,C.greenDk||C.brown,.35),.86,0);
    r.seg(p.x,p.y-h*.4,p.x+sw*.4,p.y-h*.72,o.w*.6*s,col,.62,0);
    /* 芦花穗 */
    r.ell(p.x+sw,p.y-h,3.4*s,11*s,U.mix(col,C.sand,.4),.72,0,true);
    r.ell(p.x+sw-2*s,p.y-h+3*s,2*s,4*s,C.sand,.45,0,true);
  }
  /* ================= 枯木 / 哨塔 / 树屋 ================= */
  function drawDeadwood(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(p.x<-120*s||p.x>G.W+120*s)return;
    const h=o.h*s;
    r.ell(p.x+12*s,p.y+2*s,30*s,4*s,C.shadow,.18,0);
    r.trap(p.x+o.lean*h*.3,p.y-h,p.y,9*s,15*s,C.brown,C.black,.92,0);
    r.seg(p.x,p.y-h*.78,p.x-24*s,p.y-h-10*s,3*s,C.brown,.9,0);
    r.seg(p.x,p.y-h*.6,p.x+26*s,p.y-h*.86,2.6*s,C.brown,.82,0);
    for(let k=0;k<3;k++)r.ell(p.x+(k-1)*9*s,p.y-h*.3,8*s,3*s,C.leaf2,.30,0);
  }
  function drawTower(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(p.x<-140*s||p.x>G.W+140*s)return;
    const h=o.h*s;
    for(let i=0;i<4;i++){
      const xx=p.x+(i%2?26:-26)*s;
      r.seg(xx,p.y,xx+(i<2?-8:8)*s,p.y-h,4*s,C.brown,.9,0);
    }
    r.quad(p.x-34*s,p.y-h,68*s,12*s,C.wood,.92,0);
    r.tri(p.x-44*s,p.y-h,p.x,p.y-h-34*s,p.x+44*s,p.y-h,C.cloth||C.red,.9,0);
    r.quad(p.x-30*s,p.y-h-28*s,60*s,16*s,[.22,.16,.14],.9,0);
    /* 哨塔上的火把 */
    r.ell(p.x,p.y-h-18*s,4*s,6*s,C.orange,1,0,true);
    r.glow(p.x,p.y-h-18*s,18*s,22*s,C.orange,1,.35);
    /* 骷髅旗 */
    r.seg(p.x+38*s,p.y-h-30*s,p.x+38*s,p.y-h-58*s,1.6*s,C.steel,.8,0);
    r.tri(p.x+38*s,p.y-h-58*s,p.x+64*s,p.y-h-52*s,p.x+38*s,p.y-h-44*s,C.red,.85,0);
  }
  function drawHut(){
    const r=R(),p=pr(SW.hut.x,SW.hut.depth,0),s=p.s;
    if(p.x<-200*s||p.x>G.W+200*s)return;
    const h=SW.hut.h*s;
    r.trap(p.x,p.y-h*.62,p.y,30*s,42*s,C.brown,C.black,.95,0);
    r.tri(p.x-56*s,p.y-h*.62,p.x,p.y-h-40*s,p.x+56*s,p.y-h*.62,C.leaf2,.92,0);
    r.ell(p.x,p.y-h*.3,13*s,16*s,[.12,.16,.12],1,0,true);
    r.quad(p.x-8*s,p.y-h*.36,16*s,12*s,C.lantern,.9,0);
    if(SW.isNight)r.glow(p.x,p.y-h*.3,36*s,32*s,C.lantern,1,.5);
    /* 药瓶与晾着的草 */
    for(let i=0;i<4;i++){
      r.ell(p.x+(i-1.5)*15*s,p.y-h*.72,3*s,5*s,i%2?C.green:C.cyan,.9,0,true);
      r.seg(p.x+(i-1.5)*15*s,p.y-h*.2,p.x+(i-1.5)*15*s+2*s,p.y-h*.05,1*s,C.leaf1,.7,0);
    }
  }
  /* ================= NPC / 行人 / 采集点 ================= */
  function drawWalker(w){
    const r=R(),p=pr(w.x,w.depth,0),s=p.s;
    const bob=Math.sin(CR.game.time*5+w.t)*2*s;
    r.ell(p.x,p.y+2*s,11*s,3.5*s,C.shadow,.25,0);
    r.trap(p.x,p.y-38*s+bob,p.y,14*s,18*s,w.color,w.color,1,0);
    r.ell(p.x,p.y-46*s+bob,8*s,8*s,C.skin,1,0);
    r.seg(p.x-5*s,p.y-14*s,p.x-6*s+Math.sin(w.t*6)*3*s,p.y,4*s,w.color,1,0);
    r.seg(p.x+5*s,p.y-14*s,p.x+6*s-Math.sin(w.t*6)*3*s,p.y,4*s,w.color,1,0);
    r.ell(p.x,p.y-55*s+bob,9*s,2.4*s,C.leaf2,.85,0);
  }
  function drawNPC(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(p.x<-100*s||p.x>G.W+100*s)return;
    const bob=Math.sin(CR.game.time*2.4+o.x)*1.5*s;
    r.ell(p.x,p.y+2*s,16*s,4*s,C.shadow,.28,0);
    r.trap(p.x,p.y-52*s+bob,p.y,20*s,26*s,o.color,U.mix(o.color,C.black,.35),1,0);
    r.ell(p.x,p.y-60*s+bob,10*s,10*s,C.skin,1,0);
    r.ell(p.x,p.y-69*s+bob,13*s,4*s,C.brown,.9,0);
    /* 头顶身份图标 */
    r.ell(p.x,p.y-84*s+bob,14*s,12*s,C.white,.20,0,true);
    r.glow(p.x,p.y-84*s+bob,22*s,20*s,o.color,1,.25);
    if(o.id==="jack"){
      r.quad(p.x-4*s,p.y-62*s+bob,8*s,2*s,C.black,.9,0); // 独眼眼罩
    }
    if(o.id==="vera"){
      r.seg(p.x+12*s,p.y-40*s,p.x+18*s,p.y-16*s,2*s,C.wood,.9,0); // 药杖
      r.ell(p.x+18*s,p.y-16*s,4*s,5*s,C.green,1,0,true);
    }
    if(o.id==="hank"){
      r.seg(p.x-12*s,p.y-40*s,p.x-26*s,p.y-84*s,1.6*s,C.wood,.9,0); // 钓竿
      r.seg(p.x-26*s,p.y-84*s,p.x-20*s,p.y-46*s,.8*s,C.white,.6,0);
    }
  }
  function drawNode(n){
    const r=R(),p=pr(n.x,n.depth,0),s=p.s;
    if(p.x<-140*s||p.x>G.W+140*s)return;
    const pulse=.7+.3*Math.sin(CR.game.time*2+n.x);
    r.glow(p.x,p.y-26*s,34*s,30*s,C.gold,1,.16*pulse);
    r.ell(p.x,p.y,26*s,7*s,C.shadow,.22,0);
    if(n.kind==="reed"){
      for(let k=0;k<5;k++){
        const xx=p.x+(k-2)*9*s;
        r.seg(xx,p.y,xx+Math.sin(CR.game.time+k)*3*s,p.y-(48+k*4)*s,2*s,C.gold,.85,0);
      }
    }else if(n.kind==="thorn"){
      for(let k=0;k<6;k++){
        const xx=p.x+(k-2.5)*8*s;
        r.tri(xx-4*s,p.y,xx+4*s,p.y,xx,p.y-(26+U.rr(0,16))*s,C.green,.9,0);
      }
      r.glow(p.x,p.y-18*s,28*s,20*s,C.red,1,.12);
    }else if(n.kind==="lumber"){
      r.trap(p.x-18*s,p.y-16*s,p.y,36*s,10*s,C.brown,C.black,.95,0);
      r.ell(p.x-18*s,p.y-11*s,5*s,5*s,C.wood,.9,0,true);
    }else if(n.kind==="fish"){
      r.ell(p.x,p.y,40*s,10*s,cWater(),.55,0,true);
      r.seg(p.x-16*s,p.y,p.x+16*s,p.y,1.2*s,C.foam,.5,0);
      r.ell(p.x+8*s,p.y-4*s,6*s,3*s,C.cyan,.8,0,true);
    }else{
      for(let k=0;k<6;k++)
        r.ell(p.x+(k-2.5)*8*s,p.y-(8+(k%2)*10)*s,7*s,9*s,C.leaf1,.9,0,true);
    }
    /* 采集进度环 */
    if(SW.gather&&SW.gather.id===n.id){
      const t=U.clamp(SW.gather.t/SW.gather.dur,0,1);
      r.ell(p.x,p.y-62*s,20*s,20*s,C.gold,1,0,false);
      r.ell(p.x,p.y-62*s,20*t*s,20*t*s,C.gold,.35,0,true);
    }
  }
  function cWater(){return skyColors().night?[.06,.16,.20]:[.16,.32,.30];}

  /* ================= 夜间发光虫 / 飞鸟 ================= */
  function drawGlowbugs(){
    const r=R(),W=G.W,S=G.S;
    if(!SW.isNight)return;
    SW.glowbugs.forEach(o=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-20||p.x>W+20)return;
      const y=p.y-o.y*S+Math.sin(CR.game.time*o.v+o.phase)*9*S;
      const a=(.35+.65*Math.abs(Math.sin(CR.game.time*o.v*.7+o.phase)))*.85;
      r.ell(p.x,y,o.size*S,o.size*S,C.gold,a,0,true);
      r.glow(p.x,y,o.size*4*S,o.size*4*S,C.gold,a,.30);
    });
  }
  function drawFireflies(){
    const r=R(),W=G.W,S=G.S;
    SW.fireflies.forEach(o=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-20||p.x>W+20)return;
      const y=p.y-o.y*S+Math.sin(CR.game.time*o.v+o.phase)*7*S;
      r.ell(p.x,y,1.6*S,1.6*S,C.cyan,.4,0,true);
    });
  }
  function drawBirds(){
    const r=R(),S=G.S,W=G.W;
    SW.birds.forEach(o=>{
      const x=(o.x-WLD.camX*.3+CR.game.time*o.v)%(CFG.SWAMP_W||6000);
      const p=pr(x,-90,0);
      if(p.x<-30||p.x>W+30)return;
      const flap=Math.sin(CR.game.time*5+o.phase)*5*S;
      r.seg(p.x-8*S,p.y-o.y*S,p.x,p.y-o.y*S+flap*.4,1.4*S,C.white,.35,0);
      r.seg(p.x,p.y-o.y*S+flap*.4,p.x+8*S,p.y-o.y*S+flap,1.4*S,C.white,.35,0);
    });
  }
  function drawFlowers(){
    const r=R(),W=G.W,S=G.S;
    SW.flowers.forEach(o=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-20||p.x>W+20)return;
      const sw=Math.sin(CR.game.time*1.5+o.phase)*1.6*S;
      r.seg(p.x,p.y,p.x+sw,p.y-o.h*S,1*S,C.leaf1,.6,0);
      r.ell(p.x+sw,p.y-o.h*S,2.6*S,2*S,o.hue===0?C.pink:(o.hue===1?C.gold:C.white),.8,0,true);
    });
  }

  /* ================= 1.4 dev1.2 画面增强：远景 / 地面细节 / 天气 / BOSS HUD ================= */
  function drawBackdrop(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555;
    /* 远景红树林剪影：三层，随相机缓慢视差 */
    const off=WLD.camX*.08;
    for(let layer=0;layer<3;layer++){
      const col=U.mix(c.hill,[.03,.08,.07],.25+layer*.18),a=.30-layer*.06;
      for(let i=0;i<16;i++){
        const wx=i*260+layer*90, bx=((wx-off*(.5+layer*.25))%(W+600)+W+600)%(W+600)-300;
        const th=(28+((i*37)%26))*S+(layer*8)*S;
        r.seg(bx,hy+8*S,bx-6*S,hy-th,2.4*S,col,a,0);
        r.seg(bx,hy+8*S,bx+6*S,hy-th,2.4*S,col,a,0);
        r.seg(bx,hy-th,bx-14*S,hy-th-10*S,1.6*S,col,a,0);
        r.seg(bx,hy-th,bx+14*S,hy-th-10*S,1.6*S,col,a,0);
        r.ell(bx,hy-th-12*S,20*S,7*S,col,a*.8,0,true);
      }
    }
    /* 沉没古神庙：水下石柱 + 祭坛 + 体积光柱 */
    if(SW.zone===3){
      const tp=pr(SW.temple.x,SW.temple.depth,0);
      if(tp.x>-420&&tp.x<W+420){
        for(let i=0;i<7;i++){
          const xx=tp.x+(i-3)*76*S,hh=(96+((i*23)%46))*S;
          r.quad(xx,hy+20*S,24*S,hh,[.24,.34,.38],.42,0);
          r.quad(xx-7*S,hy+18*S,38*S,9*S,[.32,.42,.46],.5,0);
          r.quad(xx-7*S,hy+hh+14*S,38*S,8*S,[.28,.38,.42],.38,0);
        }
        r.ell(tp.x,hy+44*S,120*S,26*S,[.28,.40,.44],.4,0,true);
        /* 祭坛聚光（体积光柱，向上收窄） */
        r.tri(tp.x-18*S,hy+30*S,tp.x-78*S,hy-150*S,tp.x+78*S,hy-150*S,
          c.night?[.28,.62,.70]:[.50,.72,.62],.13,0);
        r.glow(tp.x,hy-20*S,150*S,120*S,c.night?C.cyan:C.gold,1,.16);
        r.tri(tp.x-34*S,hy+18*S,tp.x,hy-64*S,tp.x+34*S,hy+18*S,[.22,.32,.38],.45,0);
      }
    }
  }
  function drawGroundDetails(){
    const r=R(),W=G.W,S=G.S,t=CR.game.time,
      vl=WLD.camX-180,vr=WLD.camX+W/S+180;
    const vis=o=>o.x>=vl&&o.x<=vr;
    (SW.moss||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0);
      const cc=o.hue===0?[.20,.38,.20]:(o.hue===1?[.28,.42,.24]:[.16,.30,.18]);
      r.ell(p.x,p.y,o.w*S,o.h*S,cc,.62,0,true);
      r.ell(p.x-o.w*.25*S,p.y-1*S,o.w*.4*S,o.h*.7*S,U.mix(cc,C.white,.18),.35,0,true);
    });
    (SW.roots||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0);
      r.seg(p.x-o.w*.5*S,p.y,p.x+o.w*.5*S,p.y-3*S,4.4*S,C.brown,.55,0);
      r.seg(p.x,p.y-2*S,p.x+o.w*.2*S,p.y-10*S,2.6*S,C.brown,.45,0);
    });
    (SW.lilies||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0),sw=Math.sin(t*.9+o.phase)*2*S;
      r.ell(p.x+sw,p.y,o.r*S,o.r*.36*S,[.22,.44,.26],.72,0,true);
      r.tri(p.x+sw,p.y,p.x+sw+o.r*.55*S,p.y-2*S,p.x+sw,p.y-o.r*.36*S,[.10,.24,.14],.55,0);
      if(o.flower){
        r.ell(p.x+sw+4*S,p.y-4*S,5*S,3.4*S,C.sakuraPink||C.pink,.85,0,true);
        r.ell(p.x+sw+4*S,p.y-4*S,2*S,1.6*S,C.gold,.9,0,true);
      }
    });
    (SW.seaweed||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0),sw=Math.sin(t*1.1+o.phase)*5*S;
      r.seg(p.x,p.y,p.x+sw,p.y-o.h*S,2.2*S,[.16,.38,.26],.62,0);
      r.seg(p.x+4*S,p.y,p.x+4*S+sw*.7,p.y-o.h*.72*S,1.6*S,[.20,.42,.28],.5,0);
    });
    (SW.mushrooms||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0);
      r.seg(p.x,p.y,p.x,p.y-o.h*.6*S,2.6*S,C.sand,.85,0);
      const cc=o.hue===0?C.red:(o.hue===1?C.violet:C.gold);
      r.ell(p.x,p.y-o.h*.6*S,o.h*.44*S,o.h*.28*S,cc,.9,0,true);
      r.ell(p.x-2*S,p.y-o.h*.66*S,1.6*S,1.2*S,C.white,.7,0,true);
      r.glow(p.x,p.y-o.h*.6*S,o.h*1.1*S,o.h*.8*S,cc,1,.12);
    });
    (SW.bubbles||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0);
      const ph=(t*o.v+o.phase)%1,y=p.y-ph*22*S;
      r.quad(p.x+Math.sin(ph*7)*3*S,y,(1.4+ph*2)*2*S,(1.4+ph*2)*2*S,
        cWater(),.40*(1-ph),0);
    });
    (SW.totems||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0),h=o.h*S;
      r.seg(p.x,p.y,p.x,p.y-h,9*S,C.brown,.92,0);
      r.tri(p.x-13*S,p.y-h*.7,p.x,p.y-h*.95,p.x+13*S,p.y-h*.7,C.red,.85,0);
      r.ell(p.x,p.y-h*.45,5*S,5*S,C.gold,.9,0,true);
      r.quad(p.x-9*S,p.y-h*.18,18*S,4*S,C.bone||C.sand,.8,0);
      r.glow(p.x,p.y-h*.5,16*S,20*S,C.orange,1,.16);
    });
    (SW.bones||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0);
      r.seg(p.x,p.y,p.x+o.w*S,p.y-3*S,2.4*S,C.sand,.6,0);
      r.ell(p.x,p.y,2.4*S,2.4*S,C.sand,.6,0,true);
      r.ell(p.x+o.w*S,p.y-3*S,2.4*S,2.4*S,C.sand,.6,0,true);
    });
    (SW.vines||[]).forEach(o=>{
      if(!vis(o))return;const p=pr(o.x,o.depth,0),sw=Math.sin(t*.8+o.phase)*4*S;
      r.seg(p.x,p.y-140*S,p.x+sw,p.y-140*S+o.h*S,1.8*S,[.16,.32,.20],.6,0);
      for(let k=0;k<3;k++){
        const yy=p.y-140*S+o.h*S*(.3+k*.22);
        r.ell(p.x+sw+(k%2?5:-5)*S,yy,4*S,2*S,[.22,.40,.22],.55,0,true);
      }
    });
  }
  function drawWeather(){
    const r=R(),W=G.W,H=G.H,S=G.S,w=SW.wcfg,t=CR.game.time;
    if(!w)return;
    if(w.rain>0){
      (SW.rain||[]).forEach((o,i)=>{
        const sx=((o.x+t*o.v*.10)%(W+160)+W+160)%(W+160)-80;
        const sy=((o.y+t*o.v)%(H+180)+H+180)%(H+180)-90;
        r.seg(sx,sy,sx-4*S,sy+o.len*S,1.15*S,C.white,o.a,0);
      });
      /* 雨落水面的小涟漪 */
      U.srand(7717);
      for(let i=0;i<16;i++){
        const x=U.rr(0,W),y=U.rr(H*.56,H);
        r.ell(x,y,U.rr(5,13)*S,2*S,C.foam,.20,0,true);
      }
    }
    if(w.snow>0){
      (SW.snow||[]).forEach(o=>{
        const sx=((o.x+Math.sin(t*.7+o.sw)*34*S)%(W+100)+W+100)%(W+100)-50;
        const sy=((o.y+t*o.v)%(H+120)+H+120)%(H+120)-60;
        r.ell(sx,sy,o.r*S,o.r*S,C.snow,.72,0,true);
        r.ell(sx,sy,o.r*2.1*S,o.r*2.1*S,C.snow,.10,0,true);
      });
    }
    /* 飘落的枯叶（晴/雨/雷雨都有，雪天略少） */
    (SW.leaves||[]).forEach(o=>{
      const sx=((o.x-WLD.camX*.5+t*o.v*.7)%(W+120)+W+120)%(W+120)-60;
      const sy=((o.y+t*o.v*.45)%(H+100)+H+100)%(H+100)-50;
      const cc=o.hue===0?C.gold:(o.hue===1?C.brown:C.leaf2);
      r.tri(sx,sy-3*S,sx+4*S,sy+Math.sin(t*2+o.sw)*2*S,sx-3*S,sy+4*S,cc,.55,0);
    });
    if(SW.lightning>0){
      r.quad(0,0,W,H,C.white,SW.lightning*.16,0);
      const lx=W*.62+Math.sin(t*13)*20*S;
      let px=lx,py=0;
      for(let k=0;k<6;k++){
        const nx=px+U.rr(-26,26)*S,ny=py+H*.1;
        r.seg(px,py,nx,ny,2.2*S,C.white,SW.lightning*.75,0);
        px=nx;py=ny;
      }
    }
  }
  function drawBossHud(){
    if(SW.zone!==3)return;
    const b=SW.hostiles.find(e=>e&&e.alive&&e.type==="boarKing");
    if(!b)return;
    const r=R(),W=G.W,S=G.S,bw=Math.min(W*.58,700),bx=(W-bw)/2,by=30*S;
    r.quad(bx-10*S,by-26*S,bw+20*S,52*S,[.04,.07,.08],.78,0);
    r.quad(bx-10*S,by-26*S,bw+20*S,2*S,C.gold,.7,0);
    if(CR.render.drawText)
      CR.render.drawText("🐗 野蛮猪王 · 沉没古神庙",W/2,by-8*S,13*S,C.gold,.95);
    r.quad(bx,by+8*S,bw,9*S,C.hpbg,.92,0);
    r.quad(bx,by+8*S,bw*Math.max(0,b.hp/b.maxHp),9*S,C.hpGold,1,0);
    r.quad(bx,by+8*S,bw*Math.max(0,b.hp/b.maxHp),2*S,C.white,.35,0);
  }
  /* ================= 敌人血条 + 三类护盾条 ================= */
  /* 1.4 dev1.3：统一走 render.js 的局内护盾条（血条下方、等长、带 ⛨ 类型标识） */
  function drawShieldBar(o){
    const p=pr(o.x,o.depth,0),s=p.s;
    CR.render.drawShieldBar(o,p.y-72*s*(o.ht||1),40*s*(o.w||1));
  }
  /* ================= 1.4 dev1.2 沼泽动物专属立绘 =================
     旧版所有怪物都复用 drawHumanoid（人形），毒蛙 / 鳄 / 野猪全是「人」。
     这里为 9 种野兽各画专属形态；红泥食人部落的人形单位继续走 drawHumanoid。 */
  const BEAST_TYPES=["poisonFrog","chameleon","swampRoe","swampCroc","blackBoar",
    "angryPiglet","mosquitoSwarm","mireLizard","boarKing"];
  function isBeast(e){return BEAST_TYPES.indexOf(e.type)>=0;}
  function drawBeast(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s,x=p.x,y=p.y,
      w=e.w||1,h=e.ht||1,S=s,face=e.facing||1,
      col=e.cfg.main,dk=e.cfg.dark,acc=e.cfg.acc||C.white,t=CR.game.time,
      bob=Math.sin(t*5+e.anim*0.4)*1.3*S;
    const A=1,F=e.flash>0?.7:0;
    r.ell(x,y+2*S,26*S*w,5*S,C.shadow,.26,0,true);
    if(e.type==="poisonFrog"){
      r.ell(x,y-15*S*h+bob,26*S*w,14*S*h,col,A,F,true);
      r.ell(x,y-9*S*h+bob,20*S*w,7*S*h,U.mix(col,C.white,.35),.55*A,0,true);
      r.ell(x-10*S*w,y-27*S*h+bob,7*S,7*S,col,A,F,true);
      r.ell(x+10*S*w,y-27*S*h+bob,7*S,7*S,col,A,F,true);
      r.ell(x-10*S*w,y-27*S*h+bob,3*S,3*S,C.black,1,0,true);
      r.ell(x+10*S*w,y-27*S*h+bob,3*S,3*S,C.black,1,0,true);
      for(let k=0;k<4;k++){
        const xx=x+(k-1.5)*10*S*w;
        r.seg(xx,y-10*S*h+bob,xx+(k<2?-8:8)*S,y-1*S,4*S,dk,A,F);
      }
      r.seg(x-9*S,y-13*S*h+bob,x+9*S,y-13*S*h+bob,1.4*S,dk,.7*A,0);
      for(let k=0;k<3;k++)r.ell(x+(k-1)*9*S,y-20*S*h+bob,3.4*S,2.6*S,C.cyan,.75*A,0,true);
      return;
    }
    if(e.type==="chameleon"){
      r.ell(x,y-13*S*h+bob,25*S*w,9*S*h,col,A,F,true);
      for(let k=0;k<3;k++){
        const tx=x+(k-1)*11*S*w;
        r.tri(tx-4*S,y-19*S*h+bob,tx,y-27*S*h+bob,tx+4*S,y-19*S*h+bob,dk,A,F);
      }
      for(let k=0;k<4;k++){
        const a=Math.sin(t*2+k*.8)*.4;
        r.seg(x-24*S*w-k*7*S,y-13*S*h+bob+k*a*S,
              x-30*S*w-k*7*S,y-13*S*h+bob+(k+1)*a*S,(3.4-k*.6)*S,dk,A,F);
      }
      r.ell(x+17*S*w,y-20*S*h+bob,9*S,8*S,col,A,F,true);
      r.ell(x+20*S*w,y-21*S*h+bob,3.2*S,3.2*S,C.gold,1,0,true);
      r.ell(x+20*S*w,y-21*S*h+bob,1.6*S,1.6*S,C.black,1,0,true);
      r.seg(x-8*S,y-7*S*h,x-12*S,y,3*S,dk,A,F);
      r.seg(x+9*S,y-7*S*h,x+13*S,y,3*S,dk,A,F);
      return;
    }
    if(e.type==="swampRoe"){
      r.ell(x,y-24*S*h+bob,20*S*w,11*S*h,col,A,F,true);
      for(let k=0;k<4;k++){
        const xx=x+(k<2?-11:11)*S*w;
        r.seg(xx,y-18*S*h+bob,xx+(k%2?3:-3)*S,y,2.6*S,dk,A,F);
      }
      r.seg(x+13*S*w,y-29*S*h+bob,x+22*S*w,y-43*S*h+bob,5*S,col,A,F);
      r.ell(x+24*S*w,y-45*S*h+bob,8*S,6*S,col,A,F,true);
      r.ell(x+29*S*w,y-46*S*h+bob,2*S,2*S,C.black,1,0,true);
      r.seg(x+21*S*w,y-49*S*h,x+18*S*w,y-60*S*h,1.8*S,C.gold,A,F);
      r.seg(x+18*S*w,y-57*S*h,x+13*S*w,y-62*S*h,1.5*S,C.gold,A,F);
      r.seg(x+24*S*w,y-49*S*h,x+27*S*w,y-60*S*h,1.8*S,C.gold,A,F);
      r.tri(x-20*S*w,y-28*S*h+bob,x-30*S*w,y-25*S*h+bob,x-20*S*w,y-21*S*h+bob,acc,.9*A,F);
      return;
    }
    if(e.type==="swampCroc"||e.type==="mireLizard"){
      const big=e.type==="swampCroc",L=big?40:27;
      r.ell(x,y-13*S*h+bob,L*S*w,(big?11:7)*S*h,col,A,F,true);
      for(let k=0;k<5;k++){
        const xx=x+(k-2)*L*.34*S*w;
        r.tri(xx-5*S,y-19*S*h+bob,xx,y-26*S*h+bob,xx+5*S,y-19*S*h+bob,dk,A,F);
      }
      for(let k=0;k<4;k++){
        const seg=9*S*w;
        r.seg(x-L*S*w-k*seg,y-13*S*h+bob+Math.sin(t*2+k)*3*S,
              x-L*S*w-(k+1)*seg,y-13*S*h+bob+Math.sin(t*2+k+1)*3*S,
              (big?7:4.4)*(1-k*.18)*S,dk,A,F);
      }
      const snout=x+face*(L+18)*S*w;
      r.quad(x+face*L*.7*S*w,y-17*S*h+bob,30*S*w,7*S*h,col,A,F);
      r.ell(snout,y-15*S*h+bob,5*S,3*S,dk,1,0,true);
      r.ell(x+face*(L*.55)*S*w,y-22*S*h+bob,4*S,3*S,acc,1,0,true);
      r.ell(x+face*(L*.55)*S*w,y-22*S*h+bob,1.8*S,1.8*S,C.black,1,0,true);
      for(let k=0;k<4;k++){
        const xx=x+(k<2?-15:15)*S*w;
        r.seg(xx,y-7*S*h,xx+(k%2?5:-5)*S,y,4*S,dk,A,F);
      }
      return;
    }
    if(e.type==="blackBoar"||e.type==="angryPiglet"||e.type==="boarKing"){
      const king=e.type==="boarKing",small=e.type==="angryPiglet",
        BW=king?46:(small?19:32),BH=king?27:(small?13:19);
      r.ell(x,y-BH*.9*S+bob,BW*S*w,BH*S*h,col,A,F,true);
      /* 背鬃 */
      for(let k=0;k<(king?9:6);k++){
        const xx=x+(k-(king?4:2.5))*(BW/(king?5:3.4))*S*w;
        r.tri(xx-4*S,y-BH*1.7*S+bob,xx,y-BH*2.2*S+bob,xx+4*S,y-BH*1.7*S+bob,dk,A,F);
      }
      /* 猪头 + 鼻 + 獠牙 */
      const hx=x+face*BW*.78*S*w,hy=y-BH*.85*S+bob;
      r.ell(hx,hy,(king?16:11)*S,(king?14:9)*S,U.mix(col,C.white,.12),A,F,true);
      r.ell(hx+face*8*S,hy+3*S,(king?7:5)*S,(king?5:3.5)*S,C.pinkDk,1,0,true);
      r.ell(hx+face*8*S-2*S,hy+3*S,1.5*S,1.5*S,C.black,.9,0,true);
      r.ell(hx+face*8*S+2*S,hy+3*S,1.5*S,1.5*S,C.black,.9,0,true);
      r.tri(hx+face*10*S,hy+7*S,hx+face*19*S,hy-5*S,hx+face*12*S,hy+9*S,acc,A,F);
      r.tri(hx-face*2*S,hy+7*S,hx-face*11*S,hy-5*S,hx-face*4*S,hy+9*S,acc,A,F);
      r.ell(hx+face*2*S,hy-5*S,2.4*S,2.4*S,C.red,.9,0,true);
      for(let k=0;k<4;k++){
        const xx=x+(k<2?-BW*.55:BW*.55)*S*w;
        r.seg(xx,y-BH*.6*S+bob,xx+(k%2?3:-3)*S,y,(king?7:4)*S,dk,A,F);
      }
      if(king){
        r.glow(x,y-BH*S,70*S,60*S,C.gold,1,.22);
        r.ring(x,y-BH*1.1*S,44*S,18*S,2.4*S,acc,.55,0,18);
        for(let k=0;k<6;k++){
          const a=t*.5+k*1.05;
          r.ell(x+Math.cos(a)*48*S,y-BH*S+Math.sin(a)*22*S,3*S,2*S,C.gold,.8,0,true);
        }
        r.tri(x-26*S,y-BH*2.1*S,x-18*S,y-BH*3.2*S,x-10*S,y-BH*2.1*S,C.white,.9,F);
        r.tri(x+10*S,y-BH*2.1*S,x+18*S,y-BH*3.2*S,x+26*S,y-BH*2.1*S,C.white,.9,F);
      }
      return;
    }
    if(e.type==="mosquitoSwarm"){
      for(let k=0;k<5;k++){
        const a=t*3+k*1.26,
          mx=x+Math.cos(a)*18*S*w,my=y-26*S*h+Math.sin(a*1.3)*13*S+bob;
        r.ell(mx,my,4.2*S,2.6*S,dk,A,F,true);
        r.tri(mx-3*S,my-2*S,mx-11*S,my-9*S,mx-1*S,my-5*S,C.white,.55*A,0);
        r.tri(mx+3*S,my-2*S,mx+11*S,my-9*S,mx+1*S,my-5*S,C.white,.55*A,0);
        r.seg(mx+4*S,my,mx+9*S,my+4*S,.9*S,acc,.8*A,0);
        r.glow(mx,my,7*S,7*S,C.violet,1,.3*A);
      }
      return;
    }
  }
  function drawMob(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    if(e.hidden){ // 水下潜伏：只画一圈涟漪
      r.ell(p.x,p.y,26*s,7*s,cWater(),.5,0,true);
      r.seg(p.x-16*s,p.y,p.x+16*s,p.y,1.2*S_FIX(),C.cyan,.35,0);
      return;
    }
    /* 1.4 dev1.2：野兽走专属动物立绘，红泥部落人形单位保持 humanoid */
    if(isBeast(e))drawBeast(e);else CR.render.drawHumanoid(e,false);
    if(e.barT>0||e.hostile){
      const y=p.y-72*s*e.ht,bw=40*s*e.w;
      r.quad(p.x-bw/2,y,bw,4*s,C.hpbg,.9,0);
      r.quad(p.x-bw/2,y,bw*Math.max(0,e.hp/e.maxHp),4*s,
        e.hostile?(e.cfg.bar||C.hpRed):C.hpBlue,1,0);
      if(e.cfg&&e.cfg.element){
        r.ell(p.x+bw/2+9*s,y+2*s,4*s,4*s,
          CFG.ELEMENT_COLOR[e.cfg.element]||C.steel,.9,0);
      }
    }
    drawShieldBar(e);
  }
  function S_FIX(){return G.S;}

  /* ================= 世界标签 ================= */
  function drawWorldLabels(){
    if(CR.game&&CR.game.state==="menu"){CR.ui.setWorldLabels([]);return;}
    const out=[],RI=CFG.REGION_INFO.swamp;
    const z=CFG.SWAMP_ZONES[SW.zone];
    out.push({text:"🪷 蛮荒沼泽 · ⚠ 危险区域 · "+z.name,sx:G.W*.5,sy:G.H*.135,cls:"region",
      tip:{title:RI.icon+" "+RI.name,kind:"危险区 · "+z.danger+"危险",
        lines:[RI.desc,"当前分区："+z.name+"（"+z.desc+"）","按 G 查看完整区域情报 · 鼠标悬浮 / 长按看对象说明"]}});
    const add=(o,title,lines)=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:title,sx:p.x,sy:p.y-96*G.S*p.s/G.S,cls:"npc",
        tip:{title,kind:"区域",lines}});
    };
    for(const k in CFG.SWAMP_NPCS){
      const n=CFG.SWAMP_NPCS[k];
      add(n,n.icon+" "+n.name,[n.desc]);
    }
    SW.nodes.forEach(n=>add(n,n.icon+" "+n.name,
      [n.desc,toolText(n),"每日 "+n.daily+" 次 · 今日剩余 "+SV.gatherLeft(n.id)+" 次"]));
    SW.mobs.forEach(e=>{
      if(!e.alive)return;
      const p=pr(e.x,e.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:"",sx:p.x,sy:p.y-40*G.S,cls:"mob",
        tip:{title:e.cfg.label,kind:e.halfNeutral?"半中立":"中立",
          lines:[e.cfg.desc||"",e.cfg.behavior||CFG.AI_DOC.neutral,
            "系别 "+(e.cfg.element||"普通系")+" · 概率掉落 "+
            (e.cfg.drops||[]).map(k=>(CFG.MATERIALS[k]||CFG.ITEMS[k]||{}).name||k).join(" / ")]}});
    });
    SW.hostiles.forEach(e=>{
      if(!e.alive)return;
      const p=pr(e.x,e.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:"",sx:p.x,sy:p.y-40*G.S,cls:"mob",
        tip:{title:e.cfg.label,kind:"敌对 · 不死不休",
          lines:[e.cfg.desc||"",e.cfg.behavior||CFG.AI_DOC.hostile,
            "系别 "+(e.cfg.element||"普通系")+" · 概率掉落 "+
            (e.cfg.drops||[]).map(k=>(CFG.MATERIALS[k]||CFG.ITEMS[k]||{}).name||k).join(" / ")]}});
    });
    CR.ui.setWorldLabels(out);
  }
  function toolText(n){
    if(!n.tool)return "徒手即可采集";
    const names=(Array.isArray(n.tool)?n.tool:[n.tool])
      .map(id=>(CFG.EQUIPMENT[id]||{}).name||id).join(" / ");
    return n.kind==="thorn"?("⚠ 徒手采集会受伤（固伤 8）· 推荐 "+names):("需要 "+names);
  }

  /* ================= 主绘制 ================= */
  function drawScene(){
    const r=R();
    drawSky();drawBackdrop();drawWater();drawMist();drawGroundDetails();
    drawGlowbugs();drawFireflies();drawBirds();drawFlowers();
    list.length=0;
    const vl=WLD.camX-260,vr=WLD.camX+G.W/G.S+260;
    SW.reeds.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("reed",o);});
    SW.deadwoods.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("deadwood",o);});
    SW.towers.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("tower",o);});
    SW.nodes.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("node",o);});
    SW.walkers.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("walker",o);});
    for(const k in CFG.SWAMP_NPCS)push("npc",CFG.SWAMP_NPCS[k]);
    push("hut",SW.hut);
    SW.mobs.forEach(e=>{if(e.alive)push("mob",e);});
    SW.hostiles.forEach(e=>{if(e.alive)push("mob",e);});
    E.drops.each(d=>push("drop",d));
    push("player",P);
    list.sort((a,b)=>(a.o.depth||0)-(b.o.depth||0));
    for(let i=0;i<list.length;i++){
      const it=list[i],o=it.o;
      switch(it._t){
        case "reed":drawReed(o);break;
        case "deadwood":drawDeadwood(o);break;
        case "tower":drawTower(o);break;
        case "node":drawNode(o);break;
        case "walker":drawWalker(o);break;
        case "npc":drawNPC(o);break;
        case "hut":drawHut();break;
        case "mob":drawMob(o);break;
        case "drop":CR.render.drawDrop(o);break;
        case "player":CR.render.drawHumanoid(o,true);drawShieldBar(o);break;
      }
    }
    E.beams.each(CR.render.drawBeam);
    E.shots.each(CR.render.drawShot);
    E.ghosts.each(CR.render.drawGhost);
    E.parts.each(CR.render.drawPart);
    E.floats.each(CR.render.drawFloat);
    drawWeather();
    drawBossHud();
    drawWorldLabels();
  }
  CR.renderSwamp={drawScene,skyColors,drawShieldBar,drawBeast,isBeast,
    drawBackdrop,drawGroundDetails,drawWeather,drawBossHud};
})(window.CR=window.CR||{});
