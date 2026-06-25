# FC-ASSET-MANAGEMENT：资产管理

## 身份信息

| 字段 | 值 |
| --- | --- |
| 功能 ID | FC-ASSET-MANAGEMENT |
| 功能名称 | 资产管理（声音、形象、素材、任务、账号） |
| 旧版入口 | PAGE-VOICE-MANAGEMENT、PAGE-AVATAR-MANAGEMENT、PAGE-MATERIALS、PAGE-TASK-CENTER、PAGE-ACCOUNT-MANAGEMENT |
| Mirax AI 归属模块 | 资源管理、任务中心、发布账号管理 |
| 优先级 | P1 |
| 关联 gap-list 行 | 声音管理、形象管理、素材管理、任务中心、账号管理、发布账号 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-RUNTIME-100、EV-RUNTIME-110、EV-RUNTIME-120、EV-RUNTIME-130、EV-RUNTIME-140、EV-STATIC-100、EV-STATIC-101、EV-STATIC-102 |
| 最高证据等级 | E3 |
| 可信度 | medium |
| 冲突说明 | 静态字符串未找到 `shipinhao`/`视频号` 平台标识。 |
| 静态分析记录 | `docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md`、`SA-MATERIALS-TASKS.md`、`SA-ACCOUNTS-AUTH.md` |

## 用户目标

用户希望统一管理短视频生产过程中需要复用的资源：声音模型、数字人形象、原始素材，以及生产任务和可发布平台账号，从而在创建新内容时快速选择已有资产并跟踪任务状态。

## 页面结构

| 区域 | 控件或字段 | 行为 |
| --- | --- | --- |
| 声音管理 | 声音训练卡片（上传音频/直接录音、声音名称、开始训练）、声音合成卡片（选择模型、输入文案、语速、情绪、生成语音）、我的声音库网格 | 训练新声音、合成试听、查看/编辑/删除已训练声音 |
| 形象管理 | 添加形象卡片（视频上传、形象名称、描述、保存形象）、我的形象库网格 | 上传真人视频训练数字人、查看/编辑/删除形象 |
| 素材管理 | 新建分类、上传视频或图片、搜索框、分类边栏、素材列表/空状态 | 对素材分类、上传、搜索、标记和向量化 |
| 任务中心 | 统计卡片（总任务/进行中/已完成/失败）、筛选栏（任务状态、执行模式）、任务列表表格 | 查看任务状态、进度、失败原因，支持新建/重试/查看结果 |
| 账号管理 | 添加账号按钮、账号列表/空状态 | 添加/查看/删除平台发布账号，管理登录状态 |

## 输入与输出

| 类型 | 说明 |
| --- | --- |
| 用户输入 | 音频/视频/图片文件、声音/形象名称与描述、合成文案、分类名称、搜索关键词、筛选条件、平台账号授权 |
| 系统输出 | 声音模型、数字人形象、素材条目、任务记录、任务状态与产物、平台账号登录状态 |
| 下游依赖 | 首页生产流程调用声音、形象、素材；发布流程调用账号；任务中心反馈整体进度 |

## 执行链路

| 层级 | 证据或预期职责 |
| --- | --- |
| 前端 | Vue 管理页面提供上传区、列表、搜索、筛选、空状态；调用 preload 暴露的 IPC 接口读写资源 |
| Preload / IPC | `voice.*` / `digitalHuman.*` 管理声音与形象；`material.*` / `category.*` / `vector.*` 管理素材与向量化；`task.*` 管理任务状态；`account.*` 管理平台账号与授权 |
| Provider | `@mirax/provider-ai` 负责声音克隆与语音合成；`@mirax/provider-publish` 负责平台账号与发布能力 |
| Sidecar | `@mirax/sidecar-manager` 管理 FFmpeg（音频提取/抽帧）、CosyVoice（声音训练/合成）、HeyGem（数字人训练）、Playwright（平台授权） |
| 本地存储 | `@mirax/local-store` 持久化声音、形象、素材、任务、账号的元数据和状态；参考字段：`voice`/`digitalHuman` 用 `db:*` 模型语义；`materials` 含 `file_path/file_name/category/description/status/error/result/created_at`；`workflow_tasks` 含 `status/progress/current_step/input/output/error/created_at/updated_at`；`publish_accounts` 含 `account_name/display_name/platform/last_login_at/status/active` |
| 外部服务 | 云端模型或平台登录页（仅在真实能力启用时使用；第一版用 mock 替代） |

## 限制与风险

| 风险 | 影响 | 处理方式 |
| --- | --- | --- |
| 声音/形象训练依赖云端或本地模型服务 | 第一版无法直接训练真实模型 | 先用 mock provider 跑通流程，后续替换为 CosyVoice / HeyGem sidecar |
| 素材向量化需要额外服务 | 第一版可能仅做文件引用和封面提取 | 向量化能力延后，先支持分类、上传、搜索文件名 |
| 平台账号授权依赖浏览器自动化 | 真实授权流程复杂且受平台规则变化影响 | 第一版用 mock publisher 账号；真实授权后续通过 Playwright sidecar 实现 |
| 任务状态机涉及多个阶段 | 状态流转错误会导致任务卡死或重复执行 | 在 `@mirax/core` 中定义不可变 workflow 状态转换，任务中心只读/触发状态更新 |
| 文件路径变更导致历史任务失效 | 旧版提示移动任务内音视频会导致再次制作失败 | 在本地存储中记录文件绝对路径或校验文件存在性；移动文件时提示用户 |

## Mirax AI 实现建议

决策：重做。

理由：复刻旧版资产管理和任务跟踪能力，但使用 Mirax AI 的新版信息架构与视觉设计；将声音、形象、素材、任务、账号统一抽象为可扩展的资源管理模块，便于后续替换真实 provider 和 sidecar。

## 派工信息

| 字段 | 值 |
| --- | --- |
| 建议修改文件 | `apps/desktop/src/views/AssetManagement.vue`（或按资源拆分：VoiceView、AvatarView、MaterialView、TaskView、AccountView）、`packages/local-store/` 相关 repository、`packages/provider-ai/` 和 `packages/provider-publish/` 接口 |
| 验证命令 | `pnpm typecheck`、`pnpm test packages/local-store/`（如存在） |
| 验收标准 | 页面结构与截图一致；声音/形象/素材/任务/账号的 CRUD 和列表状态可用；任务状态与 workflow 阶段对应；设置页输出目录作为媒体文件根目录 |
| 任务边界 | 只做 UI 结构、本地状态和资源管理抽象；真实声音克隆、数字人训练、平台授权在第一版用 mock 或占位 |
