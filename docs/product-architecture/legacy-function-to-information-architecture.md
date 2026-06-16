# 旧版功能到 Mirax AI 新版信息架构映射

## 新版一级信息架构

| 新版模块 | 旧版来源 | 用户目标 | 阶段 3 决策 |
| --- | --- | --- | --- |
| 桌面工作台 | `PAGE-HOME-WORKBENCH`、`FC-HOME-PIPELINE` | 从对标素材到文案、声音、数字人、成片、发布准备的主流程。 | 重做：保留流程意图，不复制旧版视觉。 |
| 声音管理 | `PAGE-VOICE-MANAGEMENT`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-100` | 训练、合成、试听和管理声音资产。 | 重做：第一版 mock 状态流转，真实 CosyVoice 后续接入。 |
| 形象管理 | `PAGE-AVATAR-MANAGEMENT`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-100` | 上传、训练和管理数字人形象。 | 重做：第一版 mock 状态流转，真实 HeyGem 后续接入。 |
| 素材管理 | `PAGE-MATERIALS`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-101` | 管理视频/图片素材、分类、搜索、抽帧和向量化。 | 重做并延期高级能力：先做本地上传、分类、文件名/描述搜索，向量化延后。 |
| 任务中心 | `PAGE-TASK-CENTER`、`FC-ASSET-MANAGEMENT`、`EV-STATIC-101` | 查看 workflow、素材处理、发布任务的状态、进度、失败和重试。 | 重做：统一任务表和状态机。 |
| 账号管理 | `PAGE-ACCOUNT-MANAGEMENT`、`FC-ASSET-MANAGEMENT`、`FC-PUBLISH-PREP`、`EV-STATIC-102` | 管理平台发布账号和登录状态。 | 替代实现：第一版 mock 账号，真实授权通过 Playwright sidecar。 |
| 设置 | `PAGE-SETTINGS`、`PAGE-SECONDARY-ENTRYPOINTS`、`FC-PROVIDER-SETTINGS` | 配置 Provider、本地依赖、输出目录、提示词、数据、更新和日志。 | 重做：保留旧版分组习惯，改为本地可控配置。 |
| 发布链路 | `PAGE-PUBLISH-FLOW`、`FC-PUBLISH-PREP`、`EV-STATIC-002` | 准备标题、描述、话题、封面、账号、发布方式并创建发布任务。 | 重做：先 mock publisher，真实平台发布后续接入。 |
| 帮助与边缘状态 | `PAGE-SECONDARY-ENTRYPOINTS`、`EV-STATIC-200` | 提供引导、日志、更新、数据恢复和依赖缺失提示。 | 合并：帮助、日志、更新放入设置/支持入口；登录激活不移植为强制门槛。 |

## 页面到新版导航映射

| 旧版页面 | 新版导航位置 | 默认入口 | 说明 |
| --- | --- | --- | --- |
| `PAGE-HOME-WORKBENCH` | 主导航：工作台 | 应用启动默认页 | 承载主 workflow 和右侧预览/结果区域。 |
| `PAGE-VOICE-MANAGEMENT` | 主导航：声音 | 工作台选择声音时也可进入 | 声音资产独立管理，也服务 workflow `voice-clone` / `speech` 阶段。 |
| `PAGE-AVATAR-MANAGEMENT` | 主导航：形象 | 工作台选择形象时也可进入 | 数字人形象独立管理，也服务 workflow `avatar` 阶段。 |
| `PAGE-MATERIALS` | 主导航：素材 | 工作台导入对标素材时也可进入 | 素材库是对标视频、封面、BGM 和素材复用的统一入口。 |
| `PAGE-TASK-CENTER` | 主导航：任务 | 工作台执行后自动产生任务 | 展示 workflow、素材处理、发布任务。 |
| `PAGE-ACCOUNT-MANAGEMENT` | 主导航：账号 | 发布卡片选择账号时也可进入 | 平台账号管理和授权状态。 |
| `PAGE-SETTINGS` | 主导航：设置 | 顶栏支持入口也可进入 | 常规、模型、提示词、数据、更新、本地依赖。 |
| `PAGE-PUBLISH-FLOW` | 工作台发布步骤 + 任务中心结果 | 工作台第 6/7 步 | 不做独立发布确认页，除非后续运行态证据确认存在。 |
| `PAGE-SECONDARY-ENTRYPOINTS` | 设置 / 支持 / 引导 | 低频入口 | 帮助、日志、软件更新、数据恢复、依赖缺失提示合并管理。 |

## 旧版能力决策矩阵

| 旧版能力 | 证据 | 新版模块 | 决策 | 理由 |
| --- | --- | --- | --- | --- |
| 学习对标 / 提取文案 | `FC-HOME-PIPELINE`、`PAGE-HOME-WORKBENCH` | 桌面工作台 + Provider | 重做 | 保留用户目标，Provider 实现由 mock 逐步替换真实解析。 |
| 改写文章 | `FC-HOME-PIPELINE`、`FC-PROVIDER-SETTINGS` | 桌面工作台 + Provider + 提示词 | 重做 | 旧版依赖云端模型，新版改为用户配置 Provider。 |
| 声音训练 / 合成 | `PAGE-VOICE-MANAGEMENT`、`EV-STATIC-100` | 声音管理 + Provider + sidecar | 重做 | 保留字段和状态，真实 CosyVoice 作为后续 sidecar。 |
| 形象训练 / 视频生成 | `PAGE-AVATAR-MANAGEMENT`、`EV-STATIC-100` | 形象管理 + Provider + sidecar | 重做 | 保留 V1/V2 模型版本概念，第一版 mock。 |
| 素材上传 / 分类 / 搜索 | `PAGE-MATERIALS`、`EV-STATIC-101` | 素材管理 + local-store + media-pipeline | 重做 | 本地文件、分类、描述搜索优先；向量化延期。 |
| 素材向量化 | `EV-STATIC-101`、`RB-ASSET-003` | 素材管理 + sidecar | 延期 | 依赖向量服务和索引策略，先保留数据字段和接口占位。 |
| 任务统计 / 筛选 / 重试 | `PAGE-TASK-CENTER`、`EV-STATIC-101` | 任务中心 + core + local-store | 重做 | 统一状态机，支持 workflow 和发布任务。 |
| 平台账号授权 | `PAGE-ACCOUNT-MANAGEMENT`、`EV-STATIC-102` | 账号管理 + provider-publish + sidecar | 替代实现 | 不绕过平台登录；第一版 mock，真实授权走 Playwright。 |
| 标题封面 / 发布准备 | `FC-PUBLISH-PREP`、`EV-STATIC-002` | 发布链路 + provider-publish | 重做 | 保留发布元数据和 direct/draft 语义。 |
| 登录 / 激活会员 | `RB-HOME-001`、`RB-HOME-002` | N/A | 不移植为强制门槛 | Mirax AI 第一版本地优先，不复制旧版账号/激活限制。 |
| 软件更新 | `EV-STATIC-200` | 设置 + Tauri updater | 替代实现 | 用 Tauri 2 Updater 替代旧版 `cloud.*`。 |
| 日志上传 | `EV-STATIC-200` | 设置 / 支持 | 替代实现 | 第一版本地导出/复制，云端上传待服务端明确。 |
