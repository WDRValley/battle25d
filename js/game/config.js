/* config.js — 全部数值与数据表 */
(function(CR){
  "use strict";
  const H=CR.u.hex;
  /* ---------- 调色板 ---------- */
  const C={
    white:[1,1,1],black:[.05,.07,.11],shadow:[.02,.04,.07],
    skyTop:[.06,.10,.24],skyMid:[.30,.36,.62],skyLow:[.96,.62,.40],
    sun:[1,.88,.60],haze:[1,.74,.50],
    hillA:[.28,.34,.52],hillB:[.21,.29,.43],hillC:[.15,.24,.35],
    grass1:[.26,.47,.29],grass2:[.11,.24,.19],road1:[.55,.48,.35],road2:[.33,.29,.22],
    leaf1:[.20,.48,.25],leaf2:[.12,.32,.19],leaf3:[.33,.60,.29],
    stone:[.48,.50,.56],stoneDk:[.29,.32,.39],wood:[.44,.29,.18],
    steel:[.80,.86,.94],steelDk:[.40,.46,.56],gold:[1,.79,.30],goldDk:[.66,.45,.12],
    skin:[1,.80,.62],red:[.84,.24,.24],redDk:[.50,.13,.17],
    blue:[.26,.52,.90],blueDk:[.13,.27,.55],purple:[.56,.33,.82],purpleDk:[.30,.16,.50],
    green:[.27,.68,.39],greenDk:[.13,.37,.25],cyan:[.55,.91,1],
    fire:[1,.58,.16],fire2:[1,.91,.48],ice:[.60,.90,1],
    orange:[1,.55,.18],violet:[.72,.42,1],brown:[.53,.35,.22],
    hpbg:[.08,.09,.13],hpRed:[.95,.28,.26],hpBlue:[.30,.68,1],hpOrange:[1,.61,.20],
    hpViolet:[.72,.40,1],hpGold:[1,.82,.32],
    neutral:[.36,.70,.78],neutralDk:[.18,.40,.50],flag:[.86,.25,.25]
  };
  CR.C=C;

  /* ---------- 角色属性 & 4 技能 ---------- */
  const CLASSES=[
    {id:0,name:"战士",title:"磐石守卫",icon:"⚔",color:C.blue,dark:C.blueDk,trim:C.steel,acc:C.gold,
     desc:"高血高防，近身压制。蓄力斩可劈开一整排敌人。",
     hp:180,atk:26,spd:2.45,crit:.08,armor:8,range:82,atkCd:.30,
     stats:[94,38,60,92],
     skills:[
       {name:"裂地斩",icon:"⚔",cd:3.2,cost:12,desc:"前方扇形重击，附加击退"},
       {name:"旋风斩",icon:"🌀",cd:7.0,cost:30,desc:"周身 135 范围连续两段伤害"},
       {name:"冲锋",icon:"➤",cd:8.5,cost:28,desc:"向前突进并撞飞路径上敌人"},
       {name:"战吼",icon:"✹",cd:16,cost:45,desc:"8 秒内提升攻速与攻击，并回复生命"}
     ]},
    {id:1,name:"法师",title:"星霜术士",icon:"✦",color:C.purple,dark:C.purpleDk,trim:C.cyan,acc:C.fire2,
     desc:"脆皮高爆发，火冰雷陨四系范围覆盖。",
     hp:105,atk:19,spd:2.25,crit:.14,armor:2,range:430,atkCd:.42,
     stats:[48,98,46,32],
     skills:[
       {name:"爆裂火球",icon:"☄",cd:2.8,cost:12,desc:"火球命中后爆炸并溅射"},
       {name:"冰霜新星",icon:"❄",cd:8.0,cost:32,desc:"190 范围冻结并减速 2.5 秒"},
       {name:"连锁闪电",icon:"⚡",cd:9.0,cost:34,desc:"在最多 6 个目标间跳跃传导"},
       {name:"天陨",icon:"✷",cd:17,cost:52,desc:"延迟落下的巨型陨石，超高伤害"}
     ]},
    {id:2,name:"射手",title:"疾风游侠",icon:"➶",color:C.green,dark:C.greenDk,trim:C.gold,acc:C.wood,
     desc:"最远射程与最高机动，蓄力箭可贯穿全场。",
     hp:122,atk:15,spd:3.05,crit:.22,armor:4,range:540,atkCd:.20,
     stats:[64,54,92,52],
     skills:[
       {name:"三连箭",icon:"➳",cd:2.6,cost:10,desc:"扇形三支穿透箭"},
       {name:"箭雨",icon:"☂",cd:8.0,cost:30,desc:"前方 12 支落箭覆盖"},
       {name:"翻滚齐射",icon:"↝",cd:8.5,cost:26,desc:"向后翻滚并散射 8 支箭"},
       {name:"贯穿狙击",icon:"◎",cd:16,cost:48,desc:"超远直线高伤，必定暴击"}
     ]}
  ];

  /* ---------- 怪物：高矮胖瘦 / 中立 / 阶级 ---------- */
  const MOBS={
    neutral:{id:"neutral",label:"中立·草灵",hp:70,dmg:8,spd:1.15,scale:1.0,w:1.15,h:.72,
      body:"fat",main:C.neutral,dark:C.neutralDk,trim:C.cyan,acc:C.white,
      bar:C.hpBlue,xp:12,gold:8,drop:.55,ai:"neutral",reach:52},
    minion:{id:"minion",label:"小啰啰",hp:42,dmg:9,spd:2.05,scale:.80,w:.78,h:1.02,
      body:"thin",main:C.red,dark:C.redDk,trim:C.steelDk,acc:C.gold,
      bar:C.hpRed,xp:8,gold:6,drop:.34,ai:"chase",reach:46},
    normal:{id:"normal",label:"步兵",hp:76,dmg:14,spd:1.62,scale:1.0,w:1.0,h:1.0,
      body:"normal",main:C.red,dark:C.redDk,trim:C.steelDk,acc:C.gold,
      bar:C.hpRed,xp:16,gold:12,drop:.46,ai:"chase",reach:52},
    elite:{id:"elite",label:"精英·铁卫",hp:190,dmg:22,spd:1.40,scale:1.34,w:1.34,h:1.18,
      body:"tall",main:C.orange,dark:[.45,.22,.10],trim:C.gold,acc:C.gold,
      bar:C.hpOrange,xp:42,gold:34,drop:.82,ai:"chase",reach:64},
    miniboss:{id:"miniboss",label:"小统领",hp:390,dmg:28,spd:1.25,scale:1.68,w:1.55,h:1.02,
      body:"fat",main:C.purple,dark:C.purpleDk,trim:C.gold,acc:C.gold,
      bar:C.hpViolet,xp:90,gold:80,drop:1,ai:"chase",reach:80},
    boss:{id:"boss",label:"黑石城主",hp:920,dmg:36,spd:1.05,scale:2.15,w:1.62,h:1.30,
      body:"tall",main:C.redDk,dark:C.black,trim:C.gold,acc:C.gold,
      bar:C.hpGold,xp:260,gold:240,drop:1,ai:"boss",reach:100}
  };
  const MOB_ORDER=["neutral","minion","normal","elite","miniboss","boss"];

  /* ---------- 背包 ---------- */
  const MATERIALS={
    iron:{name:"铁矿石",icon:"⬡",color:C.steelDk,desc:"锻造护甲的基础矿料"},
    dust:{name:"魔尘",icon:"✧",color:C.violet,desc:"法术回路的催化剂"},
    hide:{name:"兽皮",icon:"▤",color:C.brown,desc:"缝制轻甲与箭袋"},
    crystal:{name:"辉晶",icon:"◆",color:C.cyan,desc:"蕴含元素能量的结晶"},
    rune:{name:"古符文",icon:"❖",color:C.gold,desc:"城堡深处掉落的铭文残片"},
    ember:{name:"余烬核",icon:"●",color:C.fire,desc:"BOSS 身上剥落的炽热核心"}
  };
  const ITEMS={
    potion:{name:"生命药水",icon:"✚",color:C.green,desc:"立即回复 45 点生命",type:"heal",val:45},
    tonic:{name:"能量药剂",icon:"✦",color:C.cyan,desc:"立即回复 60 点能量",type:"energy",val:60},
    charm:{name:"锐锋护符",icon:"⚔",color:C.gold,desc:"本局攻击力 +18%",type:"buff",val:.18},
    feather:{name:"疾风羽",icon:"➶",color:C.white,desc:"本局移速 +20%",type:"speed",val:.20},
    bomb:{name:"震爆弹",icon:"✷",color:C.fire,desc:"对周围敌人造成 90 点伤害",type:"bomb",val:90}
  };
  const DROP_TABLE=[
    {k:"mat",id:"iron",w:24},{k:"mat",id:"dust",w:20},{k:"mat",id:"hide",w:18},
    {k:"mat",id:"crystal",w:14},{k:"mat",id:"rune",w:8},{k:"mat",id:"ember",w:4},
    {k:"item",id:"potion",w:10},{k:"item",id:"tonic",w:8},
    {k:"item",id:"charm",w:4},{k:"item",id:"feather",w:3},{k:"item",id:"bomb",w:5}
  ];
  const UPGRADES=[
    {id:"hp",name:"体魄",desc:"最大生命 +12 / 级",cost:["iron","iron"]},
    {id:"atk",name:"力量",desc:"攻击力 +2 / 级",cost:["iron","crystal"]},
    {id:"spd",name:"迅捷",desc:"移速 +3% / 级",cost:["hide","hide"]},
    {id:"crit",name:"精准",desc:"暴击率 +1.5% / 级",cost:["dust","crystal"]},
    {id:"armor",name:"护甲",desc:"减伤 +1.5 / 级",cost:["iron","hide"]}
  ];

  /* ---------- 区域（视觉主题 + 应景配乐） ---------- */
  const ZONES=[
    {id:"meadow",name:"翠风原野",start:0,end:2200,music:"field",
     skyTop:H("#0d2a4a"),skyMid:H("#4f86a8"),skyLow:H("#f6c88a"),
     hillA:H("#3d6b63"),hillB:H("#2c5650"),hillC:H("#1d403c"),
     grass1:H("#3c7a48"),grass2:H("#1c4629"),tint:[1.0,1.02,.98],ambient:.95},
    {id:"dusk",name:"赤霞隘口",start:2200,end:4500,music:"battle",
     skyTop:H("#241029"),skyMid:H("#8a3d55"),skyLow:H("#ff9a5c"),
     hillA:H("#6b3a54"),hillB:H("#4b2740"),hillC:H("#331a2f"),
     grass1:H("#6a4c3c"),grass2:H("#3a2a24"),tint:[1.06,.94,.92],ambient:.88},
    {id:"castle",name:"黑石城堡",start:4500,end:7200,music:"boss",
     skyTop:H("#080a1c"),skyMid:H("#20244a"),skyLow:H("#5c3a63"),
     hillA:H("#2a2d48"),hillB:H("#1c1f36"),hillC:H("#121426"),
     grass1:H("#34374a"),grass2:H("#1a1c2c"),tint:[.92,.94,1.10],ambient:.78}
  ];

  /* ---------- 波次 ---------- */
  const WAVES=[
    {x:820 ,zone:0,list:["minion","minion","minion","normal"],neutral:2},
    {x:1750,zone:0,list:["minion","minion","normal","normal","elite"],neutral:1},
    {x:2700,zone:1,list:["minion","normal","normal","elite","minion"],neutral:2},
    {x:3600,zone:1,list:["normal","normal","elite","elite","miniboss"],neutral:1},
    {x:4550,zone:2,list:["minion","minion","normal","elite","elite"],neutral:2},
    {x:5450,zone:2,list:["normal","elite","elite","miniboss","normal"],neutral:1},
    {x:6250,zone:2,list:["elite","elite","miniboss","miniboss"],neutral:0},
    {x:6850,zone:2,list:["minion","normal","elite","boss"],neutral:0,boss:true}
  ];
  const LEVEL_W=7200;

  const QUALITY={
    high:{name:"高",dpr:1,bloom:true,post:true,parts:360,props:true,label:"全后期 · 1× 分辨率"},
    medium:{name:"中",dpr:1,bloom:false,post:true,parts:260,props:true,label:"暗角调色 · 无辉光"},
    low:{name:"低",dpr:.85,bloom:false,post:false,parts:170,props:true,label:"直出画面 · 0.85× 分辨率"},
    saver:{name:"省电",dpr:.7,bloom:false,post:false,parts:110,props:false,label:"0.7× 分辨率 · 精简场景"}
  };

  const KEY_LABELS={
    KeyA:"A",KeyB:"B",KeyC:"C",KeyD:"D",KeyE:"E",KeyF:"F",KeyG:"G",KeyH:"H",
    KeyI:"I",KeyJ:"J",KeyK:"K",KeyL:"L",KeyM:"M",KeyN:"N",KeyO:"O",KeyP:"P",
    KeyQ:"Q",KeyR:"R",KeyS:"S",KeyT:"T",KeyU:"U",KeyV:"V",KeyW:"W",KeyX:"X",
    KeyY:"Y",KeyZ:"Z",Digit1:"1",Digit2:"2",Digit3:"3",Digit4:"4",Digit5:"5",
    Digit6:"6",Digit7:"7",Digit8:"8",Digit9:"9",Digit0:"0",
    Numpad1:"小键盘1",Numpad2:"小键盘2",Numpad3:"小键盘3",Numpad4:"小键盘4",
    Numpad5:"小键盘5",Numpad6:"小键盘6",Numpad7:"小键盘7",Numpad8:"小键盘8",
    Numpad9:"小键盘9",Numpad0:"小键盘0",Space:"空格",ShiftLeft:"左Shift",
    ShiftRight:"右Shift",ControlLeft:"左Ctrl",ControlRight:"右Ctrl",AltLeft:"左Alt",
    AltRight:"右Alt",Tab:"Tab",ArrowUp:"↑",ArrowDown:"↓",ArrowLeft:"←",ArrowRight:"→",
    Enter:"回车",Backquote:"`",Minus:"-",Equal:"=",BracketLeft:"[",BracketRight:"]",
    Semicolon:";",Quote:"'",Comma:",",Period:".",Slash:"/",Backslash:"\\"
  };
  const ACTIONS=[
    {id:"up",name:"上移 / 纵深后"},{id:"down",name:"下移 / 纵深前"},
    {id:"left",name:"左移"},{id:"right",name:"右移"},
    {id:"attack",name:"普攻 / 长按蓄力"},{id:"jump",name:"跳跃 / 二段跳"},
    {id:"s1",name:"技能 1"},{id:"s2",name:"技能 2"},
    {id:"s3",name:"技能 3"},{id:"s4",name:"技能 4"}
  ];
  const DEFAULT_BINDINGS={up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",
    attack:"KeyJ",jump:"KeyK",s1:"KeyQ",s2:"KeyE",s3:"KeyR",s4:"KeyT"};

  CR.CFG={CLASSES,MOBS,MOB_ORDER,MATERIALS,ITEMS,DROP_TABLE,UPGRADES,ZONES,WAVES,
    LEVEL_W,QUALITY,KEY_LABELS,ACTIONS,DEFAULT_BINDINGS};
})(window.CR=window.CR||{});
