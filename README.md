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

开源清单见 [OPEN_SOURCE.md](OPEN_SOURCE.md)。
