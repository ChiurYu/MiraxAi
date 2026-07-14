# Rewrite Provider 唯一生效选择设计

## 目标

给 rewrite 阶段引入“唯一生效 Provider”概念，让用户在设置 → AI 服务里明确选择当前用于文案改写的 LLM Provider。多个 openai/custom Provider 同时启用时，UI 和执行层都使用同一个被选中的 Provider，不再静默取数组第一条。

## 设计决策

- 选择状态放在 `AppSettings.rewriteProviderConfigId`，而不是 `provider_configs.is_rewrite_provider`。
  - 这是“用户当前选择”，不是 Provider 自身能力。
  - 复用现有的 `appSettings` snapshot + SQLite 双写路径。
- 不 fallback 到第一条。未选择、选中失效、选中未 ready/未验证时，rewrite 阶段都诚实提示，不会偷偷使用其他 Provider。
- 其他阶段（transcribe / speech / voice-clone / avatar）保持原有“第一条匹配”逻辑，不受影响。

## 数据模型与持久化

### `AppSettings`

在 `packages/core/src/types.ts` 的 `AppSettings` 中新增字段：

```ts
export interface AppSettings {
  id: string;
  theme: AppTheme;
  outputPaths: AppOutputPaths;
  rewriteProviderConfigId?: string;
}
```

`packages/core/src/validation.ts` 的 `createDefaultAppSettings` 默认返回 `rewriteProviderConfigId: undefined`。

### SQLite schema

`app_settings` 表增加列：

```sql
rewrite_provider_config_id TEXT
```

迁移策略：

1. 修改 `LOCAL_STORE_MIGRATIONS` 中 `CREATE TABLE app_settings` 直接包含该列（新库）。
2. 追加迁移：
   ```sql
   ALTER TABLE app_settings ADD COLUMN rewrite_provider_config_id TEXT;
   ```
3. 在 `migrateLocalStore` 中执行前先用 `PRAGMA table_info(app_settings)` 检查列是否存在，存在则跳过该条 ALTER。
4. 保留对 `duplicate column name` 的兜底捕获，但不吞其他 SQLite 错误。

### 仓库与加载

- `packages/local-store/src/repositories.ts`：`createAppSettingsRepository` 的 SELECT/INSERT 包含 `rewrite_provider_config_id`。
- `apps/desktop/src/localStore/loadSnapshot.ts`：读取记录时把该字段放进 `snapshot.appSettings`。
- `apps/desktop/src/composables/useAppSettings.ts`：`createSnapshot` / `restore` 包含该字段；`persistToDb` 保存它。

## 选择逻辑

新增导出函数 `findActiveRewriteProviderConfig(configs, activeId)`：

- `activeId` 为空 → `undefined`。
- 按 `activeId` 查找配置，必须同时满足：
  - 存在；
  - `enabled === true`；
  - `provider === "openai" || provider === "custom"`；
  - `getProviderReadiness(config) === "ready"`。
- 任一不满足 → `undefined`，不 fallback。

保留旧的 `findEnabledRewriteProviderConfig`（供其他阶段/历史调用方使用），rewrite 执行改走 `findActiveRewriteProviderConfig`。

`useAppSettings` 中新增 `setRewriteProviderConfigId(id: string)`，直接修改 `appSettings.rewriteProviderConfigId`。

## 阶段模式规则

`App.vue` 的 `providerStageModes.rewrite` 按以下顺序判断：

1. `appSettings.rewriteProviderConfigId` 存在，且对应 config `ready && verified` → `"real"`。
2. `appSettings.rewriteProviderConfigId` 存在，但对应 config 失效/未验证 → `"not-connected"`。
3. 没有 `rewriteProviderConfigId`，但存在启用的 openai/custom Provider → `"not-connected"`（提示用户去选一个）。
4. 完全没有启用的 openai/custom Provider → `"mock"`（保留首版默认 mock 边界）。

`hasExecutableRewriteProvider()` 仅在有 active config 且 `ready && verified` 时返回 `true`。

## 执行层接线

`useRewriteProvider.ts` 的 `selectRewriteProvider` input 增加 `rewriteProviderConfigId?: string`。

- real 模式：使用 `findActiveRewriteProviderConfig(providerConfigs, rewriteProviderConfigId)`。
- 无 active config：返回 `AiProviderError("not-configured", "请在设置中选择用于文案改写的 Provider.")`。
- 其他缺失字段保持原有 not-configured 错误。

`App.vue` 调用 `selectRewriteProvider` 时传入 `appSettings.rewriteProviderConfigId`。

## UI

### `AiServicesSettings.vue`

对 openai/custom Provider：

- 若 `config.id === appSettings.rewriteProviderConfigId`，显示 badge“文案改写使用中”。
- 否则显示按钮“设为文案改写”，点击调用 `setRewriteProviderConfigId(config.id)`。
  - 未 ready 的 Provider 仍可点击切换，但 stage 会按 not-connected 提示。
- whisper / cosyvoice / heygem 不出现该按钮和标记。

### `ScriptRewritingStage.vue`

`isNotConnected` 横幅文字改为动态提示：

- 无 active id："未选择文案改写 Provider，请前往设置 → AI 服务选择。"
- 有 active id 但 config 未 ready："选中的文案改写 Provider 配置不完整，请检查 API Key、模型与 Base URL。"
- 有 active id 但未通过连接测试："选中的文案改写 Provider 尚未连接，请先测试连接。"
- 原有兜底："真实 LLM 未连接，无法生成改写文案。"

为保持组件纯净，动态提示由 `App.vue` 计算后通过 `errorMessage` prop 传入（not-connected 时优先显示该提示）。

## 删除/停用边界

- **停用**当前选中的 Provider：保留 `rewriteProviderConfigId`，`providerStageModes.rewrite` 变为 `not-connected`，提示“尚未连接”。
- **删除**当前选中的 Provider：在 `removeProviderConfig` 中若删除的是 `appSettings.rewriteProviderConfigId`，则将其清空为 `undefined`，避免设置页挂着幽灵引用。

## 测试

- `packages/core/tests/appSettings.test.ts`：验证 `createDefaultAppSettings` 包含 `rewriteProviderConfigId: undefined`。
- `apps/desktop/src/composables/useAppSettings.test.ts`：
  - 新增 `findActiveRewriteProviderConfig` 行为测试（命中、未命中、非 rewrite、未 ready、停用）。
  - 验证 `setRewriteProviderConfigId` 会持久化到 snapshot 与 SQLite。
  - 验证删除当前选中 Provider 会清空 `rewriteProviderConfigId`。
- `apps/desktop/src/composables/useRewriteProvider.test.ts`：
  - 更新测试，传入 `rewriteProviderConfigId`。
  - 新增“未选择 active id 时不 fallback”测试。
  - 删除旧的“选中第一条”断言。
- `apps/desktop/src/components/settings/AiServicesSettings.test.ts`：纯文本断言检查“设为文案改写”按钮与“文案改写使用中”标记存在。
- `packages/local-store/tests/schema.test.ts` 与 repository 测试：验证 `app_settings` 表包含 `rewrite_provider_config_id` 列。

## 返回格式预留

实现完成后按以下格式回复：

```
STATUS:
CHANGED FILES:
SUMMARY:
VERIFICATION:
MANUAL CHECK:
BLOCKERS:
NOTES:
```
