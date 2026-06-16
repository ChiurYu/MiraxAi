# UI/UX 与阶段 4 Handoff

## UI/UX skill 需求矩阵

| 模块或流程 | 是否需要 UI/UX skill | 原因 | 设计产物建议路径 |
| --- | --- | --- | --- |
| 桌面工作台主 workflow | yes | 7 步旧流程映射到 8 阶段，涉及预览、任务状态、草稿、发布准备和高频操作效率。 | `docs/product-architecture/design-decisions/workbench-workflow.md` |
| 设置 / Provider / sidecar | yes | 配置项多，涉及密钥、本地依赖、输出目录、提示词、数据、更新，需要清晰分组和错误状态。 | `docs/product-architecture/design-decisions/settings-provider-sidecar.md` |
| 声音管理 | yes | 上传/录音、训练、合成、试听、库管理在同页，状态较多。 | `docs/product-architecture/design-decisions/voice-management.md` |
| 形象管理 | yes | 上传规范、训练状态、预览和库管理需要明确交互。 | `docs/product-architecture/design-decisions/avatar-management.md` |
| 素材管理 | yes | 分类、上传、搜索、批量操作、向量化延期能力需要可扩展布局。 | `docs/product-architecture/design-decisions/materials-management.md` |
| 任务中心 | yes | 状态、进度、失败原因、重试、打开产物和发布结果需要高信息密度设计。 | `docs/product-architecture/design-decisions/task-center.md` |
| 账号管理 + 发布链路 | yes | 平台账号、授权状态、发布模式和任务结果跨模块。 | `docs/product-architecture/design-decisions/account-publish-flow.md` |
| 帮助 / 日志 / 软件更新 | no | 低频入口，可直接按设置子页和支持入口实现。 | N/A |

## 阶段 4 计划拆分建议

| 阶段 4 计划 | 优先级 | 依赖阶段 3 文档 | 预计源码范围 | 验证方向 |
| --- | --- | --- | --- | --- |
| 工作台 workflow 信息架构和状态拆分 | P0 | `workflow-and-release-chain.md`、`engineering-module-map.md` | `apps/desktop`、`@mirax/core` | `pnpm test packages/core`、`pnpm typecheck` |
| 设置 / Provider / sidecar 配置 | P0 | `data-provider-sidecar-contracts.md`、`engineering-module-map.md` | `apps/desktop`、`@mirax/core`、`@mirax/local-store`、`@mirax/sidecar-manager` | `pnpm test`、`pnpm typecheck` |
| 发布准备与 mock 发布任务 | P0 | `workflow-and-release-chain.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-publish`、`@mirax/local-store` | provider-publish tests、desktop typecheck |
| 声音管理 mock 资产流 | P1 | `legacy-function-to-information-architecture.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-ai`、`@mirax/local-store` | local-store/provider tests、typecheck |
| 形象管理 mock 资产流 | P1 | `legacy-function-to-information-architecture.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-ai`、`@mirax/local-store` | local-store/provider tests、typecheck |
| 素材管理本地上传/分类/搜索 | P1 | `data-provider-sidecar-contracts.md`、`engineering-module-map.md` | `apps/desktop`、`@mirax/media-pipeline`、`@mirax/local-store` | media/local-store tests、typecheck |
| 任务中心统一状态和结果入口 | P1 | `workflow-and-release-chain.md` | `apps/desktop`、`@mirax/core`、`@mirax/local-store` | core/local-store tests、typecheck |
| 账号管理 mock 与真实授权预留 | P1 | `data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/provider-publish`、`@mirax/sidecar-manager` | provider-publish tests、typecheck |
| 帮助、日志、更新、数据管理低频入口 | P2 | `legacy-function-to-information-architecture.md`、`data-provider-sidecar-contracts.md` | `apps/desktop`、`@mirax/local-store`、Tauri updater 后续 | typecheck、manual smoke |

## 阶段 4 禁止事项

- 不把阶段 3 的映射文档当作旧版行为已完全验证的证明；遇到低可信度证据必须保留待确认问题。
- 不实现真实平台自动发布，除非已有单独计划处理 Playwright sidecar、平台规则和账号授权。
- 不把视频号列为已支持平台；静态分析未找到 `shipinhao` / `视频号` 明确证据。
- 不在 UI 层直接写死旧版 IPC 名称；旧版 IPC 只作为语义参考。
- 不因源码实现通过就更新 `legacy-ui-gap-list.md` 状态列；只有计划明确要求且验收通过时才能更新。
