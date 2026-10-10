# Stash IEPL 当前网络 IPv4 白名单

适用于 mkcloud `hosting_id=7586`。每 3 分钟检测公网 IPv4，发生变化时提交添加；首页面板提供手动入口。需要 Stash iOS 3.2.5 或更新版本，且 VPN 保持连接。

## 导入

本仓库是私有仓库，Stash 无法直接访问未经认证的固定 Raw 链接。

1. 在 iPhone Safari 登录有权访问仓库的 GitHub 账号，打开 [覆写文件](./IEPL自动白名单.stoverride)。
2. 使用 GitHub 的“Download raw file”下载原始 `.stoverride` 文件。
3. 在“文件”App 找到下载文件，分享给 Stash，导入到“覆写”。也可在 Stash 覆写页选择本地文件导入。
4. 首次先编辑导入后的覆写，在 `script-providers → iepl-whitelist-7586 → payload` 中找到 `var KEY = '';`，将单引号之间填入自己的 API Key。只在 Stash 本地填写。
5. 启用覆写、应用配置，连接 Stash VPN。点击首页“IEPL 白名单”面板，手动执行一次。成功后密钥已写入 Stash 持久化存储；以后重新导入无密钥版本仍可使用已保存的密钥。

若要“从 URL 导入”：在登录后的 GitHub 文件页点击“Raw”，复制浏览器当前的完整原始文件 URL（私有文件通常带临时 `token`），立即粘贴到 Stash 的覆写 URL 导入。该链接可能过期，不适合作为长期自动更新地址；若返回 404，请使用上面的本地文件导入流程。不要在 URL 内拼接 IEPL API Key。

## 自动与手动

- 自动：cron `*/3 * * * *`，每小时第 0、3、6……分钟检测。
- 手动：首页面板点击打开本机 HTTP 入口，刷新页面会重新检测并强制提交。完整入口地址也写在覆写的 `tiles.url` 中；必须保留 HTTP。
- 面板每 180 秒读取状态，本身不执行额外添加。
- 同一 IP 在成功后 30 分钟内跳过自动添加，30 分钟后重新提交确认，以修复服务端轮换或人工删除。
- `api.ipify.org` 为首选检测源，`ipv4.icanhazip.com` 为备用，脚本请求显式选择 `DIRECT`。
- 成功条件：HTTP 200 且 JSON `code=0`。失败不写成功缓存，下周期重试。
- 自动失败发送 Stash 通知；未填写密钥时只记录配置提示。

手动地址由本机 Stash HTTP 引擎截获，不需要额外服务器，不需要 MitM 或 CA 证书。请求不包含密钥；检测源及真实添加接口使用 HTTPS，密钥只通过 `X-API-Key` 请求头传递。

## 密钥与停用

重新设置密钥：在本地覆写的 `KEY` 常量填入新密钥，应用配置并手动执行一次。填写的密钥会覆盖本地已存密钥。

停用：禁用覆写并应用配置。密钥保留在 Stash 的脚本持久化数据中。如需删除，在 Stash 的脚本持久化数据页面删除 `mkcloud.iepl.7586.api-key`，并清空本地覆写的 `KEY` 常量。

## 服务端行为与限制

添加会将服务切换为 IP 白名单模式。服务端已有 10 条时新增 IP 会移除最早的一条，可能包含管理员添加的网段。所有设备共用这 10 条记录。脚本不调用删除或省份设置接口。

纯 IPv6 网络无法取得公网 IPv4 时会失败。多出口网络中，检测源和 IEPL 可能看到不同来源 IP，需在服务商后台核对。VPN 断开、设备关机或系统暂停扩展时定时任务不会运行；不保证严格秒级执行。

模拟测试覆盖直连、检测源回退、失败不缓存、IP 去重、手动提交与缓存过期。尚未在真实 iPhone 上验证导入、HTTP 入口及服务商添加效果。

## 文件

- `IEPL自动白名单.stoverride`：可导入的完整覆写，内嵌脚本。
- `iepl-whitelist.js`：同一脚本，供查看和调试，正常导入不需要单独下载。

## 官方参考

- [覆写文件](https://stash.wiki/configuration/override)
- [脚本管理与嵌入 payload](https://stash.wiki/en/script/manage-script)
- [定时任务](https://stash.wiki/en/script/scheduled-tasks)
- [HTTP Client 与指定代理](https://stash.wiki/script/syntax-and-interface)
- [面板](https://stash.wiki/script/tile)
