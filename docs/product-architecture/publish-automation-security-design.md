# 发布自动化安全边界与失败恢复设计

> 本文档说明 Mirax AI 从 mock publisher 切换到真实平台发布前的账号、凭证、安全边界与失败恢复设计。
> 真实 OAuth / Cookie / 二维码授权、平台 API / Playwright 调用属于后续实现，当前版本不落地。

## 1. 账号与凭证存储边界

### 1.1 凭证引用（credentialRef）

- `PublishAccount` 只保存 `credentialRef` 字段，指向系统安全存储（如 macOS keychain、Windows Credential Locker、本地加密 store）。
- `PublishAccount` 绝不保存 cookie、token、password、apiKey 等敏感信息明文。
- `local-store` 的 `publish_accounts` 表只保留 `credential_ref TEXT` 列，不出现 `cookie` / `token` / `password` 明文列。
- 真实 publisher 内部通过 `account.credentialRef` 向安全存储索取凭证，调用平台 API 或 Playwright 浏览器流程。

### 1.2 安全存储占位

当前 mock 账号使用 `mock:keychain:<platform>-<name>` 作为 `credentialRef` 占位：

- 它不代表真实凭证；
- 用于在 mock publisher 中区分「已授权」与「未授权」账号；
- 不进入 Git、不进入测试 fixture、不进入任务 payload。

## 2. Publisher 输入/输出边界

### 2.1 输入 `PublishHandoffInput`

```ts
interface PublishHandoffInput {
  projectId: string;
  videoPath: string;
  title: string;
  description: string;
  platformIds: PublishPlatform[];
  mode: "direct" | "draft";
}
```

- 输入不含任何凭证、Cookie、Token。
- `Publisher.publish` 内部根据 `projectId` / `platformIds` 查询 `PublishAccount`，再通过 `credentialRef` 获取凭证。

### 2.2 输出 `PublishHandoffResult`

```ts
interface PublishHandoffResult {
  success: boolean;
  message: string;
  taskIds: string[];
  platformResults: PublishPlatformResult[];
}
```

- `platformResults` 给出每个平台的子结果，包含 `taskId`（成功）或 `errorCode` / `errorMessage`（失败）。
- `message` 与 `errorMessage` 不得包含凭证信息。
- 使用方（如 `usePublishPreparation`）根据 `platformResults` 创建对应状态的 `PublishTask`。

## 3. 发布任务状态机

```
pending → submitted → processing → completed
                          ↓
              failed / cancelled / retryable
```

| 状态 | 含义 | 可自动重试 |
|---|---|---|
| `pending` | 已创建，尚未提交到 Publisher | 否 |
| `submitted` | Publisher 已接受，等待平台处理 | 否 |
| `processing` | 平台正在处理 | 否 |
| `completed` | 平台返回成功 | 否 |
| `failed` | 平台返回不可重试错误（格式不符、账号禁用等） | 否 |
| `retryable` | 平台返回可重试错误（网络超时、限流） | 是（未来调度器实现） |
| `cancelled` | 用户主动取消 | 否 |

### 3.1 失败字段

```ts
interface PublishTask {
  // ...
  errorCode?: PublishErrorCode;
  errorMessage?: string;
  failedAt?: string;
  retryCount: number;
}
```

- `errorCode`: 标准化错误代码，供 UI 与恢复策略使用。
- `errorMessage`: 人类可读说明，不得含凭证。
- `failedAt`: 失败时间 ISO 字符串。
- `retryCount`: 已尝试重试次数，初始为 0。

### 3.2 失败恢复策略

| 错误代码 | 场景 | 恢复方式 |
|---|---|---|
| `account_unauthorized` | 账号未授权或授权已过期 | UI 标记「需重新授权」，引导用户走官方授权流程 |
| `account_expired` | 授权过期 | 同上 |
| `platform_unsupported_draft` | 平台不支持草稿模式 | 提示切换为 direct 模式 |
| `platform_limit_exceeded` | 标题/描述/时长/大小超出平台限制 | 提示修改内容 |
| `video_not_found` | 视频路径缺失或文件不存在 | 提示重新生成或选择视频 |
| `network_error` | 网络超时、限流、抖动 | 标记 `retryable`，未来由重试调度器处理 |
| `unknown` | 未知错误 | 记录日志，提示用户重试或反馈 |

当前版本不实现自动重试调度器，仅设计与字段支持。

## 4. 平台画像与授权方式

`PlatformProfile` 记录各平台的能力与限制：

| 平台 | direct | draft | 授权方式 | 时长上限 | 大小上限 |
|---|---|---|---|---|---|
| 抖音 | ✅ | ✅ | OAuth | 60 分钟 | 4 GB |
| 小红书 | ✅ | ✅ | 二维码 | 10 分钟 | 1 GB |
| 快手 | ✅ | ✅ | OAuth | 10 分钟 | 2 GB |
| 视频号 | ✅ | ❌ | unknown | 30 分钟 | 1 GB |
| Bilibili | ✅ | ✅ | Cookie | 12 小时 | 8 GB |

- `authorization` 字段仅做文档/UI 提示，不执行真实授权。
- 真实授权方式（OAuth、二维码扫描、Cookie 导入）均为运行障碍，后续 Task 单独实现。

## 5. mockPublisher 行为

当前 mock publisher：

- 不实际调用平台；
- 对无 `credentialRef` 的账号返回 `account_unauthorized`；
- 对不支持草稿的平台返回 `platform_unsupported_draft`；
- 对超出标题长度限制返回 `platform_limit_exceeded`；
- 不伪装成功，失败时返回 `success: false` 与 per-platform 子结果。

## 6. 本地持久化安全

- `publishTaskStore` 使用 `localStorage` 持久化 `PublishTask[]`。
- 保存前做防御性过滤：删除 `credentialRef`、`cookie`、`token`、`password`、`apiKey`、`secret` 等字段（即使类型上不存在）。
- 加载时对旧数据做归一化：`retryCount` 缺失时默认 0，缺失必填字段的任务被丢弃。
- 错误信息中不得包含凭证。

## 7. 账号管理 UI 边界

`AccountManagementView.vue`：

- 展示账号 `uiStatus`（已连接 / 需重新授权 / 检查中 / 不可用 / 未连接）。
- 添加账号弹窗明确说明：真实 OAuth / 二维码 / Cookie 导入流程暂未接入，点击按钮不会实际打开浏览器或完成授权。
- 新账号在 mock 流程结束后标记为「不可用」，真实环境由官方回调更新状态。
- UI 文案使用 `credentialRef` 说明凭证引用机制。

## 8. 后续真实化工作（不在本 Task 范围内）

1. 实现真实 OAuth / 二维码 / Cookie 授权流程。
2. 实现安全存储读写（keychain / credential locker / 本地加密 store）。
3. 实现真实 Publisher，调用平台官方 API 或 Playwright 浏览器自动化。
4. 实现任务状态轮询与自动重试调度器。
5. 接入真实平台限制校验（视频时长、分辨率、码率、文件大小）。
6. 实现发布前视频预上传与分片上传。

## 9. 禁止事项

- 不将 Cookie / Token / password 明文写入 SQLite、localStorage、任务 payload、测试 fixture 或 Git。
- 不通过 mock 返回「发布成功」绕过未实现的平台授权。
- 不在 `PublishHandoffInput` 中传递凭证。
- 不提前实现真实平台 OAuth / 登录 / Cookie 获取。
