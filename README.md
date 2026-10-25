> I25 / B04（2026-10-21）：主色范围按编排新决定收敛为插件局部；本文之前版本的全局主题覆盖验收是历史行为，本候选不再采用。基于 B06 候选保留局部兼容错误面。

# @hanamesh/brand

## 0.1.3 候选

只将 npm 包名和客户端模块键改为 `@hanamesh/brand`。Cordis id `hanamesh-brand`、品牌贡献、事件与字典保持，静态资产字节及摘要不变。独立发布经既有 0.1.9 平台门，不加入 DSH 套件三目标。

## 0.1.2 发布说明

合入C已审B17 `c870fa5` 的公开静态资产路径、清单/摘要与来源许可说明；正常包供H消费，图形许可仍UNKNOWN，不把仓MIT当图形/商标授权。保留0.1.1的局部主色、有限官方rc.2准入和下述M01已知限制；运行源码及三个槽位不变，不接管原生welcome/全局favicon/标题，不改客户端。源码/包/原生/owner门仍分列。

## 0.1.1 发布说明

本版将已审 `9434c9cea630caa5b4b29b6f9bb327cb205cde85` 的 B04 / B06 / F01 行为固版：紫色仅归插件自己的品牌组件，保留兼容拒绝与回滚、插件内错误区和两层错误原因传播；五个 DSH peer 有限准入 `0.2.1-alpha.2 || 0.2.1-rc.2`、Cordis `4.0.5-alpha.1 || 4.0.5`，React 18.3.1。版本与发布说明之外没有新增运行行为。本版不含 B17 静态资产候选，也不改原生 welcome、全局 favicon 或会话标题。

**C-PL-M01 是已知限制，不是修复 PASS。** 官方 0.2.1-rc.2 的既有隔离故障注入实测（Docs `b1d99995`）表明：

- 客户端同步 apply 抛错时，官方启动失败对话框及已查 crash 文件只有启动失败摘要，没有原兼容原因与错误面失败原因的完整正文。
- apply 返回 rejected Promise，或实际 Brand 的延迟校验与错误面注册失败时，普通插件管理页仍可能显示 Running；观察到的准确原因在原生 DevTools Console。DevTools 是开发者诊断，不能当普通用户错误面。
- 普通开关禁用后显示 Off；卸载清理器是否在该整条真实路径中执行、双原因日志是否送达尚未证实，不能笼统声称所有失败均可从日志看到。

这些限制不阻塞已审 F01 的有限版本准入，但没有满足失败始终可见的 M01 闭环。保留原 RED 证据；不新增替代弹窗、重试、客户端改造或上游请求。错误区正常可用时仍按原公开槽处理兼容拒绝。源码/组件、正常包消费者、各版本真实 UI 与 owner 验收分别判断，本次版本元数据本身不补齐真实 UI 证据。

HanaMesh 的客户端品牌插件，提供 `dsh.client` 和可安装的 `dsh.bundle` profile 层。包根的空 `apply()` 仅供 Host Loader 激活元数据，没有业务服务。安装后的启用范围由 profile 的 bundle 列表决定；本仓不修改 DMG 预装、网站或用户 profile。

- 注册 `sidebar.brand.mark`、`sidebar.brand.name`、`conversation.hero.brand.mark`，使用旧 fork 的紫色 H 标和 HanaMesh 名称。
- 品牌紫色只在本插件 H 标组件自身使用；不调用 `theme.overrideTokens()`，不覆盖工作台 business-primary。宿主主题仅通过公开 getTheme 只读核验，包含 business-primary 的全部 token 无豁免；其它插件与工作台保持原样。
- `owned.themeLayers` 保留为兼容诊断字段，当前恒为 0。
- 在 `hanamesh.brand` namespace 注册中英文首页文案；卸载注销字典。
- 使用声明感知的 `slots.inject()`，跟随宿主槽位声明、注销及重新声明。
- 三个单槽使用公开 `priority: -80`，低于官方默认 `0`，不依赖安装顺序。官方 occupant 保留，品牌卸载后恢复；`order` 仅控制列表顺序。

## 字典用途与首页标题归属

保留 `hanamesh.brand` 双语字典，作为 HanaMesh 品牌标题文案的集中参考，供打包层替换界面文字时人工核对。当前没有显示组件读取该 namespace，它不覆盖任何运行时显示文字，也不表示打包层已自动接入。字典注册及卸载行为由本仓测试验证。

PM 已将首页标题替换从本卡移至 `J1S2-DESK-02`，按 D-12 a 在打包层处理。本模块只负责三个品牌槽位和可撤回的主题色覆盖；该历史分工不表示本轮真实 UI 或 owner 已验收。

## Profile 安装与启用

当前目标为 DSH/Desktop `0.2.1-alpha.2`、Cordis `4.0.5-alpha.1`。五个 DSH peer 精确对齐 `0.2.1-alpha.2`，React 保持 `18.3.1`。在隔离的目标 profile 用正常严格依赖安装品牌 tgz 后，将 `@hanamesh/brand` 加在已有 Web bundle 层之后：

```json
{
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@hanamesh/brand"]
    }
  }
}
```

这是 profile 的 `package.json` 片段，合并到现有清单；保留其他 bundle 及依赖。包内 `dsh.bundle.patch` 指向 `./cordis.patch.yml`，只插入一条 `id: hanamesh-brand`、`name: @hanamesh/brand`。目标 `client-modules` 从活跃 Host Loader row 发现 `dsh.client`，因此根导出的空 metadata `apply()` 是必要的。无需关闭官方品牌插件或修改上游代码。

## 验证与打包

Node 24：`npm ci && npm test`；`npm run check` 做类型检查；`npm pack` 构建客户端及空 Host 元数据发行文件。测试覆盖槽位注册与注销、延迟声明及重建、主题层覆盖及移除、字典注册及移除、安装失败回滚和发行入口。测试是组件级模拟宿主验证，不是 HanaMesh.app 的真实 UI 验收。

`npm run build` 生成空 Host 元数据入口 `lib/index.js` / `lib/index.d.ts`、Node ESM/类型入口 `lib/client/index.js`、`lib/client/index.d.ts`，及 DSH 浏览器闭包工厂 `lib/client.js`。`exports["./client"].default` 供正式 DSH 客户端模块加载器读取，`node` 条件保留组件测试及 Node 消费入口。浏览器工厂按正式上游协议注册到 `window.__ModuleLoader__`，React 由宿主模块表提供。

门禁：`npm run types`、`npm run build`、`npm run test:contract`（自带构建）、`npm run toolchain`、`npm run preflight`、`npm run test:mutation -- --run-dir <本卡运行目录>/evidence`、`npm pack`。Mutation 在指定运行目录中建立并删除隔离源码副本，逐项核验实际行为断言能发现破坏；不改当前源码或删减原断言。

本轮源/API 复核：`npm run test:upstream -- --upstream <目标 desktop checkout>` 直接读取目标上游 profile、SlotRegistry、官方品牌源码及 Host Loader 构建产物，验证 bundle 组合、空 Host 激活、两种装载顺序、撤回/重声明及卸载恢复。此探针使用隔离 profile、locale/theme 夹具，Node 中 CSS 为空测试资产，不渲染完整 UI；需要该 checkout 的现有依赖和构建产物。测试只读取代码仓，不读取或哈希文档仓。

正式包复核见 [COMPATIBILITY.md](COMPATIBILITY.md)。复核脚本 `npm run test:profile -- --consumer <干净消费者>` 只解析本卡隔离的默认 profile，不启动宿主服务；`npm run test:package -- --consumer <干净消费者>` 用无头 Chrome 执行真实上游模块加载器及服务 API，设置存储与槽位声明者为具名隔离夹具。干净消费者须安装 `@deepseek-ai/dsh@0.2.1-alpha.2`、本卡 `npm pack` 产物及测试驱动 `playwright-core@1.56.0`；不使用 force、legacy-peer-deps 或版本覆盖。可用 `CHROME_EXECUTABLE` 指定浏览器路径，默认读取 macOS Chrome 应用的可执行文件，使用全新临时浏览器 profile。

该 PACKAGE/API 复核不启动完整默认应用，不连接服务器或持久化用户配置，不等于真实组合功能或产品 UI 验收。首页显示标题仍由 `J1S2-DESK-02` 打包层负责；本插件注册的品牌 namespace 不覆盖 conversation 字典。

开源清单见 [OPEN_SOURCE.md](OPEN_SOURCE.md)。


## D-79：正式兼容检查与可撤回生命周期

2026-10-14 的生命周期实现继续保留。正式 `./client` 仍加载 `lib/client.js` 工厂，Node/类型入口不变；本轮新增 bundle/Host 元数据及目标 alpha peer 对齐，不修改上游。首页显示标题仍由打包层卡负责，本模块仅注册独立双语字典，读取字典不表示显示标题已接入。

`apply(ctx, config?)` 新增可选 `BrandConfig`，`verification.enabled` 默认 false。正常插件经公开 `slots.inject('shell.overlay', ...)` 注册一次性、无可见内容的 React 检查组件；组件首次 `useLayoutEffect` 检查**当前已装配组合**的三项声明 `single/root`，成功立即释放检查组件及等待。固定 renderer 在 roster 就绪后挂载 AppFrame；正常动态启用也走组件首次 commit。首次 commit 前等待合法，成功后撤回/重声明继续等待、恢复原有贡献；不把等待预算当永久缺失，也不争夺 root。

新增 `validateSlots(ctx): void` 可用于同一实例的显式当前组合检查；产品入口自动调用它对应的同一实例检查。缺项抛 `BrandCompatibilityError`，`code=BRAND_SLOT_MISSING`、准确 slot/message；不兼容为 `BRAND_SLOT_INCOMPATIBLE`、actual.kind/scope 及 expected={kind:single,scope:root}。每项已声明时先校验其实际形状，异步声明注册错误也统一撤销本方全部字典、主题、槽位/等待及检查组件。原错误对象保持，附 `brandState`；释放失败附 `cleanupError` 并如实留下非零计数，不伪造成功。

兼容故障在回滚后、错误区能够注册时，通过本插件的 `shell.overlay` 非模态错误区显示准确原因，不调用原生 `window.alert`；仍发送 `hanamesh-brand:rejected` CustomEvent。自动 React 检查及延迟声明局部呈现已记录的兼容失败，不抛穿宿主；显式 `validateSlots(ctx)` 仍抛同一个准确错误。未知的检查读取错误也在本错误区保留原因；初始化期间非兼容的底层错误保持抛出。detail={code,message,slot?,actual?,expected?,state}；state 记录真实 phase/declarations/owned 和独立 conversation 文案及无关主题 token 的公开读回。无法核实其它贡献时 otherContributionsPreserved=false，不假造 true；错误面注册失败记录 BRAND_ERROR_PRESENTATION_FAILED 并保留原错误及 presentationError。该故障面不受 verification 开关控制。

默认正式 `npm run build` 移除观察面代码。D-82 测试构建 `npm run build -- --verification` 在浏览器入口用同一公开 `apply(ctx, {verification:{enabled:true}})` 启用只读观察；固定客户端加载器不透传 Host 配置，因此不要求 PM 从 profile 转发此值。正式入口、默认 false、Node/类型入口及拒绝/回滚实现保持。`window.hanameshBrandVerification` 仅有只读 inspect()，没有 validate。其 `hanamesh-brand:lifecycle` 发送实际 waiting/active/完成释放状态，含 compatibilityCheck=pending|passed。拒绝/卸载移除本方 global，事件只报告已实际释放的资源。产品验证只经 PM 提供的正常操作触发首次检查，不执行 JS 校验、启动服务或写用户 profile。

确定性例：首次三项 single/root→passed/active，slots=3、dictionary=1、themeLayer=1、waits=3；检查前暂无声明→pending/waiting，四等待；首 commit 缺 sidebar.brand.name→原生明确拒绝、该 slot 的 missing 事件及四项计数0；首 commit 前补齐→成功；通过后合法撤回 hero→waiting，重声明→active；正常卸载→disposed/0，原 contribution 由各上游 disposer 还原。

## 程序验证供给

卡 `npm test` 保持 SOURCE/FIXTURE，固定 `node --test --test-reporter=tap scripts/segflow-plugin.test.mjs` 为 main 后独立 PRODUCT。依赖 `playwright-core@1.56.0` 仅为开发验证驱动，无浏览器下载/服务启动代码，不进发布包。PM 准备真实 CLIENT 的正常安装/配置、页面选择与可见 ready；测试只消费公开输入 `SEGFLOW_ENV_DIR/hanamesh-brand-inputs.json` 和 `SEGFLOW_PORT_CLIENT`。字段及13个场景见锁定 `test/product-inputs.md`，其“提案”文字为锁题历史，本节是实现后的提供方说明。

D-82 实际目标是上游 `d743267388641bc76f17c45ce8b4c231aed1d32c`、Desktop/DSH `0.2.1-alpha.2`、宿主 Cordis `4.0.5-alpha.1`、bundled pnpm `11.28.5`。旧 rc.2 SDK 仅为历史隔离 PACKAGE/API 参考；本轮品牌五 peer 已对齐 `0.2.1-alpha.2`，Cordis 对齐 `4.0.5-alpha.1`。宿主身份、实际严格安装日志/resolved 和公开 default 加载分别采证；未取得真实安装结果前不判兼容或升级，不使用 override、版本豁免或旧宿主迁就测试。输入 schema2 是本方测试格式，生成和正常安装归 PM environment。

同一提交的两种正常包：

```sh
npm ci
npm pack --pack-destination <release目录>
npm run build -- --verification
npm pack --ignore-scripts --pack-destination <verification目录>
npm run build
```

第二次 ignore-scripts 只为保留刚完成的显式 verification 构建；不省略实际 build，也不进入正式发布。两包各自记录 SHA256/来源提交、全部发行 lib 文件 hash，PM 正常安装它们，验证按实际已执行脚本字节对照。

附属负例 `test/negative-declarer.client.mjs` 是锁定 FIXTURE；`node scripts/build-negative-declarer.mjs --out-dir <隔离fixture目录>` 消费其已审 packageInputs，生成共享 React 的 client 工厂、Host 元数据入口、正常 manifest 和 cordis.patch.yml。再用 `npm pack <该目录> --ignore-scripts --pack-destination <隔离包目录>` 供正常安装；fixture renderer peer 为目标 SDK `0.2.1-alpha.2`，与当前品牌 peer 对齐。fixture 只经 shell.overlay 持有自己的控件及声明，六种 mode 用正常 select/declare/withdraw 切换；不争 root、不撤他方或触发品牌检查。真实原声明者须先正常退出；碰撞显示真实错误。正例仍使用真实 provider，fixture 不证明正式兼容性。PM 正常操作、选窗及 schema2 供给缺口一次列在锁定输入文档；本模块不启停 CLIENT 或写用户 profile。

公开 inputs.diagnosticBudgets 默认毫秒：cdpConnectMs=30000、uiOperationMs=30000、lifecycleSignalMs=15000、productCaseMs=120000、teardownMs=5000；可具名覆盖，整数1..2147483647是 Node timer 表达范围，均为测试诊断、非安全策略。参数及默认等待显式传给 Playwright。耗尽仅报 DIAGNOSTIC_UNFINISHED、预算/现场/原 cause，不断定缺槽位、不加时重试；取消/结束解除计时器、waiter、DOM/CDP订阅，断开自己的 transport、不停止 CLIENT。真实装配未完成及无法确认释放保留故障与现场，不能当产品通过。完整工程门、真实产品门与 owner 门均保留。

## 2026-10-21候选：插件内兼容错误区

品牌标志、字典、主题和正常检查资源在兼容失败时全部撤回；单独拥有的错误区经既有shell.overlay注册，保持可见直到插件正常卸载。错误区使用宿主公开主题token，不更改客户端、不会自动修复/重试，也不改变全局business-primary的既有值。错误区呈现code/slot与实际/预期形状，原工作台继续使用。`BrandState.owned`仅计品牌贡献；可选`errorPresentation`另报waiting/visible和其slots/waits，等待没有公开根槽不冒可见成功。卸载同时释放错误区与等待。新版产品验证断言零原生dialog且本插件错误区可见；本候选源码/组件截图不冒完整真实客户端验证。

清理失败且错误区仍可用时，错误区显示仍拥有的资源计数和原清理原因；错误区自身失败的普通界面限制见本页 0.1.1 发布说明，不声称标志或主题已全部撤回。公开声明读取失败由`declarationReadError`具名保留，不能把读取失败当空声明。

## 静态资产（B17 I1）

H 使用的静态图形路径、格式、摘要、来源及许可未定项见 [ASSETS.md](ASSETS.md)，机器可读说明为公开 `@hanamesh/brand/assets/manifest.json`。两份原始 SVG 随正常包交付，当前品牌槽组件与运行行为保持原样。

## 发布检查：平台依赖闭包（不可关闭）

`DSH_PNPM_PLATFORM_CLOSURE` 是正确性不变量，Mac/Windows/Linux 同样适用：DSH 自带 pnpm 11.7.0 处理不适用平台 optional 子包时可能安装完不退出，导致 DSH 持续等待。正常 tarball、bundled 包及完整锁定依赖闭包发现 os/cpu/libc 字段或平台子包 optionalDependencies 即拒绝，报具体包名/路径；缺闭包证据也拒绝。不能以开关、超时、重试、omit-optional 或静默兜底绕过；应改用单包内含多平台文件的中立依赖。

运行 `npm run release:check` 正常打包并检查；发布仅用 `npm run release:publish`，发布已检查的同一 tarball。直接目录 npm publish 会被 prepublishOnly 明确拒绝。开发工具 `@hanamesh/release-platform-gate` 仅 devDependency，先按接线请求复制经 SHA 固定的正常工具包并更新冻结锁；CI 必须接入这个发布门。详细输出包含不可关闭的原因、正常包/锁 SHA 和扫描路径；absent optional peer 按 npm 定义列明，不等同 optionalDependencies。

共享门已升级到 R2 PASS 的 0.1.9，原正常工具 tar SHA256 为 `c72010c96a5f22e36d65f6c1fd850e583dead7e843644eba1657b4416d9cbd0d`；最终 main 来源见 `vendor/release-platform-gate.json`。本仓接线仍须 R1 独审，不等于 npm 发布放行，本次不发布。

有限依赖形态合同为正常开发工具包中的 `DEPENDENCY_SHAPES.md`（dependency-shapes-v1）：支持 registry/git/file/link/tarball/workspace/bundled/vendor 的明确子集，不能当作 npm/pnpm 的无限全集。合同外一律 `UNSUPPORTED_DEPENDENCY_SHAPE`，逐项公开 `package/path/shape/why/action/contract`；缓存、bundle、环境变量或额外 CLI 开关都不能绕过准入。已知缺证据、冻结漂移、完整性和平台违规仍各自具名拒绝，不能以“任意失败”代替正确理由。

发布说明：DSH 内置 pnpm 11.7.0 处理不适用平台 optional 子包时可能安装后不退出，使 DSH 一直等安装结束；因此本门是正确性不变量（`disableable:false`），没有关闭开关。所有 OS/CPU/libc 都必须具备平台中立的完整安装依赖闭包，不能用本机已装、omit-optional、ignore-scripts、超时、重试、放宽断言或改客户端代替。每次 PASS/FAIL 的 JSON/receipt 都包含触发背景和不能关闭的 reason；release:check 正常 pack，release:publish 只发布同一已检查且再核 SHA 的 tar。源码目录发布由 prepublishOnly 拒绝，CI 的 verify:pack/preflight 必经该门；无可失败 job 或旁路入口。

固定提供方 main 提交 `13ec0db3bc6aa6b6235f2105d3f0a6b998855ff5`，与 R2 审过的 0.1.9 正常包6载荷逐字一致；来源/归档摘要见 `vendor/release-platform-gate.json`。
