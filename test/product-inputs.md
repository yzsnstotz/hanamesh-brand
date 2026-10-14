# J1S2-BRAND-02 产品验证公开输入（提案，待审）

本文件定义本模块供 PM 接入的正常输入和观察方式，**不是已经存在的 Desktop 跨模块 API**。安装、配置、选择自有窗口和产品就绪由 PM environment 服务准备/启动命令实现；本卡不编造或启动这些服务。卡 `npm test` 不运行产品测试。main 推送后，程序运行固定 `scripts/segflow-plugin.test.mjs`。

## 正常产物与观察面

提交的正常 `npm pack` tgz（仍只含 dsh.client）和该 tgz 的 SHA256、来源提交、lib/client.js、Node JS、类型文件 SHA256。正式 default 入口保持 `./lib/client.js`，正式 tag 保持 `dsh-v0.2.0-rc.2` / `639ed015397290b3745d163aafe02ffee4aa3f84`，五 peer 保持 rc.2。

正式行为提案（尚未实现）：新增 `validateSlots(ctx)`，按真实公开 `slots.snapshot()` 检查三个品牌声明为 single/root。通过 **公开增量槽位 `shell.overlay`** 安装一次性 React 检查组件，其首次 `useLayoutEffect`/commit 调用同一校验；成功立即撤销检查组件及其 inject 等待。固定 renderer 在完整客户端 roster 稳定后 mount AppFrame；此时读取当前已装配组合，绝不声称这是上游“永久缺失终态”。动态正常启用本插件也走同一首次 commit。

依据：固定上游 `upstream/packages/client/ui-renderer/src/client/registry.ts:28–42` 明示禁止争夺 root，扩展用 shell.overlay；`ui-renderer/src/client/index.ts:1–4,59–98` 的 roster/mount/React 路径；`git show 639ed015:packages/client/ui-layout/src/client/index.ts:98,178` 的 list/root 声明与注册（完整来源副本存运行目录 evidence/d78-upstream）。初始装载、未首次 commit 前的 inject 等待合法；第一次兼容检查通过后，provider 合法撤回、延迟再声明继续 waiting/active，不反复检查成缺失。若 shell.overlay/AppFrame 未装配，诊断未完成，不能推断永久缺槽位。

首次检查缺项/已声明形状不兼容以及异步真实注册错误，统一回滚本方所有贡献、等待和检查组件，保留准确 cause。在正式构建且 verification 关闭、无测试 global 时也必定执行：以原生 `window.alert(message)` 给用户准确缺项/实际形状原因，随后发送正式 `hanamesh-brand:rejected` CustomEvent，再抛原始错误。事件只在完成回滚后发出，detail 为 `{code,message,slot,actual?,expected?,state}`；state 包含 phase=rejected、owned 四项真实计数及独立其它贡献前后保持结果。事件是本方正式故障诊断，**不受 observer 开关控制**；不造上游终态或新权限。所有回调统一走本方幂等回滚，以防 alert/React 重入和声明回调错误留下其它槽位。

测试版用现有构建的显式 verification 选项生成正常 tgz；正式构建消除 observer，公开配置 `verification.enabled` 默认 false。测试版 enabled=true 时仅额外提供：

- `window.hanameshBrandVerification.inspect()`：JSON-safe 当前 phase、`compatibilityCheck`（pending/passed）、真实 snapshot 的 declarations(type/name/kind/scope/declaredBy)、owned(slots/dictionaries/themeLayers/waits)、locale/getLocale().active、brandHeadline（locale.bind 当前语言读回）、otherContributionsPreserved。等待首次检查时四个 inject，成功后三个；observer 不改语言、主题或装配。
- `hanamesh-brand:lifecycle` DOM CustomEvent：等待/声明/撤回/重声明及正常卸载真实快照；disposed/rejected 只在完成自身释放后发送。global 随本插件释放，测试 listener/CDP binding 由测试释放。
- **删除拟议的 global.validate**：观察面没有执行兼容校验或改变装配的权限；产品验证只用正常禁用/重新启用按钮使正式组件真实 commit，从同一正式错误事件/原生 dialog 观察拒绝。
- 具名 `BRAND_SLOT_MISSING`、`BRAND_SLOT_INCOMPATIBLE`：准确 slot/message/actual/expected；注册/主题错误保持同一 cause。

这些是本模块的新增提案，尚未实现/发布。实现阶段只追加本方类型/文档；测试判题不依赖私有 root Context、模块表、手造 __DSH_BOOT__ 或 mock renderer。

## PM 产品环境输入格式

仅使用 SEGFLOW_ENV_DIR/SEGFLOW_PORT_CLIENT。PM 将正常安装/配置输入描述放在 `$SEGFLOW_ENV_DIR/hanamesh-brand-inputs.json`，不是观察结果、通过收据或模拟 DOM：

```
{
  "schema": 1,
  "upstreamTag": "dsh-v0.2.0-rc.2",
  "upstreamSha": "639ed015397290b3745d163aafe02ffee4aa3f84",
  "installedPackageDir": "<本次环境中的正常已装候选目录>",
  "artifact": {"sourceSha": "<本版main提交>", "tarball": "<正常安装的同一个tgz>", "sha256": "<tgz hash>",
    "files": {"lib/client.js": "<hash>", "lib/client/index.js": "<hash>", "lib/client/index.d.ts": "<hash>", "lib/client/Brand.js": "<hash>", "lib/client/Brand.d.ts": "<hash>"}},
  "peerPackageDirs": {"<五个正式peer全名>": "<正常resolved目录>"},
  "release": {"installedPackageDir": "<正常正式构建且verification关闭的目录>",
    "artifact": {"sourceSha": "<同一提交>", "tarball": "<release tgz>", "sha256": "<hash>", "files": {"<同上五文件>": "<hash>"}},
    "peerPackageDirs": {"<五peer全名>": "<release正常resolved目录>"}},
  "diagnosticBudgets": {"cdpConnectMs": 30000, "uiOperationMs": 30000,
    "lifecycleSignalMs": 15000, "productCaseMs": 120000, "teardownMs": 5000},
  "cases": {"<下表case>": {
    "release": false,
    "targetId": "<程序选择的自有Desktop主窗口target>",
    "ready": "<该正常页面已装配的可见产品表面CSS选择器>",
    "bundleUrls": {"hanamesh-brand": "<实际default加载URL>", "<五peer全名>": "<实际正常加载URL>"},
    "locators": {"sidebar.brand.mark": "<正常UI位置>", "sidebar.brand.name": "<正常UI位置>",
      "conversation.hero.brand.mark": "<正常UI位置>", "themeRoot": "<实际主题承载元素>"},
    "preservedControls": ["<原欢迎控件>", "<原侧栏控件>"],
    "actions": [{"role": "<正常UI角色>", "name": "<公开可访问名称>"}],
    "palette": "light|dark",
    "originalColor": "<按固定官方/既有其它层给出的原色预期>",
    "originalText": {"<三槽位>": "<卸载后原内容预期>"}
  }}
}
```

没有额外服务端口/权限；上述文件是本方公开测试输入，不冒称对端已有合约。输入描述必须对应正常安装的真实实例；PM 可用原生已公开 UI/配置准备和选择实例。本卡不写用户 profile，不通过 CDP 执行安装、伪造 boot、替换上游实现或投放 fake page。

| case | 正常输入/动作及预期 |
|---|---|
| light / dark | 正常已装、三个真实声明 active，分别用公开设置en/zh，按实际设置呈现 H/HanaMesh/H、#7059e8/#a99aff，原欢迎/侧栏控件可见 |
| unload | 从正常 active 开始，PM 指定正常禁用 UI 操作；等待真实 disposed 事件，零本方资源、全局观察面移除、实际外观/原色恢复 |
| missing:sidebar.brand.mark / missing:sidebar.brand.name / missing:conversation.hero.brand.mark | 从正常组合开始，经正常 owner 配置操作撤回指定声明；不把撤回本身判失败；再正常禁用/启用品牌，实际首次 React commit 检查当前组合；观察正式 missing 事件和原生用户错误、全清理，不调用 observer 校验 |
| release-missing:sidebar.brand.mark / release-missing:sidebar.brand.name / release-missing:conversation.hero.brand.mark | release=true，正式 observer 消除、verification=false；开始真实正常 H/HanaMesh/H 及双色，禁用声明者后正常禁用/重新启用品牌；真实 commit 自动拒绝，准确正式故障事件/原生提示、零资源、原色/原内容还原，全程无 test global |
| incompatible:kind / incompatible:scope | 从正常组合开始，经真实声明者的正常输入得到 hero 的 chain/session 形状；本方回调准确拒绝、实际原因、零残留。本卡提供test/negative-declarer.client.mjs，由现有构建工具生成正式工厂后在隔离CLIENT正常装入，config.mismatch=kind|scope及显式正priority；先正常禁用原hero声明者，root负例entry必须shadowed，绝不接管产品UI。它是具名负例FIXTURE，真实调用官方registry；不修改正式peer，不作为正式peer兼容正证据 |
| delayed | 首次正式兼容检查已通过后，PM 正常撤回 provider 准备真实 waiting；测试经正常 UI 让其延迟再声明，回到 active、实际外观恢复、不 rejected。首次 commit 前的初始等待由 SOURCE 用例另证，不将完整页面上缺声明冒充未 commit |
| redeclared | 初始 active，经正常 provider 撤回/重声明操作；必须先 waiting 再 active，资源无重复、不拒绝合法撤回 |

所有 case 只接受同一程序 CLIENT CDP 端口的明确 target、`dsh-app://app/` 自有主页面、已装配可见表面、实际候选观察面，并用 Debugger 读**已经正常执行**的脚本源码逐字节对照已装 normal bundle。页面数量不是 ready。缺 normal 调用/装配或负例声明者输入具名报 CLIENT_ASSEMBLY，不能当品牌通过；交审阶段不要求先供应它们。

负例声明者的正常安装/启用输入随本卡提供，服务如何包装、装载这些正常工厂输入由PM接入；不预造已装配证据。fixture注册归实际Cordis fiber释放，测试没有另起服务。

## 具名诊断预算与释放

五项是测试诊断预算，不是安全常量，也不决定槽位是否永久缺失。可在公开 inputs.diagnosticBudgets 覆盖，默认值均保留并在 TAP 打印；只接受具名整数毫秒1..2147483647（Node计时器可表达边界），非法配置具名报 DIAGNOSTIC_BUDGET_INVALID。

| 名称 | 默认ms | 范围 |
|---|---:|---|
| cdpConnectMs | 30000 | 唯一正常 CLIENT 的 CDP 连接；同时显式传给 Playwright |
| uiOperationMs | 30000 | ready/执行字节读取/读回/点击/截图/观察订阅安装及 dialog；显式设置 locator/navigation 默认和 click/screenshot 参数，外层同名预算保护 evaluate/CDP RPC |
| lifecycleSignalMs | 15000 | 真实完成事件等待，包括缺信号；缓冲已到达信号，取消清 waiter/listener，不用无限 Promise |
| productCaseMs | 120000 | 每个完整产品用例（含 page 识别到证据），根取消向子操作传播 |
| teardownMs | 5000 | 测试 DOM listener、Runtime binding/会话、CDP transport 及被取消用例收尾；不停止 CLIENT |

耗尽报 DIAGNOSTIC_UNFINISHED、准确预算名/毫秒/阶段/target/url/最后真实快照及原始cause（若Playwright先报TimeoutError），写 unfinished-*.json。只说明信号/装配未完成，不改为 BRAND_SLOT_MISSING、不重试或延长预算修复。正常结束/错误/中断均 clearTimer/解除 abort listener；完成等待及订阅都在 finally 释放；失败断开测试 CDP 使在途 RPC 结束，收尾也有预算，保留原错和收尾错。Runtime.addBinding/removeBinding 是公开 CDP，绑定只转发事件，不触发正式行为。若页面已经失去响应而无法确认远端 listener 删除，具名 OBSERVATION_RELEASE_FAILED 保留现场，不能宣称零残留或通过。

SOURCE 单测覆盖缺信号、父取消、正常结束、原错保存、配置错误和 Playwright 显式超时具名映射；其 green 仅证明测试诊断工具，不证明品牌能力或产品 UI。13个产品case不在交审卡命令运行，真实产品结果仍待程序 main 后验证。
