# SA-PUBLISH-FLOW：发布流程静态分析

## 身份信息

| 字段 | 值 |
| --- | --- |
| 分析 ID | SA-PUBLISH-FLOW |
| 分析对象 | 旧版 App 发布流程、平台账号、发布任务 |
| 来源路径或位置 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` 解包后的 ASAR（`electron/renderer/dist/static/js/*.js`、`electron/main/preload.js`、`electron/main/main.jsc`） |
| 分析方法 | hdiutil 只读挂载 + asar 解包 + ripgrep 字符串搜索 + preload IPC 接口还原 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-STATIC-002 |
| 最高证据等级 | E3 |
| 可信度 | medium |

## 发现

### 1. 发布 IPC 接口

来源：`electron/main/preload.js` 解混淆后的 `contextBridge` 暴露接口。

| 命名空间 | 方法 / 通道 | 说明 |
| --- | --- | --- |
| `publish` | `publishVideo(payload)` → `publish:publish-video` | 发布视频的唯一主进程入口。 |
| `account` | `create(data)` → `db:create` model=`account` | 创建平台账号记录。 |
| `account` | `list(options)` → `db:list` model=`account` | 查询账号列表。 |
| `account` | `getSupportedPlatforms()` → `account:get-supported-platforms` | 获取支持的平台枚举。 |
| `account` | `setupLogin(account)` → `account:setup-login` | 打开浏览器完成平台授权 / 登录。 |
| `account` | `testLogin(account)` → `account:test-login` | 测试账号登录状态。 |
| `account` | `openAccount(account)` → `account:open-account` | 打开账号主页。 |
| `account` | `refreshLogin(account)` → `account:refresh-login` | 刷新账号登录态。 |
| `account` | `getPublishRecords(account, options)` → `account:get-publish-records` | 获取账号发布历史记录。 |
| `task` | `create(payload)` → `task:create` | 创建任务（推测发布也走任务中心）。 |
| `task` | `updateStatus(...)` → `task:update-status` | 更新任务状态。 |
| `task` | `list(options)` → `task:list` | 查询任务列表。 |
| `task` | `startExecutor()` / `stopExecutor()` / `executorStatus()` | 任务执行器控制。 |

### 2. 平台标识

来源：`electron/renderer/dist/static/js/` 多 bundle 字符串搜索。

| 平台 ID | 出现位置 | 说明 |
| --- | --- | --- |
| `douyin` | `app.5523e2f8.js`、`83.16c3336f.js`、`455.534aaf22.js` | 抖音 |
| `xiaohongshu` | `app.5523e2f8.js`、`986.9b011307.js`、`83.16c3336f.js`、`455.534aaf22.js` | 小红书 |
| `kuaishou` | `app.5523e2f8.js`、`455.534aaf22.js`、`83.16c3336f.js` | 快手 |
| `bilibili` | `455.534aaf22.js` | 哔哩哔哩 |
| `shipinhao` / `weixin` / `视频号` | 未在静态字符串中出现 | 视频号在运行态截图中是否存在待确认；静态补证未找到证据。 |

### 3. 账号模型字段

来源：`preload.js` account 接口参数与 `338.bd6ada4d.js`（账号管理 bundle）字符串。

| 字段 | 说明 |
| --- | --- |
| `account_name` | 账号名称 / 用户名 |
| `display_name` | 显示名称 |
| `platform` | 平台类型（如 `douyin`） |
| `last_login_at` | 最后登录时间 |
| `status` / `active` | 登录状态（活跃 / 未登录） |

### 4. UI 与路由线索

来源：renderer JS 字符串。

| 线索 | 说明 |
| --- | --- |
| `publish-video` | 数据-guide / 路由标识，指向发布视频入口。 |
| `publish-accounts` | 数据-guide / 路由标识，指向发布账号选择。 |
| `发布视频` | 按钮或页面标题文案。 |
| `发布账号` | 账号选择区域文案。 |
| `PublishRecords` | 组件名，发布记录列表。 |

### 5. 任务状态字段

来源：`986.9b011307.js`（任务中心 bundle）字符串。

| 状态值 | 中文文案 | 说明 |
| --- | --- | --- |
| `pending` | 待处理 | 任务等待执行 |
| `processing` / `running` | 处理中 / 运行中 | 任务执行中 |
| `completed` / `success` | 已完成 / 成功 | 任务成功 |
| `failed` | 失败 | 任务失败 |
| `cancelled` | — | 任务取消 |
| `retry` | — | 重试动作/状态 |

### 6. 主进程实现限制

来源：`electron/main/main.js` 与 `main.jsc`。

- `main.js` 仅加载 `main.jsc`（bytenode 编译产物），源码不可直接阅读。
- 发布调用链、平台 API endpoint、请求方法等细节无法通过静态字符串直接确认，需通过 preload IPC 接口和 renderer 调用反推。

## 关联记录

| 记录类型 | 路径或 ID |
| --- | --- |
| 页面巡检 | PAGE-PUBLISH-FLOW |
| 功能卡 | FC-PUBLISH-PREP |
| 运行障碍 | RB-PUBLISH-001、RB-PUBLISH-002、RB-PUBLISH-003 |

## 证据影响

| 字段 | 值 |
| --- | --- |
| 可增强的证据等级 | EV-RUNTIME-020 可从 E2 升级到 E3：已确认发布入口 IPC 通道 `publish:publish-video`、账号管理 IPC 接口、支持平台枚举和任务状态字段。 |
| 剩余不确定点 | 1. `publishVideo` 具体 payload 字段（视频路径、标题、描述、话题、封面、发布方式等）未完全确认。<br>2. 各平台真实发布 API / 浏览器自动化细节在 `main.jsc` 中，未解出。<br>3. 视频号（`shipinhao`）是否在支持平台列表中，静态字符串未找到证据，需运行态确认。<br>4. 发布前是否有独立确认页：静态字符串未发现独立路由或弹窗组件，倾向于「无独立确认页」或确认步骤内嵌在发布卡片中。 |
| 对 Mirax AI 设计的影响 | 1. `@mirax/provider-publish` 可抽象 `publishVideo(input)` 方法，与旧版 IPC 语义对齐。<br>2. `PublishAccount` 模型字段可参考 `account_name`、`display_name`、`platform`、`last_login_at`、`status`/`active`。<br>3. `PublishOptions` 应预留 `platform`、`accountId`、`publishMode`（direct/draft）字段。<br>4. 任务中心状态机可复用 `pending/processing/completed/failed/cancelled`。<br>5. Mirax AI 第一版先支持 `douyin`、`xiaohongshu`、`kuaishou`、`bilibili`，视频号待确认后追加。 |
