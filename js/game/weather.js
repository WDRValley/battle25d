/* weather.js — v1.4 dev1.3 全局天气层
 * 让黄昏城堡 / 魔法丛林 / 星火港（以及未来新图）都能响应设置面板的天气模式。
 * 集市与沼泽各自已有专属天气层，这里只做设置同步，不重复绘制。
 */
(function(CR){
  "use strict";
  const U=CR.u,CFG=CR.CFG,SV=CR.save,C=CR.C;
  const st={mode:"auto",id:"sunny",t:0,lightning:0,lt:6,rain:[],snow:[]};
  /* v1.4 dev4：大学城自行按分区绘制天气（室内不落雨雪），不叠加全局层 */
  const OWN_WEATHER=["market","swamp","university"];

  function pick(){
    return st.mode==="auto"?CFG.WEATHER_ORDER[U.ri(0,CFG.WEATHER_ORDER.length-1)]:st.mode;
  }
  function build(){
    st.rain.length=0;st.snow.length=0;
    const W=CR.gl.W||1280,H=CR.gl.H||720,cfg=current();
    st.builtW=W;st.builtH=H;
    if(!cfg)return;
    if(cfg.rain>0)for(let i=0;i<72;i++)st.rain.push({x:U.rr(0,W),y:U.rr(0,H),
      v:U.rr(430,770)*cfg.rain,len:U.rr(12,26),a:U.rr(.24,.62)});
    if(cfg.snow>0)for(let i=0;i<48;i++)st.snow.push({x:U.rr(0,W),y:U.rr(0,H),
      v:U.rr(24,62),sw:U.rr(0,6.28),r:U.rr(1.4,3.4)});
  }
  function setMode(mode,quiet){
    st.mode=mode||"auto";st.id=pick();st.t=0;st.lightning=0;st.lt=U.rr(4,9);
    build();
    const cfg=current();
    /* quiet 只抑制横幅，HUD 仍要立即同步（切图后尤其明显） */
    if(CR.ui&&CR.ui.refreshWeather)try{CR.ui.refreshWeather();}catch(e){}
    if(!quiet&&cfg&&CR.ui&&activeFor(CR.world&&CR.world.mode)){
      try{CR.ui.banner(cfg.icon+" "+cfg.name+" · "+cfg.desc);
        CR.ui.refreshWeather&&CR.ui.refreshWeather();
        CR.audio.sfx(st.id==="storm"?"thunder":(st.id==="rain"?"rain":"wave"));}catch(e){}
    }
    return cfg;
  }
  function current(){return CFG.WEATHER[st.id]||CFG.WEATHER.sunny;}
  function activeFor(mode){return OWN_WEATHER.indexOf(mode)<0;}
  function update(dt){
    const mode=CR.world&&CR.world.mode;
    st.t+=dt;
    if(st.mode==="auto"&&st.t>34){st.t=0;setMode("auto",false);}
    const cfg=current();
    if(cfg&&cfg.lightning){
      st.lt-=dt;
      if(st.lt<=0){st.lt=U.rr(4.5,10);st.lightning=1;
        try{CR.audio.sfx("thunder");}catch(e){}}
    }
    st.lightning=Math.max(0,st.lightning-dt*3.2);
    if(!activeFor(mode))return;
    for(const o of st.rain){o.y+=o.v*dt;o.x-=o.v*.11*dt;
      if(o.y>CR.gl.H+40){o.y=-40;o.x=U.rr(0,CR.gl.W+80);}
      if(o.x<-80)o.x=CR.gl.W+60;}
    for(const o of st.snow){o.y+=o.v*dt;
      if(o.y>CR.gl.H+30){o.y=-30;o.x=U.rr(0,CR.gl.W);}}
  }
  /* 在 main.render() 的 drawScene 之后、gl.end 之前调用 */
  function draw(){
    if(!activeFor(CR.world&&CR.world.mode))return;
    if(st.builtW!==CR.gl.W||st.builtH!==CR.gl.H)build();
    const r=CR.gl.R,W=CR.gl.W,H=CR.gl.H,S=CR.gl.S,cfg=current();
    if(!r||!cfg)return;
    if(cfg.rain>0){
      for(const o of st.rain)
        r.seg(o.x,o.y,o.x-4*S,o.y+o.len*S,1.15*S,C.white,o.a,0);
      U.srand(9173);
      for(let i=0;i<12;i++)
        r.ell(U.rr(0,W),U.rr(H*.55,H),U.rr(5,12)*S,2*S,C.foam,.18,0,true);
    }
    if(cfg.snow>0)for(const o of st.snow){
      const x=o.x+Math.sin(CR.game.time*.7+o.sw)*28*S;
      r.ell(x,o.y,o.r*S,o.r*S,C.snow,.70,0,true);
      r.ell(x,o.y,o.r*2*S,o.r*2*S,C.snow,.09,0,true);
    }
    if(st.lightning>0){
      r.quad(0,0,W,H,C.white,st.lightning*.16,0);
      let px=W*.62,py=0;
      for(let k=0;k<6;k++){
        const nx=px+U.rr(-26,26)*S,ny=py+H*.1;
        r.seg(px,py,nx,ny,2*S,C.white,st.lightning*.75,0);px=nx;py=ny;
      }
    }
  }
  /* 叠加到各图 post() */
  function decorate(post){
    if(!activeFor(CR.world&&CR.world.mode))return post;
    const w=current(),p=post||{};
    const t=w.tint||[1,1,1],pt=p.tint||[1,1,1];
    return Object.assign({},p,{
      tint:[pt[0]*t[0],pt[1]*t[1],pt[2]*t[2]],
      ambient:(p.ambient===undefined?1:p.ambient)*(w.ambient||1),
      white:(p.white||0)+st.lightning*.42,
      vigBoost:(p.vigBoost||0)+(w.rain?.05:0),
      fog:(p.fog||0)+(w.rain?.08:0)
    });
  }
  function init(){setMode(SV.data.settings.weatherMode||"auto",true);}
  CR.weather={init,setMode,current,activeFor,update,draw,decorate,
    get mode(){return st.mode;},get id(){return st.id;},get lightning(){return st.lightning;},
    get rain(){return st.rain;},get snow(){return st.snow;}};
})(window.CR=window.CR||{});
