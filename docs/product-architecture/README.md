# Mirax AI 产品架构映射

本文是阶段 3 的入口，记录旧版「轻语 IP 智能体」能力到 Mirax AI 新版产品架构与工程模块的映射。

## 阶段边界

- 阶段 3 只做架构映射文档，不修改源码。
- 新版 UI 重新设计，不复制旧版视觉。
- 旧版登录、激活、会员、平台授权和云服务限制只记录为风险或替代实现，不作为绕过目标。
- 阶段 4 才把本目录产物转换为源码 implementation plans。

## 文档索引

| 文档 | 职责 |
| --- | --- |
| `stage-3-source-inventory.md` | 阶段 3 证据源、功能卡、页面卡和静态分析清单。 |
| `legacy-function-to-information-architecture.md` | 旧版功能到新版信息架构、导航和产品决策的映射。 |
| `engineering-module-map.md` | 新版 UI、core、provider、media、publish、local-store、sidecar 的职责边界。 |
| `workflow-and-release-chain.md` | 旧版 7 步生产流程到 Mirax AI workflow 与发布链路的映射。 |
| `data-provider-sidecar-contracts.md` | 本地数据、Provider、sidecar 和发布账号/任务状态的契约草案。 |
当前已完成：旧版功能到新版信息架构映射见 `legacy-function-to-information-architecture.md`。
当前已完成：新版工程模块职责边界见 `engineering-module-map.md`。
当前已完成：Workflow 与发布链路映射见 `workflow-and-release-chain.md`。
当前已完成：本地数据、Provider 与 Sidecar 契约映射见 `data-provider-sidecar-contracts.md`。
当前已完成：UI/UX 与阶段 4 Handoff 见 `ui-ux-and-phase-4-handoff.md`。

## 阶段 3 完成状态

阶段 3 完成后，本目录应能支持两种读取方式：

- 产品视角：从 `legacy-function-to-information-architecture.md` 查看旧版能力在新版导航和用户流程中的归属。
- 工程视角：从 `engineering-module-map.md`、`workflow-and-release-chain.md`、`data-provider-sidecar-contracts.md` 查看后续源码计划的模块边界。

下一步是阶段 4：按 `ui-ux-and-phase-4-handoff.md` 的队列创建面向源码实现的 implementation plans。