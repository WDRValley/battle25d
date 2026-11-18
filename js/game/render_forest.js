/* render_forest.js — 魔法丛林全部画面几何（WebGL 单批次）· v1.3.1 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,C=CR.C,E=CR.ent,P=E.player,WLD=CR.world,FR=CR.forest,SV=CR.save;
  const G=CR.gl;
  const list=[],itemPool=[];
  function push(t,o){let it=itemPool[list.length];
    if(!it){it={_t:"",o:null};itemPool.push(it);}
    it._t=t;it.o=o;list.push(it);}
  function R(){return G.R;}
  function pr(x,d,h){return WLD.proj(x,d,h);}
  const HILL=[[0,.62],[.12,.44],[.26,.56],[.40,.38],[.55,.52],[.70,.36],[.86,.50],[1,.60]];

  function skyColors(){
    const z=(CFG.FOREST_ZONES&&CFG.FOREST_ZONES[FR.zone])?CFG.FOREST_ZONES[FR.zone]:null;
    let c;
    if(FR.isNight)c={top:[.02,.05,.11],mid:[.06,.13,.24],low:[.13,.24,.30],
      horizon:[.20,.32,.36],night:true,dusk:false,hill:[.07,.16,.17]};
    else if(FR.phase==="dusk")c={top:[.12,.16,.36],mid:[.38,.34,.48],low:[.68,.56,.42],
      horizon:[.82,.68,.48],night:false,dusk:true,hill:[.20,.26,.22]};
    else c={top:[.08,.24,.38],mid:[.24,.48,.52],low:[.48,.68,.52],
      horizon:[.66,.78,.58],night:false,dusk:false,hill:[.18,.34,.26]};
    /* 1.3.1 五段子区域：按所在分区的天色做平滑插值，形成自然过渡 */
    if(z&&!c.night){
      const k=.55;
      c.top=U.mix(c.top,z.sky[0],k);
      c.mid=U.mix(c.mid,z.sky[1],k);
      c.low=U.mix(c.low,z.sky[2],k);
      c.hill=U.mix(c.hill,z.hill,k);
      c.horizon=U.mix(c.horizon,z.sky[2],.35);
    }
    return c;
  }

  /* ================= 天空 / 远山 ================= */
  function drawSky(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555,hy2=H*.62;
    r.quadG(0,0,W,hy*.56,c.top,c.mid,1,0);
    r.quadG(0,hy*.56,W,hy*.44,c.mid,c.horizon,1,0);
    /* 柔光雾带 */
    r.quadG(0,hy*.78,W,hy*.22,c.horizon,c.low,.34,0);
    const sunX=W*(c.dusk?.74:(c.night?.20:.28)),sunY=hy*(c.night?.28:.24);
    if(c.night){
      r.glow(sunX,sunY,30*S,30*S,C.snow,.5,.85);
      r.ell(sunX,sunY,15*S,15*S,[.88,.94,1],.92,0,true);
      r.ell(sunX+7*S,sunY-3*S,13*S,13*S,c.top,.86,0,true);
      U.srand(7712);
      for(let i=0;i<62;i++){
        const x=U.rr(0,W),y=U.rr(0,hy*.7);
        r.ell(x,y,U.rr(.6,1.6)*S,U.rr(.6,1.6)*S,C.white,
          U.rr(.15,.6)*(.7+.3*Math.sin(CR.game.time*1.2+i)),0);
      }
    }else{
      r.glow(sunX,sunY,54*S,54*S,c.dusk?C.orange:C.sun,c.dusk?.7:.42,.8);
      r.ell(sunX,sunY,18*S,18*S,c.dusk?C.fire2:C.sun,.9,0,true);
    }
    /* 三层远山（视差） */
    const off=WLD.camX*.06;
    for(let layer=0;layer<3;layer++){
      const base=hy*(.30+layer*.085),amp=hy*(.16-layer*.028);
      const col=layer===0?[c.hill[0]*.6,c.hill[1]*.7,c.hill[2]*.7]:
        (layer===1?[c.hill[0]*.8,c.hill[1]*.88,c.hill[2]*.82]:c.hill);
      const par=.04+layer*.035,shift=off*(1+layer*.7);
      for(let i=0;i<HILL.length-1;i++){
        const a=HILL[i],b=HILL[i+1];
        const x1=((a[0]*W*1.5-shift*par)%(W*1.5)+W*1.5)%(W*1.5)-W*.25;
        const x2=x1+(b[0]-a[0])*W*1.5;
        const y1=base+(1-a[1])*amp,y2=base+(1-b[1])*amp;
        if(x2<-40||x1>W+40)continue;
        r.tri(x1,y1,x2,y2,x1,hy2+20,col,.82-layer*.09,0);
        r.tri(x1,y1,x2,y2,x2,hy2+20,col,.82-layer*.09,0);
      }
    }
    /* 林间体积光（斜射光束） */
    if(!c.night){
      for(let i=0;i<5;i++){
        const x=((i*310-WLD.camX*.18)% (W+400))+ (i%2?40:-60);
        r.tri(x,0,x+70*S,0,x+230*S,hy2,C.sun,.035,0);
        r.tri(x+70*S,0,x+230*S,hy2,x+120*S,hy2,C.sun,.020,0);
      }
    }
  }

  /* ================= 地面 ================= */
  function drawGround(){
    const r=R(),W=G.W,H=G.H,S=G.S,c=skyColors(),hy=H*.555;
    const segs=WLD.groundSegments();
    const pal=c.night?{grass:[.10,.22,.16],sand:[.18,.20,.18],stone:[.13,.19,.20]}:
      (c.dusk?{grass:[.24,.30,.19],sand:[.40,.34,.24],stone:[.30,.29,.26]}:
              {grass:[.22,.40,.22],sand:[.43,.38,.27],stone:[.34,.38,.32]});
    r.quadG(0,hy,W,H-hy,c.horizon,c.night?[.05,.10,.09]:[.10,.20,.12],1,0);
    segs.forEach(sg=>{
      const p=pr(sg.x0,0,0),p2=pr(sg.x1,0,0);
      if(p2.x<-20||p.x>W+20)return;
      const col=pal[sg.type]||pal.grass;
      r.quadG(p.x,p.y,p2.x-p.x+2,H-p.y,
        [col[0]*1.18,col[1]*1.18,col[2]*1.18],
        [col[0]*.55,col[1]*.62,col[2]*.6],1,0);
    });
    /* 地面纹理：草叶 / 落叶 / 石板缝 */
    U.srand(4417);
    const vl=WLD.camX-100,vr=WLD.camX+W/G.S+100;
    for(let x=Math.floor(vl/38)*38;x<vr;x+=38){
      const g=WLD.groundAt(x+18),p=pr(x,0,0);
      const yy=p.y+((x*13)%5+2)*S*.6;
      if(g==="grass"){
        for(let k=0;k<3;k++){
          const xx=p.x+(k*11+(x%17))*S*.6,sw=Math.sin(CR.game.time*1.4+x*.03+k)*2*S;
          r.seg(xx,yy,xx+sw,yy-7*S,1.3*S,C.leaf1,.5,0);
        }
      }else if(g==="sand"){
        r.ell(p.x+9*S,yy+3*S,6*S,2*S,C.sand,.35,0);
        r.ell(p.x+22*S,yy+8*S,4*S,1.6*S,C.wood,.28,0);
      }else{
        r.seg(p.x,yy+4*S,p.x+34*S,yy+4*S,1*S,C.stoneDk,.35,0);
      }
    }
    /* 溪流：一条斜穿林间的水带 */
    for(let x=Math.floor(vl/90)*90;x<vr;x+=90){
      const p=pr(x,0,0),w=90*G.S*1.02;
      const off=Math.sin((x/640)+CR.game.time*.6)*10*S;
      r.quadG(p.x,p.y+150*S+off,w,26*S,
        c.night?[.08,.20,.28]:[.24,.52,.62],
        c.night?[.04,.10,.16]:[.12,.34,.44],.85,0);
      r.seg(p.x,p.y+158*S+off,p.x+w,p.y+158*S+off,1.4*S,
        c.night?[.30,.52,.62]:C.foam,.4,0);
    }
  }

  /* ================= 巨木 / 藤蔓 / 蘑菇 / 蕨 / 石 / 灯 ================= */
  function drawTree(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(p.x<-220*G.S||p.x>G.W+220*G.S)return;
    const sway=Math.sin(CR.game.time*.7+o.phase)*2.4*s;
    const dark=o.tier===0?C.leaf2:C.wood;
    const trunk=o.tier===0?C.wood:C.wood;
    const h=o.h*s,w=o.w*s;
    /* 长投影 */
    r.ell(p.x+26*s,p.y+2*s,w*2.3,5*s,C.shadow,.20,0);
    /* 树根 */
    for(let k=-2;k<=2;k++)r.seg(p.x+k*w*.42,p.y,p.x+k*w*.95,p.y+8*s,3*s,dark,.9,0);
    /* 树干 */
    r.trap(p.x+o.lean*h*.12,p.y-h,p.y,w*.78,w*1.22,trunk,dark,.96,0);
    r.seg(p.x-w*.18,p.y-h*.72,p.x-w*.12+sway,p.y-h*.94,1.6*s,C.leaf1,.35,0);
    /* 树冠：三团错落的叶簇 */
    const top=p.y-h+o.lean*h*.12;
    const cols=o.type===0?[C.leaf1,C.leaf2,C.leaf3]:
      (o.type===1?[C.leaf2,C.leaf3,C.leaf1]:[C.leaf3,C.leaf1,C.leaf2]);
    /* 1.3.1 修复：X 基准必须是树干屏幕横坐标 p.x；此前误用 top（Y 坐标）
       导致树冠整体右移到屏幕外、与树干脱节，且所有树冠叠在同一列。
       sway 只做极小幅度风摆，不再随玩家 / 时间放大成位移。 */
    const crownX=p.x+o.lean*h*.12;
    for(let k=0;k<3;k++){
      const cx=crownX+((k-1)*w*1.15)+sway*.25*(k+1)*.15;
      const cy=top+(k===1?-h*.10:h*.03);
      const rad=w*(k===1?2.5:1.9);
      r.ell(cx,cy,rad,rad*.72,cols[k],.92,0,true);
      r.ell(cx-rad*.28,cy-rad*.24,rad*.5,rad*.34,C.leaf1,.34,0,true);
    }
    /* 樱瓣飘落（魔法丛林的标志性细节） */
    if(o.tier===0&&o.x%3<1.6){
      for(let i=0;i<3;i++){
        const t=(CR.game.time*.55+i*.33+o.phase)%1;
        const px=crownX+Math.sin(t*6+o.phase)*w*2.2+sway*.2;
        const py=top+t*h*1.15;
        r.ell(px,py,3*s,1.8*s,C.sakura,.72*(1-t*.5),0);
      }
    }
    /* 夜间树身幽光 */
    if(skyColors().night)
      r.glow(crownX,top+h*.25,w*2.6,h*.8,C.ghostViolet,1,.10);
  }
  function drawVine(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const sw=Math.sin(CR.game.time*.9+o.phase)*5*s;
    r.seg(p.x,p.y-260*s,p.x+sw,p.y-260*s+o.len*s,2.4*s,C.leaf2,.9,0);
    for(let k=1;k<5;k++){
      const t=k/5,xx=p.x+sw*t,yy=p.y-260*s+o.len*s*t;
      r.ell(xx+(k%2?7:-7)*s,yy,5*s,2.6*s,C.leaf1,.8,0);
    }
  }
  function drawMushroom(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const col=o.hue===0?C.sakura:(o.hue===1?C.cyan:C.lanternGlow);
    if(o.glow){
      const pulse=.4+.25*Math.sin(CR.game.time*2+o.x);
      r.glow(p.x,p.y-5*s,13*s,10*s,col,1,pulse*.55);
    }
    r.seg(p.x,p.y,p.x,p.y-6*s,2*s,C.snow,.85,0);
    r.ell(p.x,p.y-6*s,o.r*s,o.r*.55*s,col,.9,0);
    r.ell(p.x-o.r*.3*s,p.y-7*s,o.r*.22*s,o.r*.14*s,C.white,.6,0);
  }
  function drawFern(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const sw=Math.sin(CR.game.time*1.7+o.phase)*2.4*s;
    for(let k=-2;k<=2;k++){
      const a=k*.42;
      r.seg(p.x,p.y,p.x+Math.sin(a)*10*s+sw,p.y-o.h*s*(1-Math.abs(k)*.12),
        1.5*s,k%2?C.leaf1:C.leaf2,.78,0);
    }
  }
  function drawStone(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    r.ell(p.x,p.y-3*s,o.w*.5*s,o.h*.5*s,C.stoneDk,.9,0);
    r.ell(p.x-o.w*.1*s,p.y-6*s,o.w*.34*s,o.h*.3*s,C.stone,.8,0);
    r.ell(p.x,p.y-1*s,o.w*.6*s,2.6*s,C.shadow,.3,0);
  }
  function drawLamp(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s,night=skyColors().night;
    r.seg(p.x,p.y,p.x,p.y-o.h*s,3.4*s,C.wood,.95,0);
    r.ell(p.x,p.y-o.h*s,7*s,9*s,C.lantern,1,0);
    r.glow(p.x,p.y-o.h*s,26*s,26*s,C.lanternGlow,1,night?.72:.28);
    r.ell(p.x,p.y-o.h*s,3*s,4*s,C.star,night?.95:.4,0);
  }
  function drawFireflies(){
    const r=R(),S=G.S,night=skyColors().night;
    const strength=night?1:(FR.phase==="dusk"?.7:.34);
    FR.fireflies.forEach(f=>{
      const x=(f.x-WLD.camX)*G.S-Math.sin(CR.game.time*.3+f.phase)*20*S;
      if(x<-20||x>G.W+20)return;
      const y=f.y*S+Math.sin(CR.game.time*f.speed+f.phase)*18*S+40*S;
      const a=(.35+.45*Math.sin(CR.game.time*f.speed*2+f.phase))*strength;
      r.glow(x,y,f.size*3*S,f.size*3*S,C.star,1,a*.55);
      r.ell(x,y,f.size*S,f.size*S,C.star,a,0);
    });
  }
  function drawHut(){
    const r=R(),o=FR.hut;if(!o)return;
    const p=pr(o.x,o.depth,0),s=p.s;
    r.ell(p.x+20*s,p.y+2*s,o.w*.7*s,7*s,C.shadow,.25,0);
    r.trap(p.x,p.y-o.h*s,p.y,o.w*.72*s,o.w*s,C.wood,C.wood,1,0);
    r.tri(p.x-o.w*.72*s,p.y-o.h*s,p.x+o.w*.72*s,p.y-o.h*s,p.x,p.y-o.h*1.7*s,
      C.leaf2,1,0);
    /* 树洞：发光椭圆 */
    r.ell(p.x,p.y-o.h*.46*s,20*s,27*s,C.black,.95,0);
    const glow=SV.data.progress.sakuraHatched?.22:.62;
    r.glow(p.x,p.y-o.h*.46*s,40*s,48*s,C.sakura,1,glow);
    r.ell(p.x,p.y-o.h*.46*s,13*s,21*s,C.ghostViolet,.75,0);
    for(let i=0;i<5;i++){
      const a=CR.game.time*.7+i*1.25;
      r.ell(p.x+Math.cos(a)*26*s,p.y-o.h*.46*s+Math.sin(a)*30*s,
        2.6*s,2*s,C.sakura,.7,0);
    }
  }

  /* ================= 交互对象 ================= */
  function drawNode(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const left=SV.gatherLeft(o.id),pulse=.6+.4*Math.sin(CR.game.time*2+o.pulse);
    r.ell(p.x,p.y+2*s,34*s,9*s,C.shadow,.25,0);
    /* 采伐目标：倒木 / 木堆 / 巨杉 */
    for(let k=0;k<3;k++){
      const yy=p.y-(4+k*11)*s;
      r.quad(p.x-28*s,yy-9*s,56*s,9*s,k%2?C.wood:C.barrel,1,0);
      r.ell(p.x-28*s,yy-4.5*s,4*s,4.5*s,C.wood,1,0);
      r.ell(p.x-28*s,yy-4.5*s,2*s,2.4*s,C.sand,.7,0);
    }
    if(o.id==="log3"){
      r.trap(p.x+34*s,p.y-64*s,p.y,16*s,22*s,C.wood,C.wood,.95,0);
      r.ell(p.x+34*s,p.y-70*s,26*s,18*s,C.leaf2,.9,0,true);
    }
    /* 交互圆环 */
    if(left>0){
      r.ring(p.x,p.y-18*s,44*s,20*s,2.2*s,C.gold,.35*pulse,0,20);
      r.glow(p.x,p.y-20*s,30*s,30*s,C.gold,1,.12*pulse);
    }
    /* 图标与今日剩余（WebGL 数码字形） */
    CR.render.drawText(String(Math.min(9,left)),p.x,p.y-82*s,13*G.S,
      left>0?C.gold:C.red,.9);
    if(o.flash>0)r.ring(p.x,p.y-20*s,(44+60*(1-o.flash))*s,26*s,3*s,C.white,o.flash*.7,0,20);
  }
  function drawDruid(){
    const r=R(),o=CFG.FOREST_NPCS.druid,p=pr(o.x,o.depth,0),s=p.s;
    r.ell(p.x,p.y+2*s,20*s,6*s,C.shadow,.28,0);
    /* 树皮长袍 */
    r.trap(p.x,p.y-54*s,p.y,24*s,32*s,C.leaf2,C.wood,1,0);
    r.ell(p.x,p.y-62*s,11*s,10*s,C.skin,1,0);
    /* 苔藓胡须与鹿角 */
    r.ell(p.x,p.y-56*s,9*s,7*s,C.leaf1,.85,0);
    r.seg(p.x-8*s,p.y-70*s,p.x-18*s,p.y-92*s,2.4*s,C.wood,1,0);
    r.seg(p.x-14*s,p.y-84*s,p.x-24*s,p.y-88*s,1.8*s,C.wood,1,0);
    r.seg(p.x+8*s,p.y-70*s,p.x+18*s,p.y-92*s,2.4*s,C.wood,1,0);
    r.seg(p.x+14*s,p.y-84*s,p.x+24*s,p.y-88*s,1.8*s,C.wood,1,0);
    r.ell(p.x-3*s,p.y-63*s,1.8*s,1.8*s,C.star,.9,0);
    r.ell(p.x+3*s,p.y-63*s,1.8*s,1.8*s,C.star,.9,0);
    /* 手杖 */
    r.seg(p.x+18*s,p.y-50*s,p.x+24*s,p.y+2*s,3*s,C.wood,1,0);
    r.glow(p.x+24*s,p.y-54*s,16*s,16*s,C.leaf1,1,.5);
    r.ell(p.x+24*s,p.y-54*s,6*s,6*s,C.star,.9,0);
    /* 光环 */
    r.ring(p.x,p.y-40*s,40*s,17*s,1.6*s,C.leaf1,.22,0,20);
  }
  function drawTrader(){
    const r=R(),o=CFG.FOREST_NPCS.woodTrader,p=pr(o.x,o.depth,0),s=p.s;
    r.ell(p.x,p.y+2*s,24*s,6*s,C.shadow,.28,0);
    /* 摊位棚 */
    r.trap(p.x,p.y-70*s,p.y-58*s,72*s,78*s,C.cloth2,C.cloth,1,0);
    r.seg(p.x-38*s,p.y-58*s,p.x-46*s,p.y,3*s,C.wood,1,0);
    r.seg(p.x+38*s,p.y-58*s,p.x+46*s,p.y,3*s,C.wood,1,0);
    r.quad(p.x-42*s,p.y-30*s,84*s,10*s,C.wood,1,0);
    /* 货物 */
    ["🪓","🪚","🍄"].forEach((_,i)=>{
      const xx=p.x-26*s+i*26*s;
      r.ell(xx,p.y-38*s,7*s,6*s,i===0?C.iron:(i===1?C.steel:C.sakura),1,0);
      r.glow(xx,p.y-38*s,13*s,13*s,C.gold,1,.16);
    });
    /* 摊主 */
    r.trap(p.x+50*s,p.y-48*s,p.y,17*s,21*s,C.cloth3,C.cloth,1,0);
    r.ell(p.x+50*s,p.y-56*s,9*s,9*s,C.skin,1,0);
    r.ell(p.x+50*s,p.y-62*s,12*s,4*s,C.wood,.9,0);
    r.ring(p.x,p.y-44*s,52*s,21*s,1.8*s,C.gold,.22,0,20);
  }
  function drawWalker(w){
    const r=R(),p=pr(w.x,w.depth,0),s=p.s;
    const bob=Math.sin(CR.game.time*6+w.t)*2*s;
    r.ell(p.x,p.y+2*s,11*s,3.5*s,C.shadow,.25,0);
    r.trap(p.x,p.y-38*s+bob,p.y,14*s,18*s,w.color,w.color,1,0);
    r.ell(p.x,p.y-46*s+bob,8*s,8*s,C.skin,1,0);
    r.seg(p.x-5*s,p.y-14*s,p.x-6*s+Math.sin(w.t*6)*3*s,p.y,4*s,w.color,1,0);
    r.seg(p.x+5*s,p.y-14*s,p.x+6*s-Math.sin(w.t*6)*3*s,p.y,4*s,w.color,1,0);
    r.ell(p.x,p.y-55*s+bob,9*s,2.4*s,C.leaf2,.85,0);
  }
  /* 半中立怪：领地环 + 复用主渲染的人形怪 + 血条 */
  function drawTerritory(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    const a=e.hostile?.32:.14;
    r.ring(p.x,p.y-4*s,e.territory*G.S*.65,e.territory*G.S*.22,
      1.6*s,e.hostile?C.hpOrange:C.hpBlue,a,0,28);
    r.ell(p.x,p.y,e.territory*G.S*.7,9*s,C.hpBlue,.055,0,true);
  }
  /* ================= 1.3.1 原始森林：果树 / 枯木 / 古藤 / 野花 / 落叶 / 飞鸟 ================= */
  function drawFruit(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(p.x<-160*s||p.x>G.W+160*s)return;
    const h=112*s,w=13*s,sw=Math.sin(CR.game.time*.8+o.phase)*2*s;
    r.ell(p.x+14*s,p.y+3*s,w*2.4,5*s,C.shadow,.20,0);
    r.trap(p.x+sw,p.y-h,p.y,w*.7,w*1.2,C.wood,C.woodDk||C.brown,.96,0);
    r.seg(p.x,p.y-h*.7,p.x-24*s,p.y-h*.92,3*s,C.wood,.9,0);
    r.seg(p.x,p.y-h*.65,p.x+26*s,p.y-h*.88,3*s,C.wood,.9,0);
    const crown=U.mix(C.leaf1,C.leaf2,.35);
    for(let k=0;k<4;k++){
      const cx=p.x+(k-1.5)*22*s+sw,cy=p.y-h+(k%2?-10:6)*s;
      r.ell(cx,cy,32*s,20*s,k%2?C.leaf1:crown,.92,0,true);
    }
    /* 果实：梨是青黄、葡萄是紫串 */
    const berry=o.kind==="pear"?U.mix(C.gold,C.leaf1,.45):C.violet;
    U.srand(Math.floor(o.x));
    for(let k=0;k<12;k++){
      const cx=p.x+U.rr(-46,46)*s+sw,cy=p.y-h+U.rr(-18,28)*s;
      if(o.kind==="pear")r.ell(cx,cy,5*s,6.5*s,berry,.95,0,true);
      else for(let j=0;j<3;j++)r.ell(cx+(j-1)*3*s,cy+j*4*s,3.2*s,3*s,berry,.92,0,true);
    }
    r.glow(p.x,p.y-h*.5,54*s,48*s,C.sun,1,.07);
  }
  function drawDeadwood(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    if(p.x<-120*s||p.x>G.W+120*s)return;
    const h=o.h*s;
    r.ell(p.x+10*s,p.y+2*s,26*s,4*s,C.shadow,.18,0);
    r.trap(p.x+o.lean*h*.3,p.y-h,p.y,9*s,15*s,C.woodDk||C.brown,C.black,.92,0);
    r.seg(p.x,p.y-h*.8,p.x-20*s,p.y-h-8*s,3*s,C.brown,.9,0);
    r.seg(p.x,p.y-h*.62,p.x+22*s,p.y-h-4*s,2.6*s,C.brown,.85,0);
    for(let k=0;k<3;k++)r.ell(p.x+(k-1)*9*s,p.y-h*.3,7*s,3*s,C.leaf2,.35,0);
  }
  function drawAncientVine(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const sw=Math.sin(CR.game.time*.55+o.phase)*4*s;
    r.seg(p.x,p.y-300*s,p.x+sw,p.y-300*s+o.len*s,4*s,C.leaf2,.9,0);
    for(let k=1;k<6;k++){
      const t=k/6,xx=p.x+sw*t,yy=p.y-300*s+o.len*s*t;
      r.ell(xx+(k%2?10:-10)*s,yy,7*s,3.4*s,C.leaf1,.8,0);
    }
  }
  function drawFlower(o){
    const r=R(),p=pr(o.x,o.depth,0),s=p.s;
    const cols=[C.sakura,C.star,C.cyan],col=cols[o.hue%3];
    const sw=Math.sin(CR.game.time*1.6+o.phase)*1.6*s;
    r.seg(p.x,p.y,p.x+sw,p.y-o.h*s,1.1*s,C.leaf1,.75,0);
    r.ell(p.x+sw,p.y-o.h*s,3*s,2.4*s,col,.9,0,true);
  }
  function drawBird(o){
    const r=R(),S=G.S;
    const x=(o.x-WLD.camX*.3+CR.game.time*o.v)%(CFG.FOREST_W||4800);
    const p=pr(x,-90,0);
    if(p.x<-30||p.x>G.W+30)return;
    const flap=Math.sin(CR.game.time*6+o.phase)*5*S;
    r.seg(p.x-8*S,p.y-o.y*S,p.x,p.y-o.y*S+flap*.4,1.6*S,C.white,.55,0);
    r.seg(p.x,p.y-o.y*S+flap*.4,p.x+8*S,p.y-o.y*S+flap,1.6*S,C.white,.55,0);
  }
  function drawLeaves(o){
    const r=R(),S=G.S;
    const t=(CR.game.time*o.v+o.phase*40)%260;
    const x=o.x-WLD.camX*.55+Math.sin(t*.03+o.phase)*28;
    const p=pr(x,20,0);
    if(p.x<-20||p.x>G.W+20)return;
    const y=p.y-260*S+t*S;
    const col=o.hue===0?C.gold:(o.hue===1?C.orange:C.leaf1);
    r.ell(p.x,y,o.size*S,o.size*.55*S,col,.55,0,true);
  }

  function drawHalfMob(e){
    const r=R(),p=pr(e.x,e.depth,0),s=p.s;
    CR.render.drawHumanoid(e,false);
    if(e.barT>0||e.hostile){
      const y=p.y-72*s*e.ht,bw=40*s*e.w;
      r.quad(p.x-bw/2,y,bw,4*s,C.hpbg,.9,0);
      r.quad(p.x-bw/2,y,bw*Math.max(0,e.hp/e.maxHp),4*s,
        e.hostile?C.hpRed:C.hpBlue,1,0);
      if(e.cfg&&e.cfg.element){
        r.ell(p.x+bw/2+9*s,y+2*s,4*s,4*s,
          CFG.ELEMENT_COLOR[e.cfg.element]||C.steel,.9,0);
      }
    }
  }

  /* ================= 世界标签（悬浮 / 长按说明） ================= */
  function drawWorldLabels(){
    if(CR.game&&CR.game.state==="menu"){CR.ui.setWorldLabels([]);return;}
    const out=[],R=CFG.REGION_INFO.forest;
    out.push({text:"🌲 魔法丛林 · 区域情报",sx:G.W*.5,sy:G.H*.135,cls:"region",
      tip:{title:R.icon+" "+R.name,kind:"区域情报",
        lines:[R.desc,"NPC "+R.npcs.length+" 位 · 野怪 "+R.mobs.length+" 种 · 资源点 "+R.nodes.length+" 处",
          "按 G 或点「区域」查看完整情报"]}});
    const add=(o,title,lines)=>{
      const p=pr(o.x,o.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:title,sx:p.x,sy:p.y-96*G.S*p.s/G.S,cls:"npc",
        tip:{title,kind:"区域",lines}});
    };
    add(CFG.FOREST_NPCS.druid,"🌳 德鲁伊 · 木隐",
      ["持【夜樱蛋】对话，孵化第四位角色「夜樱」（女 · 幽系）",
       "夜樱蛋：星火港灯塔下 · 夜樱 BOSS 试炼获胜掉落"]);
    if(CFG.FOREST_NPCS.vivian)add(CFG.FOREST_NPCS.vivian,"🧚 薇薇安 · 支线",
      ["【支线】薇薇安的野餐篮：交付 梨 ×3 + 林菇 ×2",
       "奖励 300 金币与小型学习力果实 · 材料都在【原始森林】"]);
    add(CFG.FOREST_NPCS.woodTrader,"🧺 林间货郎 · 阿桐",
      ["收木材与林间材料（原木单价 18 金币）",
       "售伐木斧 / 双人锯 / 苔叶冠 / 树皮法袍 / 养成道具"]);
    FR.nodes.forEach(n=>add(n,(n.kind==="lumber"?"🪵 ":(n.kind==="fruit"?"🍐 ":"🍄 "))+n.name,
      [n.desc,"每日 "+n.daily+" 次 · 北京时间的自然日重置",
       "今日剩余 "+SV.gatherLeft(n.id)+" 次"]));
    (FR.animals||[]).forEach(e=>{
      if(!e.alive)return;
      const p=pr(e.x,e.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:"",sx:p.x,sy:p.y-40*G.S,cls:"mob",
        tip:{title:e.cfg.label,kind:"中立动物 · 蓝血条",
          lines:[e.cfg.desc||"","被攻击后才会反击，击败掉落【兽肉】"]}});
    });
    FR.mobs.forEach(e=>{
      if(!e.alive)return;
      const p=pr(e.x,e.depth,0);
      if(p.x<-60||p.x>G.W+60)return;
      out.push({text:"",sx:p.x,sy:p.y-40*G.S,cls:"mob",
        tip:{title:e.cfg.label,kind:e.hostile?"敌对":"半中立",
          lines:[e.cfg.desc||"","系别 "+(e.cfg.element||"普通系")+" · 领地 "+Math.round(e.territory),
            "进入领地才吸引仇恨，走远自动脱战"]}});
    });
    CR.ui.setWorldLabels(out);
  }

  /* ================= 主绘制 ================= */
  function drawScene(){
    const r=R();
    drawSky();drawGround();drawHut();drawFireflies();
    /* 飞鸟 / 落叶：远景层，不进深度排序队列 */
    FR.birds.forEach(drawBird);FR.leaves.forEach(drawLeaves);
    list.length=0;
    const vl=WLD.camX-260,vr=WLD.camX+G.W/G.S+260;
    FR.trees.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("tree",o);});
    FR.vines.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("vine",o);});
    FR.stones.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("stone",o);});
    FR.lamps.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("lamp",o);});
    FR.mushrooms.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("mush",o);});
    FR.ferns.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("fern",o);});
    FR.fruit.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("fruit",o);});
    FR.deadwood.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("deadwood",o);});
    FR.ancientVines.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("ancientVine",o);});
    FR.flowers.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("flower",o);});
    FR.animals.forEach(o=>{if(o.alive)push("mob",o);});
    FR.nodes.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("node",o);});
    FR.walkers.forEach(o=>{if(o.x>=vl&&o.x<=vr)push("walker",o);});
    push("druid",CFG.FOREST_NPCS.druid);
    push("trader",CFG.FOREST_NPCS.woodTrader);
    if(CFG.FOREST_NPCS.vivian)push("vivian",CFG.FOREST_NPCS.vivian);
    FR.mobs.forEach(e=>{if(e.alive)push("territory",e);});
    E.enemies.each(e=>push(e.cfg&&e.cfg.ai==="halfNeutral"?"halfmob":"mob",e));
    E.drops.each(d=>push("drop",d));
    push("player",P);
    list.sort((a,b)=>(a.o.depth||0)-(b.o.depth||0));
    for(let i=0;i<list.length;i++){
      const it=list[i],o=it.o;
      switch(it._t){
        case "tree":drawTree(o);break;
        case "vine":drawVine(o);break;
        case "stone":drawStone(o);break;
        case "lamp":drawLamp(o);break;
        case "mush":drawMushroom(o);break;
        case "fern":drawFern(o);break;
        case "fruit":drawFruit(o);break;
        case "deadwood":drawDeadwood(o);break;
        case "ancientVine":drawAncientVine(o);break;
        case "flower":drawFlower(o);break;
        case "node":drawNode(o);break;
        case "walker":drawWalker(o);break;
        case "druid":drawDruid();break;
        case "trader":drawTrader();break;
        case "vivian":drawWalker({x:CFG.FOREST_NPCS.vivian.x,depth:CFG.FOREST_NPCS.vivian.depth,
          color:C.sakura,icon:"✿",name:"薇薇安",t:CR.game.time*1.2});break;
        case "territory":drawTerritory(o);break;
        case "halfmob":drawHalfMob(o);break;
        case "mob":CR.render.drawHumanoid(o,false);break;
        case "drop":CR.render.drawDrop(o);break;
        case "player":CR.render.drawHumanoid(o,true);break;
      }
    }
    E.beams.each(CR.render.drawBeam);
    E.shots.each(CR.render.drawShot);
    E.ghosts.each(CR.render.drawGhost);
    E.parts.each(CR.render.drawPart);
    E.floats.each(CR.render.drawFloat);
    drawWorldLabels();
  }
  CR.renderForest={drawScene,skyColors};
})(window.CR=window.CR||{});
