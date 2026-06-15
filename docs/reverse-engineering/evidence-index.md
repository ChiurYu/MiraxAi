# 证据索引

本文是 Mirax AI 旧产品重建工作的统一证据登记表。

功能卡、页面巡检记录、运行障碍记录和静态分析记录都应引用这里的证据 ID，不要在各处重复粘贴长路径或大段说明。

## 证据等级

| 等级 | 名称 | 含义 |
| --- | --- | --- |
| E1 | 运行态已验证 | 已在旧版 App 中直接看到页面、控件、交互或状态变化。 |
| E2 | 运行态可见但受限 | 页面、控件或字段可见，但登录、激活、云服务、模型、平台或本地依赖限制导致动作不能完成。 |
| E3 | 静态分析确认 | 旧包、解包资源、preload API、本地配置、数据库或代码分析确认了模块、接口、字段或资源。 |
| E4 | 旧仓库或文档线索 | 旧 README、早期源码、演示视频、注释或历史文档提供的线索。 |
| E5 | 合理推断 | 基于命名、模块边界、页面结构或同类产品行为得出的推断。 |

## 可信度

| 可信度 | 含义 |
| --- | --- |
| high | 证据直接、可复查，且没有相互冲突的来源。 |
| medium | 证据可信但不完整，仍需要其他来源确认输入、输出、状态或依赖。 |
| low | 来自推断、过期文档、受限运行态观察，或暂时无法复查的观察。 |

## 冲突判定规则

优先采用更接近真实运行行为的来源：E1 优先于 E2，E2 优先于 E3，E3 优先于 E4，E4 优先于 E5。同等级冲突时，优先采用时间更新、可复查性更强、信息更完整的证据，并在关联功能卡中保留冲突说明。

## ID 范围

| 前缀 | 来源类型 |
| --- | --- |
| EV-RUNTIME | 运行态观察、截图、录屏、页面操作记录。 |
| EV-STATIC | 旧包、解包资源、preload API、本地配置、数据库或代码分析。 |
| EV-DOC | 旧仓库文档、当前项目文档、历史记录和演示视频时间轴。 |
| EV-INFER | 明确标注为推断的分析结论。 |

## 记录

| 证据 ID | 等级 | 可信度 | 来源类型 | 摘要 | 资产路径或外部位置 | 关联页面 | 关联功能卡 | 记录人 | 日期 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EV-DOC-001 | E4 | medium | 当前仓库文档 | 演示视频时间轴记录了旧产品可见工作流片段和优先级。 | `docs/reverse-engineering/demo-video-timeline.md` | N/A | N/A | Codex | 2026-06-13 |
| EV-DOC-002 | E4 | medium | 当前仓库文档 | 演示覆盖矩阵把视频可见功能映射到当前 Mirax AI 实现和 mock 边界。 | `docs/reverse-engineering/demo-video-coverage.md` | N/A | N/A | Codex | 2026-06-13 |
| EV-DOC-003 | E4 | medium | 当前仓库文档 | 旧版 UI 差距清单记录第一版可用阶段已知的 UI 和流程差距。 | `docs/reverse-engineering/legacy-ui-gap-list.md` | N/A | N/A | Codex | 2026-06-13 |
| EV-DOC-004 | E4 | high | 当前仓库设计文档 | 证据驱动路线图定义了证据等级、可信度规则、模板、阶段顺序和恢复要求。 | `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md` | N/A | N/A | Codex | 2026-06-13 |
| EV-RUNTIME-001 | E1 | high | 运行态观察 / 人工截图 | 旧版 App 首页工作台完整界面：左侧导航含首页/形象/素材/创作/任务/账号/设置/帮助；顶部手动/自动/草稿模式；主工作区 7 步生产流程（学习对标、改写文章、声音生成、视频生成、一键成片、标题封面、视频发布）。当前因登录/激活限制无法触发真实生成。 | `docs/reverse-engineering/assets/screenshots/2026-06-13-home-workbench-overview.png`; `docs/截图/首页.png` | PAGE-HOME-WORKBENCH | FC-HOME-PIPELINE | Codex | 2026-06-13 |
| EV-RUNTIME-010 | E1 | high | 人工截图 | 旧版 App 设置页可见界面截图，用于优先补齐模型配置、服务配置、账号/授权、本地依赖等字段；真实保存、校验和连通动作如受限则另记运行障碍。 | `docs/截图/设置.png` | PAGE-SETTINGS | FC-PROVIDER-SETTINGS | Codex | 2026-06-13 |
| EV-RUNTIME-020 | E2 | medium | 运行态观察 / 人工截图 | P0 发布流程页面卡，基于首页、任务中心和账号管理截图补充发布入口、发布账号、发布方式、任务结果和受限动作。 | `docs/reverse-engineering/pages/PAGE-PUBLISH-FLOW.md`; `docs/截图/首页.png`; `docs/截图/任务中心.png`; `docs/截图/账号管理.png` | PAGE-PUBLISH-FLOW | FC-PUBLISH-PREP | Codex | 2026-06-13 |
| EV-RUNTIME-100 | E1 | high | 人工截图 | 旧版 App 声音管理页可见界面截图，用于补齐声音列表、上传、克隆、试听、状态、编辑或删除入口。 | `docs/截图/声音管理.png` | PAGE-VOICE-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-110 | E1 | high | 人工截图 | 旧版 App 形象管理页可见界面截图，用于补齐数字人形象列表、上传、训练或生成入口、封面、状态、编辑或删除入口。 | `docs/截图/形象管理.png` | PAGE-AVATAR-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-120 | E1 | high | 人工截图 | 旧版 App 素材管理页可见界面截图，用于补齐素材分类、上传、搜索、标签、预览、编辑或删除入口。 | `docs/截图/素材管理.png` | PAGE-MATERIALS | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-130 | E1 | high | 人工截图 | 旧版 App 任务中心页可见界面截图，用于补齐任务列表、状态、进度、失败原因、重试和查看结果入口。 | `docs/截图/任务中心.png` | PAGE-TASK-CENTER | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-140 | E1 | high | 人工截图 | 旧版 App 账号管理页可见界面截图，用于补齐平台账号列表、登录状态、添加账号、删除账号、浏览器 profile 或授权提示。 | `docs/截图/账号管理.png` | PAGE-ACCOUNT-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-13 |
| EV-RUNTIME-200 | E2 | low | 运行态观察 / 人工截图 | P2 辅助入口和边缘状态页面卡，基于首页和设置页截图汇总帮助、软件更新、数据设置、提示词管理、日志上传、登录/激活弹窗、空状态和依赖缺失提示。 | `docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md`; `docs/截图/首页.png`; `docs/截图/设置.png` | PAGE-SECONDARY-ENTRYPOINTS | N/A | Codex | 2026-06-13 |
| EV-STATIC-001 | E3 | medium | 旧包静态分析 | 旧版 DMG 基本属性与挂载路径确认。 | `ASSET-PKG-001` | N/A | N/A | Codex | 2026-06-15 |
| EV-STATIC-002 | E3 | medium | 旧包静态分析 | P0 发布流程静态补证：已确认 `publish:publish-video` IPC 入口、`account.*` 账号接口、`task.*` 任务接口；支持平台 `douyin`/`xiaohongshu`/`kuaishou`/`bilibili`；账号字段 `account_name`/`display_name`/`platform`/`last_login_at`/`status`/`active`；任务状态 `pending`/`processing`/`completed`/`failed`/`cancelled`；未发现独立发布确认页组件。 | `docs/reverse-engineering/static-analysis/SA-PUBLISH-FLOW.md` | PAGE-PUBLISH-FLOW | FC-PUBLISH-PREP | Codex | 2026-06-15 |
| EV-STATIC-003 | E3/E2 | medium | 旧包静态分析 | P0 设置与本地依赖静态补证：模型配置、服务配置、依赖检查、输出目录。 | `docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md` | PAGE-SETTINGS、PAGE-SECONDARY-ENTRYPOINTS | FC-PROVIDER-SETTINGS | Codex | 2026-06-15 |
| EV-STATIC-100 | E3/E2 | medium | 旧包静态分析 | P1 声音与形象管理静态补证：CosyVoice / HeyGem 调用、训练/合成 API、表结构。 | `docs/reverse-engineering/static-analysis/SA-VOICE-AVATAR.md` | PAGE-VOICE-MANAGEMENT、PAGE-AVATAR-MANAGEMENT | FC-ASSET-MANAGEMENT | Codex | 2026-06-15 |
| EV-STATIC-101 | E3/E2 | medium | 旧包静态分析 | P1 素材与任务中心静态补证：素材表结构、FFmpeg 抽帧、任务状态机。 | `docs/reverse-engineering/static-analysis/SA-MATERIALS-TASKS.md` | PAGE-MATERIALS、PAGE-TASK-CENTER | FC-ASSET-MANAGEMENT | Codex | 2026-06-15 |
| EV-STATIC-102 | E3/E2 | medium | 旧包静态分析 | P1 账号管理与授权静态补证：平台账号表、浏览器 profile、Token 存储。 | `docs/reverse-engineering/static-analysis/SA-ACCOUNTS-AUTH.md` | PAGE-ACCOUNT-MANAGEMENT | FC-ASSET-MANAGEMENT、FC-PUBLISH-PREP | Codex | 2026-06-15 |
| EV-STATIC-200 | E3/E2 | low | 旧包静态分析 | P2 辅助入口与边缘状态静态补证：帮助、更新、数据设置、日志上传、依赖检查。 | `docs/reverse-engineering/static-analysis/SA-SECONDARY-ENTRYPOINTS.md` | PAGE-SECONDARY-ENTRYPOINTS | FC-PROVIDER-SETTINGS | Codex | 2026-06-15 |
