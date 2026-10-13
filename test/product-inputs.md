# J1S2-BRAND-02 产品验证公开输入（提案，待审）

本文件定义本模块供 PM 接入的正常输入和观察方式，**不是已经存在的 Desktop 跨模块 API**。安装、配置、选择自有窗口和产品就绪由 PM environment 服务准备/启动命令实现；本卡不编造或启动这些服务。卡 `npm test` 不运行产品测试。main 推送后，程序运行固定 `scripts/segflow-plugin.test.mjs`。

## 正常产物与观察面

提交的正常 `npm pack` tgz（仍只含 dsh.client）和该 tgz 的 SHA256、来源提交、lib/client.js、Node JS、类型文件 SHA256。正式 default 入口保持 `./lib/client.js`，正式 tag 保持 `dsh-v0.2.0-rc.2` / `639ed015397290b3745d163aafe02ffee4aa3f84`，五 peer 保持 rc.2。

提议仅本插件新增 `validateSlots(ctx)`：读取**上游真实公开 snapshot**，显式检查当前期望已装配的组合的三个必需声明；kind=single、scope=root；并不将未来永久缺失当上游信号。初始无声明、合法撤回/重声明仍等待，形状不兼容或真实注册错误在本方回调内拒绝、撤销本方全部资源并保留原因。全局 Loader 的 active 状态不代替槽位兼容检查。

测试版通过现有构建新增显式verification构建选项（正式构建消除observer代码）产生正常tgz；正常安装时，以本插件公开 config `verification.enabled: true` 启用下列**本方拟提供**观察面；正式默认 false、无验证页/全局观察面。不改变上游/默认颜色/产品权限。仅观察实际服务，不能用伪造数据实现该面。

- `window.hanameshBrandVerification.inspect()`：JSON-safe 当前 `phase`（waiting/active/rejected/disposed）、`declarations`（直接映射真实 slots.snapshot 的 type/name/kind/scope/declaredBy）、`owned`（本方 slots/dictionaries/themeLayers/waits 计数）、`locale`/`brandHeadline`（getLocale().active 与实际 locale.bind 当前语言读回；light用en、dark用zh，observer不更改语言）、`otherContributionsPreserved`（独立原 namespace/主题层实际前后核对）。
- `window.hanameshBrandVerification.validate()`：显式调用上述兼容检查，成功返回；失败抛 Error，保留准确 message/slot，附 `code`、`actual`/`expected`（不兼容时）及完成撤销后的 `brandState`。
- `hanamesh-brand:lifecycle` DOM CustomEvent：本方实际等待、声明/撤回/重声明、拒绝及正常卸载完成时发布上述快照；拒绝包含 `error`（code/message/slot/actual/expected）。只在资源撤销完成后发布 disposed/rejected。observer、事件订阅和浏览器全局随本插件释放；测试监听器由测试自身释放。事件不是上游统一失败或终态 API。
- 具名错误 `BRAND_SLOT_MISSING`（准确缺项）、`BRAND_SLOT_INCOMPATIBLE`（准确实际 kind/scope 和期望 single/root）；注册/主题等原始错误仍为同一 cause，不改写成通用重试/静默 null。

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
  "cases": {"<下表case>": {
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
| missing:sidebar.brand.mark / missing:sidebar.brand.name / missing:conversation.hero.brand.mark | 从正常组合开始，经正常 owner 配置操作撤回指定声明；等待实际 waiting，再显式检查本次已装配组合；准确 missing 错误和全清理，不能以等待超时判失败 |
| incompatible:kind / incompatible:scope | 从正常组合开始，经真实声明者的正常输入得到 hero 的 chain/session 形状；本方回调准确拒绝、实际原因、零残留。本卡提供test/negative-declarer.client.mjs，由现有构建工具生成正式工厂后在隔离CLIENT正常装入，config.mismatch=kind|scope及显式正priority；先正常禁用原hero声明者，root负例entry必须shadowed，绝不接管产品UI。它是具名负例FIXTURE，真实调用官方registry；不修改正式peer，不作为正式peer兼容正证据 |
| delayed | 初始真实等待，经正常 provider 操作声明；观察 active、实际外观恢复，不能 rejected |
| redeclared | 初始 active，经正常 provider 撤回/重声明操作；必须先 waiting 再 active，资源无重复、不拒绝合法撤回 |

所有 case 只接受同一程序 CLIENT CDP 端口的明确 target、`dsh-app://app/` 自有主页面、已装配可见表面、实际候选观察面，并用 Debugger 读**已经正常执行**的脚本源码逐字节对照已装 normal bundle。页面数量不是 ready。缺 normal 调用/装配或负例声明者输入具名报 CLIENT_ASSEMBLY，不能当品牌通过；交审阶段不要求先供应它们。

负例声明者的正常安装/启用输入随本卡提供，服务如何包装、装载这些正常工厂输入由PM接入；不预造已装配证据。fixture注册归实际Cordis fiber释放，测试没有另起服务。
