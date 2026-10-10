# Stash IEPL 当前网络 IPv4 白名单

适用于 mkcloud `hosting_id=7586`。每 3 分钟自动检测公网 IPv4；手动添加在 Stash 本地脚本编辑器中运行。需要 Stash iOS 3.2.5 或更新版本，自动任务需要 VPN 保持连接。

## 自动检测配置

1. 在 iPhone Safari 登录 GitHub，打开 [覆写文件](./IEPL自动白名单.stoverride)，选择“Download raw file”下载。
2. 在“文件”App 中将 `.stoverride` 分享给 Stash，导入到“覆写”。本仓库是私有仓库，固定 Raw 链接不能直接供未认证的 Stash 下载。
3. 在 Stash 本地编辑覆写，找到 `script-providers → iepl-whitelist-7586 → payload` 中的 `var KEY = '';`，在引号内填入当前有效 API Key。
4. 启用覆写、应用配置，连接 Stash VPN，等待下一次 3 分钟任务。
5. 首页“IEPL 白名单状态”仅显示自动任务的结果，不是手动按钮。

若已使用旧版，请先禁用并删除旧覆写，再导入新版，避免旧面板和旧 HTTP 入口继续生效。此版本移除了浏览器触发入口、相关 HTTP 引擎设置和占位 hosts，不需要配置 MitM 或安装 CA 证书。

## 手动添加

1. 打开 [手动检测并添加.js](./手动检测并添加.js)，复制原始 JS 内容。
2. 在 Stash 的本地脚本编辑器/Script Hub 中新建脚本，命名“IEPL 手动添加”，粘贴代码。
3. 在这个本地脚本的 `var KEY = '';` 中填入当前 API Key。首次配置时请单独填写，避免依赖编辑器与 VPN 扩展共享存储。
4. 保存并点“运行”。该脚本会重新检测公网 IPv4，强制提交添加，并在成功时发送通知；失败会在日志及通知中给出原因。

后续直接运行保存的脚本即可，不需要打开浏览器。若编辑器提供执行超时设置，建议至少 50 秒。请保持正常网络连接，并允许 Stash 通知。

手动脚本与自动覆写可能使用独立运行环境，密钥分别维护；手动结果也可能不会出现在自动任务的状态面板中。

## 为什么旧入口显示 404

旧版使用浏览器访问一个路径，再由 Stash HTTP 请求脚本截获。设备出现 mkcloud 404，表明该次访问到达了真实网站，未被添加脚本截获。该 GET 路径本身不是白名单 API，因此此次点击没有添加白名单。当前版本取消了这条触发链路。

## 自动任务与服务端行为

- cron `*/3 * * * *`：每小时第 0、3、6……分钟检测。
- 新 IP 立即提交；同一 IP 在成功后 30 分钟内跳过添加，30 分钟后重新确认。
- 检测源依次为 `api.ipify.org`、`ipv4.icanhazip.com`。脚本 HTTP 请求显式选择 `DIRECT`。
- 仅 HTTP 200 且 JSON `code=0` 才保存成功记录；失败不缓存，下周期重试。
- API Key 只通过 HTTPS 请求头 `X-API-Key` 发送；不会写入 URL 或脚本日志。
- 添加会将服务切换为 IP 白名单模式。满 10 条时服务端移除最早的一条，可能包含管理员添加的网段；各设备共用配额。
- 工具不调用删除或省份设置接口。

纯 IPv6 网络无法取得公网 IPv4时会失败；多出口网络中检测网站和 IEPL 可能看到不同来源 IP。设备关机、VPN 断开或系统暂停扩展时自动任务不会执行，不保证严格秒级时间。

## 错误诊断

报错区分 IPv4 检测源与 API 添加阶段，显示耗时及脱敏后的底层错误。HTTP 401/403 会明确提示认证或访问拒绝。

检测源超时为每个 8 秒，API 请求为 20 秒，cron 总超时为 50 秒。工具不会切换到代理出口，也不会跳过 TLS 验证。

更换密钥后，需要在本地自动覆写和本地手动脚本的 `KEY` 常量中分别填入新密钥。服务商后台更换密钥不会自动更新 Stash。

## 停用与删除密钥

禁用覆写并应用配置即可停止自动任务。清空两处本地 `KEY` 常量，并在 Stash 的脚本持久化数据中删除 `mkcloud.iepl.7586.api-key`，可清理保存的密钥；编辑器若使用独立存储，还需在其环境中清理。

## 验证范围

已通过模拟请求、失败不缓存、IP 去重、强制手动提交、缓存过期、底层错误脱敏、HTTP 401 识别及状态面板无网络请求测试。尚未在真实 iPhone 的脚本编辑器与后台任务中验证。

## 官方参考

- [覆写文件](https://stash.wiki/configuration/override)
- [脚本管理与嵌入 payload](https://stash.wiki/en/script/manage-script)
- [定时任务](https://stash.wiki/en/script/scheduled-tasks)
- [HTTP Client 与指定代理](https://stash.wiki/script/syntax-and-interface)
- [面板](https://stash.wiki/script/tile)
