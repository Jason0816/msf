# Gary Liquid Glass UI 实施验证

验证日期：2026-08-02  
分支：`codex/gary-liquidglass-full-ui`

## 已实施范围

- Graphite Silk / Pearl Aura 连续场景背景。
- UltraThin、Regular、Thick、SolidPlate 四级材质。
- Header、Sidebar、MobileNav、FAB 和应用内容容器。
- Dashboard 与 MosDNS 概述样板页。
- 全站兼容材质层，覆盖 MosDNS、Mihomo、系统、进程、用户、日志、配置和设置路由。
- 登录页与初始化流程共用场景和 Thick 登录/步骤表面。
- 外观设置新增动态、静态、纯净中性场景，以及完整、平衡、减少效果三档质量。
- 移动端 Thick 卡关闭独立 backdrop blur，保留透明 K 值、边缘和阴影；背景静态化。
- 修复 MosDNS 查询趋势 SVG 依赖固有宽高比而溢出卡片的问题。

## 自动化与浏览器检查

### 构建

- `npm run typecheck`：通过。
- `npm run build`：通过。
- 仅保留项目已有的 Vite 大 chunk 警告。

### 路由 smoke

桌面检查 22 个受保护路由：全部 HTTP 200、无白屏、无横向页面溢出。  
移动端检查 15 个重点路由：全部有页面内容、无横向页面溢出。  
浏览器 Console：0 error。

### 外观设置稳定性

连续执行 20 轮主题、场景、质量切换后：

- 页面标题仍为“系统设置”。
- 页面内容正常存在，无白屏。
- 最终状态正确恢复为 `scene=dynamic`、`quality=full`。
- Console 0 error。

### 玻璃层预算

桌面首屏计算得到：

- Dashboard：Header 2 + Sidebar 1 + Thick 数据卡 5 = 8 个 backdrop surface；FAB 使用无 backdrop 的稳定玻璃表面。
- MosDNS 概述：首屏 8 个 backdrop surface。
- 设置外观页：首屏 7 个 backdrop surface。

移动端 Thick 卡和 FAB 不创建 backdrop surface；可见 blur 由 Header 工具组和共享 MobileNav 承担，避免每张数据卡单独晋升合成层。

### MosDNS 查询趋势

修复后查询趋势绘图区：

- 卡片：`731.3×300px`。
- 绘图区：`695.3×118px`。
- 绘图区底边距卡片底边 `42px`，无溢出。
- Sidebar 折叠、视口 resize、主题切换时，绘图区相对卡片的 `x/y` 保持不变。

## 仍然保留的降级策略

- `prefers-reduced-motion`：停止场景运动。
- `prefers-reduced-transparency`：使用高 K 值 SolidPlate 风格。
- 平衡档：静态场景并降低 blur。
- 减少效果档：关闭 backdrop blur。
- SVG 折射未通过门禁，因此不进入生产表面。

