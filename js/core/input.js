/* input.js — 可改键键盘 + 长按蓄力 + 二段跳 + 王者式触屏布局 */
(function(CR){
  "use strict";
  const CFG=CR.CFG,U=CR.u;
  const held=Object.create(null);      // code -> bool
  const touchDown=Object.create(null); // action -> bool
  let bindings=Object.assign({},CFG.DEFAULT_BINDINGS);
  let on={};                          // 外部注入的回调
  let capture=null,captureCb=null;
  let chargeHeld=false,chargeT=0,charging=false,chargeLevel=0;
  let touchMX=0,touchMD=0,stickId=null;
  let touchMode=false;

  const CHARGE_MIN=.30,CHARGE_FULL=1.25;

  function codeToAction(code){
    for(const a in bindings)if(bindings[a]===code)return a;
    return null;
  }
  function actionDown(a){return !!(touchDown[a]||isBoundHeld(a));}
  function isBoundHeld(a){return !!held[bindings[a]];}
  function axes(){
    let mx=(actionDown("right")?1:0)-(actionDown("left")?1:0);
    let md=(actionDown("down")?1:0)-(actionDown("up")?1:0);
    if(touchMX||touchMD){mx+=touchMX;md+=touchMD;}
    const L=Math.hypot(mx,md);
    if(L>1){mx/=L;md/=L;}
    return {mx,md,moving:L>.08};
  }
  function isTyping(){
    const a=document.activeElement;
    return !!a&&(a.tagName==="INPUT"||a.tagName==="TEXTAREA"||a.isContentEditable);
  }
  function keydown(e){
    if(e.repeat&&!capture)return;
    const code=e.code;
    // 文本框聚焦时把按键完整交还给输入框（角色名 / 队伍改名）
    if(isTyping()&&!capture){
      if(code==="Escape"){document.activeElement.blur();e.preventDefault();}
      return;
    }
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space","Tab"].includes(code))e.preventDefault();
    if(capture){
      e.preventDefault();
      const cb=captureCb,a=capture;capture=null;captureCb=null;
      if(code==="Escape"){if(cb)cb(null,a);return;}
      // 固定功能键不允许被改键占用
      if(CFG.RESERVED_CODES.indexOf(code)>=0){if(cb)cb(null,a);return;}
      if(cb)cb(code,a);
      return;
    }
    if(held[code])return;
    held[code]=true;
    const a=codeToAction(code);
    if(a==="attack"){beginAttack();}
    else if(a==="jump"){if(on.jump)on.jump();}
    else if(a&&a[0]==="s"&&a.length===2){
      const i=+a[1]-1;if(i>=0&&i<4&&on.skill)on.skill(i);
    }
    else if(a==="use1"&&on.slot)on.slot(0);
    else if(a==="use2"&&on.slot)on.slot(1);
    else if(a==="interact"&&on.interact)on.interact();
    else if(a==="bag"&&on.bag)on.bag();
    else if(a==="char"&&on.char)on.char();
    else if(a==="map"&&on.map)on.map();
    else if(a==="region"&&on.region)on.region();
    else if(a==="pause"&&on.pause)on.pause();
    else if(a==="panel"&&on.panel)on.panel();
    else if(a&&a.indexOf("team")===0&&on.team)on.team(+a[4]-1);
    else if(!a&&CFG.TEAM_ALIAS[code]!==undefined&&on.team){
      // 无小键盘时的别名：主键盘 1~4 同样切换队伍（仅在该键未被改键占用时）
      on.team(CFG.TEAM_ALIAS[code]);
    }
    // 固定功能键（不参与改键，避免与技能键冲突）
    if(code==="Escape"&&on.escape)on.escape();
    else if((code==="Enter"||code==="NumpadEnter")&&on.confirm)on.confirm();
  }
  function keyup(e){
    const code=e.code;held[code]=false;
    const a=codeToAction(code);
    if(a==="attack")endAttack();
  }
  function beginAttack(){
    if(chargeHeld)return;
    chargeHeld=true;chargeT=0;charging=false;chargeLevel=0;
    if(on.attack)on.attack();
  }
  function endAttack(){
    if(!chargeHeld)return;
    chargeHeld=false;
    if(charging){
      const lv=chargeRatio()>=.72?2:1;
      if(on.charge)on.charge(lv);
      if(CR.audio.ready)CR.audio.chargeStop();
      if(on.chargeEnd)on.chargeEnd();
    }
    charging=false;chargeT=0;chargeLevel=0;
  }
  function update(dt){
    if(chargeHeld&&!charging){
      chargeT+=dt;
      if(chargeT>=CHARGE_MIN){
        charging=true;chargeT=0;
        if(CR.audio.ready){CR.audio.chargeStart();CR.audio.chargeSet(0);}
        if(on.chargeBegin)on.chargeBegin();
      }
    }else if(charging){
      chargeT+=dt;
      const lv=U.clamp(chargeT/(CHARGE_FULL-CHARGE_MIN),0,1);
      chargeLevel=lv>=.72?2:(lv>=.30?1:0);
      if(CR.audio.ready)CR.audio.chargeSet(lv);
    }
  }
  function chargeRatio(){
    if(!charging)return 0;
    return U.clamp(chargeT/(CHARGE_FULL-CHARGE_MIN),0,1);
  }
  /* 起蓄阶段（0 → CHARGE_MIN）的进度，供 HUD 圆环显示「至少还需按多久」 */
  function chargePre(){return charging?1:U.clamp(chargeT/CHARGE_MIN,0,1);}
  function reset(){
    for(const k in held)held[k]=false;
    for(const k in touchDown)touchDown[k]=false;
    chargeHeld=false;charging=false;chargeT=0;chargeLevel=0;
    touchMX=touchMD=0;stickId=null;
    if(CR.audio.ready)CR.audio.chargeStop();
    const k=document.getElementById("stickKnob");
    if(k)k.style.transform="translate(-50%,-50%)";
  }
  function setBindings(b){bindings=Object.assign({},CFG.DEFAULT_BINDINGS,b||{});}
  function setCapture(action,cb){capture=action;captureCb=cb;reset();}
  function cancelCapture(){capture=null;captureCb=null;}

  /* ---------- 触屏：虚拟摇杆 + 技能扇形 ---------- */
  function bindTouch(){
    touchMode=window.matchMedia&&window.matchMedia("(pointer:coarse)").matches;
    const base=document.getElementById("stickBase"),knob=document.getElementById("stickKnob");
    if(base){
      const R=52;
      const move=(e)=>{
        const r=base.getBoundingClientRect();
        let dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
        const L=Math.hypot(dx,dy)||1;const k=Math.min(1,L/R);
        dx=dx/L*k;dy=dy/L*k;
        touchMX=dx;touchMD=dy;
        knob.style.transform=`translate(calc(-50% + ${dx*R}px),calc(-50% + ${dy*R}px))`;
      };
      base.addEventListener("pointerdown",e=>{e.preventDefault();stickId=e.pointerId;
        base.setPointerCapture(e.pointerId);move(e);});
      base.addEventListener("pointermove",e=>{if(e.pointerId===stickId){e.preventDefault();move(e);}});
      const up=e=>{if(e.pointerId!==stickId)return;stickId=null;touchMX=touchMD=0;
        knob.style.transform="translate(-50%,-50%)";};
      base.addEventListener("pointerup",up);base.addEventListener("pointercancel",up);
      base.addEventListener("lostpointercapture",up);
    }
    const map={btnAtk:"__atk",btnJump:"__jump",sk1:"__s0",sk2:"__s1",sk3:"__s2",sk4:"__s3",
      ti1:"__u0",ti2:"__u1",btnTalk:"__talk"};
    for(const id in map){
      const el=document.getElementById(id);if(!el)continue;
      const v=map[id];
      el.addEventListener("pointerdown",e=>{
        e.preventDefault();el.classList.add("act");
        if(v==="__atk")beginAttack();
        else if(v==="__jump"){if(on.jump)on.jump();}
        else if(v==="__talk"){if(on.interact)on.interact();}
        else if(v[2]==="u"){const i=+v[3];if(on.slot)on.slot(i);}
        else {const i=+v[3];if(on.skill)on.skill(i);}
      });
      const up=e=>{e.preventDefault();el.classList.remove("act");if(v==="__atk")endAttack();};
      el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);
      el.addEventListener("pointerleave",up);
    }
  }
  function init(handlers){
    on=handlers||{};
    setBindings(CR.save.data.settings.bindings);
    window.addEventListener("keydown",keydown);
    window.addEventListener("keyup",keyup);
    window.addEventListener("blur",()=>{for(const k in held)held[k]=false;endAttack();});
    bindTouch();
  }
  CR.input={init,update,axes,reset,setBindings,setCapture,cancelCapture,
    beginAttack,endAttack,
    actionDown,isBoundHeld,chargeRatio,chargePre,
    get bindings(){return bindings;},get charging(){return charging;},
    get chargeLevel(){return chargeLevel;},get chargeHeld(){return chargeHeld;},
    get touchMode(){return touchMode;},get capturing(){return !!capture;},
    get on(){return on;}};
})(window.CR=window.CR||{});
