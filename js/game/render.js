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
    r.quadG(0,hy,W,H-hy,T.grass1,T.grass2,1,0);
    // 透视道路
    const cx=W*.5,top=hy-46*S,bot=H;
    r.triG(cx-260*S,top,cx+260*S,top,cx+720*S,bot,C.road1,C.road1,C.road2,1,0);
    r.triG(cx-260*S,top,cx-720*S,bot,cx+720*S,bot,C.road1,C.road2,C.road2,1,0);
    r.seg(cx-260*S,top,cx-720*S,bot,2*S,T.grass1,.5,0);
    r.seg(cx+260*S,top,cx+720*S,bot,2*S,T.grass1,.5,0);
    // 纵深网格线（强化 2.5D 地面）
    for(let d=-80;d<=95;d+=25){
      const y=hy+d*.58*S;
      if(y<hy-4||y>H)continue;
      r.quad(0,y,W,1*S,C.white,.035,0);
    }
    // 路面石纹（随卷轴滚动）
    for(let i=0;i<14;i++){
      const x=((i*173+WLD.camX*.32)%(W+240))-120;
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
    const p=pr(CFG.LEVEL_W-240,0,0),x=p.x,s=p.s;
    if(x<-420*S||x>W+620*S)return;
    const g=H*.555-8*S;
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
    const heavy=cls===0||(!isPlayer&&(o.type==="elite"||o.type==="miniboss"||o.type==="boss"));
    if(heavy){
      r.ell(px,by-55*s*ht,11*s*w,7*s,trim,alpha,flash);
      r.tri(px-11*s,by-55*s*ht,px-18*s,by-67*s*ht,px-5*s,by-58*s*ht,trim,alpha,flash);
      r.tri(px+11*s,by-55*s*ht,px+18*s,by-67*s*ht,px+5*s,by-58*s*ht,trim,alpha,flash);
      r.quad(px-3*s,by-60*s*ht,6*s,8*s,acc,alpha,flash);
      // 剑 + 盾
      const shx=px+face*13*s,shy=by-30*s*ht;
      const at=isPlayer?Math.max(0,o.atkT/.22):Math.max(0,o.attack/.36);
      const ang=(-.6+at*2.0)*face;
      const wx=shx+Math.cos(ang)*36*s,wy=shy+Math.sin(ang)*36*s;
      r.seg(shx,shy,wx,wy,4*s,C.steel,alpha,flash);
      r.seg(wx,wy,wx+Math.cos(ang)*11*s,wy+Math.sin(ang)*11*s,2*s,C.white,alpha,flash);
      r.seg(shx-Math.sin(ang)*5*s,shy+Math.cos(ang)*5*s,
            shx+Math.sin(ang)*5*s,shy-Math.cos(ang)*5*s,3*s,acc,alpha,flash);
      r.ell(px-face*14*s,by-27*s*ht,9*s,12*s,trim,.9*alpha,flash);
      r.ell(px-face*14*s,by-27*s*ht,4*s,6*s,acc,.7*alpha,flash);
    }else if(cls===1){
      r.tri(px-face*13*s,by-57*s*ht,px+face*13*s,by-57*s*ht,px+face*5*s,by-83*s*ht,main,alpha,flash);
      r.ell(px,by-57*s*ht,15*s,3.5*s,dk,alpha,flash);
      r.ell(px+face*5*s,by-83*s*ht,4*s,4*s,acc,alpha,flash);
      const gx=px+face*23*s,gy=by-40*s*ht;
      r.seg(px+face*13*s,by-21*s*ht,gx,gy,3.4*s,C.wood,alpha,flash);
      r.glow(gx,gy,8*s,8*s,acc,1,.7*alpha);
      r.ell(gx,gy,4.5*s,4.5*s,acc,alpha,0);
    }else{
      r.tri(px-face*12*s,by-56*s*ht,px+face*12*s,by-56*s*ht,px+face*3*s,by-73*s*ht,dk,alpha,flash);
      r.ell(px,by-54*s*ht,11*s,5*s,main,alpha,flash);
      const shx=px+face*14*s,shy=by-30*s*ht;
      for(let i=0;i<5;i++){
        const a1=-.9+i*.45,a2=-.9+(i+1)*.45;
        r.seg(shx+Math.cos(a1)*17*s,shy+Math.sin(a1)*17*s,
              shx+Math.cos(a2)*17*s,shy+Math.sin(a2)*17*s,2.6*s,C.wood,alpha,flash);
      }
      r.seg(shx+Math.cos(-.9)*17*s,shy+Math.sin(-.9)*17*s,
            shx+Math.cos(1.35)*17*s,shy+Math.sin(1.35)*17*s,1*s,C.white,.8*alpha,0);
      r.trap(px-face*9*s,by-40*s*ht,by-24*s*ht,6*s,8*s,C.gold,C.gold,.75*alpha,0); // 箭袋
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
    if(f.kind==="aggro")txt="!";
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
  }
  CR.render={drawScene,drawText,drawFloat};
})(window.CR=window.CR||{});
