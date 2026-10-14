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


## D-79：正式兼容检查与可撤回生命周期

2026-10-14 追加。正式 `./client` 仍加载 `lib/client.js` 工厂，Node/类型入口不变；只含 `dsh.client`，仅 HanaMesh 客户端种子预装。本插件不修改上游或五个固定 rc.2 peer。首页显示标题仍由打包层卡负责，本模块仅注册独立双语字典，读取字典不表示显示标题已接入。

`apply(ctx, config?)` 新增可选 `BrandConfig`，`verification.enabled` 默认 false。正常插件经公开 `slots.inject('shell.overlay', ...)` 注册一次性、无可见内容的 React 检查组件；组件首次 `useLayoutEffect` 检查**当前已装配组合**的三项声明 `single/root`，成功立即释放检查组件及等待。固定 renderer 在 roster 就绪后挂载 AppFrame；正常动态启用也走组件首次 commit。首次 commit 前等待合法，成功后撤回/重声明继续等待、恢复原有贡献；不把等待预算当永久缺失，也不争夺 root。

新增 `validateSlots(ctx): void` 可用于同一实例的显式当前组合检查；产品入口自动调用它对应的同一实例检查。缺项抛 `BrandCompatibilityError`，`code=BRAND_SLOT_MISSING`、准确 slot/message；不兼容为 `BRAND_SLOT_INCOMPATIBLE`、actual.kind/scope 及 expected={kind:single,scope:root}。每项已声明时先校验其实际形状，异步声明注册错误也统一撤销本方全部字典、主题、槽位/等待及检查组件。原错误对象保持，附 `brandState`；释放失败附 `cleanupError` 并如实留下非零计数，不伪造成功。

正式故障在回滚后原生 `window.alert` 给出准确原因，再发送 `hanamesh-brand:rejected` CustomEvent 并抛原错。detail={code,message,slot?,actual?,expected?,state}；state 记录真实 phase/declarations/owned 和独立 conversation 文案及无关主题 token 的公开读回。无法核实其它贡献时 otherContributionsPreserved=false，不假造 true；告警设施自身失败会报告 BRAND_ERROR_NOTIFICATION_FAILED，仍保留原错误。该故障面不受 verification 开关控制。

默认正式 `npm run build` 移除观察面代码。D-82 测试构建 `npm run build -- --verification` 在浏览器入口用同一公开 `apply(ctx, {verification:{enabled:true}})` 启用只读观察；固定客户端加载器不透传 Host 配置，因此不要求 PM 从 profile 转发此值。正式入口、默认 false、Node/类型入口及拒绝/回滚实现保持。`window.hanameshBrandVerification` 仅有只读 inspect()，没有 validate。其 `hanamesh-brand:lifecycle` 发送实际 waiting/active/完成释放状态，含 compatibilityCheck=pending|passed。拒绝/卸载移除本方 global，事件只报告已实际释放的资源。产品验证只经 PM 提供的正常操作触发首次检查，不执行 JS 校验、启动服务或写用户 profile。

确定性例：首次三项 single/root→passed/active，slots=3、dictionary=1、themeLayer=1、waits=3；检查前暂无声明→pending/waiting，四等待；首 commit 缺 sidebar.brand.name→原生明确拒绝、该 slot 的 missing 事件及四项计数0；首 commit 前补齐→成功；通过后合法撤回 hero→waiting，重声明→active；正常卸载→disposed/0，原 contribution 由各上游 disposer 还原。

## 程序验证供给

卡 `npm test` 保持 SOURCE/FIXTURE，固定 `node --test --test-reporter=tap scripts/segflow-plugin.test.mjs` 为 main 后独立 PRODUCT。依赖 `playwright-core@1.56.0` 仅为开发验证驱动，无浏览器下载/服务启动代码，不进发布包。PM 准备真实 CLIENT 的正常安装/配置、页面选择与可见 ready；测试只消费公开输入 `SEGFLOW_ENV_DIR/hanamesh-brand-inputs.json` 和 `SEGFLOW_PORT_CLIENT`。字段及13个场景见锁定 `test/product-inputs.md`，其“提案”文字为锁题历史，本节是实现后的提供方说明。

D-82 实际目标是上游 `d743267388641bc76f17c45ce8b4c231aed1d32c`、Desktop/DSH `0.2.1-alpha.2`、宿主 Cordis `4.0.5-alpha.1`、bundled pnpm `11.28.5`。旧 rc.2 SDK 仅为隔离 PACKAGE/API 参考；品牌五 peer 声明仍 rc.2。宿主身份、实际严格安装日志/resolved 和公开 default 加载分别采证；未取得真实安装结果前不判兼容或升级，不使用 override、版本豁免或旧宿主迁就测试。输入 schema2 是本方测试格式，生成和正常安装归 PM environment。

同一提交的两种正常包：

```sh
npm ci
npm pack --pack-destination <release目录>
npm run build -- --verification
npm pack --ignore-scripts --pack-destination <verification目录>
npm run build
```

第二次 ignore-scripts 只为保留刚完成的显式 verification 构建；不省略实际 build，也不进入正式发布。两包各自记录 SHA256/来源提交、五 lib 文件 hash，PM 正常安装它们，验证按实际已执行脚本字节对照。

附属负例 `test/negative-declarer.client.mjs` 是锁定 FIXTURE；`node scripts/build-negative-declarer.mjs --out-dir <隔离fixture目录>` 消费其已审 packageInputs，生成共享 React 的 client 工厂、Host 元数据入口、正常 manifest 和 cordis.patch.yml。再用 `npm pack <该目录> --ignore-scripts --pack-destination <隔离包目录>` 供正常安装；fixture renderer peer 为目标 SDK `0.2.1-alpha.2`，不改变品牌 peer。fixture 只经 shell.overlay 持有自己的控件及声明，六种 mode 用正常 select/declare/withdraw 切换；不争 root、不撤他方或触发品牌检查。真实原声明者须先正常退出；碰撞显示真实错误。正例仍使用真实 provider，fixture 不证明正式兼容性。PM 正常操作、选窗及 schema2 供给缺口一次列在锁定输入文档；本模块不启停 CLIENT 或写用户 profile。

公开 inputs.diagnosticBudgets 默认毫秒：cdpConnectMs=30000、uiOperationMs=30000、lifecycleSignalMs=15000、productCaseMs=120000、teardownMs=5000；可具名覆盖，整数1..2147483647是 Node timer 表达范围，均为测试诊断、非安全策略。参数及默认等待显式传给 Playwright。耗尽仅报 DIAGNOSTIC_UNFINISHED、预算/现场/原 cause，不断定缺槽位、不加时重试；取消/结束解除计时器、waiter、DOM/CDP订阅，断开自己的 transport、不停止 CLIENT。真实装配未完成及无法确认释放保留故障与现场，不能当产品通过。完整工程门、真实产品门与 owner 门均保留。
