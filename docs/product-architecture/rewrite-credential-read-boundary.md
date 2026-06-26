# Rewrite 阶段凭证读取边界

本文档说明 Workbench `rewrite` 阶段在真实 LLM 模式下，API Key、baseUrl、model 等敏感配置的读取源、允许落点与禁止落点。

## 读取源

- `apiKey` / `baseUrl` / `model` 仅来自 `useAppSettings().providerConfigs` 的内存 `ref`。
- `providerConfigs` 从 `localStorage` 恢复时，`apiKey` 已被 `sanitizeProviderConfigForStorage` 剔除，恢复后恒为空串；只有当前会话用户在前端输入后，内存中才会出现真实 key。
- `useAppSettings.findEnabledRewriteProviderConfig()` 负责选出第一个 `enabled === true` 且 `provider === "openai" || provider === "custom"` 的配置。

## 允许落点

- `apiKey` 只允许作为 `createOpenAiCompatibleProvider({ baseUrl, apiKey, model })` 的一次性构造参数。
- `baseUrl` / `model` 只用于同一构造函数，随后由 `OpenAiCompatibleProvider` 在内存中持有。
- 真实 HTTP 请求由 `@mirax/provider-ai` 内部 transport 发出，请求头 `Authorization` 是唯一使用 `apiKey` 的位置。

## 禁止落点

- `apiKey` 不得进入 `localStorage`、SQLite、`desktopDraft`、`publishTaskStore`、日志（`addLog` message）、任务 payload、错误 message、控制台日志、遥测或 Git。
- `baseUrl` 中的 `username:password`、query string、hash fragment 不得进入持久化或日志；持久化前必须通过 `sanitizeBaseUrlForStorage` 清洗为 `origin + pathname`。
- `prep.updateMetadata` 的 `title` / `description` 只能来自 LLM 返回的文案结果，不得包含凭证。

## 失败处理

- 配置缺失或非法时，`selectRewriteProvider` 返回 `AiProviderError("not-configured", ...)`，message 中不含 `apiKey`、baseUrl token 或完整响应体。
- 真实调用失败时，`OpenAiCompatibleProvider` 抛出 `AiProviderError`，message 仅暴露错误码 / HTTP 状态码范围 / 概要，不暴露敏感字段。
- `processStage` 捕获错误后只把 `error.message` 写入日志，因此 message 必须受控。

## 不做什么

- 本阶段不实现 keychain / OS 安全存储；`apiKey` 仅会话内存可见。
- 不放宽 `sanitizeProviderConfigForStorage` / `sanitizeBaseUrlForStorage` 的既有行为。
