# 当前目标兼容性：DSH 0.2.1-alpha.2

2026-10-15，本轮适配目标为 HanaMesh Desktop 所用 DSH `0.2.1-alpha.2`、Cordis `4.0.5-alpha.1`。`package.json` 的五个 DSH peer 精确对齐 `0.2.1-alpha.2`，Cordis 精确对齐 `4.0.5-alpha.1`，React 保持 `18.3.1`。`package-lock.json` 保存正常严格 npm 安装得到的 registry URL、完整性和间接依赖版本；没有 override、legacy-peer-deps、force 或版本豁免。

## 上游协议与最小适配

上游源码来自相邻 `hanamesh-desktop` checkout，实际验证时 HEAD 为 `60efccc00c6a160bf9bddd0d137de14946a5e69a`（该 fork 的目标上游为 `d743267388641bc76f17c45ce8b4c231aed1d32c`）。此处记录源码/API 探针，不把源码探针当 npm 发布包或真实产品验收。

- `packages/boot/app-boot/src/profile.ts` 的 `loadProfileDirectory()` 读取 `dsh.profile.bundles`，要求每个包声明 `dsh.bundle.patch`，否则将它加入 `skippedBundles`。原品牌包缺此声明，已由新探针先失败复现。
- 本包新增 `dsh.bundle.patch: ./cordis.patch.yml`；patch 只插入一条 `id/name: hanamesh-brand`。README 给出加在已有 base/Web 层之后的 profile 清单片段，不修改打包预装或实际用户 profile。
- `packages/client/modules/src/index.ts` 只扫描有 fiber 且启用的 Host Loader row。Loader 先导入包根，再激活插件，因此新增根导出的空 `apply()`，仅激活客户端元数据。它不提供业务服务。发布包包含对应 JS、类型和 patch。
- `packages/client/ui-slots/src/index.ts` 对 single 槽按 `priority` 升序选首项；同一优先级重复注册报错，`order` 不控制 single 选举。上游官方品牌默认 priority 为 `0`。原品牌的 `order: 80` 仍落在 priority `0`，两种装载顺序均真实冲突。现改三个品牌槽为 `priority: -80`；保留官方 occupant，品牌卸载后恢复官方项。
- `shell.overlay` 是 list 槽，现有兼容检查点仍使用 `order: 80`；首次 React commit 检查和已有拒绝、回滚行为保持。

## 发行入口

浏览器 `exports["./client"].default` 仍为 `lib/client.js`，按正式 `window.__ModuleLoader__.load({id,factory})` 闭包协议注册，React 由宿主模块表提供。Node/类型入口仍为 `lib/client/index.js` / `lib/client/index.d.ts`。新增包根 `lib/index.js` / `lib/index.d.ts` 仅供 Host 元数据激活；`./cordis.patch.yml` 可正常解析。

`npm run preflight` 核对目标 peer、bundle 声明、正式入口以及完整发布白名单。发行内容为 README、COMPATIBILITY、OPEN_SOURCE、package.json、cordis.patch.yml、客户端 JS/类型和空 Host JS/类型。源码、测试、缓存和开发驱动不进入 tgz。

## 本轮验证与边界

- Node `24.13.1` 下正常 `npm install --ignore-scripts --strict-peer-deps` 成功，五个 peer 和 Cordis 实际 resolved 与声明一致。`--ignore-scripts` 仅隔离依赖获取；本模块构建由后续命令显式执行。
- `npm run preflight` 包含 toolchain、类型、构建、31 个 SOURCE/FIXTURE 测试和发布清单检查。
- `npm run test:upstream -- --upstream <目标 desktop checkout>` 直接调用目标上游的 profile loader、Host Loader、SlotRegistry 和官方品牌源码：验证品牌 bundle 不被跳过、组合只插入一条自己的 row、空 Host 入口激活成功、官方/品牌两种装载顺序、撤回/重声明、品牌卸载后官方 occupant 恢复。
- 上游源码/API 探针不启动默认应用或任何服务，不访问用户 profile；locale/theme 使用具名隔离夹具，Node 中 CSS 是空测试资产，不渲染完整组件。已有组件测试继续覆盖字典、主题、缺槽/形状拒绝及回滚。
- `npm pack` 产物用于独立严格安装复核；新测试和构建只读取代码仓，不读取或哈希文档仓。

先失败与当前命令日志保存在 `/Users/yzliu/.cache/hanamesh-runs/stage2-brand-20261015`。完整 Desktop UI、正常插件管理界面中的安装/启用/卸载、DMG 预装以及 owner ACCEPTED 均不由这些源码/API 测试证明，本轮未执行真实产品或 owner 验收。

## 历史证据

Q61 于 2026-10-11 复核 `dsh-v0.2.0-rc.2` / `639ed015397290b3745d163aafe02ffee4aa3f84`，发现原 ESM default 不能作为 DSH 浏览器脚本加载，随后新增正式闭包入口和共享 React 构建。该 rc.2 的干净消费者、默认 profile 和隔离浏览器 API 结果只属于历史版本，不能证明本轮 alpha 兼容或产品通过。

D-79/D-82 的正式首次 commit 检查、观察构建、负例 fixture 和独立产品验证接口保留。本轮只同步其 peer 声明断言及文字，不扩展旧验收机制。观察构建仍无 validate 触发入口；首页标题仍由打包层负责，本品牌 namespace 不覆盖 conversation 字典。

## 错误面自身失败（C-PL-M01）

错误面同步或延迟注册失败时，`hanamesh-brand:rejected` 的 `presentation.message` 与 `state.errorPresentation.status=failed` 公开保留该原因，原兼容错误 code/slot/cleanup 仍保留。入口抛出包含两层原因的 AggregateError，不宣称已呈现或正常成功。错误面卸载失败同样公开并抛出，保留未清理的计数；不以 console、alert、重试或客户端桥掩盖失败。普通兼容失败且错误面可用时继续留在插件内。
