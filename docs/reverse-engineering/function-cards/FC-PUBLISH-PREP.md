# FC-PUBLISH-PREP：发布准备

## 身份信息

| 字段 | 值 |
| --- | --- |
| 功能 ID | FC-PUBLISH-PREP |
| 功能名称 | 发布准备 |
| 旧版入口 | PAGE-PUBLISH-FLOW |
| Mirax AI 归属模块 | 桌面端发布 / Publish Provider / 任务中心 |
| 优先级 | P0 |
| 关联 gap-list 行 | 视频发布、标题封面、账号管理 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-RUNTIME-020、EV-RUNTIME-001、EV-RUNTIME-130、EV-RUNTIME-140 |
| 最高证据等级 | E2 |
| 可信度 | medium |
| 冲突说明 | N/A |

## 用户目标

用户希望在成片后快速完成标题、封面、话题、标签、发布账号和发布方式的准备，并触发平台发布或保存为平台草稿。

## 页面结构

| 区域 | 控件或字段 | 行为 |
| --- | --- | --- |
| 标题封面区（第 6 步） | 标题、描述、话题标签、视频封面 | 用户填写或生成发布所需的元数据 |
| 视频发布区（第 7 步） | 视频地址、发布账号、发布方式、立即发布按钮 | 用户确认待发布视频、选择账号和发布方式后触发发布 |
| 账号管理页 | 添加账号按钮、账号列表、登录状态 | 管理各平台发布账号；已登录账号才会在发布时可选 |
| 任务中心 | 任务列表、状态、进度、当前步骤、操作 | 查看发布任务执行结果和失败原因 |

## 输入与输出

| 类型 | 说明 |
| --- | --- |
| 用户输入 | 标题、描述、话题 / 标签、视频封面、待发布视频地址或文件、发布账号、发布方式（直接发布 / 草稿） |
| 系统输出 | 发布任务记录、平台草稿、任务中心状态、发布成功 / 失败提示 |
| 下游依赖 | 任务中心（EV-RUNTIME-130）、账号管理（EV-RUNTIME-140）、平台发布服务（@mirax/provider-publish） |

## 执行链路

| 层级 | 证据或预期职责 |
| --- | --- |
| 前端 | 首页第 6、7 步卡片收集发布元数据；账号管理页维护账号列表；任务中心展示发布任务 |
| Provider | `@mirax/provider-publish` 的 `Publisher` 接口抽象各平台发布行为；`PublishAccount` 描述平台账号与登录状态 |
| Sidecar | Playwright 浏览器自动化负责平台登录、授权、上传视频、填写表单和发布/保存草稿 |
| 本地存储 | `@mirax/local-store` 的 `publish_accounts` 表持久化账号；`workflow_tasks` 表记录发布任务状态与结果 |
| 外部服务 | 抖音、小红书、快手、视频号、B 站等平台的上传与发布接口；受平台规则、风控和登录状态限制 |

## 旧版发布能力到 Mirax AI 的映射

| 旧版能力 | Mirax AI 对应模块 | 说明 |
| --- | --- | --- |
| 首页第 6 步「标题封面」 | 桌面端首页 workflow 的 `review` / `publish` 阶段输入 | 标题、描述、话题、封面作为 `ProjectDraft.publishMetadata` 或 `PublishInput` 字段 |
| 首页第 7 步「视频发布」 | `@mirax/provider-publish` 的 `publish` 方法 | 接收视频文件、元数据、账号、发布方式，创建发布任务 |
| 发布账号管理 | `@mirax/local-store` 的 `publish_accounts` 表 + `@mirax/provider-publish` 账号接口 | 支持 `douyin`、`xiaohongshu`、`kuaishou`、`shipinhao`、`bilibili` 等平台 |
| 直接发布 / 草稿 | `PublishOptions.publishMode` | `direct` 表示直接发布，`draft` 表示保存为平台草稿 |
| 任务中心查看发布结果 | `@mirax/local-store` 的 `workflow_tasks` 表 + 前端任务列表 | 记录任务状态、进度、当前步骤、失败原因和结果入口 |
| 平台登录 / 授权 | Playwright sidecar 的浏览器自动化 | 旧版通过浏览器完成平台授权；Mirax AI 第一版先用 mock publisher，真实授权后续通过 sidecar 实现 |

## 限制与风险

| 风险 | 影响 | 处理方式 |
| --- | --- | --- |
| 必须添加并登录平台账号 | 无账号时无法选择发布账号，真实发布被拦截 | Mirax AI 第一版允许用户预先添加 mock 账号，mock publisher 跑通发布流程；真实账号授权后续通过 Playwright sidecar 实现 |
| 平台授权流程不稳定 | 二维码过期、风控、Cookie 失效会导致授权失败 | 在任务中心记录失败原因，支持重试或重新授权 |
| 平台规则差异 | 各平台标题长度、话题格式、封面尺寸、视频时长限制不同 | Publisher 实现中按平台规则校验输入，前端按平台给出提示 |
| 真实发布需要浏览器自动化 | 抖音 / 小红书等平台未开放稳定发布 API | 通过 Playwright 模拟浏览器上传；无法绕过平台登录和验证码 |
| 发布前确认页未确认 | 不确定点击「立即发布」后是否有二次确认弹窗 | 第一版先做首页内发布卡片；如后续补证存在确认页，再增加独立确认步骤 |

## Mirax AI 实现建议

决策：重做。

理由：复刻旧版的发布准备流程（标题封面 → 选择账号 → 选择发布方式 → 立即发布），但把平台发布能力抽象到 `@mirax/provider-publish`，账号管理抽象到 `@mirax/local-store`，任务结果统一到任务中心。第一版先用 mock publisher 跑通发布任务状态流转，真实平台授权与浏览器自动化后续通过 sidecar-manager 实现。

## 派工信息

| 字段 | 值 |
| --- | --- |
| 建议修改文件 | `apps/desktop/src/App.vue`、`packages/provider-publish/`、`packages/local-store/src/schema.ts`、`packages/core/src/types.ts` |
| 验证命令 | `pnpm typecheck`、`pnpm test`、`pnpm --filter @mirax/desktop dev:web` |
| 验收标准 | 桌面端首页第 6、7 步能填写发布元数据；mock 账号可选中；点击「立即发布」后任务中心出现发布任务记录；任务状态可展示成功 / 失败 / 草稿 |
| 任务边界 | 第一版不实现真实平台登录、授权和上传；只做 mock 发布任务流转和状态展示；不绕过旧版平台授权限制 |
