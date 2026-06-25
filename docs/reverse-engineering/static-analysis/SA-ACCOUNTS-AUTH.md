# SA-ACCOUNTS-AUTH：账号管理与授权静态分析

## 身份信息

| 字段 | 值 |
| --- | --- |
| 分析 ID | SA-ACCOUNTS-AUTH |
| 分析对象 | 旧版 App 平台账号管理、登录授权、Token / Cookie 存储 |
| 来源路径或位置 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` 解包后的 ASAR（`electron/main/preload.js`、`electron/renderer/dist/static/js/*.js`） |
| 分析方法 | hdiutil 只读挂载 + asar 解包 + ripgrep 字符串搜索 + preload IPC 接口还原 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-STATIC-102 |
| 最高证据等级 | E3 |
| 可信度 | medium |

## 发现

### 1. 账号管理 IPC 接口

来源：`electron/main/preload.js`。

| 命名空间 | 方法 / 通道 | 说明 |
| --- | --- | --- |
| `account` | `create(data)` → `db:create` model=`account` | 创建账号记录。 |
| `account` | `find(id)` / `list(options)` / `update(id, data)` / `delete(id)` / `search(...)` | 查询与维护。 |
| `account` | `getSupportedPlatforms()` → `account:get-supported-platforms` | 获取支持平台。 |
| `account` | `setupLogin(account)` → `account:setup-login` | 打开浏览器完成平台授权 / 登录。 |
| `account` | `testLogin(account)` → `account:test-login` | 测试账号登录状态。 |
| `account` | `openAccount(account)` → `account:open-account` | 打开账号主页。 |
| `account` | `refreshLogin(account)` → `account:refresh-login` | 刷新登录态。 |
| `account` | `getPublishRecords(account, options)` → `account:get-publish-records` | 获取发布记录。 |

搜索字段：

- `account_name`、`display_name`

### 2. 账号模型字段

来源：`preload.js` account 接口参数与 `338.bd6ada4d.js`（账号管理 bundle）字符串搜索。

| 字段 | 说明 |
| --- | --- |
| `account_name` | 账号名称 / 用户名 |
| `display_name` | 显示名称 |
| `platform` | 平台类型（如 `douyin`） |
| `last_login_at` | 最后登录时间 |
| `status` | 账号状态 |
| `active` | 是否活跃 / 已登录 |

### 3. 平台标识

来源：`electron/renderer/dist/static/js/*.js` 字符串搜索（同 SA-PUBLISH-FLOW）。

| 平台 ID | 说明 |
| --- | --- |
| `douyin` | 抖音 |
| `xiaohongshu` | 小红书 |
| `kuaishou` | 快手 |
| `bilibili` | 哔哩哔哩 |
| `shipinhao` / `weixin` / `视频号` | 静态字符串未找到，待运行态确认 |

### 4. 授权流程线索

来源：`preload.js`、renderer 字符串、运行态截图。

- `account:setup-login`：打开浏览器窗口完成平台授权，推测使用 Playwright 或 Electron `BrowserWindow` 加载平台登录页。
- `account:test-login`：测试当前账号登录态，可能检查 Cookie / Token 有效性。
- `account:refresh-login`：重新授权或刷新 Token。
- `account:open-account`：在浏览器中打开账号主页。
- renderer 字符串中出现「登录账号」、「测试中...」、「测试连接」、「打开账号失败」、「设置登录失败」、「加载账号列表失败」等文案。

### 5. 授权实现限制

来源：`electron/main/main.js` 与 `main.jsc`。

- `main.js` 仅加载 `main.jsc`，实际授权逻辑、Cookie / Token 存储、浏览器 profile 管理在编译产物中，未直接解出。
- renderer 与 preload 字符串中未发现 `cookie`、`token`、`session`、`browser profile` 等字段的明文存储路径；敏感数据存储细节需进一步运行态或动态分析。

## 关联记录

| 记录类型 | 路径或 ID |
| --- | --- |
| 页面巡检 | PAGE-ACCOUNT-MANAGEMENT |
| 功能卡 | FC-ASSET-MANAGEMENT、FC-PUBLISH-PREP |
| 运行障碍 | RB-PUBLISH-001、RB-PUBLISH-002、RB-ASSET-005 |

## 证据影响

| 字段 | 值 |
| --- | --- |
| 可增强的证据等级 | EV-RUNTIME-140 可从 E1 补充 E3 级接口字段证据；RB-PUBLISH-001/002 与 RB-ASSET-005 的静态补证方向可更新。 |
| 剩余不确定点 | 1. Cookie / Token / 浏览器 profile 的具体存储路径和加密方式未确认。<br>2. 平台授权窗口是 Playwright 还是 Electron 内置浏览器未确认。<br>3. 二维码登录、短信验证等平台特定流程未在静态字符串中体现。<br>4. `shipinhao` 是否支持仍待运行态确认。 |
| 对 Mirax AI 设计的影响 | 1. `@mirax/local-store` 的 `publish_accounts` 表可复用 `account_name`、`display_name`、`platform`、`last_login_at`、`status`/`active` 字段；敏感凭据字段可设计为加密 JSON 或外置存储。<br>2. `@mirax/provider-publish` 的 `PublishAccount` 接口应包含 `platform`、`accountName`、`displayName`、`loginStatus`。<br>3. 平台授权流程先 mock；真实实现通过 `@mirax/sidecar-manager` 的 Playwright 浏览器自动化完成，避免在 UI 层耦合平台登录细节。<br>4. 第一版支持 `douyin`、`xiaohongshu`、`kuaishou`、`bilibili`，视频号待确认。 |
