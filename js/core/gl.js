/* gl.js — 单批次 WebGL 渲染 + 可开关的后期处理管线
 * 主画面：所有几何合并进一个动态 VBO，1 次 drawArrays
 * 后期：高画质 = 亮部提取 → 双向高斯模糊 → 合成(辉光/暗角/色调/色差/颗粒/闪屏)
 *       中画质 = 直接合成(无辉光)；低/省电 = 直出，不占 FBO
 */
(function(CR){
  "use strict";
  const U=CR.u;
  let canvas=null,gl=null,W=0,H=0,S=1,dpr=1;
  let mainProg=null,brightProg=null,blurProg=null,compProg=null;
  let vbo=null,quadVBO=null,scene=null,bloomA=null,bloomB=null,blankTex=null;
  let quality="high";
  let aPos,aCol,uRes,attrP,attrUV;
  let uni={};
  let stats={tris:0,draws:0,verts:0};
  const MAX_TRIS=9000,FPV=6;
  const VB=new Float32Array(MAX_TRIS*3*FPV);

  /* ---------- shader ---------- */
  const SRC_MAIN_VS=`
attribute vec2 a_pos;
attribute vec4 a_col;
uniform vec2 u_res;
varying vec4 v_col;
void main(){
  vec2 p=a_pos/u_res*2.0-1.0;
  gl_Position=vec4(p.x,-p.y,0.0,1.0);
  v_col=a_col;
}`;
  const SRC_MAIN_FS=`
precision mediump float;
varying vec4 v_col;
void main(){gl_FragColor=v_col;}`;
  const SRC_QUAD_VS=`
attribute vec2 a_p;
attribute vec2 a_uv;
varying vec2 v_uv;
void main(){v_uv=a_uv;gl_Position=vec4(a_p,0.0,1.0);}`;
  const SRC_BRIGHT_FS=`
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_thr;
void main(){
  vec3 c=texture2D(u_tex,v_uv).rgb;
  float l=max(max(c.r,c.g),c.b);
  gl_FragColor=vec4(c*smoothstep(u_thr,u_thr+0.28,l),1.0);
}`;
  const SRC_BLUR_FS=`
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform vec2 u_dir;
void main(){
  vec3 s=texture2D(u_tex,v_uv).rgb*0.227027;
  s+=texture2D(u_tex,v_uv+u_dir*1.384615).rgb*0.316216;
  s+=texture2D(u_tex,v_uv-u_dir*1.384615).rgb*0.316216;
  s+=texture2D(u_tex,v_uv+u_dir*3.230769).rgb*0.070270;
  s+=texture2D(u_tex,v_uv-u_dir*3.230769).rgb*0.070270;
  gl_FragColor=vec4(s,1.0);
}`;
  const SRC_COMP_FS=`
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_scene,u_bloom;
uniform float u_time,u_flash,u_white,u_vig,u_bloomAmt,u_ca,u_grain,u_ambient;
uniform vec3 u_tint;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 d=v_uv-0.5;
  float r2=dot(d,d);
  vec2 uv=v_uv+d*r2*0.016;
  vec3 c;
  c.r=texture2D(u_scene,uv+d*u_ca).r;
  c.g=texture2D(u_scene,uv).g;
  c.b=texture2D(u_scene,uv-d*u_ca).b;
  c+=texture2D(u_bloom,v_uv).rgb*u_bloomAmt;
  c*=u_tint;
  vec3 cc=clamp(c,0.0,1.0);
  c=mix(c,cc*cc*(3.0-2.0*cc),0.20);
  c*=1.0-r2*u_vig;
  c=mix(c,vec3(1.0,0.26,0.22),u_flash);
  c=mix(c,vec3(1.0),u_white);
  c+=(hash(v_uv*vec2(1234.0,5678.0)+u_time)-0.5)*u_grain;
  c*=u_ambient;
  gl_FragColor=vec4(c,1.0);
}`;
  function sh(type,src){
    const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error("shader: "+gl.getShaderInfoLog(s));
    return s;
  }
  function prog(vs,fs){
    const p=gl.createProgram();
    gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));
    // 固定 location：全部 program 共用 0=位置 / 1=附加属性，切换 program 无需重绑
    gl.bindAttribLocation(p,0,"a_pos");gl.bindAttribLocation(p,0,"a_p");
    gl.bindAttribLocation(p,1,"a_col");gl.bindAttribLocation(p,1,"a_uv");
    gl.linkProgram(p);
    if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error("link: "+gl.getProgramInfoLog(p));
    return p;
  }

  /* ---------- 圆查表 ---------- */
  const T12=[],T16=[];
  for(let i=0;i<=12;i++){const a=i/12*U.TAU;T12.push([Math.cos(a),Math.sin(a)]);}
  for(let i=0;i<=16;i++){const a=i/16*U.TAU;T16.push([Math.cos(a),Math.sin(a)]);}

  /* ---------- 批次 ---------- */
  const R={
    n:0,tris:0,
    /* 图元级预留：空间不足时先把已提交的几何整批画出去，
       保证一个三角形永远不会被拆到两个批次里；仅在极端满池时增加 draw call */
    reserve(vertexCount){
      if(this.n+vertexCount*FPV>VB.length)this.flush();
    },
    v(x,y,c,a,t){
      if(this.n+FPV>VB.length)return;
      const k=t||0,r=c[0]+(1-c[0])*k,g=c[1]+(1-c[1])*k,b=c[2]+(1-c[2])*k;
      VB[this.n++]=x;VB[this.n++]=y;VB[this.n++]=r;VB[this.n++]=g;VB[this.n++]=b;VB[this.n++]=a;
    },
    tri(x1,y1,x2,y2,x3,y3,c,a,t){this.reserve(3);
      this.v(x1,y1,c,a,t);this.v(x2,y2,c,a,t);this.v(x3,y3,c,a,t);this.tris++;},
    triG(x1,y1,x2,y2,x3,y3,c1,c2,c3,a,t){this.reserve(3);
      this.v(x1,y1,c1,a,t);this.v(x2,y2,c2,a,t);this.v(x3,y3,c3,a,t);this.tris++;},
    quad(x,y,w,h,c,a,t){this.reserve(6);
      const X=x+w,Y=y+h;
      this.v(x,y,c,a,t);this.v(X,y,c,a,t);this.v(X,Y,c,a,t);
      this.v(x,y,c,a,t);this.v(X,Y,c,a,t);this.v(x,Y,c,a,t);this.tris+=2;},
    quadG(x,y,w,h,ct,cb,a,t){this.reserve(6);
      const X=x+w,Y=y+h;
      this.v(x,y,ct,a,t);this.v(X,y,ct,a,t);this.v(X,Y,cb,a,t);
      this.v(x,y,ct,a,t);this.v(X,Y,cb,a,t);this.v(x,Y,cb,a,t);this.tris+=2;},
    quad4(x,y,w,h,c1,c2,c3,c4,a,t){this.reserve(6);
      const X=x+w,Y=y+h;
      this.v(x,y,c1,a,t);this.v(X,y,c2,a,t);this.v(X,Y,c3,a,t);
      this.v(x,y,c1,a,t);this.v(X,Y,c3,a,t);this.v(x,Y,c4,a,t);this.tris+=2;},
    trap(cx,yt,yb,wt,wb,ct,cb,a,t){this.reserve(6);
      const l1=cx-wt/2,r1=cx+wt/2,l2=cx-wb/2,r2=cx+wb/2;
      this.v(l1,yt,ct,a,t);this.v(r1,yt,ct,a,t);this.v(r2,yb,cb,a,t);
      this.v(l1,yt,ct,a,t);this.v(r2,yb,cb,a,t);this.v(l2,yb,cb,a,t);this.tris+=2;},
    seg(x1,y1,x2,y2,w,c,a,t){this.reserve(6);
      const dx=x2-x1,dy=y2-y1,L=Math.sqrt(dx*dx+dy*dy)||1;
      const nx=-dy/L*w/2,ny=dx/L*w/2;
      this.v(x1+nx,y1+ny,c,a,t);this.v(x2+nx,y2+ny,c,a,t);this.v(x2-nx,y2-ny,c,a,t);
      this.v(x1+nx,y1+ny,c,a,t);this.v(x2-nx,y2-ny,c,a,t);this.v(x1-nx,y1-ny,c,a,t);this.tris+=2;},
    ell(cx,cy,rx,ry,c,a,t,big){
      const T=big?T16:T12,N=big?16:12;
      this.reserve(N*3);
      for(let i=0;i<N;i++){
        const p=T[i],q=T[i+1];
        this.v(cx,cy,c,a,t);
        this.v(cx+p[0]*rx,cy+p[1]*ry,c,a,t);
        this.v(cx+q[0]*rx,cy+q[1]*ry,c,a,t);this.tris++;}},
    ring(cx,cy,rx,ry,w,c,a,t,N){
      N=N||16;this.reserve(N*6);
      for(let i=0;i<N;i++){
        const a1=i/N*U.TAU,a2=(i+1)/N*U.TAU;
        const c1=Math.cos(a1),s1=Math.sin(a1),c2=Math.cos(a2),s2=Math.sin(a2);
        this.v(cx+c1*rx,cy+s1*ry,c,a,t);this.v(cx+c2*rx,cy+s2*ry,c,a,t);
        this.v(cx+c2*(rx-w),cy+s2*(ry-w),c,a,t);
        this.v(cx+c1*rx,cy+s1*ry,c,a,t);this.v(cx+c2*(rx-w),cy+s2*(ry-w),c,a,t);
        this.v(cx+c1*(rx-w),cy+s1*(ry-w),c,a,t);this.tris+=2;}},
    sector(cx,cy,r0,r1,a0,a1,c,a,t,N){
      N=N||14;this.reserve(N*6);
      for(let i=0;i<N;i++){
        const u=a0+(a1-a0)*i/N,v=a0+(a1-a0)*(i+1)/N;
        const cu=Math.cos(u),su=Math.sin(u),cv=Math.cos(v),sv=Math.sin(v);
        this.v(cx+cu*r0,cy+su*r0,c,a*.35,t);
        this.v(cx+cu*r1,cy+su*r1,c,a,t);
        this.v(cx+cv*r1,cy+sv*r1,c,a,t);
        this.v(cx+cu*r0,cy+su*r0,c,a*.35,t);
        this.v(cx+cv*r1,cy+sv*r1,c,a,t);
        this.v(cx+cv*r0,cy+sv*r0,c,a*.35,t);this.tris+=2;}},
    poly(pts,c,a,t){
      for(let i=1;i<pts.length-1;i++)
        this.tri(pts[0][0],pts[0][1],pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1],c,a,t);},
    /* 发光体：亮核心 + 渐淡外晕，供 bloom 提取 */
    glow(cx,cy,rx,ry,c,power,a){
      const p=power||1;
      this.ell(cx,cy,rx*1.9,ry*1.9,c,.055*p*a,0,true);
      this.ell(cx,cy,rx*1.25,ry*1.25,c,.14*p*a,0,true);
      this.ell(cx,cy,rx*.62,ry*.62,c,.42*p*a,0);
      this.ell(cx,cy,rx*.28,ry*.28,C_LITE(c),.85*p*a,0);},
    flush(){
      if(!this.n)return;
      gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
      gl.bufferSubData(gl.ARRAY_BUFFER,0,VB.subarray(0,this.n));
      gl.drawArrays(gl.TRIANGLES,0,this.n/FPV);
      stats.verts+=this.n/FPV;stats.draws++;
      this.n=0;},
    clear(){this.n=0;this.tris=0;}
  };
  function C_LITE(c){return [Math.min(1,c[0]*.4+.62),Math.min(1,c[1]*.4+.62),Math.min(1,c[2]*.4+.62)];}

  /* ---------- FBO ---------- */
  function makeTarget(w,h){
    const tex=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,tex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const fbo=gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER,fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    return {tex,fbo,w,h};
  }
  function killTarget(t){
    if(!t)return;
    gl.deleteTexture(t.tex);gl.deleteFramebuffer(t.fbo);
  }
  function rebuildTargets(){
    killTarget(scene);killTarget(bloomA);killTarget(bloomB);
    scene=bloomA=bloomB=null;
    if(!CR.CFG.QUALITY[quality].post)return;
    scene=makeTarget(W,H);
    const bw=Math.max(2,W>>2),bh=Math.max(2,H>>2);
    bloomA=makeTarget(bw,bh);bloomB=makeTarget(bw,bh);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
  }

  /* ---------- 生命周期 ---------- */
  function init(cv){
    canvas=cv;
    const opts={antialias:false,alpha:false,depth:false,stencil:false,
      preserveDrawingBuffer:false,powerPreference:"high-performance"};
    gl=cv.getContext("webgl2",opts)||cv.getContext("webgl",opts)||cv.getContext("experimental-webgl",opts);
    if(!gl)return false;
    mainProg=prog(SRC_MAIN_VS,SRC_MAIN_FS);
    brightProg=prog(SRC_QUAD_VS,SRC_BRIGHT_FS);
    blurProg=prog(SRC_QUAD_VS,SRC_BLUR_FS);
    compProg=prog(SRC_QUAD_VS,SRC_COMP_FS);
    aPos=gl.getAttribLocation(mainProg,"a_pos");aCol=gl.getAttribLocation(mainProg,"a_col");
    uRes=gl.getUniformLocation(mainProg,"u_res");
    attrP=gl.getAttribLocation(compProg,"a_p");attrUV=gl.getAttribLocation(compProg,"a_uv");
    uni.brightTex=gl.getUniformLocation(brightProg,"u_tex");
    uni.brightThr=gl.getUniformLocation(brightProg,"u_thr");
    uni.blurTex=gl.getUniformLocation(blurProg,"u_tex");
    uni.blurDir=gl.getUniformLocation(blurProg,"u_dir");
    for(const k of ["u_scene","u_bloom","u_time","u_flash","u_white","u_vig",
      "u_bloomAmt","u_ca","u_grain","u_ambient","u_tint"])
      uni[k]=gl.getUniformLocation(compProg,k);
    vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
    gl.bufferData(gl.ARRAY_BUFFER,VB.byteLength,gl.DYNAMIC_DRAW);
    quadVBO=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadVBO);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([
      -1,-1,0,0, 1,-1,1,0, 1,1,1,1,
      -1,-1,0,0, 1,1,1,1, -1,1,0,1]),gl.STATIC_DRAW);
    blankTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,blankTex);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,255]));
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }
  function resize(w,h){
    W=Math.max(320,w|0);H=Math.max(240,h|0);
    canvas.width=W;canvas.height=H;
    S=H/720;
    gl.viewport(0,0,W,H);
    gl.useProgram(mainProg);gl.uniform2f(uRes,W,H);
    rebuildTargets();
  }
  function setQuality(q){
    if(!CR.CFG.QUALITY[q])q="high";
    quality=q;rebuildTargets();
  }
  function begin(){
    stats.tris=0;stats.draws=0;stats.verts=0;
    R.clear();
    const useFBO=!!scene;
    gl.bindFramebuffer(gl.FRAMEBUFFER,useFBO?scene.fbo:null);
    gl.viewport(0,0,useFBO?scene.w:W,useFBO?scene.h:H);
    gl.clearColor(.03,.05,.10,1);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(mainProg);gl.uniform2f(uRes,W,H);
    gl.bindBuffer(gl.ARRAY_BUFFER,vbo);
    gl.enableVertexAttribArray(aPos);gl.vertexAttribPointer(aPos,2,gl.FLOAT,false,FPV*4,0);
    gl.enableVertexAttribArray(aCol);gl.vertexAttribPointer(aCol,4,gl.FLOAT,false,FPV*4,8);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  }
  function useQuad(p){
    gl.useProgram(p);
    gl.bindBuffer(gl.ARRAY_BUFFER,quadVBO);
    gl.enableVertexAttribArray(attrP);gl.vertexAttribPointer(attrP,2,gl.FLOAT,false,16,0);
    gl.enableVertexAttribArray(attrUV);gl.vertexAttribPointer(attrUV,2,gl.FLOAT,false,16,8);
    gl.disable(gl.BLEND);
  }
  function drawQuad(){gl.drawArrays(gl.TRIANGLES,0,6);stats.draws++;}
  function bindTex(unit,tex,loc){
    gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(loc,unit);
  }
  function end(opt){
    opt=opt||{};
    stats.tris=R.tris;
    const Q=CR.CFG.QUALITY[quality];
    if(!Q.post){
      // 直出档：用 1 个全屏 quad 模拟受击闪屏，仍是同一批次
      const f=opt.flash||0,wht=opt.white||0;
      if(f>0)R.quad(0,0,W,H,[1,.26,.22],U.clamp(f*.42,0,.42),0);
      if(wht>0)R.quad(0,0,W,H,[1,1,1],U.clamp(wht*.40,0,.40),0);
      R.flush();gl.bindFramebuffer(gl.FRAMEBUFFER,null);
      return;
    }
    R.flush();
    // 1) 亮部提取 → bloomA
    const bw=bloomA.w,bh=bloomA.h;
    gl.bindFramebuffer(gl.FRAMEBUFFER,bloomA.fbo);gl.viewport(0,0,bw,bh);
    useQuad(brightProg);bindTex(0,scene.tex,uni.brightTex);
    gl.uniform1f(uni.brightThr,Q.bloom ? .66 : .55);
    drawQuad();
    if(Q.bloom){
      // 2) 横向模糊 → bloomB
      gl.bindFramebuffer(gl.FRAMEBUFFER,bloomB.fbo);
      useQuad(blurProg);bindTex(0,bloomA.tex,uni.blurTex);
      gl.uniform2f(uni.blurDir,1/bw,0);drawQuad();
      // 3) 纵向模糊 → bloomA
      gl.bindFramebuffer(gl.FRAMEBUFFER,bloomA.fbo);
      useQuad(blurProg);bindTex(0,bloomB.tex,uni.blurTex);
      gl.uniform2f(uni.blurDir,0,1/bh);drawQuad();
    }
    // 4) 合成到屏幕
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,W,H);
    useQuad(compProg);
    bindTex(0,scene.tex,uni.u_scene);
    bindTex(1,Q.bloom?bloomA.tex:blankTex,uni.u_bloom);
    gl.uniform1f(uni.u_time,opt.time||0);
    gl.uniform1f(uni.u_flash,U.clamp(opt.flash||0,0,1));
    gl.uniform1f(uni.u_white,U.clamp(opt.white||0,0,1));
    gl.uniform1f(uni.u_vig,(Q.bloom ? .48 : .36)+(opt.vigBoost||0));
    gl.uniform1f(uni.u_bloomAmt,Q.bloom ? .85 : 0);
    gl.uniform1f(uni.u_ca,Q.bloom ? .0016 : 0);
    gl.uniform1f(uni.u_grain,Q.bloom ? .022 : .012);
    gl.uniform1f(uni.u_ambient,opt.ambient||1);
    const t=opt.tint||[1,1,1];
    gl.uniform3f(uni.u_tint,t[0],t[1],t[2]);
    drawQuad();
    gl.enable(gl.BLEND);
  }
  CR.gl={init,resize,setQuality,begin,end,R,
    get ready(){return !!gl;},get W(){return W;},get H(){return H;},
    get S(){return S;},get stats(){return stats;},get quality(){return quality;},
    get dpr(){return dpr;},set dpr(v){dpr=v;},
    get gl(){return gl;}};
})(window.CR=window.CR||{});
