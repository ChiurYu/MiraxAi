# Workflow 与发布链路映射

## 旧版 7 步到 Mirax AI 8 阶段映射

| 旧版步骤 | Mirax AI workflow 阶段 | 输入 | 输出 | 任务中心状态 |
| --- | --- | --- | --- | --- |
| 1. 学习对标 | `transcribe` | 对标视频链接或本地素材 | 提取文案、素材引用、解析错误 | `pending` → `processing` → `completed/failed` |
| 2. 改写文章 | `rewrite` | 提取文案、提示词、产品卖点、字数 | 改写文案 | `processing` → `completed/failed` |
| 3. 声音生成 | `voice-clone` + `speech` | 声音样本/声音模型、改写文案、语速、情绪 | 声音模型状态、合成音频路径 | `processing` → `completed/failed` |
| 4. 视频生成 | `avatar` | 数字人形象、合成音频、模型版本 V1/V2 | 数字人口播视频路径 | `processing` → `completed/failed` |
| 5. 一键成片 | `compose` | 数字人视频、字幕、BGM、音量、封面/素材 | 竖屏成片文件、封面候选 | `processing` → `completed/failed` |
| 6. 标题封面 | `review` | 成片、标题/描述/话题/封面生成配置 | 发布元数据、人工确认结果 | `completed` 或保持可编辑 |
| 7. 视频发布 | `publish` | 视频文件、发布元数据、发布账号、发布方式 | 发布任务、平台草稿或发布结果 | `pending` → `processing` → `completed/failed/cancelled` |

## 发布链路

| 链路节点 | 新版承载模块 | 本地数据 | Provider / Sidecar | 阶段 3 决策 |
| --- | --- | --- | --- | --- |
| 发布元数据编辑 | 工作台第 6 步 | `ProjectDraft.publishMetadata` 或后续等价字段 | `@mirax/provider-ai` 可选标题生成 | 重做，保留标题、描述、话题、封面。 |
| 账号选择 | 工作台第 7 步 + 账号管理 | `publish_accounts` | `@mirax/provider-publish` 读取账号能力 | 第一版 mock 账号，真实授权后续。 |
| 发布方式 | 工作台第 7 步 | publish task input | `PublishOptions.publishMode = direct \| draft` | 保留直接发布 / 草稿语义。 |
| 创建发布任务 | 任务中心 | `workflow_tasks` | `@mirax/provider-publish` mock publisher | 发布结果统一进入任务中心。 |
| 平台授权 | 账号管理 | `publish_accounts.status/active/last_login_at` | Playwright sidecar | 替代实现，不绕过平台登录。 |
| 上传与发布 | 后续真实发布模块 | publish task output/error | Playwright sidecar + platform adapter | 阶段 4 后拆独立实现计划。 |

## 任务状态统一规则

| 状态 | 旧版证据 | 新版含义 | UI 展示要求 |
| --- | --- | --- | --- |
| `pending` | `EV-STATIC-002`、`EV-STATIC-101` | 已创建，等待执行。 | 可取消；展示等待中。 |
| `processing` / `running` | `EV-STATIC-002`、`EV-STATIC-101` | 正在执行。 | 展示进度、当前步骤，不允许重复启动。 |
| `completed` / `success` | `EV-STATIC-002`、`EV-STATIC-101` | 成功完成。 | 展示产物入口、可复用到下一步。 |
| `failed` | `EV-STATIC-002`、`EV-STATIC-101` | 执行失败。 | 展示错误信息和重试入口。 |
| `cancelled` | `EV-STATIC-002`、`EV-STATIC-101` | 用户或系统取消。 | 展示取消原因，可重新创建。 |
| `retry` | `EV-STATIC-101` | 动作或派生状态。 | 作为操作按钮，不作为最终状态。 |
