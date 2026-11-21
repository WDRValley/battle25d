/* config.js — 全部数值与数据表 · v1.4 dev5 */
(function(CR){
  "use strict";
  const H=CR.u.hex,U=CR.u;

  /* ================= 版本 / 更新日志 / 版本预告 ================= */
  const VERSION="1.4 dev5.1.1";
  const PRERELEASE="1.4 dev5.1";
  const VERSIONS=[
    {
      ver:"1.4 dev5.1.1",status:"preview",date:"2026-11-21",codename:"副件契约修订",type:"修订版",
      title:"修订版 · 《标准副件悬浮文本框架 V3.0》与同名 BUFF 机制",
      summary:"按《标准副件悬浮文本框架 V3.0》重做副件悬浮文本：主面板直出 + 细虚线分隔，已契约时按实际装配段动态生成「原生色宽色阶@实际段长段色」，未契约不带 @；彻底移除把示例装配场景硬写进赤霄静态描述的理解偏差。面向玩家文本统一为「碧 / 赤」，不再出现代际称谓。补齐【名称解释】威力提升 · 神兵的完整计算方式与同名 BUFF 顶替规则，并把该规则实装为通用游戏机制；护盾与 BUFF 改为按队伍槽位隔离、后台照常计时；副件、八维等级、护盾与增益方块悬浮说明全面补全。",
      added:[
        "【副件悬浮 V3.0】新增 spirit_std.js：标题 / 契约者 / 级别 / 数量与类型 / 简介 → 虚线 → 被动「神兵之力」a/b/c → 神兵技 → 虚线 →【名称解释】→ 虚线 → 获取途径；支持设置里的简略模式与超长自动滚动",
        "【动态契约信息】「原生色宽色阶@实际段长段色」不再写进神兵描述，而是已契约时从 soulpath.state(cls).segs 读取真实装配段生成；未契约只显示「级别 | 原生色阶」，契约者行只在该副件确实被装配时出现",
        "【通用 BUFF 容器】新增 buffs.js：不同名增益在同一乘区加算、同名顶替（剩余时间长优先 → 时间相同取数值高）、常驻 BUFF 不计时、按队伍槽位隔离、前台与后台一起倒计时；伤害公式由连乘改为加算乘区 1 + 战吼 + 威力提升 · 神兵",
        "【悬浮说明补全】八维等级方块显示当前倍率与「速度 -6 级」式说明；BUFF 方块显示效果、剩余时间、常驻标记与顶替规则；护盾方块显示三类数值、剩余秒数与「切换不传递」说明"
      ],
      fixed:[
        "修复【赤霄描述写死装配示例】：那只是「9 赤角色拆成 6+3、把原生 9 碧的赤霄装在 6 赤段上」的示例场景，现已改为运行时装配信息，静态描述只保留简介与数值",
        "修复【面向玩家出现代际称谓】：8 件神兵简介、灵路摘要、持有卡片、帮助页、版本日志与 README 全部改为中性「碧 / 赤」；内部 gen 仅用于数值区分",
        "修复【护盾随切换角色传递】：护盾与到期时间改为按队伍槽位快照 / 恢复，小射 100 真实护盾 → 小战 0 → 切回小射仍 100（未到期）；后台护盾按绝对时间照常到期",
        "修复【后台 BUFF 不计时】：旧式增益在 team.tick 里对后台三个槽位照常倒计时；常驻 BUFF 由 buffs.js 标记 permanent 不清除",
        "修复【神兵 BUFF 全局单例】：「威力提升 · 神兵」改为按契约者槽位存储与触发，CD 也按角色独立；切换角色不再继承别人的加成",
        "修复【威力提升与爆伤可被压到 0】：装配后按 V3.0「至少 +1%」保底，未装配不生效"
      ],
      optimized:[
        "同一威力乘区内不同名增益加算：威力 50 × (100% + 「威力提升」12% + 「威力提升 · 神兵」30%) = 71，不再连乘",
        "同名 BUFF 顶替规则实装并适用于任何同类 BUFF（速度提升、爆伤提升等）；33%/40s 保留优先于 45%/30s，时间相同时 60% 优先于 30%",
        "八维战斗等级切回清零、异常状态切回清除的既有规则保持不变；常驻 BUFF 时间无限、不受切换影响",
        "副件悬浮文本超长时沿用 dev4.1 的自动缓慢滚动，鼠标移开即停止"
      ],
      changed:[
        "版本号进入 v1.4 dev5.1.1（修订版）；dev5.1 归档为已发布，dev5.2「副件扩展与学院生活」预告不变",
        "新增 js/game/buffs.js 与 js/game/spirit_std.js，共 37 个 JS；资源指纹 ?v=1.4dev5.1.1",
        "README、帮助页、操作表与文件职责表按 V3.0 口径重写"
      ]
    },
    {
      ver:"1.4 dev5.1",status:"released",date:"2026-11-21",codename:"短CD与养成归位",type:"预览版",
      title:"预览版 · PP / MP 重定义、短 CD、养成界面归位与夜樱试炼根除",
      summary:"按反馈重做资源节奏：取消 PP 自然回复，改为 MP 每秒回 1 点；PP 只能通过魔法泉水、恢复类道具或 100 金币【一键补给】恢复；全部技能 CD 压缩到 1.0~4.0s，由 PP 兜底约束释放次数。灵路 / 副件与一键补给从背包搬进【角色 / 队伍】页；天赋重置改为消耗 1 枚洗髓丹随机刷新一项资质（不再清空到 1 星），新号初始晶豆改为 0；移动端区域信息卡加收起按钮与宽度限制，不再遮挡 BOSS 血条与角色状态；根除夜樱试炼 BOSS 出现在地图入口的旧 bug。",
      added:[
        "【PP 回复途径】魔法泉水、【高级小型能量药剂】等恢复道具、【一键补给】(100 金币) 现在都会补满 / 恢复技能 PP；面板与提示文案同步写明「PP 不会自然回复」",
        "【区域信息卡】右上角常驻卡新增 ▾ 收起按钮（状态写入存档）、最大宽度限制与超长文本省略；设置面板新增【显示区域信息卡】开关；移动端默认简略显示，展开时也不再压住 BOSS 血条与角色状态",
        "【版本预告】dev5 归档为已发布，dev5.1 置顶；下一版预告改为 v1.4 dev5.2"
      ],
      fixed:[
        "修复【夜樱 BOSS 试炼出现在地图入口而非对话点】：根因是切图 / 复活后残留的试炼 BOSS 脱离 bossRef 被通用 AI 一路追到入口，且生成锚仍可能取到被相机拖回的 P.x。现在试炼唯一以对话点 cfg.x/cfg.depth 为锚，玩家吸附到对话点、相机同步、显式解除 camLock，并在 harbor.init / 复活时清理残留 sakuraBoss",
        "修复【技能配置面板与局内技能格仍提示 PP 自然回复】：取消战斗中 6s / 脱战 2s 回 1 PP 的逻辑，避免 8s CD 技能等于无限 PP",
        "修复【重置天赋一键清空到 1 星并返还晶豆】：改为消耗洗髓丹 ×1 随机刷新一项资质，其余 5 项与晶豆原样保留",
        "修复【新号初始晶豆 1280】：BEAN_START 改为 0，晶豆只能靠任务 / 游戏内获取",
        "修复【灵路副件与一键补给放在背包页】：两者都是养成功能，已整体搬入【角色 / 队伍】页"
      ],
      optimized:[
        "技能 CD 由 2.6~18s 压缩到 1.0~4.0s，保留原梯度；PP 分档仍按原 CD 强度计算（15 / 10 / 6 / 4），短 CD 下由 PP 与药水 CD 双重约束，不会超模",
        "MP 自然回复统一为每秒 1 点（原 2.2 点 / 秒），普攻命中的即时回蓝保留；MP 同时仍是副件总供能池",
        "区域信息卡在窄屏只显示当前分区与天气简略信息，完整子区域路径收进【G 区域情报】面板",
        "一键补给同时补满全队 HP / MP / PP，并清空技能 CD 与异常状态，脱战可用"
      ],
      changed:[
        "版本号进入 v1.4 dev5.1；dev5 归档为已发布，版本面板默认只显示当前版与上一版",
        "【角色 / 队伍】(C) 新增：灵路 · 副件、神兵持有、一键补给；【背包】(B) 回归纯物品 / 材料 / 道具 / 装备存放",
        "帮助页「B → 灵路」改为「C → 灵路」；操作表、README、资源指纹 ?v=1.4dev5.1 全部同步",
        "12 色灵路、战斗辅助 / 非战斗辅助副件、附魔 / 鉴定 / 强化、工会委托与徽章刷卡顺延至 dev5.2"
      ]
    },
    {
      ver:"1.4 dev5",status:"released",date:"2026-11-21",codename:"灵路与神兵",type:"预览版",
      title:"预览版 · 副件 / 灵路系统整合规格 0.4 首次落地",
      summary:"新增副件与角色灵路系统：小战 / 小法 / 小射 / 夜樱各带 9 赤灵路，按 9 / 6+3 / 3+3+3 / 1×9 离散拆分，供能、色阶、有效色宽、品质 Q、瓶颈 β、启动惩罚、碎片惩罚、多配边际与调度税、MP 总供能 G、显化槽全部按《9.1 整合规格 0.4》封闭计算。上架 8 件战斗增益型副件【神兵】至巴恩工坊（神兵 ≠ 装备、不占装备槽）；全部技能加入 PP 短期次数并在技能配置面板显示 PP 与蓝耗；【威力提升 · 神兵】作为限时 BUFF 加粗显示并带圆形扫描倒计时。",
      added:[
        "【灵路系统】四名角色各自 9 赤灵路，可切换 9 / 6+3 / 3+3+3 / 1×9 四种合法拆解；段长只允许 1 / 3 / 6 / 9，不出现 5+4；跨段合流供能按碎片惩罚 F(k)=max(0.45,1-0.08(k-1)) 计，C=1 的单段吃启动惩罚 L(1)=0.192，1×9 被压到收藏级",
        "【副件 · 神兵】8 件战斗增益型副件：碎星大剑 / 月光疾风剑 / 龙骨巨剑（A）、冰封霜哀 / 荒芜收割者（S）、轩辕 / 赤霄 / 猎龙者之刃（X），分赤系与碧系两套品质参数；神兵不是武器、不进 EQUIPMENT、不改装备栏，只占灵路，永久限购 1",
        "【巴恩工坊】8 件神兵上架（900~9800 金币），商店支持副件购买、悬浮说明与永久限购；背包新增【灵路 · 副件】分区与【神兵】持有列表",
        "【技能 PP】全部技能按冷却分档获得 PP（普通 15 / 中 10 / 大招 6 / 终极 4），放一次扣 1，战斗中每 6 秒、脱战每 2 秒自然回 1；技能配置面板与局内技能格同时显示「PP n/max · 蓝耗 X MP」；PP 归零技能灰显并提示用【高级小型能量药剂】恢复（每个技能 +2 PP）",
        "【神兵之力】BOSS 战触发加粗 BUFF「威力提升 · 神兵」：持续 45 秒、CD 450 秒，圆形扫描倒计时显示在状态面板；常驻爆伤加成与限时威力提升均受双攻阈值 S_attr 与灵路最终效率 E 缩放，Lv1 角色无法白嫖高级法器",
        "【赤霄 · 碎灵】激活 a 效果 ≥70% 后，技能命中自动触发神兵技【碎灵】（CD 1s、普通系、威力 0.01）：命中非头领该技能基础威力 +0.5、头领 +1.2；释放技能后巨剑带热浪在局内拍下（主显化槽）",
        "【灵路 UI】背包内提供灵路总条（金 9 / 蓝 6 / 绿 3 / 灰 1 按容量比例）、拆分按钮、装配槽列表、同色高亮联动、效率拆解 E_power / F / L / G / S / M / T、总供能条与 0.8D 缓冲线，以及欠容量 / 色宽余量浪费 / 供能不足 / 属性未达阈值 / 调度税 / 显化槽占用等警告",
        "【显化槽】主显化 1 + 辅助显化 1，其余副件只显示灵路环 / 图标不生成实体，最多 2 个局内实体，不改变任何数值"
      ],
      fixed:[
        "修复【高级小型能量药剂 PP 字段空转】：dev4 只结算能量、pp:2 未接入；现在点击使用 / 拖入道具槽都会为当前角色 4 个已装备技能各回 2 PP",
        "修复【技能配置面板键位写死 Q/E/R/T】：dev1.4 默认键已改为 U/I/O/L，面板槽位标签仍显示旧键；现按 settings.bindings 实时显示",
        "修复【PP 与 MP 混用】：技能消耗 MP（能量）与消耗 PP（短期次数）彻底分离，PP 不进存档、切角色 / 进图 / 复活回满，避免刷新游戏刷次数"
      ],
      optimized:[
        "效率与强度分离：效率 E∈[0,1] 只由灵路适配决定，品质 Q 只负责版本强度与推荐度，不塞进效率公式",
        "颜色匹配按有效色宽需求品质 Q_req=W·e_R 计算，高色装低需求封顶 100% 并提示余量浪费，低色装高需求用容量补偿；赤 9 装碧系 A/S 满效率、X 约 89.2%，不再被整体压到 76%",
        "多配三层约束：同类型 0.9 边际 + 低品质调度税 T_m + 总供能 G，双 X 约 133~137%、三 X 约 156~160%，三 S < 单 X、三 A < 单 S，单件满色宽仍标「推荐」",
        "技能消耗 MP 后总供能系数 G 带 0.8D 缓冲与 1.5 秒平滑跟随，连发技能不会让副件效率逐帧抖动"
      ],
      changed:[
        "版本号进入 v1.4 dev5；dev4.1 归档为已发布，版本面板默认只显示当前版与上一版，下一版预告为 v1.4 dev5.1",
        "副件与装备彻底分家：EQUIPMENT / 装备栏 / 一键卸下只管武器防具；副件走 SV.data.spirits + SV.data.soulpath，独立悬浮说明与效率面板",
        "非战斗辅助型副件（魔法披肩 / 自动拾取 / 驱散挂饰 / 隐身戒指）与战斗辅助型副件（精灵 / 灵宠 / 灵兽 / 坐骑形态）、12 色灵路、附魔 / 鉴定 / 强化按文案仍未实装，写入 dev5.1 预告"
      ]
    },
    {
      ver:"1.4 dev4.1",status:"released",date:"2026-11-21",codename:"入学考核 · 见习术士",type:"预览版",
      title:"预览版 · 魔法大学城入学前置与见习术士套件",
      summary:"补上【魔法大学城】的开启前置条件：在雨沼边境走廊西郊城门的新生接待员处缴纳 9900 金币报名、领取 11 件绿装【见习术士套件】，展示任意元素技能通过考核取得入内凭据与铜/银/金学员徽章，再经城门石像鬼守卫核实后方可解锁大地图节点。同时重写大学城四区 8 套 BGM、重做旗帜广场开阔地貌与工会堂室内大厅、修复交互/巡逻/泉水等一系列问题。",
      added:[
        "【入学前置链】魔法大学城默认上锁：新生接待员报名（9900 金币 + 见习术士套件 11 件）→ 元素技能考核 → 入内凭据 + 铜/银/金学员徽章（按角色等级）→ 城门石像鬼守卫核实 → 解锁大地图节点；未解锁时节点灰显并明确提示流程",
        "【见习术士套件】11 件绿装统一「入门之」前缀，覆盖头/躯/足/主手/副手/双手六槽；法帽归头部·帽子、护靴归足部·鞋子（按装备规范修正文案笔误），魔戒/魔珠/笔记/权杖等为法师双手武器，木剑为战士单手中武，魔盾为通用副手；见习练习魔棒为学院统一配发，四职业均可持，方便任意角色凑满 5 件",
        "【套装 · 魔法的指引V1】按 2 / 4 / 5 件分档：2 件技能命中后 80% 提升双攻 1 级、暴击额外双防 1 级（CD 3s）；4 件蓄力≥2 层速度 +33% 持续 3s（CD 40s）；5 件速度 +7%，首次生命低于 80% 获得 40+20% 最大生命（上限 220）法术护盾（CD 80s）",
        "【套装档位修正】共 11 件但六槽中双手武器占用主手与副手，最多只能同时装备 5 件（头 + 躯 + 足 + 主手 + 副手），故最高档由 6 件改为 5 件；恢复标准双手互斥规则，撤去上一版「练习法器可与单手 / 副手同戴凑 6 件」的例外，旧存档里超出规则的装备会自动归还背包",
        "【历史版本归档】版本面板默认只显示当前版与上一版，旧日志移入 versions_history.js 并由【查看历史版本】按钮展开，config.js 体积显著减小",
        "【悬浮文本自动滚动】装备说明超过屏幕高度时自动缓慢滚动展示（如不朽神装之神圣审判镰），不再被裁切"
      ],
      fixed:[
        "修复【魔法大学城内按 F 全部交互无反应】：bindInput 的 interact 回调漏挂 university 分支，NPC / 采集点 / 交互点全部点不动；现补全转发",
        "修复【法师/夜樱装备戒系武器后无法攻击】：wtypeTags 漏把 ring 归入 arcane，戒指被误判为战士系武器；现戒系与书/杖/法器同属法术能力标签",
        "修复【大学城野怪自由巡逻】：安全区中立 / 半中立单位改为定点驻守（被攻击或进入领地才行动），脱战仍平滑归位",
        "修复【旗帜广场不开阔 / 工会堂内部有一排房子】：广场房屋收拢到两端、中央让出大片石板；工会堂改为完整室内大厅，不再绘制街屋剪影与户外房屋",
        "修复【大学城 BGM 与前置地图雷同、昼夜不契合】：四区 8 套配乐全部重谱（鲁特琴市集 / 弦乐竖琴合唱广场 / 管风琴混响大厅 / 木管吉他社区），并加入音色分层，夜间为独立慢板",
        "修复【泉水秒回满】：改为在泉水范围内停留 2 秒才恢复全队生命，带进度提示与音效",
        "修复【神圣审判镰悬浮文本】：锁灵加粗并补「无法提升战斗时的 8 维属性」名词备注；可采集类型去掉果树与钓鱼点",
        "修复【大地图已通关却直接开放大学城】：解锁条件由 duskCleared 改为 cityPermit"
      ],
      optimized:[
        "四个子区域的白昼 / 夜间配乐各有独立和弦进行、调式、旋律与音色层级，跨区淡入淡出不再串味",
        "工会堂室内补齐石砖地面、穹顶肋、吊灯与地毯；旗帜广场补放射状石板、鸽子与远处尖顶剪影",
        "版本日志数据拆表后，新增版本只需在 config.js 追加一条，历史归档不再膨胀主配置"
      ],
      changed:[
        "版本号进入 v1.4 dev4.1；dev4 归档为已发布，下一版预告为 v1.4 dev4.2",
        "服装店幻化、工坊强化/附魔、公寓购买/租用、图书馆、任务堂、宿舍、竞技场、进城刷卡与 PP 系统按文案仍只保留入口与说明，不实装数值逻辑"
      ]
    },
{
      ver:"1.4 dev4",status:"released",date:"2026-11-21",codename:"魔法大学城",type:"预览版",
      title:"预览版 · 魔法大学城（四子区域主线区）",
      summary:"开放第七张开放地图【魔法大学城】：集市外街 / 旗帜广场 / 魔法工会堂 / 魔法公寓区四段子区域，各自配专属白昼与夜间 BGM，补齐全部 NPC、路人、资源点与交互点；旗帜广场泉水可恢复全队生命。修复法师 / 射手在主体・主手槽看不到、穿不上工具属性装备的回归问题，并把小鱼叉调整为单手・矛系・中武・钓鱼工具。服装店幻化、工坊强化 / 附魔、公寓购买 / 租用、学院招生考核、PP 系统均只保留入口与文案，本版不实装。",
      added:[
        "【新地图 · 魔法大学城】7600px 四段子区域，整体安全区；集市外街（默认落点）→ 旗帜广场 → 魔法工会堂（室内）→ 魔法公寓区，地面、天空、建筑与光照按分区自然切换",
        "【8 套专属 BGM】市集鲁特琴 / 手风琴 / 木笛、广场弦乐竖琴轻合唱、工会堂管风琴与羊皮纸混响、公寓木管吉他轻弦乐，各含白昼 / 夜间版本，跨区淡入淡出",
        "【NPC 与路人】便利店掌柜图拉、服装店老板娘苏安、街头魔法工坊坊主巴恩、学院值勤法师、巡逻队值勤员、乞丐老铜杯、古怪占卜师、工会堂管理员、委托板接待员、维护法师、古怪老法师、公寓管理员共 12 位可交互 NPC；4 区共 21 位移动路人，全部带头顶姓名标签与悬浮说明",
        "【旗帜广场 · 魔法泉水】靠近中央泉水雕塑可使全队生命值恢复满，带水雾淡蓝微光与恢复提示",
        "【资源与交互点】橘子树 ×2、草丛 ×2、菇丛 ×2、废弃铜铁矿堆 ×1、森林巨杉 ×2；工会堂委托板 / 公告板 / 登记柜台 / 卷轴柜 / 长椅 / 魔法灯，公寓区告示栏 / 门房柜台 / 长椅 / 花池 / 路灯均可查看悬浮说明",
        "【商店】图拉日限 10 的补给、日限 20 的果蔬、日限 2 的匕首 / 采集者手套 / 木纹手杖；巴恩工坊日限 6 的伐木斧 / 匕首 / 小鱼叉 / 木纹手杖，价格略贵形成差价；新增【高级小型能量药剂】（恢复 25 能量，PP 系统仅预留）",
        "【可攻击对象】集市外街半中立蹦蹦种子 ×2、旗帜广场中立草浮灵 ×2，数值 ≥ 雨沼边境走廊的 2 倍；工会堂与公寓区无野怪；三类 AI 沿用发现提示、领地仇恨与平滑归位标准",
        "【区域情报】第七张地图的 NPC / 野怪 / 资源点悬浮说明，大地图节点与局内世界标签同样可查看"
      ],
      fixed:[
        "修复【工具属性装备回归 BUG】：法师 / 射手（含夜樱）在主体 / 主手栏看不到、也穿不上带工具属性的装备。根因是装备库按 it.slot===eqSlotTarget 严格过滤，且穿戴重定向只做了「主手 → 双手」单向；带 allow:[0] 的工具武器在另一槽位入口会被槽位校验挡下。现改为工具属性统一识别、双手 / 主手双入口都列出并自动重定向到声明槽位，四职业 × 两槽 × 全部工具武器实测可见可穿",
        "修复【单手工具战斗判定缺失】：小鱼叉改为单手后，旧 weaponProvides() / combatState() 只检查双手槽，会误判法师 / 射手仍可普攻。现统一扫描双手 / 主手 / 副手中的工具并按职业规则给出攻击限制与倍率",
        "修复【小鱼叉定位】：由双手改为单手・矛系・中武・工具属性（钓鱼）；长杆鱼叉本版保持双手，按文案留待后续版本统一调整",
        "修复【钓鱼类工具悬浮文本缺段】：GATHER_MAP 缺 fish 映射，小鱼叉 / 长杆鱼叉 / 钓竿不显示「可采集类型」行；WTYPE_CN 缺 rod，钓竿整段「适配」消失。现补 fish→钓鱼点 / 浅水、rod→竿系（归属工具系），三件工具 13 段齐全",
        "修复【适配行文字重复】：工具装备此前渲染成「双手·工具·矛系·工具 | 中武武」。现归属系按武器系别推导、重量只输出一次，规范为「适配：主手·战士系·矛系 | 中武」"
      ],
      optimized:[
        "商店面板复用同一套限量交易 UI，按地图切换沼泽 / 边境 / 大学城三组数据源，不新增重复面板",
        "室内工会堂与公寓区不绘制全局雨雪、改用暖光与彩窗透光；集市外街与旗帜广场保留全局天气和夜间灯火",
        "大地图第三行预告节点转为可进入节点，沿用 dev1.5 的资源指纹与启动自检，HTTP / FILE 双协议均可用"
      ],
      changed:[
        "版本号进入 v1.4 dev4；dev3 归档为已发布，下一版预告为 v1.4 dev4.1（工会委托 / 学院招生考核 / 公寓与幻化系统）",
        "服装店皮肤 / 幻化、工坊强化 / 附魔 / 合成、公寓购买 / 租用、学院招生考核、PP 系统按文案仅保留入口与说明，不实装数值逻辑"
      ]
    },
    {
      ver:"1.4 dev5.2",status:"planned",date:"计划中",codename:"副件扩展与学院生活",type:"预告",
      title:"下一版计划 · 副件扩展与学院生活",
      summary:"在 dev5 / dev5.1 的灵路框架上扩展战斗辅助型副件（精灵 / 灵宠 / 灵兽与坐骑形态）、非战斗辅助型副件（魔法披肩 / 自动拾取 / 驱散挂饰 / 隐身戒指）与 12 色灵路；同时推进工会委托、公寓、徽章刷卡入场与附魔 / 鉴定 / 强化。",
      added:["战斗辅助型副件：元素精灵协助攻击，宠物属性 = 基础 + 主人属性 × 转化系数 × E × G；灵兽 / 坐骑双形态切换","非战斗辅助型副件：魔法披肩纯视觉、自动拾取、驱散挂饰、隐身戒指（主动攻击或受击破隐）","12 色灵路：9+3 / 6+6 / 6+3+3 / 3×4 / 1×12 离散拆解与显化槽扩展","工会堂委托板接取、公寓购买 / 租用、图书馆 / 任务堂 / 宿舍 / 竞技场凭学员徽章刷卡进入","按《装备规范 v4.0》开启附魔 / 鉴定 / 强化数值逻辑"],
      fixed:[],optimized:[],changed:["学员徽章铜 / 银 / 金三级权限在后续版本生效","副件三类（战斗增益 / 战斗辅助 / 非战斗辅助）纳入同一效率框架"]
    }
  ].concat((CR.VERSION_HISTORY||[]).slice());

  /* ================= 等级 / 经验 ================= */
  const MAX_LEVEL=100;
  /* 1→100 累计约 1,043,625 经验（约 104 万），与参考项目的平方曲线同量级 */
  function expFormula(lv){return Math.floor(lv*lv*2.5+lv*45);}
  function totalExpToMax(){let t=0;for(let l=1;l<MAX_LEVEL;l++)t+=expFormula(l);return t;}

  /* ================= 调色板 ================= */
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
    neutral:[.36,.70,.78],neutralDk:[.18,.40,.50],flag:[.86,.25,.25],
    pink:[1,.63,.80],pinkDk:[.72,.30,.52],sakura:[1,.78,.88],
    lantern:[1,.62,.24],lanternGlow:[1,.82,.38],
    sand:[.76,.64,.44],sandDk:[.52,.42,.29],
    tile:[.55,.57,.64],tileDk:[.34,.36,.44],
    cloth:[.86,.32,.36],cloth2:[.28,.55,.70],cloth3:[.85,.68,.32],
    candy:[1,.60,.72],candyDk:[.68,.30,.44],
    kite:[.48,.80,.94],kiteDk:[.20,.42,.62],
    ghost:[.82,.94,1],rain:[.62,.76,.92],snow:[.94,.97,1],
    /* 装备专用 */
    iron:[.58,.63,.70],ironDk:[.28,.32,.39],leather:[.55,.36,.20],
    /* 星火港专用 */
    sea:[.10,.36,.52],seaLite:[.24,.62,.70],seaDeep:[.05,.18,.32],foam:[.72,.90,.94],
    deck:[.52,.35,.21],deckDk:[.30,.20,.13],deckLite:[.68,.48,.30],rope:[.78,.66,.42],
    barrel:[.48,.30,.17],barrelDk:[.28,.17,.10],crate:[.60,.44,.26],crateDk:[.34,.24,.14],
    palm:[.20,.48,.28],palmDk:[.11,.30,.18],sandBeach:[.84,.72,.50],
    copper:[.82,.48,.24],copperDk:[.46,.24,.12],
    amber:[1,.72,.28],amberDk:[.55,.34,.10],hpAmber:[1,.72,.30],
    ghostPink:[1,.72,.88],ghostViolet:[.62,.42,.88],ghostDark:[.24,.14,.38],
    spark:[1,.86,.52],lampGlow:[1,.80,.40],nightSky:[.03,.05,.14],
    clothBlue:[.26,.48,.78],clothBlueDk:[.14,.28,.50],
    jade:[.36,.80,.62],star:[.86,.78,1],emberRed:[.92,.30,.22]
  };
  /* 1.4 dev1.2 樱色钻装配色：亮青蓝仿钻 + 粉樱描边 */
  C.diamondLite=[.50,.94,1.0];C.diamondDeep=[.16,.58,.76];
  C.sakuraPink=[1,.72,.86];C.sakuraGlow=[1,.86,.94];
  CR.C=C;

  /* ================= 职业 & 种族值（1.3.0） =================
     race 为种族值：hp 体力 / atk 物攻 / matk 法攻 / pdef 物防 / mdef 法防 / spd 速度。
     伤害双轨：战士·射手用 atk，法师·夜樱用 matk。 */
  const MAX_CLASS=3;
  /* 1.3.1 职业标记体系：坦克 / 刺客是战士的特化体质，装备可混搭，但重装备有适配惩罚。
     mark 用于角色卡 / 队伍 HUD / 战斗 HUD 的职业 logo（Unicode 图形，无贴图无重复资源）。 */
  const ARCHETYPES={
    mage:   {mark:"✦",name:"法师",parent:null,   heavySpd:.70,label:"法术系"},
    warrior:{mark:"╋",name:"战士",parent:null,   heavySpd:.92,label:"近战系"},
    tank:   {mark:"▬",name:"坦克",parent:"warrior",heavySpd:1.00,label:"战士特化 · 重甲"},
    assassin:{mark:"↘",name:"刺客",parent:"warrior",heavySpd:.75,label:"战士特化 · 迅捷"},
    ranger: {mark:"⊙",name:"射手",parent:null,   heavySpd:.75,label:"远程系"}
  };
  /* 视为「重装备」的武器类别：巨剑 / 巨盾 / 重斧 / 重甲，混搭时按 archetype 降移速 */
  const HEAVY_WTYPES=["greatsword","shield","heavyPlate"];
  const HEAVY_ITEMS=["ironShield","blackPlate","greatSword"];
  function archetypeOf(cls){
    const c=CLASSES[U.clamp(cls|0,0,MAX_CLASS)];
    return c&&c.archetype?c.archetype:"warrior";
  }
  function heavyPenalty(cls){
    const a=ARCHETYPES[archetypeOf(cls)]||ARCHETYPES.warrior;
    return a.heavySpd;
  }
  const CLASSES=[
    {id:0,name:"战士",title:"磐石守卫",icon:"⚔",mark:"╋",archetype:"warrior",classLabel:"战士",
     element:"土系",magic:false,defName:"小战",
     color:C.blue,dark:C.blueDk,trim:C.steel,acc:C.gold,
     desc:"╋ 战士 · 高血高防，近身压制。可持匕首、战斧、巨剑与盾；持工具也能照常战斗。",
     hp:180,atk:26,spd:2.45,crit:.08,armor:8,range:82,atkCd:.30,
     stats:[94,38,60,92],race:{hp:110,atk:94,matk:38,pdef:92,mdef:46,spd:62},
     weaponTypes:["sword","dagger","axe","greatsword","shield"],attackNeed:"warrior",
     skillPool:["cleave","whirlwind","charge","warcry","thrust","vineBind","lightningRush"],
     skills:["cleave","whirlwind","charge","warcry"]},
    {id:1,name:"法师",title:"星霜术士",icon:"✦",mark:"✦",archetype:"mage",classLabel:"法师",
     element:"光系",magic:true,defName:"小法",
     color:C.purple,dark:C.purpleDk,trim:C.cyan,acc:C.fire2,
     desc:"✦ 法师 · 脆皮高爆发。可持法杖、魔法书、魔法球；采集者手套视为法戒也可施法。",
     hp:105,atk:19,spd:2.25,crit:.14,armor:2,range:430,atkCd:.42,
     stats:[48,98,46,32],race:{hp:68,atk:38,matk:98,pdef:46,mdef:88,spd:52},
     weaponTypes:["staff","book","orb","focus"],attackNeed:"arcane",
     skillPool:["fireball","frostNova","chainLight","meteor","thrust","vineBind","starWheel","bigFireball","waterTornado"],
     skills:["fireball","frostNova","chainLight","meteor"]},
    {id:2,name:"射手",title:"疾风游侠",icon:"➶",mark:"⊙",archetype:"ranger",classLabel:"射手",
     element:"木系",magic:false,defName:"小射",
     color:C.green,dark:C.greenDk,trim:C.gold,acc:C.wood,
     desc:"⊙ 射手 · 最远射程与最高机动。弓 / 弩 / 火铳均为双手武器；持工具时仍可释放不依赖武器的自身技能。",
     hp:122,atk:15,spd:3.05,crit:.22,armor:4,range:540,atkCd:.20,
     stats:[64,54,92,52],race:{hp:78,atk:88,matk:52,pdef:54,mdef:56,spd:96},
     weaponTypes:["bow","crossbow","gun"],attackNeed:"bow",
     skillPool:["tripleArrow","arrowRain","rollShot","pierceShot","thrust","vineBind"],
     skills:["tripleArrow","arrowRain","rollShot","pierceShot"]},
    /* 1.3.1：夜樱明确为【法师 ✦】型（法术系武器 / 法戒），技能按【夜樱技能表】以物攻结算，影·物理混合 */
    {id:3,name:"夜樱",title:"樱下幽客 · 法师",icon:"✿",mark:"✦",archetype:"mage",classLabel:"法师",
     element:"幽系",magic:false,defName:"夜樱",
     color:C.sakura,dark:C.ghostPink,trim:C.pink,acc:C.ghostViolet,
     desc:"✦ 法师 · 幽灵与樱花凝成的少女，粉发汉服。德鲁伊孵化【夜樱蛋】后加入；影与物理混合的樱刃术，持团扇 / 法器施术。",
     hp:112,atk:24,spd:2.6,crit:.16,armor:3,range:400,atkCd:.38,
     stats:[62,96,48,80],race:{hp:76,atk:98,matk:104,pdef:52,mdef:96,spd:82},
     weaponTypes:["focus","orb","staff","book"],attackNeed:"arcane",
     skillPool:["sakuraSlash","nightStab","shadowStep","petalBarrage","petalBind","reverseSlash",
       "flyingSlash","sakuraBlizzard","nightStealth","shadowSever","sakuraBurial",
       "shadowDance","beyondReturn","sakuraMirage","thrust","starWheel"],
     skills:["sakuraSlash","nightStab","shadowStep","petalBarrage"]}
  ];

  /* ================= 技能模板（1.3.0 模板化 / 可替换） =================
     anim    : 动画执行器（combat.js 的 execSkill 分派），新增技能不必重写特效
     weapon  : null=不依赖武器的自身/系别技能；"any"=任意武器或徒手；
               其余为所需武器类别（bow / arcane / warrior / dagger）
     requires: 可选 {classes:[], elements:[], weapons:[]} 三重限定
     magic   : 用 matk 结算（否则用 atk） */
  const SKILLS={
    /* 战士 */
    cleave:{id:"cleave",name:"裂地斩",icon:"⚔",cd:3.2,cost:12,power:2.2,element:"土系",anim:"arc",weapon:"any",desc:"前方扇形重击，附加击退"},
    whirlwind:{id:"whirlwind",name:"旋风斩",icon:"🌀",cd:7.0,cost:30,power:1.7,element:"土系",anim:"whirl",weapon:"any",desc:"周身 140 范围连续两段伤害"},
    charge:{id:"charge",name:"冲锋",icon:"➤",cd:8.5,cost:28,power:1.9,element:"土系",anim:"dash",weapon:"any",desc:"向前突进并撞飞路径上敌人"},
    warcry:{id:"warcry",name:"战吼",icon:"✹",cd:16,cost:45,power:0,element:"土系",anim:"buff",weapon:"any",desc:"8 秒内提升攻速与攻击，并回复生命"},
    /* 法师 */
    fireball:{id:"fireball",name:"爆裂火球",icon:"☄",cd:2.8,cost:12,power:1.4,element:"火系",anim:"projectile",weapon:"arcane",magic:true,desc:"火球命中后爆炸并溅射"},
    frostNova:{id:"frostNova",name:"冰霜新星",icon:"❄",cd:8.0,cost:32,power:2.0,element:"冰系",anim:"aoe",weapon:"arcane",magic:true,desc:"195 范围冻结并减速 2.5 秒"},
    chainLight:{id:"chainLight",name:"连锁闪电",icon:"⚡",cd:9.0,cost:34,power:2.0,element:"电系",anim:"chain",weapon:"arcane",magic:true,desc:"在最多 6 个目标间跳跃传导"},
    meteor:{id:"meteor",name:"天陨",icon:"✷",cd:17,cost:52,power:3.4,element:"火系",anim:"meteor",weapon:"arcane",magic:true,desc:"延迟落下的巨型陨石，超高伤害"},
    /* 射手 */
    tripleArrow:{id:"tripleArrow",name:"三连箭",icon:"➳",cd:2.6,cost:10,power:1.0,element:"木系",anim:"triple",weapon:"bow",desc:"扇形三支穿透箭（需弓 / 弩 / 铳）"},
    arrowRain:{id:"arrowRain",name:"箭雨",icon:"☂",cd:8.0,cost:30,power:.85,element:"木系",anim:"rain",weapon:"bow",desc:"前方 12 支落箭覆盖（需弓弩）"},
    rollShot:{id:"rollShot",name:"翻滚齐射",icon:"↝",cd:8.5,cost:26,power:.8,element:"木系",anim:"roll",weapon:"bow",desc:"向后翻滚并散射 8 支箭（需弓弩）"},
    pierceShot:{id:"pierceShot",name:"贯穿狙击",icon:"◎",cd:16,cost:48,power:5.0,element:"木系",anim:"pierce",weapon:"bow",desc:"超远直线高伤，必定暴击（需弓弩）"},
    /* ===== 1.3.1 夜樱专属技能组（按【夜樱技能表.csv】重做，14 个，按物攻结算） =====
       learnLv : 学习等级；school : 物理 / 影 / 混合；hits : 段数；finish : 终结倍率
       专属技能统一 requires.classes:[3]，并保留「武器需求」逐条判定 */
    sakuraSlash:{id:"sakuraSlash",name:"樱刃斩",icon:"🌸",cd:3,cost:10,power:1.3,learnLv:1,
      element:"普通系",school:"物理・斩击",anim:"sakuraArc",weapon:"any",magic:false,requires:{classes:[3]},
      desc:"身前划出粉白渐变弧形刀光，散落 3~5 片樱瓣；基础近战斩击，命中积攒连击值"},
    nightStab:{id:"nightStab",name:"夜影刺",icon:"🗡",cd:5,cost:16,power:1.5,learnLv:1,
      element:"暗系",school:"影属性・突刺",anim:"nightStab",weapon:"any",magic:false,requires:{classes:[3]},backBonus:.2,
      desc:"化作淡紫残影向前突进 1 身位，终点刺出暗紫短刃；背后命中伤害 +20%"},
    shadowStep:{id:"shadowStep",name:"幽影步",icon:"👻",cd:8,cost:22,power:.8,learnLv:5,
      element:"暗系",school:"影属性・位移",anim:"blink",weapon:null,magic:false,requires:{classes:[3]},invuln:.4,
      desc:"瞬间平移 3 身位，0.4 秒无敌可穿小型敌人与弹幕；路径擦过造成少量影伤，支持空中释放"},
    petalBarrage:{id:"petalBarrage",name:"樱花弹幕",icon:"✿",cd:7,cost:24,power:.45,learnLv:10,
      element:"普通系",school:"物理・投射",anim:"fan8",weapon:"any",magic:false,requires:{classes:[3]},hits:8,decay:.3,
      desc:"扇形甩出 8 枚粉白樱刃，射程 4 身位；多枚命中同一目标时后续飞刃衰减至 30%，可空中释放"},
    petalBind:{id:"petalBind",name:"落樱缚",icon:"❦",cd:12,cost:28,power:.9,learnLv:15,
      element:"普通系",school:"物理・减速",anim:"bind",weapon:null,magic:false,requires:{classes:[3]},slow:2,slowVal:.4,
      desc:"身前 2~3 身位绽开樱花法阵与樱枝藤蔓，持续 0.8 秒；踏入敌人受物理伤害并减速 40% 持续 2 秒"},
    reverseSlash:{id:"reverseSlash",name:"逆影斩",icon:"↩",cd:9,cost:26,power:1.8,learnLv:20,
      element:"暗系",school:"影属性・斩击",anim:"reverse",weapon:"any",magic:false,requires:{classes:[3]},dodge:.3,
      desc:"留下紫色残影，闪至面朝方向最近敌人身后挥出暗紫弧刀；无敌人时向后位移 2 身位；释放后 0.3 秒可闪避下一次攻击"},
    flyingSlash:{id:"flyingSlash",name:"飞樱连斩",icon:"⚔",cd:10,cost:28,power:.6,learnLv:25,
      element:"普通系",school:"物理・连击",anim:"combo4",weapon:"any",magic:false,requires:{classes:[3]},hits:4,
      desc:"向前冲刺连续挥出 4 道交错粉色刀光，覆盖身前 2 身位；每段小幅推动敌人，末段轻微击飞"},
    sakuraBlizzard:{id:"sakuraBlizzard",name:"樱吹雪",icon:"❄",cd:18,cost:40,power:.35,learnLv:30,
      element:"普通系",school:"物理・范围持续",anim:"blizzard",weapon:null,magic:false,requires:{classes:[3]},hits:10,slowVal:.25,
      desc:"跃至中高位爆发粉白樱花雪幕，持续 2 秒每 0.2 秒造成一次范围伤害；期间可缓慢移动，敌人移速 -25%"},
    nightStealth:{id:"nightStealth",name:"夜樱潜行",icon:"🌑",cd:25,cost:30,power:0,learnLv:35,
      element:"暗系",school:"影属性・增益",anim:"stealth",weapon:null,magic:false,requires:{classes:[3]},stealth:4,burst:.5,
      desc:"进入潜行 4 秒，移速 +30%，敌人不会主动攻击；破隐后第一次攻击伤害 +50% 并附加影伤，受击提前破除"},
    shadowSever:{id:"shadowSever",name:"影断樱华",icon:"🌒",cd:14,cost:36,power:2.6,learnLv:40,
      element:"幽系",school:"影・物理混合",anim:"wave",weapon:"arcane",magic:false,requires:{classes:[3]},stun:1,bonus:.3,
      desc:"蓄力 0.3 秒挥出紫粉双色巨型斩波，贯穿 3 身位；对减速 / 流血目标伤害 +30% 并眩晕 1 秒"},
    sakuraBurial:{id:"sakuraBurial",name:"樱华葬",icon:"💥",cd:20,cost:42,power:3.2,learnLv:45,
      element:"普通系",school:"物理・爆发",anim:"slam",weapon:"any",magic:false,requires:{classes:[3]},centerBonus:.5,
      desc:"向下重斩，周身 2.5 身位爆开环形樱花冲击；中心区域敌人额外受到 50% 伤害并击退，可解围"},
    shadowDance:{id:"shadowDance",name:"影舞樱华",icon:"🌀",cd:22,cost:44,power:.55,learnLv:50,
      element:"暗系",school:"影属性・连击",anim:"flash6",weapon:"any",magic:false,requires:{classes:[3]},hits:6,invuln:1.4,
      desc:"化作数道紫影在身前 3 身位随机闪烁斩击 6 段，每段留下粉樱刃光；释放全程无敌"},
    beyondReturn:{id:"beyondReturn",name:"彼岸归引",icon:"✷",cd:30,cost:52,power:4.0,learnLv:55,
      element:"暗系",school:"影属性・终结",anim:"execute",weapon:null,magic:false,requires:{classes:[3]},
      execute:.2,execBonus:2.0,markBelow:.3,
      desc:"标记生命低于 30% 的敌人造成高额影伤；低于 20% 触发斩杀追加 200% 伤害；击杀刷新【幽影步】冷却并回复少量生命"},
    sakuraMirage:{id:"sakuraMirage",name:"夜樱万华斩",icon:"🌌",cd:45,cost:60,power:.4,learnLv:60,
      element:"幽系",school:"影・物理混合・终极",anim:"ultimate",weapon:"arcane",magic:false,requires:{classes:[3]},
      hits:15,finish:2.0,slowVal:.5,duration:3,
      desc:"跃至空中爆发漫天粉樱与紫影，樱花风暴沿 X 轴推进，3 秒内多段伤害；敌人移速 -50% 且无法闪避，终结一击大范围爆发"},
    /* 通用技能：无系别取向，人人可学 */
    thrust:{id:"thrust",name:"突刺",icon:"➤",cd:5.0,cost:16,power:1.7,element:"普通系",anim:"thrust",weapon:"any",
      desc:"让角色向前冲刺一段距离并对路径上的敌人造成伤害；没有明显系别取向，大家都可以学"},
    vineBind:{id:"vineBind",name:"藤蔓缠绕",icon:"❦",cd:7.0,cost:22,power:1.5,element:"木系",anim:"vine",weapon:null,
      desc:"草系自身法术，不依赖任何武器；即使手持工具、没带弓弩也能释放，并束缚命中的敌人"},
    /* 限定技能：演示职业 / 系别 / 武器三重前置 */
    lightningRush:{id:"lightningRush",name:"闪电突袭",icon:"⚡",cd:8.0,cost:24,power:2.0,element:"电系",anim:"dash",weapon:"dagger",
      requires:{weapons:["dagger"]},desc:"必须配备匕首才可携带：瞬身突刺并麻痹目标"},
    starWheel:{id:"starWheel",name:"星轮",icon:"✧",cd:12,cost:36,power:2.6,element:"光系",anim:"meteor",weapon:"arcane",magic:true,
      requires:{classes:[1,3]},desc:"只有法术系角色（法师 / 夜樱）才能驾驭的星轨术"},
    bigFireball:{id:"bigFireball",name:"大火球术",icon:"🔥",cd:9.0,cost:30,power:2.4,element:"火系",anim:"projectile",weapon:"arcane",magic:true,
      requires:{elements:["火系"]},desc:"要求使用者为火系角色；火系角色才能点燃如此规模的火球"},
    waterTornado:{id:"waterTornado",name:"水龙卷",icon:"🌊",cd:10,cost:32,power:2.2,element:"水系",anim:"aoe",weapon:"arcane",magic:true,
      requires:{elements:["水系"]},desc:"要求使用者为水系角色；卷起水龙并击退敌人"}
  };
  const SKILL_ORDER=["cleave","whirlwind","charge","warcry","fireball","frostNova","chainLight","meteor",
    "tripleArrow","arrowRain","rollShot","pierceShot","thrust","vineBind","lightningRush",
    "starWheel","bigFireball","waterTornado",
    "sakuraSlash","nightStab","shadowStep","petalBarrage","petalBind","reverseSlash",
    "flyingSlash","sakuraBlizzard","nightStealth","shadowSever","sakuraBurial",
    "shadowDance","beyondReturn","sakuraMirage"];

  /* ================= v1.4 dev5.1 · 技能 PP / 短 CD =================
     PP 是技能「短期可用次数」，与 MP（能量）职责分离：放一次扣 1 PP，
     **不会自然回复**；只能用【魔法泉水】/【高级小型能量药剂】等道具 /
     【一键补给】恢复。改短 CD 后由 PP 与药水 CD 双重约束，不怕超模。
     PP 按「原 CD 强度」分档（普通 15 / 中 10 / 大招 6 / 终极 4），
     再把实际 CD 压缩到 1.0~4.0s 并保留原梯度。 */
  const SKILL_PP_DEFAULT=15;
  const SKILL_CD_MIN=1.0,SKILL_CD_MAX=4.0;
  Object.keys(SKILLS).forEach(k=>{
    const s=SKILLS[k],origCd=s.cd||3;
    if(!s.pp)s.pp=origCd>=30?4:(origCd>=16?6:(origCd>=8?10:SKILL_PP_DEFAULT));
    s.cdBase=origCd;                                   /* 保留原强度供 UI / QA 查阅 */
    const t=U.clamp((origCd-2)/16,0,1);
    s.cd=U.clamp(Math.round((SKILL_CD_MIN+3*t)*10)/10,SKILL_CD_MIN,SKILL_CD_MAX);
  });

  /* ==================================================================
     v1.4 dev5 · 灵路 / 副件（神兵）系统 · 按《整合规格 0.4》封闭
     副件 ≠ 装备：不进 EQUIPMENT、不占装备槽、不改武器外观，独立存于 SV.data.spirits，
     只占角色的 9 条灵路；神兵定位 BOSS 战，非战斗 / 战斗辅助型副件本版不实现。
     ================================================================== */
  /* 色阶效率（表值，不再除 100；Q_req / Q_supply 同量纲） */
  const SOUL_COLORS={赤:95,绯:105,橙:110,褐:115,碧:125,青:130,蔚:135,堇:140,墨:145,玄:150};
  const SOUL_COLOR_ORDER=Object.keys(SOUL_COLORS);
  /* 合法离散拆解：段长 ∈ {1,3,6,9}，总和恒为 9，不允许 5+4 之类任意拆分 */
  const SOUL_SPLITS=[
    {id:"9",label:"9（单配）",seg:[9]},
    {id:"63",label:"6+3（双配）",seg:[6,3]},
    {id:"333",label:"3+3+3（三配）",seg:[3,3,3]},
    {id:"19",label:"1×9（九配）",seg:[1,1,1,1,1,1,1,1,1]}
  ];
  const SOUL_TOTAL=9;
  /* 品质参数：Q 碧系 / QOld 赤系 / β 瓶颈指数 / W 碧系有效色宽 / WOld 赤系 / D 供能需求 */
  const SOUL_GRADE={
    A:{Q:1.0,QOld:.85,beta:.8,W:3.6,WOld:4.8,D:30,tag:"A 级",color:"#8fd6a0"},
    S:{Q:2.2,QOld:1.85,beta:.6,W:5.4,WOld:7.0,D:50,tag:"S 级",color:"#7fb6ff"},
    X:{Q:4.0,QOld:3.3,beta:.5,W:8.6,WOld:9.0,D:80,tag:"X 级",color:"#ffd77a"}
  };
  /* 属性阈值插值：r=0.30→0.26，0.50→0.52，0.77→0.95，≥1→1.00；低于 0.30 线性衰减到 0 */
  const SOUL_ATTR_CURVE=[[.30,.26],[.50,.52],[.77,.95],[1,1]];
  /* 双攻阈值按当前游戏实际属性量级标定（文档示例 400 / 600 属旧量级，仅作比例参照） */
  const SOUL_ATTR_REQ={A:{power:120,crit:180},S:{power:190,crit:285},X:{power:260,crit:390}};
  /* 低品质多配调度税 T_m（只对同类型同时装备 m 件，先算含边际总和再乘一次） */
  const SOUL_TAX={
    A:[1,1,.95,.85,.80,.75,.70,.65,.65,.65],
    S:[1,1,.95,.88,.84,.80,.76,.72,.70,.70],
    X:[1,1,1,1,.98,.95,.92,.90,.88,.85]
  };
  const SOUL_G={gMin:.55,alpha:1.3,buffer:.8,delay:1.5};
  const SOUL_BOSS_BUFF={duration:45,cd:450};
  const SOUL_LABEL={type:"战斗增益型",n:9};
  /* 神兵（战斗增益型副件）：gen 仅用于内部数值区分（碧系 / 赤系两套品质参数），
     面向玩家文本一律只写「碧 / 赤」；req 为原生可接受色，向下兼容。
     powerBonus = 「威力提升 · 神兵」标称上限；critDmg = 常驻爆伤标称上限；
     两者均受双攻阈值 S_attr 与灵路最终效率 E 缩放，低级角色无法白嫖高级法器。 */
  const SPIRITS={
    starBreaker:{id:"starBreaker",name:"碎星大剑",icon:"⚔",grade:"A",gen:"new",req:"碧",reqN:3,type:"buff",
      powerBonus:.07,critDmg:.06,price:1200,
      intro:"沉稳厚重的碧色巨剑，碎星之力凝于刃上，适合作为第一件契约的战斗增益型副件。",
      desc:"技能攻击对抗头领级时生效：至多 +7% 威力提升 · 神兵、+6% 爆伤；A 级有效色宽小，赤 9 也可满效率。",
      source:"魔法大学城 · 巴恩工坊 · 1200 金币 永久限 1",look:"greatSword"},
    moonWind:{id:"moonWind",name:"月光疾风剑",icon:"🌙",grade:"A",gen:"new",req:"碧",reqN:3,type:"buff",
      powerBonus:.06,critDmg:.08,price:1200,
      intro:"轻快的碧色神兵，威力提升略显平庸，但增加爆伤，适合双 A 流派。",
      desc:"轻快的碧 A 神兵：威力提升略低，但爆伤更高；适合双 A 配法。",
      source:"魔法大学城 · 巴恩工坊 · 1200 金币 永久限 1",look:"slimSword"},
    dragonBone:{id:"dragonBone",name:"龙骨巨剑",icon:"🦴",grade:"A",gen:"old",req:"赤",reqN:3,type:"buff",
      powerBonus:.06,critDmg:.05,price:900,
      intro:"赤色骨铸巨剑，效率可满而品质偏低，是过渡期最稳妥的契约对象。",
      desc:"赤系 A 神兵：效率可满但品质 Q 低，留给角色过渡用。",
      source:"魔法大学城 · 巴恩工坊 · 900 金币 永久限 1",look:"boneSword"},
    frostMourn:{id:"frostMourn",name:"冰封霜哀",icon:"❄",grade:"S",gen:"old",req:"赤",reqN:6,type:"buff",
      powerBonus:.10,critDmg:.12,price:3200,
      intro:"冰封于赤色剑身的哀霜，赤 9 可满效率，稳定提供中档神兵之力。",
      desc:"赤系 S 神兵：赤 9 满效率，品质略低于同级碧系，但仍能稳定提供中档神兵之力。",
      source:"魔法大学城 · 巴恩工坊 · 3200 金币 永久限 1",look:"frostBlade"},
    wasteReaper:{id:"wasteReaper",name:"荒芜收割者",icon:"🌾",grade:"S",gen:"new",req:"碧",reqN:6,type:"buff",
      powerBonus:.11,critDmg:.14,price:3800,
      intro:"荒原上收割者的碧色镰影，赤 9 也能满效率，直到 X 级才出现明显色宽瓶颈。",
      desc:"碧系 S 神兵：赤 9 也能满效率（S 有效色宽 5.4），X 才出现明显色宽瓶颈。",
      source:"魔法大学城 · 巴恩工坊 · 3800 金币 永久限 1",look:"scythe"},
    xuanYuan:{id:"xuanYuan",name:"轩辕",icon:"🗡",grade:"X",gen:"old",req:"赤",reqN:9,type:"buff",
      powerBonus:.12,critDmg:.18,price:6800,
      skill:{name:"轩辕斩",power:.01,cd:1,element:"普通系",add:{normal:.4,boss:1.0}},
      intro:"赤色古剑，赤 9 刚好吃满色宽；品质略低于同级碧系，技能命中后触发【轩辕斩】。",
      desc:"赤系 X 神兵：赤 9 刚好吃满色宽，Q 略低于同级碧系；技能命中后触发【轩辕斩】。",
      source:"魔法大学城 · 巴恩工坊 · 6800 金币 永久限 1",look:"greatSword"},
    chiXiao:{id:"chiXiao",name:"赤霄",icon:"🔥",grade:"X",gen:"new",req:"碧",reqN:9,type:"buff",
      powerBonus:.15,critDmg:.25,price:9800,
      skill:{name:"碎灵",power:.01,cd:1,element:"普通系",add:{normal:.5,boss:1.2},unlock:.70},
      intro:"释放技能后巨剑会带起灼热的气浪拍下，是极其霸道的神兵。",
      desc:"至多 +15% 威力提升 · 神兵、+25% 爆伤（均受双攻阈值）；激活 a 效果 ≥70% 后技能命中自动触发神兵技【碎灵】，释放技能后巨剑带热浪拍下。",
      source:"魔法大学城 · 巴恩工坊 · 9800 金币 永久限 1",look:"heatGreatSword"},
    dragonHunter:{id:"dragonHunter",name:"猎龙者之刃",icon:"🐉",grade:"X",gen:"new",req:"碧",reqN:9,type:"buff",
      powerBonus:.14,critDmg:.22,price:9800,
      intro:"屠龙者留下的碧色利刃，与赤霄同档却更偏爆发；不带神兵技，供 3X 整活配法。",
      desc:"碧系 X 神兵：与赤霄同档，偏爆发的另一种选择；不带神兵技，供 3X 整活配法。",
      source:"魔法大学城 · 巴恩工坊 · 9800 金币 永久限 1",look:"lanceSword"}
  };
  const SPIRIT_ORDER=Object.keys(SPIRITS);

  /* ================= 系别克制（1.3.0） ================= */
  const TYPE_CHART={
    "土系":{strong:["水系","电系"],weak:["木系","冰系"],immune:[]},
    "光系":{strong:["暗系","幽系"],weak:["火系"],immune:[]},
    "木系":{strong:["水系","土系"],weak:["火系","冰系","飞行系"],immune:[]},
    "幽系":{strong:["光系","普通系"],weak:["暗系"],immune:[]},
    "火系":{strong:["木系","冰系","虫系"],weak:["水系","土系"],immune:[]},
    "水系":{strong:["火系","土系"],weak:["木系","电系"],immune:[]},
    "暗系":{strong:["幽系","光系"],weak:["光系"],immune:[]},
    "普通系":{strong:[],weak:["幽系"],immune:[]},
    "电系":{strong:["水系"],weak:["土系","木系"],immune:[]},
    "冰系":{strong:["木系"],weak:["火系"],immune:[]}
  };
  const ELEMENT_COLOR={"土系":C.gold,"光系":C.star,"木系":C.leaf1,"幽系":C.ghostViolet,
    "火系":C.fire,"水系":C.cyan,"暗系":C.purpleDk,"普通系":C.steel,"电系":C.cyan,"冰系":C.ice,
    "毒系":C.green,"爬行系":C.leaf2};
  /* 1.4 dev1：克制原始倍率按 1.md 统一口径 微弱 .5 / 普通 1 / 克制 1.5 / 绝克 2.0。
     守方的克制抵抗 / 微弱抵抗在 battlecore.typeZone() 里再修正，得到 R'。 */
  /* 绝克 2.0：水绝克火、草(木)绝克水；火克制冰走 strong=1.5（按 1.md 示例） */
  const ABSOLUTE_CHART={
    "水系":["火系"],"木系":["水系"]
  };
  function rawTypeMultiplier(atkType,defType){
    const a=TYPE_CHART[atkType],d=TYPE_CHART[defType];
    if(!a||!d)return 1;
    const abs=ABSOLUTE_CHART[atkType];
    if(abs&&abs.indexOf(defType)>=0)return 2.0;
    if(a.strong&&a.strong.indexOf(defType)>=0)return 1.5;
    if(a.weak&&a.weak.indexOf(defType)>=0)return .5;
    if(d.strong&&d.strong.indexOf(atkType)>=0)return .5;
    return 1;
  }
  /* 兼容旧调用名 */
  function typeMultiplier(atkType,defType){return rawTypeMultiplier(atkType,defType);}

  /* ================= 性格 / 天赋 / 学习力（1.3.0 养成） ================= */
  const NATURES={
    "孤僻":{up:"atk",down:"pdef"},"固执":{up:"atk",down:"matk"},"调皮":{up:"atk",down:"mdef"},"勇敢":{up:"atk",down:"spd"},
    "大胆":{up:"pdef",down:"atk"},"淘气":{up:"pdef",down:"matk"},"无虑":{up:"pdef",down:"mdef"},"悠闲":{up:"pdef",down:"spd"},
    "保守":{up:"matk",down:"atk"},"稳重":{up:"matk",down:"pdef"},"马虎":{up:"matk",down:"mdef"},"冷静":{up:"matk",down:"spd"},
    "沉着":{up:"mdef",down:"atk"},"温顺":{up:"mdef",down:"pdef"},"狂妄":{up:"mdef",down:"matk"},"慎重":{up:"mdef",down:"spd"},
    "胆小":{up:"spd",down:"atk"},"急躁":{up:"spd",down:"pdef"},"开朗":{up:"spd",down:"matk"},"天真":{up:"spd",down:"mdef"},
    "坦率":{up:null,down:null},"害羞":{up:null,down:null},"认真":{up:null,down:null},
    "实干":{up:null,down:null},"浮躁":{up:null,down:null}
  };
  const NATURE_KEYS=Object.keys(NATURES);
  const STAT_NAMES={atk:"物攻",matk:"法攻",pdef:"物防",mdef:"法防",hp:"体力",spd:"速度"};
  /* 天赋星图：6 项资质星级（1~5 星），每星给对应属性 +2% */
  const TALENT_KEYS=[{k:"atk",name:"物攻",icon:"⚔"},{k:"matk",name:"法攻",icon:"✦"},
    {k:"pdef",name:"物防",icon:"🛡"},{k:"mdef",name:"法防",icon:"✨"},
    {k:"hp",name:"体力",icon:"❤"},{k:"spd",name:"速度",icon:"👟"}];
  /* 评级分数：6 项星级之和 × 10 + 学习力折算，权重参考天赋 demo */
  const TIER_TABLE=[
    {min:0,max:79,name:"一无是处",icon:"👁️",weight:3},
    {min:80,max:119,name:"十分常见",icon:"🕶️",weight:10},
    {min:120,max:159,name:"百里挑一",icon:"👑",weight:45},
    {min:160,max:224,name:"千载难逢",icon:"👑",weight:35},
    {min:225,max:305,name:"万众瞩目",icon:"🌟",weight:7}
  ];
  const EFFORT_MAX=256,EFFORT_TOTAL=512;
  /* dev5.1：新号初始晶豆 0，只能靠任务 / 游戏内获取 */
  const BEAN_COST=[0,6,10,16,24],BEAN_MAX_STAR=5,BEAN_START=0;

  /* ================= 装备 ================= */
  /* 1.4 dev1.2 品阶标准（参照回合制 demo）：
     白(普通) < 绿(入门) < 蓝(进阶) < 紫(史诗) < 金(传说) < 钻(王者) = 红(传奇)
     王者·钻 = 亮青蓝仿钻色；钻与红为并列最高阶。 */
  const QUALITY_COLOR={white:"#cfd6e4",green:"#7fc47f",blue:"#6aa8ff",
    purple:"#c48aff",gold:"#e8c86a",diamond:"#7ff0ff",red:"#ff6a6a"};
  const QUALITY_NAME={white:"普通",green:"入门",blue:"进阶",purple:"史诗",gold:"传说",
    diamond:"王者·钻",red:"传奇"};
  const QUALITY_ORDER=["white","green","blue","purple","gold","diamond","red"];
  const QUALITY_RANK={white:1,green:2,blue:3,purple:4,gold:5,diamond:6,red:6};
  const QUALITY_CHAIN="白(普通) < 绿(入门) < 蓝(进阶) < 紫(史诗) < 金(传说) < 钻(王者) = 红(传奇)";
  /* 1.4 dev1 装备适配：更优 100~105% / 平 100% / 更劣 90~95% 效率 */
  const FIT_EFF={best:1.05,normal:1.00,bad:.92};
  /* 樱花套件 look → 已有几何形状（复用渲染分支，避免重复劳动） */
  /* 1.4 dev1.2：樱色钻装不再借用普通装备模型，look 原样保留，
     render.js 依据 q==="diamond" && set==="sakura" 走专属樱钻绘制。
     这里只保留非樱花装备的历史别名。 */
  const LOOK_ALIAS={};
  /* 衣服 ↔ 项链、鞋子 ↔ 足饰互斥：同 slot 下 sub 不同时自动替换 */
  const SLOT_SUB={
    head:{circlet:"头饰",hat:"帽子"},
    chest:{clothes:"衣服",necklace:"项链"},
    feet:{shoes:"鞋子",anklet:"足饰"}
  };
  function subExclusive(slot,sub){
    const m=SLOT_SUB[slot];if(!m||!sub)return null;
    return Object.keys(m).filter(k=>k!==sub);
  }
  /* 1.3.0：工具不再单开一类，全部并入「双手」槽。装备槽 7 → 6。 */
  const EQUIP_SLOTS=[
    {id:"head", name:"头部",icon:"🎩",desc:"帽 / 冠 / 盔"},
    {id:"chest",name:"躯干",icon:"🧥",desc:"甲 / 袍 / 披风"},
    {id:"main", name:"主手",icon:"✋",desc:"单手武器"},
    {id:"off",  name:"副手",icon:"🛡",desc:"盾 / 副手"},
    {id:"two",  name:"双手",icon:"⚔",desc:"双手武器 / 工具（占用主副手）"},
    {id:"feet", name:"足部",icon:"👟",desc:"鞋 / 足饰"}
  ];
  const PASSIVE_DESC={
    harvest:"〔采集〕丰收：每次采集 15% 概率额外收获 1 个",
    strong:"〔采集〕强效：采集速度 +25%",
    keen:"〔战斗〕细心：每场战斗首次释放的技能必定命中",
    shatter:"〔采集〕击碎：每次采集 5% 概率直接完成（用时降至 0 秒）",
    breakArmor:"〔战斗〕击穿：每次普攻 10% 概率削弱目标防御等级 1 级（最多 6 级，随时间回落）",
    mining:"〔采集〕矿工：敲开矿点时额外获得 1 份矿石",
    lumber:"〔采集〕伐木：砍伐木料时额外获得 1 份木材",
    swift:"轻身：移动速度额外 +5%",
    arcane:"秘法回响：击败敌人时额外回复 50% 能量",
    pierce:"破甲：攻击时额外无视目标 3 点物防",
    cleave:"顺劈：近战攻击范围 +12%",
    lightstep:"轻步：跳跃初速 +8%",
    ward:"守护：受到的伤害额外降低 4%"
  };
  /* v1.4 dev3：按《装备系统与悬浮文本规范 v4.0》补 sp 视听觉段与档位标签。
     label 直接给悬浮文本用（[2/4] 这类分母按文档示例，不等同于部件总数）；
     sp1 旧字段保留给运行时樱花环绕判定，sp 数组只供悬浮文本渲染。 */
  const EQUIP_SETS={
    wind:{name:"疾风之息",parts:["windCloak","swiftBoots","rangerHood"],max:3,
      bonus:[{n:2,label:"[2/3]",desc:"移速 +10%"},{n:3,label:"[3/3]",desc:"攻击速度 +12%"}],
      sp:[{slot:2,id:"sp1",label:"[2/3]",name:"风痕",type:"visual",
        desc:"移动时脚下带浅绿风痕拖尾"},
        {slot:3,id:"sp2",label:"[3/3]",name:"疾风回响",type:"audio",
        desc:"冲刺时产生短促风声"}]},
    ironguard:{name:"铁卫之誓",parts:["ironHelm","blackPlate","ironShield"],max:3,
      bonus:[{n:2,label:"[2/3]",desc:"物防 +6　·　法防 +3"},{n:3,label:"[3/3]",desc:"最大生命 +50"}],
      sp:[{slot:2,id:"sp1",label:"[2/3]",name:"铁壁光晕",type:"visual",
        desc:"受击时身周环状闪光"}]},
    starfrost:{name:"星霜之辉",parts:["starCrown","starRobe","arcaneOrb"],max:3,
      bonus:[{n:2,label:"[2/3]",desc:"攻击力 +8%"},{n:3,label:"[3/3]",desc:"击杀回能 +35%"}],
      sp:[{slot:2,id:"sp1",label:"[2/3]",name:"星屑尾迹",type:"visual",
        desc:"移动时飘落星屑"},
        {slot:3,id:"sp2",label:"[3/3]",name:"霜华回响",type:"audioVisual",
        desc:"施法时冰晶碎裂音"}]},
    /* 1.4 dev1.1 王者樱花套装：按已穿戴件数触发，不要求指定部位。
       2 件双攻 +4；4 件抗性 / 吸血 / 半血真实护盾 + 加速（CD 45s）；
       sp1「樱花环绕」为纯视觉高级特性，4 件以上出现。dev3 起 sp 段只描述、不改战力。 */
    sakura:{name:"王者·樱色加护",parts:[],any:true,max:4,
      bonus:[
        {n:2,label:"[2/4]",desc:"物攻 +4　·　魔攻 +4"},
        {n:4,label:"[4/4]",desc:"自身抗性 +30%　·　攻击造成伤害的 10% 回血　·　生命首次低于 1/2 时获得 20% 最大生命的真实护盾并移速 +15%（冷却 45 秒）"}
      ],
      sp1:{n:4,name:"樱花环绕",desc:"穿戴任意 4 件时周身有少许樱花瓣环绕，移动时飘落零星花瓣（纯视觉，不影响战力）"},
      sp:[{slot:4,id:"sp1",label:"[4/4]",name:"樱花环绕",type:"visual",
        desc:"周身樱瓣环绕，移动时飘落零星花瓣"}],
      effect:{guardRatio:.5,shieldRatio:.20,speedUp:.15,cooldown:45,lifesteal:.10,res:.30}},
    /* v1.4 dev3 红装示例落地：当前仅【神圣审判镰】1 件，2/4 件套效果待后续部件开放。 */
    holyJudgement:{name:"神圣审判",parts:[],any:true,max:4,
      bonus:[
        {n:2,label:"[2/2]",desc:"物攻 +30%"},
        {n:4,label:"[4/4]",desc:"物攻基础值 +7　·　首次技能 pp 归零时立即为所有技能 pp +3　·　单次受击（或 1 秒内）使生命首次低于 10% 时获得净化，持续 1.5 秒"}
      ],
      sp:[{slot:2,id:"sp1",label:"[2/2]",name:"辉光环绕",type:"visual",
        desc:"周围散发出圣洁的辉光，移动时带有拖尾光效"},
        {slot:4,id:"sp2",label:"[4/4]",name:"蓄辉裁决",type:"audioVisual",
        desc:"蓄力攻击时，周围产生特殊光效并发出特殊音效"}]},
    /* v1.4 dev4.1 见习术士套件：绿装 11 件，按已穿戴件数 2 / 4 / 5 触发「魔法的指引V1」。
       六槽里双手武器会占用主手与副手，因此最多只能同时穿 5 件（头 + 躯 + 足 + 主手 + 副手），
       最高档定为 5 件。动态效果（技能命中、蓄力、低血护盾）由 seteffects.js 实现，
       静态速度加成走 equipment.bonus()。 */
    apprentice:{name:"魔法的指引V1",parts:[],any:true,max:5,
      bonus:[
        {n:2,label:"[2/5]",desc:"使用技能命中后 80% 提升自身双攻 1 级，暴击则额外提高双防 1 级（被动冷却 3 秒）"},
        {n:4,label:"[4/5]",desc:"蓄力达到 2 层及以上时获得速度提升（33%），持续 3 秒（被动冷却 40 秒）"},
        {n:5,label:"[5/5]",desc:"速度 +7%　·　首次生命值低于 80% 时立即获得（40 + 最大生命值 20%，上限 220）法术护盾（被动冷却 80 秒）"}
      ],sp:[]}
  };
  /* stats: atk / hp / armor / crit / spd(绝对) / critDmg / range / atkSpd */
  const EQUIPMENT={
    /* 头部 */
    blueHat:{name:"蓝布帽",icon:"🎩",q:"white",slot:"head",price:60,look:"blueHat",
      stats:{hp:6},desc:"染成晴空色的粗布帽，帽檐压得很低。",source:"阿福摊位 · 60 金币"},
    leafCirclet:{name:"翠叶冠",icon:"🍃",q:"green",slot:"head",price:110,look:"leafCirclet",
      stats:{crit:.02,hp:4},desc:"用新叶编成的环冠，叶脉里还留着露水。",source:"精英怪掉落 / 阿福摊位"},
    ironHelm:{name:"铁盔",icon:"⛑",q:"blue",slot:"head",price:180,look:"ironHelm",allow:[0],set:"ironguard",
      stats:{pdef:5,mdef:2,hp:20},desc:"黑石城锻造的整片铁盔，视野窄但踏实。",source:"阿福摊位 · 180 金币 / 精英掉落"},
    starCrown:{name:"星辉冠",icon:"♛",q:"purple",slot:"head",price:260,look:"starCrown",allow:[1],set:"starfrost",
      stats:{atk:4,crit:.03},desc:"冠上嵌着一枚会自己发光的星屑。",source:"黑石城主掉落 / 黑市"},
    rangerHood:{name:"游侠兜帽",icon:"🧢",q:"blue",slot:"head",price:150,look:"rangerHood",allow:[2],set:"wind",
      stats:{spd:.12,crit:.02},desc:"风从兜帽里穿过去，几乎听不见声音。",source:"阿福摊位 · 150 金币"},
    /* 躯干 */
    leatherVest:{name:"皮甲",icon:"🦺",q:"white",slot:"chest",price:90,look:"leatherVest",
      stats:{pdef:3,mdef:1,hp:12},desc:"硝制过的兽皮，轻便但挡不住重击。",source:"阿福摊位 · 90 金币"},
    ironLightArmor:{name:"铁质轻甲",icon:"🛡",q:"blue",slot:"chest",price:220,look:"ironLightArmor",
      stats:{pdef:7,mdef:3,hp:24},desc:"薄铁片一层层叠铆，跑起来会轻轻响。",source:"阿福摊位 · 220 金币 / 精英掉落"},
    windCloak:{name:"疾风披风",icon:"🧣",q:"purple",slot:"chest",price:240,look:"windCloak",allow:[2],set:"wind",
      stats:{spd:.18,pdef:2},passive:["swift"],desc:"下摆永远朝后飘，哪怕没有风。",source:"小统领掉落 / 黑市"},
    starRobe:{name:"星纹法袍",icon:"🥋",q:"purple",slot:"chest",price:280,look:"starRobe",allow:[1],set:"starfrost",
      stats:{atk:6,hp:14},passive:["arcane"],desc:"袍角绣着会缓慢移动的星图。",source:"黑石城主掉落 / 黑市"},
    blackPlate:{name:"黑石重甲",icon:"🦾",q:"gold",slot:"chest",price:420,look:"blackPlate",allow:[0],set:"ironguard",
      stats:{pdef:12,mdef:6,hp:60,spd:-.15},passive:["ward"],desc:"从城主铠甲上拓下来的样式，沉得像一堵墙。",source:"黑石城主掉落"},
    /* 足部 */
    sandals:{name:"布履",icon:"👟",q:"white",slot:"feet",price:50,look:"sandals",
      stats:{spd:.06},desc:"缠了三层布条，踩在石板上很安静。",source:"阿福摊位 · 50 金币"},
    featherAnklet:{name:"清羽足链",icon:"🪶",q:"blue",slot:"feet",price:170,look:"featherAnklet",
      stats:{spd:.12,crit:.02},passive:["lightstep"],
      desc:"赤脚脚踝上系着一颗链珠与一片清羽，走起路来会轻轻碰响。",source:"夜樱首次赏金赠礼 / 阿福摊位"},
    swiftBoots:{name:"急速战靴",icon:"🥾",q:"purple",slot:"feet",price:230,look:"swiftBoots",set:"wind",
      stats:{spd:.22},desc:"靴底刻着风纹，落地几乎不留声音。",source:"小统领掉落 / 黑市"},
    /* 武器：战士 */
    ironSword:{name:"铁剑",icon:"🗡",q:"white",slot:"main",wtype:"sword",price:0,look:"sword",allow:[0],
      stats:{atk:6},desc:"每个战士的第一把剑，钝了就磨。",source:"初始装备"},
    buckler:{name:"木盾",icon:"🛡",q:"white",slot:"off",wtype:"shield",price:0,look:"shield",allow:[0],
      stats:{pdef:4,mdef:2,hp:10},desc:"包了铁皮的圆木盾。",source:"初始装备"},
    ironDagger:{name:"铁匕首",icon:"🔪",q:"green",slot:"main",wtype:"dagger",price:190,look:"dagger",allow:[0],
      stats:{atk:9,spd:.12},passive:["pierce"],desc:"短，但够快。适合贴身补刀。",source:"阿福摊位 · 190 金币"},
    battleAxe:{name:"裂山战斧",icon:"🪓",q:"purple",slot:"two",wtype:"axe",price:520,look:"axe",allow:[0],
      stats:{atk:24,crit:.04},passive:["cleave"],desc:"双手斧，挥起来连风都被劈开。",source:"小统领掉落 / 黑市"},
    greatSword:{name:"巨剑",icon:"⚔",q:"gold",slot:"two",wtype:"greatsword",price:680,look:"greatsword",allow:[0],
      stats:{atk:30,pdef:4},passive:["cleave"],desc:"剑身比人还宽，靠重量而不是锋利。",source:"黑石城主掉落"},
    ironShield:{name:"铁盾",icon:"🛡",q:"blue",slot:"off",wtype:"shield",price:210,look:"shield",allow:[0],set:"ironguard",
      stats:{pdef:9,mdef:4,hp:28},passive:["ward"],desc:"整面锻铁，边缘镶了一圈黄铜。",source:"阿福摊位 · 210 金币"},
    /* 武器：法师 */
    oakStaff:{name:"橡木法杖",icon:"🪄",q:"white",slot:"two",wtype:"staff",price:0,look:"staff",allow:[1],
      stats:{atk:5},desc:"杖头嵌着一颗没打磨过的辉晶。",source:"初始装备"},
    spellBook:{name:"星霜魔典",icon:"📖",q:"purple",slot:"main",wtype:"book",price:360,look:"book",allow:[1],
      stats:{atk:13,crit:.05},passive:["arcane"],desc:"书页自己翻，停在你要用的那一页。",source:"阿福摊位 · 360 金币 / 精英掉落"},
    arcaneOrb:{name:"秘法魔球",icon:"🔮",q:"gold",slot:"main",wtype:"orb",price:520,look:"orb",allow:[1],set:"starfrost",
      stats:{atk:17,crit:.03},passive:["arcane"],desc:"掌心悬着一颗不落地的光球。",source:"黑石城主掉落 / 黑市"},
    /* 武器：射手 */
    woodBow:{name:"木弓",icon:"🏹",q:"white",slot:"two",wtype:"bow",price:0,look:"woodBow",allow:[2],
      stats:{atk:3},desc:"弓身还留着削木的刀痕。",source:"初始装备"},
    ironBow:{name:"铁弓",icon:"🏹",q:"blue",slot:"two",wtype:"bow",price:320,look:"ironBow",allow:[2],
      stats:{atk:11,crit:.04},passive:["pierce"],desc:"铁胎弓，弦绷得能弹出火星。",source:"阿福摊位 · 320 金币 / 精英掉落"},
    crossbow:{name:"玄铁弩",icon:"➶",q:"purple",slot:"two",wtype:"crossbow",price:480,look:"crossbow",allow:[2],
      stats:{atk:16,crit:.02,range:60},desc:"上弦要花点时间，但一发就够。",source:"小统领掉落 / 黑市"},
    flareGun:{name:"星火铳",icon:"🔫",q:"gold",slot:"two",wtype:"gun",price:760,look:"gun",allow:[2],
      stats:{atk:22,crit:.06},desc:"铳口会落下一两点星火，像没烧完的烟花。",source:"黑石城主掉落"},
    /* 1.3.0 工具性武器：归入「双手」槽，任何职业都可穿戴，但战斗能力按职业 + 工具种类判定 */
    gathererGloves:{name:"采集者手套",icon:"🧤",q:"blue",slot:"two",wtype:"focus",tool:"harvest",
      price:200,look:"gloves",stats:{atk:6,matk:6,spd:.02},
      passive:["harvest","strong","keen"],
      desc:"指缝里缝了小口袋，草丛里的东西一摸一个准。★法师 / 夜樱穿戴时视为【法戒 / 悬浮法器】可正常施法；战士视为徒手搏斗（攻击 -45%）但仍可战斗；射手只能采集，弓弩类技能无法释放，不依赖武器的自身技能（如藤蔓缠绕）仍可用。",
      source:"阿福摊位 · 200 金币 / 田田的采集委托"},
    ironPick:{name:"铁镐",icon:"⛏",q:"blue",slot:"two",wtype:"hammer",tool:"mining",
      price:180,look:"pick",stats:{atk:10,spd:.04},
      passive:["shatter","strong","breakArmor","mining"],
      desc:"敲矿脉用的，尖头换过三次。★战士持镐视为双手武器照常战斗（攻击 +8%、挖矿效率 +20%）；法师 / 射手持镐只能挖矿，无法释放普攻与需要武器的技能。",
      source:"阿福摊位 · 180 金币 / 港口商人锻造"},
    woodAxe:{name:"伐木斧",icon:"🪓",q:"blue",slot:"two",wtype:"axe",tool:"lumber",
      price:180,look:"handaxe",stats:{atk:8,spd:.02},
      passive:["lumber","strong"],
      desc:"斧刃磨得发亮，砍木头不夹刃。★战士可当双手战斧挥舞；法师 / 射手只能伐木。魔法丛林【原始森林】3 处伐木点需要它或锯子。",
      source:"阿福摊位 · 180 金币 / 德鲁伊赠礼"},
    timberSaw:{name:"双人锯",icon:"🪚",q:"purple",slot:"two",wtype:"saw",tool:"lumber",
      price:320,look:"saw",stats:{atk:5,spd:.06},
      passive:["lumber","strong","shatter"],
      desc:"两人拉的长锯，一个人也能用；锯木比斧头快，还有机会一锯到底。",
      source:"德鲁伊 · 320 金币 / 魔法丛林精英掉落"},
    sakuraFan:{name:"樱纹团扇",icon:"🪭",q:"blue",slot:"two",wtype:"focus",price:0,look:"fan",allow:[3],
      stats:{matk:8,crit:.02},desc:"夜樱的随身团扇，扇面一挥便有樱瓣随行。",source:"夜樱初始装备"},
    /* 森林 / 夜樱装备 */
    mossCirclet:{name:"苔叶冠",icon:"🍃",q:"green",slot:"head",price:140,look:"leafCirclet",
      stats:{hp:10,matk:3},desc:"德鲁伊编的苔叶环，沾着林间的露气。",source:"德鲁伊 · 140 金币"},
    barkRobe:{name:"树皮法袍",icon:"🥋",q:"blue",slot:"chest",price:260,look:"starRobe",
      stats:{pdef:3,mdef:5,hp:20,matk:4},desc:"用老树皮鞣软后缝的袍子，走动时有木香。",source:"魔法丛林精英掉落 / 德鲁伊"},
    /* ================= 1.4 dev1 · 樱花套件（夜樱 BOSS 专属装备试炼产出 · 王者钻） =================
       重武数值 > 中武 > 轻武；攻速轻 > 中 > 重；移速重 < 中 < 轻。
       fit 按角色体质 archetype 判定：更优 105% / 平 100% / 更劣 92% 效率。
       sub 用于同槽互斥：衣服↔项链、鞋子↔足饰。 */
    /* 1.4 dev1.2 补件：头部两件，头饰 ↔ 帽子 互斥（同 head 槽 sub 不同自动替换） */
    skWreath:{name:"王者钻装之樱色花环",icon:"🌸",q:"diamond",slot:"head",sub:"circlet",
      price:0,look:"sakuraWreath",set:"sakura",tint:C.sakura,
      stats:{matk:6,hp:24,crit:.04},desc:"头部·头饰：樱枝编成的花环，钻光在花瓣间流转。与【樱色花帽】互斥，只能同时装配一种。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skFlowerHat:{name:"王者钻装之樱色花帽",icon:"👒",q:"diamond",slot:"head",sub:"hat",
      price:0,look:"sakuraFlowerHat",set:"sakura",tint:C.sakura,
      stats:{atk:6,hp:30,dodge:.02},desc:"头部·帽子：缀满樱瓣的软帽，帽檐镶一圈亮青蓝钻边。与【樱色花环】互斥，只能同时装配一种。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skFan:{name:"王者钻装之樱色花扇",icon:"🪭",q:"diamond",slot:"two",wtype:"book",weight:"light",
      price:0,look:"sakuraFan",allow:[1,3],set:"sakura",sub:null,tint:C.sakura,
      stats:{matk:72,crit:.12,spd:.05},desc:"双手 · 法师 · 书系 · 轻武。扇骨是樱木，展开时落樱自成法阵；作为法书类武器占用双手，不可搭配副手。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skDress:{name:"王者钻装之樱色长裙",icon:"👘",q:"diamond",slot:"chest",sub:"clothes",
      price:0,look:"sakuraDress",set:"sakura",tint:C.sakura,
      stats:{hp:62,pdef:9,mdef:9,matk:12},desc:"胸部 · 衣服。与【樱色护符】互斥，只能同时装配一种。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skAmulet:{name:"王者钻装之樱色护符",icon:"📿",q:"diamond",slot:"chest",sub:"necklace",
      price:0,look:"sakuraAmulet",set:"sakura",tint:C.sakura,
      stats:{hp:38,crit:.06,critDmg:.12},desc:"胸部 · 项链。与【樱色长裙】互斥，只能同时装配一种。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skFlowerShoes:{name:"王者钻装之樱色花鞋",icon:"👠",q:"diamond",slot:"feet",sub:"shoes",
      price:0,look:"sakuraShoes",set:"sakura",tint:C.sakura,
      stats:{spd:.22,hp:16},desc:"足部 · 鞋子。轻便绣鞋，与【樱色足环】互斥。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skWarBoots:{name:"王者钻装之樱色战靴",icon:"🥾",q:"diamond",slot:"feet",sub:"shoes",
      price:0,look:"sakuraBoots",set:"sakura",tint:C.sakura,
      stats:{spd:.14,pdef:7,mdef:7,hp:28},desc:"足部 · 鞋子。靴底嵌樱纹铁片，与【樱色足环】互斥。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skAnklet:{name:"王者钻装之樱色足环",icon:"🪶",q:"diamond",slot:"feet",sub:"anklet",
      price:0,look:"sakuraAnklet",set:"sakura",tint:C.sakura,
      stats:{spd:.28,crit:.04},desc:"足部 · 足饰。和【清羽足链】同定位，与鞋子互斥，只能装配一种。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skGreatSword:{name:"王者钻装之樱色巨剑",icon:"⚔",q:"diamond",slot:"two",wtype:"greatsword",weight:"heavy",
      price:0,look:"sakuraGreatSword",allow:[0],set:"sakura",tint:C.sakura,
      fit:{best:["warrior"],normal:[],bad:["assassin","tank"]},
      stats:{atk:85,crit:.23,spd:-.03,atkSpd:-.03},
      desc:"双手 · 战士系 · 剑系 · 重武。更优：战士；更劣：刺客 / 坦克。数值最高但拖慢攻速与移速。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skLongBow:{name:"王者钻装之樱色长弓",icon:"🏹",q:"diamond",slot:"two",wtype:"bow",weight:"medium",
      price:0,look:"sakuraLongBow",allow:[2],set:"sakura",tint:C.sakura,
      stats:{atk:74,crit:.14,spd:.03},desc:"双手 · 射手 · 弓系 · 中武。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skSleeveArrow:{name:"王者钻装之樱色袖箭",icon:"➶",q:"diamond",slot:"main",wtype:"bow",weight:"light",
      price:0,look:"sakuraSleeve",allow:[2],set:"sakura",tint:C.sakura,
      stats:{atk:52,crit:.08,spd:.09,atkSpd:.12},desc:"单手 · 射手 · 弓系 · 轻武。可搭配副手。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skSpear:{name:"王者钻装之樱色长矛",icon:"🔱",q:"diamond",slot:"two",wtype:"spear",weight:"medium",
      price:0,look:"sakuraSpear",allow:[0],set:"sakura",tint:C.sakura,
      fit:{best:["assassin"],normal:[],bad:["warrior","tank"]},
      stats:{atk:76,crit:.16,spd:.04},desc:"双手 · 战士系 · 矛系 · 中武。更优：刺客；更劣：战士 / 坦克。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skGreatShield:{name:"王者钻装之樱色巨盾",icon:"🛡",q:"diamond",slot:"two",wtype:"shield",weight:"heavy",
      price:0,look:"sakuraGreatShield",allow:[0],set:"sakura",tint:C.sakura,
      fit:{best:["tank"],normal:[],bad:["warrior","assassin"]},
      stats:{pdef:34,mdef:34,hp:96,spd:-.05,atkSpd:-.04},
      desc:"双手 · 战士系 · 盾系 · 重武。更优：坦克；更劣：战士 / 刺客。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    /* 1.4 dev1.4：副手盾全职业通用（法师 / 射手装备单手主手后也可搭配） */
    skRoundShield:{name:"王者钻装之樱色圆盾",icon:"🛡",q:"diamond",slot:"off",wtype:"shield",weight:"medium",
      price:0,look:"sakuraRoundShield",set:"sakura",tint:C.sakura,
      stats:{hp:48,pdef:20,mdef:20},desc:"单手 · 副手 · 盾系 · 中武：生命 +48，双防（物防、法防）+20。战士 / 法师 / 射手装备单手主手武器后均可搭配；双手武器会占用主副手，不可与副手盾并存。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skAxe:{name:"王者钻装之樱色战斧",icon:"🪓",q:"diamond",slot:"main",wtype:"axe",weight:"heavy",
      price:0,look:"sakuraAxe",allow:[0],set:"sakura",tint:C.sakura,
      fit:{best:["warrior"],normal:["tank"],bad:["assassin"]},
      stats:{atk:78,crit:.15,spd:.02,atkSpd:-.02},
      desc:"单手 · 战士系 · 斧系 · 重武。更优：战士；平：坦克；更劣：刺客。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skWarSword:{name:"王者钻装之樱色战剑",icon:"🗡",q:"diamond",slot:"main",wtype:"sword",weight:"medium",
      price:0,look:"sakuraWarSword",allow:[0],set:"sakura",tint:C.sakura,
      fit:{best:["warrior"],normal:["assassin","tank"],bad:[]},
      stats:{atk:70,crit:.12,spd:.05},desc:"单手 · 战士系 · 剑系 · 中武。更优：战士；平：刺客 / 坦克。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skHammer:{name:"王者钻装之樱色战锤",icon:"🔨",q:"diamond",slot:"main",wtype:"hammer",weight:"heavy",
      price:0,look:"sakuraHammer",allow:[0],set:"sakura",tint:C.sakura,
      fit:{best:["tank"],normal:["warrior"],bad:["assassin"]},
      stats:{atk:76,crit:.19,spd:-.01,atkSpd:-.02},
      desc:"单手 · 战士系 · 锤系 · 重武。更优：坦克；平：战士；更劣：刺客。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skDagger:{name:"王者钻装之樱色匕首",icon:"🔪",q:"diamond",slot:"main",wtype:"dagger",weight:"light",
      price:0,look:"sakuraDagger",allow:[0],set:"sakura",tint:C.sakura,
      fit:{best:["assassin"],normal:[],bad:["warrior","tank"]},
      stats:{atk:50,crit:.10,spd:.10,atkSpd:.14},
      desc:"单手 · 战士系 · 剑系 · 轻武。更优：刺客；更劣：战士 / 坦克。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skStaff:{name:"王者钻装之樱色权杖",icon:"🪄",q:"diamond",slot:"two",wtype:"staff",weight:"medium",
      price:0,look:"sakuraStaff",allow:[1],set:"sakura",tint:C.sakura,
      stats:{matk:78,crit:.14,spd:.03},desc:"双手 · 法师系 · 杖系 · 中武。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skWand:{name:"王者钻装之樱色魔棒",icon:"✨",q:"diamond",slot:"main",wtype:"staff",weight:"light",
      price:0,look:"sakuraWand",allow:[1],set:"sakura",tint:C.sakura,
      stats:{matk:54,crit:.08,spd:.09,atkSpd:.12},desc:"单手 · 法师系 · 杖系 · 轻武。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skBook:{name:"王者钻装之樱色魔书",icon:"📖",q:"diamond",slot:"two",wtype:"book",weight:"light",
      price:0,look:"sakuraBook",allow:[1,3],set:"sakura",tint:C.sakura,
      stats:{matk:56,crit:.07,spd:.08,atkSpd:.11},desc:"双手 · 法师系 · 书系 · 轻武。占用双手，不可搭配副手。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skOrb:{name:"王者钻装之樱色魔珠",icon:"🔮",q:"diamond",slot:"two",wtype:"book",weight:"light",
      price:0,look:"sakuraOrb",allow:[1,3],set:"sakura",tint:C.sakura,
      stats:{matk:55,crit:.09,spd:.09,atkSpd:.10},desc:"双手 · 法师系 · 书系 · 轻武。占用双手，不可搭配副手。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    skRing:{name:"王者钻装之樱色法戒",icon:"💍",q:"diamond",slot:"two",wtype:"ring",weight:"light",
      price:0,look:"sakuraRing",allow:[1,3],set:"sakura",tint:C.sakura,
      stats:{matk:48,crit:.06,spd:.11,atkSpd:.15},desc:"双手 · 法师系 · 戒系 · 轻武。占用双手，不可搭配副手。",
      source:"夜樱 BOSS 专属装备试炼（难度 ★★★★）"},
    /* ================= v1.4 dev3 · 首件红装（规范 v4.0 示例落地） =================
       附魔 / 鉴定 / 强化系统未实装：appraisal / enchant 为空、Lv0，悬浮按规范显示 [未鉴定]。
       sp 视听觉特效本版只落地文本规范，实际光效留待后续版本。 */
    holySickle:{name:"神圣审判镰",icon:"Ꝓ",q:"red",redTheme:"不朽",
      slot:"two",wtype:"sickle",weight:"medium",tool:"harvest",
      gatherTypes:["草丛","菇丛","农田"],
      price:7700,look:"holySickle",set:"holyJudgement",tint:C.gold,
      fit:{best:["assassin"],normal:[],bad:["warrior","tank"]},
      stats:{atk:75,matk:10,crit:.08,spd:-.04},
      passive:["harvest","strong"],
      toolRuleMode:"gatherOnly",
      toolRule:"战士持镰可正常战斗；法师 / 射手仅可采集，无法释放普攻与依赖武器的技能。",
      desc:"沉眠于古神庙的审判之镰，刃口仍凝着未散的神罚余烬。",
      combatPassive:[
        {timing:"进入战斗时",lines:[
          "攻击目标生命值小于 1/2 的目标时，角色攻速提升 25%",
          "技能命中未死亡的目标时，额外扣除其最大生命值（数值 = 自身双攻能力值 × 24%，上限 700），每 12 秒触发一次",
          "短时间受到超过自身生命值 1/2 的伤害时，赋予范围内至多 3 个目标弱化（30%），持续 3 秒，每 12 秒触发一次"]},
        {timing:"每次替换上场时",lines:[
          "扣除范围内敌对目标 30 点魔法值",
          "赋予范围内敌对目标锁灵（无法提升战斗时的 8 维属性），持续 4 秒，每 12 秒触发一次",
          "赋予范围内敌对目标速度降低（45%），持续 3 秒，每 12 秒触发一次"]},
        {timing:"当我方同时在场人数>2时",lines:[
          "我方角色获得威力提升（25%）、暴击提升（14%）、星梦（33%）",
          "攻击目标后随机吸取目标 5 级随机属性，每 3 秒触发一次"]},
        {timing:"对抗头领级目标时",lines:[
          "获得所有「我方同时在场人数>2」时的额外效果",
          "获得圣裁之剑（40%）",
          "当我方同时在场人数>2 时，使用同系技能爆伤 +155%"]}
      ],
      appraisal:[],enchant:[],
      source:"流浪商人术士 · 7700 金币 · 永久限购 1"},
    /* ===== v1.4 dev4.1 · 见习术士套件（绿 · 入学礼包 11 件） =====
       槽位按《装备规范 v4.0》归类：法帽→头部·帽子、护靴→足部·鞋子（修正文案笔误）；
       魔戒为戒系·双手·轻武，与书/杖一样归入法术能力标签（修复法师戴戒无法攻击）。
       「命中 +2」按游戏内命中率口径折算为 +2%（hit:.02）。 */
    appHat:{name:"见习术士法帽",icon:"🎓",q:"green",slot:"head",sub:"hat",price:0,look:"blueHat",
      stats:{matk:14,pdef:3},set:"apprentice",
      desc:"学院发下来的软帽，帽檐还别着一枚见习铜扣。",source:"西郊城门 · 新生接待员入学礼包"},
    appStaff:{name:"见习术士权杖",icon:"🪄",q:"green",slot:"two",wtype:"staff",weight:"medium",allow:[1,3],price:0,look:"oakStaff",
      stats:{matk:18,crit:.02},set:"apprentice",
      desc:"双手 · 法师系 · 杖系 · 中武；杖头嵌着一颗不太稳的晶核。学院练习装，不可与单手 / 副手同戴（双手占主副手，需走单手 + 副手路线凑满 5 件）。",source:"西郊城门 · 新生接待员入学礼包"},
    appRing:{name:"见习术士魔戒",icon:"💍",q:"green",slot:"two",wtype:"ring",weight:"light",allow:[1,3],price:0,look:"skRing",
      stats:{matk:13,hit:.02},set:"apprentice",
      desc:"双手 · 法师系 · 戒系 · 轻武。戒系在法师手中视为与书/杖同类的双手法器，数值略低于书系；学院练习装不可与单手 / 副手同戴（双手占主副手，需走单手 + 副手路线凑满 5 件）。",source:"西郊城门 · 新生接待员入学礼包"},
    appOrb:{name:"见习术士魔珠",icon:"🔮",q:"green",slot:"two",wtype:"orb",weight:"light",allow:[1,3],price:0,look:"arcaneOrb",
      stats:{matk:15,spd:.03},set:"apprentice",
      desc:"双手 · 法师系 · 书系 · 轻武；悬浮光珠绕着指尖慢慢转。学院练习装，不可与单手 / 副手同戴（双手占主副手，需走单手 + 副手路线凑满 5 件）。",source:"西郊城门 · 新生接待员入学礼包"},
    appNote:{name:"见习术士笔记",icon:"📓",q:"green",slot:"two",wtype:"book",weight:"light",allow:[1,3],price:0,look:"spellBook",
      stats:{matk:15,hp:2},set:"apprentice",
      desc:"双手 · 法师系 · 书系 · 轻武；边角写满了旁听生的涂鸦。学院练习装，不可与单手 / 副手同戴（双手占主副手，需走单手 + 副手路线凑满 5 件）。",source:"西郊城门 · 新生接待员入学礼包"},
    appWoodSword:{name:"见习术士木剑",icon:"🗡",q:"green",slot:"main",wtype:"sword",weight:"medium",allow:[0],price:0,look:"ironSword",
      stats:{matk:3,atk:2},set:"apprentice",
      desc:"单手 · 战士系 · 剑系 · 中武；给陪练的战士准备的白蜡木剑。",source:"西郊城门 · 新生接待员入学礼包"},
    appWand:{name:"见习术士魔棒",icon:"✨",q:"green",slot:"main",wtype:"staff",weight:"light",price:0,look:"skWand",
      stats:{matk:13,hit:.02},set:"apprentice",
      desc:"主手 · 法师系 · 杖系 · 轻武；学院统一配发的练习魔棒，四职业均可持，可再搭配副手盾凑满 5 件。",source:"西郊城门 · 新生接待员入学礼包"},
    appShield:{name:"见习术士魔盾",icon:"🛡",q:"green",slot:"off",wtype:"shield",weight:"medium",price:0,look:"buckler",
      stats:{pdef:5,mdef:3},set:"apprentice",
      desc:"副手 · 通用 · 盾系 · 中武；单手武器可搭配，双手武器会自动占用副手。",source:"西郊城门 · 新生接待员入学礼包"},
    appRobe:{name:"见习术士法袍",icon:"🥋",q:"green",slot:"chest",sub:"clothes",price:0,look:"starRobe",
      stats:{hp:10,mdef:3},set:"apprentice",
      desc:"躯干 · 衣服（与项链互斥）；法袍偏防御，厚实的领口挡风。",source:"西郊城门 · 新生接待员入学礼包"},
    appNecklace:{name:"见习术士项链",icon:"📿",q:"green",slot:"chest",sub:"necklace",price:0,look:"skAmulet",
      stats:{hp:10,matk:3},set:"apprentice",
      desc:"躯干 · 项链（与衣服互斥）；项链偏攻击，坠子里封着一点魔力。",source:"西郊城门 · 新生接待员入学礼包"},
    appBoots:{name:"见习术士护靴",icon:"🥾",q:"green",slot:"feet",sub:"shoes",price:0,look:"sandals",
      stats:{spd:.06,pdef:3},set:"apprentice",
      desc:"足部 · 鞋子；鞋底刻了防滑纹，跑石板路很稳。",source:"西郊城门 · 新生接待员入学礼包"}
  };
  /* ==================================================================
     v1.4 dev3 · 《装备系统与悬浮文本规范 v4.0》数据字段批量补全
     规范 9.2 第 1 步：脚本读现有 allow / slot / wtype / tool 推断，
     渲染层不再为单件装备写特判。附魔 / 鉴定 / 强化未实装 → 空数组 + Lv0。
     ================================================================== */
  const EQUIP_FLAVOR={
    skWreath:"樱枝编成的花环，亮青蓝钻光在花瓣间流转。",
    skFlowerHat:"缀满樱瓣的软帽，帽檐镶一圈亮青蓝钻边。",
    skFan:"扇骨是樱木，展开时落樱自成法阵。",
    skDress:"胸前绣着樱纹的长裙，裙摆掠过地面会带起细碎花影。",
    skAmulet:"一枚钻光护符，贴近胸口时能听见很轻的花落声。",
    skFlowerShoes:"轻便绣鞋，鞋尖点着两片樱瓣。",
    skWarBoots:"靴底嵌樱纹铁片，沉稳得像一枚落钉。",
    skAnklet:"足环一转，踝边便浮起一圈极淡的钻光。",
    skGreatSword:"数值最高但拖慢攻速与移速，剑身映着樱色钻光。",
    skLongBow:"弓臂修长，拉满时弦上会浮出一层樱雾。",
    skSleeveArrow:"腕绑箭匣，三支短箭在袖口里安静地亮着。",
    skSpear:"长杆红缨，矛尖挑着一点亮青蓝的冷光。",
    skGreatShield:"塔盾般厚重，盾面樱纹随视角缓缓流转。",
    skAxe:"单刃弧斧，挥过时留下一道樱色残影。",
    skWarSword:"单手战剑，护手做成半开的花形。",
    skHammer:"方头配重，落锤处会炸开一圈钻色碎光。",
    skDagger:"短而轻，刃口薄得几乎看不见。",
    skStaff:"杖头悬着一枚樱色晶核，比魔棒长出一截。",
    skWand:"短杖一点，指尖便落下一串细碎光点。",
    skBook:"翻开的书页停在你要用的那一页，字迹是樱色的。",
    skOrb:"悬浮光球在掌心缓缓自转，不落地也不熄灭。",
    skRing:"指间一枚会发光的戒指，光晕细得像一线樱丝。"
  };
  const EQUIP_EXCLUSIVE={
    skWreath:"与【樱色花帽】互斥，只能同时装配一种。",
    skFlowerHat:"与【樱色花环】互斥，只能同时装配一种。",
    skDress:"与【樱色护符】互斥，只能同时装配一种。",
    skAmulet:"与【樱色长裙】互斥，只能同时装配一种。",
    skFlowerShoes:"与【樱色足环】互斥，只能同时装配一种。",
    skWarBoots:"与【樱色足环】互斥，只能同时装配一种。",
    skAnklet:"与鞋子（樱色花鞋 / 樱色战靴）互斥，只能同时装配一种。"
  };
  const GATHER_BY_TOOL={harvest:["草丛","菇丛","果树","农田","钓鱼点"],
    mining:["废弃铜铁矿堆"],lumber:["森林巨杉","枯木"]};
  const PREFIX_FOR_LABEL={white:"普通之",green:"入门之",blue:"进阶之",
    purple:"史诗之",gold:"传说之"};
  Object.keys(EQUIPMENT).forEach(id=>{
    const it=EQUIPMENT[id];
    if(it.q==="diamond"&&!it.diamondTheme)it.diamondTheme="王者";
    if(it.q==="red"&&!it.redTheme)it.redTheme="不朽";
    if(!it.appraisal)it.appraisal=[];
    if(!it.enchant)it.enchant=[];
    if(!it.gatherTypes&&it.tool)it.gatherTypes=GATHER_BY_TOOL[it.tool]||[];
    if(!it.weight&&(it.slot==="main"||it.slot==="off"||it.slot==="two")){
      const w=it.wtype;
      it.weight=it.tool?({harvest:"light",mining:"medium",lumber:"medium"}[it.tool]||"medium"):
        (w==="greatsword"||w==="hammer"||(w==="axe"&&it.slot==="two")||
         (w==="shield"&&it.slot==="two")?"heavy":
         (["dagger","focus","book","orb","ring"].indexOf(w)>=0||
          (w==="staff"&&it.slot==="main")||(w==="bow"&&it.slot==="main")?"light":"medium"));
    }
    if(!it.fit){
      it.fit=it.allow&&it.allow.length===1?
        {best:[["warrior","mage","ranger","mage"][it.allow[0]]||"warrior"],normal:[],bad:[]}:
        {best:[],normal:["warrior","mage","ranger"],bad:[]};
    }
    /* 第八章 #6：非樱花防具补 sub（头饰 / 帽子、衣服 / 项链、鞋子 / 足饰） */
    if(!it.sub&&(it.slot==="head"||it.slot==="chest"||it.slot==="feet")){
      const byId={blueHat:"hat",leafCirclet:"circlet",ironHelm:"hat",starCrown:"circlet",
        rangerHood:"hat",mossCirclet:"circlet",leatherVest:"clothes",ironLightArmor:"clothes",
        windCloak:"clothes",starRobe:"clothes",blackPlate:"clothes",barkRobe:"clothes",
        sandals:"shoes",featherAnklet:"anklet",swiftBoots:"shoes"};
      if(byId[id])it.sub=byId[id];
    }
    /* 第八章 #8：樱花套件 desc 里的互斥说明移到独立 exclusive 行，介绍只留风味 */
    if(EQUIP_FLAVOR[id]){
      it.desc=EQUIP_FLAVOR[id];
      if(EQUIP_EXCLUSIVE[id])it.exclusive=EQUIP_EXCLUSIVE[id];
    }
    /* 标准全名 = 前缀 + 之 + 本名；历史樱花装备 name 自带前缀，先剥离避免重复。
       UI 显示统一用 it.label（材料 / 道具没有 label，用 `it.label||it.name` 自动回退）。 */
    const pre=it.q==="diamond"?(it.diamondTheme==="异界"?"异界钻装之":"王者钻装之"):
      (it.q==="red"?(it.redTheme==="传奇"?"传奇神装之":"不朽神装之"):
        (PREFIX_FOR_LABEL[it.q]||"普通之"));
    it.label=pre+String(it.name||"").replace(
      /^(王者钻装之|异界钻装之|传奇神装之|不朽神装之)/,"");
  });

  /* 初始装备（按职业 id，1.3.0 起没有 tool 槽） */
  const DEFAULT_EQUIP={
    0:{head:null,chest:null,main:"ironSword",off:"buckler",two:null,feet:null},
    1:{head:null,chest:null,main:null,off:null,two:"oakStaff",feet:null},
    2:{head:null,chest:null,main:null,off:null,two:"woodBow",feet:null},
    3:{head:null,chest:null,main:null,off:null,two:"sakuraFan",feet:null}
  };
  const EQUIP_DROPS={
    elite:["blueHat","leatherVest","ironDagger","ironLightArmor","spellBook","ironBow","sandals"],
    miniboss:["leafCirclet","windCloak","swiftBoots","battleAxe","crossbow","ironShield"],
    boss:["starCrown","starRobe","blackPlate","greatSword","arcaneOrb","flareGun"],
    sakuraTrial:["skWreath","skFlowerHat","skFan","skDress","skAmulet","skFlowerShoes","skWarBoots","skAnklet",
      "skGreatSword","skLongBow","skSleeveArrow","skSpear","skGreatShield","skRoundShield",
      "skAxe","skWarSword","skHammer","skDagger","skStaff","skWand","skBook","skOrb","skRing"]
  };

  /* ================= 怪物 ================= */
  const MOBS={
    neutral:{id:"neutral",label:"中立·草灵",hp:70,dmg:8,spd:1.15,scale:1.0,w:1.15,h:.72,
      body:"fat",main:C.neutral,dark:C.neutralDk,trim:C.cyan,acc:C.white,
      bar:C.hpBlue,xp:180,gold:8,drop:.55,ai:"neutral",reach:52},
    minion:{id:"minion",label:"小啰啰",hp:42,dmg:9,spd:2.05,scale:.80,w:.78,h:1.02,
      body:"thin",main:C.red,dark:C.redDk,trim:C.steelDk,acc:C.gold,
      bar:C.hpRed,xp:120,gold:6,drop:.34,ai:"chase",reach:46},
    normal:{id:"normal",label:"步兵",hp:76,dmg:14,spd:1.62,scale:1.0,w:1.0,h:1.0,
      body:"normal",main:C.red,dark:C.redDk,trim:C.steelDk,acc:C.gold,
      bar:C.hpRed,xp:220,gold:12,drop:.46,ai:"chase",reach:52},
    elite:{id:"elite",label:"精英·铁卫",hp:190,dmg:22,spd:1.40,scale:1.34,w:1.34,h:1.18,
      body:"tall",main:C.orange,dark:[.45,.22,.10],trim:C.gold,acc:C.gold,
      bar:C.hpOrange,xp:620,gold:34,drop:.82,ai:"chase",reach:64},
    miniboss:{id:"miniboss",label:"小统领",hp:390,dmg:28,spd:1.25,scale:1.68,w:1.55,h:1.02,
      body:"fat",main:C.purple,dark:C.purpleDk,trim:C.gold,acc:C.gold,
      bar:C.hpViolet,xp:1450,gold:80,drop:1,ai:"chase",reach:80},
    boss:{id:"boss",label:"黑石城主",hp:920,dmg:36,spd:1.05,scale:2.15,w:1.62,h:1.30,
      body:"tall",main:C.redDk,dark:C.black,trim:C.gold,acc:C.gold,
      bar:C.hpGold,xp:6800,gold:240,drop:1,ai:"boss",reach:100},
    candy:{id:"candy",label:"中立·糖偶团子",hp:60,dmg:6,spd:.9,scale:1.05,w:1.42,h:.62,
      body:"fat",main:C.candy,dark:C.candyDk,trim:C.white,acc:C.gold,
      bar:C.hpBlue,xp:150,gold:10,drop:.75,ai:"neutral",reach:48,market:true,
      desc:"圆滚滚的糖霜团子，被打扰才会鼓起腮帮子反击"},
    kite:{id:"kite",label:"中立·纸鸢精",hp:52,dmg:7,spd:1.3,scale:1.12,w:.62,h:1.34,
      body:"thin",main:C.kite,dark:C.kiteDk,trim:C.white,acc:C.pink,
      bar:C.hpBlue,xp:150,gold:10,drop:.75,ai:"neutral",reach:54,market:true,
      desc:"随风飘浮的纸风筝，竹骨上系着褪色祈愿签"}
  };
  /* 1.2.0 半中立野怪：有领地、会巡逻、进入领地才仇恨、离远脱战 */
  MOBS.seed={id:"seed",label:"半中立·蹦蹦种子",element:"木系",hp:96,dmg:11,spd:1.45,
    scale:.86,w:.90,h:.86,body:"fat",main:C.leaf1,dark:C.leaf2,trim:C.green,acc:C.gold,
    bar:C.hpAmber,xp:260,gold:12,drop:.55,ai:"halfNeutral",reach:52,territory:210,
    desc:"圆滚滚的种子，平时在草边蹦跶；踏进它的地盘就会用藤蔓抽人"};
  MOBS.hound={id:"hound",label:"半中立·锯齿恶犬",element:"暗系",hp:132,dmg:17,spd:1.95,
    scale:1.05,w:1.30,h:.78,body:"thin",main:C.ghostDark,dark:C.black,trim:C.red,acc:C.red,
    bar:C.hpAmber,xp:380,gold:18,drop:.62,ai:"halfNeutral",reach:58,territory:250,
    desc:"背脊像锯齿的黑犬，只在仓库后巷那一片巡逻"};
  MOBS.thug={id:"thug",label:"半中立·街头持刀小混子",element:"普通系",hp:155,dmg:19,spd:1.55,
    scale:1.02,w:1.0,h:1.02,body:"normal",main:C.cloth,dark:C.redDk,trim:C.steel,acc:C.gold,
    bar:C.hpAmber,xp:440,gold:22,drop:.70,ai:"halfNeutral",reach:56,territory:230,
    desc:"靠在木箱边晃刀子，谁走近他的地盘就跟谁急"};
  MOBS.axeman={id:"axeman",label:"半中立·斧头帮成员",element:"普通系",hp:210,dmg:24,spd:1.35,
    scale:1.20,w:1.16,h:1.10,body:"tall",main:C.brown,dark:C.deckDk,trim:C.iron,acc:C.gold,
    bar:C.hpAmber,xp:620,gold:32,drop:.82,ai:"halfNeutral",reach:66,territory:270,
    desc:"扛着伐木斧守着货堆，领地意识比谁都强"};
  /* 1.3.1 魔法丛林 · 持弓的半中立怪（此前被错误套用蹦蹦种子名字） */
  MOBS.archer={id:"archer",label:"半中立·林间弓手",element:"木系",hp:168,dmg:21,spd:1.62,
    scale:1.06,w:1.0,h:1.06,body:"normal",main:C.leaf2,dark:C.wood,trim:C.cloth2,acc:C.gold,
    bar:C.hpAmber,xp:480,gold:24,drop:.70,ai:"halfNeutral",reach:64,territory:225,
    desc:"背着短弓守林缘的猎手，进了他的地盘才会搭箭；走远便收弓回林"};
  /* 原始森林 · 中立动物（蓝血条，被攻击才反击，击败掉兽肉） */
  MOBS.deer={id:"deer",label:"中立·林鹿",element:"木系",hp:82,dmg:9,spd:1.9,
    scale:1.08,w:1.24,h:1.10,body:"thin",main:C.copper,dark:C.brown,trim:C.sand,acc:C.white,
    bar:C.hpBlue,xp:210,gold:8,drop:1,ai:"neutral",reach:52,animal:true,
    desc:"在果树边吃草的鹿，蓝血条，被打扰才会顶人；击败掉落兽肉"};
  MOBS.boar={id:"boar",label:"中立·野猪",element:"土系",hp:128,dmg:16,spd:1.55,
    scale:1.18,w:1.42,h:.88,body:"fat",main:C.brown,dark:C.black,trim:C.iron,acc:C.white,
    bar:C.hpBlue,xp:320,gold:12,drop:1,ai:"neutral",reach:56,animal:true,
    desc:"拱蘑菇的野猪，被打了才会冲撞；击败掉落兽肉"};
  MOBS.squirrel={id:"squirrel",label:"中立·松鼠",element:"木系",hp:54,dmg:6,spd:2.35,
    scale:.68,w:.74,h:.82,body:"fat",main:C.orange,dark:C.copper,trim:C.gold,acc:C.white,
    bar:C.hpBlue,xp:150,gold:6,drop:1,ai:"neutral",reach:40,animal:true,
    desc:"抱着果子跳来跳去的小松鼠，蓝血条；击败掉落兽肉"};
  /* 夜樱 BOSS 试炼形态（幽系），试炼结束即消失，不留在野外 */
  MOBS.sakuraBoss={id:"sakuraBoss",label:"试炼·夜樱",element:"幽系",hp:1450,dmg:30,spd:1.35,
    scale:1.75,w:1.30,h:1.24,body:"tall",main:C.ghostPink,dark:C.ghostDark,trim:C.sakura,acc:C.gold,
    bar:C.hpViolet,xp:0,gold:0,drop:0,ai:"boss",reach:92,
    desc:"樱下赏金委托人的试炼形态，幽灵与樱花凝成的法术少女"};
  /* ================= 1.4 dev1 · 蛮荒沼泽怪物 =================
     三类行为严格区分：
       ai:"neutral"      中立 —— 蓝血条，没领地，被攻击才反击，离开仇恨区域解除并回满
       ai:"halfNeutral"  半中立 —— 有领地环，入侵触发仇恨，出范围解除并回满
       ai:"chase"/"boss" 敌对 —— 只要被发现就不死不休
     drops 为概率掉落（swamp.js 按 .drop 概率抽取）。behavior 是给玩家看的机制说明。 */
  Object.assign(MOBS,{
    /* --- 中立 --- */
    poisonFrog:{id:"poisonFrog",label:"中立·毒蛙",element:"毒系",hp:120,dmg:14,spd:1.05,scale:.86,w:1.16,h:.68,
      body:"fat",main:C.green,dark:C.greenDk,trim:C.cyan,acc:C.white,
      bar:C.hpBlue,xp:420,gold:14,drop:.62,ai:"neutral",reach:48,
      drops:["venomSac","frogSlime"],desc:"鼓着毒囊蹲在浮叶上，人不犯我我不犯人",behavior:"蓝血条 · 无领地 · 离开仇恨区域解除并回满"},
    chameleon:{id:"chameleon",label:"中立·变色蜥",element:"爬行系",hp:138,dmg:16,spd:1.32,scale:.94,w:1.32,h:.72,
      body:"thin",main:C.leaf2,dark:C.greenDk,trim:C.gold,acc:C.white,
      bar:C.hpBlue,xp:460,gold:16,drop:.60,ai:"neutral",reach:52,
      drops:["lizardSkin","beastCore"],desc:"皮色随芦苇影子变，趴着几乎看不出来",behavior:"蓝血条 · 无领地 · 离开仇恨区域解除并回满"},
    swampRoe:{id:"swampRoe",label:"中立·沼泽狍子",element:"木系",hp:110,dmg:10,spd:1.65,scale:1.02,w:1.05,h:1.06,
      body:"normal",main:C.brown,dark:[.30,.20,.12],trim:C.gold,acc:C.white,
      bar:C.hpBlue,xp:380,gold:12,drop:.52,ai:"neutral",reach:46,
      drops:["rawMeat","savageHide"],desc:"在泥沼小岛间轻巧跳来跳去的狍子",behavior:"蓝血条 · 无领地 · 离开仇恨区域解除并回满"},
    /* --- 半中立 --- */
    swampCroc:{id:"swampCroc",label:"半中立·沼泽鳄",element:"水系",hp:320,dmg:26,spd:1.18,scale:1.42,w:1.62,h:.74,
      body:"fat",main:C.green,dark:C.greenDk,trim:C.steel,acc:C.gold,
      bar:C.hpBlue,xp:980,gold:42,drop:.86,ai:"halfNeutral",reach:70,
      drops:["beastCore","coreShard","crocSkin"],desc:"半沉在浅水里，只露一双眼睛",behavior:"有领地环 · 入侵触发仇恨 · 离开范围解除并回满"},
    blackBoar:{id:"blackBoar",label:"半中立·黑毛野猪",element:"土系",hp:290,dmg:24,spd:1.55,scale:1.30,w:1.42,h:1.02,
      body:"fat",main:[.20,.18,.18],dark:[.09,.08,.09],trim:C.gold,acc:C.white,
      bar:C.hpBlue,xp:900,gold:38,drop:.84,ai:"halfNeutral",reach:62,
      drops:["pork","coreShard","boarTusk","savageHide"],desc:"一身黑硬鬃毛，守着泥沼小岛不肯让步",behavior:"有领地环 · 入侵触发仇恨 · 离开范围解除并回满"},
    /* --- 敌对 · 野兽 --- */
    angryPiglet:{id:"angryPiglet",label:"暴躁小猪",element:"土系",hp:150,dmg:18,spd:1.85,scale:.84,w:.92,h:.86,
      body:"fat",main:C.pink,dark:C.pinkDk,trim:C.brown,acc:C.white,
      bar:C.hpRed,xp:420,gold:16,drop:.70,ai:"chase",reach:48,
      drops:["rawMeat","pigHide"],desc:"群居生物，受到攻击会尖叫呼唤同伴",behavior:"敌对 · 被发现即不死不休 · 受击呼唤同伴"},
    mosquitoSwarm:{id:"mosquitoSwarm",label:"吸血蚊群",element:"毒系",hp:96,dmg:12,spd:2.15,scale:.72,w:.88,h:1.18,
      body:"thin",main:C.violet,dark:C.purpleDk,trim:C.cyan,acc:C.white,
      bar:C.hpRed,xp:340,gold:12,drop:.48,ai:"chase",reach:44,
      drops:["venomSac"],desc:"天气潮湿时大量出现，攻击附带中毒效果（异常状态后续 dev 开启）",
      behavior:"敌对 · 潮湿天气成群 · 附带中毒（预留）"},
    mireLizard:{id:"mireLizard",label:"泥沼蜥蜴",element:"爬行系",hp:210,dmg:22,spd:1.72,scale:1.06,w:1.34,h:.78,
      body:"thin",main:C.leaf2,dark:C.greenDk,trim:C.steel,acc:C.cyan,
      bar:C.hpRed,xp:620,gold:22,drop:.66,ai:"chase",reach:56,
      drops:["lizardSkin","coreShard"],desc:"潜伏在水下，玩家划船经过时会突然跃起攻击（划船系统后续 dev）",
      behavior:"敌对 · 水下潜伏 · 跃起突袭（划船后续 dev）"},
    boarKing:{id:"boarKing",label:"野蛮猪王",element:"土系",hp:2400,dmg:46,spd:1.30,scale:2.35,w:1.92,h:1.42,
      body:"tall",main:[.24,.16,.14],dark:[.10,.07,.07],trim:C.gold,acc:C.gold,
      bar:C.hpGold,xp:12000,gold:460,drop:1,ai:"boss",reach:112,
      drops:["beastCore","coreShard","boarTusk","spiritShard"],
      desc:"红泥部落供奉的巨兽，巢穴在【沉没古神庙】",behavior:"终极 BOSS · 退潮后进入（后续 dev）"},
    /* --- 敌对 · 红泥食人部落 --- */
    spearThrower:{id:"spearThrower",label:"红泥部落·投矛手",element:"普通系",hp:180,dmg:20,spd:1.10,scale:1.0,w:.96,h:1.04,
      body:"normal",main:C.cloth,dark:C.redDk,trim:C.wood,acc:C.gold,
      bar:C.hpRed,xp:560,gold:24,drop:.60,ai:"chase",reach:260,
      drops:["reed","thornStrip"],desc:"哨塔上的守卫，投掷削尖的树枝，伤害中等，有些配备了毒药，数量较多",
      behavior:"敌对 · 远程 · 哨塔驻守"},
    musketeer:{id:"musketeer",label:"红泥部落·火枪手",element:"火系",hp:215,dmg:28,spd:1.02,scale:1.04,w:1.02,h:1.06,
      body:"normal",main:C.orange,dark:C.redDk,trim:C.steelDk,acc:C.gold,
      bar:C.hpOrange,xp:820,gold:36,drop:.72,ai:"chase",reach:300,
      drops:["fireOil","coreShard"],desc:"使用火绳枪攻击，可能会造成烧伤（异常状态后续 dev 开启）",
      behavior:"敌对 · 强化远程 · 火绳枪"},
    scout:{id:"scout",label:"红泥部落·斥候",element:"普通系",hp:165,dmg:18,spd:2.05,scale:.88,w:.82,h:1.0,
      body:"thin",main:C.cloth2,dark:C.blueDk,trim:C.gold,acc:C.white,
      bar:C.hpRed,xp:700,gold:30,drop:.68,ai:"chase",reach:60,
      drops:["pigHide","thornGrass"],desc:"不驻守哨塔，在芦苇荡中巡逻；发现玩家会吹响号角召唤增援",
      behavior:"敌对 · 高机动 · 吹号角召唤增援"},
    butcher:{id:"butcher",label:"红泥部落·屠夫",element:"土系",hp:520,dmg:36,spd:1.05,scale:1.62,w:1.58,h:1.28,
      body:"tall",main:C.red,dark:C.redDk,trim:C.steelDk,acc:C.gold,
      bar:C.hpOrange,xp:1800,gold:90,drop:.94,ai:"chase",reach:78,
      drops:["rawMeat","beastBone","savageHide"],desc:"手持巨大骨刀或石斧，身材粗壮高大，皮糙肉厚",
      behavior:"敌对 · 近战精英 · 粗壮高大"},
    trickster:{id:"trickster",label:"红泥部落·捣蛋鬼",element:"普通系",hp:105,dmg:12,spd:2.35,scale:.70,w:.72,h:.92,
      body:"thin",main:C.cloth3,dark:C.brown,trim:C.gold,acc:C.cyan,
      bar:C.hpRed,xp:480,gold:20,drop:.55,ai:"chase",reach:44,
      drops:["thornGrass","pigHide"],desc:"体型瘦小、行动敏捷；不会造成太高伤害，但受到攻击时概率偷走背包里某件材料",
      behavior:"敌对 · 骚扰 / 辅助 · 概率偷取材料"},
    shaman:{id:"shaman",label:"红泥部落·萨满",element:"毒系",hp:340,dmg:24,spd:1.12,scale:1.12,w:1.08,h:1.22,
      body:"tall",main:C.purple,dark:C.purpleDk,trim:C.white,acc:C.green,
      bar:C.hpViolet,xp:1500,gold:78,drop:.88,ai:"chase",reach:220,
      drops:["venomSac","beastCore","spiritShard"],desc:"身披兽骨、手持图腾；能召唤毒雾，为周围的食人族回血",
      behavior:"敌对 · 法术 / 稀有 · 毒雾与群体治疗"}
  });
  /* 分区生成表：type / x / depth / territory（半中立领地半径）/ zone */
  const SWAMP_MOBS=[
    /* 迷雾芦苇荡：中立为主 + 少量敌对 */
    {type:"poisonFrog",x:420,depth:52},{type:"chameleon",x:980,depth:-58},
    {type:"swampRoe",x:1480,depth:44},
    {type:"swampCroc",x:1120,depth:62,territory:230},
    {type:"mosquitoSwarm",x:760,depth:-30},{type:"mosquitoSwarm",x:1620,depth:56},
    {type:"scout",x:1360,depth:-44},
    /* 红泥食人部落：人类敌对密集 */
    {type:"spearThrower",x:1980,depth:-56},{type:"spearThrower",x:2320,depth:60},
    {type:"spearThrower",x:2760,depth:-52},{type:"spearThrower",x:3160,depth:58},
    {type:"musketeer",x:2140,depth:40},{type:"musketeer",x:2980,depth:-36},
    {type:"scout",x:2520,depth:48},{type:"scout",x:3400,depth:-40},
    {type:"butcher",x:2660,depth:16},{type:"trickster",x:2260,depth:-64},
    {type:"trickster",x:3060,depth:62},{type:"shaman",x:3320,depth:20},
    {type:"angryPiglet",x:2420,depth:28},{type:"angryPiglet",x:2480,depth:64},
    {type:"angryPiglet",x:2900,depth:-20},
    /* 毒瘴泥潭：高危资源区 */
    {type:"blackBoar",x:3760,depth:52,territory:260},
    {type:"blackBoar",x:4620,depth:-46,territory:250},
    {type:"swampCroc",x:4180,depth:64,territory:240},
    {type:"mireLizard",x:3980,depth:-58},{type:"mireLizard",x:4460,depth:44},
    {type:"mosquitoSwarm",x:3860,depth:32},{type:"mosquitoSwarm",x:4380,depth:60},
    {type:"shaman",x:4820,depth:-30},
    /* 沉没古神庙：终极 BOSS（退潮进入机制后续 dev） */
    {type:"butcher",x:5220,depth:40},{type:"shaman",x:5560,depth:-44},
    /* 1.4 dev1.2：原本 5760 落在可视区右侧之外，玩家进古庙看不到 BOSS，前移到 5400 */
    {type:"boarKing",x:5400,depth:0,boss:true,temple:true}
  ];

  const MOB_ORDER=["neutral","minion","normal","elite","miniboss","boss","candy","kite",
    "seed","hound","thug","axeman","archer","deer","boar","squirrel","sakuraBoss"];
  const ELEMENTS={土:"土系",光:"光系",木:"木系",幽:"幽系",火:"火系",水:"水系",暗:"暗系",普通:"普通系",
    毒:"毒系",爬行:"爬行系"};

  /* ================= 背包：材料 / 道具 / 经验果 ================= */
  const MATERIALS={
    iron:{name:"铁矿石",icon:"⬡",color:C.steelDk,desc:"锻造护具的基础矿料",source:"击败小怪 / 精英掉落，矿区采集"},
    dust:{name:"魔尘",icon:"✧",color:C.violet,desc:"法术回路的催化剂",source:"击败法师系敌人 / 城堡区域掉落"},
    hide:{name:"兽皮",icon:"▤",color:C.brown,desc:"缝制轻甲与箭袋",source:"击败野兽类小怪掉落"},
    crystal:{name:"辉晶",icon:"◆",color:C.cyan,desc:"蕴含元素能量的结晶",source:"精英怪掉落 / 夜樱赏金"},
    rune:{name:"古符文",icon:"❖",color:C.gold,desc:"城堡深处掉落的铭文残片",source:"小统领与黑石城主必定掉落"},
    ember:{name:"余烬核",icon:"●",color:C.fire,desc:"BOSS 身上剥落的炽热核心",source:"击败黑石城主"},
    petal:{name:"夜樱花瓣",icon:"✿",color:C.sakura,desc:"只在狂欢集市飘落，夜樱喜欢的小礼物",source:"狂欢集市草丛 / 夜樱赏金"},
    copper:{name:"铜矿石",icon:"⬢",color:C.copper,desc:"港口废弃矿堆里捡到的红铜，港口商人收",sell:14,
      source:"星火港 · 废弃铜铁矿堆（需铁镐，每日 3 次）"},
    apple:{name:"苹果",icon:"🍎",color:C.red,desc:"海风里长甜的苹果，可直接卖给港口商人",sell:9,
      source:"星火港 · 苹果树采集（每日 3 次，每次 3~6 个）"},
    egg:{name:"鸟蛋",icon:"🥚",color:C.white,desc:"草丛里捡到的海鸟蛋",sell:11,
      source:"星火港 · 草丛采集点（每日 4 次）"},
    leaf:{name:"叶片",icon:"🍃",color:C.leaf1,desc:"盐海边罕见的宽叶，药铺收",sell:7,
      source:"星火港 · 草丛采集点（每日 4 次）"},
    herb:{name:"甘草",icon:"🌿",color:C.green,desc:"嚼起来有点甜的草根",sell:12,
      source:"星火港 · 草丛采集点（每日 4 次）"},
    berry:{name:"野果",icon:"🫐",color:C.violet,desc:"灌木丛里的紫黑色小果",sell:8,
      source:"星火港 · 草丛采集点（每日 4 次）"},
    wood:{name:"原木",icon:"🪵",color:C.wood,desc:"原始森林伐来的木料，德鲁伊与港口商人都收",sell:18,
      source:"魔法丛林 · 原始森林伐木点（需伐木斧 / 双人锯，每日 3 次）"},
    pear:{name:"梨",icon:"🍐",color:C.leaf1,desc:"原始森林梨树上摘的青梨，薇薇安的支线要用到",sell:12,
      source:"魔法丛林 · 原始森林梨树采集（每日 3 次）"},
    grape:{name:"葡萄",icon:"🍇",color:C.violet,desc:"古藤上垂下的一串串紫葡萄，德鲁伊也拿来酿酒",sell:14,
      source:"魔法丛林 · 原始森林葡萄藤采集（每日 3 次）"},
    mushroom:{name:"林菇",icon:"🍄",color:C.pink,desc:"菇丛里采的菌子，戴采集者手套会多收一些",sell:10,
      source:"魔法丛林 · 原始森林菇丛采集（每日 4 次）"},
    meat:{name:"兽肉",icon:"🥩",color:C.red,desc:"林鹿 / 野猪 / 松鼠掉落，港口商人与德鲁伊都收",sell:22,
      source:"魔法丛林 · 原始森林中立动物（被攻击后反击，击败掉落）"}
  };
  const ITEMS={
    potion:{name:"生命药水",icon:"✚",color:C.green,desc:"立即回复 45 点生命",type:"heal",val:45,cd:9,price:40,
      source:"阿福摊位 40 金币 / 击败小怪掉落"},
    tonic:{name:"能量药剂",icon:"✦",color:C.cyan,desc:"立即回复 60 点能量",type:"energy",val:60,cd:9,price:45,
      source:"阿福摊位 45 金币 / 击败小怪掉落"},
    charm:{name:"锐锋护符",icon:"⚔",color:C.gold,desc:"本局攻击力 +18%",type:"buff",val:.18,cd:22,price:90,
      source:"阿福摊位 90 金币 / 稀有掉落"},
    feather:{name:"疾风羽",icon:"➶",color:C.white,desc:"本局移速 +20%",type:"speed",val:.20,cd:22,price:80,
      source:"阿福摊位 80 金币 / 稀有掉落"},
    bomb:{name:"震爆弹",icon:"✷",color:C.fire,desc:"对周围敌人造成 90 点伤害",type:"bomb",val:90,cd:16,price:70,
      source:"阿福摊位 70 金币 / 小统领掉落"},
    /* 经验道具（不可放入道具槽，点击直接使用） */
    expSmall:{name:"小型成长果",icon:"🍏",color:C.green,desc:"为当前角色增加 3,000 经验",type:"exp",val:3000,
      price:120,noSlot:true,source:"阿福摊位 120 金币 / 击败小怪掉落"},
    expTasty:{name:"可口果",icon:"🍎",color:C.red,desc:"为当前角色增加 12,000 经验",type:"exp",val:12000,
      price:400,noSlot:true,source:"阿福摊位 400 金币 / 精英掉落"},
    expLarge:{name:"大型成长果",icon:"🍑",color:C.pink,desc:"向经验池注入 50,000 经验，可分配给任意队员",type:"expPool",val:50000,
      price:900,noSlot:true,source:"阿福摊位 900 金币 / 小统领掉落"},
    wiseFruit:{name:"智慧果",icon:"🌟",color:C.gold,desc:"按当前等级向经验池注入 30,000~120,000 经验",type:"expPoolRand",
      price:600,noSlot:true,source:"阿福摊位 600 金币 / 黑市"},
    levelFruit:{name:"升级果",icon:"🍇",color:C.violet,desc:"让当前角色直接提升 1 级（不超过 100 级）",type:"levelUp",val:1,
      price:1500,noSlot:true,source:"黑石城主掉落 / 黑市"},
    /* 1.3.0 启用：养成三件套（点击道具后进入对应养成流程） */
    rewashPill:{name:"洗髓丹",icon:"💠",color:C.cyan,price:680,noSlot:true,type:"rewash",
      desc:"洗练角色天生的 6 项资质星级与评级分数，结果可预览后再决定是否覆盖",source:"星火港 · 黑市商人 680 金币"},
    personaCard:{name:"性格重塑卡片",icon:"🃏",color:C.purple,price:520,noSlot:true,type:"persona",
      desc:"从 25 种性格里重新指定一种，影响物攻 / 法攻 / 双防 / 速度 ±10%",source:"星火港 · 黑市商人 520 金币"},
    effortFruit:{name:"学习力果实",icon:"📘",color:C.blue,price:460,noSlot:true,type:"effort",
      desc:"为当前角色指定一项学习力 +32（单项上限 256，总和上限 512）",source:"星火港 · 黑市商人 460 金币"},
    /* 1.3.1 德鲁伊小摊 · 养成道具 */
    personaEditCard:{name:"性格修改卡",icon:"🎴",color:C.purple,price:420,noSlot:true,type:"personaReroll",
      desc:"随机更换当前角色的性格（25 种之一），影响 ±10% 属性",source:"德鲁伊的小摊 · 每日限 2 张"},
    personaSpecCard:{name:"性格指定卡",icon:"🃏",color:C.violet,price:880,noSlot:true,type:"persona",
      desc:"从 25 种性格里自由指定一种，打开选择面板后生效",source:"德鲁伊的小摊 · 每周限 1 张"},
    effortAtk:{name:"物攻小型学习力果实",icon:"🔴",color:C.red,price:160,noSlot:true,type:"effortSmall",effortKey:"atk",
      desc:"物攻学习力 +5（单项上限 256，总和 512）",source:"德鲁伊的小摊 · 每日限 3 个"},
    effortMatk:{name:"魔攻小型学习力果实",icon:"🔵",color:C.cyan,price:160,noSlot:true,type:"effortSmall",effortKey:"matk",
      desc:"法攻学习力 +5",source:"德鲁伊的小摊 · 每日限 3 个"},
    effortSpd:{name:"速度小型学习力果实",icon:"🟡",color:C.gold,price:160,noSlot:true,type:"effortSmall",effortKey:"spd",
      desc:"速度学习力 +5",source:"德鲁伊的小摊 · 每日限 3 个"},
    effortHp:{name:"生命小型学习力果实",icon:"🟢",color:C.green,price:160,noSlot:true,type:"effortSmall",effortKey:"hp",
      desc:"体力学习力 +5",source:"德鲁伊的小摊 · 每日限 3 个"},
    effortDef:{name:"防御小型学习力果实",icon:"⚪",color:C.steel,price:160,noSlot:true,type:"effortSmall",effortKey:"pdef",
      desc:"物防学习力 +5",source:"德鲁伊的小摊 · 每日限 3 个"},
    effortMdef:{name:"特防小型学习力果实",icon:"🟣",color:C.violet,price:160,noSlot:true,type:"effortSmall",effortKey:"mdef",
      desc:"法防学习力 +5",source:"德鲁伊的小摊 · 每日限 3 个"},
    effortForget:{name:"学习力遗忘果",icon:"🍈",color:C.leaf2,price:520,noSlot:true,type:"effortForget",
      desc:"让当前角色的 6 项学习力全部归零，可重新分配",source:"德鲁伊的小摊 · 每周限 2 个"},
    forgetPotion:{name:"遗忘药水",icon:"🧪",color:C.ice,price:760,noSlot:true,type:"resetLevel",
      desc:"让当前角色回到 1 级，但保留已学会 / 已配置的技能与装备",source:"德鲁伊的小摊 · 每周限 1 瓶"},
    sakuraEgg:{name:"夜樱蛋",icon:"🥚",color:C.sakura,price:0,noSlot:true,type:"egg",
      desc:"击败试炼形态夜樱获得的蛋。带去【魔法丛林】找德鲁伊孵化，可让夜樱（女 · 幽系）加入队伍",
      source:"星火港 · 夜樱 BOSS 试炼获胜奖励（每日限 10 次）"}
  };
  const DROP_TABLE=[
    {k:"mat",id:"iron",w:22},{k:"mat",id:"dust",w:18},{k:"mat",id:"hide",w:16},
    {k:"mat",id:"crystal",w:13},{k:"mat",id:"rune",w:7},{k:"mat",id:"ember",w:4},
    {k:"mat",id:"petal",w:8},
    {k:"item",id:"potion",w:9},{k:"item",id:"tonic",w:7},
    {k:"item",id:"charm",w:3},{k:"item",id:"feather",w:3},{k:"item",id:"bomb",w:4},
    {k:"item",id:"expSmall",w:8},{k:"item",id:"expTasty",w:4},
    {k:"item",id:"expLarge",w:2}
  ];
  const UPGRADES=[
    {id:"hp",name:"体魄",desc:"最大生命 +12 / 级",cost:["iron","iron"]},
    {id:"atk",name:"力量",desc:"攻击力 +2 / 级",cost:["iron","crystal"]},
    {id:"spd",name:"迅捷",desc:"移速 +3% / 级",cost:["hide","hide"]},
    {id:"crit",name:"精准",desc:"暴击率 +1.5% / 级",cost:["dust","crystal"]},
    {id:"armor",name:"物防",desc:"物防 +1.5 / 级",cost:["iron","hide"]}
  ];

  /* ================= 大地图 ================= */
  const MAPS=[
    {id:"dusk",name:"黄昏城堡",sub:"新手村 · 8 波战役",icon:"🏰",type:"battle",
     desc:"赤霞隘口到黑石城堡的连续战役。通关全部关卡即可点亮大地图。",
     unlock:null,accent:"#ff9f5a",tag:"战役"},
    {id:"market",name:"狂欢集市",sub:"自由城镇 · 中立野怪",icon:"🏮",type:"town",
     desc:"灯火、樱花与叫卖声。没有波次，只有闲逛的路人、可采集的夜樱与摊贩阿福。",
     unlock:"duskCleared",accent:"#ff8fb4",tag:"城镇"},
    {id:"harbor",name:"星火港",sub:"开放港口 · 采集与试炼",icon:"⚓",type:"town",
     desc:"木甲板、木桶与缆绳之外是整片海。港口商人收材料、黑市商人卖稀罕物，7 处采集点散布在码头，夜樱在灯塔下等着试炼者。",
     unlock:"duskCleared",accent:"#6ad0e8",tag:"开放地图"},
    {id:"forest",name:"魔法丛林",sub:"五段林境 · 孵化室与原始森林",icon:"🌲",type:"town",
     desc:"森林入口 / 原始森林 / 林间小道 / 魔林森处 / 森林出口 五段自然过渡。德鲁伊的孵化室需 300 时间孵蛋，小摊限量售卖养成道具；薇薇安在原始森林等她的梨。",
     unlock:"duskCleared",accent:"#7fbf6a",tag:"开放地图"},
    {id:"swamp",name:"蛮荒沼泽",sub:"泥沼与獠牙 · 危险区 · 推荐 Lv.40+",icon:"🪷",type:"danger",
     desc:"大片高高的芦苇荡、浅水与零星泥沼小岛，常年薄雾、视野很差。迷雾芦苇荡 / 红泥食人部落 / 毒瘴泥潭 / 沉没古神庙四段子区域，红泥食人部落与野蛮猪王盘踞在此。",
     unlock:"duskCleared",accent:"#8aa06a",tag:"危险区",risk:"danger",recLv:40},
    {id:"border",name:"雨沼边境走廊",sub:"四段边境 · 推荐 Lv.85+ · 通往魔法大学城",icon:"🌧",type:"danger",
     desc:"目前最大的开放地图（9600px）。雨沼洼地 → 灌木丛林（默认落点）→ 农田&破败村落 → 魔法大学城西郊城门处四段自然过渡，作为【魔法大学城】的空间过渡带。7 位 NPC、8 位路人、17 处采集点，野外可攻击对象数值 ≥ 前图 3 倍。",
     unlock:"duskCleared",accent:"#8fb9c9",tag:"边境走廊",risk:"danger",recLv:85},
    {id:"university",name:"魔法大学城",sub:"四子区域 · 学院主线区 · 安全",icon:"🏛",type:"town",
     desc:"集市外街（默认落点）→ 旗帜广场 → 魔法工会堂（室内）→ 魔法公寓区四段。悬浮横幅、魔法路灯、扫帚巡逻与彩窗穹顶；旗帜广场泉水可恢复全队生命，12 位 NPC 与 21 位路人构成活着的学院城。",
     unlock:"cityPermit",accent:"#9fc6ff",tag:"学院城",risk:"safe",
     unlockHint:"在西郊城门【新生接待员】缴 9900 金币报名 → 展示任意元素技能通过考核 → 找【城门石像鬼守卫】核实入内凭据"}
  ];
  const MARKET_W=3600;
  const HARBOR_W=5200;
  const FOREST_W=4800;
  const SWAMP_W=6000;
  const BORDER_W=9600;
  const UNI_W=7600;
  /* 1.4 dev1 区域风险：以「非中立 / 半中立敌对单位密度」判定。
     danger=危险区域（非中立占主要或半中立敌对单位较多）；safe=安全区域（中立 / NPC 为主）。 */
  const ZONE_RISK={dusk:"danger",market:"safe",harbor:"safe",forest:"safe",swamp:"danger",border:"danger",university:"safe"};
  const AI_DOC={
    hostile:"敌对 · 只要被发现就会不死不休，直到一方倒下",
    halfNeutral:"半中立 · 有领地范围，入侵触发仇恨值；离开范围即解除并回满状态",
    neutral:"中立 · 没有领地意识，人不犯我我不犯人；玩家离开仇恨区域后解除并回满状态"
  };

  /* ================= 天气 / 昼夜 / 地面 ================= */
  const WEATHER={
    sunny:{id:"sunny",name:"晴天",icon:"☀",desc:"暖阳洒在彩旗上",
      tint:[1.03,1.01,.98],ambient:1.0,sky:[.10,.20,.42,.58,.44,.78,1,.72,.45],
      rain:0,snow:0,petal:1,wind:.35,lightning:0},
    rain:{id:"rain",name:"雨天",icon:"☂",desc:"细雨打湿青石板",
      tint:[.86,.92,1.06],ambient:.86,sky:[.09,.13,.24,.30,.38,.50,.58,.62,.70],
      rain:1,snow:0,petal:.35,wind:.85,lightning:0},
    storm:{id:"storm",name:"雷雨",icon:"⚡",desc:"雷光把整条街照成白昼",
      tint:[.74,.80,1.02],ambient:.72,sky:[.05,.07,.16,.18,.22,.34,.42,.46,.56],
      rain:1.6,snow:0,petal:.2,wind:1.5,lightning:1},
    snow:{id:"snow",name:"雪天",icon:"❄",desc:"雪落在灯笼上就化了",
      tint:[.92,.97,1.12],ambient:.94,sky:[.12,.17,.30,.42,.50,.64,.78,.82,.90],
      rain:0,snow:1,petal:0,wind:.45,lightning:0}
  };
  const WEATHER_ORDER=["sunny","rain","storm","snow"];
  /* ================= 1.4 dev1.3 异常状态 =================
     dmg: 每秒按最大体力比例扣除（走固伤 / 真抗 / 真实护盾通道）
     dur: 随机持续 [min,max] 秒；dot/control 分类；互斥与免疫见 status.js */
  const STATUS={
    choke:{id:"choke",name:"窒息",icon:"😫",kind:"dot",dur:[4,8],dmg:.10,grow:.05,cap:.30,
      desc:"每秒扣除最大体力 10%，每秒递增 5%，至多 30%"},
    burn:{id:"burn",name:"烧伤",icon:"🔥",kind:"dot",dur:[15,21],dmg:1/8,
      desc:"每秒扣除最大体力的 1/8；火系免疫；与冻伤 / 中毒 / 衰弱互斥"},
    frost:{id:"frost",name:"冻伤",icon:"❄️",kind:"dot",dur:[15,21],dmg:1/8,
      desc:"每秒扣除最大体力的 1/8；冰系免疫；受到火系伤害自动解除"},
    poison:{id:"poison",name:"中毒",icon:"☠️",kind:"dot",dur:[15,21],dmg:1/8,
      desc:"每秒扣除最大体力的 1/8；对木系有效；与烧伤 / 冻伤 / 衰弱互斥"},
    parasite:{id:"parasite",name:"寄生",icon:"🐛",kind:"dot",dur:[21,27],dmg:1/10,
      desc:"每秒吸取最大体力的 1/10 给施加者；木系无效"},
    bind:{id:"bind",name:"束缚",icon:"🕸️",kind:"dot",dur:[15,21],dmg:1/16,noSwitch:true,
      desc:"每秒扣除最大体力的 1/16，无法替换角色"},
    curse:{id:"curse",name:"诅咒",icon:"👁️",kind:"dot",dur:[9999,9999],dmg:1/4,noCure:true,
      desc:"每秒扣除最大体力的 1/4，持续到死亡，药剂无效"},
    weak:{id:"weak",name:"衰弱",icon:"📉",kind:"dot",dur:[12,12],dmg:.09,decay:.012,
      desc:"每秒扣除体力且递减，持续 12 秒；与烧伤 / 冻伤 / 中毒互斥"},
    fear:{id:"fear",name:"害怕",icon:"😨",kind:"control",dur:[2,4],noAct:true,
      desc:"无法行动，持续 2~4 秒"},
    confuse:{id:"confuse",name:"混乱",icon:"🌀",kind:"control",dur:[3,6],reverse:true,
      desc:"50% 概率移动方向颠倒，持续 3~6 秒"},
    paralyze:{id:"paralyze",name:"麻痹",icon:"⚡",kind:"control",dur:[3,9],fail:.5,
      desc:"每秒 50% 无法行动；技能会消耗能量并进入 CD 却不释放"},
    sleep:{id:"sleep",name:"睡眠",icon:"😴",kind:"control",dur:[3,9],noAct:true,
      desc:"无法行动，受到攻击伤害自动解除（异常状态伤害不解除）；不与扣血状态共存"},
    nightmare:{id:"nightmare",name:"恶梦",icon:"👻",kind:"dot",dur:[9,18],dmg:1/4,
      desc:"每秒扣除最大体力的 1/4，持续 9~18 秒"}
  };
  const STATUS_MAX=3;

  const GROUND={
    grass:{id:"grass",name:"草丛",step:"stepGrass",c1:[.30,.52,.30],c2:[.16,.32,.20],icon:"❦",
      source:"狂欢集市西段、夜樱附近的草丛"},
    sand:{id:"sand",name:"沙土",step:"stepSand",c1:[.76,.64,.44],c2:[.52,.42,.29],icon:"≋",
      source:"狂欢集市中段摊车前的沙土地"},
    stone:{id:"stone",name:"石板",step:"stepStone",c1:[.55,.57,.64],c2:[.34,.36,.44],icon:"▦",
      source:"狂欢集市石桥与东段街道"},
    deck:{id:"deck",name:"木甲板",step:"stepDeck",c1:C.deckLite,c2:C.deckDk,icon:"▤",
      source:"星火港 · 码头栈桥与货栈前的木甲板"},
    beach:{id:"beach",name:"海沙滩",step:"stepSand",c1:C.sandBeach,c2:C.sandDk,icon:"≋",
      source:"星火港 · 防波堤外的沙滩"},
    water:{id:"water",name:"浅水泥沼",step:"splash",c1:[.16,.32,.30],c2:[.06,.16,.18],icon:"≈",
      source:"蛮荒沼泽 · 芦苇荡与泥沼小岛之间的浅水"}
  };

  /* ================= 集市 NPC / 路人 / 商店 ================= */
  const NPCS={
    sakura:{id:"sakura",name:"夜樱",title:"樱下赏金委托人",icon:"✿",x:1180,depth:-26,
      role:"bounty",color:C.sakura,desc:"幽灵与樱花凝成的少女，粉色汉服、粉发，擅长法术。未来会成为可操控角色。"},
    vendor:{id:"vendor",name:"阿福",title:"百物摊主",icon:"⚖",x:2380,depth:22,
      role:"shop",color:C.gold,desc:"推着小车走南闯北，什么都卖一点：消耗品、经验果，还有几件压箱底的装备。"}
  };
  const WALKERS=[
    {name:"提灯小哥",x:420,d0:-40,color:C.cloth2,icon:"●",speed:34,range:210,line:"今晚的灯比去年亮多啦"},
    {name:"买糖的姑娘",x:880,d0:38,color:C.pink,icon:"✿",speed:26,range:260,line:"糖偶团子今天又跑出来了"},
    {name:"赶路的商队",x:1760,d0:-10,color:C.cloth3,icon:"▣",speed:42,range:300,line:"前面石桥的雪还没化"},
    {name:"看热闹的小孩",x:2820,d0:52,color:C.cloth,icon:"★",speed:52,range:190,line:"纸鸢精飞得好高！"}
  ];
  /* 商店：k=item 普通道具，k=equip 装备（价格取 EQUIPMENT[id].price） */
  const SHOP=[
    {k:"item",id:"potion",price:40},{k:"item",id:"tonic",price:45},{k:"item",id:"bomb",price:70},
    {k:"item",id:"feather",price:80},{k:"item",id:"charm",price:90},
    {k:"item",id:"expSmall",price:120},{k:"item",id:"expTasty",price:400},
    {k:"item",id:"expLarge",price:900},{k:"item",id:"wiseFruit",price:600},
    {k:"equip",id:"blueHat"},{k:"equip",id:"leatherVest"},{k:"equip",id:"sandals"},
    {k:"equip",id:"ironDagger"},{k:"equip",id:"ironBow"},{k:"equip",id:"spellBook"},
    {k:"equip",id:"ironLightArmor"},{k:"equip",id:"rangerHood"},{k:"equip",id:"ironShield"},
    {k:"equip",id:"gathererGloves"},{k:"equip",id:"ironPick"},{k:"equip",id:"woodAxe"},
    {k:"equip",id:"featherAnklet"}
  ];
  /* ================= 星火港：NPC / 采集点 / 半中立怪 / 试炼 ================= */
  const HARBOR_NPCS={
    trader:{id:"trader",name:"港口商人 · 老锚",title:"收货与锻造",icon:"⚓",x:1080,depth:24,
      role:"trade",color:C.gold,
      desc:"在码头收了三十年货，材料在他手里总能换个好价钱；顺带支了座小锻炉，能帮你把矿石打成装备。"},
    black:{id:"black",name:"黑市商人 · 鸦",title:"只在灯影里出现",icon:"🕶",x:3260,depth:-30,
      role:"black",color:C.ghostViolet,
      desc:"兜帽下只看得见一只眼睛。卖的东西多半还用不上，但早晚用得上。"},
    trial:{id:"trial",name:"夜樱 · 试炼形态",title:"樱下试炼",icon:"✿",x:4520,depth:-18,
      role:"trial",color:C.ghostPink,
      desc:"幽灵与樱花凝成的法术少女。与她对话即可开始 BOSS 试炼，每日限 10 次，获胜得【夜樱蛋】。"}
  };
  /* 采集点：每日次数按北京时间自然日重置，写入存档 */
  const HARBOR_NODES=[
    {id:"ore1",kind:"ore",name:"废弃铜铁矿堆",icon:"⛏",x:620,depth:-52,daily:3,time:2.2,
      tool:"ironPick",drops:["iron","copper"],min:2,max:4,
      desc:"半塌的矿车与碎石，需要【铁镐】才能敲开"},
    {id:"ore2",kind:"ore",name:"废弃铜铁矿堆",icon:"⛏",x:2380,depth:58,daily:3,time:2.2,
      tool:"ironPick",drops:["iron","copper"],min:2,max:4,
      desc:"被海风吹得发红的另一堆矿脉，同样需要【铁镐】"},
    {id:"apple1",kind:"apple",name:"苹果树",icon:"🍎",x:1480,depth:-64,daily:3,time:1.6,
      drops:["apple"],min:3,max:6,
      desc:"徒手也能摘；戴【采集者手套】效率更高"},
    {id:"apple2",kind:"apple",name:"苹果树",icon:"🍎",x:2940,depth:-58,daily:3,time:1.6,
      drops:["apple"],min:3,max:6,desc:"靠近防波堤的一棵，果子被海风养得最甜"},
    {id:"apple3",kind:"apple",name:"苹果树",icon:"🍎",x:4060,depth:52,daily:3,time:1.6,
      drops:["apple"],min:3,max:6,desc:"灯塔后的老树，树荫正好罩住试炼场地"},
    {id:"grass1",kind:"grass",name:"海边草丛",icon:"❦",x:1880,depth:62,daily:4,time:1.4,
      drops:["egg","leaf","herb","berry"],min:4,max:8,
      desc:"盐草丛里藏着鸟蛋与药草；采集者手套可提高效率"},
    {id:"grass2",kind:"grass",name:"海边草丛",icon:"❦",x:3680,depth:64,daily:4,time:1.4,
      drops:["egg","leaf","herb","berry"],min:4,max:8,
      desc:"黑市后巷的草窝，偶尔能翻出罕见的甘草"}
  ];
  /* 半中立怪：领地中心、巡逻半径、系别 */
  const HARBOR_MOBS=[
    {type:"seed",x:900,depth:-40,territory:210},
    {type:"seed",x:1780,depth:48,territory:200},
    {type:"hound",x:2640,depth:-46,territory:250},
    {type:"hound",x:4300,depth:40,territory:240},
    {type:"thug",x:2180,depth:-20,territory:230},
    {type:"axeman",x:3480,depth:34,territory:270}
  ];
  const HARBOR_WALKERS=[
    {name:"搬桶的水手",x:480,d0:46,color:C.cloth2,icon:"●",speed:30,range:230,line:"这批货今晚就得装船"},
    {name:"卖鱼妇",x:1620,d0:52,color:C.cloth3,icon:"✿",speed:26,range:260,line:"潮水一退，蟹就出来了"},
    {name:"巡逻的码头工",x:2860,d0:-42,color:C.cloth,icon:"▣",speed:40,range:320,line:"后巷那条黑犬又回来了"},
    {name:"追海鸥的小孩",x:3980,d0:56,color:C.pink,icon:"★",speed:50,range:210,line:"灯塔那边有樱花在飘！"}
  ];
  /* 港口商人：出售价取 MATERIALS[id].sell；锻造配方消耗材料 + 金币 */
  const TRADE_PRICE={iron:10,dust:14,hide:9,crystal:28,rune:34,ember:46,petal:12};
  const FORGE=[
    {id:"ironDagger",gold:120,mats:{iron:3,hide:1}},
    {id:"ironBow",gold:180,mats:{iron:4,hide:2}},
    {id:"spellBook",gold:210,mats:{dust:3,crystal:1}},
    {id:"ironLightArmor",gold:240,mats:{iron:5,hide:2}},
    {id:"ironShield",gold:150,mats:{iron:4,copper:2}},
    {id:"ironPick",gold:90,mats:{iron:2}},
    {id:"gathererGloves",gold:110,mats:{hide:3,leaf:2}},
    {id:"swiftBoots",gold:280,mats:{hide:4,crystal:2}}
  ];
  const BLACK_MARKET=[
    {k:"item",id:"rewashPill",price:680},{k:"item",id:"personaCard",price:520},
    {k:"item",id:"effortFruit",price:460},{k:"item",id:"levelFruit",price:1500},
    {k:"item",id:"wiseFruit",price:600},{k:"item",id:"expLarge",price:900},
    {k:"mat",id:"rune",price:120},{k:"mat",id:"crystal",price:90},
    {k:"equip",id:"battleAxe"},{k:"equip",id:"crossbow"},
    {k:"equip",id:"starCrown"},{k:"equip",id:"blackPlate"}
  ];
  const TRIAL={limit:10,gold:60,egg:"sakuraEgg",
    lines:["……你又来了。","这次不是数花瓣。灯塔下的风会替我出手。",
      "赢了我，这枚蛋就归你；输了，明天再来。"],
    /* 1.4 dev1：领过蛋之后，夜樱改为「专属装备试炼」——难度 ★★★★，
       产出【樱花套件】王者钻装，不再重复发蛋也不再只给金币。 */
    equipLines:["蛋已经交给你了。","那么这一次，试试我真正压箱底的东西。",
      "樱色加护的二十一件的其中一件，会留给赢过我的人。",
      "难度 ★★★★ · 失败同样消耗一次机会。"],
    equipStars:4,equipHpMul:1.35,equipDmgMul:1.25,
    /* 1.4 dev1.2：最多累计掉落 2 套完整钻装（每件 ≤2），优先未拥有 */
    maxSets:2,resetUsedOnUpgrade:true};

  /* ================= 1.3.1 魔法丛林：单地图多子区域 =================
     仿黄昏城堡的「赤霞隘口 / 翠峰原野」模式：五段自然过渡，各段天色 / 植被 / 雾气不同。 */
  const FOREST_ZONES=[
    {id:"entrance",name:"森林入口",start:0,end:1200,
     sky:[[.08,.24,.38],[.24,.48,.52],[.48,.68,.52]],hill:[.18,.34,.26],
     grass:[.22,.40,.22],tint:[.96,1.04,.96],ambient:1.0,density:1.0,
     desc:"林缘的开阔地，德鲁伊的树屋就在这里"},
    {id:"primeval",name:"原始森林",start:1200,end:2600,
     sky:[[.04,.18,.26],[.14,.36,.34],[.30,.52,.36]],hill:[.10,.26,.20],
     grass:[.14,.32,.18],tint:[.88,1.02,.90],ambient:.90,density:1.45,
     desc:"参天古木与果树，薇薇安在这儿等她的梨和菌子"},
    {id:"path",name:"林间小道",start:2600,end:3400,
     sky:[[.10,.22,.34],[.34,.46,.44],[.62,.62,.44]],hill:[.22,.30,.22],
     grass:[.28,.40,.24],tint:[1.04,1.00,.90],ambient:.96,density:.75,
     desc:"铺着落叶的窄道，货郎阿桐的摊子支在路边"},
    {id:"deep",name:"魔林森处",start:3400,end:4200,
     sky:[[.06,.06,.18],[.18,.14,.32],[.30,.24,.42]],hill:[.14,.12,.26],
     grass:[.16,.22,.26],tint:[.86,.92,1.12],ambient:.76,density:1.7,
     desc:"幽光从树根渗出来，巨杉与紫影在这里扎根"},
    {id:"exit",name:"森林出口",start:4200,end:4800,
     sky:[[.16,.16,.34],[.48,.34,.44],[.82,.58,.44]],hill:[.24,.22,.30],
     grass:[.30,.36,.26],tint:[1.06,.94,.88],ambient:.88,density:.6,
     desc:"林子尽头，晚风把樱瓣吹向港口的方向"}
  ];
  function forestZoneAt(x){
    for(let i=0;i<FOREST_ZONES.length;i++)if(x<FOREST_ZONES[i].end)return i;
    return FOREST_ZONES.length-1;
  }
  const FOREST_NPCS={
    druid:{id:"druid",name:"德鲁伊 · 木隐",icon:"🌳",x:1180,depth:-28,
      desc:"守着孵化树洞的老德鲁伊；可打开【孵化室】或用【德鲁伊的小摊】交易",color:C.leaf2},
    vivian:{id:"vivian",name:"薇薇安",icon:"🧚",x:1900,depth:34,
      desc:"在原始森林里采集果子的少女，有一个小小的支线委托",color:C.sakura},
    woodTrader:{id:"woodTrader",name:"林间货郎 · 阿桐",icon:"🧺",x:3120,depth:36,
      desc:"收木材与林间材料，也卖伐木工具与养成道具",color:C.cloth2}
  };
  /* 薇薇安支线：交付梨 ×3 + 林菇 ×2，奖励金币与小型学习力果实 */
  const FOREST_QUEST={
    name:"薇薇安的野餐篮",need:{pear:3,mushroom:2},
    reward:{gold:300,items:{effortHp:2,effortSpd:1}},
    lines:["哎呀，篮子空了一半……","能帮我找 3 个梨和 2 朵林菇吗？果树和菇丛都在这一片。",
      "谢谢你！这些果实送给你，吃了会长记性哦。"]
  };
  const HATCHERY={slots:3,needTime:300,egg:"sakuraEgg"};
  /* 德鲁伊的小摊：每日 / 每周限量，价格与库存写入存档 */
  const DRUID_GOODS=[
    {k:"item",id:"personaEditCard",price:420,limit:2,period:"daily"},
    {k:"item",id:"personaSpecCard",price:880,limit:1,period:"weekly"},
    {k:"item",id:"rewashPill",price:680,limit:2,period:"daily"},
    {k:"item",id:"effortAtk",price:160,limit:3,period:"daily"},
    {k:"item",id:"effortMatk",price:160,limit:3,period:"daily"},
    {k:"item",id:"effortSpd",price:160,limit:3,period:"daily"},
    {k:"item",id:"effortHp",price:160,limit:3,period:"daily"},
    {k:"item",id:"effortDef",price:160,limit:3,period:"daily"},
    {k:"item",id:"effortMdef",price:160,limit:3,period:"daily"},
    {k:"item",id:"effortForget",price:520,limit:2,period:"weekly"},
    {k:"item",id:"forgetPotion",price:760,limit:1,period:"weekly"}
  ];
  /* 3 处伐木点：需伐木斧或双人锯；徒手不可采 */
  const FOREST_NODES=[
    {id:"log1",kind:"lumber",name:"倒伏古木",icon:"🪵",x:1640,depth:52,daily:3,time:2.4,
      tool:["woodAxe","timberSaw"],drops:["wood"],min:3,max:6,
      desc:"被雷劈倒的老树，木质还结实；需要伐木斧或双人锯"},
    {id:"log2",kind:"lumber",name:"林场木堆",icon:"🪵",x:2560,depth:-54,daily:3,time:2.2,
      tool:["woodAxe","timberSaw"],drops:["wood"],min:3,max:6,
      desc:"德鲁伊码好的木料堆，锯开就能带走"},
    {id:"log3",kind:"lumber",name:"森处巨杉",icon:"🌲",x:3980,depth:44,daily:3,time:2.8,
      tool:["woodAxe","timberSaw"],drops:["wood"],min:5,max:9,
      desc:"【魔林森处】最粗的一棵，产木最多，锯起来也最费时"},
    {id:"pearTree",kind:"fruit",name:"梨树",icon:"🍐",x:1480,depth:54,daily:3,time:1.8,
      drops:["pear"],min:3,max:6,
      desc:"【原始森林】低垂的青梨，徒手就能摘；戴采集者手套效率更高"},
    {id:"grapeVine",kind:"fruit",name:"葡萄藤",icon:"🍇",x:2280,depth:-48,daily:3,time:1.9,
      drops:["grape"],min:3,max:6,
      desc:"【原始森林】缠在古藤上的紫葡萄，一串串摘下来"},
    {id:"mush1",kind:"mush",name:"菇丛 · 东",icon:"🍄",x:1780,depth:70,daily:4,time:1.6,
      drops:["mushroom"],min:4,max:8,
      desc:"【原始森林】树根边的菌子，戴采集者手套会多收一些"},
    {id:"mush2",kind:"mush",name:"菇丛 · 西",icon:"🍄",x:2740,depth:56,daily:4,time:1.6,
      drops:["mushroom"],min:4,max:8,
      desc:"【原始森林】落叶下的菇丛，薇薇安的野餐篮正缺这个"}
  ];
  /* 丛林半中立野怪：沿用领地 / 脱战机制；1.3.1 修正持弓者被错标成蹦蹦种子 */
  const FOREST_MOBS=[
    {type:"archer",x:760,depth:40,territory:200},
    {type:"thug",x:2060,depth:18,territory:220},
    {type:"hound",x:3380,depth:-38,territory:240},
    {type:"axeman",x:4320,depth:30,territory:260}
  ];
  /* 原始森林 · 中立动物（蓝血条，被攻击才反击，击败掉兽肉） */
  const FOREST_ANIMALS=[
    {type:"deer",x:1560,depth:-36},{type:"squirrel",x:2120,depth:62},
    {type:"boar",x:2420,depth:-20},{type:"deer",x:3020,depth:48}
  ];
  const FOREST_WALKERS=[
    {name:"采蘑菇的学徒",x:660,d0:52,color:C.pink,icon:"✿",speed:28,range:220,line:"树洞那儿又在发光了"},
    {name:"扛木头的樵夫",x:2280,d0:58,color:C.cloth,icon:"▣",speed:34,range:300,line:"双人锯比斧头快多啦"},
    {name:"追萤火的小孩",x:3640,d0:-46,color:C.cyan,icon:"★",speed:46,range:240,line:"夜樱姐姐今天会来吗"}
  ];
  const FOREST_GOODS=[
    {k:"equip",id:"woodAxe",price:180},{k:"equip",id:"timberSaw",price:320},
    {k:"equip",id:"mossCirclet",price:140},{k:"equip",id:"barkRobe",price:260},
    {k:"item",id:"rewashPill",price:680},{k:"item",id:"personaCard",price:520},
    {k:"item",id:"effortFruit",price:460},{k:"item",id:"potion",price:40}
  ];

  /* ================= 1.4 dev1 · 蛮荒沼泽：材料 / 道具 / 装备 ================= */
  Object.assign(MATERIALS,{
    mustard:{name:"芥菜",icon:"🥬",color:C.leaf1,desc:"沼泽边成片的野菜，薇拉收去当药剂溶剂；可食用恢复少量饥饿值（未开启）",sell:8,
      source:"蛮荒沼泽 · 芥菜丛 ×2（每日 3 次）"},
    reed:{name:"芦苇杆",icon:"🎋",color:C.gold,desc:"高高芦苇割下来的空杆，编席与做箭杆都好用",sell:10,
      source:"蛮荒沼泽 · 芦苇荡 ×2（每日 3 次）"},
    thornHerb:{name:"荆棘草",icon:"🌵",color:C.green,desc:"薇拉收购的药草，带刺，必须戴镰刀才好下手",sell:16,
      source:"蛮荒沼泽 · 荆棘草丛 ×3（需镰刀）"},
    thornStrip:{name:"荆棘条",icon:"〰",color:C.brown,desc:"荆棘草剥出的韧条，是制作陷阱与箭头的材料",sell:13,
      source:"荆棘草丛采集"},
    thornGrass:{name:"刺草",icon:"✳",color:C.leaf2,desc:"细密倒刺的草叶，捆扎用",sell:9,source:"荆棘草丛采集"},
    poisonMushroom:{name:"毒蘑菇",icon:"🍄",color:C.violet,desc:"可用于制作毒药（当前版本未开启）",sell:12,
      source:"基础农作物 / 野菜采集时概率获得"},
    venomSac:{name:"毒囊",icon:"🟢",color:C.green,desc:"毒蛙颈后的毒囊，药师很感兴趣",sell:24,
      source:"击败【中立 · 毒蛙】概率掉落"},
    frogSlime:{name:"毒蛙粘液",icon:"💧",color:C.cyan,desc:"滑腻的粘液，做解毒剂的引子",sell:18,
      source:"击败【中立 · 毒蛙】概率掉落"},
    lizardSkin:{name:"巨蜥皮",icon:"🦎",color:C.leaf2,desc:"变色蜥蜕下的皮，会随光线变色",sell:30,
      source:"击败【中立 · 变色蜥】概率掉落"},
    beastCore:{name:"低级兽核",icon:"🔵",color:C.blue,desc:"野兽体内凝出的粗糙晶核",sell:42,
      source:"沼泽鳄 / 黑毛野猪 / 野蛮猪王概率掉落"},
    coreShard:{name:"破碎的低级兽核残片",icon:"🔹",color:C.cyan,desc:"碎裂的兽核残片，仍能换点钱",sell:14,
      source:"沼泽鳄 / 黑毛野猪 / 野蛮猪王概率掉落"},
    crocSkin:{name:"鳄鱼皮",icon:"▨",color:C.green,desc:"厚實的鳞皮，鞣制后很耐用",sell:36,
      source:"击败【半中立 · 沼泽鳄】概率掉落"},
    pork:{name:"猪肉",icon:"🥓",color:C.pink,desc:"黑毛野猪的肉，港口商人与汉克都收",sell:20,
      source:"击败【半中立 · 黑毛野猪】概率掉落"},
    boarTusk:{name:"猪王獠牙",icon:"🦷",color:C.white,desc:"野猪王才有的弯曲獠牙，稀罕材料",sell:88,
      source:"击败【黑毛野猪 / 野蛮猪王】小概率掉落"},
    savageHide:{name:"蛮荒兽皮",icon:"🟫",color:C.brown,desc:"蛮荒地带野兽的厚皮",sell:52,
      source:"击败【黑毛野猪 / 屠夫】概率掉落"},
    rawMeat:{name:"生肉",icon:"🥩",color:C.red,desc:"暴躁小猪与屠夫掉落的最普通肉料",sell:12,
      source:"击败【暴躁小猪 / 屠夫】概率掉落"},
    pigHide:{name:"猪皮",icon:"🐗",color:C.brown,desc:"薇拉的支线要收 10 张",sell:15,
      source:"击败【暴躁小猪】概率掉落"},
    beastBone:{name:"兽骨",icon:"🦴",color:C.white,desc:"屠夫腰间挂的那种大骨",sell:22,
      source:"击败【红泥部落 · 屠夫】概率掉落"},
    spiritShard:{name:"灵石碎片",icon:"💠",color:C.cyan,desc:"贵重的交易道具，可用来合成【灵石】（珍贵物品，合成系统未开启）",sell:0,
      source:"薇拉支线「10 张猪皮」奖励 ×128 / 稀有掉落"}
  });
  Object.assign(ITEMS,{
    antidote:{name:"解毒剂",icon:"🧪",color:C.green,price:120,noSlot:true,disabled:true,
      desc:"解除中毒状态。薇拉用芥菜与荆棘草调制 —— 中毒 / 药剂制作系统将在后续 dev 开启，当前仅可持有",
      source:"沼泽药师薇拉 · 120 金币（制作系统未开启）"},
    traitWine:{name:"特质药酒",icon:"🍶",color:C.gold,price:260,noSlot:true,disabled:true,
      desc:"可以净化任何异常状态（异常状态系统未开启，当前仅可持有）",source:"流浪商人独眼杰克 · 每周限 5"},
    fireOil:{name:"火油",icon:"🔥",color:C.orange,price:90,noSlot:true,disabled:true,
      desc:"稀有弹药，火绳枪装填后可造成烧伤（烧伤效果后续 dev 开启）",source:"独眼杰克 · 每日限 6"},
    poisonDart:{name:"毒镖",icon:"🗡",color:C.green,price:110,noSlot:true,disabled:true,
      desc:"稀有弹药，涂了沼泽毒液的吹箭（中毒效果后续 dev 开启）",source:"独眼杰克 · 每日限 6"},
    spiritStone:{name:"灵石",icon:"🔷",color:C.cyan,price:0,noSlot:true,disabled:true,
      desc:"珍贵物品，由【灵石碎片】合成。合成系统未开启，当前仅作占位",source:"后续版本开放"},
    fishingRod:{name:"钓鱼竿",icon:"🎣",color:C.wood,price:180,noSlot:true,disabled:true,
      desc:"汉克手编的钓竿，沼泽钓鱼点用得上",source:"渔夫汉克 · 180 金币"}
  });
  Object.assign(EQUIPMENT,{
    flareGun:{name:"火绳枪",icon:"🔫",q:"green",slot:"two",wtype:"gun",price:640,look:"gun",allow:[0,2],
      stats:{atk:10,spd:.02},desc:"绿装 · 物攻 +10 / 移速 +2。独眼杰克限购 2 把，配火油可造成烧伤（后续 dev）",
      source:"流浪商人独眼杰克 · 限购 2"},
    crossbow2:{name:"十字弩",icon:"🏹",q:"green",slot:"two",wtype:"crossbow",price:580,look:"crossbow",allow:[2],
      stats:{atk:6,atkSpd:.03},desc:"绿装 · 物攻 +6 / 攻速 +3%。独眼杰克限购 2 把",
      source:"流浪商人独眼杰克 · 限购 2"},
    sickle:{name:"镰刀",icon:"🌙",q:"green",slot:"two",wtype:"sickle",tool:"harvest",price:220,look:"sickle",
      stats:{atk:5,spd:.05},passive:["harvest","strong"],
      desc:"采荆棘草丛的必备工具。徒手采集会受伤；装备后不会受伤且效率更高。战士可当武器挥舞，法师 / 射手只能采集。",
      source:"渔夫汉克 / 薇拉 · 220 金币"},
    fishingRodTool:{name:"钓竿",icon:"🎣",q:"white",slot:"two",wtype:"rod",tool:"fish",price:180,look:"rod",
      stats:{atk:2},desc:"工具性武器：占用双手槽，钓鱼点专用；战斗时不能普攻 / 放技能（战士除外）。",
      source:"渔夫汉克 · 180 金币"}
  });

  /* ================= 沼泽子区域 / NPC / 采集点 ================= */
  const SWAMP_ZONES=[
    {id:"reed",name:"迷雾芦苇荡",start:0,end:1800,risk:"danger",danger:"中等",
     sky:[[.10,.16,.18],[.24,.32,.30],[.42,.48,.38]],hill:[.16,.22,.18],
     fog:.55,tint:[.92,1.00,.90],ambient:.86,density:1.3,bgm:"swampReed",
     desc:"中等危险的过渡区：比人还高的芦苇，视野被薄雾吞掉大半"},
    {id:"tribe",name:"红泥食人部落",start:1800,end:3600,risk:"danger",danger:"高",
     sky:[[.14,.13,.14],[.32,.24,.20],[.52,.36,.26]],hill:[.22,.18,.16],
     fog:.32,tint:[1.04,.94,.88],ambient:.94,density:.7,bgm:"swampTribe",
     desc:"主敌对势力区：哨塔、骨刀与号角，红泥食人部落的老巢"},
    {id:"mire",name:"毒瘴泥潭",start:3600,end:5000,risk:"danger",danger:"高危",
     sky:[[.08,.16,.12],[.18,.30,.20],[.32,.42,.26]],hill:[.12,.24,.16],
     fog:.78,tint:[.88,1.04,.86],ambient:.78,density:1.55,bgm:"swampMire",
     desc:"高危 / 资源区：毒瘴最浓，芥菜与荆棘草也长得最旺"},
    {id:"temple",name:"沉没古神庙",start:5000,end:6000,risk:"danger",danger:"终极",
     sky:[[.05,.09,.14],[.10,.18,.24],[.18,.28,.32]],hill:[.08,.14,.20],
     fog:.9,tint:[.82,.92,1.06],ambient:.70,density:.5,bgm:"swampTemple",
     desc:"终极 / 探索区：水面下隐约可见巨大石制建筑与雕像，只有退潮或特定时机才能进入（退潮机制后续 dev 开启）"}
  ];
  function swampZoneAt(x){for(let i=0;i<SWAMP_ZONES.length;i++)if(x<SWAMP_ZONES[i].end)return i;
    return SWAMP_ZONES.length-1;}
  const SWAMP_NPCS={
    hank:{id:"hank",name:"渔夫 · 汉克",icon:"🎣",x:640,depth:-42,
      desc:"卖鱼肉与钓鱼竿，钓点就在他身后",color:C.cloth3},
    vera:{id:"vera",name:"沼泽药师 · 薇拉",icon:"🧪",x:4020,depth:48,
      desc:"枯木林深处树屋里的药师：收芥菜 / 荆棘草，售解毒剂与回血药剂，并可打开【任务档案】",color:C.leaf1},
    jack:{id:"jack",name:"流浪商人 · 独眼杰克",icon:"🕶",x:2240,depth:-36,
      desc:"卖稀有弹药、火绳枪、十字弩与特质药酒，多数限量",color:C.gold}
  };
  /* 采集点：芥菜 ×2 / 芦苇杆 ×2 / 枯木 ×2 / 荆棘草丛 ×3 / 钓鱼点 ×1 */
  const SWAMP_NODES=[
    {id:"mustard1",kind:"crop",name:"芥菜丛 · 东",icon:"🥬",x:880,depth:56,daily:3,time:1.6,
      drops:["mustard"],min:3,max:6,desc:"基础农作物 / 野菜：可食用恢复少量饥饿值（未开启），或作药剂溶剂；概率获得鸟蛋、毒蘑菇"},
    {id:"mustard2",kind:"crop",name:"芥菜丛 · 西",icon:"🥬",x:4380,depth:-58,daily:3,time:1.6,
      drops:["mustard"],min:3,max:6,desc:"毒瘴泥潭边的第二片野菜地"},
    {id:"reed1",kind:"reed",name:"芦苇荡 · 入口",icon:"🎋",x:1180,depth:-62,daily:3,time:1.7,
      drops:["reed"],min:3,max:6,desc:"割下高高的芦苇杆，戴采集者手套会更快"},
    {id:"reed2",kind:"reed",name:"芦苇荡 · 深处",icon:"🎋",x:2960,depth:62,daily:3,time:1.7,
      drops:["reed"],min:3,max:6,desc:"部落边缘的芦苇，割的时候小心哨塔"},
    {id:"deadwood1",kind:"lumber",name:"枯木 · 倒伏",icon:"🪵",x:1660,depth:48,daily:3,time:2.3,
      tool:["woodAxe","timberSaw"],drops:["wood"],min:3,max:6,
      desc:"枯木林里泡白的树干，需要伐木斧或双人锯"},
    {id:"deadwood2",kind:"lumber",name:"枯木 · 薇拉屋后",icon:"🪵",x:4180,depth:66,daily:3,time:2.3,
      tool:["woodAxe","timberSaw"],drops:["wood"],min:3,max:6,desc:"树屋后倒着的老枯木"},
    {id:"thorn1",kind:"thorn",name:"荆棘草丛 · 一",icon:"🌵",x:3520,depth:-56,daily:3,time:2.1,
      tool:["sickle"],drops:["thornStrip","thornGrass","thornHerb"],min:2,max:4,
      desc:"徒手采集会受伤（需镰刀）；产荆棘条 / 刺草，是制作陷阱与箭头的材料"},
    {id:"thorn2",kind:"thorn",name:"荆棘草丛 · 二",icon:"🌵",x:4620,depth:54,daily:3,time:2.1,
      tool:["sickle"],drops:["thornStrip","thornGrass","thornHerb"],min:2,max:4,desc:"毒瘴泥潭边最密的一丛"},
    {id:"thorn3",kind:"thorn",name:"荆棘草丛 · 三",icon:"🌵",x:5280,depth:-48,daily:3,time:2.1,
      tool:["sickle"],drops:["thornStrip","thornGrass","thornHerb"],min:2,max:4,desc:"古神庙石阶旁的荆棘"},
    {id:"fish1",kind:"fish",name:"浅水钓鱼点",icon:"🐟",x:760,depth:64,daily:4,time:2.6,
      tool:["fishingRodTool"],drops:["pork","egg","poisonMushroom"],min:1,max:3,
      desc:"汉克守着的浅水洼，需要钓竿；偶尔钓上鸟蛋或毒蘑菇"}
  ];
  /* 沼泽商店：限购记录写入存档 */
  const SWAMP_GOODS={
    hank:[
      {k:"equip",id:"fishingRodTool",price:180,limit:1,period:"once"},
      {k:"equip",id:"sickle",price:220,limit:1,period:"once"},
      {k:"mat",id:"pork",price:26,limit:6,period:"daily"}
    ],
    vera:[
      {k:"item",id:"potion",price:40,limit:8,period:"daily"}
    ],
    jack:[
      {k:"equip",id:"flareGun",price:640,limit:2,period:"once"},
      {k:"equip",id:"crossbow2",price:580,limit:2,period:"once"},
      {k:"item",id:"fireOil",price:90,limit:6,period:"daily"},
      {k:"item",id:"poisonDart",price:110,limit:6,period:"daily"},
      {k:"item",id:"traitWine",price:260,limit:5,period:"weekly"}
    ]
  };
  const SWAMP_SELL={mustard:8,thornHerb:16,reed:10,pigHide:15,venomSac:24,
    lizardSkin:30,crocSkin:36,savageHide:52,pork:20,rawMeat:12,beastBone:22};
  /* 任务档案：主线剧情链在 dev2 展开，dev1 先立档案与一条可交付支线 */
  const QUESTS={
    main:[
      {id:"m1",title:"沼泽的异动",desc:"魔法丛林深处传来兽吼，去【蛮荒沼泽】找渔夫汉克打听。",
        target:{type:"visit",map:"swamp"},reward:{gold:300},state:"open",chapter:"第一章 · 泥沼与獠牙"},
      {id:"m2",title:"红泥部落的号角",desc:"击退红泥食人部落的斥候，弄清他们在供奉什么。",
        target:{type:"kill",type2:"scout",n:3},reward:{gold:600,exp:2000},state:"locked",chapter:"第一章 · 泥沼与獠牙"},
      {id:"m3",title:"沉没古神庙",desc:"等退潮时进入古神庙，直面野蛮猪王或被供奉的远古恶神。",
        target:{type:"boss",id:"boarKing"},reward:{spiritShard:64},state:"locked",chapter:"第二章 · 沉没之神"}
    ],
    side:[
      {id:"s1",title:"薇拉的药篓",desc:"交给沼泽药师薇拉 10 张【猪皮】，她要鞣一批药囊。",
        target:{type:"item",id:"pigHide",n:10},
        reward:{gold:0,exp:4000,items:{spiritShard:128},beans:120},state:"open",npc:"vera",
        lines:["哎呀，药囊不够用了……","能帮我找 10 张猪皮吗？暴躁小猪身上就有。",
          "太好了！这些灵石碎片、经验与晶豆都归你啦。"]}
    ]
  };

  /* ================= 区域情报（四张地图：NPC / 野怪 / BOSS / 资源点） ================= */
  const REGION_INFO={
    dusk:{name:"黄昏城堡",icon:"🏰",desc:"赤霞隘口到黑石城堡的连续战役区，通关后仍是开放世界的一部分。",
      npcs:[],mobs:[
        {n:"中立·草灵",t:"中立",d:"蓝色血条，被攻击后才反击"},
        {n:"小啰啰 / 步兵 / 精英·铁卫 / 小统领",t:"战役",d:"沿路 8 波，击败后可继续前进"}],
      bosses:[{n:"黑石城主",t:"BOSS",d:"最终波；击败后不再弹结算，大地图点亮"}],
      nodes:[{n:"翠风原野 / 赤霞隘口 / 黑石城堡",t:"区域",d:"三段主题随前进无缝过渡"}]},
    market:{name:"狂欢集市",icon:"🏮",desc:"自由城镇，没有波次；天气与昼夜按北京时间换算。",
      npcs:[
        {n:"夜樱 ✿",t:"赏金",d:"对话领赏金，首次赠【清羽足链】"},
        {n:"阿福 ⚖",t:"商店",d:"消耗品、经验果与装备"}],
      mobs:[
        {n:"糖偶团子",t:"中立",d:"蓝色血条，被打扰才反击"},
        {n:"纸鸢精",t:"中立",d:"随风飘浮的纸风筝"}],
      bosses:[],
      nodes:[
        {n:"草丛 / 沙土 / 石板",t:"地面",d:"三种脚步音效各不相同，草丛会惊起草叶与花瓣"},
        {n:"夜间灯笼与萤火",t:"环境",d:"按北京时间入夜后亮起"}]},
    harbor:{name:"星火港",icon:"⚓",desc:"5200px 宽的开放港口，采集、贸易、半中立野怪与 BOSS 试炼。",
      npcs:[
        {n:"港口商人 · 老锚 ⚓",t:"交易 / 锻造",d:"出售材料换金币，也可用矿石锻造装备"},
        {n:"黑市商人 · 鸦 🕶",t:"黑市",d:"洗髓丹、性格重塑卡、学习力果实与稀有装备"},
        {n:"夜樱 · 试炼形态 ✿",t:"BOSS 试炼",d:"每日 10 次；首次获胜得【夜樱蛋】，之后转为【樱花套件】专属装备试炼（难度 ★★★★）"}],
      mobs:[
        {n:"蹦蹦种子",t:"半中立 · 木系",d:"有领地，进入才仇恨，走远脱战"},
        {n:"锯齿恶犬",t:"半中立 · 暗系",d:"后巷巡逻，脱离范围自动回归"},
        {n:"街头持刀小混子",t:"半中立 · 普通系",d:"守着木箱货堆"},
        {n:"斧头帮成员",t:"半中立 · 普通系",d:"扛斧守货堆，领地意识最强"}],
      bosses:[{n:"试炼·夜樱",t:"试炼 BOSS · 幽系",d:"每日限 10 次；首胜掉落【夜樱蛋】，此后转为 ★★★★ 专属装备试炼，随机产出【樱花套件】王者钻装"}],
      nodes:[
        {n:"废弃铜铁矿堆 ×2",t:"采集 · 每日 3 次",d:"需铁镐；随机铁矿 / 铜矿；法师射手持镐无法施放技能"},
        {n:"苹果树 ×3",t:"采集 · 每日 3 次",d:"徒手可采，每次 3~6 苹果；采集者手套提效"},
        {n:"海边草丛 ×2",t:"采集 · 每日 4 次",d:"每次 4~8 个鸟蛋 / 叶片 / 甘草 / 野果"}]},
    forest:{name:"魔法丛林",icon:"🌲",desc:"4800px 五段子区域：森林入口 / 原始森林 / 林间小道 / 魔林森处 / 森林出口。",
      npcs:[
        {n:"德鲁伊 · 木隐 🌳",t:"孵化室 / 小摊",d:"【孵化室】3 个蛋巢需 300 时间；【德鲁伊的小摊】每日 / 每周限量养成道具"},
        {n:"薇薇安 🧚",t:"支线",d:"【原始森林】交付梨 ×3 + 林菇 ×2，得金币与学习力果实"},
        {n:"林间货郎 · 阿桐 🧺",t:"交易",d:"收木材与林间材料，售伐木工具与养成道具"}],
      mobs:[
        {n:"林间弓手",t:"半中立 · 木系",d:"【森林入口】背短弓的猎手，进领地才搭箭"},
        {n:"街头持刀小混子 / 锯齿恶犬 / 斧头帮",t:"半中立",d:"各有领地与巡逻，走远自动脱战"},
        {n:"林鹿 / 野猪 / 松鼠",t:"中立动物 · 蓝血条",d:"【原始森林】被攻击才反击，击败掉兽肉"}],
      bosses:[{n:"德鲁伊的孵化室",t:"孵化事件",d:"非战斗：3 个蛋巢，放入夜樱蛋并等待 300 时间后领取夜樱"}],
      nodes:[
        {n:"倒伏古木 / 林场木堆 / 森处巨杉",t:"伐木 · 每日 3 次",d:"需【伐木斧】或【双人锯】；战士持工具照常战斗"},
        {n:"梨树 / 葡萄藤",t:"果树 · 每日 3 次",d:"【原始森林】徒手可采，采集者手套提效"},
        {n:"菇丛 · 东 / 西",t:"采集 · 每日 4 次",d:"【原始森林】林菇，薇薇安支线材料"},
        {n:"五段子区域",t:"场景",d:"天色 / 植被 / 雾气随前进自然过渡，进入时显示区域名"}]}
  };

  REGION_INFO.swamp={name:"蛮荒沼泽",icon:"🪷",risk:"danger",
    desc:"6000px 危险区 · 芦苇荡 / 浅水 / 泥沼小岛，常年薄雾、视野很差；虫鸣蛙声，夜间有发光虫。推荐 Lv.40 以上探索。",
    npcs:[
      {n:"渔夫 · 汉克 🎣",t:"商店",d:"出售鱼肉、钓鱼竿、镰刀与钓竿"},
      {n:"沼泽药师 · 薇拉 🧪",t:"收购 / 任务",d:"枯木林树屋；收芥菜与荆棘草，售解毒剂 / 回血药剂，打开【任务档案】"},
      {n:"流浪商人 · 独眼杰克 🕶",t:"限量商店",d:"火绳枪 / 十字弩各限购 2、火油 / 毒镖每日 6、特质药酒每周 5"}],
    mobs:[
      {n:"毒蛙 / 变色蜥 / 沼泽狍子",t:"中立 · 蓝血条",d:"人不犯我我不犯人；离开仇恨区域解除并回满"},
      {n:"沼泽鳄 / 黑毛野猪",t:"半中立",d:"有领地，入侵才仇恨，走远脱战回满"},
      {n:"野蛮猪王 / 暴躁小猪 / 吸血蚊群 / 泥沼蜥蜴",t:"敌对 · 野兽",d:"被发现即不死不休"},
      {n:"投矛手 / 火枪手 / 斥候 / 屠夫 / 捣蛋鬼 / 部落萨满",t:"敌对 · 红泥食人部落",d:"哨塔、号角增援、偷材料、毒雾与治疗"}],
    bosses:[{n:"野蛮猪王",t:"终极 BOSS · 土系",d:"巢穴在【沉没古神庙】；退潮进入机制后续 dev 开启"}],
    nodes:[
      {n:"芥菜丛 ×2 / 芦苇荡 ×2",t:"采集 · 每日 3 次",d:"基础野菜与芦苇杆；概率鸟蛋 / 毒蘑菇"},
      {n:"荆棘草丛 ×3",t:"采集 · 需镰刀",d:"徒手会受伤；产荆棘条 / 刺草 / 荆棘草"},
      {n:"枯木 ×2",t:"伐木 · 每日 3 次",d:"需伐木斧或双人锯"},
      {n:"浅水钓鱼点 ×1",t:"钓鱼 · 每日 4 次",d:"需钓竿"}]};


  const BOUNTY={
    gold:120,mats:[{id:"petal",n:3},{id:"crystal",n:1}],gift:"featherAnklet",
    lines:[
      "……你也能看见我？",
      "风把樱花带到这里，也把委托带到这里。替我数一数今晚落下的花瓣吧。",
      "这些赏金收好。这串清羽足链也一并给你，走路会轻一点。"
    ]
  };

  /* ================= 黄昏城堡：区域 & 波次 ================= */
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

  /* ================= 画质 ================= */
  const QUALITY={
    high:{name:"高",dpr:1,bloom:true,post:true,parts:360,props:true,label:"全后期 · 1× 分辨率"},
    medium:{name:"中",dpr:1,bloom:false,post:true,parts:260,props:true,label:"暗角调色 · 无辉光"},
    low:{name:"低",dpr:.85,bloom:false,post:false,parts:170,props:true,label:"直出画面 · 0.85× 分辨率"},
    saver:{name:"省电",dpr:.7,bloom:false,post:false,parts:110,props:false,label:"0.7× 分辨率 · 精简场景"}
  };

  /* ================= 键位 ================= */
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
    Enter:"回车",NumpadEnter:"小键盘回车",Escape:"ESC",Backquote:"`",Minus:"-",Equal:"=",
    BracketLeft:"[",BracketRight:"]",Semicolon:";",Quote:"'",Comma:",",Period:".",
    Slash:"/",Backslash:"\\"
  };
  /* fixed:true 为固定键，不出现在可改键列表里；其余动作一律可改 */
  const ACTIONS=[
    {id:"up",name:"上移 / 纵深后",group:"移动"},{id:"down",name:"下移 / 纵深前",group:"移动"},
    {id:"left",name:"左移",group:"移动"},{id:"right",name:"右移",group:"移动"},
    {id:"attack",name:"普攻 / 长按蓄力",group:"战斗"},{id:"jump",name:"跳跃 / 二段跳",group:"战斗"},
    {id:"s1",name:"技能 1",group:"战斗"},{id:"s2",name:"技能 2",group:"战斗"},
    {id:"s3",name:"技能 3",group:"战斗"},{id:"s4",name:"技能 4",group:"战斗"},
    {id:"use1",name:"道具槽 1",group:"道具"},{id:"use2",name:"道具槽 2",group:"道具"},
    {id:"interact",name:"交互 / 对话",group:"城镇"},
    {id:"team1",name:"队伍 1 号位",group:"队伍"},{id:"team2",name:"队伍 2 号位",group:"队伍"},
    {id:"team3",name:"队伍 3 号位",group:"队伍"},{id:"team4",name:"队伍 4 号位",group:"队伍"},
    {id:"bag",name:"打开背包",group:"界面"},{id:"map",name:"打开大地图",group:"界面"},
    {id:"region",name:"区域情报",group:"界面"},
    {id:"pause",name:"暂停 / 继续",group:"界面"},{id:"panel",name:"打开 / 关闭通用面板",group:"界面"},
    {id:"char",name:"角色 / 队伍面板",group:"界面"}
  ];
  const FIXED_KEYS=[
    {id:"confirm",name:"同意 / 确认 / 开始",code:"Enter",group:"固定键（不可修改）"},
    {id:"escape",name:"取消 / 返回 / 退出 / 关闭",code:"Escape",group:"固定键（不可修改）"}
  ];
  const RESERVED_CODES=["Enter","NumpadEnter","Escape"];
  const DEFAULT_BINDINGS={up:"KeyW",down:"KeyS",left:"KeyA",right:"KeyD",
    /* 1.4 dev1.4：技能键避开数字键区 1~4（换人），默认 U/I/O/L */
    attack:"KeyJ",jump:"KeyK",s1:"KeyU",s2:"KeyI",s3:"KeyO",s4:"KeyL",
    use1:"KeyZ",use2:"KeyX",interact:"KeyF",
    team1:"Numpad1",team2:"Numpad2",team3:"Numpad3",team4:"Numpad4",
    bag:"KeyB",map:"KeyM",region:"KeyG",pause:"KeyP",panel:"Tab",char:"KeyC"};
  const TEAM_ALIAS={Digit1:0,Digit2:1,Digit3:2,Digit4:3};

  /* ==================================================================
     v1.4 dev2 · 雨沼边境走廊（魔法大学城的空间过渡带）
     9600px，超过现有任何地图；四段子区域，默认落点灌木丛林。
     ================================================================== */
  /* v1.4 dev3：原落点 3120 同时落在 3 只半中立怪的领地里（archer 2960 / thug 3220 /
     hound 3320），进图 0.42s 后全部触发仇恨，形成「一落地就被围攻」。
     复核全部领地后改到 2640：距左侧 bandit(2320,T240) 320px、距右侧 archer(2960,T250)
     320px，均在领地之外；grassWisp(2680) 是中立不会主动攻击。再加落点安全半径
     + 入图宽限期双重保护，玩家刚落地或仍在安全圈内都不会被半中立围攻。 */
  const BORDER_SPAWN_X=2640;          /* 灌木丛林西侧安全空地：点击地图后的默认传送点 */
  const BORDER_SAFE_R=220;            /* 落点安全半径：圈内半中立不主动仇恨 */
  const BORDER_GRACE=3.0;             /* 入图宽限（秒）：给玩家看清环境的缓冲 */
  const BORDER_STAT_MUL=3.25;         /* 野外可攻击对象数值 ≥ 前图 3 倍 */
  const BORDER_ZONES=[
    {id:"marsh",name:"雨沼洼地",start:0,end:2400,risk:"danger",danger:"较为危险",
     sky:[[.10,.20,.18],[.24,.36,.28],[.44,.52,.34]],hill:[.12,.24,.16],
     fog:.42,tint:[.96,1.02,.92],ambient:.90,density:1.35,bgm:"borderMarsh",
     desc:"郁郁葱葱的树林、橙叶奇树、古藤与浮萍池塘；食人魔在食人族哨塔附近徘徊，暗系法术会致中毒 / 麻痹"},
    {id:"thicket",name:"灌木丛林",start:2400,end:4800,risk:"safe",danger:"一般危险",
     sky:[[.08,.13,.16],[.18,.24,.26],[.30,.34,.34]],hill:[.10,.16,.18],
     fog:.74,tint:[.86,.94,1.02],ambient:.78,density:1.55,bgm:"borderThicket",
     desc:"终年浸水的低洼沼泽林地，黑褐烂泥与浑浊滞水、湿黑老藤、蚊蚋与幽绿磷光；默认落点，向右到村落、向左回洼地"},
    {id:"farm",name:"农田&破败村落",start:4800,end:7200,risk:"safe",danger:"较安全",
     sky:[[.16,.24,.30],[.38,.42,.34],[.62,.58,.40]],hill:[.22,.26,.18],
     fog:.18,tint:[1.04,1.00,.90],ambient:1.02,density:.7,bgm:"borderFarm",
     desc:"城郊麦田与残破土坯村落，歪斜田垄、锈蚀农具、橘子树；白天安宁，夜间田埂萤火纷飞，无主动敌对怪物"},
    {id:"gate",name:"魔法大学城西郊城门处",start:7200,end:9600,risk:"safe",danger:"较安全",
     sky:[[.14,.20,.32],[.30,.36,.48],[.58,.56,.56]],hill:[.16,.20,.28],
     fog:.22,tint:[1.00,.98,1.06],ambient:1.0,density:.55,bgm:"borderGate",
     desc:"石垣城门、远处城内楼房与滚滚麦田；石像鬼守卫扫描、新生接待棚可登记；通向【魔法大学城】（下一版本主线）"}
  ];
  function borderZoneAt(x){for(let i=0;i<BORDER_ZONES.length;i++)if(x<BORDER_ZONES[i].end)return i;
    return BORDER_ZONES.length-1;}
  /* 7 位可交互 NPC */
  const BORDER_NPCS={
    fallenMage:{id:"fallenMage",name:"堕落魔导师",icon:"🜏",x:640,depth:-46,color:C.ghostViolet,
      role:"dialogue",desc:"兜帽斗篷下看不清脸，被教廷通缉的黑魔法师。目前只是静静站在洼地深处，暂无内容。",
      lines:["……你也听见水下的声音了吗？","教廷的通缉令贴到了城门口，可我还有更重要的事。","（他不再说话，斗篷下的暗影微微浮动）"]},
    patrolGuard:{id:"patrolGuard",name:"巡逻护卫",icon:"🛡",x:2760,depth:44,color:C.steel,
      role:"dialogue",desc:"守在灌木丛林西口的护卫，提醒洼地危险并指引新生报名。",
      lines:["前面【雨沼洼地】的毒蛙和沼泽鳄比城里凶三倍，务必做好防护再过去。","往右走是农田与破败村落，尽头就是大学城西郊城门。","城门入口有【新生接待棚】，想报名的话先去那儿登记。"]},
    farmerTao:{id:"farmerTao",name:"农夫 · 老陶",icon:"🌾",x:5480,depth:52,color:C.gold,
      role:"shop",open:[6,17],desc:"五十岁上下，蓑衣外罩补丁布衫。果蔬鱼肉比城里实惠，还卖几件农具；每日限量，只摆早上 6 点到下午 5 点。",
      lines:["自家地里长的，便宜些卖你。","天黑我就收摊咯，要买趁早。"]},
    mageGuard:{id:"mageGuard",name:"巡逻的魔法护卫",icon:"✦",x:7580,depth:-48,color:C.clothBlue,
      role:"dialogue",desc:"学院派驻西郊的魔法护卫，沿城门石垣来回巡视。",
      lines:["城门内是【魔法大学城】；先在接待棚报名、展示元素技能，再让石像鬼核实凭据就能进城。","石像鬼会核对来人，别在它面前乱挥武器。","西郊一带总体安全，但别去招惹蹦蹦种子。"]},
    wanderingMage:{id:"wanderingMage",name:"流浪商人术士",icon:"🧙",x:8160,depth:56,color:C.clothBlue,
      role:"shop",desc:"游走各国卖药水、弹药与装备的术士。装备类每日限 2 件，紫装【月牙镰】每周限购。",
      lines:["药水、火油、毒镖，还有几件压箱底的装备，看看？","那把月牙镰是紫装，一周只带一把来。"]},
    gargoyle:{id:"gargoyle",name:"城门石像鬼守卫",icon:"🗿",x:9200,depth:-64,color:C.stone||C.steel,
      role:"dialogue",desc:"两人高的灰白石像，蝙蝠翼收拢、羊角卷曲，眼窝嵌蓝色晶核，胸口刻学院旗帜、手持石矛；检查时晶核亮起扫描光圈。",
      lines:["（蓝色晶核亮起，一道扫描光圈自上而下掠过你）","入内凭据需经我核实；请先到【新生接待棚】报名并通过元素技能考核。","（石像重新收拢翼，恢复静止）"]},
    freshmanDesk:{id:"freshmanDesk",name:"新生接待员",icon:"📋",x:8560,depth:48,color:C.sakura,
      role:"freshman",desc:"年轻女法师，学院蓝白短袍、袖口星纹、圆框眼镜，抱一摞登记板，腰间羽毛笔与铃铛，胸前别「新生引导」铜徽。",
      lines:["欢迎来到魔法大学城西郊！入学费 9900 金币，报名即领【见习术士套件】11 件与学院临时袍、西郊地图。","考核很简单：在城门一带展示任意元素技能（比如战士的土系【旋风斩】），命中即可领到入内凭据与学员徽章。","徽章按当前角色等级分铜 / 银 / 金三级；拿凭据找【城门石像鬼守卫】核实，就能解锁【魔法大学城】啦。"]}
  };
  /* 8 位会移动的路人 */
  const BORDER_WALKERS=[
    {name:"扛锄头的老农",x0:5050,d0:58,color:C.cloth3,icon:"●",t:0,speed:22,range:220,zone:2,line:"这麦子长得一年不如一年"},
    {name:"农村孩童",x0:5860,d0:-62,color:C.pink,icon:"✿",t:1,speed:48,range:250,zone:2,line:"城门口的石像鬼眼睛会亮！"},
    {name:"路过的行人",x0:6420,d0:44,color:C.cloth,icon:"▣",t:2,speed:32,range:300,zone:2,line:"老陶收摊前还能买着两条鱼"},
    {name:"吆喝的人",x0:6820,d0:-38,color:C.gold,icon:"★",t:3,speed:26,range:180,zone:2,line:"橘子！今早刚摘的橘子！"},
    {name:"嬉闹奔跑的孩童",x0:7480,d0:60,color:C.candy,icon:"✿",t:4,speed:56,range:260,zone:3,line:"快看，法袍上绣着星星"},
    {name:"往来赶路的平民",x0:7900,d0:-52,color:C.cloth2,icon:"●",t:5,speed:30,range:320,zone:3,line:"城里今天有招生告示"},
    {name:"身披法袍的术士",x0:8720,d0:50,color:C.clothBlue,icon:"✦",t:6,speed:28,range:280,zone:3,line:"星象仪得在子夜前校准"},
    {name:"游侠模样的人",x0:9080,d0:-44,color:C.leaf2,icon:"➶",t:7,speed:34,range:240,zone:3,line:"洼地那头有东西在飘"}
  ];
  /* 14 处采集点：草丛 5 / 菇丛 6 / 铜铁矿堆 2 / 森林巨杉 2 / 橘子树 2 */
  const BORDER_NODES=[
    {id:"bGrass1",kind:"grass",name:"洼地草丛 · 一",icon:"❦",x:320,depth:58,daily:4,time:1.5,
      drops:["leaf","herb","egg"],min:4,max:8,desc:"戴采集者手套效率更高"},
    {id:"bGrass2",kind:"grass",name:"洼地草丛 · 二",icon:"❦",x:1520,depth:-54,daily:4,time:1.5,
      drops:["leaf","herb","egg"],min:4,max:8,desc:"古藤遮掩下的一丛野草"},
    {id:"bMush1",kind:"mush",name:"洼地菇丛 · 一",icon:"🍄",x:880,depth:-62,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"古木根部的菌伞"},
    {id:"bMush2",kind:"mush",name:"洼地菇丛 · 二",icon:"🍄",x:1960,depth:60,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"池塘边湿木上的菇丛"},
    {id:"bOre1",kind:"ore",name:"废弃铜铁矿堆 · 洼地",icon:"⛏",x:1180,depth:64,daily:3,time:2.4,
      tool:["ironPick"],drops:["iron","copper"],min:2,max:5,desc:"需要铁镐；战士持镐仍可战斗"},
    {id:"bMush3",kind:"mush",name:"灌木菇丛 · 一",icon:"🍄",x:2860,depth:-58,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"泡水树根旁的暗色菌丛"},
    {id:"bMush4",kind:"mush",name:"灌木菇丛 · 二",icon:"🍄",x:4260,depth:62,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"沼雾最浓处的菇丛"},
    {id:"bOre2",kind:"ore",name:"废弃铜铁矿堆 · 灌木",icon:"⛏",x:3560,depth:-66,daily:3,time:2.4,
      tool:["ironPick"],drops:["iron","copper"],min:2,max:5,desc:"半浸在浅沼里的旧矿堆"},
    {id:"bCedar1",kind:"lumber",name:"森林巨杉 · 一",icon:"🌲",x:3080,depth:68,daily:3,time:2.6,
      tool:["woodAxe","timberSaw","moonSickle"],drops:["wood"],min:4,max:8,desc:"扭曲佝偻的老杉，需要伐木工具"},
    {id:"bCedar2",kind:"lumber",name:"森林巨杉 · 二",icon:"🌲",x:4620,depth:-68,daily:3,time:2.6,
      tool:["woodAxe","timberSaw","moonSickle"],drops:["wood"],min:4,max:8,desc:"水苔覆满树皮的巨杉"},
    {id:"bMush5",kind:"mush",name:"村落菇丛 · 一",icon:"🍄",x:5120,depth:-56,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"残屋墙根下的菇丛"},
    {id:"bMush6",kind:"mush",name:"村落菇丛 · 二",icon:"🍄",x:6760,depth:58,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"田埂尽头歪树下的菇丛"},
    {id:"bGrass3",kind:"grass",name:"村落草丛",icon:"❦",x:5980,depth:64,daily:4,time:1.5,
      drops:["leaf","herb","egg"],min:4,max:8,desc:"疯长杂草里偶尔能捡到鸟蛋"},
    {id:"bOrange1",kind:"orange",name:"橘子树 · 东",icon:"🍊",x:5620,depth:62,daily:4,time:1.7,
      drops:["orange"],min:2,max:4,desc:"老陶地头的橘树，每日可采 4 次，单次 2~4 个橘子"},
    {id:"bOrange2",kind:"orange",name:"橘子树 · 西",icon:"🍊",x:6480,depth:-60,daily:4,time:1.7,
      drops:["orange"],min:2,max:4,desc:"残屋院里的第二棵橘树"},
    {id:"bGrass4",kind:"grass",name:"城门草丛 · 一",icon:"❦",x:7440,depth:-58,daily:4,time:1.5,
      drops:["leaf","herb","egg"],min:4,max:8,desc:"石垣脚下的草丛"},
    {id:"bGrass5",kind:"grass",name:"城门草丛 · 二",icon:"❦",x:8980,depth:60,daily:4,time:1.5,
      drops:["leaf","herb","egg"],min:4,max:8,desc:"旧木栅栏边的草丛"}
  ];
  /* 商店：老陶（营业 6:00-17:00，日限 / 周限）/ 流浪商人术士（装备日限 2、月牙镰周限） */
  const BORDER_GOODS={
    farmerTao:[
      {k:"mat",id:"apple",price:12,limit:8,period:"daily"},
      {k:"mat",id:"pear",price:14,limit:8,period:"daily"},
      {k:"mat",id:"grape",price:16,limit:8,period:"daily"},
      {k:"mat",id:"orange",price:15,limit:8,period:"daily"},
      {k:"mat",id:"pork",price:20,limit:6,period:"daily"},
      {k:"mat",id:"meat",price:22,limit:6,period:"daily"},
      {k:"equip",id:"smallFishSpear",price:150,limit:3,period:"weekly"},
      {k:"equip",id:"longFishSpear",price:260,limit:3,period:"weekly"},
      {k:"equip",id:"hoe",price:210,limit:3,period:"weekly"}
    ],
    wanderingMage:[
      {k:"item",id:"potion",price:40,limit:8,period:"daily"},
      {k:"item",id:"hpPotionLarge",price:110,limit:5,period:"daily"},
      {k:"item",id:"energyPotion",price:95,limit:5,period:"daily"},
      {k:"item",id:"fireOil",price:90,limit:6,period:"daily"},
      {k:"item",id:"poisonDart",price:110,limit:6,period:"daily"},
      {k:"item",id:"traitWine",price:260,limit:5,period:"weekly"},
      {k:"equip",id:"moonSickle",price:880,limit:1,period:"weekly"},
      {k:"equip",id:"crudeCleaver",price:190,limit:2,period:"daily"},
      {k:"equip",id:"ironCleaver",price:340,limit:2,period:"daily"},
      {k:"equip",id:"woodStaff",price:260,limit:2,period:"daily"},
      {k:"equip",id:"heavyCrossbow",price:520,limit:2,period:"daily"},
      {k:"equip",id:"antiMagicCloak",price:620,limit:2,period:"daily"},
      {k:"equip",id:"thickClothArmor",price:760,limit:2,period:"daily"},
      /* v1.4 dev3 首件红装：7700 金币 · 永久限购 1（period:"once"，key 固定为 "once"） */
      {k:"equip",id:"holySickle",price:7700,limit:1,period:"once"}
    ]
  };
  const BORDER_SELL={apple:7,pear:8,grape:9,orange:8,mushroom:8,herb:9,leaf:5,
    pork:11,meat:12,wood:14,iron:12,copper:10,ironScrap:16,leatherHide:14};
  /* 野外单位分布：三类 AI 严格区分，数值在 border.js 统一 × BORDER_STAT_MUL */
  const BORDER_MOBS=[
    /* 雨沼洼地（较危险）：中立 3 类 + 半中立猪人 / 匪帮 + 敌对 BOSS 食人魔 */
    {type:"poisonFrog",x:420,depth:56},{type:"poisonFrog",x:1040,depth:-52},
    {type:"chameleon",x:760,depth:-60},{type:"chameleon",x:1720,depth:48},
    {type:"swampCroc",x:1320,depth:62,territory:250},
    {type:"swampCroc",x:2060,depth:-48,territory:250},
    {type:"pigman",x:1620,depth:-20,territory:260},
    {type:"pigman",x:2240,depth:34,territory:260},
    {type:"bandit",x:1140,depth:22,territory:240},
    {type:"bandit",x:1880,depth:-58,territory:240},
    {type:"bandit",x:2320,depth:58,territory:240},
    {type:"banditChief",x:2160,depth:0,territory:300},
    {type:"ogreMage",x:1980,depth:-8,boss:true},
    /* 灌木丛林（一般危险）：中立草浮灵 + 半中立 3 类 + 恶犬，无主动敌对 */
    {type:"grassWisp",x:2680,depth:58},{type:"grassWisp",x:3440,depth:-54},
    {type:"grassWisp",x:4420,depth:50},
    {type:"archer",x:2960,depth:-46,territory:250},
    {type:"archer",x:4080,depth:60,territory:250},
    {type:"thug",x:3220,depth:52,territory:240},
    {type:"thug",x:3820,depth:-56,territory:240},
    {type:"axeman",x:3660,depth:22,territory:260},
    {type:"axeman",x:4560,depth:-40,territory:260},
    {type:"hound",x:3320,depth:-64,territory:250},
    {type:"hound",x:4280,depth:64,territory:250},
    /* 农田&破败村落（较安全）：高属性中立毒蛙 ×2 + 半中立蹦蹦种子 ×1 */
    {type:"poisonFrog",x:5240,depth:60},{type:"poisonFrog",x:6640,depth:-56},
    {type:"seed",x:5960,depth:-30,territory:220},
    /* 城门处：高属性中立毒蛙 ×1 + 半中立蹦蹦种子 ×2 */
    {type:"poisonFrog",x:7680,depth:-58},
    {type:"seed",x:8260,depth:56,territory:220},
    {type:"seed",x:9020,depth:-52,territory:220}
  ];

  /* ---------- dev2 新怪（数值同样会在 border.js 里 ×3.25） ---------- */
  Object.assign(MOBS,{
    pigman:{id:"pigman",label:"半中立·猪人",element:"土系",hp:210,dmg:26,spd:1.18,
      scale:1.46,w:1.44,h:1.22,body:"fat",main:C.brown,dark:C.deckDk,trim:C.iron,acc:C.bone||C.white,
      bar:C.hpAmber,xp:760,gold:38,drop:.84,ai:"halfNeutral",reach:72,territory:260,
      drops:["pork","leatherHide","ironScrap"],
      desc:"猪头人身、皮革外衣半裸凌乱，壮硕高大皮糙肉厚，手持大砍刀；双防 / 生命 / 攻击都明显高于前图野怪",
      behavior:"蓝血条 · 有领地环 · 入侵才仇恨，离开范围解除并回满"},
    bandit:{id:"bandit",label:"半中立·匪帮",element:"普通系",hp:158,dmg:22,spd:1.62,
      scale:1.04,w:1.0,h:1.04,body:"normal",main:C.cloth3,dark:C.deckDk,trim:C.steel,acc:C.gold,
      bar:C.hpAmber,xp:520,gold:26,drop:.74,ai:"halfNeutral",reach:230,territory:240,
      drops:["ironScrap","leatherHide","poisonDart"],
      desc:"有的持砍刀近战、有的用火绳枪 / 强弩远程；远程怪会刻意与玩家保持距离射击，部分配备厚实布甲或抗魔斗篷",
      behavior:"蓝血条 · 领地巡逻 · 远程单位保持距离"},
    banditChief:{id:"banditChief",label:"半中立·山匪头子",element:"普通系",hp:310,dmg:31,spd:1.42,
      scale:1.28,w:1.20,h:1.16,body:"tall",main:C.redDk,dark:C.black,trim:C.gold,acc:C.gold,
      bar:C.hpOrange,xp:1100,gold:64,drop:1,ai:"halfNeutral",reach:250,territory:300,
      drops:["ironScrap","leatherHide","goldCoin"],
      desc:"匪帮头目，配铁质砍刀与厚实布甲，会招呼附近匪帮一起上",
      behavior:"蓝血条 · 头目领地 · 呼唤同伴"},
    grassWisp:{id:"grassWisp",label:"中立·草浮灵",element:"木系",hp:176,dmg:19,spd:1.28,
      scale:1.02,w:1.0,h:1.06,body:"thin",main:C.leaf1,dark:C.leaf2,trim:C.cyan,acc:C.white,
      bar:C.hpBlue,xp:520,gold:18,drop:.66,ai:"neutral",reach:66,
      drops:["leaf","herb"],
      desc:"湿雾里浮着的木系灵体，双防与生命较高，用法术攻击；蓝血条，被打了才还手",
      behavior:"蓝血条 · 无领地 · 离开仇恨区域解除并回满"},
    ogreMage:{id:"ogreMage",label:"BOSS·食人魔",element:"暗系",hp:1450,dmg:52,spd:1.08,
      scale:1.92,w:1.54,h:1.34,body:"tall",main:C.ghostDark,dark:C.black,trim:C.ghostViolet,acc:C.gold,
      bar:C.hpViolet,xp:8600,gold:280,drop:1,ai:"boss",reach:120,
      drops:["shadowShard","shadowCore","boneTalisman"],
      desc:"人形暗系 BOSS，形似漂浮的幽灵；双防 / 生命 / 攻击都很高，暗系技能可能使玩家中毒或麻痹",
      behavior:"敌对 · 暗系法术 · 中毒 / 麻痹 · 概率掉暗影晶核"}
  });

  /* ---------- dev2 新材料 / 新道具 ---------- */
  Object.assign(MATERIALS,{
    orange:{name:"橘子",icon:"🍊",color:C.orange,price:15,desc:"村落橘树结的果子，可直接食用或作药剂配料",source:"雨沼边境走廊 · 农田&破败村落的橘子树（每日 4 次）"},
    ironScrap:{name:"铁片",icon:"🔩",color:C.steel,price:16,desc:"匪帮武器上崩下来的铁片，锻造与交易都用得上",source:"击败雨沼边境走廊的匪帮 / 猪人"},
    leatherHide:{name:"兽皮",icon:"🟫",color:C.brown,price:14,desc:"厚实皮革，可缝制皮甲",source:"击败猪人 / 匪帮，或采集兽类"},
    shadowShard:{name:"暗影晶核碎屑",icon:"🔹",color:C.ghostViolet,price:120,desc:"食人魔消散后残留的暗影碎屑，稀有交易材料",source:"击败 BOSS · 食人魔（概率）"},
    shadowCore:{name:"暗影晶核",icon:"🔮",color:C.ghostViolet,price:420,desc:"完整暗影晶核，小概率掉落，稀有",source:"击败 BOSS · 食人魔（小概率）"},
    boneTalisman:{name:"骨符",icon:"🦴",color:C.bone||C.white,price:90,desc:"刻着古老符文的骨片",source:"击败 BOSS · 食人魔（概率）"},
    goldCoin:{name:"少许金币",icon:"🪙",color:C.gold,price:30,desc:"匪帮身上搜出的零钱",source:"击败山匪头子"},
    academyRobe:{name:"学院临时袍",icon:"🥋",color:C.clothBlue,price:0,desc:"完成入学报名后发放的临时法袍；凭学员徽章可在城内各设施刷卡",source:"魔法大学城西郊 · 新生接待员"},
    academyMap:{name:"西郊地图",icon:"🗺",color:C.gold,price:0,desc:"标注了四段子区域与资源点的手绘地图",source:"魔法大学城西郊 · 新生接待员"},
    entryPass:{name:"入内凭据",icon:"🎫",color:C.gold,price:0,desc:"通过元素技能考核后发放，需在【城门石像鬼守卫】处核实方可进入魔法大学城",source:"西郊城门 · 新生接待员考核"},
    badgeCopper:{name:"铜级学员徽章",icon:"🥉",color:C.brown,price:0,desc:"Lv.1~39 通过考核者获得；进城门 / 图书馆 / 任务堂 / 宿舍 / 竞技场需刷卡（后续版本生效）",source:"西郊城门 · 元素技能考核"},
    badgeSilver:{name:"银级学员徽章",icon:"🥈",color:C.steel,price:0,desc:"Lv.40~79 通过考核者获得；权限同铜级徽章",source:"西郊城门 · 元素技能考核"},
    badgeGold:{name:"金级学员徽章",icon:"🥇",color:C.gold,price:0,desc:"Lv.80 以上通过考核者获得；权限同铜级徽章",source:"西郊城门 · 元素技能考核"}
  });
  Object.assign(ITEMS,{
    hpPotionLarge:{name:"大瓶生命药水",icon:"🧪",color:C.red,price:110,
      desc:"立即恢复 80 点生命值",type:"heal",val:80,cd:14,
      source:"流浪商人术士 · 每日限 5"},
    energyPotion:{name:"能量药剂",icon:"💧",color:C.cyan,price:95,
      desc:"立即恢复 80 点能量，可更快接续技能",type:"energy",val:80,cd:14,
      source:"流浪商人术士 · 每日限 5"},
    /* v1.4 dev4：PP 系统仅预留，当前只结算能量 */
    energyPotionPlus:{name:"高级小型能量药剂",icon:"💠",color:C.cyan,price:130,
      desc:"立即恢复 25 点能量，并为当前角色全部已装备技能各回复 2 点 PP（PP 归零时技能无法释放）",
      type:"energy",val:25,cd:10,pp:2,
      source:"便利店掌柜图拉 · 每日限 10"}
  });
  /* ---------- dev2 新装备 ----------
     工具属性装备一律允许任何职业穿戴（equipment.classOk 已豁免），
     战斗能力限制由 combatState() 按职业区分。 */
  Object.assign(EQUIPMENT,{
    moonSickle:{name:"月牙镰",icon:"🌙",q:"purple",slot:"two",wtype:"spear",weight:"medium",
      look:"moonSickle",tool:"harvest",allow:[0],fit:{best:["assassin","warrior"],bad:["tank"]},
      price:880,stats:{atk:55,atkSpd:.13},passive:["harvest","strong"],
      desc:"紫装 · 双手 · 战士系 · 矛系（更优：刺客 / 战士，更劣：坦克）| 中武；物攻 +55 / 攻速 +13%。附带工具属性：丰收 25%、强效 29%",
      source:"流浪商人术士 · 每周限 1"},
    crudeCleaver:{name:"粗制砍刀",icon:"🔪",q:"white",slot:"main",wtype:"axe",price:190,
      look:"axe",allow:[0],stats:{atk:14},desc:"白装 · 匪帮常用的粗铁砍刀，物攻 +14",
      source:"流浪商人术士 · 每日限 2"},
    ironCleaver:{name:"铁质砍刀",icon:"🗡",q:"green",slot:"main",wtype:"axe",price:340,
      look:"axe",allow:[0],stats:{atk:26,crit:.03},desc:"绿装 · 淬过火的铁砍刀，物攻 +26 / 暴击 +3%",
      source:"流浪商人术士 · 每日限 2"},
    woodStaff:{name:"木纹手杖",icon:"🪄",q:"white",slot:"main",wtype:"staff",price:260,
      look:"staff",allow:[1,3],stats:{matk:18},desc:"白装 · 术士入门木杖，法攻 +18",
      source:"流浪商人术士 · 每日限 2"},
    heavyCrossbow:{name:"强弩",icon:"➶",q:"green",slot:"two",wtype:"crossbow",price:520,
      look:"crossbow",allow:[2],stats:{atk:32,atkSpd:.04},desc:"绿装 · 加固弩臂，物攻 +32 / 攻速 +4%",
      source:"流浪商人术士 · 每日限 2"},
    antiMagicCloak:{name:"抗魔斗篷",icon:"🧥",q:"green",slot:"chest",sub:"clothes",price:620,
      look:"windCloak",stats:{pdef:15,mdef:15,hp:150},
      enterShield:{magic:200,cd:75},
      desc:"绿装 · 双防 +15 / 生命 +150；进入战斗时立即获得 200 点法术护盾（冷却 75 秒）。匪帮远程单位常备",
      source:"流浪商人术士 · 每日限 2"},
    thickClothArmor:{name:"厚实布甲",icon:"🛡",q:"blue",slot:"chest",sub:"clothes",price:760,
      look:"blackPlate",stats:{pdef:22,mdef:22,hp:220},
      enterShield:{normal:300,trueHp:.15,cd:60},
      desc:"蓝装 · 双防 +22 / 生命 +220；进入战斗时立即获得 300 点普通护盾 + 15% 最大生命的真实护盾（冷却 60 秒）",
      source:"流浪商人术士 · 每日限 2"},
    leatherArmor:{name:"皮甲",icon:"🧥",q:"green",slot:"chest",sub:"clothes",price:280,
      look:"leatherVest",stats:{pdef:9,mdef:5,hp:60},desc:"绿装 · 兽皮缝制的轻甲，物防 +9 / 法防 +5 / 生命 +60",
      source:"击败匪帮 / 猪人（概率）"},
    /* v1.4 dev4：小鱼叉调整为单手・矛系・中武・工具属性（钓鱼）；长杆鱼叉留待后续统一调整 */
    smallFishSpear:{name:"小鱼叉",icon:"🔱",q:"white",slot:"main",wtype:"spear",weight:"medium",tool:"fish",price:150,
      look:"fishSpear",stats:{atk:5},desc:"工具 · 单手 · 矛系 · 中武：浅水叉鱼用；可搭配副手盾，非战士持工具仅能采集，无法普攻 / 释放依赖武器的技能",
      source:"农夫老陶 · 每周限 3 / 巴恩工坊 · 每日限 6"},
    longFishSpear:{name:"长杆鱼叉",icon:"🔱",q:"green",slot:"two",wtype:"spear",tool:"fish",price:260,
      look:"fishSpear",stats:{atk:11},passive:["harvest"],desc:"工具 · 双手：长杆鱼叉，采集效率更高；战士持之照常战斗",
      source:"农夫老陶 · 每周限 3"},
    hoe:{name:"锄头",icon:"⛏",q:"white",slot:"two",wtype:"hammer",tool:"harvest",price:210,
      look:"hoe",stats:{atk:6},passive:["strong"],desc:"工具 · 双手：翻地与采集用；战士可当武器，法 / 射仅采集",
      source:"农夫老陶 · 每周限 3"}
  });
  Object.assign(LOOK_ALIAS,{cleaver:"axe"});

  /* ---------- dev2 区域情报 ---------- */
  REGION_INFO.border={name:"雨沼边境走廊",icon:"🌧",risk:"danger",
    desc:"9600px 四段过渡带 · 推荐 Lv.85+ · 通往魔法大学城（下一版本主线）",
    npcs:[
      {t:"堕落魔导师",n:"雨沼洼地",d:"兜帽斗篷、被教廷通缉，暂无内容"},
      {t:"巡逻护卫",n:"灌木丛林",d:"提示洼地危险、指引城门新生接待棚"},
      {t:"农夫老陶",n:"农田&破败村落",d:"6:00-17:00 摆摊，果蔬鱼肉每日限量，三种农具每周限 3"},
      {t:"巡逻的魔法护卫",n:"城门处",d:"提示城门内主线区域尚未开放"},
      {t:"流浪商人术士",n:"城门处",d:"药水 / 弹药 / 装备，装备日限 2、月牙镰周限 1"},
      {t:"城门石像鬼守卫",n:"城门处",d:"两人高灰白石像，蓝晶核扫描光圈"},
      {t:"新生接待员",n:"新生接待棚",d:"登记领学院临时袍与地图；考核 / 担保 / 收费门槛未开启"}
    ],
    mobs:[
      {t:"毒蛙 / 变色蜥 / 沼泽鳄",n:"雨沼洼地 · 中立",d:"蓝血条，数值 ≥ 前图 3 倍；被打才反击"},
      {t:"猪人",n:"雨沼洼地 · 半中立",d:"胖墩高大，大砍刀，双防 / 生命 / 攻击高"},
      {t:"匪帮 / 山匪头子",n:"雨沼洼地 · 半中立",d:"远程保持距离射击、部分穿厚实布甲 / 抗魔斗篷；掉铁片 / 皮甲 / 毒镖"},
      {t:"草浮灵",n:"灌木丛林 · 中立",d:"木系法术，双防与生命较高"},
      {t:"林间弓手 / 持刀小混子 / 斧头帮 / 锯齿恶犬",n:"灌木丛林 · 半中立",d:"数值 ≥ 前图 3 倍；有领地，出范围脱战"},
      {t:"毒蛙 / 蹦蹦种子",n:"村落与城门 · 中立 / 半中立",d:"较安全区，仍为高属性版本"}
    ],
    bosses:[
      {t:"食人魔",n:"雨沼洼地 · BOSS",d:"暗系幽灵形态，暗系技能可致中毒 / 麻痹；概率掉暗影晶核碎屑 / 暗影晶核 / 骨符"}
    ],
    nodes:[
      {t:"草丛 ×5",n:"全段",d:"叶片 / 甘草 / 鸟蛋，每日 4 次"},
      {t:"菇丛 ×6",n:"洼地 / 灌木 / 村落",d:"蘑菇 / 甘草，每日 3 次"},
      {t:"废弃铜铁矿堆 ×2",n:"洼地 / 灌木",d:"需铁镐，铁矿 / 铜矿，每日 3 次"},
      {t:"森林巨杉 ×2",n:"灌木丛林",d:"需伐木斧 / 双人锯 / 月牙镰，木材"},
      {t:"橘子树 ×2",n:"农田&破败村落",d:"每日 4 次、单次 2~4 个橘子"}
    ]};

  /* ==================================================================
     v1.4 dev4 · 【魔法大学城】四子区域
     集市外街（默认落点）→ 旗帜广场 → 魔法工会堂（室内）→ 魔法公寓区
     整体安全区；入学前置（报名 → 元素技能考核 → 入内凭据 / 徽章 → 石像鬼核实）已于 dev4.1 在西郊城门实装，
     本区仍需凭 cityPermit 才可进入；服装店幻化 / 工坊强化附魔 / 公寓购买租用 / PP 仍未开启。
     ================================================================== */
  const UNI_SPAWN_X=520,UNI_GRACE=3,UNI_SAFE_R=240;
  const UNI_STAT_MUL=(BORDER_STAT_MUL||3.25)*2;   /* ≥ 雨沼边境走廊 2 倍 */
  const UNI_ZONES=[
    {id:"street",name:"集市外街",start:0,end:1900,risk:"safe",danger:"安全",
     sky:[[.16,.24,.38],[.34,.42,.56],[.56,.58,.60]],hill:[.20,.26,.38],
     fog:.10,tint:[1.02,1.00,1.04],ambient:1.0,indoor:false,bgm:"uniStreet",
     desc:"中世纪街屋、魔法悬浮横幅「欢迎来到魔法大学城」、荧光奇树、花池与魔法路灯；飞鸟与骑扫帚的巡逻者掠过天空"},
    {id:"plaza",name:"旗帜广场",start:1900,end:3800,risk:"safe",danger:"安全 · 恢复节点",
     sky:[[.18,.28,.46],[.40,.50,.66],[.62,.66,.72]],hill:[.22,.30,.44],
     fog:.08,tint:[1.00,1.02,1.08],ambient:1.05,indoor:false,bgm:"uniPlaza",
     desc:"整片开阔石板广场，中央魔法泉水雕塑（停留 2 秒恢复全队生命）；学院蓝白旗帜、长椅、护栏、花池、鸽子与远处工会堂尖顶，广场中央无房屋遮挡"},
    {id:"guild",name:"魔法工会堂",start:3800,end:5700,risk:"safe",danger:"安全 · 室内",
     sky:[[.10,.12,.20],[.20,.22,.30],[.32,.30,.28]],hill:[.14,.16,.22],
     fog:.04,tint:[1.06,.98,.88],ambient:.92,indoor:true,bgm:"uniGuild",
     desc:"整座巨大的石砌室内大厅：高穹顶、彩绘玻璃、石柱与二楼回廊；玩家身处大厅内部，无户外街屋，长桌书架、委托板、卷轴柜与魔法灯透着羊皮纸与墨香"},
    {id:"apart",name:"魔法公寓区",start:5700,end:7600,risk:"safe",danger:"安全 · 社区",
     sky:[[.16,.22,.34],[.36,.38,.48],[.58,.50,.46]],hill:[.20,.24,.32],
     fog:.08,tint:[1.04,.98,.94],ambient:.98,indoor:false,bgm:"uniApart",
     desc:"尖顶阳台彩窗的豪华公寓与木筋墙小窗的普通公寓，石板街巷、座椅花池、晾衣绳、窗内暖光与夜间路灯"}
  ];
  function uniZoneAt(x){for(let i=0;i<UNI_ZONES.length;i++)if(x<UNI_ZONES[i].end)return i;
    return UNI_ZONES.length-1;}
  /* 12 位可交互 NPC */
  const UNI_NPCS={
    tula:{id:"tula",name:"便利店掌柜图拉",icon:"🧺",x:760,depth:-48,color:C.gold,
      role:"shop",desc:"外街便利店的掌柜，药水与食物日限充足，也卖几件基础工具。",
      lines:["药水、果子、还有几件顺手的工具，都给你备齐了。","高级小型能量药剂现在真能回 25 点能量和 2 点 PP 了，技能用空了记得来补。"]},
    suan:{id:"suan",name:"服装店老板娘苏安",icon:"👗",x:1180,depth:52,color:C.purple||C.pink,
      role:"placeholder",desc:"高挑，红棕卷发用魔杖簪住，深紫长裙外披附魔披肩，晶核戒；量衣时魔杖变成软尺。",
      lines:["皮肤与幻化的柜子我擦得锃亮，可惜柜台还没接上魔法。","等学院那边点头，你就能把样子换成喜欢的模样啦。"]},
    barn:{id:"barn",name:"街头魔法工坊坊主巴恩",icon:"⚒",x:1540,depth:-40,color:C.iron||C.steel,
      role:"shop",desc:"有合法执照的民营作坊：工具日限六件，另代售 8 件战斗增益型副件【神兵】（永久限购 1）；强化 / 附魔 / 合成尚未开放。",
      lines:["伐木斧、匕首、小鱼叉、木纹手杖，日限六件，先到先得。","柜里那排是【神兵】——不是武器，不占装备槽，得靠你角色自己的 9 条灵路供能；碎星大剑便宜，赤霄最挑灵路颜色，买前先看看【角色 / 队伍 → 灵路】。","强化台盖着布呢，等工会把许可证送来再谈。"]},
    dutyMage:{id:"dutyMage",name:"学院值勤法师",icon:"✦",x:2180,depth:48,color:C.clothBlue,
      role:"dialogue",desc:"广场问询处的值勤法师，负责学院方向指引。",
      lines:["欢迎来到旗帜广场，中央泉水停留 2 秒能让全队恢复体力。","入学考核已在西郊城门开放：缴费、展示元素技能、石像鬼核实后即可进城。"]},
    patrolClerk:{id:"patrolClerk",name:"巡逻队值勤员",icon:"🛡",x:2480,depth:-56,color:C.steel,
      role:"dialogue",desc:"负责广场治安与周边地图提示。",
      lines:["城里四段都算安全区，外街那两只蹦蹦种子别去戳就行。","再往里是工会堂和公寓区，没有野怪。"]},
    oldCup:{id:"oldCup",name:"乞丐 · 老铜杯",icon:"🥣",x:2740,depth:58,color:C.brown,
      role:"dialogue",desc:"缩在长椅旁的老人，话里总像藏着别的线索。",
      lines:["泉水亮起来的时候，我好像看见旗子底下有字。","……算了，大概是我眼花。"]},
    diviner:{id:"diviner",name:"古怪占卜师",icon:"🔮",x:3420,depth:-44,color:C.violet||C.purple,
      role:"dialogue",desc:"说话跳跃的流浪学者，给模糊提示或趣味对话。",
      lines:["羊皮纸怕火，彩窗怕黑，卷轴柜怕人翻得太急。","你问我星象？它说你今天会走进一间很大的屋子。"]},
    guildAdmin:{id:"guildAdmin",name:"工会堂管理员",icon:"📖",x:4060,depth:-52,color:C.gold,
      role:"dialogue",desc:"柜台后中年法师，单片眼镜、账本与印章，负责登记与指引。",
      lines:["委托板已经挂好了，接取功能还要等工会总部的批文。","先熟悉下大厅吧：登记柜台、卷轴柜、长椅都在这一层。"]},
    boardClerk:{id:"boardClerk",name:"委托板接待员",icon:"🪶",x:4380,depth:50,color:C.clothBlue,
      role:"dialogue",desc:"年轻职员，别着羽毛笔，负责委托板说明。",
      lines:["委托、公告、登记，三块板子分得清清楚楚。","现在只能看，不能接；下个版本再来吧。"]},
    maintenance:{id:"maintenance",name:"维护法师",icon:"💡",x:4820,depth:-46,color:C.cyan,
      role:"dialogue",desc:"检查魔法灯与结界的维护法师。",
      lines:["彩窗的光是魔法灯打的，不费一根蜡烛。","穹顶回廊的结界刚校过，放心走。"]},
    oldSage:{id:"oldSage",name:"古怪老法师",icon:"📜",x:5260,depth:54,color:C.purple,
      role:"dialogue",desc:"坐长椅研究卷轴的老法师，偶尔给一句莫名的话。",
      lines:["卷轴柜第三格……咳，我什么都没说。","羊皮纸翻动的声音，比合唱还好听。"]},
    apartAdmin:{id:"apartAdmin",name:"公寓管理员",icon:"🔑",x:6060,depth:-50,color:C.cloth3,
      role:"dialogue",desc:"门房柜台的管理员，负责登记与说明；购买 / 租用公寓尚未开启。",
      lines:["公寓购买和租用还没开放，先登记个名字总不亏。","夜里窗光和路灯一起亮，这一带最安稳。"]}
  };
  /* 21 位会移动的路人（头顶标签由 render_university 绘制） */
  const UNI_WALKERS=[
    {name:"逛街的人",x0:300,d0:60,color:C.cloth,icon:"●",speed:30,range:220,zone:0,line:"今天横幅换了新的字样"},
    {name:"小孩",x0:620,d0:-62,color:C.pink,icon:"✿",speed:52,range:240,zone:0,line:"扫帚又飞过去啦！"},
    {name:"路过的魔法师",x0:980,d0:44,color:C.clothBlue,icon:"✦",speed:26,range:260,zone:0,line:"飞行超速罚单又要开了"},
    {name:"巡逻队的人",x0:1420,d0:-46,color:C.steel,icon:"🛡",speed:34,range:300,zone:0,line:"外街一切正常"},
    {name:"小孩",x0:2060,d0:58,color:C.candy,icon:"✿",speed:48,range:220,zone:1,line:"泉水会发光！"},
    {name:"情侣",x0:2320,d0:-58,color:C.sakura,icon:"❦",speed:22,range:190,zone:1,line:"旗帜被风吹得真好"},
    {name:"路过的行人",x0:2620,d0:46,color:C.cloth2,icon:"▣",speed:30,range:280,zone:1,line:"去工会堂要往里走"},
    {name:"身着魔法袍的人",x0:3060,d0:-52,color:C.clothBlue,icon:"✦",speed:28,range:300,zone:1,line:"竖琴排练别迟到"},
    {name:"巡逻的人",x0:3560,d0:60,color:C.steel,icon:"🛡",speed:36,range:260,zone:1,line:"广场不用担心安全"},
    {name:"办事魔法师",x0:3960,d0:-60,color:C.clothBlue,icon:"✦",speed:30,range:240,zone:2,line:"登记柜台排队了"},
    {name:"学徒",x0:4200,d0:56,color:C.cloth3,icon:"●",speed:44,range:250,zone:2,line:"委托板什么时候能接呀"},
    {name:"抄写员",x0:4520,d0:-48,color:C.gold,icon:"✎",speed:20,range:180,zone:2,line:"墨还没干呢"},
    {name:"排队冒险者",x0:4780,d0:62,color:C.brown,icon:"⚔",speed:26,range:220,zone:2,line:"我先看看公告"},
    {name:"巡逻队",x0:5040,d0:-56,color:C.steel,icon:"🛡",speed:34,range:260,zone:2,line:"室内也别跑"},
    {name:"抱卷轴的人",x0:5420,d0:50,color:C.cloth,icon:"📜",speed:28,range:240,zone:2,line:"小心别撞到彩窗"},
    {name:"住户",x0:5860,d0:-58,color:C.cloth3,icon:"●",speed:24,range:200,zone:3,line:"窗台的花开了"},
    {name:"搬行李的新生",x0:6200,d0:56,color:C.pink,icon:"✿",speed:38,range:260,zone:3,line:"公寓什么时候能租呀"},
    {name:"遛小魔法宠物的人",x0:6520,d0:-46,color:C.leaf2,icon:"❦",speed:26,range:280,zone:3,line:"别追猫了，回来"},
    {name:"巡逻的人",x0:6840,d0:60,color:C.steel,icon:"🛡",speed:32,range:240,zone:3,line:"夜里灯都亮着"},
    {name:"送信人",x0:7160,d0:-54,color:C.gold,icon:"✉",speed:42,range:300,zone:3,line:"告示栏又贴新通知了"},
    {name:"窗边聊天的人",x0:7400,d0:48,color:C.cloth2,icon:"●",speed:18,range:170,zone:3,line:"今晚的哼唱真好听"}
  ];
  /* 9 处采集点：橘子树 2 / 草丛 2 / 菇丛 2 / 铜铁矿 1 / 森林巨杉 2 */
  const UNI_NODES=[
    {id:"uOrange1",kind:"orange",name:"外街橘子树 · 一",icon:"🍊",x:420,depth:62,daily:4,time:1.7,
      drops:["orange"],min:2,max:4,desc:"街边花池旁的橘树，日采 4 次"},
    {id:"uOrange2",kind:"orange",name:"外街橘子树 · 二",icon:"🍊",x:1320,depth:-60,daily:4,time:1.7,
      drops:["orange"],min:2,max:4,desc:"便利店后院的第二棵橘树"},
    {id:"uGrass1",kind:"grass",name:"外街草丛 · 一",icon:"❦",x:880,depth:58,daily:4,time:1.5,
      drops:["leaf","herb","egg"],min:4,max:8,desc:"花池边的野草，戴采集者手套效率更高"},
    {id:"uGrass2",kind:"grass",name:"外街草丛 · 二",icon:"❦",x:1700,depth:-56,daily:4,time:1.5,
      drops:["leaf","herb","egg"],min:4,max:8,desc:"石板路缝隙里长出的草丛"},
    {id:"uMush1",kind:"mush",name:"喷泉外围菇丛 · 一",icon:"🍄",x:2260,depth:-62,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"阴湿花池里的菌伞"},
    {id:"uMush2",kind:"mush",name:"喷泉外围菇丛 · 二",icon:"🍄",x:3400,depth:60,daily:3,time:1.8,
      drops:["mushroom","herb"],min:2,max:5,desc:"广场东侧护栏下的菇丛"},
    {id:"uOre1",kind:"ore",name:"广场旧维修围栏矿堆",icon:"⛏",x:2040,depth:64,daily:3,time:2.4,
      tool:["ironPick"],drops:["iron","copper"],min:2,max:5,desc:"需要铁镐；战士持镐仍可战斗"},
    {id:"uCedar1",kind:"lumber",name:"广场移栽巨杉 · 一",icon:"🌲",x:2980,depth:66,daily:3,time:2.6,
      tool:["woodAxe","timberSaw","moonSickle"],drops:["wood"],min:4,max:8,desc:"广场外缘的巨杉，需要伐木工具"},
    {id:"uCedar2",kind:"lumber",name:"广场移栽巨杉 · 二",icon:"🌲",x:3660,depth:-66,daily:3,time:2.6,
      tool:["woodAxe","timberSaw","moonSickle"],drops:["wood"],min:4,max:8,desc:"第二棵移栽巨杉"}
  ];
  /* 11 处纯交互点（未开启功能，仅入口与文案） */
  const UNI_PROPS=[
    {id:"boardQuest",name:"委托板",icon:"📋",x:4260,depth:-58,zone:2,desc:"任务委托板 · 接取功能后续版本开放"},
    {id:"boardNotice",name:"公告板",icon:"📢",x:4100,depth:58,zone:2,desc:"工会公告 · 当前只有学院通知"},
    {id:"counter",name:"登记柜台",icon:"🪶",x:4020,depth:-48,zone:2,desc:"管理员的账本与印章，登记功能待开放"},
    {id:"scrollCab",name:"卷轴柜",icon:"📚",x:4660,depth:60,zone:2,desc:"整柜羊皮卷轴，暂不可借阅"},
    {id:"benchGuild",name:"长椅",icon:"🪑",x:5180,depth:-60,zone:2,desc:"老法师常坐的长椅"},
    {id:"lampGuild",name:"魔法灯",icon:"💡",x:4900,depth:56,zone:2,desc:"维护法师校准过的魔法灯"},
    {id:"boardApart",name:"公寓告示栏",icon:"📢",x:5940,depth:58,zone:3,desc:"住户通知与租房告示（功能未开启）"},
    {id:"counterApart",name:"门房柜台",icon:"🔑",x:6100,depth:-48,zone:3,desc:"购买 / 租用公寓尚未开启"},
    {id:"benchApart",name:"长椅",icon:"🪑",x:6680,depth:60,zone:3,desc:"窗边聊天的人常坐这里"},
    {id:"flowerBed",name:"花池",icon:"🌸",x:7000,depth:-58,zone:3,desc:"风吹过时有花瓣飘起"},
    {id:"lampApart",name:"路灯",icon:"🏮",x:7360,depth:56,zone:3,desc:"夜间与窗光相映的魔法路灯"}
  ];
  /* 商店：图拉 / 巴恩；末项为占位 NPC 不售货 */
  const UNI_GOODS={
    tula:[
      {k:"item",id:"traitWine",price:260,limit:10,period:"daily"},
      {k:"item",id:"potion",price:40,limit:10,period:"daily"},
      {k:"item",id:"energyPotion",price:95,limit:10,period:"daily"},
      {k:"item",id:"energyPotionPlus",price:130,limit:10,period:"daily"},
      {k:"mat",id:"apple",price:12,limit:20,period:"daily"},
      {k:"mat",id:"pear",price:14,limit:20,period:"daily"},
      {k:"mat",id:"orange",price:15,limit:20,period:"daily"},
      {k:"equip",id:"ironDagger",price:190,limit:2,period:"daily"},
      {k:"equip",id:"gathererGloves",price:230,limit:2,period:"daily"},
      {k:"equip",id:"woodStaff",price:240,limit:2,period:"daily"}
    ],
    barn:[
      {k:"equip",id:"woodAxe",price:330,limit:6,period:"daily"},
      {k:"equip",id:"ironDagger",price:240,limit:6,period:"daily"},
      {k:"equip",id:"smallFishSpear",price:180,limit:6,period:"daily"},
      {k:"equip",id:"woodStaff",price:300,limit:6,period:"daily"},
      /* v1.4 dev5：副件（神兵）不是装备，独立占灵路；永久限购 1 */
      {k:"spirit",id:"starBreaker",price:1200,limit:1,period:"once"},
      {k:"spirit",id:"moonWind",price:1200,limit:1,period:"once"},
      {k:"spirit",id:"dragonBone",price:900,limit:1,period:"once"},
      {k:"spirit",id:"frostMourn",price:3200,limit:1,period:"once"},
      {k:"spirit",id:"wasteReaper",price:3800,limit:1,period:"once"},
      {k:"spirit",id:"xuanYuan",price:6800,limit:1,period:"once"},
      {k:"spirit",id:"chiXiao",price:9800,limit:1,period:"once"},
      {k:"spirit",id:"dragonHunter",price:9800,limit:1,period:"once"}
    ]
  };
  const UNI_SELL={apple:6,pear:7,orange:7,mushroom:8,herb:8,leaf:4,egg:9,
    wood:12,iron:10,copper:9,ironScrap:14};
  /* 野外单位：外街半中立 ×2、广场中立 ×2；三 / 四区无野怪 */
  const UNI_MOBS=[
    {type:"seed",x:1250,depth:-46,territory:200},
    {type:"seed",x:1680,depth:54,territory:200},
    {type:"grassWisp",x:2320,depth:60},
    {type:"grassWisp",x:3180,depth:-56}
  ];
  /* v1.4 dev4.1 入学前置：费用 / 礼包 / 徽章 / 凭据 */
  const ENROLL_FEE=9900;
  const APP_EQUIP=["appHat","appStaff","appRing","appOrb","appNote",
    "appWoodSword","appWand","appShield","appRobe","appNecklace","appBoots"];
  const APP_BADGES=[{min:80,id:"badgeGold",name:"金级"},{min:40,id:"badgeSilver",name:"银级"},
    {min:1,id:"badgeCopper",name:"铜级"}];
  const ENTRY_PASS="entryPass";
  /* 区域情报 */
  REGION_INFO.university={name:"魔法大学城",icon:"🏛",risk:"safe",
    desc:"7600px 四子区域 · 学院主线区 · 整体安全 · 需在西郊城门完成报名 / 元素考核 / 石像鬼核实后解锁",
    npcs:[
      {t:"便利店掌柜图拉",n:"集市外街",d:"药水 / 食物 / 基础工具，日限 10 / 20 / 2"},
      {t:"服装店老板娘苏安",n:"集市外街",d:"皮肤 / 幻化入口，dev4 未开启"},
      {t:"街头魔法工坊坊主巴恩",n:"集市外街",d:"工具日限 6；代售 8 件【神兵】副件（A/S/X，900~9800 金币，永久限 1），不是装备，只占 9 条灵路"},
      {t:"学院值勤法师 / 巡逻队值勤员",n:"旗帜广场",d:"学院指引与治安提示；入学考核已在西郊城门开放"},
      {t:"乞丐老铜杯 / 古怪占卜师",n:"旗帜广场",d:"趣味对话与后续线索埋点"},
      {t:"工会堂管理员 / 委托板接待员 / 维护法师 / 古怪老法师",n:"魔法工会堂",d:"委托板、公告板、登记柜台、卷轴柜、长椅、魔法灯；接取功能未开启"},
      {t:"公寓管理员",n:"魔法公寓区",d:"告示栏 / 门房柜台；购买与租用未开启"}
    ],
    mobs:[
      {t:"蹦蹦种子 ×2",n:"集市外街 · 半中立",d:"数值 ≥ 雨沼边境走廊 2 倍；有领地，进入才仇恨，离开解除并回满"},
      {t:"草浮灵 ×2",n:"旗帜广场 · 中立",d:"木系法术、双防与生命较高，蓝血条，人不犯我我不犯人"},
      {t:"无",n:"工会堂 / 公寓区",d:"室内与社区安全区，无任何野怪"}
    ],
    bosses:[{t:"无",n:"全区域",d:"魔法大学城为安全区，本版本不设置 BOSS"}],
    nodes:[
      {t:"橘子树 ×2 / 草丛 ×2",n:"集市外街",d:"橘子日 4 次 2~4 个；草丛日 4 次 4~8 个"},
      {t:"菇丛 ×2 / 铜铁矿堆 ×1 / 森林巨杉 ×2",n:"旗帜广场",d:"菇丛日 3 次；矿堆需铁镐；巨杉需伐木工具"},
      {t:"魔法泉水雕塑",n:"旗帜广场中央",d:"靠近即恢复全队生命值"},
      {t:"交互点 ×11",n:"工会堂 / 公寓区",d:"委托板、公告板、柜台、卷轴柜、长椅、魔法灯、告示栏、花池、路灯"}
    ]};
  CR.CFG={VERSION,PRERELEASE,VERSIONS,MAX_LEVEL,expFormula,totalExpToMax,
    MAX_CLASS,CLASSES,ARCHETYPES,HEAVY_WTYPES,HEAVY_ITEMS,archetypeOf,heavyPenalty,
    SKILLS,SKILL_ORDER,SKILL_PP_DEFAULT,TYPE_CHART,ELEMENT_COLOR,typeMultiplier,rawTypeMultiplier,ABSOLUTE_CHART,
    SOUL_COLORS,SOUL_COLOR_ORDER,SOUL_SPLITS,SOUL_TOTAL,SOUL_GRADE,SOUL_ATTR_CURVE,
    SOUL_ATTR_REQ,SOUL_TAX,SOUL_G,SOUL_BOSS_BUFF,SOUL_LABEL,SPIRITS,SPIRIT_ORDER,
    NATURES,NATURE_KEYS,STAT_NAMES,TALENT_KEYS,TIER_TABLE,
    EFFORT_MAX,EFFORT_TOTAL,BEAN_COST,BEAN_MAX_STAR,BEAN_START,
    MOBS,MATERIALS,ITEMS,DROP_TABLE,UPGRADES,
    QUALITY_COLOR,QUALITY_NAME,QUALITY_ORDER,QUALITY_RANK,QUALITY_CHAIN,FIT_EFF,LOOK_ALIAS,SLOT_SUB,subExclusive,EQUIP_SLOTS,EQUIPMENT,EQUIP_SETS,PASSIVE_DESC,
    DEFAULT_EQUIP,EQUIP_DROPS,
    MAPS,MARKET_W,HARBOR_W,FOREST_W,SWAMP_W,BORDER_W,ZONE_RISK,AI_DOC,WEATHER,WEATHER_ORDER,STATUS,STATUS_MAX,GROUND,NPCS,WALKERS,
    HARBOR_NPCS,HARBOR_NODES,HARBOR_MOBS,HARBOR_WALKERS,TRADE_PRICE,FORGE,BLACK_MARKET,TRIAL,
    UNI_W,UNI_SPAWN_X,UNI_GRACE,UNI_SAFE_R,UNI_STAT_MUL,UNI_ZONES,uniZoneAt,
    UNI_NPCS,UNI_WALKERS,UNI_NODES,UNI_PROPS,UNI_GOODS,UNI_SELL,UNI_MOBS,
    FOREST_NPCS,FOREST_NODES,FOREST_MOBS,FOREST_WALKERS,FOREST_GOODS,
    FOREST_ZONES,forestZoneAt,FOREST_ANIMALS,FOREST_QUEST,HATCHERY,DRUID_GOODS,
    REGION_INFO,ELEMENTS,MOB_ORDER,
    SWAMP_ZONES,swampZoneAt,SWAMP_NPCS,SWAMP_NODES,SWAMP_GOODS,SWAMP_SELL,QUESTS,SWAMP_MOBS,
    BORDER_ZONES,borderZoneAt,BORDER_SPAWN_X,BORDER_SAFE_R,BORDER_GRACE,BORDER_STAT_MUL,BORDER_NPCS,BORDER_WALKERS,
    BORDER_NODES,BORDER_GOODS,BORDER_SELL,BORDER_MOBS,
    SHOP,BOUNTY,ZONES,WAVES,LEVEL_W,QUALITY,
    KEY_LABELS,ACTIONS,FIXED_KEYS,RESERVED_CODES,DEFAULT_BINDINGS,TEAM_ALIAS,ENROLL_FEE,APP_EQUIP,APP_BADGES,ENTRY_PASS};
})(window.CR=window.CR||{});
