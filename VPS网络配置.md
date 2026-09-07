# VPS 代理网络配置

> 更新时间：2026-09-07 | 状态：已修复（CDN 节点恢复正常）

---

## 一、VPS 信息

| 项目 | 值 |
|------|-----|
| 服务商 | 搬瓦工 BandwagonHost |
| 套餐 | KVMV2-20G |
| IP | 67.216.203.127 |
| 位置 | 美国洛杉矶 |
| 系统 | Ubuntu 24.04 |
| 带宽 | 1000GB/月 |
| BBR | 已开启 |

---

## 二、节点列表

### 节点 1：US-CDN-VLESS（推荐使用）

| 项目 | 值 |
|------|-----|
| 协议 | VLESS + WebSocket + TLS |
| 域名 | xs7823.xyz |
| 端口 | 443 |
| 路径 | /cdn |
| UUID | 5e508ac9-0007-41ad-bcbf-24da7cbe1224 |
| 传输 | Cloudflare CDN 中转 |

```
vless://5e508ac9-0007-41ad-bcbf-24da7cbe1224@xs7823.xyz:443?type=ws&security=tls&path=%2Fcdn&host=xs7823.xyz&encryption=none&fp=chrome#US-CDN-VLESS
```

![QR-CDN](qr-cdn-vless.png)

---

### 节点 2：US-VLESS-Reality（直连，IP 被墙不可用）

| 项目 | 值 |
|------|-----|
| 协议 | VLESS + TCP + REALITY |
| IP | 67.216.203.127 |
| 端口 | 4443（原 443，被 nginx 抢占后迁移） |
| UUID | 7f37b780-7973-4735-9a6c-368032053dd8 |
| Flow | xtls-rprx-vision |
| SNI | www.microsoft.com |

```
vless://7f37b780-7973-4735-9a6c-368032053dd8@67.216.203.127:4443?type=tcp&security=reality&flow=xtls-rprx-vision&fp=chrome&pbk=ZUmuyLORIjs9LEKukA7F6UXyeqd-Ap3oMyUziXie6hg&sid=30b6905cbd5a9c56&sni=www.microsoft.com#US-VLESS-Reality
```

![QR-Reality](qr-reality.png)

---

### 节点 3：US-VMess-WS（直连，IP 被墙不可用）

| 项目 | 值 |
|------|-----|
| 协议 | VMess + WebSocket |
| IP | 67.216.203.127 |
| 端口 | 8443 |
| UUID | 2b4d6dbd-759b-439c-8642-a12495f81f90 |
| 路径 | /ray |

```
vmess://eyJ2IjoiMiIsInBzIjoiVVMtVk1lc3MtV1MiLCJhZGQiOiI2Ny4yMTYuMjAzLjEyNyIsInBvcnQiOiI4NDQzIiwiaWQiOiIyYjRkNmRiZC03NTliLTQzOWMtODY0Mi1hMTI0OTVmODFmOTAiLCJhaWQiOiIwIiwic2N5IjoiYWVzLTEyOC1nY20iLCJuZXQiOiJ3cyIsInR5cGUiOiJub25lIiwiaG9zdCI6IiIsInBhdGgiOiIvcmF5IiwidGxzIjoiIn0=
```

![QR-VMess](qr-vmess-ws.png)

---

## 三、本地 Clash Verge Rev 配置

| 项目 | 值 |
|------|-----|
| 客户端 | Clash Verge Rev (mihomo) |
| 混合端口 | 7897 |
| 代理模式 | Rule |
| TUN 模式 | 已开启（全局透明代理，无需手动设系统代理） |
| 自动测速 | url-test，每 300s，tolerance 50 |

> ⚠️ 配置文件有两份：`profiles/Lh3r9xVnGbgB.yaml`（profile 源，**持久**）和 `clash-verge.yaml`（运行时，由 profile 生成，**会被覆盖**）。改节点/规则要改 profile 源，再在面板「重载配置」。

### 代理组

| 组名 | 类型 | 节点 |
|------|------|------|
| 节点选择 | select | 自动测速 / Reality / VMess / CDN / DIRECT |
| 自动测速 | url-test | Reality / VMess / CDN |

### 路由规则

| 规则 | 目标 |
|------|------|
| DOMAIN-SUFFIX,cn | DIRECT |
| GEOIP,CN | DIRECT |
| 局域网 IP | DIRECT |
| MATCH | 节点选择 |

---

## 四、手机端导入

### iPhone（Shadowrocket 小火箭）
1. 扫描节点 1（CDN）的二维码
2. 或复制 VLESS 链接，在 Shadowrocket 中粘贴导入

### Android（v2rayNG）
1. 扫描节点 1（CDN）的二维码
2. 或在 v2rayNG 中选择「从剪切板导入」，粘贴 VLESS 链接

---

## 五、当前性能

（2026-09-07 回退到默认域名后实测）

| 网站 | 延迟 |
|------|------|
| 节点延迟（gstatic 204） | ~338ms |
| Google | ~2.4s |
| YouTube | ~3.8s |

> 延迟会随 Cloudflare 线路和时间波动，1~4s 都属正常；中美经 CDN 中转 300ms 起步。

---

## 六、已知限制

- VPS IP `67.216.203.127` 被墙，Reality/VMess 直连不可用
- 所有流量通过 Cloudflare CDN 中转
- 1-2 秒为中美经 CDN 的正常延迟上限

---

## 七、重要架构与事故记录（2026-09-07）

### x-ui 架构（关键，避免再踩坑）

本机用 **x-ui 面板** 管理 xray，**config.json 是由 x-ui 从 SQLite 数据库自动生成的**。

- 直接手改 `/usr/local/x-ui/bin/config.json` 会在 `x-ui restart` 后被覆盖，**无效**。
- 真正的配置在数据库 `/etc/x-ui/x-ui.db` 的 `inbounds` 表里。
- 改配置要么直接改数据库，要么用 x-ui 网页面板（http://67.216.203.127:54321）。

### 当前端口布局

| 端口 | 服务 | 说明 |
|------|------|------|
| 2053 | xray CDN（VLESS+WS+TLS，path `/cdn`） | Cloudflare 源站端口，**核心节点** |
| 8443 | xray VMess（WS，path `/ray`） | 直连，IP 被墙不可用 |
| 4443 | xray Reality（VLESS） | 原 443，被 nginx 抢占后迁移；直连被墙不可用 |
| 443 / 8080 | nginx（AI 考试系统 `/var/www/ai-chu-ti/`） | PM2 跑的 node 服务 |
| 54321 | x-ui 网页面板 | |
| 62789 | xray api（127.0.0.1） | x-ui 内部用 |

### 事故经过

2026-09-07，部署「AI 考试题二维码」系统的 agent 在 VPS 上装了 nginx 占用 443，并把 xray 的 CDN 入口从 `2053` 改成了 `127.0.0.1:20530` 且去掉了 TLS，导致 Cloudflare 连不上源站报 **HTTP 521**，三个节点全灭、翻墙代理全断。

### 修复方法

1. 改 `/etc/x-ui/x-ui.db` 的 `inbounds` 表（`inbound-2053-cdn` 那一行）：
   - `listen = 0.0.0.0`、`port = 2053`
   - `stream_settings` 里 `security = tls`，并加 `tlsSettings.certificates`（`/etc/xray/certs/cert.pem` + `key.pem`）
2. `x-ui restart`
3. 验证：`ss -tuln | grep 2053` 应显示 `*:2053`；Cloudflare `xs7823.xyz/cdn` 返回 400（不再是 521）

### 备份位置

- 数据库备份：`/etc/x-ui/x-ui.db.bak`
- 配置备份：`/usr/local/x-ui/bin/config.json.agent-broken.bak`（事故版）、`config.json.bak`（原始版）

### Cloudflare 优选 IP（2026-09-07，已回退）

曾把 CDN 节点的 `server` 换成优选 IP `104.18.46.170`，效果 389ms → ~250ms。**但当天该 IP 就失效**（直连超时、节点 Timeout、代理全断），已回退为域名 `xs7823.xyz`，恢复正常（延迟 ~338ms）。

结论：**优选 IP 生命周期很短（可能几小时就失效），不适合写死在配置里**。默认域名解析已经很稳（~338ms），不折腾了。

- 测试工具：CloudflareSpeedTest（cfst）→ 再用 `curl --resolve xs7823.xyz:443:<IP>` 验证哪些 IP 真正服务该域名
- ⚠️ 只有 `104.16.0.0/12`、`172.64.0.0/13` 等免费版网段能服务该域名；`162.159.x.x`、`108.162.x.x` 等网段虽快但会返回 403，不能用
- ⚠️ 若非要测优选 IP，测完别写死，失效（节点 Timeout）时直接改回域名 `xs7823.xyz` 即可
- CDN 节点 `server` 保持 `xs7823.xyz`，SNI/Host 也是 `xs7823.xyz`

---

## 八、避坑注意事项（重要）

1. **config.json 别手改**：x-ui 会从 SQLite 数据库 `/etc/x-ui/x-ui.db` 重新生成 config.json，手改在 `x-ui restart` 后会被覆盖。要改就改 DB，或用 x-ui 网页面板（`http://67.216.203.127:54321`）。
2. **优选 IP 别写死**：Cloudflare 优选 IP 生命周期极短（几小时就可能失效），失效时节点延迟 Timeout、代理全断。默认域名 `xs7823.xyz` 最稳，失效直接改回域名。
3. **mihomo 热重载要带完整路径**：`PUT /configs?force=true` 的 body 必须是 `{"path":"<完整路径>"}`；空 path 不生效，改动不会应用。
4. **改配置要改对文件**：Clash Verge 有 profile 源 `profiles/Lh3r9xVnGbgB.yaml`（持久）和运行时 `clash-verge.yaml`（由 profile 生成，会被覆盖）。要持久化就改 profile 源，再在面板「重载配置」。
5. **nginx 别抢 443 / 别动 xray 入口**：部署 web 项目（如 AI 考试系统）装 nginx 会占 443；务必别把 xray 的 CDN 入口（2053）改成 localhost 或去掉 TLS，否则 Cloudflare 报 521、所有节点全灭。
6. **Cloudflare 网段注意**：只有 `104.16.0.0/12`、`172.64.0.0/13` 等免费网段能服务免费域名；`162.159.x.x`、`108.162.x.x` 等网段虽快但返回 403，不能用。
7. **TUN 模式**：开启后全局透明代理（所有流量走 mihomo，无需设系统代理）；依赖 Clash Verge 的辅助服务（root 权限）正常运行，若 TUN 出问题先查 `clash-verge-service` 是否在跑。
