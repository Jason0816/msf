# msf

<p align="center">
  <img src="docs/brand-assets/mizar/motion/msf-mizar-orbit-weave-transparent.webp" alt="MSF Mizar 丝带交织透明动态 Logo" width="320">
</p>

[English README](README.en.md)

[常见问题 FAQ](docs/faq.md)

`msf` 是一个面向 MosDNS + Mihomo 工作流的独立开源管理工具。项目目标是为合法、授权的网络环境提供可自部署、可审计的 DNS 策略解析、流量转发、Mihomo 管理和多平台安装体验；从 v0.4.1 起，WebUI 与项目品牌均采用独立设计。

当前发布版本：`v0.4.2`

> [!IMPORTANT]
> 本项目仅用于网络、DNS、流量转发及开源软件部署与管理相关的技术研究、交流和分享。本项目不提供代理节点、代理订阅、账号或访问凭据，也不提供针对网络监管措施、内容过滤或访问控制的规避教程。使用者必须遵守适用法律法规并自行承担使用本项目产生的风险和责任。下载、部署或使用前，请阅读完整的[免责声明](DISCLAIMER.md)。

> **提示：Cloudflare Redirect CLI 插件为测试功能。** 它用于让“不走代理的客户端”访问用户指定的 Cloudflare 盾站时，返回本机网络实测较快的 Cloudflare CDN IPv4/IPv6。该功能依赖本机网络、运营商路由、Cloudflare Anycast、域名名单质量和 MosDNS 当前配置，不保证一定比原解析更快或更稳定。详细用法见 [Cloudflare Redirect 文档](docs/plugins/cloudflare-redirect.md)。

## 功能概览

- 独立设计的 6 步初始化向导，覆盖管理员账号、系统参数、DNS、IPv6、Fake-IP、流量转发和组件安装配置。
- MosDNS + Mihomo 默认组合，按 mssb 风格生成基于规则集的 DNS 与流量转发链路：MosDNS `:53` 入口，Mihomo DNS `:6666`，Fake-IP `28.0.0.0/8`，TProxy `7896`，Redirect `7877`。
- 支持用户自行提供的第三方配置订阅、手动连接配置、MosDNS 客户端转发模式，以及 Mihomo 连接端点、规则、连接、日志和配置管理页面。
- 支持 Mihomo 自定义配置、CodeMirror YAML 编辑器、组件更新检查、自动下载、更新通知和升级方式配置。
- 支持 MosDNS、Mihomo、Zashboard 本地上传安装；需要离线部署时，可由用户自行准备相应上游组件。
- Linux tarball/systemd、fnOS FPK、Unraid PLG 均支持 nftables 与 TUN；Docker `host-tun` / `macvlan-tun` 正式支持且仅允许 TUN。
- macOS 15–26 提供未签名 Beta 版原生 Universal 2 菜单栏 App、root LaunchDaemon 和 TUN-only 运行时，不提供系统代理模式；首次打开需由用户手动允许。
- Docker 部署必须把宿主机数据目录映射到容器 `/opt/msf`，默认示例使用 `./msf-data:/opt/msf`。

## 使用边界

- 本仓库默认不内置任何代理订阅、节点、账号或访问凭据，也不提供相关网络服务。
- 用户导入的订阅地址、连接信息、规则、配置和外部内容均由用户或相应第三方提供，使用者应自行核验其来源、授权、合法性和安全性。
- 项目维护者不提供以规避法律监管、内容过滤或访问控制为目的的个性化配置、远程部署、故障排查或其他技术协助。
- 项目文档中的 DNS、路由和流量转发说明仅适用于使用者拥有或已获得充分管理授权的网络环境。完整边界与责任说明见[免责声明](DISCLAIMER.md)。

## 架构原理图

<p align="center">
  <img src="docs/png/framework-architecture.svg" alt="msf 旁路由代理实现原理图">
</p>

## 平台支持

| 平台 | 状态 | 安装文档 | 更新/卸载方式 |
|---|---|---|---|
| Linux tarball/systemd | 稳定支持 | [Linux 安装](docs/install/linux.md) | `msf update` / `msf uninstall` |
| fnOS FPK | 支持 | [fnOS FPK 安装](docs/install/fnos-fpk.md) | fnOS / 飞牛应用中心或 FPK 包管理器 |
| Unraid PLG | 稳定支持 | [Unraid PLG 安装](docs/install/unraid-plg.md) | Unraid 插件管理页面 |
| Docker TUN host/macvlan | 支持（仅 TUN） | [Docker TUN 部署](docs/docker.md) | Docker / Compose / Unraid Community Apps |
| macOS 15–26 菜单栏 App | 未签名 Beta（仅 TUN） | [macOS 安装与使用](docs/install/macos.md) | App 内管理员授权安装、修复和卸载后台 |

`msf update` 和 `msf uninstall` 只面向 Linux tarball/systemd 安装。fnOS FPK、Unraid PLG、Docker 请通过各自平台管理器更新或卸载，避免绕过包状态。

## 下载

GitHub Release：

```text
https://github.com/scoltzero/msf/releases/tag/v0.4.2
```

| 资产 | 下载地址 |
|---|---|
| Linux x86_64 | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf-linux-amd64.tar.gz` |
| Linux ARM64 | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf-linux-arm64.tar.gz` |
| fnOS x86 FPK | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf_0.4.2_x86.fpk` |
| fnOS ARM FPK | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf_0.4.2_arm.fpk` |
| Unraid PLG | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf.plg` |
| macOS Universal 2 DMG（未签名 Beta） | `https://github.com/scoltzero/msf/releases/download/v0.4.2/MSF-0.4.2-macos-universal-unsigned.dmg` |
| macOS Universal 2 ZIP（未签名 Beta） | `https://github.com/scoltzero/msf/releases/download/v0.4.2/MSF-0.4.2-macos-universal-unsigned.zip` |

## 快速开始

1. 按你的运行平台选择安装文档：Linux、fnOS、Unraid、Docker 或 macOS。
2. 安装后打开 WebUI，默认地址是 `http://<服务器IP>:7777`。
3. 完成初始化向导。首次初始化会写入系统配置、生成 MosDNS/Mihomo 配置，并保存到数据库。
4. 在你拥有或已获管理授权的主路由上配置 DHCP DNS 和 FakeIP 静态路由，让局域网客户端按自定义策略使用 msf。

合法、授权网络环境中的路由器接入参考：

- [路由器接入总览](docs/guide/zh/router-integration.md)
- [RouterOS（MikroTik）](docs/guide/zh/routeros.md)
- [爱快 iKuai](docs/guide/zh/ikuai.md)
- [OpenWrt](docs/guide/zh/openwrt.md)
- [UniFi（Ubiquiti）](docs/guide/zh/unifi.md)

运行目录、端口和文件结构见 [运行参考](docs/reference/runtime.md)。

## 插件文档

- [Cloudflare Redirect CLI 插件](docs/plugins/cloudflare-redirect.md)：为“不走代理的客户端”把指定 Cloudflare 盾站重定向到本机实测较快的 Cloudflare CDN IPv4/IPv6。

## 开发与发布

本地运行：

```bash
go run ./cmd/msf serve -c ./data -p 7777
```

发布打包流程见 [RELEASING.md](RELEASING.md)。Unraid 打包开发说明见 [packaging/unraid/README.md](packaging/unraid/README.md)。

## 说明

`msf` 不包含 MSM 的闭源后端代码。项目早期曾参考 MSM 的公开管理体验；从 v0.4.1 起，当前 WebUI 和 Mizar 品牌均为独立设计，后端行为继续围绕 mssb 风格的 MosDNS + Mihomo 工作流重新实现。本项目不提供代理订阅、连接凭据或面向特定地区的代理网络服务。

## 鸣谢

感谢这些项目提供参考：

- [`msm9527/msm-wiki`](https://github.com/msm9527/msm-wiki)：作为 MSM 管理体验和功能组织的公开参考。
- [`baozaodetudou/mssb`](https://github.com/baozaodetudou/mssb)：作为 MosDNS + Mihomo 后端工作流的公开参考。
- [`yyysuo/mosdns`](https://github.com/yyysuo/mosdns)：感谢为 MosDNS 功能提供开源支持。
- [`Zephyruso/zashboard`](https://github.com/Zephyruso/zashboard)：感谢为 Mihomo 概览页面提供 UI 借鉴和显示能力参考。
- [Gzh256](https://github.com/Gzh256)：感谢协助测试和验证多个版本。

本项目与 MSM、mssb 上游项目没有隶属关系。

[![认可linux.do](https://ld.xh.do/ld-badge.svg)](https://linux.do/)
