# Rewrite Provider 唯一生效选择实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 rewrite 阶段增加“唯一生效 LLM Provider”概念：用户可在 AI 服务设置中明确选择当前用于文案改写的 Provider，执行时只使用该 Provider，不再静默 fallback 到第一条。

**Architecture:** 在 `AppSettings` 与 SQLite `app_settings` 表中新增 `rewriteProviderConfigId` 字段；新增 `findActiveRewriteProviderConfig(configs, activeId)` 选择器；UI 提供“设为文案改写”/“文案改写使用中”标记；`App.vue` 与 `useRewriteProvider` 按 active id 接线；删除当前选中 Provider 时自动清空该 id。

**Tech Stack:** TypeScript, Vue 3, SQLite (tauri-plugin-sql), Vitest。

## Global Constraints

- 不 git commit，不 git push。
- 不碰与任务无关的未提交改动。
- 不接入新 provider，不改真实调用协议，不改 API Key 存储边界。
- 非 rewrite Provider（whisper/cosyvoice/heygem）不受影响。
- 未选择 active id 或选中失效时，rewrite 阶段诚实提示，不 fallback。
- `providerStageModes.rewrite` 在“没有任何启用的 openai/custom”时保持 `"mock"`。

---

### Task 1: 新增 `rewriteProviderConfigId` 数据字段与持久化

**Files:**
- Modify: `packages/core/src/types.ts`
- Modify: `packages/core/src/validation.ts`
- Modify: `packages/local-store/src/schema.ts`
- Modify: `packages/local-store/src/migrate.ts`
- Modify: `packages/local-store/src/repositories.ts`
- Modify: `apps/desktop/src/localStore/loadSnapshot.ts`
- Modify: `apps/desktop/src/composables/useAppSettings.ts`

**Interfaces:**
- Consumes: `AppSettings` 接口、现有 `AppSettingsRecord` / `AppSettingsRepository`。
- Produces: `AppSettings.rewriteProviderConfigId?: string`；SQLite `app_settings.rewrite_provider_config_id` 列；snapshot 双写支持。

- [ ] **Step 1: 在 `AppSettings` 接口新增字段**

  编辑 `packages/core/src/types.ts`：

  ```ts
  export interface AppSettings {
    id: string;
    theme: AppTheme;
    outputPaths: AppOutputPaths;
    rewriteProviderConfigId?: string;
  }
  ```

- [ ] **Step 2: `createDefaultAppSettings` 默认值**

  编辑 `packages/core/src/validation.ts`：

  ```ts
  export function createDefaultAppSettings(id = "default"): AppSettings {
    return {
      id,
      theme: "system",
      outputPaths: { ... },
      rewriteProviderConfigId: undefined,
    };
  }
  ```

- [ ] **Step 3: SQLite schema加列并安全迁移**

  编辑 `packages/local-store/src/schema.ts`：

  - 在 `CREATE TABLE app_settings` 中新增 `rewrite_provider_config_id TEXT`。
  - 在 `LOCAL_STORE_MIGRATIONS` 末尾追加：
    ```sql
    ALTER TABLE app_settings ADD COLUMN rewrite_provider_config_id TEXT;
    ```

  编辑 `packages/local-store/src/migrate.ts`：

  ```ts
  export async function migrateLocalStore(db: LocalStoreDb): Promise<void> {
    const sql = createLocalStoreMigrationSql();
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const tableInfo = await db.select<{ name: string }>("PRAGMA table_info(app_settings)");
    const hasRewriteColumn = tableInfo.some((col) => col.name === "rewrite_provider_config_id");

    for (const statement of statements) {
      if (
        hasRewriteColumn &&
        statement.toLowerCase().includes("alter table") &&
        statement.toLowerCase().includes("rewrite_provider_config_id")
      ) {
        continue;
      }
      try {
        await db.execute(statement);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("duplicate column name")) {
          continue;
        }
        throw error;
      }
    }
  }
  ```

  **注意：** `db.select` 的泛型签名按项目 `LocalStoreDb` 实际接口调整；若 `table_info` 返回对象不含 `name` 则改为对应字段名。

- [ ] **Step 4: Repository 读写新列**

  编辑 `packages/local-store/src/repositories.ts`：

  - `AppSettingsRecord` 增加 `rewriteProviderConfigId?: string;`
  - `getById` SQL：SELECT 增加 `rewrite_provider_config_id as rewriteProviderConfigId`。
  - `save` SQL：INSERT 增加列与参数 `record.rewriteProviderConfigId ?? null`。

- [ ] **Step 5: `loadSnapshot` 读取新字段**

  编辑 `apps/desktop/src/localStore/loadSnapshot.ts`：

  ```ts
  snapshot.appSettings = {
    id: appSettingsRecord.id,
    theme: appSettingsRecord.theme as AppSettings["theme"],
    outputPaths: JSON.parse(appSettingsRecord.outputPathsJson) as AppSettings["outputPaths"],
    rewriteProviderConfigId: appSettingsRecord.rewriteProviderConfigId,
  };
  ```

- [ ] **Step 6: `useAppSettings` snapshot / restore / DB 保存**

  编辑 `apps/desktop/src/composables/useAppSettings.ts`：

  - `createSnapshot` 的 `appSettings` 保留 `rewriteProviderConfigId`。
  - `restore` 的 `Object.assign(appSettings, { ...createDefaultAppSettings(), ...snapshot.appSettings, ... })` 会自动带入。
  - `persistToDb` 中 `appSettingsRepo.save` 增加 `rewriteProviderConfigId: appSettings.rewriteProviderConfigId ?? null,`。

- [ ] **Step 7: 运行核心包测试**

  ```bash
  pnpm test packages/local-store/tests/schema.test.ts
  pnpm test packages/core/tests/appSettings.test.ts
  pnpm --filter @mirax/local-store typecheck
  pnpm --filter @mirax/core typecheck
  ```

  预期：全部通过。

---

### Task 2: 新增 `findActiveRewriteProviderConfig` 与选择 API

**Files:**
- Modify: `apps/desktop/src/composables/useAppSettings.ts`
- Test: `apps/desktop/src/composables/useAppSettings.test.ts`

**Interfaces:**
- Consumes: `ApiKeyProviderConfig[]`, `getProviderReadiness`。
- Produces: `findActiveRewriteProviderConfig(configs, activeId)`, `setRewriteProviderConfigId(id)`。

- [ ] **Step 1: 实现 `findActiveRewriteProviderConfig`**

  在 `useAppSettings.ts` 中 `findEnabledRewriteProviderConfig` 附近新增：

  ```ts
  export function findActiveRewriteProviderConfig(
    configs: ApiKeyProviderConfig[],
    activeId: string | undefined,
  ): ApiKeyProviderConfig | undefined {
    if (!activeId) return undefined;
    const config = configs.find((c) => c.id === activeId);
    if (!config) return undefined;
    if (!config.enabled) return undefined;
    if (config.provider !== "openai" && config.provider !== "custom") return undefined;
    if (getProviderReadiness(config) !== "ready") return undefined;
    return config;
  }
  ```

- [ ] **Step 2: 在 `useAppSettings` 返回 `setRewriteProviderConfigId`**

  在 `useAppSettings` 内部新增：

  ```ts
  function setRewriteProviderConfigId(id: string) {
    appSettings.rewriteProviderConfigId = id;
  }
  ```

  并在 `return` 对象中加入 `setRewriteProviderConfigId`。

- [ ] **Step 3: 删除当前选中 Provider 时清空 id**

  在 `removeProviderConfig` 中：

  ```ts
  function removeProviderConfig(id: string) {
    providerConfigs.value = providerConfigs.value.filter((config) => config.id !== id);
    clearProviderVerified(id);
    clearProviderFailed(id);

    if (appSettings.rewriteProviderConfigId === id) {
      appSettings.rewriteProviderConfigId = undefined;
    }
    // ... 原有 DB 删除逻辑
  }
  ```

- [ ] **Step 4: 写测试**

  在 `useAppSettings.test.ts` 中新增 `describe("findActiveRewriteProviderConfig", ...)`：

  - active id 命中且 ready 的 openai/custom → 返回该 config。
  - active id 未命中 → undefined。
  - active id 命中但 config 被停用 → undefined。
  - active id 命中但 provider 是 whisper → undefined。
  - active id 命中但 apiKey 为空（未 ready）→ undefined。
  - 删除当前选中 provider 后 `appSettings.rewriteProviderConfigId` 清空。

- [ ] **Step 5: 运行测试**

  ```bash
  pnpm test apps/desktop/src/composables/useAppSettings.test.ts
  ```

  预期：通过。

---

### Task 3: AI 服务设置 UI 增加“设为文案改写”操作

**Files:**
- Modify: `apps/desktop/src/components/settings/AiServicesSettings.vue`
- Test: `apps/desktop/src/components/settings/AiServicesSettings.test.ts`

**Interfaces:**
- Consumes: `appSettings.rewriteProviderConfigId`, `setRewriteProviderConfigId`, `getProviderReadiness`。
- Produces: UI 按钮 / 标记；纯文本测试断言。

- [ ] **Step 1: 从 `useAppSettings` 解构新增 API**

  ```ts
  const {
    providerConfigs,
    appSettings,
    addProviderConfig,
    updateProviderConfig,
    removeProviderConfig,
    setRewriteProviderConfigId,
    // ...
  } = useAppSettings();
  ```

- [ ] **Step 2: 增加判断函数**

  ```ts
  function isRewriteProvider(config: ApiKeyProviderConfig): boolean {
    return config.provider === "openai" || config.provider === "custom";
  }

  function isActiveRewriteProvider(config: ApiKeyProviderConfig): boolean {
    return isRewriteProvider(config) && appSettings.rewriteProviderConfigId === config.id;
  }
  ```

- [ ] **Step 3: 在 provider-row 中渲染按钮/标记**

  在 `provider-actions` 区域（编辑/测试/删除按钮旁）增加：

  ```vue
  <button
    v-if="isRewriteProvider(config) && !isActiveRewriteProvider(config)"
    type="button"
    class="ghost-button"
    @click="setRewriteProviderConfigId(config.id)"
  >
    设为文案改写
  </button>
  <span
    v-if="isActiveRewriteProvider(config)"
    class="provider-status ready"
  >
    <CheckCircle2 :size="12" />
    文案改写使用中
  </span>
  ```

  注意：按钮也可在 config 未 ready 时显示，点击后 stage 会按 not-connected 提示。

- [ ] **Step 4: 更新纯文本测试**

  在 `AiServicesSettings.test.ts` 中新增 describe：

  ```ts
  describe("rewrite provider selection UI", () => {
    it("shows '设为文案改写' action for openai/custom providers", () => {
      expect(source).toContain("设为文案改写");
    });

    it("shows active rewrite provider badge", () => {
      expect(source).toContain("文案改写使用中");
    });

    it("calls setRewriteProviderConfigId when selecting", () => {
      expect(source).toContain("setRewriteProviderConfigId(config.id)");
    });
  });
  ```

- [ ] **Step 5: 运行测试与类型检查**

  ```bash
  pnpm test apps/desktop/src/components/settings/AiServicesSettings.test.ts
  pnpm --filter @mirax/desktop typecheck
  ```

  预期：通过。

---

### Task 4: rewrite 执行层接线

**Files:**
- Modify: `apps/desktop/src/composables/useRewriteProvider.ts`
- Modify: `apps/desktop/src/App.vue`
- Modify: `apps/desktop/src/components/workbench/stages/ScriptRewritingStage.vue`
- Test: `apps/desktop/src/composables/useRewriteProvider.test.ts`

**Interfaces:**
- Consumes: `findActiveRewriteProviderConfig`, `appSettings.rewriteProviderConfigId`。
- Produces: `RewriteProviderSelectionInput.rewriteProviderConfigId`；`providerStageModes.rewrite` 新规则；动态 not-connected 提示。

- [ ] **Step 1: `useRewriteProvider.ts` 接收 active id**

  编辑 input 接口：

  ```ts
  export interface RewriteProviderSelectionInput {
    stageMode: WorkflowStageRuntimeMode;
    providerConfigs: ApiKeyProviderConfig[];
    mockProvider: AiProvider;
    rewriteProviderConfigId?: string;
  }
  ```

  在 `selectRewriteProvider` 的 real 分支中：

  ```ts
  const config = findActiveRewriteProviderConfig(input.providerConfigs, input.rewriteProviderConfigId);
  if (!config) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "请在设置中选择用于文案改写的 Provider。"),
    };
  }
  ```

  删除 `findEnabledRewriteProviderConfig` 的 import，改为 `findActiveRewriteProviderConfig`。

- [ ] **Step 2: 更新 `useRewriteProvider.test.ts`**

  - 所有 real 模式测试统一传入 `rewriteProviderConfigId: "test"`（与默认 makeConfig id 一致）。
  - 新增测试：
    ```ts
    it("returns not-configured when rewriteProviderConfigId is not set", () => {
      const result = selectRewriteProvider({
        stageMode: "real",
        providerConfigs: [makeConfig()],
        mockProvider,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("not-configured");
    });
    ```
  - 更新/删除旧的“selects first enabled openai/custom provider when other providers are enabled earlier”断言；改为 active id 匹配测试。

- [ ] **Step 3: `App.vue` 接线**

  编辑 `App.vue`：

  - `import { findActiveRewriteProviderConfig, ... }`。
  - `hasExecutableRewriteProvider()` 改为：
    ```ts
    function hasExecutableRewriteProvider(): boolean {
      const config = findActiveRewriteProviderConfig(
        providerConfigs.value,
        appSettings.rewriteProviderConfigId,
      );
      return Boolean(config && isProviderVerified(config.id));
    }
    ```
  - `providerStageModes.rewrite` 改为按规则判断：
    ```ts
    const hasEnabledRewrite = providerConfigs.value.some(
      (c) => c.enabled && (c.provider === "openai" || c.provider === "custom"),
    );
    const rewriteMode: WorkflowStageRuntimeMode = hasExecutableRewriteProvider()
      ? "real"
      : hasEnabledRewrite || appSettings.rewriteProviderConfigId
        ? "not-connected"
        : "mock";
    ```
  - `executeStage("rewrite")` 中调用 `selectRewriteProvider` 时传入 `rewriteProviderConfigId: appSettings.rewriteProviderConfigId`。

- [ ] **Step 4: `ScriptRewritingStage.vue` 动态提示**

  `isNotConnected` 横幅改为优先显示 `errorMessage`：

  ```vue
  <div v-if="isNotConnected" class="status-banner status-warning">
    <AlertCircle :size="14" />
    <span>{{ errorMessage || "真实 LLM 未连接。请在设置中配置并启用 OpenAI-compatible provider 后再试。" }}</span>
  </div>
  ```

  在 `App.vue` 中增加 `rewriteProviderHint` computed 并传给 `ScriptRewritingStage` 的 `errorMessage`：

  ```ts
  const rewriteProviderHint = computed(() => {
    const activeId = appSettings.rewriteProviderConfigId;
    if (!activeId) {
      const hasEnabledRewrite = providerConfigs.value.some(
        (c) => c.enabled && (c.provider === "openai" || c.provider === "custom"),
      );
      return hasEnabledRewrite
        ? "未选择文案改写 Provider，请前往设置 → AI 服务选择。"
        : "真实 LLM 未连接。请在设置中配置并启用 OpenAI-compatible provider 后再试。";
    }
    const config = providerConfigs.value.find((c) => c.id === activeId);
    if (!config || !config.enabled) {
      return "选中的文案改写 Provider 已停用或被删除，请重新选择。";
    }
    if (getProviderReadiness(config) !== "ready") {
      return "选中的文案改写 Provider 配置不完整，请检查 API Key、模型与 Base URL。";
    }
    if (!isProviderVerified(config.id)) {
      return "选中的文案改写 Provider 尚未通过连接测试，请先测试连接。";
    }
    return "";
  });
  ```

  在模板中 `<ScriptRewritingStage :error-message="rewriteErrorMessage || rewriteProviderHint" ... />`。

- [ ] **Step 5: 运行测试与类型检查**

  ```bash
  pnpm test apps/desktop/src/composables/useRewriteProvider.test.ts
  pnpm --filter @mirax/desktop typecheck
  ```

  预期：通过。

---

### Task 5: 全仓验证与收尾

**Files:**
- 所有已修改文件。

- [ ] **Step 1: 运行全仓测试**

  ```bash
  pnpm test
  ```

  预期：全通过（当前基线 451 tests）。

- [ ] **Step 2: 运行全仓类型检查**

  ```bash
  pnpm typecheck
  ```

  预期：通过。

- [ ] **Step 3: 构建桌面端 Web 产物**

  ```bash
  pnpm --filter @mirax/desktop build:web
  ```

  预期：构建成功。

- [ ] **Step 4: 手动走查**

  启动 dev:web 或 Tauri dev，确认：
  1. 添加两个 openai/custom Provider，启用并测试连接。
  2. UI 显示“文案改写使用中”与“设为文案改写”。
  3. 切换后标记随之切换。
  4. 停用当前选中 Provider，rewrite 阶段提示 not-connected。
  5. 删除当前选中 Provider，设置中 id 清空。
  6. 刷新页面，选择保留。

- [ ] **Step 5: 按返回格式整理结果**

  输出：
  ```
  STATUS:
  CHANGED FILES:
  SUMMARY:
  VERIFICATION:
  MANUAL CHECK:
  BLOCKERS:
  NOTES:
  ```

---

## Self-Review Checklist

- [x] Spec coverage：数据字段、选择函数、UI、执行接线、测试均有对应 Task。
- [x] Placeholder scan：无 TBD/TODO，所有代码片段与命令具体。
- [x] Type consistency：`rewriteProviderConfigId` / `rewrite_provider_config_id` 命名统一；`findActiveRewriteProviderConfig` 签名一致。
