# 资产索引

本文记录证据资产的位置，以及这些资产是否允许进入 Git。

大型逆向资产不要进入 Git，包括 DMG、完整录屏、解包 ASAR、模型文件、大型资源目录和批量抽帧图片。

小体积截图只有在文档确实需要时才进入 Git。新增截图优先放在 `docs/reverse-engineering/assets/screenshots/`，并同时登记到本文和 `evidence-index.md`。

用户手动提供的旧版界面截图可作为原始输入保留在 `docs/截图/`，不强制搬迁或重命名；后续如需要规范化派发，再复制到 `docs/reverse-engineering/assets/screenshots/` 并新增资产记录。

## 资产规则

| 资产类型 | Git 策略 | 存放规则 |
| --- | --- | --- |
| DMG 或安装包 | 不提交 | 只记录本机路径或外部存储位置。 |
| 完整录屏 | 不提交 | 记录本机路径、外部存储位置、时长和关联证据 ID。 |
| 解包 ASAR 或 App bundle | 不提交 | 只记录本机路径和摘要。 |
| 模型文件或大型二进制资源 | 不提交 | 只记录本机路径和摘要。 |
| 批量抽帧图片 | 不提交 | 只记录本机路径和帧范围摘要。 |
| 小体积截图 | 需要时可提交 | 放在 `docs/reverse-engineering/assets/screenshots/`，命名格式为 `YYYY-MM-DD-page-or-feature-brief.png`。 |
| 小段文本摘录或生成摘要 | 可提交 | 放在相关 Markdown 记录中。 |

## 记录

| 资产 ID | 证据 ID | 资产类型 | Git 策略 | 路径或外部位置 | 摘要 | 关联记录 | 日期 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ASSET-DOC-001 | EV-DOC-001 | Markdown 文档 | 已跟踪 | `docs/reverse-engineering/demo-video-timeline.md` | 现有演示视频时间轴。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-002 | EV-DOC-002 | Markdown 文档 | 已跟踪 | `docs/reverse-engineering/demo-video-coverage.md` | 现有演示覆盖矩阵。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-003 | EV-DOC-003 | Markdown 文档 | 已跟踪 | `docs/reverse-engineering/legacy-ui-gap-list.md` | 现有旧版 UI 差距清单。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-DOC-004 | EV-DOC-004 | Markdown 设计文档 | 已跟踪 | `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md` | 当前证据驱动路线图设计。 | `docs/reverse-engineering/evidence-index.md` | 2026-06-13 |
| ASSET-RUNTIME-001 | EV-RUNTIME-001 | 截图 | 已跟踪 | `docs/reverse-engineering/assets/screenshots/2026-06-13-home-workbench-overview.png` | 旧版 App 首页工作台完整界面，显示左侧导航、顶部模式和 7 步生产流程。 | `docs/reverse-engineering/pages/PAGE-HOME-WORKBENCH.md` | 2026-06-13 |
| ASSET-RUNTIME-002 | EV-RUNTIME-001 | 截图 | 已跟踪 | `docs/reverse-engineering/assets/screenshots/2026-06-13-login-blocker.png` | 旧版 App 启动后因 token 失效进入登录页，并弹出激活会员弹窗。 | `docs/reverse-engineering/runtime-blockers.md` | 2026-06-13 |
| ASSET-RUNTIME-010 | EV-RUNTIME-001 | 人工截图 | 待跟踪 | `docs/截图/首页.png` | 用户手动提供的旧版首页工作台截图，可作为首页页面卡和首页流程功能卡的补充证据。 | `docs/reverse-engineering/pages/PAGE-HOME-WORKBENCH.md` | 2026-06-13 |
| ASSET-RUNTIME-011 | EV-RUNTIME-010 | 人工截图 | 待跟踪 | `docs/截图/设置.png` | 用户手动提供的旧版设置页截图，用于阶段 1 Task 3 优先补齐设置页页面卡。 | `docs/reverse-engineering/pages/PAGE-SETTINGS.md` | 2026-06-13 |
| ASSET-RUNTIME-012 | EV-RUNTIME-100 | 人工截图 | 待跟踪 | `docs/截图/声音管理.png` | 用户手动提供的旧版声音管理页截图，用于阶段 1 Task 5 Step 1。 | `docs/reverse-engineering/pages/PAGE-VOICE-MANAGEMENT.md` | 2026-06-13 |
| ASSET-RUNTIME-013 | EV-RUNTIME-110 | 人工截图 | 待跟踪 | `docs/截图/形象管理.png` | 用户手动提供的旧版形象管理页截图，用于阶段 1 Task 5 Step 2。 | `docs/reverse-engineering/pages/PAGE-AVATAR-MANAGEMENT.md` | 2026-06-13 |
| ASSET-RUNTIME-014 | EV-RUNTIME-120 | 人工截图 | 待跟踪 | `docs/截图/素材管理.png` | 用户手动提供的旧版素材管理页截图，用于阶段 1 Task 5 Step 3。 | `docs/reverse-engineering/pages/PAGE-MATERIALS.md` | 2026-06-13 |
| ASSET-RUNTIME-015 | EV-RUNTIME-130 | 人工截图 | 待跟踪 | `docs/截图/任务中心.png` | 用户手动提供的旧版任务中心页截图，用于阶段 1 Task 5 Step 4。 | `docs/reverse-engineering/pages/PAGE-TASK-CENTER.md` | 2026-06-13 |
| ASSET-RUNTIME-016 | EV-RUNTIME-140 | 人工截图 | 待跟踪 | `docs/截图/账号管理.png` | 用户手动提供的旧版账号管理页截图，用于阶段 1 Task 5 Step 5。 | `docs/reverse-engineering/pages/PAGE-ACCOUNT-MANAGEMENT.md` | 2026-06-13 |
| ASSET-RUNTIME-017 | EV-RUNTIME-200 | Markdown 页面卡 | 已跟踪 | `docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md` | 阶段 1 P2 辅助入口与边缘状态页面卡，汇总帮助、软件更新、数据设置、提示词管理、日志上传、登录/激活弹窗和依赖缺失提示。 | `docs/reverse-engineering/pages/PAGE-SECONDARY-ENTRYPOINTS.md` | 2026-06-13 |
