# 阶段 3 证据源清单

## 固定入口

| 类型 | 路径 | 用途 |
| --- | --- | --- |
| 项目约定 | `AGENTS.md` | 调度、计划目录、gap-list 更新约束。 |
| 工位约定 | `CLAUDE.md` | monorepo、包职责、命令和协作约定。 |
| 项目状态 | `docs/codex/PROJECT-STATE.md` | 当前阶段、已完成阶段和下一步。 |
| 路线图 spec | `docs/superpowers/specs/2026-06-13-mirax-evidence-driven-roadmap-design.md` | 阶段 3 目标、完成标准和证据规则。 |

## 功能卡

| 功能卡 | 新版归属模块 | 阶段 3 使用方式 |
| --- | --- | --- |
| `docs/reverse-engineering/function-cards/FC-HOME-PIPELINE.md` | 桌面工作台 | 映射工作台、workflow、任务状态和发布前置。 |
| `docs/reverse-engineering/function-cards/FC-ASSET-MANAGEMENT.md` | 声音管理、形象管理、素材管理、任务中心、账号管理 | 拆分聚合功能卡，形成新版资源与任务模块边界。 |
| `docs/reverse-engineering/function-cards/FC-PROVIDER-SETTINGS.md` | 设置、Provider、sidecar、本地数据 | 映射设置分组、Provider 配置、依赖检查和本地数据管理。 |
| `docs/reverse-engineering/function-cards/FC-PUBLISH-PREP.md` | 发布链路、账号管理、Publish Provider | 映射标题封面、发布账号、发布方式、任务中心状态。 |

## 页面卡

| 页面卡 | 新版信息架构模块 |
| --- | --- |
| `PAGE-HOME-WORKBENCH` | 桌面工作台 |
| `PAGE-VOICE-MANAGEMENT` | 声音管理 |
| `PAGE-AVATAR-MANAGEMENT` | 形象管理 |
| `PAGE-MATERIALS` | 素材管理 |
| `PAGE-TASK-CENTER` | 任务中心 |
| `PAGE-ACCOUNT-MANAGEMENT` | 账号管理 |
| `PAGE-SETTINGS` | 设置 |
| `PAGE-PUBLISH-FLOW` | 发布链路 |
| `PAGE-SECONDARY-ENTRYPOINTS` | 设置、帮助、更新、日志、边缘状态 |

## 静态分析

| 静态分析 | 关键用途 |
| --- | --- |
| `SA-PUBLISH-FLOW.md` | 发布 IPC、平台 ID、账号字段、任务状态。 |
| `SA-VOICE-AVATAR.md` | 声音/形象 IPC、语音合成参数、数字人参数、sidecar 模块。 |
| `SA-MATERIALS-TASKS.md` | 素材字段、分类、向量化、任务字段和状态机。 |
| `SA-ACCOUNTS-AUTH.md` | 平台账号字段、授权接口、Playwright sidecar 边界。 |
| `SA-SECONDARY-ENTRYPOINTS.md` | 设置分类、配置字段、软件更新、日志、数据设置、依赖检查。 |
| `SA-WORKFLOW-NOTES.md` | 阶段 2 解包方法和搜索注意事项，只作为溯源，不作为新版实现细节。 |

## 运行障碍

| 文件 | 阶段 3 使用方式 |
| --- | --- |
| `docs/reverse-engineering/runtime-blockers.md` | 将登录、激活、云服务、模型、本地依赖、平台规则限制映射为新版风险和替代实现。 |
