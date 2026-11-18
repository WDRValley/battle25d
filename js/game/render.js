/* render.js — 全部画面几何：天空、视差远景、2.5D 地面、角色、怪物、
 * 攻击特效、粒子、动态光影、WebGL 七段数码伤害漂字 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=CR.ent.player,WLD=CR.world;
  const G=CR.gl;
  const list=[];
  const HILL=[[0,.70],[.10,.48],[.21,.66],[.32,.42],[.43,.60],[.54,.40],[.65,.58],[.76,.44],[.88,.62],[1,.50]];
  const HPTS=new Array(HILL.length+2);
  for(let i=0;i<HPTS.length;i++)HPTS[i]=[0,0];
  function R(){return G.R;}
  /* 返回共享投影对象：所有调用处都立即取出 x/y/s 数值，不再二次引用 */
  function pr(x,d,h){return WLD.proj(x,d,h);}
  function byDepth(a,b){return a.depth-b.depth;}

  /* ================= 背景 ================= */
  function drawSky(){
    const r=R(),W=G.W,H=G.H,S=G.S,T=WLD.theme;
    r.quadG(0,0,W,H*.58,T.skyTop,T.skyMid,1,0);
    r.quadG(0,H*.38,W,H*.20,T.skyMid,T.skyLow,1,0);
    // 天体：随区域从暖阳过渡到冷月
    const warm=U.clamp(T.skyLow[0]-T.skyLow[2]+.2,0,1);
    const sx=W*.76,sy=H*.20;
    r.ell(sx,sy,82*S,82*S,T.skyLow,.09,0,true);
    r.ell(sx,sy,52*S,52*S,C.sun,.16*warm+.06,0,true);
    r.ell(sx,sy,26*S,26*S,U.mix(C.cyan,C.sun,warm),.92,0,true);
    if(warm<.5)r.ell(sx+9*S,sy-5*S,24*S,24*S,T.skyTop,.55,0,true); // 月牙
    // 云带
    for(let i=0;i<5;i++){
      const cx=((i*.27+CR.game.time*.006)%1.3-.15)*W;
      const cy=H*(.12+i*.045);
      r.ell(cx,cy,62*S,8*S,C.white,.055,0,true);
      r.ell(cx+34*S,cy-4*S,40*S,6*S,C.white,.04,0,true);
    }
    // 斜向体积光
    for(let i=0;i<3;i++){
      const ox=sx-(180+i*160)*S;
      r.triG(sx-16*S,sy,sx+16*S,sy,ox+290*S,H*.58,C.sun,C.sun,C.sun,.055,0);
    }
  }
  function drawHills(){
    const r=R(),W=G.W,H=G.H,S=G.S,T=WLD.theme;
    const layers=[[.08,T.hillA,88],[.17,T.hillB,120],[.29,T.hillC,152]];
    for(let L=0;L<3;L++){
      const par=layers[L][0],col=layers[L][1],amp=layers[L][2]*S;
      const off=(WLD.camX*par*S)%(W*1.2);
      for(let rep=-1;rep<2;rep++){
        for(let i=0;i<HILL.length;i++){
          HPTS[i][0]=rep*W*1.2-off+HILL[i][0]*W*1.2;
          HPTS[i][1]=H*.565-HILL[i][1]*amp;
        }
        HPTS[HILL.length][0]=rep*W*1.2-off+W*1.2;HPTS[HILL.length][1]=H;
        HPTS[HILL.length+1][0]=rep*W*1.2-off;HPTS[HILL.length+1][1]=H;
        r.poly(HPTS,col,1,0);
      }
    }
  }
  function drawGround(){
    const r=R(),W=G.W,H=G.H,S=G.S,T=WLD.theme;
    const hy=H*.555;
    // 草地铺满地平线以下全部像素，杜绝视口边缘露出背景色
    r.quadG(0,hy,W,H-hy,T.grass1,T.grass2,1,0);
    // 透视道路：底边按视口宽度自适应，宽屏下也不会露出矩形黄土边界
    const cx=W*.5,top=hy-46*S,bot=H;
    const topHalf=Math.max(260*S,W*.20),botHalf=Math.max(720*S,W*.62+160*S);
    r.triG(cx-topHalf,top,cx+topHalf,top,cx+botHalf,bot,C.road1,C.road1,C.road2,1,0);
    r.triG(cx-topHalf,top,cx-botHalf,bot,cx+botHalf,bot,C.road1,C.road2,C.road2,1,0);
    r.seg(cx-topHalf,top,cx-botHalf,bot,2*S,T.grass1,.5,0);
    r.seg(cx+topHalf,top,cx+botHalf,bot,2*S,T.grass1,.5,0);
    // 纵深网格线（强化 2.5D 地面）
    for(let d=-80;d<=95;d+=25){
      const y=hy+d*.58*S;
      if(y<hy-4||y>H)continue;
      r.quad(0,y,W,1*S,C.white,.035,0);
    }
    // 路面石纹（随卷轴滚动）
    for(let i=0;i<14;i++){
      const x=((i*173+WLD.camX*.32)%(W+340))-170;
      const y=hy+((i*97)%Math.floor(H-hy));
      r.ell(x,y,10*S,2.6*S,C.road2,.14,0);
    }
    // 区域氛围漂浮微粒
    const amb=WLD.zoneIdx===0?C.leaf3:(WLD.zoneIdx===1?C.fire:C.violet);
    for(let i=0;i<22;i++){
      const x=((i*137+CR.game.time*(8+i%4)*.55)%(W+80))-40;
      const y=hy*.55+((i*61+Math.sin(CR.game.time*.7+i)*30)%(H*.9));
      r.quad(x,y,2.2*S,2.2*S,amb,.14,0);
    }
  }
  function drawCastle(){
    const r=R(),S=G.S,H=G.H,W=G.W;
    const p=pr(CFG.LEVEL_W-240,0,0),x=p.x,y=p.y,s=p.s;
    if(x<-420*S||x>W+620*S)return;
    const g=y-8*s;
    r.ell(x,g,210*s,16*s,C.shadow,.28,0,true);
    r.quad(x-160*s,g-200*s,320*s,200*s,C.stone,1,0);
    r.quad(x-160*s,g-200*s,320*s,18*s,C.stoneDk,1,0);
    for(let i=0;i<8;i++)r.quad(x-160*s+i*42*s,g-218*s,26*s,22*s,C.stone,1,0);
    r.quad(x-205*s,g-268*s,88*s,268*s,C.stone,1,0);
    r.quad(x+117*s,g-268*s,88*s,268*s,C.stone,1,0);
    for(let i=0;i<3;i++){
      r.quad(x-205*s+i*30*s,g-286*s,18*s,20*s,C.stone,1,0);
      r.quad(x+117*s+i*30*s,g-286*s,18*s,20*s,C.stone,1,0);
    }
    r.quad(x-34*s,g-104*s,68*s,104*s,C.stoneDk,1,0);
    r.ell(x,g-104*s,34*s,34*s,C.stoneDk,1,0,true);
    for(let i=0;i<4;i++)r.quad(x-150*s+i*84*s,g-160*s,16*s,26*s,C.stoneDk,.8,0);
    // 火盆光
    [-150,150].forEach(dx=>{
      r.seg(x+dx*s,g-268*s,x+dx*s,g-330*s,3*s,C.wood,1,0);
      r.tri(x+dx*s,g-330*s,x+dx*s+(dx<0?66:-66)*s,g-316*s,x+dx*s,g-302*s,C.flag,1,0);
      r.glow(x+dx*s,g-318*s,12*s,12*s,C.fire,1,.8);
    });
  }

  /* ================= 场景物件 ================= */
  function drawProp(o){
    const r=R(),p=pr(o.x,o.depth,0),x=p.x,y=p.y,s=p.s*o.s;
    if(x<-180*G.S||x>G.W+180*G.S)return;
    const T=WLD.theme;
    r.ell(x,y,17*s,5*s,C.shadow,.22,0);
    r.ell(x-13*s,y+2*s,24*s,4*s,C.shadow,.09,0);
    const sway=Math.sin(CR.game.time*1.1+o.v)*1.5*s;
    if(o.type===0){ // 茂树
      r.seg(x,y,x+sway,y-54*s,9*s,C.wood,1,0);
      r.ell(x+sway,y-76*s,32*s,25*s,C.leaf2,1,0,true);
      r.ell(x-13*s+sway,y-88*s,25*s,21*s,C.leaf1,1,0,true);
      r.ell(x+13*s+sway,y-92*s,23*s,20*s,C.leaf3,1,0,true);
      r.ell(x-9*s+sway,y-99*s,10*s,7*s,C.leaf3,.5,0);
    }else if(o.type===3){ // 枯树
      r.seg(x,y,x+sway,y-58*s,8*s,C.wood,1,0);
      r.seg(x+sway*.5,y-40*s,x-18*s+sway,y-62*s,4*s,C.wood,1,0);
      r.seg(x+sway*.5,y-46*s,x+19*s+sway,y-70*s,4*s,C.wood,1,0);
      r.seg(x+sway,y-54*s,x+7*s+sway,y-78*s,3*s,C.wood,1,0);
    }else if(o.type===1){ // 岩石
      r.ell(x,y-9*s,18*s,12*s,C.stone,1,0);
      r.ell(x-7*s,y-15*s,9*s,5*s,C.stoneDk,.8,0);
      r.ell(x+5*s,y-9*s,9*s,4*s,C.stoneDk,.6,0);
    }else if(o.type===4){ // 城堡火把 / 符文柱
      r.trap(x,y-46*s,y,13*s,18*s,C.stone,C.stoneDk,1,0);
      r.ell(x,y-50*s,8*s,5*s,C.stone,1,0);
      r.glow(x,y-56*s,9*s,11*s,C.violet,1,.85);
      r.quad(x-2*s,y-38*s,4*s,12*s,C.violet,.75,0);
    }else{ // 草簇
      for(let i=0;i<4;i++){
        const bx=x+(i-1.5)*5*s;
        const gh=9+((i*7+Math.floor(o.x))%6)*1.4;
        r.seg(bx,y,bx+(i-1.5)*3*s+sway*.3,y-gh*s,2.4*s,i%2?T.grass1:C.leaf2,1,0);
      }
    }
  }

  /* ================= 角色 / 怪物 ================= */
  /* ================= 1.1.0 装备外观：逐件改变角色形象 ================= */
  /* ================= 1.4 dev1.2 王者·钻「樱色套件」专属外观 =================
     23 件全部走这里：亮青蓝仿钻主体 + 粉樱描边 + 环绕樱瓣，
     不再复用普通装备 look（紫袍 / 钢剑 / 凉鞋），做到「所穿即所得」。 */
  function sakuraPetals(r,cx,cy,s,alpha,n,rad,t){
    n=n||5;rad=rad||18;
    for(let i=0;i<n;i++){
      const a=(t||CR.game.time)*.55+i*6.283/n;
      const x=cx+Math.cos(a)*rad*s,y=cy+Math.sin(a)*rad*.62*s;
      r.tri(x,y-3*s,x+3.4*s,y,x,y+3*s,C.sakuraPink,.85*alpha,0);
      r.tri(x,y-3*s,x-3.4*s,y,x,y+3*s,C.pink,.72*alpha,0);
    }
  }
  function drawSakuraEquip(r,px,by,s,face,it,alpha,flash,at,ht,part){
    const A=alpha,F=flash,L=(it.look||""),DL=C.diamondLite,DD=C.diamondDeep,
      SP=C.sakuraPink,SK=C.sakura,T=CR.game.time;
    const hy=by-30*s*ht;
    /* 通用钻光：亮青蓝柔光 + 樱粉轮廓 */
    r.glow(px,by-26*s*ht,30*s,34*s,DL,1,.26*A);
    if(part==="weapon"){
      const ang=(-.6+at*2.0)*face,hx=px+face*14*s;
      r.glow(hx,hy,34*s,30*s,DL,1,.34*A);
      r.ell(hx+face*5*s,hy-6*s,4.6*s,3.4*s,SP,.9*A,F);
      sakuraPetals(r,hx,hy,s,A,4,24,T+1);
      /* 1.4 dev1.3：袖箭专属立绘（腕绑箭匣 + 三支短箭），不再与长弓共用弓形 */
      if(L==="sakuraSleeve"){
        const wx=px+face*18*s,wy=by-31*s*ht;
        r.trap(wx,wy-9*s,wy+9*s,9*s,13*s,DD,DL,A,F);
        r.quad(wx-6*s,wy-7*s,12*s,3*s,SP,.9*A,0);
        r.ell(wx,wy,3.6*s,3.6*s,C.white,.92*A,0);
        for(let k=0;k<3;k++){
          const yy=wy-6*s+k*6*s;
          r.seg(wx+2*s,yy,wx+face*20*s,yy-3*s,1.8*s,DL,A,F);
          r.tri(wx+face*20*s,yy-5*s,wx+face*27*s,yy-3*s,wx+face*20*s,yy-1*s,SP,.9*A,F);
        }
        /* 腕带 + 箭羽：与长弓的弧形弓臂明显区分 */
        r.quad(wx-face*10*s,wy-12*s,20*s,3*s,SP,.85*A,0);
        r.quad(wx-face*10*s,wy+9*s,20*s,3*s,SP,.85*A,0);
        for(let k=0;k<3;k++){
          const yy=wy-6*s+k*6*s,ax=wx+face*20*s;
          r.tri(ax,yy-5*s,ax-face*5*s,yy-8*s,ax-face*4*s,yy-2*s,C.white,.75*A,0);
          r.seg(wx-2*s,yy,wx-8*s,yy+((k%2)?3:-3)*s,1.2*s,SP,.8*A,0);
        }
        r.glow(wx,wy,16*s,14*s,DL,1,.28*A);
        sakuraPetals(r,wx,wy,s,A,3,11,T);
        return;
      }
      /* ================= 1.4 dev1.4 每件樱钻武器独立建模 =================
         旧版按 /Axe|Hammer/、/Shield/、/Staff|Wand|Book|Orb|Ring/ 分组共用一套形状，
         导致战斧≡战锤、巨盾≡圆盾、魔书≡魔珠≡法戒≡权杖；Spear 还被 /Bow|Spear/ 画成长弓。 */
      const handX=px+face*14*s,handY=hy;
      const tipAt=(len)=>({x:handX+Math.cos(ang)*len*s,y:handY+Math.sin(ang)*len*s});

      /* --- 樱色花扇：折扇（书系法器，视觉仍为扇） --- */
      if(L==="sakuraFan"){
        const fx=px+face*22*s,fy=by-33*s*ht;
        for(let i=0;i<8;i++){
          const a=-1.2+i*.34;
          r.seg(fx,fy,fx+Math.cos(a)*24*s,fy+Math.sin(a)*24*s,1.6*s,DL,A,F);
        }
        r.tri(fx,fy,fx+Math.cos(-1.2)*24*s,fy+Math.sin(-1.2)*24*s,
              fx+Math.cos(1.18)*24*s,fy+Math.sin(1.18)*24*s,SP,.34*A,0);
        r.seg(fx,fy,fx+Math.cos(-1.2)*24*s,fy+Math.sin(-1.2)*24*s,2*s,DD,A,F);
        r.seg(fx,fy,fx+Math.cos(1.18)*24*s,fy+Math.sin(1.18)*24*s,2*s,DD,A,F);
        for(let i=0;i<5;i++){
          const a=-.95+i*.48;
          r.ell(fx+Math.cos(a)*18*s,fy+Math.sin(a)*18*s,3*s,2*s,SK,.9*A,0);
        }
        return;
      }
      /* --- 樱色战斧：单刃弧斧（明显区别于方头战锤） --- */
      if(L==="sakuraAxe"){
        const len=44,w=tipAt(len);
        r.seg(handX-Math.cos(ang)*9*s,handY-Math.sin(ang)*9*s,
              w.x,w.y,4.2*s,C.wood,A,F);
        r.ell(handX,handY,3.2*s,3.2*s,SP,A,F);
        /* 单侧斧刃：外弧 + 内侧直边 + 樱纹 */
        const a0=ang-.55,a1=ang+.62;
        r.tri(w.x,w.y,
              w.x+Math.cos(a0)*22*s,w.y+Math.sin(a0)*22*s,
              w.x+Math.cos(a1)*22*s,w.y+Math.sin(a1)*22*s,DD,.9*A,F);
        r.seg(w.x+Math.cos(a0)*22*s,w.y+Math.sin(a0)*22*s,
              w.x+Math.cos(a1)*22*s,w.y+Math.sin(a1)*22*s,3.2*s,DL,A,0);
        r.tri(w.x+Math.cos(a0)*19*s,w.y+Math.sin(a0)*19*s,
              w.x+Math.cos(a1)*19*s,w.y+Math.sin(a1)*19*s,
              w.x+Math.cos(ang)*26*s,w.y+Math.sin(ang)*26*s,SP,.72*A,F);
        r.ell(w.x,w.y,4*s,4*s,C.white,.9*A,0);
        r.glow(w.x,w.y,14*s,14*s,DL,1,.28*A);
        sakuraPetals(r,w.x,w.y,s,A,3,13,T);
        return;
      }
      /* --- 樱色战锤：方头重锤 + 配重块 --- */
      if(L==="sakuraHammer"){
        const len=38,w=tipAt(len);
        r.seg(handX-Math.cos(ang)*9*s,handY-Math.sin(ang)*9*s,
              w.x,w.y,5.4*s,DD,A,F);
        r.seg(handX-Math.cos(ang)*9*s,handY-Math.sin(ang)*9*s,
              handX,handY,6.2*s,C.wood,A,F);
        /* 横向矩形锤头（与斧的三角刃完全不同） */
        const ux=-Math.sin(ang),uy=Math.cos(ang);
        const hx=w.x-ux*15*s,hy2=w.y-uy*15*s;
        r.quad(hx,hy2-9*s,30*s,18*s,DL,.95*A,F);
        r.quad(hx,hy2-9*s,30*s,3*s,C.white,.75*A,0);
        r.quad(hx,hy2+6*s,30*s,3*s,DD,.9*A,0);
        r.ell(w.x,w.y,4.2*s,4.2*s,SP,A,F);
        /* 尾端配重 */
        r.ell(handX-Math.cos(ang)*9*s,handY-Math.sin(ang)*9*s,
              5.4*s,5.4*s,DD,A,F);
        r.ell(handX-Math.cos(ang)*9*s,handY-Math.sin(ang)*9*s,
              2.2*s,2.2*s,C.white,.9*A,0);
        r.glow(w.x,w.y,18*s,14*s,DL,1,.24*A);
        return;
      }
      /* --- 樱色巨盾：高塔盾（纵向脊线 + 铆钉），圆盾保持小圆盾 --- */
      if(L==="sakuraGreatShield"){
        const sx=px-face*20*s,sy=by-34*s*ht;
        r.trap(sx,sy-30*s,sy+34*s,17*s,22*s,DD,DL,A,F);
        r.trap(sx,sy-26*s,sy+26*s,12*s,17*s,DL,SP,.55*A,F);
        r.seg(sx,sy-27*s,sx,sy+30*s,2.2*s,C.white,.85*A,0);
        for(let k=0;k<5;k++){
          const yy=sy-21*s+k*12*s;
          r.ell(sx-8*s,yy,1.8*s,1.8*s,C.gold,.9*A,0,true);
          r.ell(sx+8*s,yy,1.8*s,1.8*s,C.gold,.9*A,0,true);
        }
        r.tri(sx,sy+34*s,sx-9*s,sy+24*s,sx+9*s,sy+24*s,DD,A,F);
        r.ell(sx,sy-4*s,5*s,5*s,SK,1*A,0);
        r.glow(sx,sy,30*s,42*s,DL,1,.18*A);
        return;
      }
      if(L==="sakuraRoundShield"){
        const sx=px-face*16*s,sy=by-27*s*ht;
        r.ell(sx,sy,12*s,15*s,DD,A,F);
        r.ell(sx,sy,9.5*s,12.5*s,DL,.9*A,F);
        r.ell(sx,sy,5*s,7*s,C.white,.9*A,0);
        r.ring(sx,sy,11*s,13*s,1.6*s,SP,.8*A,0,14);
        r.ell(sx,sy,2.5*s,3*s,SK,1*A,0);
        return;
      }
      /* --- 樱色长弓：弧形弓臂 + 弓弦 --- */
      if(L==="sakuraLongBow"){
        const bx=px+face*17*s,byy=by-32*s*ht;
        for(let i=0;i<7;i++){
          const a1=-1.25+i*2.5/7,a2=-1.25+(i+1)*2.5/7;
          r.seg(bx+Math.cos(a1)*8*s,byy+Math.sin(a1)*30*s,
                bx+Math.cos(a2)*8*s,byy+Math.sin(a2)*30*s,3.2*s,DL,A,F);
        }
        r.seg(bx+Math.cos(-1.25)*8*s,byy+Math.sin(-1.25)*30*s,
              bx+Math.cos(1.25)*8*s,byy+Math.sin(1.25)*30*s,1.3*s,C.white,.9*A,0);
        r.ell(bx,byy,4*s,4*s,SK,A,0);
        r.glow(bx,byy,16*s,30*s,DL,1,.28*A);
        return;
      }
      /* --- 樱色长矛：长杆 + 菱形枪尖 + 红缨（不再画成弓） --- */
      if(L==="sakuraSpear"){
        const back=tipAt(-26),front=tipAt(58);
        r.seg(back.x,back.y,front.x,front.y,3.4*s,C.wood,A,F);
        r.seg(back.x,back.y,front.x,front.y,1.2*s,DL,.55*A,0);
        const tx=front.x+Math.cos(ang)*13*s,ty=front.y+Math.sin(ang)*13*s;
        r.tri(front.x-Math.sin(ang)*6*s,front.y+Math.cos(ang)*6*s,
              tx,ty,
              front.x+Math.sin(ang)*6*s,front.y-Math.cos(ang)*6*s,DL,.96*A,F);
        r.seg(tx,ty,tx+Math.cos(ang)*9*s,ty+Math.sin(ang)*9*s,1.8*s,C.white,A,0);
        /* 红缨 */
        for(let k=0;k<4;k++){
          const a=ang+(k-1.5)*.22;
          r.seg(front.x,front.y,
                front.x+Math.cos(a)*14*s,front.y+Math.sin(a)*14*s,
                1.6*s,C.red,.85*A,0);
        }
        r.ell(front.x,front.y,3.4*s,3.4*s,SP,A,F);
        r.glow(tx,ty,10*s,10*s,DL,1,.28*A);
        return;
      }
      /* --- 樱色魔书：翻开的书页（悬浮） --- */
      if(L==="sakuraBook"){
        const bx=px+face*24*s,byy=by-38*s*ht;
        r.glow(bx,byy,28*s,22*s,DL,1,.26*A);
        r.trap(bx,byy-16*s,byy+14*s,15*s,26*s,DD,DL,.9*A,F);
        r.quad(bx-14*s,byy-13*s,13*s,24*s,C.white,.88*A,0);
        r.quad(bx+1*s,byy-13*s,13*s,24*s,C.white,.88*A,0);
        r.seg(bx,byy-14*s,bx,byy+13*s,2*s,SP,.9*A,0);
        for(let k=0;k<3;k++){
          const yy=byy-8*s+k*7*s;
          r.seg(bx-11*s,yy,bx-3*s,yy,1*s,DD,.7*A,0);
          r.seg(bx+3*s,yy,bx+11*s,yy,1*s,DD,.7*A,0);
        }
        r.ell(bx,byy-16*s,4*s,4*s,SK,.95*A,0);
        sakuraPetals(r,bx,byy,s,A,4,18,T*.7);
        return;
      }
      /* --- 樱色魔珠：悬浮光球（无杖杆） --- */
      if(L==="sakuraOrb"){
        const ox=px+face*26*s,oy=by-44*s*ht+Math.sin(T*2.2)*3*s;
        r.glow(ox,oy,24*s,24*s,DL,1,.42*A);
        r.ell(ox,oy,10*s,10*s,DD,.95*A,F,true);
        r.ell(ox,oy,7.6*s,7.6*s,DL,.92*A,0,true);
        r.ell(ox-3*s,oy-3*s,3*s,3*s,C.white,.95*A,0,true);
        r.ring(ox,oy,13*s,6*s,1.6*s,SP,.8*A,0,14);
        r.ring(ox,oy,16*s,3*s,1.2*s,SK,.55*A,0,12);
        sakuraPetals(r,ox,oy,s,A,4,16,T);
        return;
      }
      /* --- 樱色法戒：戴在手指上的发光指环 --- */
      if(L==="sakuraRing"){
        const rx=px+face*17*s,ry=by-27*s*ht;
        r.ring(rx,ry,6*s,4*s,1.6*s,DD,.98*A,0,12);
        r.ring(rx,ry,4.2*s,2.6*s,1*s,DL,.95*A,0,12);
        r.ell(rx+5*s,ry-4*s,3*s,3*s,C.white,.95*A,0);
        r.glow(rx,ry,15*s,15*s,DL,1,.4*A);
        for(let k=0;k<4;k++){
          const a=T*1.4+k*1.57;
          r.ell(rx+Math.cos(a)*10*s,ry+Math.sin(a)*9*s,1.6*s,1.6*s,SK,.8*A,0,true);
        }
        return;
      }
      /* --- 樱色权杖：双手长杖（明显长于魔棒） --- */
      if(L==="sakuraStaff"){
        const bot=tipAt(-22),top=tipAt(62);
        r.seg(bot.x,bot.y,top.x,top.y,4.4*s,DD,A,F);
        r.seg(bot.x,bot.y,top.x,top.y,1.6*s,SP,.55*A,0);
        r.ell(bot.x,bot.y,4*s,4*s,C.gold,.9*A,F);
        r.glow(top.x,top.y,20*s,20*s,DL,1,.55*A);
        r.ell(top.x,top.y,9*s,9*s,DL,.95*A,F,true);
        r.ell(top.x-2*s,top.y-3*s,3.6*s,3.6*s,C.white,.95*A,0,true);
        r.ring(top.x,top.y,14*s,7*s,2*s,SP,.8*A,0,14);
        r.tri(top.x-8*s,top.y-8*s,top.x,top.y-19*s,top.x+8*s,top.y-8*s,DD,.9*A,F);
        sakuraPetals(r,top.x,top.y,s,A,5,18,T);
        return;
      }
      /* --- 樱色魔棒：短杖（保持原有造型，略作区分） --- */
      if(L==="sakuraWand"){
        const tip=tipAt(27);
        r.seg(handX-Math.cos(ang)*6*s,handY-Math.sin(ang)*6*s,tip.x,tip.y,3*s,DD,A,F);
        r.glow(tip.x,tip.y,12*s,12*s,DL,1,.55*A);
        r.ell(tip.x,tip.y,5.2*s,5.2*s,DL,.92*A,0);
        r.ell(tip.x-1.5*s,tip.y-2*s,2*s,2*s,C.white,.95*A,0);
        r.ring(tip.x,tip.y,8*s,3.2*s,1.2*s,SP,.7*A,0,12);
        return;
      }
      /* --- 剑 / 匕首 / 巨剑 / 战剑：钻光剑身 --- */
      const long=/GreatSword/.test(L),len=long?54:(/Dagger/.test(L)?26:40),
        wid=long?7:3.6;
      const wx=handX+Math.cos(ang)*len*s,wy=handY+Math.sin(ang)*len*s;
      r.seg(handX,handY,wx,wy,wid*s,DL,A,F);
      r.seg(wx,wy,wx+Math.cos(ang)*9*s,wy+Math.sin(ang)*9*s,wid*.55*s,C.white,A,0);
      r.seg(handX-Math.sin(ang)*7*s,handY+Math.cos(ang)*7*s,
            handX+Math.sin(ang)*7*s,handY-Math.cos(ang)*7*s,3.4*s,SP,A,F);
      r.seg(handX-Math.cos(ang)*8*s,handY-Math.sin(ang)*8*s,handX,handY,3.6*s,DD,A,F);
      r.glow(wx,wy,9*s,9*s,DL,1,.3*A);
      return;
    }
    if(part==="head"){
      const yy=by-49*s*ht;
      if(L==="sakuraWreath"){
        r.ell(px,yy-8*s,14*s,4.5*s,DD,A,F);
        r.ring(px,yy-8*s,15*s,6*s,2*s,DL,.9*A,0,16);
        sakuraPetals(r,px,yy-9*s,s,A,7,13,T*.7);
        r.ell(px,yy-12*s,2.6*s,2.6*s,C.white,.95*A,0);
      }else{
        r.ell(px,yy-8*s,19*s,4.5*s,DL,.9*A,F);
        r.trap(px,yy-23*s,yy-9*s,15*s,18*s,SP,SK,.92*A,F);
        r.quad(px-15*s,yy-12*s,30*s,2.6*s,DL,.95*A,0);
        r.ell(px+face*6*s,yy-22*s,4.4*s,4.4*s,C.white,.9*A,0);
        sakuraPetals(r,px,yy-20*s,s,A,4,9,T*.8);
      }
      return;
    }
    if(part==="chest"){
      const yT=by-39*s*ht,yB=by-11*s*ht;
      if(L==="sakuraAmulet"){
        r.seg(px-11*s,yT+2*s,px,yT+13*s,1.6*s,DL,.9*A,0);
        r.seg(px+11*s,yT+2*s,px,yT+13*s,1.6*s,DL,.9*A,0);
        r.ell(px,yT+14*s,6*s,7*s,DD,A,F);
        r.ell(px,yT+14*s,4*s,5*s,DL,.95*A,0);
        r.ell(px-1*s,yT+12*s,1.6*s,1.6*s,C.white,1*A,0);
        r.glow(px,yT+14*s,13*s,13*s,DL,1,.4*A);
      }else{
        r.trap(px,yT,yB+8*s,27*s,34*s,SP,SK,.94*A,F);
        r.trap(px,yT,yB-2*s,25*s,22*s,DL,DD,.55*A,F);
        r.quad(px-13*s,yT+2*s,26*s,3*s,C.white,.8*A,0);
        r.ell(px,yT+10*s,4*s,4*s,DL,1*A,0);
        sakuraPetals(r,px,yT+9*s,s,A,5,11,T*.6);
      }
      return;
    }
    /* feet */
    const yy=by-2*s;
    if(L==="sakuraAnklet"){
      r.seg(px-10*s,yy-6*s,px+10*s,yy-6*s,2*s,DL,A,F);
      r.ell(px+face*6*s,yy-6*s,3*s,3*s,DL,1*A,0);
      sakuraPetals(r,px,yy-7*s,s,A,4,10,T);
    }else{
      r.quad(px-10*s,yy-9*s,9*s,10*s,SP,A,F);
      r.quad(px+2*s,yy-9*s,9*s,10*s,SP,A,F);
      r.quad(px-10*s,yy-3*s,21*s,2.6*s,DL,.95*A,0);
      r.tri(px+face*11*s,yy-7*s,px+face*19*s,yy-2*s,px+face*11*s,yy+1*s,SK,.8*A,0);
      r.ell(px,yy-6*s,2.4*s,2.4*s,C.white,.9*A,0);
    }
  }
  function eqWeapon(r,px,by,s,face,cls,it,alpha,flash,at,ht){
    /* 1.3.0 工具性武器占用双手槽：直接复用工具外观绘制 */
    if(it.tool){eqTool(r,px,by,s,face,it,alpha,flash,ht);return;}
    /* 1.4 dev1.2 所穿即所得：樱色钻装全部走专属外观 */
    if(it.q==="diamond"&&it.set==="sakura"){
      drawSakuraEquip(r,px,by,s,face,it,alpha,flash,at,ht,"weapon");return;
    }
    const L=(CFG.LOOK_ALIAS&&CFG.LOOK_ALIAS[it.look])||it.look,ang=(-.6+at*2.0)*face;
    const hx=px+face*14*s,hy=by-30*s*ht;
    const A=alpha,F=flash;
    if(it.tint){
      r.glow(hx,hy,30*s,30*s,it.tint,1,.30*A);
      r.ell(hx+face*4*s,hy-4*s,4*s,3*s,it.tint,.85*A,F);
      r.ell(hx-face*6*s,hy+6*s,2.6*s,2*s,C.sakura,.7*A,F);
    }
    if(L==="shield"){
      const sx=px-face*15*s,sy=by-27*s*ht;
      r.ell(sx,sy,10*s,13*s,C.ironDk,A,F);
      r.ell(sx,sy,7.5*s,10.5*s,C.iron,A,F);
      r.ell(sx,sy,3*s,5*s,C.gold,.85*A,0);
      r.quad(sx-7*s,sy-2*s,14*s,1.6*s,C.steel,.5*A,0);
      return;
    }
    if(L==="woodBow"||L==="ironBow"){
      const steel=L==="ironBow",bc=steel?C.iron:C.wood;
      const bx=px+face*17*s,byy=by-32*s*ht;
      for(let i=0;i<6;i++){
        const a1=-1.25+i*2.5/6,a2=-1.25+(i+1)*2.5/6;
        r.seg(bx+Math.cos(a1)*7*s,byy+Math.sin(a1)*30*s,
              bx+Math.cos(a2)*7*s,byy+Math.sin(a2)*30*s,
              steel?3.4*s:2.8*s,bc,A,F);
      }
      r.seg(bx+Math.cos(-1.25)*7*s,byy+Math.sin(-1.25)*30*s,
            bx+Math.cos(1.25)*7*s,byy+Math.sin(1.25)*30*s,1.1*s,C.white,.8*A,0);
      r.seg(bx-face*11*s,byy,bx+face*25*s,byy,1.7*s,C.wood,A,F);
      r.tri(bx+face*25*s,byy-3*s,bx+face*33*s,byy,bx+face*25*s,byy+3*s,
            steel?C.steel:C.gold,A,F);
      if(steel)r.glow(bx,byy,12*s,28*s,C.steel,1,.18*A);
      return;
    }
    if(L==="crossbow"){
      const bx=px+face*18*s,byy=by-30*s*ht;
      r.seg(bx-face*16*s,byy,bx+face*20*s,byy,5*s,C.wood,A,F);
      r.seg(bx+face*4*s,byy-18*s,bx+face*4*s,byy+18*s,3*s,C.iron,A,F);
      r.seg(bx+face*4*s,byy-18*s,bx-face*14*s,byy-6*s,1.2*s,C.white,.8*A,0);
      r.seg(bx+face*4*s,byy+18*s,bx-face*14*s,byy+6*s,1.2*s,C.white,.8*A,0);
      r.quad(bx+face*14*s,byy-3*s,12*s,6*s,C.steel,A,F);
      return;
    }
    if(L==="gun"){
      const bx=px+face*16*s,byy=by-32*s*ht;
      r.seg(bx-face*8*s,byy,bx+face*26*s,byy,6*s,C.ironDk,A,F);
      r.seg(bx+face*24*s,byy-2*s,bx+face*34*s,byy-2*s,3*s,C.steel,A,F);
      r.seg(bx,byy,bx-face*4*s,byy+14*s,5*s,C.wood,A,F);
      r.glow(bx+face*34*s,byy-2*s,9*s,9*s,C.fire,1,.6*A);
      r.ell(bx+face*34*s,byy-2*s,2.5*s,2.5*s,C.fire2,A,0);
      return;
    }
    if(L==="sword"||L==="dagger"||L==="greatsword"){
      const len=L==="dagger"?24:(L==="greatsword"?52:38);
      const wid=L==="greatsword"?7:3.2;
      const wx=hx+Math.cos(ang)*len*s,wy=hy+Math.sin(ang)*len*s;
      r.seg(hx,hy,wx,wy,wid*s,C.steel,A,F);
      r.seg(wx,wy,wx+Math.cos(ang)*8*s,wy+Math.sin(ang)*8*s,wid*.55*s,C.white,A,0);
      r.seg(hx-Math.sin(ang)*6*s,hy+Math.cos(ang)*6*s,
            hx+Math.sin(ang)*6*s,hy-Math.cos(ang)*6*s,3*s,C.gold,A,F);
      r.seg(hx-Math.cos(ang)*7*s,hy-Math.sin(ang)*7*s,hx,hy,3.4*s,C.wood,A,F);
      if(L==="greatsword")r.glow(wx,wy,9*s,9*s,C.steel,1,.22*A);
      return;
    }
    if(L==="axe"){
      const wx=hx+Math.cos(ang)*44*s,wy=hy+Math.sin(ang)*44*s;
      r.seg(hx-Math.cos(ang)*8*s,hy-Math.sin(ang)*8*s,wx,wy,4*s,C.wood,A,F);
      r.tri(wx,wy-16*s,wx+face*20*s,wy-10*s,wx+face*20*s,wy+12*s,C.iron,A,F);
      r.tri(wx,wy-16*s,wx-face*7*s,wy-10*s,wx-face*7*s,wy+12*s,C.ironDk,A,F);
      r.seg(wx+face*20*s,wy-10*s,wx+face*20*s,wy+12*s,2*s,C.white,.8*A,0);
      return;
    }
    if(L==="staff"){
      const tx=px+face*23*s,ty=by-40*s*ht;
      r.seg(px+face*13*s,by-18*s*ht,tx,ty,3.6*s,C.wood,A,F);
      r.glow(tx,ty-4*s,11*s,11*s,C.cyan,1,.6*A);
      r.ell(tx,ty-4*s,5*s,5*s,C.cyan,A,0);
      r.ell(tx-1.5*s,ty-5.5*s,2*s,2*s,C.white,A,0);
      r.ring(tx,ty-4*s,9*s,4*s,1*s,C.violet,.45*A,0,12);
      return;
    }
    if(L==="book"){
      const bx=px+face*20*s,byy=by-33*s*ht;
      r.quad(bx-10*s,byy-8*s,20*s,16*s,C.purpleDk,A,F);
      r.quad(bx-9*s,byy-7*s,8.5*s,14*s,C.star,A,0);
      r.quad(bx+.5*s,byy-7*s,8.5*s,14*s,C.star,A,0);
      r.seg(bx,byy-7*s,bx,byy+7*s,1.4*s,C.gold,A,0);
      r.glow(bx,byy,12*s,10*s,C.violet,1,.35*A);
      r.ell(bx+face*9*s,byy-10*s,2.2*s,2.2*s,C.fire2,A,0);
      return;
    }
    if(L==="orb"){
      const bx=px+face*23*s,byy=by-34*s*ht;
      r.glow(bx,byy,13*s,13*s,C.violet,1,.7*A);
      r.ell(bx,byy,7*s,7*s,C.purple,A,0);
      r.ell(bx-2*s,byy-2*s,3*s,3*s,C.white,.8*A,0);
      for(let i=0;i<3;i++){
        const a=CR.game.time*2+i*2.1;
        r.ell(bx+Math.cos(a)*11*s,byy+Math.sin(a)*8*s,1.8*s,1.8*s,C.star,.7*A,0);
      }
      return;
    }
    if(L==="fan"){
      const fx=px+face*22*s,fy=by-33*s*ht;
      for(let i=0;i<7;i++){
        const a=-1.15+i*.38;
        r.seg(fx,fy,fx+Math.cos(a)*22*s,fy+Math.sin(a)*22*s,1.3*s,C.pink,A,F);
      }
      r.seg(fx,fy,fx+Math.cos(-1.15)*22*s,fy+Math.sin(-1.15)*22*s,2*s,C.ghostViolet,A,F);
      r.seg(fx,fy,fx+Math.cos(1.13)*22*s,fy+Math.sin(1.13)*22*s,2*s,C.ghostViolet,A,F);
      for(let i=0;i<4;i++){
        const a=-.9+i*.55;
        r.ell(fx+Math.cos(a)*17*s,fy+Math.sin(a)*17*s,2.4*s,1.8*s,C.sakura,.85*A,0);
      }
      r.glow(fx,fy,18*s,18*s,C.sakura,1,.30*A);
      return;
    }
  }
  function eqHead(r,px,by,s,face,it,alpha,flash,ht){
    /* 1.4 dev1.2 所穿即所得：樱色钻装全部走专属外观 */
    if(it.q==="diamond"&&it.set==="sakura"){
      drawSakuraEquip(r,px,by,s,face,it,alpha,flash,0,ht,"head");return;
    }
    /* 1.4 dev1 樱花套件柔光 */
    if(it&&it.tint)r.glow(px,by-24*s,26*s,30*s,it.tint,1,.20*(alpha||1));
    const L=(CFG.LOOK_ALIAS&&CFG.LOOK_ALIAS[it.look])||it.look,hy=by-49*s*ht,A=alpha,F=flash;
    if(L==="blueHat"){
      r.ell(px,hy-9*s,17*s,4*s,C.clothBlueDk,A,F);
      r.trap(px,hy-20*s,hy-9*s,16*s,20*s,C.clothBlue,C.clothBlueDk,A,F);
      r.quad(px-10*s,hy-11*s,20*s,2.2*s,C.white,.35*A,0);
    }else if(L==="leafCirclet"){
      r.ell(px,hy-8*s,12*s,4*s,C.leaf2,A,F);
      for(let i=0;i<3;i++){
        const a=-1.1+i*.9;
        r.tri(px+Math.cos(a)*7*s,hy-9*s,px+Math.cos(a)*15*s,hy-20*s,
              px+Math.cos(a)*11*s,hy-6*s,C.leaf3,A,F);
      }
    }else if(L==="ironHelm"){
      r.ell(px,hy-7*s,12*s,8*s,C.iron,A,F);
      r.trap(px,hy-19*s,hy-8*s,20*s,22*s,C.iron,C.ironDk,A,F);
      r.quad(px-2*s,hy-12*s,4*s,12*s,C.ironDk,A,F);
      r.quad(px-11*s,hy-11*s,22*s,2*s,C.gold,.8*A,0);
      r.tri(px,hy-19*s,px+face*4*s,hy-30*s,px+face*8*s,hy-17*s,C.red,A,F);
    }else if(L==="starCrown"){
      r.ell(px,hy-8*s,13*s,4*s,C.gold,A,F);
      for(let i=-1;i<=1;i++)
        r.tri(px+i*8*s-3*s,hy-9*s,px+i*8*s,hy-22*s,px+i*8*s+3*s,hy-9*s,C.gold,A,F);
      r.glow(px,hy-20*s,9*s,9*s,C.star,1,.55*A);
      r.ell(px,hy-20*s,3*s,3*s,C.white,A,0);
    }else if(L==="rangerHood"){
      r.tri(px-face*13*s,hy+7*s,px+face*13*s,hy+7*s,px+face*2*s,hy-22*s,C.greenDk,A,F);
      r.ell(px,hy-4*s,11*s,10*s,C.skin,A,F);
      r.tri(px-face*12*s,hy-9*s,px+face*12*s,hy-9*s,px+face*3*s,hy-24*s,C.green,A,F);
      r.ell(px,hy-3*s,11*s,4*s,C.greenDk,A,F);
    }
  }
  function eqChest(r,px,by,s,face,it,alpha,flash,ht){
    /* 1.4 dev1.2 所穿即所得：樱色钻装全部走专属外观 */
    if(it.q==="diamond"&&it.set==="sakura"){
      drawSakuraEquip(r,px,by,s,face,it,alpha,flash,0,ht,"chest");return;
    }
    /* 1.4 dev1 樱花套件柔光 */
    if(it&&it.tint)r.glow(px,by-24*s,26*s,30*s,it.tint,1,.20*(alpha||1));
    const L=(CFG.LOOK_ALIAS&&CFG.LOOK_ALIAS[it.look])||it.look,yT=by-39*s*ht,yB=by-11*s*ht,A=alpha,F=flash;
    if(L==="leatherVest"){
      r.trap(px,yT,yB,26*s,23*s,C.leather,U.shade(C.leather,.65),A,F);
      r.seg(px-8*s,yT+3*s,px+8*s,yB-3*s,2*s,C.brown,A,0);
    }else if(L==="ironLightArmor"){
      r.trap(px,yT,yB,29*s,24*s,C.iron,C.ironDk,A,F);
      for(let i=0;i<3;i++)r.quad(px-12*s,yT+5*s+i*7*s,24*s,1.8*s,C.steel,.5*A,0);
      r.quad(px-13*s,yT,26*s,3*s,C.gold,.75*A,0);
      r.ell(px,yT+10*s,4*s,4*s,C.steel,A,0);
    }else if(L==="windCloak"){
      const sw=Math.sin(CR.game.time*2.2)*3*s;
      r.trap(px-face*7*s,yT,yB+6*s,27*s,34*s,C.cloth2,C.clothBlueDk,.9*A,F);
      r.tri(px-face*13*s,yB+4*s,px-face*30*s+sw,yB+18*s,px-face*5*s,yB+6*s,C.cloth2,.8*A,F);
      r.seg(px-face*10*s,yT+4*s,px+face*10*s,yT+4*s,3*s,C.gold,A,0);
    }else if(L==="starRobe"){
      r.trap(px,yT,yB+8*s,27*s,36*s,C.purple,C.purpleDk,A,F);
      for(let i=0;i<4;i++){
        const a=CR.game.time*.5+i*1.6;
        r.ell(px+Math.cos(a)*9*s,yT+10*s+Math.sin(a)*9*s,1.6*s,1.6*s,C.star,.8*A,0);
      }
      r.quad(px-13*s,yT+2*s,26*s,2.5*s,C.gold,.7*A,0);
    }else if(L==="blackPlate"){
      r.trap(px,yT-2*s,yB,34*s,28*s,C.ironDk,U.shade(C.ironDk,.6),A,F);
      r.ell(px-15*s,yT+3*s,8*s,7*s,C.iron,A,F);
      r.ell(px+15*s,yT+3*s,8*s,7*s,C.iron,A,F);
      for(let i=0;i<3;i++)r.quad(px-11*s,yT+6*s+i*8*s,22*s,2*s,C.steel,.45*A,0);
      r.quad(px-4*s,yT+4*s,8*s,8*s,C.gold,.85*A,0);
    }
  }
  function eqFeet(r,px,by,s,face,it,alpha,flash){
    /* 1.4 dev1.2 所穿即所得：樱色钻装全部走专属外观 */
    if(it.q==="diamond"&&it.set==="sakura"){
      drawSakuraEquip(r,px,by,s,face,it,alpha,flash,0,1,"feet");return;
    }
    /* 1.4 dev1 樱花套件柔光 */
    if(it&&it.tint)r.glow(px,by-24*s,26*s,30*s,it.tint,1,.20*(alpha||1));
    const L=(CFG.LOOK_ALIAS&&CFG.LOOK_ALIAS[it.look])||it.look,yy=by-2*s,A=alpha,F=flash;
    if(L==="sandals"){
      r.quad(px-9*s,yy-3*s,8*s,4*s,C.brown,A,F);
      r.quad(px+2*s,yy-3*s,8*s,4*s,C.brown,A,F);
    }else if(L==="swiftBoots"){
      r.quad(px-10*s,yy-9*s,9*s,10*s,C.clothBlueDk,A,F);
      r.quad(px+2*s,yy-9*s,9*s,10*s,C.clothBlueDk,A,F);
      r.quad(px-10*s,yy-2*s,20*s,2*s,C.cyan,.7*A,0);
      r.tri(px+face*11*s,yy-6*s,px+face*18*s,yy-2*s,px+face*11*s,yy+1*s,C.cyan,.6*A,0);
    }else if(L==="featherAnklet"){
      r.seg(px-10*s,yy-6*s,px+10*s,yy-6*s,1.6*s,C.gold,A,F);
      r.ell(px+face*6*s,yy-6*s,2.6*s,2.6*s,C.cyan,A,0);
      r.ell(px-face*4*s,yy-7*s,2*s,2*s,C.sakura,A,0);
      r.tri(px+face*10*s,yy-7*s,px+face*17*s,yy-16*s,px+face*12*s,yy-3*s,C.white,.9*A,0);
      r.glow(px+face*8*s,yy-8*s,7*s,7*s,C.cyan,1,.25*A);
    }
  }
  function eqTool(r,px,by,s,face,it,alpha,flash,ht){
    const L=(CFG.LOOK_ALIAS&&CFG.LOOK_ALIAS[it.look])||it.look,A=alpha,F=flash;
    const tx=px-face*17*s,ty=by-26*s*ht;
    if(L==="gloves"){
      r.ell(px+face*15*s,by-28*s*ht,5*s,5*s,C.green,A,F);
      r.ell(px-face*15*s,by-28*s*ht,5*s,5*s,C.green,A,F);
      r.glow(px+face*15*s,by-28*s*ht,6*s,6*s,C.green,1,.25*A);
    }else if(L==="pick"){
      r.seg(tx-8*s,ty+14*s,tx+8*s,ty-12*s,2.6*s,C.wood,A,F);
      r.seg(tx+2*s,ty-14*s,tx+14*s,ty-18*s,3.2*s,C.iron,A,F);
      r.tri(tx+14*s,ty-18*s,tx+18*s,ty-23*s,tx+11*s,ty-14*s,C.steel,A,F);
    }else if(L==="handaxe"){
      r.seg(tx-6*s,ty+14*s,tx+6*s,ty-12*s,2.6*s,C.wood,A,F);
      r.tri(tx+5*s,ty-14*s,tx+16*s,ty-18*s,tx+14*s,ty-2*s,C.iron,A,F);
      r.seg(tx+16*s,ty-18*s,tx+16*s,ty-2*s,1.6*s,C.white,.7*A,0);
    }else if(L==="rod"){
      /* 1.4 dev1.3 钓鱼竿专属建模：长竿 + 鱼线 + 浮标 + 水面光点 */
      const gx=px+face*31*s,gy=by-72*s*ht;
      r.seg(px+face*9*s,by-16*s*ht,gx,gy,2.6*s,C.wood,A,F);
      r.seg(px+face*9*s,by-16*s*ht,px+face*13*s,by-24*s*ht,4*s,C.brown,A,F);
      r.ell(gx,gy,3*s,3*s,C.gold,A,F);
      r.seg(gx,gy,gx+face*6*s+Math.sin(CR.game.time*2)*3*s,by+2*s,1*s,C.white,.75*A,0);
      const fx=gx+face*6*s+Math.sin(CR.game.time*2)*3*s;
      r.ell(fx,by+2*s,3.6*s,2.2*s,C.red,.95*A,0,true);
      r.ell(fx,by-1*s,1.6*s,1*s,C.white,.9*A,0,true);
      r.ell(fx,by+4*s,9*s,2*s,C.foam,.35*A,0,true);
    }else if(L==="sickle"){
      /* 1.4 dev1.4 镰刀专属建模：木柄 + 弯刃 + 刃口高光 */
      const gx=px+face*15*s,gy=by-26*s*ht;
      r.seg(px+face*6*s,by-8*s*ht,gx,gy-22*s,3.2*s,C.wood,A,F);
      r.ell(gx,gy-22*s,3*s,3*s,C.iron,A,F);
      /* 弯刃：从柄头向外画弧，末端回收 */
      let lastX=gx,lastY=gy-22*s;
      for(let k=1;k<=7;k++){
        const a=-.95+k*.36;
        const nx=gx+Math.cos(a)*30*s,ny=gy-22*s+Math.sin(a)*26*s;
        r.seg(lastX,lastY,nx,ny,(5.2-k*.35)*s,C.steel,A,F);
        lastX=nx;lastY=ny;
      }
      r.seg(gx,gy-22*s,lastX,lastY,1.6*s,C.white,.8*A,0);
      r.tri(lastX-5*s,lastY-4*s,lastX+face*11*s,lastY-2*s,lastX+4*s,lastY+5*s,
        C.iron,.9*A,F);
      r.ell(gx,gy-22*s,2.4*s,2.4*s,C.gold,.9*A,0);
      r.glow(lastX,lastY,9*s,9*s,C.steel,1,.2*A);
    }else if(L==="saw"){
      r.seg(tx-16*s,ty+8*s,tx+16*s,ty-6*s,3.2*s,C.steel,A,F);
      for(let i=0;i<9;i++){
        const u=-15+i*3.6;
        r.tri(tx+u*s,ty+6*s-i*.6*s,tx+(u+1.4)*s,ty+3.2*s-i*.6*s,
              tx+(u+2.8)*s,ty+6.4*s-i*.6*s,C.white,.8*A,0);
      }
      r.seg(tx-16*s,ty+8*s,tx-18*s,ty+20*s,2.6*s,C.wood,A,F);
      r.seg(tx+16*s,ty-6*s,tx+19*s,ty+7*s,2.6*s,C.wood,A,F);
    }else if(L==="moonSickle"){
      /* 1.4 dev2 月牙镰：长杆 + 樱色月牙弯刃（紫装双手矛系工具） */
      const gx=px+face*13*s,gy=by-22*s*ht;
      r.seg(px-face*10*s,by+12*s*ht,gx,gy-62*s,3.4*s,C.wood,A,F);
      r.ell(gx,gy-62*s,3.4*s,3.4*s,C.gold,A,F);
      let lx=gx+face*4*s,ly=gy-66*s;
      for(let k=1;k<=9;k++){
        const a=-1.25+k*.28;
        const nx=gx+face*(6+Math.cos(a)*34)*s,ny=gy-66*s+Math.sin(a)*30*s;
        r.seg(lx,ly,nx,ny,(4.4-k*.22)*s,C.steel,A,F);
        r.seg(lx,ly-face*1.4*s,nx,ny-face*1.4*s,1.1*s,C.sakura,.75*A,0);
        lx=nx;ly=ny;
      }
      r.tri(lx,ly,lx+face*12*s,ly-6*s,lx+face*3*s,ly+8*s,C.steel,.9*A,F);
      r.glow(gx,gy-58*s,20*s,20*s,C.sakura,1,.22*A);
      r.ell(gx-face*3*s,gy-40*s,2*s,2*s,C.sakura,.8*A,0);
    }else if(L==="fishSpear"){
      /* 小鱼叉 / 长杆鱼叉：长杆 + 三叉尖 + 倒钩 */
      const gx=px+face*20*s,gy=by-18*s*ht;
      r.seg(px-face*12*s,by+10*s*ht,gx,gy-64*s,2.8*s,C.wood,A,F);
      for(let k=-1;k<=1;k++){
        r.seg(gx,gy-58*s,gx+face*(8+k*7)*s,gy-80*s,2*s,C.iron,A,F);
        r.tri(gx+face*(8+k*7)*s,gy-80*s,gx+face*(13+k*7)*s,gy-84*s,
          gx+face*(9+k*7)*s,gy-72*s,C.steel,.9*A,F);
      }
      r.seg(gx-face*3*s,gy-54*s,gx+face*3*s,gy-54*s,2*s,C.gold,A,F);
    }else if(L==="hoe"){
      /* 锄头：木柄 + 横向铁刃 */
      const gx=px+face*14*s,gy=by-20*s*ht;
      r.seg(px-face*10*s,by+12*s*ht,gx,gy-56*s,3.2*s,C.wood,A,F);
      r.quad(gx-face*5*s,gy-58*s,26*s,6*s,C.iron,A,F);
      r.tri(gx+face*20*s,gy-58*s,gx+face*27*s,gy-66*s,
        gx+face*21*s,gy-50*s,C.steel,.9*A,F);
      r.ell(gx,gy-56*s,2.6*s,2.6*s,C.gold,A,F);
    }
  }
  function drawShadow(px,py,s,w,h){
    const r=R();
    const a=.28*(1-Math.min(1,h/170));
    r.ell(px,py,19*s*w,6*s,C.shadow,a,0);
    r.ell(px-17*s,py+2*s,27*s*w,4.5*s,C.shadow,a*.38,0); // 日照长投影
  }
  function drawBar(px,y,w,s,col,ratio,hostile){
    const r=R(),bw=38*s*Math.max(.8,w),bh=3.6*s;
    r.quad(px-bw/2-1*s,y-1*s,bw+2*s,bh+2*s,C.black,.75,0);
    r.quad(px-bw/2,y,bw,bh,C.hpbg,.9,0);
    r.quad(px-bw/2,y,bw*U.clamp(ratio,0,1),bh,col,1,0);
    if(hostile===false){
      // 中立怪：蓝色血条 + 淡蓝外框
      r.ring(px,y+bh/2,bw*.56,bh*.72,1*s,C.hpBlue,.45,0,12);
    }
  }
  function drawNeutral(e,s,px,py,alpha,flash){
    const r=R(),main=e.cfg.main,dk=e.cfg.dark;
    const bob=Math.sin(e.anim)*2.2*s;
    const cy=py-20*s-bob;
    r.ell(px,cy,20*s*e.w,17*s*e.ht,dk,alpha,flash);
    r.ell(px,cy-3*s,20*s*e.w,16*s*e.ht,main,alpha,flash);
    r.ell(px-7*s,cy-9*s,7*s,4*s,C.white,.35*alpha,0);
    // 眼睛
    r.ell(px-7*s,cy-2*s,3.6*s,4*s,C.white,alpha,0);
    r.ell(px+7*s,cy-2*s,3.6*s,4*s,C.white,alpha,0);
    r.ell(px-7*s+e.facing*.8*s,cy-2*s,1.9*s,2.4*s,C.black,alpha,0);
    r.ell(px+7*s+e.facing*.8*s,cy-2*s,1.9*s,2.4*s,C.black,alpha,0);
    // 头顶叶片
    r.tri(px-3*s,cy-16*s,px-13*s,cy-30*s,px+2*s,cy-20*s,C.leaf3,alpha,flash);
    r.tri(px+3*s,cy-16*s,px+12*s,cy-27*s,px-1*s,cy-20*s,C.leaf1,alpha,flash);
    r.ell(px,cy+14*s,13*s,4*s,C.cyan,.20*alpha,0);
    if(e.hostile){
      r.ring(px,cy,26*s,24*s,2*s,C.red,.55*(.6+.4*Math.sin(CR.game.time*14)),0,16);
    }
  }
  /* 1.4 dev1.1 sp1「樱花环绕」：穿戴任意 4 件樱花套件时的纯视觉特性。
     5 片小花瓣绕身缓慢旋转，alpha 压到 .42，不遮挡角色本体也不参与战力。 */
  function drawPetalAura(r,px,py,s,o){
    const t=CR.game.time;
    const colA=C.sakura||[1,.78,.88],colB=C.pink||[1,.63,.80];
    for(let i=0;i<5;i++){
      const a=t*.82+i*U.TAU/5;
      const rad=(25+Math.sin(t*1.5+i)*4)*s;
      const cx=px+Math.cos(a)*rad;
      const cy=py-33*s+Math.sin(a)*rad*.42+Math.sin(t*1.25+i*1.7)*3*s;
      const w=(3.0+Math.sin(t*2.1+i)*.55)*s,h=w*1.75;
      r.poly([[cx,cy-h],[cx+w*.62,cy],[cx,cy+h],[cx-w*.62,cy]],
        i%2?colA:colB,.42,0);
    }
  }
  /* ================= 1.4 dev1.3 局内护盾条 =================
     玩家 / 怪物头顶、血条下方一点；条长与血条一致（与护盾数值无关）；
     ⛨ 银灰普通 / 蓝法术 / 橙黄真实，按数值比例分段着色。 */
  function drawShieldBar(o,baseY,bw){
    const BC=CR.battlecore;if(!BC)return;
    const sh=BC.shieldsOf(o),total=(sh.normal||0)+(sh.magic||0)+(sh.true||0);
    if(total<=0)return;
    const r=R(),p=WLD.proj(o.x,o.depth,0),s=p.s;
    const y=(baseY===undefined?p.y-92*s*(o.ht||1):baseY)+7*s;
    const w=bw||40*s*(o.w||1);
    let x=p.x-w/2;
    const order=["normal","magic","true"],cols={};
    order.forEach(k=>{cols[k]=BC.SHIELDS[k].color;});
    for(const k of order){
      const v=sh[k]||0;if(v<=0)continue;
      const seg=w*v/total;
      r.quad(x,y,seg,3.4*s,cols[k],.95,0);
      r.quad(x,y,seg,1*s,C.white,.28,0);
      x+=seg;
    }
    /* 类型标识：取剩余量最大的一类颜色 */
    let main=order[0];order.forEach(k=>{if((sh[k]||0)>(sh[main]||0))main=k;});
    if(CR.render.drawText)
      CR.render.drawText("⛨",p.x-w/2-11*s,y+1.8*s,10*s,cols[main],.95);
    if(o.shieldExpire){
      const lefts=order.filter(k=>o.shieldExpire[k]).map(k=>o.shieldExpire[k]-Date.now()/1000);
      const left=lefts.length?Math.max(...lefts):BC.SHIELD_TTL;
      if(CR.render.drawText&&left>0)
        CR.render.drawText(Math.ceil(left)+"s",p.x+w/2+13*s,y+1.8*s,8*s,cols[main],.72);
    }
  }
  function drawHumanoid(o,isPlayer){
    const r=R(),p=pr(o.x,o.depth,o.h),px=p.x,py=p.y;
    if(px<-180*G.S||px>G.W+180*G.S)return;
    const cls=isPlayer?o.cls:-1;
    const cfg=isPlayer?CFG.CLASSES[cls]:o.cfg;
    const s=p.s*o.scale;
    const w=isPlayer?1:o.w,ht=isPlayer?1:o.ht;
    const flash=isPlayer?(o.hurtT>0?.65:0):(o.flash>0?.85:0);
    let alpha=isPlayer?(o.dead?.5:1):1;
    if(isPlayer&&o.inv>0&&Math.floor(CR.game.time*24)%2)alpha*=.6;
    if(o.frozen>0)alpha*=.9;
    const by=py-Math.sin(o.anim)*1.5*s;
    drawShadow(px,py,s,w,o.h);
    if(isPlayer&&o.petalAura)drawPetalAura(r,px,py,s,o);
    if(!isPlayer&&o.type==="neutral"){
      drawNeutral(o,s,px,py,alpha,flash);
      const y=by-62*s*ht;
      drawBar(px,y,w,s,C.hpBlue,o.hp/o.maxHp,o.hostile);
      if(o.frozen>0)drawFrozen(px,py-30*s,s,alpha);
      return;
    }
    const main=isPlayer?cfg.color:cfg.main,dk=isPlayer?cfg.dark:cfg.dark;
    const trim=isPlayer?cfg.trim:cfg.trim,acc=isPlayer?cfg.acc:cfg.acc;
    const face=o.facing;
    const L=Math.sin(o.anim)*3.6*s*(Math.abs(o.vx)>12?1:.14);
    // 腿
    r.seg(px-6*s*w+L,by-15*s*ht,px-6*s*w+L*.4,by,6*s*w,dk,alpha,flash);
    r.seg(px+6*s*w-L,by-15*s*ht,px+6*s*w-L*.4,by,6*s*w,dk,alpha,flash);
    // 躯干（胖体更宽）
    r.trap(px,by-38*s*ht,by-13*s*ht,25*s*w,21*s*w,main,dk,alpha,flash);
    r.quad(px-12*s*w,by-31*s*ht,24*s*w,4*s,trim,.85*alpha,flash);
    r.trap(px-face*5*s,by-37*s*ht,by-11*s*ht,9*s,16*s,dk,dk,.7*alpha,flash); // 披风
    // 头
    r.ell(px,by-49*s*ht,10*s*w,9.5*s,C.skin,alpha,flash);
    r.quad(px+face*2*s-1*s,by-50*s*ht,2.2*s,2.6*s,C.black,alpha,0);
    r.quad(px+face*6*s-1*s,by-50*s*ht,2.2*s,2.6*s,C.black,alpha,0);
    const eqv=isPlayer&&CR.equip?CR.equip.view(cls):null;
    const heavy=cls===0||(!isPlayer&&(o.type==="elite"||o.type==="miniboss"||o.type==="boss"));
    const at=isPlayer?Math.max(0,o.atkT/.22):Math.max(0,o.attack/.36);
    const defaultHead=!eqv||!eqv.head;
    /* --- 默认头饰（穿戴头部装备时让位给装备外观） --- */
    if(defaultHead&&heavy){
      r.ell(px,by-55*s*ht,11*s*w,7*s,trim,alpha,flash);
      r.tri(px-11*s,by-55*s*ht,px-18*s,by-67*s*ht,px-5*s,by-58*s*ht,trim,alpha,flash);
      r.tri(px+11*s,by-55*s*ht,px+18*s,by-67*s*ht,px+5*s,by-58*s*ht,trim,alpha,flash);
      r.quad(px-3*s,by-60*s*ht,6*s,8*s,acc,alpha,flash);
    }else if(defaultHead&&cls===1){
      r.tri(px-face*13*s,by-57*s*ht,px+face*13*s,by-57*s*ht,px+face*5*s,by-83*s*ht,main,alpha,flash);
      r.ell(px,by-57*s*ht,15*s,3.5*s,dk,alpha,flash);
      r.ell(px+face*5*s,by-83*s*ht,4*s,4*s,acc,alpha,flash);
    }else if(defaultHead&&cls===3){
      /* 夜樱：粉发 + 汉服发髻 + 樱瓣 */
      r.ell(px,by-50*s*ht,11*s,10*s,C.sakura,alpha,flash);
      r.ell(px-face*11*s,by-40*s*ht,4.2*s,15*s,C.sakura,alpha,flash);
      r.ell(px+face*11*s,by-40*s*ht,4.2*s,15*s,C.sakura,alpha,flash);
      r.ell(px,by-60*s*ht,6*s,5*s,C.ghostPink,alpha,flash);
      for(let i=0;i<5;i++){
        const a=CR.game.time*.8+i*1.25;
        r.ell(px+Math.cos(a)*14*s,by-60*s*ht+Math.sin(a)*6*s,
              2.4*s,1.7*s,C.sakura,.8*alpha,0);
      }
      r.ell(px+face*7*s,by-60*s*ht,3*s,3*s,C.white,.9*alpha,0);
    }else if(defaultHead){
      r.tri(px-face*12*s,by-56*s*ht,px+face*12*s,by-56*s*ht,px+face*3*s,by-73*s*ht,dk,alpha,flash);
      r.ell(px,by-54*s*ht,11*s,5*s,main,alpha,flash);
    }
    /* --- 武器：有装备就画装备，否则画职业默认武器 --- */
    if(eqv&&(eqv.two||eqv.main||eqv.off)){
      if(eqv.two)eqWeapon(r,px,by,s,face,cls,eqv.two,alpha,flash,at,ht);
      else{
        if(eqv.off)eqWeapon(r,px,by,s,face,cls,eqv.off,alpha,flash,at,ht);
        if(eqv.main)eqWeapon(r,px,by,s,face,cls,eqv.main,alpha,flash,at,ht);
      }
      if(cls===2)r.trap(px-face*9*s,by-40*s*ht,by-24*s*ht,6*s,8*s,C.gold,C.gold,.75*alpha,0);
    }else if(heavy){
      const shx=px+face*13*s,shy=by-30*s*ht;
      const ang=(-.6+at*2.0)*face;
      const wx=shx+Math.cos(ang)*36*s,wy=shy+Math.sin(ang)*36*s;
      r.seg(shx,shy,wx,wy,4*s,C.steel,alpha,flash);
      r.seg(wx,wy,wx+Math.cos(ang)*11*s,wy+Math.sin(ang)*11*s,2*s,C.white,alpha,flash);
      r.seg(shx-Math.sin(ang)*5*s,shy+Math.cos(ang)*5*s,
            shx+Math.sin(ang)*5*s,shy-Math.cos(ang)*5*s,3*s,acc,alpha,flash);
      r.ell(px-face*14*s,by-27*s*ht,9*s,12*s,trim,.9*alpha,flash);
      r.ell(px-face*14*s,by-27*s*ht,4*s,6*s,acc,.7*alpha,flash);
    }else if(cls===3){
      eqWeapon(r,px,by,s,face,cls,{look:"fan",tool:null},alpha,flash,at,ht);
    }else if(cls===1){
      const gx=px+face*23*s,gy=by-40*s*ht;
      r.seg(px+face*13*s,by-21*s*ht,gx,gy,3.4*s,C.wood,alpha,flash);
      r.glow(gx,gy,8*s,8*s,acc,1,.7*alpha);
      r.ell(gx,gy,4.5*s,4.5*s,acc,alpha,0);
    }else{
      const shx=px+face*14*s,shy=by-30*s*ht;
      for(let i=0;i<5;i++){
        const a1=-.9+i*.45,a2=-.9+(i+1)*.45;
        r.seg(shx+Math.cos(a1)*17*s,shy+Math.sin(a1)*17*s,
              shx+Math.cos(a2)*17*s,shy+Math.sin(a2)*17*s,2.6*s,C.wood,alpha,flash);
      }
      r.seg(shx+Math.cos(-.9)*17*s,shy+Math.sin(-.9)*17*s,
            shx+Math.cos(1.35)*17*s,shy+Math.sin(1.35)*17*s,1*s,C.white,.8*alpha,0);
      r.trap(px-face*9*s,by-40*s*ht,by-24*s*ht,6*s,8*s,C.gold,C.gold,.75*alpha,0);
    }
    /* --- 装备外观：甲 → 帽 → 足饰 → 工具（后绘制以正确遮挡） --- */
    if(eqv){
      if(eqv.chest)eqChest(r,px,by,s,face,eqv.chest,alpha,flash,ht);
      if(eqv.head) eqHead(r,px,by,s,face,eqv.head,alpha,flash,ht);
      if(eqv.feet) eqFeet(r,px,by,s,face,eqv.feet,alpha,flash);
    }
    // 阶级装饰
    if(!isPlayer&&(o.type==="elite"||o.type==="miniboss"||o.type==="boss")){
      r.quad(px-13*s,by-64*s*ht,26*s,5*s,acc,alpha,flash);
      for(let i=0;i<3;i++)
        r.tri(px-13*s+i*10*s,by-64*s*ht,px-9*s+i*10*s,by-75*s*ht,px-5*s+i*10*s,by-64*s*ht,acc,alpha,flash);
      r.seg(px-face*17*s,by-38*s*ht,px-face*17*s,by-104*s*ht,3*s,C.wood,alpha,flash);
      r.tri(px-face*17*s,by-104*s*ht,px-face*17*s-face*42*s,by-95*s*ht,
            px-face*17*s,by-86*s*ht,C.flag,alpha,flash);
      r.glow(px,by-30*s*ht,22*s,30*s,cfg.bar,1,.22*alpha);
    }
    /* 1.4 dev1.3 玩家护盾条：直接显示在角色头顶 */
    if(isPlayer)drawShieldBar(o,by-92*s*ht,40*s);
    // 技能 / 蓄力 / 增益光环
    if(isPlayer){
      if(o.skT>0){
        const k=1-o.skT/.45;
        r.ring(px,by-26*s,(28+k*95)*s,(13+k*42)*s,3*s,cfg.color,.5*(1-k),0,18);
      }
      if(o.buff.t>0){
        r.ring(px,by-26*s,34*s,15*s,2*s,C.gold,.28+.12*Math.sin(CR.game.time*5),0,18);
        r.glow(px,by-30*s,20*s,30*s,C.gold,1,.18);
      }
      if(o.chargeActive){
        const cr=CR.input.chargeRatio();
        r.ring(px,py,42*s,18*s,4*s,C.gold,.35+.5*cr,0,20);
        r.ring(px,py,(42+cr*28)*s,(18+cr*12)*s,2*s,C.white,.5*cr,0,20);
        r.glow(px,by-30*s,16*s,26*s,cr>=.72?C.gold:C.white,.6+cr,.3);
        for(let i=0;i<3;i++){
          const a=CR.game.time*4+i*2.1;
          r.ell(px+Math.cos(a)*40*s,by-30*s+Math.sin(a)*26*s,3*s,3*s,C.gold,.8,0);
        }
      }
    }
    // 血条
    if(!isPlayer){
      const show=o.hp<o.maxHp||o.barT>0||o.type==="neutral";
      if(show){
        const col=o.cfg.bar;
        drawBar(px,by-92*s*ht,o.w,s,col,o.hp/o.maxHp,o.hostile);
      }
      drawShieldBar(o,by-92*s*ht,40*s*o.w);
      if(!o.hostile){
        // 中立标识：头顶蓝色小点
        r.ell(px,by-100*s*ht,3.5*s,3.5*s,C.hpBlue,.85,0);
      }
      if(o.frozen>0)drawFrozen(px,py-30*s,s,alpha);
    }
  }
  function drawFrozen(px,py,s,a){
    const r=R();
    r.ell(px,py-18*s,20*s,30*s,C.ice,.16*a,0,true);
    r.ring(px,py,22*s,8*s,2*s,C.ice,.5*a,0,12);
    for(let i=0;i<4;i++){
      const ang=i*1.57+CR.game.time*.4;
      r.seg(px,py-20*s,px+Math.cos(ang)*16*s,py-20*s+Math.sin(ang)*22*s,2*s,C.cyan,.6*a,0);
    }
  }

  /* ================= 投射物 / 特效 ================= */
  function drawShot(s){
    const r=R(),p=pr(s.x,s.depth,s.h),x=p.x,y=p.y,sc=p.s;
    if(s.kind===9||s.kind===10)return;
    // 延时预警：地面圈
    if((s.kind===3||s.kind===4)&&s.delay>0){
      const g=pr(s.x,s.depth,0);
      const k=.25+.25*Math.sin(CR.game.time*18+s.x);
      const rad=(s.kind===4?s.r:30)*sc;
      r.ell(g.x,g.y,rad,rad*.4,C.fire,k*.28,0,true);
      r.ring(g.x,g.y,rad,rad*.4,2*sc,s.kind===4?C.fire:C.gold,k,0,20);
      if(s.kind===4)r.glow(x,y,18*sc,18*sc,C.fire,1,.7);
      return;
    }
    if(s.kind===1){ // 火球
      r.glow(x,y,17*sc*(s.r/13),15*sc*(s.r/13),C.fire,1,.85);
      r.ell(x,y,9*sc*(s.r/13),9*sc*(s.r/13),C.fire,1,0,true);
      r.ell(x,y,4.5*sc,4.5*sc,C.fire2,1,0);
    }else if(s.kind===2||s.kind===6){ // 箭 / 重箭
      const d=Math.sign(s.vx)||1,big=s.kind===6;
      const col=big?C.cyan:C.gold;
      if(big)r.glow(x,y,22*sc,10*sc,col,1,.6);
      r.seg(x-d*(big?26:16)*sc,y,x+10*sc,y,(big?4:2.6)*sc,C.wood,1,0);
      r.tri(x+10*sc,y-4*sc,x+(big?23:18)*sc,y,x+10*sc,y+4*sc,col,1,0);
      r.seg(x-d*16*sc,y-3*sc,x-d*10*sc,y,2*sc,C.white,.75,0);
    }else if(s.kind===3){ // 落箭
      r.seg(x,y-28*sc,x,y+8*sc,3*sc,C.wood,1,0);
      r.tri(x-4*sc,y+8*sc,x+4*sc,y+8*sc,x,y+18*sc,C.steel,1,0);
      r.glow(x,y+16*sc,8*sc,6*sc,C.gold,1,.35);
    }else if(s.kind===4){ // 陨石
      r.glow(x,y,28*sc,28*sc,C.fire,1,.9);
      r.ell(x,y,17*sc,19*sc,C.fire,1,0,true);
      r.ell(x-5*sc,y-6*sc,7*sc,7*sc,C.fire2,1,0);
      r.seg(x,y-18*sc,x-14*sc,y-44*sc,8*sc,C.fire,.35,0);
    }else if(s.kind===7){ // 敌方弹
      r.glow(x,y,13*sc,13*sc,C.red,1,.7);
      r.ell(x,y,7*sc,7*sc,C.red,1,0);
      r.ell(x-2*sc,y-2*sc,3*sc,3*sc,C.fire2,1,0);
    }
  }
  function drawPart(p){
    const r=R(),q=pr(p.x,p.depth,p.h),x=q.x,y=q.y,sc=q.s;
    const k=U.clamp(p.life/p.max,0,1),a=k*p.alpha;
    if(p.kind===1){ // 冲击环
      const rad=p.size*sc;
      r.ring(x,y,rad,rad*.42,3.2*sc,p.c,a*.85,0,20);
      r.ell(x,y,rad*.9,rad*.36,p.c,a*.10,0,true);
    }else if(p.kind===3){ // 光晕
      const rad=p.size*sc;
      r.glow(x,y,rad,rad*.7,p.c,a,1);
    }else if(p.kind===5){ // 斩击弧
      const rad=p.size*sc*(.72+(1-k)*.42);
      const f=p.vx>=0?1:-1;
      const a0=f>0?-.95:Math.PI+.95,a1=f>0?.95:Math.PI-.95;
      r.sector(x,y-26*sc,rad*.40,rad,a0,a1,p.c,a*.55,0,16);
      r.sector(x,y-26*sc,rad*.80,rad*.97,a0,a1,C.white,a*.55,0,16);
    }else{
      const sz=Math.max(1,p.size*sc*(.4+k*.8));
      r.quad(x-sz/2,y-sz/2,sz,sz,p.c,a,0);
    }
  }
  function drawBeam(b){
    const r=R(),k=U.clamp(b.life/b.max,0,1);
    let lx=0,ly=0;
    for(let i=0;i<b.n;i++){
      const p=pr(b.pts[i*3],b.pts[i*3+1],b.pts[i*3+2]);
      const jx=i===0?p.x:p.x+U.rr(-4,4)*G.S,jy=i===0?p.y:p.y+U.rr(-4,4)*G.S;
      if(i>0){
        r.seg(lx,ly,jx,jy,b.w*G.S*2,b.c,k*.20,0);
        r.seg(lx,ly,jx,jy,b.w*G.S,b.c,k*.75,0);
        r.seg(lx,ly,jx,jy,b.w*G.S*.35,C.white,k,0);
      }
      lx=jx;ly=jy;
    }
  }
  function drawGhost(g){
    const r=R(),p=pr(g.x,g.depth,g.h),k=U.clamp(g.life/g.max,0,1);
    const c=CFG.CLASSES[g.cls].color,s=p.s;
    r.ell(p.x,p.y-28*s,13*s,28*s,c,k*.22,0,true);
    r.ell(p.x,p.y-50*s,10*s,10*s,c,k*.20,0);
  }
  function drawDrop(d){
    const r=R(),p=pr(d.x,d.depth,d.h),x=p.x,sc=p.s;
    const g=pr(d.x,d.depth,0);
    const fl=Math.sin(CR.game.time*5+d.spin)*2.5*sc;
    const y=g.y-d.h*sc+fl-12*sc;
    r.ell(g.x,g.y,11*sc,4*sc,C.shadow,.22,0);
    r.ring(g.x,g.y,13*sc,5*sc,1.5*sc,C.white,.16,0,14);
    if(d.kind==="gold"){
      r.glow(x,y,10*sc,10*sc,C.gold,1,.45);
      r.ell(x,y,7*sc,7*sc,C.gold,1,0,true);
      r.ell(x-2*sc,y-2*sc,2.5*sc,2.5*sc,C.fire2,1,0);
    }else if(d.kind==="mat"){
      const m=CFG.MATERIALS[d.id]||CFG.MATERIALS.iron;
      r.glow(x,y,12*sc,12*sc,m.color,1,.35);
      r.tri(x,y-9*sc,x+8*sc,y,x,y+9*sc,m.color,1,0);
      r.tri(x,y-9*sc,x-8*sc,y,x,y+9*sc,U.shade(m.color,.7),1,0);
      r.tri(x,y-5*sc,x+4*sc,y,x,y+5*sc,C.white,.35,0);
    }else if(d.kind==="equip"){
      r.glow(x,y,15*sc,15*sc,C.gold,1,.45);
      r.tri(x,y-10*sc,x+9*sc,y-2*sc,x,y+10*sc,C.steel,1,0);
      r.tri(x,y-10*sc,x-9*sc,y-2*sc,x,y+10*sc,C.steelDk,1,0);
      r.quad(x-2*sc,y-6*sc,4*sc,12*sc,C.gold,.9,0);
    }else{
      const it=CFG.ITEMS[d.id]||CFG.ITEMS.potion;
      r.glow(x,y,13*sc,13*sc,it.color,1,.35);
      r.quad(x-7*sc,y-8*sc,14*sc,16*sc,it.color,1,0);
      r.quad(x-7*sc,y-8*sc,14*sc,3*sc,C.white,.5,0);
      r.quad(x-2*sc,y-4*sc,4*sc,8*sc,C.white,.75,0);
    }
  }

  /* ================= WebGL 七段数码漂字 ================= */
  const SEG={
    a:[.10,0,.80,.13],g:[.10,.44,.80,.12],d:[.10,.88,.80,.12],
    f:[0,.06,.13,.40],b:[.87,.06,.13,.40],e:[0,.54,.13,.40],c:[.87,.54,.13,.40]
  };
  const DIGIT={0:"abcdef",1:"bc",2:"abdeg",3:"abcdg",4:"bcfg",5:"acdfg",
    6:"acdefg",7:"abc",8:"abcdefg",9:"abcdfg"};
  function glyph(ch,x,y,w,h,col,a){
    const r=R();
    if(ch>="0"&&ch<="9"){
      const segs=DIGIT[+ch];
      for(let i=0;i<segs.length;i++){
        const s=SEG[segs[i]];
        r.quad(x+s[0]*w,y+s[1]*h,s[2]*w,s[3]*h,col,a,0);
      }
      return;
    }
    if(ch==="+"){
      r.quad(x+.10*w,y+.44*h,.80*w,.12*h,col,a,0);
      r.quad(x+.44*w,y+.16*h,.12*w,.68*h,col,a,0);
    }else if(ch==="-"){
      r.quad(x+.10*w,y+.44*h,.80*w,.12*h,col,a,0);
    }else if(ch==="!"){
      r.quad(x+.42*w,y+.04*h,.16*w,.62*h,col,a,0);
      r.quad(x+.42*w,y+.80*h,.16*w,.16*h,col,a,0);
    }else if(ch==="."){
      r.quad(x+.42*w,y+.82*h,.16*w,.16*h,col,a,0);
    }else if(ch===" "){ /* 空格 */ }
    else{ // 未知字符 → 菱形 / 星形
      r.tri(x,y+.08*h,x+.5*w,y,x+w,y+.08*h,col,a,0);
      r.tri(x,y+.08*h,x+.5*w,y+.5*h,x,y+.92*h,col,a,0);
      r.tri(x+w,y+.08*h,x+.5*w,y+.5*h,x+w,y+.92*h,col,a,0);
      r.tri(x,y+.92*h,x+.5*w,y+h,x+w,y+.92*h,col,a,0);
    }
  }
  function drawText(txt,cx,cy,size,col,a){
    const chw=size*.76,gap=size*.12;
    const total=txt.length*chw+(txt.length-1)*gap;
    let x=cx-total/2;
    for(let i=0;i<txt.length;i++){
      glyph(txt[i],x,cy,chw,size,col,a);
      x+=chw+gap;
    }
  }
  function drawFloat(f){
    const r=R(),p=pr(f.x,f.depth,f.h);
    const k=U.clamp(f.life/f.max,0,1);
    const a=k>.65?1:(k/.65);
    const size=(f.crit?21:15)*G.S*f.size;
    const wob=f.crit?Math.sin(CR.game.time*28)*1.6*G.S:0;
    const x=p.x+wob,y=p.y;
    let txt=String(f.val),col=f.c;
    if(f.kind==="gold"||f.kind==="heal"||f.kind==="item"||f.kind==="mat")txt="+"+txt;
    if(f.kind==="hurt")txt="-"+txt;
    if(f.kind==="crit")txt=txt+"!";
    if(f.kind==="levelup")txt="★"+txt;
    if(f.kind==="aggro"||f.kind==="switch")txt="!";
    // 描边
    drawText(txt,x+1.6*G.S,y+1.6*G.S,size,C.black,a*.75);
    drawText(txt,x,y,size,col,a);
    if(f.crit){
      r.glow(x,y-size*.5,size*1.5,size*.9,C.gold,1,a*.32);
    }
  }

  /* ================= 主绘制 ================= */
  function drawScene(){
    const r=R(),q=CFG.QUALITY[G.quality];
    drawSky();drawHills();drawGround();drawCastle();
    list.length=0;
    const vl=WLD.camX-190,vr=WLD.camX+G.W/G.S+190;
    if(q.props)for(let i=0;i<WLD.props.length;i++){
      const o=WLD.props[i];
      if(o.x>=vl&&o.x<=vr)list.push(o);
    }
    CR.ent.enemies.each(e=>list.push(e));
    CR.ent.drops.each(d=>list.push(d));
    list.push(P);
    list.sort(byDepth);
    CR.ent.ghosts.each(drawGhost);
    for(let i=0;i<list.length;i++){
      const o=list[i];
      if(o._t==="player"||o._t==="enemy")drawHumanoid(o,o._t==="player");
      else if(o._t==="drop")drawDrop(o);
      else drawProp(o);
    }
    // 叠加层：光束 / 投射物 / 粒子 / 漂字
    CR.ent.beams.each(drawBeam);
    CR.ent.shots.each(drawShot);
    CR.ent.parts.each(drawPart);
    CR.ent.floats.each(drawFloat);
    // 玩家脚下能量圈（技能就绪提示）
    if(!P.dead){
      const p=pr(P.x,P.depth,0);
      const ready=P.cd.every(c=>c<=0)&&P.energy>=30;
      if(ready)r.ring(p.x,p.y,26*p.s,10*p.s,1.6*p.s,C.gold,.14+.08*Math.sin(CR.game.time*3),0,16);
    }
    drawWorldLabels();
  }
  /* 1.2.0 黄昏城堡：常驻区域情报标签 + 怪物 / BOSS 悬浮说明 */
  function drawWorldLabels(){
    if(CR.game&&CR.game.state==="menu"){CR.ui.setWorldLabels([]);return;}
    const out=[],R=CFG.REGION_INFO.dusk;
    out.push({text:"🏰 黄昏城堡 · 区域情报",sx:G.W*.5,sy:G.H*.135,cls:"region",
      tip:{title:R.icon+" "+R.name,kind:"区域情报",
        lines:[R.desc,"野怪 "+R.mobs.length+" 种 · BOSS "+R.bosses.length+" · 区域 "+R.nodes.length+" 段",
          "按 G 打开完整情报卡；通关后仍是开放世界，可继续探索"]}});
    const add=(text,x,d,h,cls,tip)=>{
      const p=pr(x,d,h);
      if(p.x<-140||p.x>G.W+140)return;
      out.push({text,sx:p.x,sy:p.y,cls,tip});
    };
    const boss=WLD.bossRef;
    if(boss&&boss.alive)add("☠ 黑石城主",boss.x,boss.depth,150,"boss",
      {title:"☠ 黑石城主",kind:"BOSS · 最终波",
        lines:["黄昏城堡最终 BOSS，击败后不再弹结算，只点亮大地图",
          "生命 "+Math.ceil(boss.hp)+" / "+boss.maxHp]});
    CR.ent.enemies.each(e=>{
      if(!e.alive||Math.abs(P.x-e.x)>380)return;
      if(e.cfg&&e.cfg.ai==="neutral")
        add("· 中立·草灵（蓝血条）",e.x,e.depth,96,"halfneutral",
          {title:"中立·草灵",kind:"中立野怪",
            lines:["蓝色血条，被攻击后才会反击","生命 "+Math.ceil(e.hp)+" / "+e.maxHp]});
      else if(e.cfg&&(e.type==="elite"||e.type==="miniboss"))
        add("⚔ "+e.cfg.label,e.x,e.depth,104,"hostile",
          {title:e.cfg.label,kind:"战役敌人",
            lines:["生命 "+Math.ceil(e.hp)+" / "+e.maxHp,"击败后可继续沿路推进"]});
    });
    CR.ui.setWorldLabels(out);
  }
  CR.render={drawShieldBar,drawScene,drawText,drawFloat,drawHumanoid,drawShadow,
    drawPart,drawShot,drawBeam,drawGhost,drawDrop,pr};
})(window.CR=window.CR||{});
