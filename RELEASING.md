# 发布手册

从 v0.4.0 开始，Linux、Unraid、fnOS、macOS 和 Docker 必须由 `main` 上同一个干净 tag checkout 构建。`fnos-fpk`、`codex/docker-runtime` 和 `codex/macosapp` 都不是长期发布分支；不要移动 tag、覆盖历史 Release 或使用 `gh release upload --clobber` 替换已发布资产。

## 1. 发布前检查

```bash
git switch main
git pull --ff-only
go test ./...
npm --prefix web ci
npm --prefix web run check
make macos-app-test
make macos-app-build-debug macos-app-build-release
make macos-app-verify MACOS_CONFIGURATION=Debug
make macos-app-verify MACOS_CONFIGURATION=Release
git status --short
```

最后一条必须无输出。发布版本以 `0.4.0` 这类不带 `v` 的值传给 Make，tag 使用 `v0.4.0`。

## 2. macOS 发布凭据

macOS 正式资产必须使用 Developer ID Application 签名并完成 Apple 公证。GitHub Actions 需要以下 Secrets：

- `MACOS_CERTIFICATE_P12`：Developer ID Application `.p12` 的 Base64。
- `MACOS_CERTIFICATE_PASSWORD`：`.p12` 密码。
- `APPLE_TEAM_ID`：Apple Developer Team ID。
- `APPLE_API_KEY_ID`：App Store Connect API Key ID。
- `APPLE_API_ISSUER_ID`：App Store Connect Issuer ID。
- `APPLE_API_PRIVATE_KEY`：API Key `.p8` 完整内容。

未配置这些凭据时不要创建正式 tag。未签名 App 只能用于本地开发测试，不能上传到正式 Release。

## 3. 创建不可变 tag

在与最终候选构建完全相同的 `main` commit 上执行：

```bash
VERSION=0.4.0
git tag -a "v$VERSION" -m "v$VERSION"
git push origin "v$VERSION"
```

tag push 会触发两个工作流：

- `Release assets`：分别构建 Linux/Unraid/fnOS 和签名公证的 macOS 资产，全部成功后一次性创建 GitHub Release。
- `Docker GHCR`：构建并验证 `host-tun`、`macvlan-tun`，再推送 amd64/arm64 多架构镜像。

两个工作流都会确认：

- checkout 工作区干净；
- tag commit 等于 `HEAD` 并可从 `origin/main` 到达；
- 二进制嵌入的 source/tag commit 与 tag 一致；
- Go build metadata 包含 `vcs.modified=false`；
- Docker OCI `org.opencontainers.image.revision` 等于同一 commit。

macOS 工作流还会确认：

- App 与 daemon 都包含 `arm64` 和 `x86_64`；
- App 与 daemon 都使用 Developer ID Application 和 Hardened Runtime；
- App、DMG 已通过 Apple Notarization 和 Staple；
- Gatekeeper、Bundle 版本和 daemon 来源信息验证通过。

## 4. 发布资产

GitHub Release 应包含 20 个资产：

- Linux amd64/arm64 tarball、旧名称兼容副本及 SHA-256：8 个。
- Unraid `.txz`、`.plg` 及 SHA-256：4 个。
- fnOS x86/ARM `.fpk` 及 SHA-256：4 个。
- macOS Universal 2 DMG、ZIP 及 SHA-256：4 个。

macOS 资产名称：

```text
MSF-0.4.0-macos-universal.dmg
MSF-0.4.0-macos-universal.dmg.sha256
MSF-0.4.0-macos-universal.zip
MSF-0.4.0-macos-universal.zip.sha256
```

fnOS 构建必须使用真正的 `fnpack`；下载失败会中止，绝不生成伪装成 `.fpk` 的 tar.gz fallback。

## 5. 本地发布构建

tag 已存在并指向当前干净 `HEAD` 时，可构建 Linux、Unraid 和 fnOS：

```bash
VERSION=0.4.0
make release-assets VERSION="$VERSION" RELEASE_TAG="v$VERSION"
```

已在 Keychain 中配置 Developer ID 与 Notary Profile 时，可构建 macOS：

```bash
VERSION=0.4.0
make macos-release-assets \
  VERSION="$VERSION" \
  RELEASE_TAG="v$VERSION" \
  MACOS_BUILD_NUMBER=1 \
  MACOS_DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  MACOS_SIGNING_IDENTITY="$MACOS_SIGNING_IDENTITY" \
  MACOS_NOTARY_PROFILE="$MACOS_NOTARY_PROFILE"
```

## 6. 发布后核验

```bash
VERSION=0.4.0
gh release view "v$VERSION" --repo scoltzero/msf --json tagName,targetCommitish,assets
docker buildx imagetools inspect "ghcr.io/scoltzero/msf:v$VERSION"
```

确认 GitHub Release 包含全部 20 个安装资产和 SHA-256，GHCR 同时存在 `v0.4.0` 和 `latest`，且 revision 与 Release tag commit 相同。

下载线上 DMG 后再执行一次：

```bash
xcrun stapler validate MSF-0.4.0-macos-universal.dmg
spctl --assess --type open --context context:primary-signature --verbose=2 MSF-0.4.0-macos-universal.dmg
```

如需更新仓库根目录供 Unraid Community Apps 使用的 `msf.plg`，应直接下载本次 Release 中已经验证过的 `msf.plg`，逐字节替换并单独提交；不要重新打包生成另一个 txz 哈希。

## 7. 分支清理

确认 v0.4.0 Release、DMG/ZIP、fnOS FPK 和 Docker 镜像全部可用后，删除本地与远程的：

- `codex/macosapp`
- `codex/docker-runtime`
- `fnos-fpk`

长期只保留 `main`；历史发布由不可变 Git tag 和 GitHub Release 保留。

## 8. 失败处理

- 任何测试、来源、dirty、签名、公证、摘要或黑盒检查失败，都不要创建 GitHub Release。
- 正式 tag 推送前必须完成候选构建；tag 一旦推送不再移动或覆盖。
- 如果已推送 tag 的发布流程失败，修复后使用新的补丁版本，不替换旧 tag 或旧资产。
