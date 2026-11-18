/* render_market.js — 狂欢集市全部画面几何（WebGL 单批次） */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,MK=CR.market,SV=CR.save;
  const G=CR.gl;
  const list=[],itemPool=[];
  function push(t,o){
    let it=itemPool[list.length];
    if(!it){it={_t:"",o:null};itemPool.push(it);}
    it._t=t;it.o=o;list.push(it);
  }
  function R(){return G.R;}
  function pr(x,d,h){return WLD.proj(x,d,h);}
  function byDepth(a,b){return a.depth-b.depth;}
  const HILL=[[0,.62],[.12,.44],[.24,.58],[.37,.38],[.50,.54],[.63,.36],[.76,.52],[.88,.40],[1,.56]];
  const HPTS=new Array(HILL.length+2);
  for(let i=0;i<HPTS.length;i++)HPTS[i]=[0,0];

  /* ================= 天空 / 远景 ================= */
  function skyColors(){
    const w=MK.wcfg,night=MK.isNight,dusk=stPhase()==="dusk";
    const s=w.sky;
    let top=[s[0],s[1],s[2]],mid=[s[3],s[4],s[5]],low=[s[6],s[7],s[8]];
    if(night){
      top=U.mix(top,[.02,.03,.10],.68);mid=U.mix(mid,[.07,.09,.24],.62);
      low=U.mix(low,[.20,.14,.34],.55);
    }else if(dusk){
      /* 黄昏保留暖色地平线，但顶天必须明显亮起来，不能像入夜 */
      low=U.mix(low,[1,.48,.28],.42);mid=U.mix(mid,[.62,.40,.50],.38);
      top=U.mix(top,[.44,.50,.66],.58);
    }else{
      /* 1.3.1 修复：白昼天色此前沿用天气表的深蓝顶色，看着发黑。
         晴天大幅提亮；雨天 / 雷雨 / 雪天本身云厚，仍要保证是「亮灰」而不是夜色。 */
      const cloudy=(w.rain>0||w.snow>0);
      const lift=cloudy?.62:.68;
      top=U.mix(top,cloudy?[.46,.58,.72]:[.48,.68,.88],lift);
      mid=U.mix(mid,cloudy?[.58,.68,.78]:[.72,.84,.92],lift*.78);
      low=U.mix(low,cloudy?[.78,.82,.86]:[1,.90,.74],lift*.38);
    }
    return {top,mid,low,night};
  }
  function stPhase(){return MK.st.phase;}
  function drawSky(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors();
    const hy=H*.565;
    r.quadG(0,0,W,hy*.72,c.top,c.mid,1,0);
    r.quadG(0,hy*.72,W,hy*.28,c.mid,c.low,1,0);
    // 日月
    const sx=W*.78,sy=H*.17;
    if(c.night){
      r.ell(sx,sy,54*S,54*S,C.ghost,.07,0,true);
      r.ell(sx,sy,22*S,22*S,C.snow,.9,0,true);
      r.ell(sx+10*S,sy-5*S,20*S,20*S,c.top,.55,0,true);
    }else{
      r.ell(sx,sy,80*S,80*S,c.low,.10,0,true);
      r.ell(sx,sy,30*S,30*S,U.mix(C.sun,[1,1,1],.3),.82,0,true);
    }
    // 星星（夜间）
    if(c.night){
      U.srand(9182);
      for(let i=0;i<52;i++){
        const x=U.rr(0,W),y=U.rr(0,hy*.62);
        const a=.25+.5*Math.abs(Math.sin(CR.game.time*1.2+i));
        r.quad(x,y,U.rr(1,2.4)*S,U.rr(1,2.4)*S,C.snow,a,0);
      }
    }
    // 云（雨/雷更厚）
    const cloudA=MK.wcfg.rain>0?.26:.12;
    for(let i=0;i<7;i++){
      const cx=((i*.19+CR.game.time*.004*MK.wcfg.wind)%1.4-.2)*W;
      const cy=H*(.08+i*.035);
      r.ell(cx,cy,U.rr(55,95)*S,U.rr(10,20)*S,C.snow,cloudA,0,true);
      r.ell(cx+45*S,cy-5*S,U.rr(35,60)*S,U.rr(8,15)*S,C.snow,cloudA*.75,0,true);
    }
    // 闪电全屏白（由 market.flash 驱动）
    if(MK.flash>0)r.quad(0,0,W,H,C.snow,U.clamp(MK.flash*.55,0,.55),0);
    // 远山 / 屋脊剪影
    const off=(WLD.camX*.06*S)%(W*1.2);
    for(let rep=-1;rep<2;rep++){
      for(let i=0;i<HILL.length;i++){
        HPTS[i][0]=rep*W*1.2-off+HILL[i][0]*W*1.2;
        HPTS[i][1]=hy-HILL[i][1]*72*S;
      }
      HPTS[HILL.length][0]=rep*W*1.2-off+W*1.2;HPTS[HILL.length][1]=hy;
      HPTS[HILL.length+1][0]=rep*W*1.2-off;HPTS[HILL.length+1][1]=hy;
      r.poly(HPTS,U.shade(c.mid,.72),1,0);
    }
    // 远处屋檐 + 窗火
    const off2=(WLD.camX*.14*S)%340;
    for(let i=-2;i<Math.ceil(W/170)+2;i++){
      const x=i*170-off2,y=hy-28*S;
      r.quad(x,y-34*S,150*S,34*S,U.shade(c.mid,.55),1,0);
      r.tri(x-12*S,y-34*S,x+75*S,y-58*S,x+162*S,y-34*S,U.shade(c.mid,.42),1,0);
      if(c.night)r.quad(x+30*S,y-24*S,14*S,11*S,C.lantern,.85,0);
      if(c.night)r.glow(x+37*S,y-19*S,9*S,7*S,C.lantern,1,.5);
    }
  }

  /* ================= 地面：草丛 / 沙土 / 石板 ================= */
  function drawGround(){
    const r=R(),W=G.W,H=G.H,S=G.S,hy=H*.555;
    const bands=[-96,-58,-18,22,60,100];
    const segs=WLD.groundSegments();
    const viewL=WLD.camX-160,viewR=WLD.camX+W/S+160;
    for(let i=0;i<segs.length;i++){
      const g=segs[i];
      if(g.x1<viewL||g.x0>viewR)continue;
      const mat=CFG.GROUND[g.type];
      const a=pr(g.x0,0,0).x,b=pr(g.x1,0,0).x;
      for(let j=0;j<bands.length-1;j++){
        const y0=hy+bands[j]*.58*S,y1=hy+bands[j+1]*.58*S;
        r.quadG(a,y0,b-a,y1-y0,mat.c1,mat.c2,1,0);
      }
      // 纵深近景：把地面一直铺到画面底部，并由深到更深渐暗
      const yb=hy+bands[bands.length-1]*.58*S;
      r.quadG(a,yb,b-a,H-yb,mat.c2,U.shade(mat.c2,.58),1,0);
      // 材质纹理
      if(g.type==="stone"){
        for(let x=g.x0;x<g.x1;x+=44){
          const px=pr(x,0,0).x;
          r.seg(px,hy-96*.58*S,px,H,1*S,mat.c2,.28,0);
        }
        for(let j=1;j<bands.length;j++){
          const y=hy+bands[j]*.58*S;
          r.quad(a,y,b-a,1*S,mat.c2,.26,0);
        }
      }else if(g.type==="sand"){
        U.srand(Math.floor(g.x0));
        for(let k=0;k<12;k++){
          const px=pr(g.x0+U.rr(0,120),0,0).x;
          const py=hy+U.rr(-80,Math.min(520,(H-hy)/(.58*S)))*.58*S;
          r.ell(px,py,U.rr(2,5)*S,1.3*S,mat.c2,.28,0);
        }
      }else{
        U.srand(Math.floor(g.x0)+7);
        for(let k=0;k<5;k++){
          const px=pr(g.x0+U.rr(0,120),0,0).x;
          const py=hy+U.rr(70,Math.min(500,(H-hy)/(.58*S)))*.58*S;
          r.ell(px,py,U.rr(2,4)*S,1.2*S,mat.c2,.22,0);
        }
      }
    }
    // 底部近景暗角：低透明度叠加，强化 2.5D 纵深（不遮住脚步材质）
    r.quadG(0,H*.86,W,H*.14,C.shadow,C.shadow,.18,0);
  }

  /* ================= 草丛 / 樱花树 / 彩旗 / 灯笼 ================= */
  function drawSakuraTree(x,depth){
    const r=R(),p=pr(x,depth,0),s=p.s,sw=Math.sin(CR.game.time*.8)*2*s;
    r.ell(p.x,p.y,36*s,9*s,C.shadow,.25,0,true);
    r.seg(p.x,p.y,p.x+sw,p.y-72*s,13*s,C.wood,1,0);
    r.seg(p.x+sw,p.y-50*s,p.x-30*s,p.y-82*s,6*s,C.wood,1,0);
    r.seg(p.x+sw,p.y-56*s,p.x+34*s,p.y-88*s,6*s,C.wood,1,0);
    const blobs=[[0,-104,42],[ -30,-92,30],[30,-96,32],[-16,-122,28],[20,-124,26],[0,-138,20]];
    blobs.forEach((b,i)=>{
      r.ell(p.x+b[0]*s+sw,p.y+b[1]*s,b[2]*s,b[2]*.72*s,
        i%2?C.pink:C.sakura,.92,0,true);
      r.ell(p.x+b[0]*s-6*s+sw,p.y+b[1]*s-6*s,b[2]*.4*s,b[2]*.3*s,C.white,.18,0,true);
    });
    if(MK.isNight)r.glow(p.x,p.y-96*s,52*s,44*s,C.pink,1,.16);
  }
  function drawFlags(){
    const r=R(),S=G.S,W=G.W,H=G.H;
    const y0=H*.19,y1=H*.265;
    const span=520*S,off=-(WLD.camX*.22*S)%span;
    r.seg(0,y0,W,y1,1.3*S,C.wood,.55,0);
    for(let i=-1;i<W/54+2;i++){
      const x=i*54*S+off;
      const col=[C.cloth,C.cloth2,C.cloth3,C.pink,C.green][i%5<0?(i%5+5):i%5];
      r.tri(x,y0+(x/W)*(y1-y0),x+34*S,y0+(x/W)*(y1-y0),
            x+17*S,y0+(x/W)*(y1-y0)+26*S,col,.85,0);
    }
  }
  /* ================= 摊位 / NPC ================= */
  function drawStall(x,depth){
    const r=R(),p=pr(x,depth,0),s=p.s;
    r.ell(p.x,p.y,62*s,12*s,C.shadow,.28,0,true);
    // 摊车
    r.quad(p.x-46*s,p.y-30*s,92*s,26*s,C.wood,1,0);
    r.quad(p.x-46*s,p.y-30*s,92*s,5*s,U.shade(C.wood,1.4),1,0);
    r.quad(p.x-40*s,p.y-14*s,80*s,10*s,U.shade(C.wood,.72),1,0);
    r.ell(p.x-30*s,p.y-2*s,7*s,7*s,C.black,1,0,true);
    r.ell(p.x+30*s,p.y-2*s,7*s,7*s,C.black,1,0,true);
    // 支柱 + 条纹棚
    r.seg(p.x-42*s,p.y-30*s,p.x-42*s,p.y-88*s,3*s,C.wood,1,0);
    r.seg(p.x+42*s,p.y-30*s,p.x+42*s,p.y-88*s,3*s,C.wood,1,0);
    for(let i=0;i<8;i++){
      const x0=p.x-52*s+i*13*s;
      r.quad(x0,p.y-98*s,13*s,14*s,i%2?C.cloth:C.white,1,0);
    }
    r.tri(p.x-58*s,p.y-98*s,p.x,p.y-112*s,p.x+58*s,p.y-98*s,C.cloth,1,0);
    // 货物
    const goods=[C.green,C.cyan,C.fire,C.gold,C.pink];
    for(let i=0;i<5;i++){
      const gx=p.x-32*s+i*16*s;
      r.ell(gx,p.y-36*s,6*s,6*s,goods[i],1,0);
      r.ell(gx-2*s,p.y-38*s,2*s,2*s,C.white,.5,0);
      if(MK.isNight)r.glow(gx,p.y-36*s,7*s,7*s,goods[i],.5,.35);
    }
    if(MK.isNight)r.glow(p.x,p.y-62*s,50*s,32*s,C.lantern,.8,.22);
  }
  function drawSakura(){
    const r=R(),n=CFG.NPCS.sakura,p=pr(n.x,n.depth,0),s=p.s;
    const bob=Math.sin(CR.game.time*1.5)*3*s;
    const y=p.y+bob;
    // 幽灵外晕 + 法阵
    r.ell(p.x,y-34*s,26*s,42*s,C.ghost,.10,0,true);
    r.ring(p.x,p.y,30*s,12*s,1.6*s,C.sakura,.45+.18*Math.sin(CR.game.time*2),0,20);
    r.ring(p.x,p.y,20*s,8*s,1.2*s,C.ghost,.30,0,16);
    // 汉服裙摆
    r.trap(p.x,y-30*s,y-2*s,24*s,40*s,C.pink,C.pinkDk,1,0);
    r.trap(p.x,y-18*s,y-1*s,40*s,44*s,U.shade(C.pink,.92),C.pinkDk,.95,0);
    r.quad(p.x-20*s,y-32*s,40*s,4*s,C.gold,.9,0);
    // 广袖
    r.seg(p.x-11*s,y-46*s,p.x-30*s,y-30*s,10*s,C.pink,1,0);
    r.seg(p.x+11*s,y-46*s,p.x+30*s,y-30*s,10*s,C.pink,1,0);
    r.ell(p.x-30*s,y-28*s,5*s,4*s,C.skin,1,0);
    r.ell(p.x+30*s,y-28*s,5*s,4*s,C.skin,1,0);
    // 长发 + 脸
    r.ell(p.x,y-56*s,13*s,16*s,C.pinkDk,1,0,true);
    r.ell(p.x,y-58*s,9*s,10*s,C.skin,1,0,true);
    r.ell(p.x,y-64*s,12*s,8*s,U.shade(C.pink,1.25),1,0,true);
    r.ell(p.x-4*s,y-58*s,1.8*s,2.2*s,C.black,1,0);
    r.ell(p.x+4*s,y-58*s,1.8*s,2.2*s,C.black,1,0);
    // 发簪 / 樱花
    r.seg(p.x+8*s,y-68*s,p.x+18*s,y-76*s,1.6*s,C.gold,1,0);
    r.ell(p.x+19*s,y-77*s,4*s,4*s,C.sakura,1,0);
    // 幽灵飘带
    for(let i=0;i<3;i++){
      const a=CR.game.time*.7+i*2.1;
      const gx=p.x+Math.cos(a)*30*s,gy=y-30*s+Math.sin(a)*18*s;
      r.ell(gx,gy,5*s,5*s,C.ghost,.35,0);
    }
    if(MK.isNight)r.glow(p.x,y-40*s,26*s,36*s,C.sakura,1.1,.30);
    // 环绕樱花
    for(let i=0;i<6;i++){
      const a=CR.game.time*.5+i*1.05;
      r.ell(p.x+Math.cos(a)*36*s,y-34*s+Math.sin(a)*24*s,2.6*s,2.6*s,
        C.sakura,.55+.3*Math.sin(a*2),0);
    }
  }
  function drawVendor(){
    const r=R(),n=CFG.NPCS.vendor,p=pr(n.x,n.depth-26,0),s=p.s;
    const bob=Math.sin(CR.game.time*3)*1.4*s,by=p.y-bob;
    r.ell(p.x,p.y,15*s,5*s,C.shadow,.28,0,true);
    // 矮胖身体
    r.trap(p.x,by-30*s,by-10*s,26*s,24*s,C.cloth3,U.shade(C.cloth3,.65),1,0);
    r.quad(p.x-13*s,by-26*s,26*s,14*s,C.white,.85,0); // 围裙
    r.seg(p.x-7*s,by-11*s,p.x-7*s,by,6*s,C.brown,1,0);
    r.seg(p.x+7*s,by-11*s,p.x+7*s,by,6*s,C.brown,1,0);
    r.ell(p.x,by-40*s,10*s,10*s,C.skin,1,0,true);
    r.ell(p.x,by-47*s,11*s,5*s,C.brown,1,0,true);
    r.quad(p.x-4*s,by-41*s,2*s,2*s,C.black,1,0);
    r.quad(p.x+3*s,by-41*s,2*s,2*s,C.black,1,0);
    r.ell(p.x,by-33*s,6*s,3*s,C.brown,.8,0); // 胡子
    // 招手
    const wave=Math.sin(CR.game.time*4)*.4;
    r.seg(p.x+11*s,by-26*s,p.x+22*s,by-38*s+wave*10*s,5*s,C.skin,1,0);
  }
  function drawWalker(w){
    const r=R(),p=pr(w.x,w.depth,0),s=p.s;
    if(p.x<-100||p.x>G.W+100)return;
    const bob=Math.sin(CR.game.time*7+w.t*3)*1.6*s,by=p.y-bob;
    const f=w.dir;
    r.ell(p.x,p.y,11*s,4*s,C.shadow,.22,0,true);
    r.seg(p.x-4*s,by-12*s,p.x-4*s+f*3*s,by,4*s,U.shade(w.color,.6),1,0);
    r.seg(p.x+4*s,by-12*s,p.x+4*s-f*3*s,by,4*s,U.shade(w.color,.6),1,0);
    r.trap(p.x,by-30*s,by-11*s,16*s,14*s,w.color,U.shade(w.color,.6),1,0);
    r.ell(p.x,by-38*s,7*s,7*s,C.skin,1,0,true);
    r.ell(p.x,by-42*s,8*s,4*s,C.brown,1,0,true);
    // 提灯 / 小道具
    if(w.icon==="●"){
      r.seg(p.x+f*9*s,by-24*s,p.x+f*13*s,by-10*s,1.5*s,C.wood,1,0);
      if(MK.isNight)r.glow(p.x+f*13*s,by-7*s,5*s,6*s,C.lantern,1,.75);
    }else if(w.icon==="✿"){
      r.ell(p.x-f*11*s,by-18*s,4*s,4*s,C.sakura,1,0);
    }
    // 头顶小标记
    r.ell(p.x,by-52*s,3*s,3*s,w.color,.8,0);
  }

  /* ================= 两只集市中立野怪 ================= */
  function drawCandy(e){
    const r=R(),p=pr(e.x,e.depth,e.h),s=p.s*e.scale;
    const bob=Math.sin(e.anim*.55)*2.5*s,by=p.y-bob;
    const col=e.hostile?C.candyDk:C.candy;
    r.ell(p.x,p.y,20*s,6*s,C.shadow,.24,0,true);
    r.ell(p.x,by-15*s,24*s,18*s,col,1,0,true);
    r.ell(p.x,by-19*s,22*s,16*s,U.shade(col,1.18),1,0,true);
    // 糖霜花纹
    for(let i=0;i<5;i++){
      const a=i*1.26+CR.game.time*.2;
      r.ell(p.x+Math.cos(a)*15*s,by-19*s+Math.sin(a)*10*s,3*s,2*s,C.white,.8,0);
    }
    // 腮红 + 眼
    r.ell(p.x-11*s,by-13*s,4*s,2.6*s,C.pink,.75,0);
    r.ell(p.x+11*s,by-13*s,4*s,2.6*s,C.pink,.75,0);
    r.ell(p.x-6*s,by-19*s,2.4*s,3*s,C.black,1,0);
    r.ell(p.x+6*s,by-19*s,2.4*s,3*s,C.black,1,0);
    r.ell(p.x,by-15*s,3*s,2*s,C.black,.8,0);
    // 竹签 / 糖纸
    r.seg(p.x+18*s,by-18*s,p.x+26*s,by-30*s,2*s,C.wood,1,0);
    r.tri(p.x+26*s,by-30*s,p.x+34*s,by-26*s,p.x+26*s,by-22*s,C.cloth2,1,0);
    if(e.flash>0)r.ell(p.x,by-17*s,25*s,19*s,C.white,e.flash*.7,0,true);
    bar(r,p.x,by-42*s,s,e,C.hpBlue);
  }
  function drawKite(e){
    const r=R(),p=pr(e.x,e.depth,e.h+Math.sin(CR.game.time*1.2+e.anim)*8),s=p.s*e.scale;
    const by=p.y;
    r.ell(p.x,p.y-e.h*s,14*s,4*s,C.shadow,.16,0,true);
    const col=e.hostile?C.kiteDk:C.kite;
    // 菱形纸鸢
    r.tri(p.x,by-46*s,p.x-17*s,by-22*s,p.x,by-4*s,col,1,0);
    r.tri(p.x,by-46*s,p.x+17*s,by-22*s,p.x,by-4*s,U.shade(col,.78),1,0);
    r.seg(p.x-17*s,by-22*s,p.x+17*s,by-22*s,1.5*s,C.wood,1,0);
    r.seg(p.x,by-46*s,p.x,by-4*s,1.5*s,C.wood,1,0);
    // 眼睛
    r.ell(p.x-5*s,by-26*s,2.2*s,2.6*s,C.black,1,0);
    r.ell(p.x+5*s,by-26*s,2.2*s,2.6*s,C.black,1,0);
    // 祈愿签 + 飘带
    const sw=Math.sin(CR.game.time*3+e.anim)*7*s;
    r.seg(p.x,by-4*s,p.x+sw,by+14*s,2*s,C.pink,.9,0);
    r.quad(p.x+sw-5*s,by+14*s,10*s,13*s,C.white,.9,0);
    r.quad(p.x+sw-2*s,by+17*s,4*s,2*s,C.pink,.8,0);
    for(let i=0;i<2;i++){
      const t=CR.game.time*2+i*3;
      r.seg(p.x+(i?12:-12)*s,by-22*s,p.x+(i?24:-24)*s+Math.sin(t)*6*s,
        by-6*s+Math.cos(t)*5*s,2*s,C.sakura,.7,0);
    }
    if(e.flash>0)r.tri(p.x,by-46*s,p.x-17*s,by-22*s,p.x+17*s,by-22*s,C.white,e.flash*.7,0);
    bar(r,p.x,by-58*s,s,e,C.hpBlue);
  }
  function bar(r,x,y,s,e,col){
    if(e.hp>=e.maxHp&&!e.hostile&&e.type!=="candy"&&e.type!=="kite")return;
    const bw=38*s;
    r.quad(x-bw/2-1*s,y-1*s,bw+2*s,5*s,C.black,.75,0);
    r.quad(x-bw/2,y,bw,3.6*s,C.hpbg,.9,0);
    r.quad(x-bw/2,y,bw*U.clamp(e.hp/e.maxHp,0,1),3.6*s,col,1,0);
    if(!e.hostile)r.ring(x,y+1.8*s,bw*.56,3.2*s,1*s,C.hpBlue,.4,0,12);
  }

  /* ================= 主绘制 ================= */
  function drawScene(){
    const r=R();
    drawSky();
    drawGround();
    drawFlags();
    // 樱花树（夜樱身后）
    drawSakuraTree(CFG.NPCS.sakura.x-70,-62);
    drawSakuraTree(CFG.NPCS.sakura.x+95,-78);
    drawStall(CFG.NPCS.vendor.x,CFG.NPCS.vendor.depth+16);
    // 按纵深排序的实体：草丛 / 灯笼 / 行人 / NPC / 野怪 / 玩家
    list.length=0;
    const vl=WLD.camX-200,vr=WLD.camX+G.W/G.S+200;
    MK.grass.forEach(g=>{if(g.x>=vl&&g.x<=vr)push("grass",g);});
    MK.lanterns.forEach(L=>{if(L.x>=vl&&L.x<=vr)push("lantern",L);});
    MK.walkers.forEach(w=>{if(w.x>=vl&&w.x<=vr)push("walker",w);});
    push("sakura",CFG.NPCS.sakura);
    push("vendor",CFG.NPCS.vendor);
    CR.ent.enemies.each(e=>push(e.type==="candy"?"candy":(e.type==="kite"?"kite":"mob"),e));
    CR.ent.drops.each(d=>push("drop",d));
    push("player",P);
    list.sort((a,b)=>(a.o.depth||0)-(b.o.depth||0));
    for(let i=0;i<list.length;i++){
      const it=list[i],o=it.o;
      switch(it._t){
        case "grass":{
          const p=pr(o.x,o.depth,0),s=p.s;
          const sw=Math.sin(CR.game.time*1.6+o.phase)*1.4*s+o.sway*11*s;
          for(let k=0;k<3;k++)
            r.seg(p.x+(k-1)*3.5*s,p.y,p.x+(k-1)*2.5*s+sw,
                  p.y-o.h*s*(.7+k*.16),2.2*s,k%2?C.leaf2:C.leaf1,1,0);
          break;
        }
        case "lantern":{
          const p=pr(o.x,o.depth,0),s=p.s,y=p.y-o.h*s;
          const night=MK.isNight,flick=.86+.14*Math.sin(CR.game.time*3+o.phase);
          r.seg(p.x,y-38*s,p.x,y-14*s,1.4*s,C.wood,.7,0);
          /* 1.3.1：白天灯笼是熄着的暗红纸罩，只有入夜才点亮并发光 */
          const shade=night?o.color:U.shade(o.color,.30);
          r.ell(p.x,y,10*s,13*s,night?U.shade(o.color,.62):U.shade(o.color,.22),1,0,true);
          r.ell(p.x,y,7*s,10*s,shade,1,0,true);
          r.quad(p.x-8*s,y-12*s,16*s,2.5*s,C.goldDk,1,0);
          r.quad(p.x-8*s,y+10*s,16*s,2.5*s,C.goldDk,1,0);
          if(night)r.glow(p.x,y,16*s,20*s,o.color,1.15,flick);
          break;
        }
        case "walker":drawWalker(o);break;
        case "sakura":drawSakura();break;
        case "vendor":drawVendor();break;
        case "candy":drawCandy(o);break;
        case "kite":drawKite(o);break;
        case "mob":CR.render.drawHumanoid(o,false);break;
        case "drop":CR.render.drawDrop(o);break;
        case "player":CR.render.drawHumanoid(o,true);break;
      }
    }
    // 叠加层
    CR.ent.beams.each(CR.render.drawBeam);
    CR.ent.shots.each(CR.render.drawShot);
    CR.ent.ghosts.each(CR.render.drawGhost);
    CR.ent.parts.each(CR.render.drawPart);
    drawWeather();
    CR.ent.floats.each(CR.render.drawFloat);
    drawWorldLabels();
  }
  function drawWeather(){
    const r=R(),S=G.S,W=G.W,H=G.H;
    MK.parts.each(p=>{
      const k=U.clamp(p.life/p.max,0,1),a=p.alpha*k;
      if(p.kind===0){ // 雨丝
        r.seg(p.x,p.y,p.x+p.vx*.018,p.y+p.vy*.018,1.4*S,C.rain,a*.7,0);
        r.ell(p.x,p.y+p.vy*.018,1.3*S,2*S,C.rain,a*.35,0);
      }else if(p.kind===1){ // 雪片
        r.ell(p.x,p.y,p.size*S*.5,p.size*S*.5,C.snow,a,0,true);
        r.ell(p.x,p.y,p.size*S*.22,p.size*S*.22,C.white,a,0);
      }else if(p.kind===2){ // 樱花瓣
        const s=p.size*S;
        r.tri(p.x,p.y-s*.5,p.x+s*.6,p.y,p.x,p.y+s*.5,C.sakura,a,0);
        r.tri(p.x,p.y-s*.5,p.x-s*.6,p.y,p.x,p.y+s*.5,U.shade(C.pink,1.1),a,0);
      }else{ // 萤火
        r.glow(p.x,p.y,p.size*S*2.2,p.size*S*2.2,C.lanternGlow,1,a*.55);
        r.ell(p.x,p.y,p.size*S*.35,p.size*S*.35,C.fire2,a,0);
      }
    });
    // 地面雨溅 / 雪积
    if(MK.wcfg.rain>0){
      U.srand(Math.floor(WLD.camX/40));
      for(let i=0;i<14;i++){
        const x=U.rr(0,W),y=H*.62+U.rr(0,H*.34);
        r.ring(x,y,U.rr(4,10)*S,2*S,1*S,C.rain,.18,0,10);
      }
    }
    if(MK.wcfg.snow>0){
      r.quadG(0,H*.56,W,H*.44,C.snow,C.snow,.055,0);
      U.srand(31337);
      for(let i=0;i<26;i++){
        const x=U.rr(0,W),y=H*.60+U.rr(0,H*.34);
        r.ell(x,y,U.rr(5,16)*S,1.8*S,C.snow,.12,0);
      }
    }
  }
  /* 世界标签（NPC 名称 / 对话气泡）交给 DOM 层显示中文 */
  function drawWorldLabels(){
    const out=[],R=CFG.REGION_INFO.market;
    /* 1.2.0：常驻区域情报标签，任何位置都能悬浮 / 长按 */
    out.push({text:"🏮 狂欢集市 · 区域情报",sx:G.W*.5,sy:G.H*.135,cls:"region",
      tip:{title:R.icon+" "+R.name,kind:"区域情报",
        lines:[R.desc,"NPC "+R.npcs.length+" · 中立野怪 "+R.mobs.length+
          " · 资源点 "+R.nodes.length,"按 G 打开完整情报卡"]}});
    const add=(text,x,d,h,cls,tip)=>{
      const p=pr(x,d,h);
      if(p.x<-140||p.x>G.W+140)return;
      out.push({text,sx:p.x,sy:p.y,cls,tip});
    };
    add("✿ 夜樱",CFG.NPCS.sakura.x,CFG.NPCS.sakura.depth,126,"sakura",
      {title:"✿ 夜樱",kind:"NPC · 赏金委托人",
        lines:["幽灵与樱花凝成的少女，粉色汉服、粉发，擅长法术",
          "对话可领赏金（每日 1 次），首次赠【清羽足链】"]});
    add("⚖ 阿福 · 百物摊",CFG.NPCS.vendor.x,CFG.NPCS.vendor.depth,132,"vendor",
      {title:"⚖ 阿福",kind:"NPC · 商店",
        lines:["出售战斗消耗品、经验果与装备","按 F 交易"]});
    /* 中立野怪悬浮说明 */
    CR.ent.enemies.each(e=>{
      if(!e.alive||Math.abs(P.x-e.x)>380)return;
      if(e.type==="candy"||e.type==="kite")
        add("· "+e.cfg.label,e.x,e.depth,96,"halfneutral",
          {title:e.cfg.label,kind:"中立野怪 · 蓝色血条",
            lines:[e.cfg.desc||"被攻击后才会反击","生命 "+Math.ceil(e.hp)+" / "+e.maxHp]});
    });
    MK.walkers.forEach(w=>{
      if(Math.abs(P.x-w.x)<260)add(w.name,w.x,w.depth,76,"walker");
    });
    MK.bubbles.forEach(b=>{
      const p=pr(b.x,b.depth,104);
      out.push({text:b.text,sx:p.x,sy:p.y,cls:"bubble",
        alpha:U.clamp(b.life/b.max,0,1)});
    });
    if(MK.st.near){
      const n=MK.st.near;
      const p=pr(n.cfg.x,n.cfg.depth,110);
      out.push({text:"按 F 交谈",sx:p.x,sy:p.y,cls:"hint"});
    }
    CR.ui.setWorldLabels(out);
  }
  CR.renderMarket={drawScene,skyColors};
})(window.CR=window.CR||{});
