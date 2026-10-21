# Brand 静态资产公开入口（B17 I1）

本页是 Brand 静态资产的正式公开说明。它与 README 的三个原生品牌槽一起构成 H 的消费入口；不存在额外资产服务或预主进程回调。正常 `npm pack` 同时携带本页、以下文件和来源许可原文。

|公开包路径|格式与尺寸|字节|SHA-256|
|---|---|---:|---|
|`hanamesh-brand/assets/favicon.svg`|`image/svg+xml`，512×512；内嵌 512×512 PNG|6256|`a502bc6cd5f95f32bbd2716a884f974f524e483c49b50798b0443adc7f232039`|
|`hanamesh-brand/assets/welcome-brand.svg`|`image/svg+xml`，472×40；40×40 显示同一内嵌 PNG，并含 HanaMesh 文本|6430|`90d9fab4ffad1d7b1b5905b75eccce9836391cfd258a03162f74e81a805c3cf7`|

`hanamesh-brand/assets/manifest.json` 给出精确字节数、SHA-256、SHA512 SRI、尺寸、源路径和许可状态。`hanamesh-brand/assets/source-license.txt` 保留原仓 LICENSE 原文；`hanamesh-brand/ASSETS.md` 可直接解析本页。所有路径均为显式 package exports，无需导入 Brand 运行模块，不依赖生产方 worktree。

Node 消费方可用 `createRequire(import.meta.url).resolve('hanamesh-brand/assets/favicon.svg')` 定位后读取字节；SVG 由消费方作为静态资源处理，不能当作 JavaScript 导入。H 按自身已经批准的品牌清单选取静态输入并复核摘要。文件名 `favicon.svg` 本身不构成全局 favicon 或 OS 图标替换授权，也不扩大已有打包批准范围。

两份文件逐字节取自 `https://github.com/yzsnstotz/hanamesh-desktop-electron.git` 的 `packaging/assets/`；文件最后修改提交为 `60efccc00c6a160bf9bddd0d137de14946a5e69a`，读取时干净 checkout 为 `ab3790222c543d9cabe9c9d8fa830f91aa57dc3d`。无变换、无新增标志、无外部资源 URL。欢迎图保留原有明暗媒体样式与 `sans-serif` 文本；字体由消费环境提供，本包未附加字体。

**资产许可状态：unknown（待编排确认）。** 来源仓声明 MIT、LICENSE 为 `Copyright (c) 2026 DeepSeek`；现有两份 SVG 未带独立资产声明，内嵌 PNG 的作者和独立授权未查明。复制来源 LICENSE 是保留已观察到的声明，不据此推定 HanaMesh 图形或商标已另获授权；Brand 包的 `license: MIT` 也不能替代资产授权事实。manifest 中 `license.spdx` 因此为 null。对外发布与使用权未定项交编排处理。

这些文件仅提供静态复用输入。当前客户端仍使用既有 `HanaMeshMark` / `HanaMeshName` 组件，注册 `sidebar.brand.mark`、`sidebar.brand.name`、`conversation.hero.brand.mark`；优先级、冲突处理、卸载恢复、局部颜色及字典规则沿 README / COMPATIBILITY。静态文件不会自动挂入槽、覆盖原生 welcome、全局 favicon、会话标题、全局 locale 或宿主布局。

兼容范围沿 [COMPATIBILITY.md](COMPATIBILITY.md)：五个客户端 peer 仅 `0.2.1-alpha.2 || 0.2.1-rc.2`，Cordis `4.0.5-alpha.1 || 4.0.5`，React `18.3.1`。资产包门验证解析、正常归档、新消费者字节与摘要；真实官方 rc.2 / 自有 alpha.2 槽位激活、禁用和卸载恢复需各自 UI 证据，文件存在或 Host Running 不代替此证据。插件前 welcome / 静态发行输入分别沿已批 PKG-BRAND / PKG-SEEDS；Brand 不提供 PRE 入口。

正常复现使用 Node 24、锁定开发闭包：`npm ci --strict-peer-deps`（执行 prepare）、`npm run preflight`、`npm pack --pack-destination <artifact-dir>`。prepack 正常构建客户端闭包；不用 verification 变体、不跳 prepare、不复制 Desktop compiled 依赖。归档版本以 package.json 为准，精确候选提交与归档 SHA-256 / SHA512 SRI 由该次交付记录固定，不能用移动 main 代替。
