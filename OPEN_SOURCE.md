# 开源依赖

当前版本和完整性以 package-lock.json 为准：五个 DSH 客户端 peer 为 `0.2.1-alpha.2`，Cordis 为 `4.0.5-alpha.1`，与本轮目标 Desktop 对齐。此前 Q61 的 rc.2 是历史验证基线；本轮证据边界见 COMPATIBILITY.md。

| 名称 | 版本 | 协议 | 来源 | 用途 |
| --- | --- | --- | --- | --- |
| @deepseek-ai/cordis | 4.0.5-alpha.1 | MIT | https://registry.npmjs.org/@deepseek-ai/cordis/-/cordis-4.0.5-alpha.1.tgz | 插件运行时 |
| @deepseek-ai/cosmokit | 1.8.6-alpha.2 | MIT | https://registry.npmjs.org/@deepseek-ai/cosmokit/-/cosmokit-1.8.6-alpha.2.tgz | 构建或间接依赖 |
| @deepseek-ai/dsh-client-locale | 0.2.1-alpha.2 | MIT | https://registry.npmjs.org/@deepseek-ai/dsh-client-locale/-/dsh-client-locale-0.2.1-alpha.2.tgz | 上游客户端服务依赖 |
| @deepseek-ai/dsh-client-ui-conversation | 0.2.1-alpha.2 | MIT | https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-conversation/-/dsh-client-ui-conversation-0.2.1-alpha.2.tgz | 上游客户端服务依赖 |
| @deepseek-ai/dsh-client-ui-renderer | 0.2.1-alpha.2 | MIT | https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-renderer/-/dsh-client-ui-renderer-0.2.1-alpha.2.tgz | 上游客户端服务依赖 |
| @deepseek-ai/dsh-client-ui-sidebar | 0.2.1-alpha.2 | MIT | https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-sidebar/-/dsh-client-ui-sidebar-0.2.1-alpha.2.tgz | 上游客户端服务依赖 |
| @deepseek-ai/dsh-client-ui-theme | 0.2.1-alpha.2 | MIT | https://registry.npmjs.org/@deepseek-ai/dsh-client-ui-theme/-/dsh-client-ui-theme-0.2.1-alpha.2.tgz | 上游客户端服务依赖 |
| @deepseek-ai/schemastery | 3.18.5-alpha.2 | MIT | https://registry.npmjs.org/@deepseek-ai/schemastery/-/schemastery-3.18.5-alpha.2.tgz | 构建或间接依赖 |
| @standard-schema/spec | 1.1.0 | MIT | https://registry.npmjs.org/@standard-schema/spec/-/spec-1.1.0.tgz | 构建或间接依赖 |
| @types/prop-types | 15.7.15 | MIT | https://registry.npmjs.org/@types/prop-types/-/prop-types-15.7.15.tgz | 构建或间接依赖 |
| @types/react | 18.3.12 | MIT | https://registry.npmjs.org/@types/react/-/react-18.3.12.tgz | 构建或间接依赖 |
| csstype | 3.2.3 | MIT | https://registry.npmjs.org/csstype/-/csstype-3.2.3.tgz | 构建或间接依赖 |
| js-tokens | 4.0.0 | MIT | https://registry.npmjs.org/js-tokens/-/js-tokens-4.0.0.tgz | 构建或间接依赖 |
| loose-envify | 1.4.0 | MIT | https://registry.npmjs.org/loose-envify/-/loose-envify-1.4.0.tgz | 构建或间接依赖 |
| react | 18.3.1 | MIT | https://registry.npmjs.org/react/-/react-18.3.1.tgz | 插件运行时 |
| typescript | 5.9.3 | Apache-2.0 | https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz | 构建或间接依赖 |
| esbuild | 0.28.2 | MIT | https://registry.npmjs.org/esbuild/-/esbuild-0.28.2.tgz | 仅开发构建：客户端闭包工厂，发行包不携带 |

esbuild 的平台可选二进制均为 0.28.2、MIT、来自官方 npm registry，仅开发构建使用。各名称、精确 URL 与完整性见 package-lock.json 的 `@esbuild/*` 项；本机实际安装 `@esbuild/darwin-arm64`。这些平台候选及构建工具均不进入发行文件清单。

Brand.ts 依据旧 HanaMesh fork 的 H 标实现迁出，参考 deepseek-ai/deepseek-harness 的品牌槽位注册写法（MIT）。


D-79 开发验证驱动追加：playwright-core **1.56.0**，Apache-2.0，来源 https://registry.npmjs.org/playwright-core/-/playwright-core-1.56.0.tgz。仅独立产品验证与隔离 PACKAGE/API 浏览器驱动，精确版本及完整性在 package-lock.json；不下载浏览器、不调用服务启停、不进入品牌 tgz 或客户端依赖注入。正式框架/React/五peer许可与使用方式不变。

## 官方宿主提供的已证运行模块（I27）

以下为官方 0.2.1-rc.2 的公开 exports；不打入本插件、不改变开发锁闭包。来源：官方发布 https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.1-rc.2 ，各包 MIT。

|名称|版本|协议|来源|用途|
|---|---|---|---|---|
|@deepseek-ai/cordis|4.0.5|MIT|官方原签名 ASAR 公共模块|宿主 effect 生命周期|
|@deepseek-ai/dsh-client-ui-renderer|0.2.1-rc.2|MIT|同上公开 ./client|槽位注入|
|@deepseek-ai/dsh-client-ui-sidebar|0.2.1-rc.2|MIT|同上公开 ./client|侧栏品牌槽|
|@deepseek-ai/dsh-client-ui-conversation|0.2.1-rc.2|MIT|同上公开 ./client|hero品牌槽|
|@deepseek-ai/dsh-client-locale|0.2.1-rc.2|MIT|同上公开 ./client|插件字典|
|@deepseek-ai/dsh-client-ui-theme|0.2.1-rc.2|MIT|同上公开 ./client|只读主题核验|
