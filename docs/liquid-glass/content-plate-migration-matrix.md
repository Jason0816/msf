# 内容底板迁移矩阵（阶段 3）

> 审计范围：`web/src` 的仪表盘和 Mihomo 概览（包含页面组件与其直接渲染的小组件）。
>
> 权威计划：`/Users/luochuhan/Downloads/content-plate-opacity-implementation-plan.md`
>
> 审计日期：2026-08-08。阶段 3 已完成仪表盘与 Mihomo 概览示范迁移；本表记录当前实现、迁移状态及保留的语义背景。

## 1. 读表规则

目标 tone 按权威计划第 4.2 节解释：

- `subtle`：大面积图表画布、辅助背景和弱分区。
- `regular`：普通数据行、KPI、网络信息和常规参数卡。
- `strong`：密集表格、表单槽位和关键文字。
- `—`：语义色或交互状态，不属于内容底板，保留现有语义类。

“是否迁移”字段的含义：

- `是（明确 tone）`：已使用带显式 `tone` 的 `SolidPlate`。
- `是（旧背景）`：原 `bg-*` 内容底板已改为对应 tone 的 `SolidPlate`。
- `是（控件材质）`：保留或改用统一控件材质（如 `GlassSurface`/`gary-field`），不把控件误归类为内容底板。
- `否（保留语义）`：颜色表达状态、选中态、hover 态或进度轨道，不做机械替换。
- `待阶段 2`：属于全屏/弹层表面，先保持现状，按统一弹窗与 modal-surface 方案处理。

## 2. 仪表盘候选

| ID | 文件（行） | 组件 / 选择器 | 当前背景 | 角色 | 目标 tone | 是否迁移 | 备注 |
|---|---|---|---|---|---|---|---|
| DB-01 | `web/src/components/dashboard/Dashboard.tsx:47` | `InfoLine` 根节点 `<SolidPlate tone="regular">` | `var(--gary-plate-display-fill-regular)` | `content-plate` | `regular` | 是（明确 tone） | 设备、硬件及服务卡共用的信息行，已显式指定 regular。 |
| DB-02 | `web/src/components/dashboard/Dashboard.tsx:73` | `TimePills` 外层 `<GlassSurface material="regular" flat>` | 控件材质 `gary-segmented` | `input-well` | — | 是（控件材质） | 时间范围控件保留控件材质；内部 active 项的 `gary-segmented__item--active` 属于 `selected-state`，不替换成底板。 |
| DB-03 | `web/src/components/dashboard/Dashboard.tsx:197` | `ServiceCard` 状态点 `bg-green-500` / `bg-muted-foreground` | 绿色或 muted 前景色 | `semantic-status` | — | 否（保留语义） | 运行/停止状态指示，不是底板；不要改成 `SolidPlate`。 |
| DB-04 | `web/src/components/dashboard/Dashboard.tsx:226` | 未配置服务图标容器 `<SolidPlate tone="subtle">` | `var(--gary-plate-display-fill-subtle)` | `content-plate`（空状态承托） | `subtle` | 是（旧背景） | 中性空状态承托已迁移为 subtle；保留圆形形状，图标本身的 muted 前景色仍是语义色。 |
| DB-05 | `web/src/components/dashboard/Dashboard.tsx:349` | 硬件卡磁盘使用率块 `<SolidPlate tone="regular">` | `var(--gary-plate-display-fill-regular)` | `content-plate`（KPI + 进度） | `regular` | 是（明确 tone） | 进度轨道另见 DB-06；承载标签和百分比的块已指定 regular。 |
| DB-06 | `web/src/components/dashboard/Dashboard.tsx:352` | 磁盘进度轨道 `bg-muted/50` | `var(--muted)`，50% 透明度 | `progress-track` | — | 否（保留语义） | 轨道是进度语义层；内部 primary 渐变继续保留。 |
| DB-07 | `web/src/components/dashboard/Dashboard.tsx:374` | 资源趋势图画布 `<SolidPlate tone="subtle">` | `var(--gary-plate-display-fill-subtle)` | `content-plate`（chart canvas） | `subtle` | 是（明确 tone） | 大面积图表背景已使用辅助底板；`TrendChart` SVG、数据和渐变未改变。 |
| DB-08 | `web/src/components/dashboard/Dashboard.tsx:415` | 实时速率图画布 `<SolidPlate tone="subtle">` | `var(--gary-plate-display-fill-subtle)` | `content-plate`（chart canvas） | `subtle` | 是（明确 tone） | 与 DB-07 同一图表画布规则。 |
| DB-09 | `web/src/components/dashboard/Dashboard.tsx:436` | 统计信息 `rows.stats` 每行 `<SolidPlate tone="regular">` | `var(--gary-plate-display-fill-regular)` | `content-plate`（KPI 行） | `regular` | 是（明确 tone） | 普通统计数据行已指定 regular，不提升为 strong。 |

## 3. Mihomo 概览页面候选

| ID | 文件（行） | 组件 / 选择器 | 当前背景 | 角色 | 目标 tone | 是否迁移 | 备注 |
|---|---|---|---|---|---|---|---|
| MH-P01 | `web/src/app/mihomo/overview/page.tsx:58` | `toneClasses.slate.iconWrap` 的 `bg-muted` | `var(--muted)` | `semantic-status` | — | 否（保留语义） | slate 是中性状态/图标色，不能视为内容底板。 |
| MH-P02 | `web/src/app/mihomo/overview/page.tsx:59` | `toneClasses.slate.badge` 的 `bg-muted` | `var(--muted)` | `semantic-status` | — | 否（保留语义） | slate 状态徽章；ring 与前景色也保持原语义。 |
| MH-P03 | `web/src/app/mihomo/overview/page.tsx:257` | `rangeButtonClass` 非 active 分支 `bg-muted` + `hover:bg-muted/70` | `var(--muted)`（hover 变体） | `selected-state` | — | 否（保留语义） | active 分支是 `bg-primary`；该 helper 当前无调用，若后续启用仍保留为选择态。 |
| MH-P04 | `web/src/app/mihomo/overview/page.tsx:271` | `FieldCard` 根节点 `<SolidPlate tone="strong">`（`ConfigGrid` 的端口、网络、运行特性、TUN 字段） | `var(--gary-plate-display-fill-strong)` | `content-plate`（密集参数卡） | `strong` | 是（明确 tone） | 参数卡数量多、文字密集，已按 strong 语义；没有用 `bg-card`/`bg-muted` 覆盖。 |
| MH-P05 | `web/src/app/mihomo/overview/page.tsx:350` | `StatRow` 进度轨道 `bg-muted` | `var(--muted)` | `progress-track` | — | 否（保留语义） | `StatRow` 当前无调用；即使以后使用也保留轨道语义。 |
| MH-P06 | `web/src/app/mihomo/overview/page.tsx:536` | TUN 状态点 `bg-emerald-500` / `bg-muted-foreground` | 绿色或 muted 前景色 | `semantic-status` | — | 否（保留语义） | 已启用/未启用状态指示，不迁移。 |

## 4. Mihomo 概览小组件候选

| ID | 文件（行） | 组件 / 选择器 | 当前背景 | 角色 | 目标 tone | 是否迁移 | 备注 |
|---|---|---|---|---|---|---|---|
| MH-W01 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:230` | `OverviewStatCards` 的 `cards.map` 每项 `<SolidPlate tone="regular">` | `var(--gary-plate-display-fill-regular)` | `content-plate`（KPI + sparkline） | `regular` | 是（明确 tone） | 上传、下载、连接三张 KPI 卡已显式 regular；sparkline 仍是内容层，不重建图表。 |
| MH-W02 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:247` | `FaviconLatencyTester` 根节点 `<SolidPlate tone="subtle">` | `var(--gary-plate-display-fill-subtle)` | `content-plate`（网络延迟信息） | `subtle` | 是（明确 tone） | 按权威计划修正为 subtle（矩阵初稿误写 regular）；彩色柱条是状态/数据层。 |
| MH-W03 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:248` | 延迟重测按钮 `hover:bg-muted` | hover 时 `var(--muted)` | `selected-state` | — | 否（保留语义） | hover 反馈，不是底板。 |
| MH-W04 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:271` | `NetworkInfoPanel` 根节点 `<SolidPlate tone="regular">` | `var(--gary-plate-display-fill-regular)` | `content-plate`（网络信息） | `regular` | 是（明确 tone） | 国内/国际出口文字和 IP 承托使用 regular。 |
| MH-W05 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:271` | 网络信息显隐/刷新按钮 `hover:bg-muted` | hover 时 `var(--muted)` | `selected-state` | — | 否（保留语义） | 控件 hover 状态，不迁移。 |
| MH-W06 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:298` | `ProviderTrafficPanel` 的 `rows.map` 每项 `<SolidPlate tone="regular">` | `var(--gary-plate-display-fill-regular)` | `content-plate`（订阅 KPI） | `regular` | 是（明确 tone） | provider 名称、用量和剩余额度已使用 regular；进度条另见 MH-W07。 |
| MH-W07 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:298` | provider 用量轨道 `bg-muted` | `var(--muted)` | `progress-track` | — | 否（保留语义） | 玫红/琥珀/绿色填充表达阈值状态，保持现有语义色。 |
| MH-W08 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:411` | `ConnectionSankey` 全屏分支 `fixed inset-0 … bg-background` | `var(--background)` | `modal-surface` | `strong` | 待阶段 2 | 这是图表全屏表面，不是普通内容块；后续用统一 `ModalViewport`/modal-surface 方案，避免局部蒙层。 |
| MH-W09 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:413` | Sankey 图表视口 `<SolidPlate tone="subtle">` | `var(--gary-plate-display-fill-subtle)` | `content-plate`（chart canvas） | `subtle` | 是（旧背景） | 原 `bg-background/35` 已迁移为 subtle；ECharts option 保持 `backgroundColor: transparent`。 |
| MH-W10 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:416-417` | Sankey 暂停/全屏按钮 `hover:bg-muted` | hover 时 `var(--muted)` | `selected-state` | — | 否（保留语义） | 控件状态层；不要把 hover 色当作 chart canvas。 |
| MH-W11 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:445` | `ConnectionHistoryPanel` 顶部五项统计 `map` 的 `<SolidPlate tone="regular">` | `var(--gary-plate-display-fill-regular)` | `content-plate`（KPI） | `regular` | 是（明确 tone） | 统计摘要属于普通 KPI；表格本体另见 MH-W13/W14。 |
| MH-W12 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:445` | 聚合/清理两个 `<select>` 的 `gary-field` | 控件材质 `gary-field` | `input-well` | `strong` | 是（控件材质） | 原 `bg-background` 已移除；select 改用统一字段控件，`option` 内容及保存逻辑不变。 |
| MH-W13 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:445` | 连接历史表滚动容器 `<SolidPlate tone="strong">` | `var(--gary-plate-display-fill-strong)` | `content-plate`（dense table body） | `strong` | 是（旧背景） | 原 `bg-background/35` 已迁移；密集长文本/表格保留滚动、布局和边框。 |
| MH-W14 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:445` | 连接历史 `<thead className="gary-solid-plate--strong">` | `var(--gary-plate-display-fill-strong)` | `table-header` | `strong` | 是（旧背景） | 原 `bg-card` 已移除；sticky 表头复用现有 strong display fill，避免滚动时 tbody 透出，不改 sticky 行为。 |
| MH-W15 | `web/src/components/mihomo/overview/OverviewWidgets.tsx:457` | `RuleHitChart` 图表区 `<SolidPlate tone="subtle">` | `var(--gary-plate-display-fill-subtle)` | `content-plate`（chart canvas） | `subtle` | 是（明确 tone） | 大面积柱状图画布已使用 subtle；柱色和文字标签仍是内容层。 |

## 5. 外层玻璃上下文（非候选背景）

下列节点没有需要迁移的内容底板背景，或本身承担外层层级；它们已经是外层玻璃，阶段 3 保留：

| 文件（行） | 组件 | 当前材质 | 角色 | 阶段 3 处理 |
|---|---|---|---|---|
| `web/src/components/dashboard/DashboardCard.tsx:20` | `DashboardCard` | `<GlassSurface material="thick">` | `outer-glass` | 保留；DB-01～DB-09 只处理内部内容层。 |
| `web/src/components/mihomo/overview/OverviewWidgets.tsx:230` | `OverviewStatCards` 外层 | `<GlassSurface material="thick">` | `outer-glass` | 保留；内层三张 KPI 卡明确 regular。 |
| `web/src/app/mihomo/overview/page.tsx:472` | 延迟/网络两列容器 | `<GlassSurface material="thick">` | `outer-glass` | 保留；MH-W02/MH-W04 是其内部内容层。 |
| `web/src/components/mihomo/overview/OverviewWidgets.tsx:298` | `ProviderTrafficPanel` 外层 | `<GlassSurface material="thick">` | `outer-glass` | 保留；provider 子项按 MH-W06 处理。 |
| `web/src/components/mihomo/overview/OverviewWidgets.tsx:411` | `ConnectionSankey` 外层 | `<GlassSurface material="thick">` | `outer-glass` | 普通状态保留；全屏分支的 `bg-background` 仍是待阶段 2 的 modal-surface。 |
| `web/src/components/mihomo/overview/OverviewWidgets.tsx:445` | `ConnectionHistoryPanel` 外层 | `<GlassSurface material="thick">` | `outer-glass` | 保留；表格和选择槽位按 MH-W12～MH-W14 处理。 |
| `web/src/components/mihomo/overview/OverviewWidgets.tsx:457` | `RuleHitChart` 外层 | `<GlassSurface material="thick">` | `outer-glass` | 保留；图表区按 MH-W15 处理。 |
| `web/src/app/mihomo/overview/page.tsx:263` | 高级运行信息 `Card` | `<GlassSurface material="thick">` | `outer-glass` | 保留；其 `FieldCard` 子项按 MH-P04 处理。 |

## 6. 覆盖与验证记录

候选扫描使用以下只读检索（另外将 `bg-muted-foreground` 状态点作为语义色一并核对）：

```sh
rg -n 'SolidPlate|gary-solid-plate|bg-(card|background|muted)' \
  web/src/components/dashboard web/src/app/page.tsx \
  web/src/components/mihomo/overview web/src/app/mihomo/overview/page.tsx
```

结果已逐项映射到 DB-01～DB-09、MH-P01～MH-P06、MH-W01～MH-W15。阶段 3 已移除内容底板职责上的 `bg-background/35`、`bg-card` 和 `bg-muted`（改为显式 `SolidPlate tone` 或统一控件材质）；全屏 modal-surface 的 `bg-background`、active/hover、状态色及进度轨道仍按非底板语义保留。

本轮未安全启动 Web 页面，因此没有生成或伪造基线截图。按计划要求的截图索引仍待后续具备可验证运行入口时补充：

| 视口 | 主题 | URL | 文件 | 状态 |
|---|---|---|---|---|
| 1440×900 | 浅色 / 暗色 | 待定 | 待定 | 未采集（未启动页面） |
| 768×1024 | 浅色 / 暗色 | 待定 | 待定 | 未采集（未启动页面） |
| 390×844 | 浅色 / 暗色 | 待定 | 待定 | 未采集（未启动页面） |

部署后实机验收已在 VM119（`http://192.168.10.119:7777`）完成；以下为实施后的验证截图，不作为阶段 0 的“改造前基线”冒充补录：

| 视口 | 主题 | URL | 文件 | 状态 |
|---|---|---|---|---|
| 1440×900 | 浅色 | `/settings?tab=appearance` | `/Users/luochuhan/.codex/visualizations/2026/08/08/019fe02e-d17f-7e42-a108-b7d89498a9e3/msf-opacity/settings-modal-1440.png` | 通过：三档弹窗居中，预览层级清楚 |
| 1440×900 | 浅色 | `/` | `/Users/luochuhan/.codex/visualizations/2026/08/08/019fe02e-d17f-7e42-a108-b7d89498a9e3/msf-opacity/dashboard-1440.png` | 通过：regular/subtle 分层正常 |
| 1440×900 | 浅色 | `/mihomo/overview` | `/Users/luochuhan/.codex/visualizations/2026/08/08/019fe02e-d17f-7e42-a108-b7d89498a9e3/msf-opacity/mihomo-overview-1440.png` | 通过：KPI、延迟、图表与表格 tone 正常 |
| 390×844 | 浅色 | `/settings?tab=appearance` | `/Users/luochuhan/.codex/visualizations/2026/08/08/019fe02e-d17f-7e42-a108-b7d89498a9e3/msf-opacity/settings-modal-390.png` | 通过：内部滚动可达三滑轨与全部操作按钮 |

交互验证：拖动滑轨期间无 appearance PUT；取消恢复打开前数值；单次保存仅发出一次 PUT；刷新后保持服务端值；测试结束后已恢复默认 `56/70/84`。仪表盘、Mihomo 概览与设置弹窗均无浏览器控制台错误。

阶段 3 变更边界核对：只修改权威计划列出的示范页文件与本台账；未修改图表实例、数据请求、刷新、tooltip、缩放或时间范围交互，也未触碰用户已有未提交的 `web/src/app/mosdns/rules/page.tsx` 与 `web/src/lib/dashboard-data.ts`。`ConnectionSankey` 全屏分支的 `bg-background` 明确标为阶段 2 modal-surface，不作为本阶段内容底板。
