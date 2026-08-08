# 内容底板透明度规范实施计划

> 状态：待实施
> 制定日期：2026-08-08
> 最近修订：2026-08-08（常驻整体联动滑轨 + “自定义编辑”弹窗内分别调整三档）
> 适用范围：MSF WebUI 的仪表盘、Mihomo、MosDNS、系统设置及后续新增页面
> 设计基线：Gary Liquid Glass 的 `GlassSurface + SolidPlate` 分层规则

## 1. 目标

建立一套可持续扩展的内容底板规范，解决当前页面内部信息框背景色、透明度和层级不一致的问题，并为后续 UI 开发提供统一示范。

本计划完成后应满足：

1. 外层玻璃与内部内容底板职责明确，禁止继续用任意 `bg-card/xx`、`bg-muted/xx` 模拟底板材质。
2. 内容底板只保留 `subtle`、`regular`、`strong` 三个语义等级。
3. 外观设置提供一个清晰的“自定义编辑”入口，用户点击后直接分别调整三档透明度。
4. `subtle / regular / strong` 三个值独立保存，并始终保持语义顺序。
5. 浅色、暗色、完整质感、平衡和减少效果模式都有可预测的表现。
6. 拖动滑轨只修改轻量 CSS 变量，不重建图表、不重新初始化玻璃滤镜，不产生白屏。
7. 新页面从规范建立后立即使用新组件，旧页面按优先级逐步迁移，最终再做全站收口。

## 2. 非目标

本计划第一阶段不处理以下内容：

- 不重新设计场景背景、折射参数、模糊半径或动画体系。
- 不为每个页面、每个卡片提供独立透明度设置；自定义范围只到全站三档语义 Token。
- 不把 SolidPlate 改成第二层带 `backdrop-filter` 的玻璃。
- 不对所有 `bg-muted` 做机械替换；选中态、状态色、进度轨道等仍保留语义颜色。
- 不在第一阶段一次性重写所有旧页面。

## 3. 当前问题与代码基线

### 3.1 已有统一基础

- 外层玻璃由 `web/src/components/liquid-glass/GlassSurface.tsx` 提供。
- 内部内容底板由 `web/src/components/liquid-glass/SolidPlate.tsx` 提供。
- 仪表盘的信息行、图表画布已经使用 `gary-solid-plate`。
- Mihomo 概览的上传、下载、连接、延迟和网络信息已经使用 `SolidPlate`。
- 当前内容底板变量位于 `web/src/styles/liquid-glass-tokens.css`：
  - 浅色普通底板：`rgba(248, 249, 250, 0.78)`
  - 浅色强底板：`rgba(248, 249, 250, 0.90)`
  - 暗色普通底板：`rgba(20, 22, 24, 0.76)`
  - 暗色强底板：`rgba(20, 22, 24, 0.90)`

### 3.2 尚未统一的部分

当前代码中仍有大量 `bg-card`、`bg-background`、`bg-muted` 及其透明度变体。它们的用途混合了：

- 页面级玻璃外壳；
- 内容底板；
- 表单槽位；
- 图表画布；
- 表格表头；
- 选中态和 hover 态；
- 状态色与进度轨道。

`web/src/styles/liquid-glass-pages.css` 目前通过嵌套选择器和 `!important` 将一部分旧背景强制转换为玻璃或 SolidPlate。由于 DOM 层级、选择器命中和局部透明度类不同，最终仍会产生视觉差异。

当前粗略代码清单中，明确的 SolidPlate 使用点约 30 个，而带 `bg-card/bg-background/bg-muted` 的候选行超过 300 个。这些候选不能直接批量替换，必须先按语义分类。

### 3.3 外观设置的现有缺口

- `SettingsClient.tsx` 已支持主题、场景和视觉质量。
- `/api/v1/settings/appearance` 可以保存任意键，但缺少针对透明度数值的边界校验。
- GET 响应和结构化设置目前没有完整返回 `scene`、`quality`，前端主要依赖 `localStorage` 回退。
- `main.tsx` 会在 React 挂载前应用主题、场景和质量，但还没有应用底板强度。

### 3.4 Agent 实施模块定位

以下路径是本计划的权威修改范围。Agent 开始编码前应先读取这些文件的当前内容，不得仅根据计划中的示例覆盖现有实现。

| 模块 | 文件 | 当前职责 | 本计划要求 |
|---|---|---|---|
| 三档底板组件 | `web/src/components/liquid-glass/SolidPlate.tsx` | 仅支持普通底板和旧 `strong` 布尔属性 | 增加 `tone`，保留旧属性兼容 |
| 底板 Token | `web/src/styles/liquid-glass-tokens.css` | 保存普通和 strong 的写死 RGBA | 拆分 RGB 与三档 opacity/fill Token |
| 底板材质映射 | `web/src/styles/liquid-glass-materials.css` | `.gary-solid-plate` 和 strong 类映射旧变量 | 增加 subtle/regular/strong 类映射和降级规则 |
| 旧页面兼容层 | `web/src/styles/liquid-glass-pages.css` | 用选择器和 `!important` 兼容旧背景 | 只随页面迁移缩小，不可第一阶段整体删除 |
| 启动恢复 | `web/src/main.tsx` | React 挂载前恢复主题、场景和质量 | React 挂载前解析并应用三档值 |
| 外观设置 | `web/src/app/settings/SettingsClient.tsx` 的 `AppearanceTab` | 加载和保存 theme/scene/quality | 增加摘要、编辑按钮、三滑轨弹窗和状态机 |
| 统一弹窗 | `web/src/components/liquid-glass/ModalViewport.tsx` | Portal、视口居中、Esc、滚动锁定和整页蒙层 | 必须复用；没有可证明的通用缺陷时不修改 |
| 普通 appearance API | `internal/server/handlers_system.go` 的 `handleSettingsAppearanceGet/Put` | GET 字段不完整，PUT 可写任意键 | 返回三字段并执行完整快照原子校验 |
| 结构化设置 API | `internal/server/handlers_settings_structured.go` 的 `structuredAppearanceSettings/applyStructuredAppearance` | 维护结构化 appearance 白名单 | 增加同一组三字段和共享校验 |
| 服务端测试 | `internal/server/handlers_system_test.go`、`internal/server/server_test.go` | 现有 handler 与集成测试 | 在最贴近现有测试组织的文件中补接口用例，不重复建测试框架 |
| 仪表盘示范 | `web/src/components/dashboard/Dashboard.tsx`、`DashboardCard.tsx`、`charts.tsx` | 仪表盘卡片和图表 | 按迁移矩阵指定 tone |
| Mihomo 示范 | `web/src/app/mihomo/overview/page.tsx`、`web/src/components/mihomo/overview/OverviewWidgets.tsx` | Mihomo 概览与统计组件 | 按迁移矩阵指定 tone，移除冲突底色 |

若实际仓库结构已经变化，Agent 只能通过符号搜索定位同一职责的新位置，并在实施记录中说明偏差；不能静默新建一套平行实现。

### 3.5 修改边界

- 不修改玻璃折射、SVG displacement、blur、场景背景或鼠标交互。
- 不更换图表库，不重建 ECharts/SVG 图表实例，不改业务数据请求。
- 不新增第二个弹窗基础组件；透明度编辑器复用 `ModalViewport`。
- 不引入新的全局状态库，设置状态保留在 `AppearanceTab` 和纯工具函数中。
- 不修改 MosDNS、Mihomo 或 MSF 的运行配置，透明度保存不触发服务重启。
- 工作区存在其他未提交修改时，只暂存本计划明确涉及的文件，禁止使用 `git add -A`，禁止还原或覆盖无关改动。

## 4. 核心设计决策

### 4.1 用户操作边界

外观设置不展示开发者概念，也不要求用户先选择控制模式。页面只显示三档当前透明度摘要和一个“自定义编辑”按钮。

用户点击按钮后，在弹出的编辑面板中直接调整：

- 辅助底板：图表画布、弱分区和辅助区域。
- 常规底板：数据行、KPI 和普通信息。
- 强调底板：密集表格、表单和关键文字。

用户调整的是全站三类内容底板，不提供逐页面或逐卡片设置，避免产生无法维护的大量局部样式。

### 4.2 三档语义

| 等级 | 适用场景 | 禁止场景 | 默认不透明度 |
|---|---|---|---:|
| `subtle` | 大面积图表画布、辅助背景、弱分区、空状态承托 | 密集长文本、弹窗表单 | 56% |
| `regular` | 普通数据行、KPI、网络信息、常规参数卡 | 需要无障碍高对比的关键阅读区 | 70% |
| `strong` | 密集表格、表单槽位、弹窗内容、危险确认、复杂文字 | 纯装饰背景 | 84% |

默认值为 `56 / 70 / 84`。三档不强制保持固定级差，但必须满足 `subtle <= regular <= strong`。

### 4.3 自定义编辑弹窗

外观设置的“内容底板透明度”项目默认显示：

- 三档当前值：例如 `辅助 56% · 常规 70% · 强调 84%`。
- 简短说明：`数值越低越透明，越高文字承托越清晰。`
- 一根常驻“整体透明度”滑轨，以 regular 为中心联动生成 `regular - 14 / regular / regular + 14`，各档分别按合法范围限制。
- 一个主操作按钮：`自定义编辑`。

点击“自定义编辑”后，通过项目统一的视口级弹窗组件打开编辑面板。弹窗固定相对浏览器视口居中，不受设置页滚动位置或内容容器高度影响。

弹窗内提供三根滑轨：

| 滑轨 | 默认 | 可调范围 | 对应内容 |
|---|---:|---:|---|
| 辅助底板 `subtle` | 56% | 20%–80% | 图表画布、弱分区、辅助区域 |
| 常规底板 `regular` | 70% | 30%–90% | 数据行、KPI、普通信息 |
| 强调底板 `strong` | 84% | 40%–96% | 密集表格、表单和关键文字 |

交互约束：

1. 常驻整体滑轨用于快速联动三档；弹窗内三档仍可直接分别调整，不设置额外的模式开关。
2. 始终满足 `subtle <= regular <= strong`；相邻值允许相等，以支持用户主动弱化层级差异。
3. 滑轨采用动态边界：`subtle` 不能超过当前 `regular`，`regular` 不能低于 `subtle` 或高于 `strong`，`strong` 不能低于 `regular`。
4. 打开弹窗时记录当前三档值作为会话快照；拖动时只做本地实时预览。
5. 点击“取消”、关闭按钮或按 Esc 时，恢复打开弹窗前的三档值。
6. 点击“保存”时一次性保存完整的三个值，成功后关闭弹窗并更新外观页摘要。
7. 提供“恢复三档默认值”，将弹窗内数值恢复为 `56 / 70 / 84`，仍需点击“保存”才持久化。
8. 弹窗内显示三个对应内容预览，帮助用户理解每根滑轨会影响哪一类底板。
9. 蒙层沿用项目统一的轻量整页蒙层，不增加内容区局部黑色蒙板或高开销背景模糊。

### 4.4 颜色规则

- 底板材质保持无彩色 K 值变化，不吸收品牌色或图表色。
- 浅色 RGB 基色建议保持 `248 249 250`。
- 暗色 RGB 基色建议保持 `20 22 24`。
- 浅色与暗色共用用户保存的同一组三档不透明度，RGB 基色分别校准。
- 图表面积色、状态色和选中态颜色继续位于内容层，不写入底板填充变量。

## 5. Token 与组件设计

### 5.1 CSS Token 改造

在 `web/src/styles/liquid-glass-tokens.css` 中将 RGB 与不透明度拆开：

```css
:root {
  --gary-plate-rgb: 248 249 250;
  --gary-plate-opacity-subtle: 0.56;
  --gary-plate-opacity-regular: 0.70;
  --gary-plate-opacity-strong: 0.84;
  --gary-plate-fill-subtle: rgb(var(--gary-plate-rgb) / var(--gary-plate-opacity-subtle));
  --gary-plate-fill-regular: rgb(var(--gary-plate-rgb) / var(--gary-plate-opacity-regular));
  --gary-plate-fill-strong: rgb(var(--gary-plate-rgb) / var(--gary-plate-opacity-strong));
}

.dark {
  --gary-plate-rgb: 20 22 24;
}
```

兼容期保留旧变量别名：

```css
--gary-solid-fill: var(--gary-plate-fill-regular);
--gary-solid-fill-strong: var(--gary-plate-fill-strong);
--gary-plate-opacity: var(--gary-plate-opacity-regular);
```

兼容别名至少保留一个发布周期，避免迁移过程中旧页面突然失效。

实现要求：

1. 三个 `--gary-plate-opacity-*` 是唯一可运行时修改的透明度变量。
2. 浅色和暗色只覆盖 `--gary-plate-rgb`，不得分别保存两套用户透明度。
3. `.gary-solid-plate--subtle/regular/strong` 只能切换对应 fill，不得分别定义圆角、阴影、边框或 blur。
4. `prefers-reduced-transparency` 和 `data-gary-quality="reduced"` 通过最终显示层提高最低 alpha，不反写用户保存值。
5. 旧 `--gary-solid-fill*` 仅作为兼容别名，新增代码必须使用新的三档变量。

### 5.2 SolidPlate API

将 `SolidPlate` 扩展为：

```ts
type SolidPlateTone = "subtle" | "regular" | "strong";

type SolidPlateProps = HTMLAttributes<HTMLDivElement> & {
  tone?: SolidPlateTone;
  strong?: boolean; // 兼容旧调用，内部映射到 strong，后续弃用
};
```

生成的类名：

```text
gary-solid-plate
gary-solid-plate--subtle
gary-solid-plate--regular
gary-solid-plate--strong
```

默认 `tone="regular"`。禁止通过 `className` 再叠加 `bg-card/xx` 或 `bg-muted/xx` 覆盖底板填充。

兼容优先级必须固定为：显式 `tone` 优先；未传 `tone` 且 `strong={true}` 时使用 `strong`；两者都未传时使用 `regular`。旧调用在迁移完成前不得改变视觉。

组件验收：

- `<SolidPlate />` 生成 regular 类。
- `<SolidPlate tone="subtle" />` 只生成 subtle tone 类。
- `<SolidPlate tone="strong" />` 和旧 `<SolidPlate strong />` 计算背景一致。
- `<SolidPlate tone="regular" strong />` 以显式 `tone="regular"` 为准。
- 组件继续透传 `ref`、ARIA 属性、事件和普通 `div` 属性。

### 5.3 组件范围限制

本次只扩展 `SolidPlate tone`，不新增 `ChartPlate`、`DataPlate`、`ReadingPlate` 等额外组件。页面直接使用 `SolidPlate tone="subtle|regular|strong"`，避免 Agent 额外设计抽象层。

## 6. 外观设置与持久化

### 6.1 配置键

新增统一键：

```text
服务端：appearance.content_plate_opacity_subtle
        appearance.content_plate_opacity_regular
        appearance.content_plate_opacity_strong
API 字段：content_plate_opacity_subtle
          content_plate_opacity_regular
          content_plate_opacity_strong
localStorage：msf-content-plate-settings
旧服务端：appearance.content_plate_opacity（只读迁移，一个发布周期后移除）
旧 localStorage：msf-content-plate-opacity（只读迁移，一个发布周期后移除）
```

三个字段使用整数百分比字符串，范围分别为 `20–80 / 30–90 / 40–96`，默认 `56 / 70 / 84`，并校验 `subtle <= regular <= strong`。整体滑轨只是三字段的前端联动入口，不新增服务端控制模式或第四个持久化字段。

旧 `content_plate_opacity` 只用于迁移：当三个新字段均不存在时，以旧值作为 `regular`，用 `regular - 14` 和 `regular + 14` 生成另外两档并按各自范围限制；生成新字段后不再写回旧字段。

前端内部只使用一个标准结构，API 字符串只在边界转换：

```ts
type ContentPlateOpacity = {
  subtle: number;
  regular: number;
  strong: number;
};

const DEFAULT_CONTENT_PLATE_OPACITY: ContentPlateOpacity = {
  subtle: 56,
  regular: 70,
  strong: 84,
};
```

解析、校验、迁移、写 CSS 变量和序列化 API 应统一放在 `web/src/lib/content-plate-opacity.ts`；不得把同一套范围判断分别复制到 `main.tsx` 和 `SettingsClient.tsx`。

### 6.2 服务端改造

涉及文件：

- `internal/server/handlers_system.go`
- `internal/server/handlers_settings_structured.go`
- `internal/server/server_test.go`

要求：

1. `/api/v1/settings/appearance` GET 返回 `theme`、`language`、`scene`、`quality` 和三个透明度字段。
2. PUT 不再无条件接受透明度字段，必须解析整数并按字段范围校验。
3. 保存时要求三个字段作为完整快照一起提交并校验三档顺序；顺序颠倒返回包含字段名和合法关系的 `400 bad_request`。
4. 结构化设置 GET/PUT 同步支持 `scene`、`quality` 和三个透明度字段。
5. 非法字符串、越界值、浮点、空值和缺少任一字段返回 `400 bad_request`。
6. 更新透明度不要求重启 MSF、MosDNS 或 Mihomo。
7. 现有用户只有旧 `content_plate_opacity` 时，按迁移规则生成三档值，不需要数据库迁移。

建议把 appearance 字段校验提取为共享函数，避免普通 appearance API 与 structured API 使用两套规则。

API 契约：

```json
{
  "content_plate_opacity_subtle": "56",
  "content_plate_opacity_regular": "70",
  "content_plate_opacity_strong": "84"
}
```

- GET 中三个字段必须始终存在，即使数据库尚无记录也返回默认值或迁移结果。
- PUT 请求若不包含任何透明度字段，可继续保存其他已支持的 appearance 字段。
- PUT 请求只要包含任一透明度字段，就必须同时包含全部三个字段。
- handler 必须先完整解析和校验，再写入三个 setting；任何字段失败时三个字段均不得改变。
- 普通 appearance API 和 structured settings 必须调用同一校验函数并产生相同结果。
- 成功继续使用现有 `{ "success": true, "data": ... }` 响应形状；失败使用现有 `400 bad_request`，错误信息指出具体字段或顺序关系。

### 6.3 启动应用

在 `web/src/main.tsx` 的 React 挂载前：

1. 优先读取 `msf-content-plate-settings` JSON；新键不存在时读取旧 `msf-content-plate-opacity`，按 `-14 / 0 / +14` 规则一次性迁移为三档并写入新键。
2. 校验三个字段的边界和顺序；数据无效时整体回退默认值，不能带着 `NaN` 或半组数据进入样式层。
3. 直接采用保存的三个值。
4. 在一次同步函数中设置三个变量：

```ts
document.documentElement.style.setProperty(
  "--gary-plate-opacity-subtle",
  String(settings.subtle / 100),
);
document.documentElement.style.setProperty("--gary-plate-opacity-regular", String(settings.regular / 100));
document.documentElement.style.setProperty("--gary-plate-opacity-strong", String(settings.strong / 100));
```

这样首次绘制就使用正确透明度，避免页面加载后发生明显闪烁。

登录后从服务端读取设置时，以服务端值为准并同步回 `localStorage`。服务端暂时不可用时保留本地值。

启动优先级必须固定为：有效服务端三字段 > 有效新 localStorage > 可迁移的旧服务端/旧 localStorage 单值 > 默认值。首次绘制只能同步读取本地值；服务端响应到达后再覆盖并同步本地缓存。

### 6.4 外观设置 UI

在 `SettingsClient.tsx` 的“外观设置”中新增“内容底板透明度”区域：

- 常驻区域显示整体联动滑轨、三档摘要、用途说明和“自定义编辑”按钮。
- 点击按钮后打开统一视口弹窗。
- 弹窗内显示三根独立滑轨、当前百分比、用途说明和实时预览。
- 弹窗底部提供“恢复默认”“取消”“保存”。

交互要求：

1. 拖动时只更新三个 opacity CSS 变量中必要的变量和当前数值。
2. 用 `requestAnimationFrame` 将连续输入限制到每帧一次。
3. 拖动和键盘微调只更新本地预览，不发送 API 请求。
4. 只有点击“保存”才向 API 发送一次完整三档快照。
5. 不修改 blur、SVG filter、displacement 或图表 option。
6. 三根滑轨使用一个扁平、稳定的状态对象；不得根据滑轨值改变组件 key、条件卸载整个设置页或重建 Provider。
7. 保存时发送完整的内容底板设置快照，防止并发请求造成三档字段互相覆盖。
8. 取消或关闭弹窗时恢复会话快照，不保留未保存预览。
9. 保存失败时保持弹窗打开、保留当前编辑值、提示错误，并允许再次保存或取消。

状态模型必须明确区分：

```ts
saved: ContentPlateOpacity;   // 最近一次确认保存或服务端加载成功的值
draft: ContentPlateOpacity;   // 弹窗内正在编辑的值
snapshot: ContentPlateOpacity; // 本次打开弹窗时的页面生效值
editorOpen: boolean;
saving: boolean;
```

状态转移：

| 操作 | 状态与副作用 |
|---|---|
| 页面加载 | 解析本地值并应用；服务端成功后更新 `saved/draft`、CSS 和 localStorage |
| 点击“自定义编辑” | `snapshot = 当前生效值`，`draft = saved`，打开弹窗 |
| 拖动滑轨 | 只更新 `draft` 和 CSS 变量，RAF 内批量应用 |
| 恢复默认 | `draft = 56/70/84` 并实时预览，不保存 |
| 取消、Esc、点击蒙层 | 将 CSS 恢复为 `snapshot`，`draft = saved`，关闭弹窗 |
| 点击保存 | 设置 `saving=true`，禁用重复提交，发送完整三字段快照 |
| 保存成功 | `saved = draft`，写 localStorage，保持当前 CSS，关闭弹窗 |
| 保存失败 | `saving=false`，保持弹窗与 draft，显示错误；取消仍恢复 snapshot |

弹窗实现要求：

- 使用 `ModalViewport onClose={cancelEditor}`，禁止直接在设置卡片内部使用 `position: absolute/fixed` 自建蒙层。
- 弹窗主体使用 `role="dialog"`、`aria-modal="true"`、可关联标题；打开后聚焦第一根滑轨或标题，关闭后焦点回到“自定义编辑”按钮。
- 主体设置动态视口最大高度并允许内部滚动，390×844 视口下三个滑轨和操作按钮均可到达。
- 使用 `ModalViewport` 默认整页轻量蒙层；不得添加内容区局部黑板或 `backdrop-filter`。

## 7. 无障碍与降级规则

用户偏好与可访问性优先级：

```text
prefers-reduced-transparency > reduced 视觉质量 > 用户保存的三档值 > 默认值
```

### 7.1 prefers-reduced-transparency

系统要求减少透明度时：

- `subtle` 最低提升到 82%。
- `regular` 最低提升到 90%。
- `strong` 提升到 96%。
- 编辑弹窗中的三根滑轨仍显示用户保存值，但增加“系统减少透明度设置正在覆盖显示效果”的说明，并展示最终生效值。

### 7.2 reduced 视觉质量

`data-gary-quality="reduced"` 下：

- 关闭玻璃 backdrop blur 的既有行为不变。
- 内容底板至少保证 `subtle 74% / regular 84% / strong 92%`。
- 不将所有内容底板强制成同一个值，仍保留信息层级。

### 7.3 浏览器降级

- SolidPlate 本身不使用 `backdrop-filter`，不依赖 SVG filter。
- 不支持 `color-mix` 时仍应保留有效背景色。
- CSS `clamp/calc/rgb slash alpha` 必须经过目标浏览器验证；如目标环境不完整，提供预计算 fallback。

## 8. 分阶段实施

Agent 必须按 `0 → 1 → 2 → 3` 顺序完成第一轮，不得在 Token 和设置契约稳定前批量改页面。每个阶段先完成该阶段验收并记录验证结果，再进入下一阶段；验证失败时只修复当前阶段，不扩大修改范围。

### 阶段 0：基线与审计清单

目标：先区分哪些背景是真正底板，避免机械替换。

工作项：

1. 生成候选清单：`bg-card`、`bg-background`、`bg-muted`、`gary-solid-plate`、`SolidPlate`。
2. 为每个候选标记角色：
   - outer-glass
   - content-plate
   - input-well
   - selected-state
   - semantic-status
   - progress-track
   - table-header
   - modal-surface
3. 保存迁移台账，记录页面、组件、目标 tone 和验证状态。
4. 截取现状基线：1440px、768px、390px，浅色/暗色各一组。

模块范围：只读审计 `web/src`，新增或更新 `docs/liquid-glass/content-plate-migration-matrix.md`；不得修改运行代码。

交付与验收：

- 台账至少包含文件、组件/选择器、当前背景、角色、目标 tone、是否迁移和备注。
- 仪表盘与 Mihomo 概览所有现有 `SolidPlate` 和遗留背景候选均已列入。
- 保存 1440×900、768×1024、390×844 的浅色/暗色基线截图并记录页面 URL。
- `git diff` 中除台账和基线索引外没有运行代码变化。

### 阶段 1：Token 与组件基础

目标：建立后续开发立即可用的规范。

工作项：

1. 新增 plate RGB 和三档独立 opacity token。
2. 扩展 `SolidPlate tone` API。
3. 保留旧变量和 `strong` 布尔属性兼容。
4. 在现有页面临时或测试入口验证三档，不新增长期演示组件。
5. 添加必要的组件注释和使用矩阵。

允许修改：

- `web/src/components/liquid-glass/SolidPlate.tsx`
- `web/src/styles/liquid-glass-tokens.css`
- `web/src/styles/liquid-glass-materials.css`

验收：

- 默认、subtle、regular、strong 和旧 `strong` 调用符合第 5.2 节优先级。
- 默认 CSS 变量精确为 `0.56 / 0.70 / 0.84`。
- 三档只改变中性填充不透明度；computed border、radius、shadow 完全一致。
- 三档 computed `backdrop-filter` 均为 `none`。
- 旧 `--gary-solid-fill` 和 `--gary-solid-fill-strong` 仍可工作。
- `cd web && npm run check` 与 `git diff --check` 通过。

### 阶段 2：设置与持久化

目标：建立安全、可持久化的三档自定义编辑入口。

工作项：

1. 扩展 appearance API 和 structured settings。
2. 添加数值边界和三档顺序校验。
3. React 挂载前应用本地设置。
4. 外观页增加三档摘要和“自定义编辑”按钮，弹窗内提供三档滑轨、预览和恢复默认。
5. 实现 RAF 实时预览、取消回滚和显式保存。
6. 加入跨标签页 `storage` 同步，避免多个页面显示不同值。
7. 加入旧单值配置到新设置结构的兼容读取与迁移。

允许新增：

- `web/src/lib/content-plate-opacity.ts`：唯一的前端默认值、解析、校验、迁移、CSS 应用和 API 序列化实现。

允许修改：

- `web/src/main.tsx`
- `web/src/app/settings/SettingsClient.tsx`
- `internal/server/handlers_system.go`
- `internal/server/handlers_settings_structured.go`
- `internal/server/handlers_system_test.go` 和/或 `internal/server/server_test.go`

只读复用：

- `web/src/components/liquid-glass/ModalViewport.tsx`；只有发现阻止本功能实现的通用缺陷并补充相应回归验证时才允许修改。

验收：

- `/settings?tab=appearance` 常驻显示一根整体联动滑轨、三档摘要和“自定义编辑”；三根独立滑轨仍只在弹窗内出现。
- 弹窗通过 Portal 相对视口居中；页面滚动到底部后打开仍居中，蒙层覆盖整个视口。
- 三根滑轨分别连续拖动 60 秒，无白屏、无控制台错误、无图表重建风暴。
- 拖动期间 Network 中没有 appearance PUT；点击一次保存只产生一次 PUT。
- 取消、Esc、点击蒙层均恢复打开前 computed alpha；保存成功后刷新仍保留三个值。
- 保存失败时弹窗不关闭；再次取消能恢复快照。
- 旧单值 `70` 迁移为 `56/70/84`，新缓存生成后不再依赖旧键。
- 普通 appearance API 与 structured settings 对同一输入返回相同结果。
- `go test ./...`、`cd web && npm run check`、`git diff --check` 全部通过。

### 阶段 3：示范页面迁移

优先迁移以下两处，作为后续页面的标准实现：

#### 仪表盘

- 设备信息行：`regular`
- 硬件信息行：`regular`
- 硬盘进度所在底板：`regular`
- 资源使用趋势画布：`subtle`
- 实时速率画布：`subtle`
- 统计信息行：`regular`
- 时间范围控制容器：保持控件材质，不误归类为内容底板

#### Mihomo 概览

- 上传/下载/连接概览：`regular`
- 延迟测试面板：`subtle`
- 网络信息：`regular`
- 密集运行参数：`strong`
- 订阅流量单元：`regular`
- 规则命中图表画布：`subtle`
- 连接统计表格：`strong`

允许修改：

- `web/src/components/dashboard/Dashboard.tsx`
- `web/src/components/dashboard/DashboardCard.tsx`
- `web/src/components/dashboard/charts.tsx`
- `web/src/app/mihomo/overview/page.tsx`
- `web/src/components/mihomo/overview/OverviewWidgets.tsx`
- 仅在确有选择器冲突时最小修改 `web/src/styles/liquid-glass-pages.css`

验收：

- 上述矩阵中的每个内容区都具有明确 tone，且不再叠加覆盖填充的 `bg-card/xx`、`bg-background/xx` 或 `bg-muted/xx`。
- 相同 tone 在同一主题下 computed background 完全一致；差异只来自内容和背景叠加。
- 图表组件实例、数据刷新频率、tooltip、缩放和时间范围交互没有改变。
- 在设置弹窗调整任一档时，仪表盘和 Mihomo 概览对应底板实时变化，其他两档保持不变。
- 浅色、暗色、390px 移动端无文字溢出、硬白板、硬黑板或双层玻璃。
- `go test ./...`、`cd web && npm run check`、`git diff --check` 全部通过。

### 阶段 4：高频页面增量迁移

按用户频率和视觉暴露度分批迁移：

第一批：

- Mihomo 代理节点：`web/src/app/mihomo/proxies/page.tsx`
- Mihomo 规则管理：`web/src/app/mihomo/rules/page.tsx`
- Mihomo 连接管理与连接详情：`web/src/app/mihomo/connections/page.tsx` 及其直接引用的连接详情组件
- MosDNS 概述：`web/src/app/mosdns/overview/page.tsx`
- MosDNS 规则管理：`web/src/app/mosdns/rules/page.tsx` 及其直接引用的规则组件
- MosDNS 客户端设置：`web/src/app/mosdns/clients/page.tsx`

第二批：

- Mihomo 配置管理：`web/src/app/mihomo/config/page.tsx`
- MosDNS 系统功能：`web/src/app/mosdns/system/page.tsx`
- MosDNS 配置管理：`web/src/app/mosdns/service-config/page.tsx`
- 系统设置：`web/src/app/settings/SettingsClient.tsx`、`web/src/app/system/page.tsx`
- 用户管理：`web/src/app/users/page.tsx`

第三批：

- 进程管理：`web/src/app/process/page.tsx`
- 日志页面：`web/src/app/logs/page.tsx`、`web/src/app/mihomo/logs/page.tsx`、`web/src/app/mosdns/logs/page.tsx`、`web/src/app/mosdns/query-log/page.tsx`
- 系统诊断与状态：`web/src/app/system/page.tsx`
- 通用配置页面：`web/src/app/config/page.tsx`、`web/src/app/proxy/page.tsx`
- 登录与初始化向导中适合复用的区域：`web/src/app/login/page.tsx`、`web/src/pages/SetupPage.tsx`

每批迁移后都应：

1. 删除该批页面中已经被 `SolidPlate` 替代的局部透明背景类。
2. 不删除仍承担选中态、hover、状态或进度含义的语义背景。
3. 缩小 `liquid-glass-pages.css` 的兼容选择器覆盖范围。
4. 更新迁移台账和截图。
5. 运行 `cd web && npm run check` 与 `git diff --check`；涉及后端的批次同时运行 `go test ./...`。

每批验收：页面功能、弹窗、表格滚动、选中态、hover、状态色和移动端布局不回归；同 tone 的 computed background 与阶段 3 示范页一致。一个批次完成并部署 VM119 验收后才能进入下一批。

### 阶段 5：全站收口

所有主要页面完成后执行最终统一：

1. 全站搜索内容表面中的 `bg-card/xx`、`bg-background/xx`、`bg-muted/xx`。
2. 删除不再需要的 `!important` 兼容覆盖。
3. 确认同一 tone 的 computed background 在同一主题下完全一致。
4. 检查是否存在玻璃套玻璃、底板套底板、错误的彩色底板。
5. 检查所有表格、图表、信息行、弹窗和表单。
6. 冻结规范并补充开发文档。

## 9. 迁移判定规则

### 应迁移为 subtle

- 图表 SVG/Canvas 的承托区域。
- 无需高对比阅读的大面积辅助区域。
- 空状态或低优先级说明区。

### 应迁移为 regular

- 一行标签 + 数值。
- KPI 单元。
- 普通配置摘要。
- 网络信息、状态摘要、Provider 指标。

### 应迁移为 strong

- 密集表格与多列矩阵。
- 弹窗中的长文本或表单主体。
- 高风险确认信息。
- 背景最复杂区域中的关键文字。

### 不应迁移为 SolidPlate

- 选中的 tab、按钮 hover、focus ring。
- 成功、警告、错误等状态色。
- 进度条轨道和图表面积色。
- 页面最外层 GlassSurface。
- 导航栏、弹窗外壳等真实玻璃表面。

## 10. 防止回退的工程措施

### 10.1 审计脚本

新增只读审计脚本，例如 `web/scripts/audit-content-plates.mjs`：

- 列出 GlassSurface 内部使用 `bg-card/xx`、`bg-background/xx` 的候选。
- 列出 `SolidPlate` 上叠加背景填充类的违规点。
- 支持 allowlist，允许选中态和语义状态色。
- 初期仅报告不阻断；迁移完成后纳入 CI。

### 10.2 开发约束

- 新的数据底板必须使用 `SolidPlate tone`。
- 禁止在 `SolidPlate` 上使用任意 `bg-*` 覆盖材质。
- 新增 tone 必须先修改设计规范，不能页面内临时发明第四档。
- 页面局部确实需要例外时，必须写明语义原因和视觉验收截图。

## 11. 测试计划

### 11.1 单元与接口测试

服务端：

| 用例 | 输入/前置 | 预期 |
|---|---|---|
| 无历史配置 | 三个新字段和旧字段均不存在 | GET 返回 `56/70/84` |
| 正常保存 | `20/30/40`、`56/70/84`、`80/90/96` | PUT 200，随后 GET 完全一致 |
| 相等合法 | `60/60/60` | PUT 200 |
| subtle 越界 | `19/70/84` 或 `81/81/84` | 400，数据库三字段均不改变 |
| regular 越界 | `30/29/84` 或 `56/91/96` | 400，数据库三字段均不改变 |
| strong 越界 | `40/40/39` 或 `56/70/97` | 400，数据库三字段均不改变 |
| 顺序错误 | `71/70/84` 或 `56/85/84` | 400，错误指出顺序关系 |
| 不完整快照 | 只提交一项或两项透明度 | 400，数据库三字段均不改变 |
| 非整数 | 空字符串、浮点、非数字、null | 400 |
| 旧值迁移 | 仅旧值 `70` | GET/迁移结果为 `56/70/84` |
| appearance 一致性 | 同一组三字段分别走普通与 structured API | 保存、读取和错误行为一致 |
| 无重启副作用 | 只更新透明度 | 不标记 MSF、MosDNS、Mihomo 重启 |

前端纯函数：

- localStorage JSON 的完整、缺字段、旧格式和损坏格式解析。
- 旧单值到三档值的迁移计算。
- 三档边界和顺序校验。
- 无效本地值整体回退 `56/70/84`。
- 服务端值覆盖本地值。
- 弹窗打开时建立快照，取消时恢复快照，保存时保留当前值。

若仓库没有前端单元测试框架，不为本功能额外引入大型测试依赖；纯函数通过 TypeScript、构建和浏览器流程验证。若实施时已有轻量测试基础，则为 `content-plate-opacity.ts` 补直接单元测试。

### 11.2 计算样式测试

对三种 tone 断言：

- 同主题下 RGB 基色一致。
- 默认 alpha 分别为约 0.56、0.70、0.84。
- `backdrop-filter` 为 `none`。
- 每档独立生效，未拖动的档位计算样式不变。
- 三档始终满足 `subtle <= regular <= strong`。
- 取消编辑后计算样式恢复为打开弹窗前的值。
- 暗色只改变 RGB 基色，不引入彩色 tint。

### 11.3 视觉矩阵

页面：

- 仪表盘
- Mihomo 概览
- 每一批迁移页面至少选一个代表页
- 系统设置外观页

视口：

- 1440 × 900
- 768 × 1024
- 390 × 844

模式：

- 浅色 / 暗色
- dynamic / static / neutral
- full / balanced / reduced
- 默认值、最透明合法组合、最清晰合法组合、三档相等组合
- 弹窗打开、实时预览、取消回滚、保存成功和保存失败状态
- prefers-reduced-transparency 模拟

检查项：

- 文本对比是否足够。
- 底板层级是否可辨但不过度分块。
- 背景是否仍能透过外层玻璃与弱底板。
- 图表面积色是否没有被底板染色。
- 不同页面的相同 tone 是否一致。
- 移动端是否因降级规则突然变成白色或黑色硬板。

浏览器验收流程：

1. 打开 `/settings?tab=appearance`，确认常驻区只有摘要和“自定义编辑”。
2. 将页面滚动到外观页底部再打开弹窗，确认仍相对视口居中且整页蒙层无明暗断层。
3. 分别拖动三根滑轨，检查 `/` 和 `/mihomo/overview` 对应 tone 的实时变化。
4. 记录 computed alpha，点击取消并确认三档全部恢复。
5. 再次打开，修改并保存，刷新页面、重新登录和新开标签页后确认值一致。
6. 模拟 PUT 失败，确认弹窗保留 draft，页面不白屏，取消仍可回滚。
7. 用键盘方向键调整滑轨，测试 Esc、焦点返回和 390×844 内部滚动。

### 11.4 性能与稳定性

- 拖动任意一根滑轨时不触发 API 请求风暴。
- 不重新创建 ECharts 实例。
- 不修改 SVG displacement filter。
- 不引发 React 全站状态更新；更新一档时不重算业务组件树。
- 连续拖动 60 秒无白屏、无未捕获异常。
- Chrome Performance 中没有由滑轨造成的持续长任务。
- VM119 实机检查滑轨交互和页面切换帧率。

量化标准：

- 一次连续拖动过程中，appearance PUT 请求数为 0；一次保存为 1。
- React Profiler 中拖动只提交设置编辑器状态，不反复挂载 `AppearanceTab`、图表或应用级 Provider。
- Chrome Performance 中不得出现由滑轨处理函数直接造成的超过 50ms 长任务，也不得连续 2 秒出现超过 33ms 的输入到绘制延迟。
- 与修改前相同页面、相同主题和相同 VM119 浏览器环境比较，空闲 CPU 不应出现持续增长，内存不应随 60 秒拖动持续爬升。
- 任一量化目标未满足时停止全站迁移，先提交性能分析和最小修正，不以降低玻璃美观为默认解决方案。

### 11.5 基础验证命令

```bash
go test ./...
cd web && npm run check
git diff --check
```

Agent 在交付说明中必须逐项报告三条命令的结果、浏览器验证页面、VM119 部署版本/提交号，以及未执行项目和原因；不能只写“测试通过”。

## 12. 提交与部署建议

建议拆分为可回滚的小提交：

1. `refactor(ui): add semantic content plate tokens`
2. `feat(settings): add custom content plate opacity editor`
3. `refactor(dashboard): adopt semantic content plates`
4. `refactor(mihomo): adopt semantic overview plates`
5. 后续按页面域分别提交迁移
6. `chore(ui): enforce content plate audit`

每个阶段先部署到 VM119 检查，再继续扩大迁移范围。不要把 Token、设置后端和全站页面迁移压在一个不可回滚提交里。

## 13. 回滚策略

- Token 阶段保留 `--gary-solid-fill` 兼容别名，回滚组件无需恢复所有页面。
- 用户设置删除或无效时自动回退 `56/70/84`。
- 如果编辑弹窗出现稳定性问题，可以暂时隐藏“自定义编辑”入口，保留已经稳定的三档默认 Token。
- 页面迁移按域提交，可单独回滚某一页面而不撤销设计系统。
- 服务端字段存储在通用 settings 表，无需数据库 schema 回滚。

## 14. 风险与控制

| 风险 | 控制措施 |
|---|---|
| 自定义值过低导致文字不清 | 为三档设置独立安全范围；密集内容仍由 strong 承担；可访问性模式强制提高最终不透明度 |
| 自定义值过高重新变成白板/黑板 | 三档最高限制为 80% / 90% / 96%，恢复默认随时可用 |
| 三档顺序颠倒导致语义层级反转 | UI 动态边界、前端解析校验和服务端保存校验三层保护 |
| 多变量拖动导致重绘卡顿 | RAF 节流、每帧只批量写必要 CSS 变量、保存与预览分离 |
| 旧 CSS `!important` 覆盖新 tone | 分批缩小 legacy selector；computed-style 自动检查 |
| 机械替换破坏选中态和状态色 | 先做语义清单，不对 `bg-muted` 进行全局替换 |
| 本地设置与服务器设置不一致 | 服务端登录后为准、同步 localStorage、监听 storage 事件 |
| reduced 模式层级消失 | 为三档设置不同的最小值，不再全部强制成同一强底板 |

## 15. 完成定义

以下条件全部满足才算完成：

- [ ] 三档语义 Token 与 `SolidPlate tone` 已稳定。
- [ ] 外观设置显示三档摘要和“自定义编辑”按钮，点击后弹出三根滑轨。
- [ ] `subtle / regular / strong` 三档值可以独立保存、刷新恢复和跨标签页同步。
- [ ] 弹窗打开无视觉跳变，取消能恢复编辑前状态，保存后摘要和值保持一致。
- [ ] 自定义设置不会突破安全范围或颠倒三档语义顺序。
- [ ] 设置能在刷新、重新登录和新标签页中保持一致。
- [ ] appearance API 和 structured settings 均有边界验证。
- [ ] 仪表盘与 Mihomo 概览成为规范示范页。
- [ ] 主要业务页面完成语义迁移。
- [ ] 旧页面兼容选择器已显著缩小或删除。
- [ ] 同 tone 的计算样式跨页面一致。
- [ ] 浅色、暗色、移动端与无障碍模式全部通过。
- [ ] 滑轨压力测试无白屏、无控制台错误、无明显帧率下降。
- [ ] VM119 实机视觉验收通过。
- [ ] 审计脚本进入 CI，防止新增任意内容底板背景。

## 16. 推荐执行边界

第一轮实施建议只完成阶段 0–3：

1. 建立 Token 与组件规范。
2. 增加“自定义编辑”弹窗和三档独立滑轨，并完成兼容迁移和稳定性保护。
3. 将仪表盘和 Mihomo 概览迁移为示范页。
4. 部署 VM119 验收三档层级与性能。

用户确认视觉方向后，再进入阶段 4 的全站迁移。这样既能尽早建立标准，又避免一次性修改所有页面带来的视觉和回归风险。
