# hanamesh-brand

HanaMesh 的客户端品牌插件，仅提供 `dsh.client`。不提供服务端插件；预装范围由 HanaMesh 客户端种子决定，本仓不修改种子或网站。

- 注册 `sidebar.brand.mark`、`sidebar.brand.name`、`conversation.hero.brand.mark`，使用旧 fork 的紫色 H 标和 HanaMesh 名称。
- 通过 `theme.overrideTokens()` 覆盖 business-primary，提供浅色 / 深色值；卸载移除自己的覆盖层。
- 在 `hanamesh.brand` namespace 注册中英文首页文案；卸载注销字典。
- 使用声明感知的 `slots.inject()`，跟随宿主槽位声明、注销及重新声明。

## 尚未完成：首页标题覆盖

上游 master 的首页标题固定调用 `conversation` namespace 的 `hero.headline`。其 `locale.register()` 禁止重复 namespace/语言；公开 locale API 没有覆盖方法。注册 `hanamesh.brand` 字典不会替换现有标题。本版本不声称这一项完成，等待 PM 指定公开入口，不修改上游或 DOM 绕过宿主。

上一轮关于“公开包没有品牌槽位所以不能实现”的阻塞判断已撤回：槽位是宿主 master 构建在运行时声明的字符串；上游 npm 依赖固定为 Core 已用的 0.2.0-rc.2，不属于我们的合约包规则。

## 验证与打包

Node 24：`npm ci && npm test`；`npm run check` 做类型检查；`npm pack` 构建仅客户端发行文件。测试覆盖槽位注册与注销、延迟声明及重建、主题层覆盖及移除、字典注册及移除、安装失败回滚和发行入口。测试是组件级模拟宿主验证，不是 HanaMesh.app 的真实 UI 验收。

开源清单见 [OPEN_SOURCE.md](OPEN_SOURCE.md)。
