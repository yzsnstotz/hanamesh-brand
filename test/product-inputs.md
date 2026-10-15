# J1S2-BRAND-02 · Q-220 修题提案（待重审）

本轮只修三个解锁测试及方案；其余四锁题、原八断言、31项SOURCE、1bcadd1正式拒绝/回滚/只读观察、全部13产品场景及五项预算/释放保留。不得改生产代码/peer迁就测试。下面是**本方测试需要的输入，不是已存在的Desktop prepare API**。main后的缺文件仍未修，不宣称正常装载或产品通过；交审不等待该文件。

## 真实宿主与参考SDK分离

实际目标：上游 `d743267388641bc76f17c45ce8b4c231aed1d32c`，Desktop与DSH `0.2.1-alpha.2`，宿主Cordis `4.0.5-alpha.1`，bundled pnpm `11.28.5`。来源为固定提交的package.json:2–8、apps/desktop/package.json:2–4、apps/cli/package.json:2–4、vendor/cordis/package.json:2–4；fork公开packaging/upstream.sha及HANAMESH-FORK.md标识基线。只读源码证据归档在本卡运行目录 evidence/q220-upstream，manifest有来源SHA/路径/hash。

旧 `dsh-v0.2.0-rc.2 / 639ed015397290b3745d163aafe02ffee4aa3f84` 仅为已完成PACKAGE/API的SDK参考，绝不填写为实际Desktop身份。本轮插件五peer声明为0.2.1-alpha.2、Cordis为4.0.5-alpha.1；与宿主实装resolved、宿主自有Cordis分开记录。不能推算“版本不同所以升级”，也不能装旧宿主、加override/legacy-peer-deps/force、版本豁免或偷补包。必须正常严格安装；真实 `incompatible-version`/unsatisfied peers及回滚结果才是给PM的兼容处置依据，失败时十三场景不跳过、更不能整体通过。

## 本方正常供给和PM接入边界

品牌已有公开构建：npm ci；npm pack（release）；npm run build -- --verification后npm pack --ignore-scripts（保留刚生成的verification）；最后npm run build恢复release。两者同提交、仍仅dsh.client、default lib/client.js、Node/类型入口不变。verification=true只增加inspect/lifecycle，无global.validate；正式无observer的rejected事件、原生alert、全回滚不变。打包前创建隔离目的目录，逐文件hash和来源提交不得用旧包代替。

已核对一个实际观察供给缺口：固定SDK `packages/client/modules/src/client/entries.ts:167–174` 用 `loader.create({name:id})` 创建浏览器行，公开boot graph字段不传Host配置。因此不能向PM索要“把Host verification.enabled自动传入浏览器”的不存在操作。本方锁题后将**verification构建入口**薄封装为正常导出的apply(ctx)调用同一公开品牌apply(ctx,{verification:{enabled:true}})，保持原name/inject和全部实现；正式release入口/默认false/无observer不动，不重做1bcadd1正式拒绝/回滚，不用私有Context或global触发。本轮只交此测试构建需求、不提前改builder或生产源码。现有--verification只编入观察代码，尚不足以声称默认真实装载已启用观察面。

固定上游已公开：

- docs/cli-help.md:62–79：`dsh plugin --profile <name> <pnpm-args>` 正常安装接口。服务包装必须从**自己准备的bundled Node/CLI/pnpm**调用，并在同一调用显式隔离HOME/DSH_HOME到本次环境；profile名从真实Desktop包装供给获得。严格安装模式/输出及真实resolved均采证，不虚构profile名。
- packages/boot/plugin-manager/README.md:40、69–75：正常bundle/组件toggle、DSH peer校验、incompatible-version及恢复语义；豁免是风险授权，不能拿来通过本卡。
- packages/client/ui-plugin-manager/README.md与src/client/PluginManagerPage.tsx:216–234：Plugins页提供bundle/行switch，但readOnlyReason或无entryId会禁用。locales.ts:51、57、267、273给出“启用组件 {name} / Enable component {name}”等真实标签。输入动作由真实可见行及当前语言生成，缺按钮/锁定就报准确原因，不索要虚构“disable-slot”控件。
- packaging/README.md公开 `node packaging/rebrand.mjs DEST`、`node packaging/package.mjs DEST target --prepare-only` 包装入口；文档明确该层尚不安装种子。现有 `pnpm run start:desktop` 是真实启动命令，但本卡不执行服务启停。

仍缺的**包装层接入**一次列全：①将正常品牌两产物及负例包装入本次Desktop所用真实profile并留严格安装/恢复证据；②给可编辑行的正常UI路径、设置浅/深及en/zh、展开侧栏/空会话路径；③实际provider启禁用可供性（尤其readonly行）及声明撤回/恢复；④在已装配自有窗口选择target，生成本文schema2；⑤ready核真实界面/装载而非CDP页计数。这些调用由PM复用既有Desktop装配卡提供的**已实现**包装入口后接入environment，不反向等待其最终验收，不创造新环境卡/新权限/私有Context。当前未见这些新增调用，不能给不存在的prepare/start/ready包装方法起假名字。本轮仅记录剩余接口，不宣称输入已生成。

## 正常声明FIXTURE：自己拥有，不能冒充真实provider

解锁的negative-declarer.client.mjs改为正常附属包：只在公开增量shell.overlay显示自己的select/declare/withdraw控件；声明也由独立shell.overlay entry持有，用它自己的disposer撤回。**不再争夺/影子注册root**，不释放他方注册，不mount假应用，不改上游，不调用品牌validate或暴露Context。

mode：compatible、missing:sidebar.brand.mark、missing:sidebar.brand.name、missing:conversation.hero.brand.mark、kind、scope。缺项只省该项；形状错只把hero变为chain/root或single/session；其它声明single/root。原真实声明者须先经正常产品配置退出，保留真实AppFrame；若冲突，公开register原错误显示在fixture alert，不能静默更换peer或patch registry。仅负例/生命周期声明供给由FIXTURE承载，正常兼容/外观正证据必须来自真实原provider。

公开fixture UI：combobox“Brand fixture mode”选mode；button“Brand fixture: declare / withdraw”；output“Brand fixture declaration status”和“Brand fixture declarations”（直接读真实snapshot，不造声明回执）。选择器只在withdrawn时可改，声明期间正常撤回/再次声明，不用timer/无限Promise。浏览器共享React由宿主提供；本方打包需external React。

文件导出packageInputs给本方producer：正常manifest（仅fixture renderer peer=真实SDK0.2.1-alpha.2，不改品牌peer）、client工厂/React external、dsh.bundle.patch、cordis.patch.yml插入可寻址fixture行、无业务逻辑Host元数据face。锁题后同步本方fixture producer消费该输入；**本轮不改生产打包脚本**。交审同时用现有esbuild显式external:react生成运行目录隔离fixture tgz，记录SOURCE hash和完整文件清单；这是可安装测试输入，不是安装成功收据。初始mode默认compatible可公开配置；每场景用真实select切换，不要求宿主凭空有测试按钮。

## 输入schema2与真实观察

文件仍只能是 `$SEGFLOW_ENV_DIR/hanamesh-brand-inputs.json`，端口仍SEGFLOW_PORT_CLIENT。不改读取路径、不接其它CDP页。PM正常供给生成：

```json
{
  "schema": 2,
  "sdkReference": {"tag": "dsh-v0.2.0-rc.2", "sha": "639ed015397290b3745d163aafe02ffee4aa3f84"},
  "host": {"upstreamSha": "d743267388641bc76f17c45ce8b4c231aed1d32c",
    "checkoutDir": "<本次真实fork检出>", "forkCommit": "<该检出HEAD>",
    "packageDirs": {"desktop": "<实际包目录>", "dsh": "<实际包目录>", "cordis": "<实际包目录>", "pnpm": "<实际bundled包目录>"}},
  "installedPackageDir": "<正常verification已装目录>",
  "artifact": {"sourceSha": "<本版main>", "tarball": "<同次正常tgz>", "sha256": "<hash>", "files": {"<五lib文件>": "<hash>"}},
  "installation": {"peerMode": "strict", "runtimeVersion": "0.2.1-alpha.2", "exitCode": 0,
    "argv": ["<实际bundled命令>", "plugin", "--profile", "<实际profile>", "add", "<实际tgz>", "--strict-peer-dependencies"], "versionExemptions": [],
    "log": "<实际严格安装输出>", "logSha256": "<hash>"},
  "peerPackageDirs": {"<五peer全名>": "<实际resolved目录>"},
  "resolved": {"<五peer全名>": {"version": "<实读版本，非指定结果>", "manifestSha256": "<实际manifest hash>"}},
  "release": {"installedPackageDir": "<release正常已装目录>", "artifact": "<同上对象>",
    "installation": "<同上对象>", "peerPackageDirs": "<同上对象>", "resolved": "<同上对象>"},
  "cases": {"<13场景名>": {"targetId": "<正常实际主窗target>", "release": false,
    "setup": [], "baseline": {"disable": [], "restore": []},
    "actions": [], "restoreProviders": [], "reset": [], "palette": "light"}}
}
```

尖括号是结构说明，不能填伪造实装事实；安装不兼容时保存真实exit/诊断/恢复日志，before hook应具名拒绝并交PM，不把exitCode写0。所有实装目录/tgz/log属于本次环境。host用真实manifest版本、fork HEAD/基线祖先与packaging/upstream.sha交叉校验；peer声明与真实resolved分别读，不要求把alpha.2谎填成rc.2。

动作只接受真实正常UI：`{role,name}` click；`{role,name,checked}`确定switch/checkbox/radio状态；`{role:"combobox",name,select}`正常selectOption。源码有出处也仍须页面上唯一、可见、可操作；locked标题一并报错。禁止执行shell/任意JS/私有loader、改profile文件或强造slot/DOM。setup/reset是正常用户操作序列，不能是通过结果；每场景重新建立状态并finally按正常操作reset，失败保留主错/收尾错。

不再要求PM提供“原色/原文字/假控制selector/bundleUrls”：测试从正常active品牌的可见H（24/34px）和HanaMesh name找到**实际宿主容器**、正常新会话/收侧栏按钮，使用真实DOM路径；正常禁用品牌后在同一客户端读原色/原内容，再恢复。侧栏必须展开、无会话hero可见；否则明确报实际界面不符，不伪造ready。延迟场景waiting时先看实际inspect，恢复后再定位。页面仍限明确target与dsh-app://app/，去boot且实际正常模块/品牌观察可核，绝非仅CDP page。

正式加载读**现有公开**window.__DSH_BOOT__ entries/batches（只读，不手造），用Debugger已执行single/combo脚本核品牌及五peer实际default。固定SDK公开组合传输只替换source-map trailer；核其余完整factory字节，记录原lib hash与匹配执行体hash，不再把整个combo误要求等于单个lib。这里不用私有Context/模块表，更不加载替代页面。

## 十三场景setup/reset与不可绕过断言

| case | 正常前置 / 测试动作 / 恢复 |
|---|---|
| light / dark | 真实原providers、正常品牌已启用；公开设置分别light+en/dark+zh、展开侧栏+空会话；H/HanaMesh/H、固定双色/双语namespace、原欢迎/侧栏可见；最后恢复正常设置。正例不装fixture声明替代providers |
| unload | 同正常active，baseline经正常禁用/恢复抓原界面；正式禁用品牌，等disposed，四资源0/global移除/原色原内容恢复，原控件仍可用；reset正常重新启用 |
| 三missing | 先真实正常组合/baseline；正常退出原声明者，fixture选择对应missing并declare；正常重新启用品牌→真实首commit自动明确拒绝，code/slot/message、原生dialog及自身四资源0，observer无；withdraw fixture并恢复原providers，reset品牌。不能把撤回本身当最终缺项 |
| 两incompatible | 正常组合/baseline；原声明者正常退出后fixture选择kind/scope declare；真实回调/正式首commit拒绝，保留actual/expected及原生原因，四资源0；withdraw fixture、恢复原provider，再正常reset |
| delayed | 已真实通过首次检查，正常退出原声明者，保留同一品牌实例waiting；fixture compatible正常declare→active；不rejected，3槽/3等待；withdraw并恢复真实provider后核真实外观，reset。首commit前初始等待仍由四锁题SOURCE保留 |
| redeclared | 首次passed；按正常操作在真实声明者与自己fixturecompatible间建立/撤回/重声明；必须waiting后active、不rejected/无重复；最后withdraw fixture并恢复真实providers再核外观，正常reset |
| 三release-missing | 同三missing，但真实release包/verification=false/无global；首commit同样code/slot/message、原生dialog、四资源0；恢复真实providers后原色/原内容/原控件还原，不能拿观察面驱动拒绝 |

两类原provider启禁用/readonly行若不能正常实现，所有依赖它的missing/incompatible/delayed/redeclared/release场景一次列为CLIENT_PUBLIC_OPERATION_UNAVAILABLE/LOCKED及实际原因交PM；保留全部场景与断言，不skip、不通过fake host/等待超时冒充。

## 诊断预算与证据边界

diagnosticBudgets仍公开可配：cdpConnectMs=30000、uiOperationMs=30000、lifecycleSignalMs=15000、productCaseMs=120000、teardownMs=5000。五名称/默认、1..2147483647计时器表达范围、显式Playwright timeout、取消时waiter/timer/DOM/CDP释放均保留；reset也用具名收尾预算。耗尽只报DIAGNOSTIC_UNFINISHED/现场/原cause，不判永久缺项或加时重试。SOURCE检查和夹具构建只记其层级；交审不跑真实PRODUCT、不以缺环境造RED；main后由程序按PM实际供给跑固定verify与owner门。
