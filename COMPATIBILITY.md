# Q61：J1S2-BRAND-02 固定正式线复核

2026-10-11 开工 main：`28bad26949523d0aee0d76e09bfdea150e5241bc`，已 fetch 核对 origin/main。固定 npm 正式默认线 `@deepseek-ai/dsh@0.2.0-rc.2`；当时 latest/next 都指向该版本，alpha 为另一路，不消费。正式精确 git tag 为 `dsh-v0.2.0-rc.2`，SHA `639ed015397290b3745d163aafe02ffee4aa3f84`，来源 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness/tree/639ed015397290b3745d163aafe02ffee4aa3f84)。npm 实际 bytes 以 registry URL / integrity / 干净消费者 lock 为准；git tag 用于固定源码合约对照，不把源码编译结果冒充 npm 包。

## 五项 peer 的保留理由

| peer | manifest 固定值 | 默认 web profile / 干净消费者 resolved | 实际公开 API 核验与处置 |
| --- | --- | --- | --- |
| @deepseek-ai/dsh-client-ui-renderer | 0.2.0-rc.2 | 0.2.0-rc.2 | 正式 SlotRegistry 的 inject/register/entriesOfSlot，声明消失及重建、Cordis fiber 卸载；兼容，保留 |
| @deepseek-ai/dsh-client-ui-sidebar | 0.2.0-rc.2 | 0.2.0-rc.2 | 正式包 factory 能由真实 ClientModuleSystem materialize；源码及发布类型公开 sidebar.brand.mark/name，mark owner 的 size 与 className 保持；兼容，保留 |
| @deepseek-ai/dsh-client-ui-conversation | 0.2.0-rc.2 | 0.2.0-rc.2 | 正式包 factory 能 materialize；源码及发布类型公开 conversation.hero.brand.mark，owner 为 size/className；独立品牌 namespace 不覆盖 conversation 原字典；兼容，保留 |
| @deepseek-ai/dsh-client-locale | 0.2.0-rc.2 | 0.2.0-rc.2 | 正式 LocaleRuntime register 的双语形式、bind、setLocale、注销；兼容，保留 |
| @deepseek-ai/dsh-client-ui-theme | 0.2.0-rc.2 | 0.2.0-rc.2 | 正式 ThemeRuntime overrideTokens 两种模式、保留其他层、撤回自己的层；兼容，保留 |

实际 profile 通过正式 `loadProfile`、`composeEntries`、`createRuntimeResolution` 计算，home 仅为本卡运行目录的 `profile-home`。五项的 installation-scope declarer 都是正式 `@deepseek-ai/dsh-web-app/package.json`；未写用户 profile、未启动默认应用。消费者以正常 npm 安装/ci 获取正式包和本插件 tarball，无 force/legacy-peer-deps/override。Cordis 为 4.0.4，消费者 React 和正式前端共享 React 都为 18.3.1。

## 已证实的本插件发布入口不兼容与适配

原 `exports["./client"].default` 是 TypeScript 直出的 ESM `lib/client/index.js`。正式 DSH 的 client-modules 读取 default 路径，以脚本载入，要求 `window.__ModuleLoader__.load({id,factory})`。原包在隔离 Chrome 中报 `Cannot use import statement outside a module`，没有注册工厂；原七项模拟宿主/Node 入口测试未覆盖此差异。新增发布入口回归先失败，修复后通过。

只改本插件构建：esbuild 0.28.2 生成 `lib/client.js`，遵从固定正式上游闭包工厂协议并 externalize React；default 指向该工厂。新增 node 条件保留原 `lib/client/index.js` 消费方式，原类型路径与 API 不变。`src/client/index.ts`、`Brand.ts` 均未改动；槽位、H 标、名称、文案、主题默认值及释放行为保持。Node ESM / d.ts 与浏览器工厂都是有活动消费者的生成 lib，全部保留，不按构建文件名删除。

## 测试边界与复现

- SOURCE/FIXTURE：原七项行为断言保留，新增一项发布工厂回归；test:contract 自带 build。五项 SOURCE mutation（缺侧栏名、缺首页标、错误暗色、遗漏卸载、遗漏失败回滚）必须由对应行为测试失败抓住，无 skip。
- PACKAGE：干净消费者安装实际 tarball；公开类型消费 `test/consumer.types.ts`；固定正式默认 profile 的实际版本与 resolved；无头浏览器载入正式前端共享模块、五个正式 peer factory、正式 ClientModuleSystem、正式服务类及本插件工厂。
- FIXTURE：浏览器通过捕获正式前端的共享模块表来停止应用装配；槽位声明者和内存 settings scope 是隔离夹具。没有执行完整 sidebar/conversation apply、没有连接后端或挂载完整产品 UI。真实 API 生命周期证据不等于真实完整组合、UI 或 owner ACCEPTED。

仓内命令见 README。完整命令、退出码、npm integrity、默认 profile 解析表、先失败后通过日志及最终 tarball 保存在 `/Users/yzliu/.cache/hanamesh-runs/J1S2-BRAND-02`。

## 当前入口逐项处置

源码、原有效测试、README、OPEN_SOURCE、package/lock、tsconfig 和忽略规则仍有当前构建/发行/消费者，保留。新增脚本只服务本模块构建及门禁，测试和脚本不进入 tarball。发布清单为 README、COMPATIBILITY、OPEN_SOURCE、package.json、lib/client.js、lib/client 的两个 JS 与两个 d.ts。

`.npm-cache` 是未跟踪 npm 包缓存，不是源码且从来不在发布白名单；先移到本卡运行目录、记录并逐文件核对 hash，再清理本卡内副本。旧 `.npmrc` 先复制归档并记录来源 SHA/hash，当前设置改为 `${HOME}/.npm`，因为机器既有全局缓存指向不可写外置卷；不改全局配置、不删除源码残留来代替修正缓存位置。

基线诊断 tarball 与旧 npmrc 归档保留用于失败复现；不删除历史卡报告、冻结 ABI/模板/广播禁门、当前候选或其他卡工作树/进程。旧 task/J1S2-BRAND-01 的本地与远端分支只登记保留。无生产、数据库、迁移、签名、广播、付费模型或部署动作。schema/checksum、金额、安全头、权限、AppHost provision/LICENSE、devkit 及跨模块正式端口不属于此客户端插件，未触及。


## D-79 实现追加：正式检查与测试边界

2026-10-14 的批准方案补正式 shell.overlay 首次 React commit 校验当前三槽位，不依赖测试 global。原 src 修复限本插件；五个 peer、正式 dsh-v0.2.0-rc.2/639ed015397290b3745d163aafe02ffee4aa3f84、default/Node/类型入口及原业务默认值保留。此前2026-10-11“src未改动”的描述属于当次发布修复的历史证据，本次行为追加按上面的公开源码合约适配。

SOURCE 锁定31项测试覆盖缺项/形状、verification关闭的正式拒绝、全回滚/延迟错误/取消及合法等待；独立 PRODUCT 13个场景须由程序 main 后真实 CLIENT 运行。正式包移除 observer，verification包只追加只读观察；两包均使用同一正式行为，不允许观察面成为校验触发者。PACKAGE/API 隔离夹具仍不挂完整应用，无法代替完整产品或 owner 验收。完整命令与本版消费者resolved/包字节证据位于本卡运行目录 REPORT.md；不以历史成功代替本轮复核。

D-82 产物供给修正：verification 浏览器入口以同一公开 apply 显式启用只读观察，不再依赖固定宿主未提供的 Host 配置转发；正式 release 及 Node/类型入口保持。负例 producer 消费已审 fixture 清单并 external React，正常 bundle patch/元数据入口随 fixture 发布，不进入品牌包。目标宿主仍为 d743267388641bc76f17c45ce8b4c231aed1d32c（Desktop/DSH 0.2.1-alpha.2、Cordis 4.0.5-alpha.1、pnpm11.28.5）；此前 rc.2 SDK/默认 profile 证据仅是隔离参考。五个品牌 peer 保留，实际固定宿主严格安装/resolved/API 和真实产品结果由程序正常安装后采证，版本号差异本身不是不兼容证明。
