# msf

<p align="center">
  <img src="docs/brand-assets/mizar/motion/msf-mizar-orbit-weave-transparent.webp" alt="MSF Mizar transparent orbit-weave animated logo" width="320">
</p>

[中文 README](README.md)

[FAQ](docs/faq.en.md)

`msf` is an independent open-source management tool for MosDNS + Mihomo workflows. It provides self-hosted, auditable DNS policy resolution, traffic forwarding, Mihomo management, and platform-native installs for lawful, authorized network environments. Starting with v0.4.1, both the WebUI and project identity use an independent design.

Current release: `v0.4.2`

> [!IMPORTANT]
> This project is provided solely for technical research, discussion, and sharing concerning networking, DNS, traffic forwarding, and open-source software deployment and management. It does not provide proxy nodes, subscriptions, accounts, or access credentials, nor does it provide instructions intended to circumvent network regulation, content filtering, or access controls. Users must comply with applicable law and bear the risks and responsibilities arising from their use. Read the full [Disclaimer](DISCLAIMER.md) before downloading, deploying, or using this project.

> **Tip: Cloudflare Redirect is experimental.** The `msf cloudflare-redirect` CLI can rewrite user-selected Cloudflare-protected domains to locally scanned Cloudflare CDN IPv4/IPv6 addresses for direct clients only. Results depend on the msf host's ISP route, Cloudflare Anycast, IPv6 reachability, domain-list quality, and MosDNS config. See [Cloudflare Redirect docs](docs/plugins/cloudflare-redirect.md).

## Features

- Independently designed setup wizard for the administrator account, system parameters, DNS, IPv6, Fake-IP, traffic forwarding, and component installation.
- MosDNS + Mihomo default runtime based on an mssb-style, rule-set-driven DNS and traffic-forwarding layout: MosDNS `:53`, Mihomo DNS `:6666`, Fake-IP `28.0.0.0/8`, TProxy `7896`, Redirect `7877`.
- User-supplied third-party configuration subscriptions, manually configured connections, MosDNS client forwarding modes, and Mihomo endpoint, rule, connection, log, and configuration management pages.
- Mihomo custom configs, CodeMirror YAML editing, component update checks, automatic downloads, update notices, and configurable upgrade behavior.
- Local upload installation for MosDNS, Mihomo, and Zashboard; users may independently obtain the relevant upstream components for offline deployments.
- Linux tarball/systemd, fnOS FPK, and Unraid PLG support both nftables and TUN. Docker `host-tun` / `macvlan-tun` is supported and TUN-only.
- macOS 15–26 has an unsigned Beta native Universal 2 menu bar app, a root LaunchDaemon, and a TUN-only runtime. It does not use macOS system-proxy mode, and users must explicitly allow the first launch.
- Docker deployments must mount a host data directory to container `/opt/msf`; the default examples use `./msf-data:/opt/msf`.

## Scope of Use

- This repository does not include proxy subscriptions, nodes, accounts, or access credentials by default and does not provide related network services.
- Subscription URLs, connection details, rules, configurations, and external content imported by users are supplied by those users or the relevant third parties. Users must independently verify their source, authorization, legality, and security.
- The maintainers do not provide individualized configuration, remote deployment, troubleshooting, or other technical assistance intended to evade legal regulation, content filtering, or access controls.
- The DNS, routing, and traffic-forwarding documentation applies only to networks that users own or are fully authorized to administer. See the [Disclaimer](DISCLAIMER.md) for the complete scope and allocation of responsibility.

## Architecture Diagram

<p align="center">
  <img src="docs/png/framework-architecture.en.svg" alt="msf side-router proxy architecture diagram">
</p>

## Platform Support

| Platform | Status | Install docs | Update / removal |
|---|---|---|---|
| Linux tarball/systemd | Stable | [Linux install](docs/install/linux.md) | `msf update` / `msf uninstall` |
| fnOS FPK | Supported | [fnOS FPK install](docs/install/fnos-fpk.md) | fnOS / Feiniu App Center or FPK package manager |
| Unraid PLG | Stable | [Unraid PLG install](docs/install/unraid-plg.md) | Unraid plugin manager |
| Docker TUN host/macvlan | Supported (TUN-only) | [Docker TUN deployment](docs/docker.en.md) | Docker / Compose / Unraid Community Apps |
| macOS 15–26 menu bar app | Unsigned Beta (TUN-only) | [macOS installation and usage](docs/install/macos.md) | In-app administrator-authorized daemon installation, repair, and removal |

`msf update` and `msf uninstall` are only for Linux tarball/systemd installs. fnOS FPK, Unraid PLG, and Docker installs must be updated or removed through their platform manager.

## Downloads

GitHub Release:

```text
https://github.com/scoltzero/msf/releases/tag/v0.4.2
```

| Asset | URL |
|---|---|
| Linux x86_64 | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf-linux-amd64.tar.gz` |
| Linux ARM64 | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf-linux-arm64.tar.gz` |
| fnOS x86 FPK | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf_0.4.2_x86.fpk` |
| fnOS ARM FPK | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf_0.4.2_arm.fpk` |
| Unraid PLG | `https://github.com/scoltzero/msf/releases/download/v0.4.2/msf.plg` |
| macOS Universal 2 DMG (unsigned Beta) | `https://github.com/scoltzero/msf/releases/download/v0.4.2/MSF-0.4.2-macos-universal-unsigned.dmg` |
| macOS Universal 2 ZIP (unsigned Beta) | `https://github.com/scoltzero/msf/releases/download/v0.4.2/MSF-0.4.2-macos-universal-unsigned.zip` |

## Quick Start

1. Pick the install guide for your platform: Linux, fnOS, Unraid, Docker, or macOS.
2. Open the WebUI after installation. The default URL is `http://<server-ip>:7777`.
3. Complete the setup wizard. Setup writes system settings, generates MosDNS/Mihomo configs, and persists them in the database.
4. On a main router that you own or are authorized to administer, configure DHCP DNS and FakeIP static routes so LAN clients can use msf according to your own policies.

Router integration references for lawful, authorized network environments:

- [Router integration overview](docs/guide/en/router-integration.md)
- [RouterOS (MikroTik)](docs/guide/en/routeros.md)
- [iKuai](docs/guide/en/ikuai.md)
- [OpenWrt](docs/guide/en/openwrt.md)
- [UniFi (Ubiquiti)](docs/guide/en/unifi.md)

Runtime directories, ports, and file layout are documented in [Runtime reference](docs/reference/runtime.md).

## Plugin Docs

- [Cloudflare Redirect CLI plugin](docs/plugins/cloudflare-redirect.md): rewrites selected Cloudflare-protected domains to locally scanned fast Cloudflare CDN IPv4/IPv6 addresses for direct clients only.

## Development And Release

Run locally:

```bash
go run ./cmd/msf serve -c ./data -p 7777
```

Manual release packaging is documented in [RELEASING.md](RELEASING.md). Unraid packaging development notes remain in [packaging/unraid/README.md](packaging/unraid/README.md).

## Notes

This project does not contain MSM closed-source backend code. Early versions referenced MSM's public management experience; starting with v0.4.1, the current WebUI and Mizar identity are independently designed. The backend remains a separate reimplementation around the mssb-style MosDNS + Mihomo workflow. This project does not provide proxy subscriptions, connection credentials, or proxy network services directed at any particular region.

Thanks to:

- [`msm9527/msm-wiki`](https://github.com/msm9527/msm-wiki), used as the public reference for the MSM management experience.
- [`baozaodetudou/mssb`](https://github.com/baozaodetudou/mssb), used as the public reference for the MosDNS + Mihomo backend behavior.
- [Gzh256](https://github.com/Gzh256), with thanks for helping test and validate multiple versions.

This project is not affiliated with the upstream MSM or mssb projects.

[![Approved by linux.do](https://ld.xh.do/ld-badge.svg)](https://linux.do/)
