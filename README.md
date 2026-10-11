# hanamesh-brand

HanaMesh 的客户端品牌插件，仅提供 `dsh.client`。不提供服务端插件；预装范围由 HanaMesh 客户端种子决定，本仓不修改种子或网站。

- 注册 `sidebar.brand.mark`、`sidebar.brand.name`、`conversation.hero.brand.mark`，使用旧 fork 的紫色 H 标和 HanaMesh 名称。
- 通过 `theme.overrideTokens()` 覆盖 business-primary，提供浅色 / 深色值；卸载移除自己的覆盖层。
- 在 `hanamesh.brand` namespace 注册中英文首页文案；卸载注销字典。
- 使用声明感知的 `slots.inject()`，跟随宿主槽位声明、注销及重新声明。

## 字典用途与首页标题归属

保留 `hanamesh.brand` 双语字典，作为 HanaMesh 品牌标题文案的集中参考，供打包层替换界面文字时人工核对。当前没有显示组件读取该 namespace，它不覆盖任何运行时显示文字，也不表示打包层已自动接入。字典注册及卸载行为由本仓测试验证。

PM 已将首页标题替换从本卡移至 `J1S2-DESK-02`，按 D-12 a 在打包层处理。本卡只负责三个品牌槽位和可撤回的主题色覆盖，范围已完成；标题替换不再是本卡阻塞项。

## 验证与打包

Node 24：`npm ci && npm test`；`npm run check` 做类型检查；`npm pack` 构建仅客户端发行文件。测试覆盖槽位注册与注销、延迟声明及重建、主题层覆盖及移除、字典注册及移除、安装失败回滚和发行入口。测试是组件级模拟宿主验证，不是 HanaMesh.app 的真实 UI 验收。

`npm run build` 同时生成 Node ESM/类型入口 `lib/client/index.js`、`lib/client/index.d.ts`，及 DSH 浏览器闭包工厂 `lib/client.js`。`exports["./client"].default` 供正式 DSH 客户端模块加载器读取，`node` 条件保留组件测试及 Node 消费入口。浏览器工厂按正式上游协议注册到 `window.__ModuleLoader__`，React 由宿主模块表提供。

门禁：`npm run types`、`npm run build`、`npm run test:contract`（自带构建）、`npm run toolchain`、`npm run preflight`、`npm run test:mutation -- --run-dir <本卡运行目录>/evidence`、`npm pack`。Mutation 在指定运行目录中建立并删除隔离源码副本，逐项核验实际行为断言能发现破坏；不改当前源码或删减原断言。

正式包复核见 [COMPATIBILITY.md](COMPATIBILITY.md)。复核脚本 `npm run test:profile -- --consumer <干净消费者>` 只解析本卡隔离的默认 profile，不启动宿主服务；`npm run test:package -- --consumer <干净消费者>` 用无头 Chrome 执行真实上游模块加载器及服务 API，设置存储与槽位声明者为具名隔离夹具。干净消费者须安装 `@deepseek-ai/dsh@0.2.0-rc.2`、本卡 `npm pack` 产物及测试驱动 `playwright-core@1.56.0`；不使用 force、legacy-peer-deps 或版本覆盖。可用 `CHROME_EXECUTABLE` 指定浏览器路径，默认读取 macOS Chrome 应用的可执行文件，使用全新临时浏览器 profile。

该 PACKAGE/API 复核不启动完整默认应用，不连接服务器或持久化用户配置，不等于真实组合功能或产品 UI 验收。首页显示标题仍由 `J1S2-DESK-02` 打包层负责；本插件注册的品牌 namespace 不覆盖 conversation 字典。

开源清单见 [OPEN_SOURCE.md](OPEN_SOURCE.md)。
