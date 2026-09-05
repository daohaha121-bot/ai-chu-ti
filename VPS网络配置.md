# VPS 代理网络配置

> 更新时间：2026-05-22 | 状态：已优化

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
| 端口 | 443 |
| UUID | 7f37b780-7973-4735-9a6c-368032053dd8 |
| Flow | xtls-rprx-vision |
| SNI | www.microsoft.com |

```
vless://7f37b780-7973-4735-9a6c-368032053dd8@67.216.203.127:443?type=tcp&security=reality&flow=xtls-rprx-vision&fp=chrome&pbk=ZUmuyLORIjs9LEKukA7F6UXyeqd-Ap3oMyUziXie6hg&sid=30b6905cbd5a9c56&sni=www.microsoft.com#US-VLESS-Reality
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
| 自动测速 | url-test，每 300s，tolerance 50 |

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

| 网站 | 延迟 |
|------|------|
| Google | ~1.4s |
| YouTube | ~1.9s |
| GitHub | ~1.8s |

---

## 六、已知限制

- VPS IP `67.216.203.127` 被墙，Reality/VMess 直连不可用
- 所有流量通过 Cloudflare CDN 中转
- 1-2 秒为中美经 CDN 的正常延迟上限
