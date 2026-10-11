# hanamesh-brand

HanaMesh 专用客户端品牌插件仓库（J1S2-BRAND-01）。

目标仅包含 `dsh.client`：经公开的 `sidebar.brand.mark`、`sidebar.brand.name`、`conversation.hero.brand.mark`、locale 和 theme 服务提供品牌标、名称、首页文案和主题色。仅由 HanaMesh 客户端种子预装。

## 当前状态：阻塞

2026-10-11 检查 npm 最新公开包：`@deepseek-ai/dsh-client-ui-sidebar@0.0.1-rc.1`、`@deepseek-ai/dsh-client-ui-conversation@0.0.1-rc.1`、`@deepseek-ai/dsh-client-ui-renderer@0.1.0-rc.8`。这三个包的发布 JS 和声明文件均没有上述品牌槽位。

上游 master 的源码含品牌槽位，但源码存在不等于公开包已发布。按 worker 的发布依赖约束，等待上游发布包含这些槽位及 locale/theme 公共接口的版本并由 PM 明确依赖版本后再实现。不依赖本地 fork，不伪造槽位。

此提交仅初始化仓库，没有可运行插件、package.json 或槽位注册测试；尚不能通过卡片要求的 `npm ci && npm test`。

## 开源检查

| 名称 | 检查版本 | 协议 | 来源 | 用途 |
| --- | --- | --- | --- | --- |
| @deepseek-ai/dsh-client-ui-renderer | 0.1.0-rc.8 | MIT | npm / deepseek-ai/deepseek-harness | 检查公开槽位注册接口 |
| @deepseek-ai/dsh-client-ui-sidebar | 0.0.1-rc.1 | BSD-3-Clause | npm / deepseek-ai/deepseek-harness | 检查侧栏品牌槽位 |
| @deepseek-ai/dsh-client-ui-conversation | 0.0.1-rc.1 | BSD-3-Clause | npm / deepseek-ai/deepseek-harness | 检查首页品牌槽位 |

以上包仅在本卡运行目录下载检查，尚未引入为仓库依赖。
