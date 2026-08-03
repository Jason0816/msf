# IPv6 后续缺陷修复与完整验证实施计划

> 状态：`IMPLEMENTED AND VERIFIED`
>
> 计划日期：2026-08-03
>
> 前置提交：`7addca9 fix: complete IPv6 and MosDNS configuration flow`
>
> 关联文档：[`ipv6-mosdns-completion-plan.md`](./ipv6-mosdns-completion-plan.md)

## 1. 目标与发布结论

本计划用于完成上一轮实现后在本机浏览器和 VM 119 实测中发现的四项缺陷，并补齐 MosDNS 协议优先级的端到端行为验收。

本轮必须完成：

1. Mihomo FakeIP cache controller 不支持热清理时，自动进入安全的停服缓存重建回退，不再因 HTTP 404 永久阻止 FakeIPv6 网段切换。
2. IPv6 关闭后，完整删除 MSF 托管的 IPv6 fwmark rule 和 table 100 local route，不留下 `local default dev lo`。
3. generated/custom 模式下的 partial save 只更新请求中明确提交的字段，禁止 IPv6 更新清空订阅或手工节点。
4. 修复系统设置摘要中 IPv6 关闭状态的错误文案，并在 Setup 与系统管理页面准确解释 IPv6 主开关的联动范围和 MosDNS 独立策略。
5. 完成自动、IPv4 优先、IPv6 优先三种模式下 A/AAAA 的真实端到端验证。
6. 重新执行本机 UI → API → 配置文件闭环和 VM 119 全状态矩阵。

以下任一情况存在时，不得宣布本轮发布通过：

- 自定义 FakeIPv6 网段仍返回 `fake_ip_cache_flush_failed`。
- IPv6 关闭后 `ip -6 route show table 100` 仍存在 MSF 托管 route。
- partial save 改变未提交的订阅、节点、FakeIP 网段或其他初始化字段。
- UI 把 IPv6 主开关描述为操作系统 IPv6 开关或 MosDNS AAAA 开关。
- 优先级仅验证开关互斥，没有验证真实 A/AAAA 结果。

## 2. 权威状态与术语

### 2.1 IPv6 主开关

系统设置和 Setup 中的 IPv6 主开关绑定数据库字段 `enable_ipv6`。

它是 MSF/Mihomo IPv6 数据面的总开关，联动：

- Mihomo 顶层 `ipv6: true/false`。
- Mihomo `dns.ipv6: true/false`。
- Mihomo `dns.fake-ip-range6` 对应的 FakeIPv6 生产能力。
- MosDNS 对 FakeIPv6 前缀的分类，但不直接等价于 MosDNS 的 AAAA 屏蔽策略。
- `network.yaml` 中 IPv6 数据面状态。
- nftables IPv6 set、redirect、TProxy 和 FakeIPv6 捕获规则。
- Linux IPv6 fwmark rule 和 table 100 local route。
- Mihomo TUN IPv6 `route-address`。
- Docker host-tun 的 IPv6 FakeIP route。

该开关不会：

- 关闭 Linux、macOS、Docker 宿主机或家庭路由器的原生 IPv6。
- 关闭 RA、DHCPv6、Prefix Delegation 或运营商 IPv6。
- 自动阻止 MosDNS 返回真实 AAAA。
- 自动修改 MosDNS 的 `switch6`、`switch8` 或 `switch10`。

关闭主开关时：

- `fake_ip_range_v6` 继续保存，作为下次开启时使用的预配置值。
- Mihomo 不生成 FakeIPv6，也不通过透明代理接管 IPv6 FakeIP 流量。
- MosDNS 若未开启“阻止 AAAA”，仍可向客户端返回真实 AAAA；客户端可能直接访问 IPv6 并绕过 Mihomo。

### 2.2 MosDNS 阻止 AAAA

MosDNS `switch6` 是独立 DNS 策略：

- `switch6=A`：阻止客户端主入口 `:53` 的 AAAA，返回 NOERROR/NODATA。
- `switch6=B`：允许客户端主入口返回 AAAA。
- 该策略只约束 `:53` 及其 requery，不应错误作用于 `:3333`、`:4444`、`:6666`、`:8888` 等内部入口。
- 它不得改写 `enable_ipv6`。

### 2.3 MosDNS 协议优先级

UI 单选值与底层开关映射：

| UI | `switch8` | `switch10` | 期望语义 |
|---|---|---|---|
| 自动 | B | B | 不主动抑制 A 或 AAAA |
| IPv4 优先 | A | B | 双栈域名存在 A 时，AAAA 查询返回 NODATA；v6-only 域名仍可返回 AAAA |
| IPv6 优先 | B | A | 双栈域名存在 AAAA 时，A 查询返回 NODATA；v4-only 域名仍可返回 A |

优先级只控制客户端 DNS 结果选择：

- 不得开启或关闭 Mihomo IPv6 数据面。
- 不得安装或删除 NFT/TUN/policy route。
- 不得改写 `enable_ipv6` 或 FakeIPv6 网段。
- “阻止 AAAA”优先级高于“IPv6 优先”；`switch6=A` 时客户端 `:53` 仍必须阻止 AAAA。

## 3. 已复现问题与根因范围

### 3.1 FakeIPv6 网段切换被 cache flush 404 阻止

实测：

- `PUT /api/v1/setup/config` 修改 `fake_ip_range_v6`。
- MosDNS cache 阶段完成后，Mihomo controller 的 `DELETE /cache/fakeip` 返回 404。
- API 返回 HTTP 409、错误码 `fake_ip_cache_flush_failed`，旧网段保持不变。

当前代码：

- `internal/server/fakeip_cache.go`
- `internal/server/handlers_setup.go`
- `internal/server/handlers_settings_structured.go`

当前缺陷：

- 只支持单一 controller 请求。
- 404/405 没有被识别为“当前 Mihomo 不支持热清理”。
- 没有停止 Mihomo、隔离持久化 FakeIP cache、重启并探测的回退路径。
- cache 清理发生在配置生成和替换之前，难以纳入统一回滚。

### 3.2 IPv6 route 关闭后残留

实测：

- IPv6 关闭后，IPv6 fwmark rule 已删除。
- `ip -6 route show table 100` 仍存在 `local default dev lo`。

当前代码：

- `internal/server/handlers_system.go`

根因：

- `applyNFT` 只调用 `policyRouteRuleDeleteCommands()`。
- 旧 v4/v6 local route 只在完整 clear 路径删除，正常的 enable → disable reconcile 没有删除旧 route。

### 3.3 partial save 可能清空 provider 字段

实测：

- generated 模式下只提交 IPv6 字段。
- mutation 读取 `latestSetupConfigForSettings()`。
- 该函数把数据库值替换为从当前有效 Mihomo YAML 反解析得到的 provider 字段。
- 当当前 YAML 未包含数据库里的原订阅时，新快照写入空订阅。

当前代码：

- `internal/server/handlers_setup.go`
- `internal/server/handlers_settings_structured.go`
- `internal/server/mihomo_provider_sync.go`

根因：

- “用于 UI 展示的 effective 值”和“用于 partial mutation 的数据库权威值”复用了同一个读取函数。
- 请求未提交 provider 字段时，错误地保留了 effective overlay，而不是 raw database snapshot。

### 3.4 UI 摘要与说明不准确

当前错误：

- `SettingsClient.tsx` 在 IPv6 关闭时显示 `DNS自动设置`。
- Setup 和系统管理只写“代理核心支持 IPv6”，没有解释 NFT、policy route、FakeIPv6、TUN/Docker route 联动。
- 没有明确说明主开关不会关闭 MosDNS AAAA。
- Setup 仍显示“Fake-IP 网段修改功能正在开发中”，与当前已支持编辑的实现冲突。

当前代码：

- `web/src/app/settings/SettingsClient.tsx`
- `web/src/pages/SetupPage.tsx`

## 4. 阶段 A：FakeIP cache 热清理与安全重建回退

### A1. 重构 cache 清理返回模型

将 `clearFakeIPCaches()` 拆分为可观察的阶段函数，并返回结构化结果：

```go
type FakeIPCacheInvalidationReport struct {
    MosDNSMethod      string
    MihomoMethod      string
    MihomoFallback   bool
    FilesQuarantined []string
    ServicesRestarted []string
}
```

建议函数边界：

- `flushMosDNSFakeIPCache(ctx)`
- `flushMihomoFakeIPCacheOnline(ctx)`
- `rebuildMihomoFakeIPCache(ctx, oldCfg, newCfg)`
- `invalidateFakeIPCaches(ctx, oldCfg, newCfg)`

所有函数必须支持依赖注入或可替换的 command/controller 调用，以便单元测试覆盖 200、404、连接失败和重启失败。

### A2. Mihomo controller 能力探测

按当前随包 Mihomo 版本确认并测试 controller API，至少尝试：

1. `POST /cache/fakeip/flush`。
2. 兼容旧实现的 `DELETE /cache/fakeip`。

处理规则：

- 2xx：热清理成功，不进入停服回退。
- 404/405：视为 endpoint unsupported，进入停服重建回退。
- 401/403：视为 controller secret/权限错误，不得删除本地 cache，应返回明确错误。
- 连接失败/超时：如果 Mihomo 状态显示运行中，先记录 controller 异常，再进入受控停服回退。
- 其他 5xx：进入回退，但在结果中保留原始状态和响应。

禁止把“404 endpoint unsupported”直接包装成最终 `fake_ip_cache_flush_failed`。

### A3. Mihomo 持久 cache 重建

当在线清理不支持时：

1. 记录 Mihomo 原始 desired/running 状态。
2. 对新配置完成临时生成和校验，但尚不提交最终成功。
3. 通过 `ServiceManager.Stop` 停止 Mihomo，等待进程退出和 `:6666/:9090` 释放。
4. 只处理明确属于 Mihomo 的持久化缓存文件：
   - 优先确认并处理 `configs/mihomo/cache.db`。
   - 如版本使用其他固定 cache 路径，加入显式 allowlist；禁止递归删除整个 `configs/mihomo`。
5. 使用 rename/move 隔离到带 `apply_id` 的恢复目录，不直接不可恢复删除。
6. 写入并激活新配置。
7. 按原 desired 状态启动 Mihomo。
8. 探测 controller `/version`、DNS `:6666` 和新 FakeIPv6 前缀。
9. 确认不再返回旧前缀后才清理隔离 cache；保留到 Apply 完成也可以。
10. 若启动或探测失败，恢复旧配置、旧 cache 和原服务状态。

### A4. MosDNS cache 回退

现有 `/cache/flush`、`/api/cache/flush`、`/plugins/cache/flush` 均不支持时：

1. 停止 MosDNS。
2. 隔离 `configs/mosdns/cache` 下明确命名的 cache/dump 文件。
3. 保留规则、日志、域名列表和用户配置。
4. 启动 MosDNS 并探测 `:53/:3333/:4444/:8888/:9099`。
5. 失败时恢复缓存文件和原服务状态。

### A5. 调整 Apply 顺序

禁止在任何新配置尚未校验时先清空 cache。

建议顺序：

1. 读取旧数据库、配置、cache 文件和服务状态快照。
2. 规范化新 FakeIP prefix。
3. 在临时目录生成并校验全部配置。
4. 验证 custom/generated 一致性。
5. 原子替换受管文件并写入可回滚数据库快照。
6. 执行在线 cache flush；不支持时执行停服重建。
7. reconcile 网络规则和 route。
8. 启动/重启服务。
9. 探测新网段，确认无旧网段答案。
10. 成功提交或恢复完整旧状态。

### A6. 自动化测试

新增测试至少覆盖：

- controller `POST /cache/fakeip/flush` 2xx，禁止进入 fallback。
- POST 404、DELETE 404，进入停服重建并成功。
- controller 401/403，不移动 cache 文件。
- fallback 中 cache 文件使用 rename 隔离，不删除 provider/config。
- Mihomo 重启失败时恢复旧 cache 和旧配置。
- 新前缀启用后 `:6666` 不再返回旧前缀。
- MosDNS flush endpoints 均不支持时进入停服文件回退。
- cache 回退失败时 API 不返回成功。

## 5. 阶段 B：policy route 完整 reconcile

### B1. 拆分 route 删除命令

新增：

- `policyRouteRuleDeleteCommands()`：删除 v4/v6 fwmark rules。
- `policyRouteRouteDeleteCommands()`：精确删除 MSF 托管的 v4/v6 local default routes。
- `policyRouteInstallCommands(enableIPv6)`：安装 v4，并仅在开启时安装 v6。
- `policyRouteReconcileCommands(enableIPv6)`：删除 rules → 删除 routes → 安装目标状态。

删除目标保持精确：

```text
ip route del local 0.0.0.0/0 dev lo table 100
ip -6 route del local ::/0 dev lo table 100
```

不要使用无条件 `ip route flush table 100` 删除用户可能放入同一表的其他 route，除非产品明确声明 table 100 完全由 MSF 独占。

### B2. 修改 `applyNFT`

每次应用 NFT 前必须：

1. 删除旧 MSF nft table。
2. 忽略不存在错误，删除旧 v4/v6 fwmark rules。
3. 忽略不存在错误，删除旧 v4/v6 local routes。
4. 加载新 NFT。
5. 安装 v4 rule/route。
6. `enable_ipv6=true` 时安装 v6 rule/route；false 时保持已卸载。

该流程必须幂等，多次执行结果一致。

### B3. 状态探测

IPv6 关闭的 verified 条件：

- `ip -6 rule show` 不含 `fwmark 0x1 lookup 100`。
- `ip -6 route show table 100` 不含 MSF local default route。
- nft table 不含 `ip6`、`fake_ipv6`、`dns_ipv6` 和当前 v6 FakeIP prefix。

IPv6 开启的 verified 条件：

- fwmark v6 rule 恰好一条。
- table 100 v6 local route 恰好一条。
- NFT 当前 prefix 恰好一处有效 set，不含旧 prefix。

### B4. 自动化测试

- disabled reconcile 命令包含 v6 route delete，且不包含 v6 route add。
- enabled reconcile 先 delete 后 add。
- enabled → disabled、disabled → enabled、enabled → enabled 均幂等。
- route delete 返回“not found”不导致 Apply 失败。
- 真正的 install command 失败必须触发回滚。
- 更新 `TestPolicyRouteCommandsAreIdempotent`，补充 route 清理断言。

## 6. 阶段 C：partial save 权威数据修复

### C1. 分离读取用途

明确建立两个入口：

1. `latestSetupConfigForDisplay()`
   - 可使用 `applyMihomoProviderFieldsFromEffectiveConfig`。
   - 仅供 GET/UI 展示当前 effective provider 状态。
2. `latestSetupConfigForMutation()`
   - 只读取 `system_setups` 最新数据库快照。
   - 禁止用运行 YAML 覆盖未提交字段。

`handleSetupPutConfig` 和 structured settings mutation 必须使用 raw/mutation 入口。

### C2. 字段语义

- 字段未出现在 JSON 中：保留 raw database snapshot。
- 字段明确提交空字符串：按该字段允许的业务语义执行清空。
- 字段明确提交非空值：规范化并保存新值。
- provider 页面修改配置时，继续通过专用同步函数更新数据库，使 raw snapshot 与用户主动修改保持一致。

必须同时保护：

- `subscription_urls`
- `mihomo_proxies`
- `fake_ip_range_v4`
- `fake_ip_range_v6`
- `enable_ipv6`
- GitHub proxy/accelerator 字段
- DNS、接口、代理模式等初始化字段

### C3. structured settings

审计 `/settings/structured`：

- GET 可以返回 effective display 状态。
- PUT/PATCH 合并时必须以 raw database snapshot 为基础。
- 网络 Apply 失败时删除新 snapshot，恢复旧 raw snapshot 和运行配置。

### C4. 自动化测试

新增以下回归测试：

1. 数据库有订阅，generated YAML 无 provider；只提交 `enable_ipv6`，订阅不得变空。
2. 数据库有手工节点，active custom YAML 无手工节点；只提交 FakeIPv6 prefix，手工节点不得变空。
3. 显式提交 `subscription_urls: ""` 时允许清空，并同步生成配置。
4. 只提交 timezone、IPv6、FakeIP 任一字段，其他所有字段 byte-for-byte 保持。
5. custom 冲突 409 时数据库和 provider 文件均不变化。
6. structured settings 网络字段保存失败时 provider 字段回滚。

## 7. 阶段 D：UI 文案、摘要和组合提示

### D1. 修复摘要值

`SettingsClient.tsx`：

```tsx
<PlainInfo label="启用 IPv6" value={config.ipv6 ? "已启用" : "已禁用"} />
```

关闭时不得再显示“DNS自动设置”。

### D2. 调整控件名称

Setup 与系统管理建议使用：

```text
启用 IPv6 数据面
```

避免用户误认为这是 Linux 或家庭路由器的 IPv6 总开关。

### D3. 完整说明文案

Setup 和“系统设置 → 系统管理 → 初始化配置”两处使用同一段共享文案或常量，内容至少包含：

> 此开关控制 MSF/Mihomo 的 IPv6 数据面，不会关闭操作系统、运营商或家庭路由器的原生 IPv6，也不等同于 MosDNS 的“阻止 AAAA”。开启后会联动 Mihomo `ipv6`、`dns.ipv6`、FakeIPv6、nftables、IPv6 policy route 以及 TUN/Docker IPv6 路由；关闭后保留 IPv6 FakeIP 网段配置，但卸载上述 IPv6 代理数据面。若 MosDNS 未开启“阻止 AAAA”，关闭本开关后客户端仍可能获得真实 AAAA 并通过原生 IPv6 直连，可能绕过 Mihomo。

建议以可扫描的说明框展示：

- **开启联动**：Mihomo IPv6、DNS IPv6、FakeIPv6、NFT、policy route、TUN/Docker route。
- **关闭效果**：停止 FakeIPv6 生产和 IPv6 透明代理接管；保留网段配置。
- **不受影响**：操作系统/路由器原生 IPv6、MosDNS AAAA 开关。
- **风险提示**：主开关关闭但允许 AAAA 时，真实 IPv6 可能直连绕过代理。
- **操作入口**：AAAA 屏蔽与协议优先级位于“MosDNS → 系统功能 → 解析策略”。

### D4. FakeIP 文案

删除 Setup 中：

```text
Fake-IP 网段修改功能正在开发中，当前仅支持查看默认配置
```

替换为：

```text
修改网段会清理 MosDNS/Mihomo FakeIP 缓存并短暂重启相关服务。IPv6 关闭时网段仅保存、不激活；请确保网段与 LAN、其他代理软件和静态路由不冲突。
```

### D5. MosDNS 优先级说明

把当前“只控制 DNS 结果排序”扩展为明确行为：

- 自动：同时返回上游实际存在的 A/AAAA。
- IPv4 优先：双栈域名存在 A 时抑制 AAAA；v6-only 不受影响。
- IPv6 优先：双栈域名存在 AAAA 时抑制 A；v4-only 不受影响。
- 不会改变 IPv6 主开关或透明代理数据面。

### D6. 前端测试

- IPv6 false 摘要显示“已禁用”。
- 两处页面出现完整联动说明和 MosDNS 独立策略说明。
- IPv6 false 时 FakeIPv6 网段显示“已保存、未激活”。
- UI 开启/关闭后刷新，状态与后端一致。
- 自定义 prefix 的 masked canonical 值刷新后显示正确。
- 优先级三个 radio 的 `aria-checked` 与 switch 状态一致。
- pending 时禁止重复提交，错误时恢复原 UI 状态。

## 8. 阶段 E：协议优先级端到端验证与必要修正

### E1. 使用确定性 DNS fixture

公共 DNS 只能作为补充，不作为唯一断言来源。建立临时可控上游，提供：

| 域名 | A | AAAA | 用途 |
|---|---|---|---|
| `dual.test` | `192.0.2.10` | `2001:db8::10` | 双栈优先级 |
| `v4-only.test` | `192.0.2.20` | NODATA | IPv6 优先回退 |
| `v6-only.test` | NODATA | `2001:db8::20` | IPv4 优先回退 |
| `cname-dual.test` | CNAME → `dual.test` | CNAME → `dual.test` | CNAME 分支 |
| `no-address.test` | NODATA | NODATA | 稳定空响应 |

fixture 可在集成测试或 VM `/tmp/msm-free-test` 中启动，测试结束必须停止。

### E2. 基本优先级矩阵

在 `switch6=B` 下测试客户端 `:53`：

| 模式 | `dual.test A` | `dual.test AAAA` | `v4-only.test A` | `v6-only.test AAAA` |
|---|---|---|---|---|
| 自动 | 返回 A | 返回 AAAA | 返回 A | 返回 AAAA |
| IPv4 优先 | 返回 A | NODATA | 返回 A | 返回 AAAA |
| IPv6 优先 | NODATA | 返回 AAAA | 返回 A | 返回 AAAA |

同时验证 UDP 与 TCP。

### E3. 与 IPv6 主开关组合

#### 主开关关闭

- 自动：允许真实 A/AAAA，AAAA 必须绕过 FakeIP 链路。
- IPv4 优先：双栈 AAAA 被抑制，但 v6-only AAAA 仍可返回真实值。
- IPv6 优先：双栈 A 被抑制，AAAA 可返回真实值；不得启动 Mihomo FakeIPv6 数据面。
- 三种模式下 `:6666` 均不得返回 FakeIPv6。
- NFT、policy route、TUN/Docker IPv6 route 始终卸载。

#### 主开关开启

- 自动：按分流规则返回真实 IPv6 或当前 FakeIPv6 prefix。
- IPv4 优先：客户端双栈 AAAA 被抑制；Mihomo 内部 `:6666` 仍具备 FakeIPv6 能力。
- IPv6 优先：客户端双栈 A 被抑制；AAAA 按分流规则返回真实/FakeIPv6。
- 三种模式都不得改变 `enable_ipv6`、NFT 和 route 状态。

### E4. 与阻止 AAAA 组合

当 `switch6=A`：

- 自动、IPv4 优先、IPv6 优先下，客户端 `:53 AAAA` 均为 NODATA。
- `:3333/:4444/:8888` 保持其独立解析行为。
- 主开关开启时 `:6666` 仍能返回 FakeIPv6；主开关关闭时 `:6666` 为空。

### E5. 审计 MosDNS 执行顺序

当前 IPv6 关闭 real-AAAA bypass 使用 `exit`，可能在 priority 插件之前短路。

必须检查并确保顺序为：

1. 请求过滤与 `switch6` AAAA 阻断。
2. 协议优先级 `prefer_ipv4/prefer_ipv6`。
3. IPv6 主开关关闭时的 real-AAAA bypass。
4. cache、分流、FakeIP classifier。

若 bypass 先于 priority，调整模板插入位置，保证优先级对真实 AAAA 仍有定义好的效果，同时禁止其重新进入 FakeIP 链路。

### E6. 优先级状态原子性

当前前端使用两个并发请求保存 `switch8/switch10`。改为：

- 后端提供单次原子保存 `priority=auto|ipv4|ipv6`，或
- 现有兼容接口一次提交两个开关，由后端事务性设置互斥状态。

禁止两个并行请求因时序产生短暂或最终双开/错误状态。

保留旧接口兼容，但 WebUI 使用新的单请求语义。

### E7. 自动化测试

- 后端优先级枚举校验，非法值返回 400。
- 单次请求产生唯一有效 switch 组合。
- 三种模式刷新后 UI 状态不漂移。
- fixture 下 A/AAAA 行为符合矩阵。
- `switch6` 优先级高于协议优先级。
- priority 变化不改变 `enable_ipv6`、FakeIP prefix、NFT/policy route desired state。

## 9. 阶段 F：本机完整验证

### F1. 后端

```bash
go test ./...
```

重点测试：

- cache online/fallback/rollback。
- route reconcile。
- raw partial merge。
- priority 原子 API。
- generated/custom 两种模式。

### F2. 前端

```bash
cd web
npm run check
```

### F3. Playwright UI 闭环

使用隔离 data dir：

1. 初始化测试账号。
2. 系统管理页开启 IPv6、填写非 masked prefix。
3. 保存并刷新，确认 canonical prefix。
4. 关闭 IPv6，确认摘要“已禁用”和“网段已保存、未激活”。
5. 核对 Mihomo、MosDNS、network 和 NFT 生成文件。
6. 修改优先级三种模式，核对单次 API 请求和 switch 文件。
7. 模拟 custom 冲突、cache fallback 和 route 失败，核对 UI 错误与状态恢复。

## 10. 阶段 G：VM 119 完整验收

### G1. 准备

遵循 `msm-119-vm` 操作规范：

1. 运行本地 Go/前端门禁。
2. 构建 Linux amd64 测试二进制。
3. 上传到 `/tmp/msm-free-test`。
4. 备份：
   - `/usr/local/bin/msf`
   - `/opt/msf/database`
   - `/opt/msf/configs`
   - nft ruleset
   - v4/v6 policy rules
   - table 100 v4/v6 routes
   - systemd desired/running 状态
5. 记录初始 custom/generated、IPv6、switch6、priority、FakeIP prefix。

### G2. VM 场景

必须按顺序执行：

1. custom 模式 IPv6 冲突返回 409，数据库和文件不变。
2. generated 模式，IPv6 关闭、AAAA 允许、自动优先级。
3. IPv6 关闭、AAAA 阻止。
4. IPv6 关闭，自动/IPv4/IPv6 三种优先级。
5. IPv6 开启、默认 prefix、AAAA 允许。
6. IPv6 开启，自动/IPv4/IPv6 三种优先级。
7. IPv6 开启、AAAA 阻止，内部入口保持独立。
8. 修改为非默认 v6 prefix，controller 404 时进入 cache fallback 并成功。
9. 验证新 prefix 出现在 Mihomo/MosDNS/network/NFT/route，旧 prefix 完全消失。
10. 再次关闭 IPv6，验证 NFT、fwmark 和 table 100 v6 route 全部卸载。
11. partial save 只提交 IPv6 字段，订阅和手工节点保持。
12. 错误地址族、非法 CIDR 返回 400 且无副作用。
13. 模拟 Mihomo 重启失败，验证 cache/config/database/network 回滚。
14. 重启 MSF，验证状态不漂移。

### G3. DNS 端口

每个场景至少检查：

- `:53` UDP/TCP：客户端主入口。
- `:3333`：国外真实解析入口。
- `:4444`：国外 ECS 入口。
- `:6666`：Mihomo FakeIP DNS。
- `:8888`：内部专用入口。

同时查询：

- fixture dual/v4-only/v6-only/CNAME/NODATA。
- 公共补充域名：Google、Cloudflare、国内域名和无 AAAA 域名。
- A 和 AAAA，不能只测 AAAA。

### G4. 通过条件

- 自定义 prefix 切换成功，且旧 prefix 不再从任何入口返回。
- cache fallback 有明确日志和结果，不出现静默删除用户文件。
- IPv6 关闭后 v6 NFT refs、fwmark rule、table 100 route 均为 0。
- partial save 后订阅/节点与测试前一致。
- priority 三种模式符合确定性 fixture 矩阵。
- UI、API、数据库、文件、运行态、DNS 结果一致。
- 回滚演练成功一次。
- 测试结束恢复用户原始 custom/generated、IPv6、switch 和 provider 状态。

## 11. 回滚设计

### 11.1 Apply 内部回滚

快照必须覆盖：

- 最新 raw setup database snapshot。
- 受管配置文件。
- custom/generated mode 和 active custom path。
- Mihomo/MosDNS running/desired state。
- 被隔离的 cache 文件。
- nft table。
- v4/v6 rules 和 table 100 routes。

触发条件：

- cache flush/rebuild 失败。
- 服务启动失败。
- DNS 或 controller 探测失败。
- 新旧 prefix 同时出现。
- route/NFT 状态与目标不一致。
- provider 字段与旧 raw snapshot 意外变化。

### 11.2 VM 部署回滚

部署脚本必须在健康检查失败时恢复：

- 旧二进制。
- 数据库目录。
- 配置目录。
- MSF 托管 NFT/rule/routes。
- 原 service 状态。

不得删除 `/opt/msf/data/binaries`、用户订阅、custom YAML 或家庭路由配置。

## 12. 建议提交拆分

### Commit 1：FakeIP cache fallback

- `fakeip_cache.go`
- controller capability probe
- cache quarantine/rebuild/rollback
- 单元测试

### Commit 2：policy route reconcile

- route delete/reconcile commands
- applyNFT/clear/rollback 一致性
- Linux command tests

### Commit 3：partial mutation authority

- display/raw 读取分离
- setup/structured mutation 修复
- provider 保留回归测试

### Commit 4：UI 文案与状态

- 摘要“已禁用”
- Setup/系统管理共享 IPv6 说明
- 删除过期“开发中”提示
- 前端测试

### Commit 5：priority 原子 API 与端到端矩阵

- 单值 priority API
- MosDNS 顺序审计/必要修正
- fixture 集成测试
- Playwright 与 VM 验收脚本

提交可合并为一个最终 commit，但实施和 review 应保持上述逻辑边界。

## 13. 完成定义

本计划完成必须同时满足：

- FakeIPv6 prefix 可在当前 VM Mihomo 版本上成功切换，即使 controller cache endpoint 返回 404。
- cache fallback 可恢复、可观察，不删除非 cache 用户数据。
- IPv6 关闭后不存在 MSF 托管的 IPv6 NFT、fwmark rule 或 table 100 route。
- partial save 永不改变未提交 provider 和初始化字段。
- UI 正确显示“已启用/已禁用”，并清晰说明主开关联动范围和 MosDNS 独立策略。
- 自动/IPv4/IPv6 优先级的真实 A/AAAA 行为通过确定性 fixture 和 VM 测试。
- `go test ./...`、`npm run check`、Playwright 和 VM 119 全部通过。
- 测试机恢复到测试前状态，无残留测试服务、route、NFT、token 或临时 DNS fixture。

## 14. 实施与验收记录

实施日期：2026-08-03。

已完成并验证：

- Mihomo controller 在线清理支持 `POST /cache/fakeip/flush`；controller 双 404 时会进入受控停服、缓存隔离、服务重建回退，自定义 FakeIPv6 前缀切换成功。
- 模拟 Mihomo 首次重启失败时，API 返回 `fake_ip_cache_flush_failed`，数据库前缀、Mihomo 配置、NFT 和运行中的 FakeIPv6 前缀恢复到旧状态。
- IPv6 关闭后 IPv6 fwmark rule、table 100 local route 和 NFT IPv6 引用均清零。
- Setup 与 structured partial save 使用 raw database snapshot，未提交的订阅、手工节点和 FakeIP 字段保持不变；显式空值仍允许清空。
- MosDNS 优先级改为单次原子 API；客户端 `:53` 通过独立 priority wrapper 执行，避免 aliapi 分流和提前 `exit` 绕过 `prefer_ipv4/prefer_ipv6`。
- 确定性 fixture 下，自动、IPv4 优先、IPv6 优先在 UDP/TCP、双栈、v4-only、v6-only、CNAME 和 NODATA 场景全部符合矩阵。
- `switch6=A` 在三种优先级下均优先阻止客户端 AAAA，`:3333/:4444/:8888` 保持独立；IPv6 数据面开启时 `:6666` 返回当前 FakeIPv6 前缀，关闭时不再返回 FakeIPv6。
- 本机 `go test ./...`、`web/npm run check` 和 Playwright UI → API → 刷新闭环通过。
- VM 119 完成部署验证并恢复测试前的旧二进制、custom 模式、IPv6 关闭、默认前缀、MosDNS 开关和 provider 数据。部署前备份位于 `/tmp/msm-free-test/backup-20260803T185600`，测试后现场保留于 `/tmp/msm-free-test/post-test-20260803T191700`。
