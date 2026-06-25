# 阶段 4 P0：设置 / Provider / sidecar 配置

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立设置页的信息架构：把当前 `App.vue` 中硬编码的单一 Provider 配置和静态依赖检查，拆分为可持久化的「通用设置 + Provider 配置列表 + sidecar 依赖配置」，并提供独立的 `SettingsView.vue` 入口。

**Architecture:**
- `@mirax/core` 新增 `AppSettings`、`AppOutputPaths`、`AppTheme` 类型与校验，保持纯逻辑。
- `@mirax/sidecar-manager` 新增 `SidecarConfig` 类型与校验，复用现有 `checkSidecarDependencies`。
- `@mirax/local-store` 扩展 schema 与 repository 接口，新增 `app_settings`、`sidecar_configs`，为后续 SQLite 接入预留。
- `apps/desktop` 新增 `useAppSettings()` composable，P0 用 localStorage 持久化；Provider 配置存储前过滤 API Key。
- `apps/desktop/src/components/DependencyChecklist.vue` 改为接收 `SidecarConfig` prop 并实时反映检查状态。
- `apps/desktop/src/views/SettingsView.vue` 承载三个分组：通用设置、Provider 配置列表（增删改查 + 连接测试）、sidecar 配置。
- `App.vue` 移除"密钥配置"卡片，点击左侧"设置"导航时显示 `SettingsView`。

**Tech Stack:** Vue 3 Composition API, TypeScript, `@mirax/core`, `@mirax/sidecar-manager`, `@mirax/local-store`, `@mirax/provider-ai`, Vitest.

---

## Resume Here

**当前自动调度入口：** `docs/superpowers/plans/2026-06-17-mirax-settings-provider-sidecar.md`

**当前阶段：** 阶段 4 P0。本文件是阶段 4 P0 源码 implementation plan，Task 1 → Task 11 已全部完成并通过验收，不要重复执行。

**依赖阶段 3 文档：**
- `docs/product-architecture/data-provider-sidecar-contracts.md`
- `docs/product-architecture/engineering-module-map.md`
- `docs/product-architecture/ui-ux-and-phase-4-handoff.md`

**当前源码状态：**
- `apps/desktop/src/App.vue`：已移除内嵌「密钥配置」卡片，并通过左侧「设置」导航切换到 `SettingsView.vue`。
- `apps/desktop/src/components/DependencyChecklist.vue`：已改为接收 `SidecarConfig` prop，并根据配置实时显示依赖检查状态。
- `apps/desktop/src/views/SettingsView.vue`：已承载通用设置、Provider 配置列表和 sidecar 配置。
- `packages/core`、`packages/sidecar-manager`、`packages/local-store`：已补齐本计划需要的类型、校验、schema 和 repository 预留接口。

**下一步：** 本 P0 计划已完成；后续按 `ui-ux-and-phase-4-handoff.md` 进入下一个 P0 implementation plan「发布准备与 mock 发布任务」。

---

## 范围

**本计划覆盖：**

- `@mirax/core` 的 `AppSettings` / `AppOutputPaths` / `AppTheme` 类型、默认值、校验函数及测试。
- `@mirax/sidecar-manager` 的 `SidecarConfig` 类型、默认值、校验函数及测试。
- `@mirax/local-store` 的 `app_settings` / `sidecar_configs` schema 扩展与 repository 接口扩展。
- `apps/desktop/src/composables/useAppSettings.ts` 及测试。
- `apps/desktop/src/views/SettingsView.vue`。
- `apps/desktop/src/components/DependencyChecklist.vue` 改造。
- `apps/desktop/src/App.vue` 集成 SettingsView（移除内嵌密钥卡片、设置导航可切换视图）。
- 类型检查与测试验证。

**本计划不覆盖：**

- 不接入真实 SQLite 数据库（P0 用 localStorage 持久化，保留 local-store schema 给后续迁移）。
- 不实现 keychain / 加密存储 API Key（P0 沿用 localStorage 并过滤 API Key，与 `desktopDraft` 行为一致）。
- 不实现文件/目录选择器（保留现有 `PathPickerButton.vue` 占位，输出路径先用文本输入）。
- 不修改 workbench 的 workflow 状态机（由 P0「工作台 workflow 信息架构和状态拆分」计划覆盖）。
- 不修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列。
- 不修改 `.codex/dispatch-state.json`。
- 不提交、不推送。

---

## 目标文件结构

```text
packages/core/src/
  types.ts           # 追加 AppSettings 相关类型
  validation.ts      # 追加 validateAppSettings / createDefaultAppSettings
  index.ts           # 自动重新导出
  ...tests/workflow.test.ts 等已有测试
packages/sidecar-manager/src/
  dependencyChecks.ts
  serviceStatus.ts
  config.ts          # 新增 SidecarConfig 类型与校验
  index.ts           # 追加导出
packages/local-store/src/
  schema.ts          # 追加 app_settings / sidecar_configs 建表语句
  repositories.ts    # 追加 AppSettingsRecord / SidecarConfigRecord / repository 类型
  index.ts           # 自动重新导出
apps/desktop/src/
  composables/
    useAppSettings.ts
    useAppSettings.test.ts
  views/
    SettingsView.vue
  components/
    DependencyChecklist.vue   # 改造为接收 SidecarConfig prop
  App.vue                    # 移除密钥卡片，集成 SettingsView
```

---

## 全局验证命令

每个任务完成后至少运行对应验证命令。最终验收前运行：

```bash
pnpm test packages/core
pnpm test packages/sidecar-manager
pnpm test packages/local-store
pnpm test apps/desktop/src/composables/useAppSettings.test.ts
pnpm --filter @mirax/desktop typecheck
```

预期：所有测试通过；桌面端类型检查无错误；设置页可切换、Provider 配置可增删改、sidecar 配置变更后依赖检查实时更新。

---

## 任务清单

### Task 1：在 `@mirax/core` 增加 `AppSettings` 类型与校验

**目标：** 为通用设置（主题、输出目录）提供领域类型和不可变默认值/校验函数。

**允许修改文件：**

- 修改：`packages/core/src/types.ts`
- 修改：`packages/core/src/validation.ts`

**禁止修改文件：**

- `apps/`
- `packages/core/tests/` 以外的 `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：追加类型到 `types.ts`**

在 `packages/core/src/types.ts` 的 `ProjectDraft` 接口之后追加：

```typescript
export type AppTheme = "light" | "dark" | "system";

export interface AppOutputPaths {
  baseOutput: string;
  audioOutput: string;
  videoOutput: string;
  draftOutput: string;
  exportOutput: string;
  thumbsOutput: string;
}

export interface AppSettings {
  id: string;
  theme: AppTheme;
  outputPaths: AppOutputPaths;
}
```

- [x] **Step 2：追加校验函数到 `validation.ts`**

在 `packages/core/src/validation.ts` 的 `validateProjectDraft` 之后追加：

```typescript
import type { AppSettings, AppTheme } from "./types.js";

const APP_THEMES: AppTheme[] = ["light", "dark", "system"];

export function createDefaultAppSettings(id = "default"): AppSettings {
  return {
    id,
    theme: "system",
    outputPaths: {
      baseOutput: "/Users/Shared/MiraxAI",
      audioOutput: "/Users/Shared/MiraxAI/audio",
      videoOutput: "/Users/Shared/MiraxAI/video",
      draftOutput: "/Users/Shared/MiraxAI/drafts",
      exportOutput: "/Users/Shared/MiraxAI/export",
      thumbsOutput: "/Users/Shared/MiraxAI/thumbs",
    },
  };
}

export function validateAppSettings(settings: AppSettings): string[] {
  const errors: string[] = [];

  if (!settings.id.trim()) {
    errors.push("设置 ID 不能为空");
  }

  if (!APP_THEMES.includes(settings.theme)) {
    errors.push("主题值无效");
  }

  const paths = settings.outputPaths;
  if (!paths.baseOutput.trim()) {
    errors.push("基础输出目录不能为空");
  }

  return errors;
}
```

- [x] **Step 3：运行 core 类型检查与测试**

```bash
pnpm test packages/core
```

预期：通过。

**验收标准：**

- `AppSettings`、`AppOutputPaths`、`AppTheme` 被导出。
- `createDefaultAppSettings()` 返回完整默认对象。
- `validateAppSettings()` 校验 ID、主题、基础输出目录。

---

### Task 2：为 `@mirax/core` 的 `AppSettings` 编写测试

**目标：** 覆盖默认值和校验规则。

**允许修改文件：**

- 创建：`packages/core/tests/appSettings.test.ts`

**禁止修改文件：**

- `apps/`
- `packages/core/src/` 以外的 `packages/`

- [x] **Step 1：写入测试文件**

创建 `packages/core/tests/appSettings.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { createDefaultAppSettings, validateAppSettings } from "../src/validation.js";

describe("AppSettings", () => {
  it("creates default settings with all output paths", () => {
    const settings = createDefaultAppSettings();

    expect(settings.id).toBe("default");
    expect(settings.theme).toBe("system");
    expect(settings.outputPaths.baseOutput).toBeTruthy();
    expect(settings.outputPaths.audioOutput).toContain("audio");
  });

  it("validates empty id and base output path", () => {
    const settings = createDefaultAppSettings();
    settings.id = "";
    settings.outputPaths.baseOutput = "";

    const errors = validateAppSettings(settings);

    expect(errors).toContain("设置 ID 不能为空");
    expect(errors).toContain("基础输出目录不能为空");
  });

  it("rejects invalid theme", () => {
    const settings = createDefaultAppSettings();
    (settings as { theme: string }).theme = "invalid";

    const errors = validateAppSettings(settings);

    expect(errors).toContain("主题值无效");
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test packages/core/tests/appSettings.test.ts
```

预期：3 个测试全部通过。

**验收标准：**

- 默认值、空字段、非法主题均被覆盖。

---

### Task 3：在 `@mirax/sidecar-manager` 增加 `SidecarConfig` 类型与校验

**目标：** 把依赖检查输入从匿名对象提升为具名、可校验的配置类型，供设置页使用。

**允许修改文件：**

- 创建：`packages/sidecar-manager/src/config.ts`
- 修改：`packages/sidecar-manager/src/index.ts`

**禁止修改文件：**

- `apps/`
- `packages/sidecar-manager/src/dependencyChecks.ts`（保持现有检查逻辑不变）
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：创建 `config.ts`**

创建 `packages/sidecar-manager/src/config.ts`：

```typescript
export interface SidecarConfig {
  id: string;
  ffmpegPath: string;
  pythonServiceUrl: string;
  cosyVoiceServiceUrl: string;
  heygemServiceUrl: string;
  hasPlaywrightBrowser: boolean;
}

export function createDefaultSidecarConfig(id = "default"): SidecarConfig {
  return {
    id,
    ffmpegPath: "",
    pythonServiceUrl: "",
    cosyVoiceServiceUrl: "",
    heygemServiceUrl: "",
    hasPlaywrightBrowser: false,
  };
}

export function validateSidecarConfig(config: SidecarConfig): string[] {
  const errors: string[] = [];

  if (!config.id.trim()) {
    errors.push("配置 ID 不能为空");
  }

  return errors;
}
```

- [x] **Step 2：导出新增类型**

在 `packages/sidecar-manager/src/index.ts` 追加：

```typescript
export * from "./config.js";
```

文件内容变为：

```typescript
export * from "./config.js";
export * from "./dependencyChecks.js";
export * from "./serviceStatus.js";
```

- [x] **Step 3：运行 sidecar-manager 类型检查**

```bash
pnpm --filter @mirax/sidecar-manager typecheck
```

预期：无错误。

**验收标准：**

- `SidecarConfig`、`createDefaultSidecarConfig`、`validateSidecarConfig` 被导出。
- 默认值与现有 `checkSidecarDependencies` 输入字段一一对应。

---

### Task 4：为 `@mirax/sidecar-manager` 的 `SidecarConfig` 编写测试

**目标：** 覆盖默认值与校验。

**允许修改文件：**

- 创建：`packages/sidecar-manager/tests/config.test.ts`

**禁止修改文件：**

- `apps/`
- `packages/sidecar-manager/src/` 以外的 `packages/`

- [x] **Step 1：写入测试文件**

创建 `packages/sidecar-manager/tests/config.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { createDefaultSidecarConfig, validateSidecarConfig } from "../src/config.js";

describe("SidecarConfig", () => {
  it("creates default config with empty paths", () => {
    const config = createDefaultSidecarConfig();

    expect(config.id).toBe("default");
    expect(config.ffmpegPath).toBe("");
    expect(config.hasPlaywrightBrowser).toBe(false);
  });

  it("validates empty id", () => {
    const config = createDefaultSidecarConfig();
    config.id = "";

    const errors = validateSidecarConfig(config);

    expect(errors).toContain("配置 ID 不能为空");
  });

  it("accepts valid config", () => {
    const config = createDefaultSidecarConfig("prod");
    config.ffmpegPath = "/usr/local/bin/ffmpeg";

    const errors = validateSidecarConfig(config);

    expect(errors).toHaveLength(0);
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test packages/sidecar-manager/tests/config.test.ts
```

预期：3 个测试全部通过。

**验收标准：**

- 默认值、空 ID、有效配置均被覆盖。

---

### Task 5：扩展 `@mirax/local-store` 的 schema 与 repository 接口

**目标：** 把 `app_settings`、`sidecar_configs` 纳入本地数据契约，为后续真实 SQLite 实现保留结构。

**允许修改文件：**

- 修改：`packages/local-store/src/schema.ts`
- 修改：`packages/local-store/src/repositories.ts`
- 修改：`packages/local-store/src/index.ts`（如需要，但当前已导出全部，无需修改）

**禁止修改文件：**

- `apps/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：扩展 `schema.ts`**

在 `packages/local-store/src/schema.ts` 的 `LOCAL_STORE_MIGRATIONS` 数组中，在 `workflow_tasks` 之后追加两条 SQL：

```typescript
  `CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    theme TEXT NOT NULL,
    output_paths_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sidecar_configs (
    id TEXT PRIMARY KEY,
    ffmpeg_path TEXT,
    python_service_url TEXT,
    cosy_voice_service_url TEXT,
    heygem_service_url TEXT,
    has_playwright_browser INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
```

- [x] **Step 2：扩展 `repositories.ts`**

在 `packages/local-store/src/repositories.ts` 中追加记录类型和 repository 类型：

```typescript
export interface AppSettingsRecord {
  id: string;
  theme: string;
  outputPathsJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SidecarConfigRecord {
  id: string;
  ffmpegPath?: string;
  pythonServiceUrl?: string;
  cosyVoiceServiceUrl?: string;
  heygemServiceUrl?: string;
  hasPlaywrightBrowser: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AppSettingsRepository = Repository<AppSettingsRecord>;
export type SidecarConfigRepository = Repository<SidecarConfigRecord>;
```

- [x] **Step 3：更新 `LOCAL_STORE_SCHEMA_TABLES`**

在 `packages/local-store/src/schema.ts` 中把 `app_settings` 和 `sidecar_configs` 加入 `LOCAL_STORE_SCHEMA_TABLES`：

```typescript
export const LOCAL_STORE_SCHEMA_TABLES = [
  "provider_configs",
  "content_drafts",
  "video_projects",
  "publish_accounts",
  "workflow_tasks",
  "app_settings",
  "sidecar_configs",
] as const;
```

- [x] **Step 4：运行 local-store 类型检查**

```bash
pnpm --filter @mirax/local-store typecheck
```

预期：无错误。

**验收标准：**

- `app_settings`、`sidecar_configs` 出现在 schema 表列表中。
- repository 接口包含 `AppSettingsRepository` 和 `SidecarConfigRepository`。

---

### Task 6：创建 `useAppSettings` composable

**目标：** 在桌面端统一管理应用设置、sidecar 配置和 Provider 配置列表，P0 用 localStorage 持久化，Provider 配置保存前过滤 API Key。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useAppSettings.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：写入 composable**

创建 `apps/desktop/src/composables/useAppSettings.ts`：

```typescript
import { reactive, ref, watch } from "vue";
import {
  createApiKeyProviderConfig,
  createDefaultAppSettings,
  type ApiKeyProviderConfig,
  type AppSettings,
} from "@mirax/core";
import { createDefaultSidecarConfig, type SidecarConfig } from "@mirax/sidecar-manager";

export const APP_SETTINGS_STORAGE_KEY = "mirax-ai.app-settings.v1";

export interface AppSettingsSnapshot {
  appSettings?: Partial<AppSettings>;
  sidecarConfig?: Partial<SidecarConfig>;
  providerConfigs?: Array<Omit<ApiKeyProviderConfig, "apiKey"> & { apiKey?: string }>;
}

export interface UseAppSettingsOptions {
  storage?: Storage;
}

export function useAppSettings(options: UseAppSettingsOptions = {}) {
  const storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);

  const appSettings = reactive<AppSettings>(createDefaultAppSettings());
  const sidecarConfig = reactive<SidecarConfig>(createDefaultSidecarConfig());
  const providerConfigs = ref<ApiKeyProviderConfig[]>([]);
  const saveStatus = ref("未保存");

  function createSnapshot(): AppSettingsSnapshot {
    return {
      appSettings: { ...appSettings },
      sidecarConfig: { ...sidecarConfig },
      providerConfigs: providerConfigs.value.map((config) => ({
        id: config.id,
        label: config.label,
        provider: config.provider,
        baseUrl: config.baseUrl,
        model: config.model,
        enabled: config.enabled,
      })),
    };
  }

  function restore(snapshot: Partial<AppSettingsSnapshot>) {
    if (snapshot.appSettings) {
      Object.assign(appSettings, {
        ...createDefaultAppSettings(),
        ...snapshot.appSettings,
        outputPaths: {
          ...createDefaultAppSettings().outputPaths,
          ...(snapshot.appSettings.outputPaths ?? {}),
        },
      });
    }

    if (snapshot.sidecarConfig) {
      Object.assign(sidecarConfig, {
        ...createDefaultSidecarConfig(),
        ...snapshot.sidecarConfig,
      });
    }

    if (Array.isArray(snapshot.providerConfigs)) {
      providerConfigs.value = snapshot.providerConfigs.map((config) =>
        createApiKeyProviderConfig({
          id: config.id ?? crypto.randomUUID(),
          label: config.label ?? "未命名配置",
          provider: config.provider ?? "openai",
          apiKey: config.apiKey ?? "",
          baseUrl: config.baseUrl,
          model: config.model,
          enabled: config.enabled ?? true,
        }),
      );
    }
  }

  function load() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (raw) {
        restore(JSON.parse(raw) as Partial<AppSettingsSnapshot>);
      }
      saveStatus.value = "已恢复设置";
    } catch {
      saveStatus.value = "设置读取失败";
    }
  }

  function persist() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(createSnapshot()));
      saveStatus.value = "设置已保存";
    } catch {
      saveStatus.value = "设置保存失败";
    }
  }

  function addProviderConfig(config: ApiKeyProviderConfig) {
    providerConfigs.value.push(config);
  }

  function updateProviderConfig(config: ApiKeyProviderConfig) {
    const index = providerConfigs.value.findIndex((item) => item.id === config.id);
    if (index >= 0) {
      providerConfigs.value[index] = config;
    }
  }

  function removeProviderConfig(id: string) {
    providerConfigs.value = providerConfigs.value.filter((config) => config.id !== id);
  }

  watch([() => ({ ...appSettings }), () => ({ ...sidecarConfig }), providerConfigs], persist, { deep: true });

  return {
    appSettings,
    sidecarConfig,
    providerConfigs,
    saveStatus,
    load,
    persist,
    restore,
    addProviderConfig,
    updateProviderConfig,
    removeProviderConfig,
  };
}
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无新增错误。

**验收标准：**

- `useAppSettings` 导出 settings、sidecarConfig、providerConfigs 和 CRUD 方法。
- `createSnapshot` 过滤 `apiKey`。
- 恢复时缺失字段使用默认值补齐。

---

### Task 7：为 `useAppSettings` 编写单元测试

**目标：** 验证设置恢复、Provider 配置 CRUD、API Key 过滤。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useAppSettings.test.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：创建 fake storage helper 与测试**

创建 `apps/desktop/src/composables/useAppSettings.test.ts`：

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { useAppSettings } from "./useAppSettings.js";

function createFakeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe("useAppSettings", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = createFakeStorage();
  });

  it("loads saved settings and sidecar config", () => {
    const storage = createFakeStorage();
    storage.setItem(
      "mirax-ai.app-settings.v1",
      JSON.stringify({
        appSettings: {
          id: "default",
          theme: "dark",
          outputPaths: { baseOutput: "/tmp/mirax" },
        },
        sidecarConfig: {
          id: "default",
          ffmpegPath: "/tmp/ffmpeg",
          hasPlaywrightBrowser: true,
        },
      }),
    );

    const { appSettings, sidecarConfig, saveStatus } = useAppSettings({ storage });

    expect(saveStatus.value).toBe("已恢复设置");
    expect(appSettings.theme).toBe("dark");
    expect(sidecarConfig.ffmpegPath).toBe("/tmp/ffmpeg");
    expect(sidecarConfig.hasPlaywrightBrowser).toBe(true);
    expect(appSettings.outputPaths.audioOutput).toContain("audio");
  });

  it("adds, updates and removes provider configs", () => {
    const { providerConfigs, addProviderConfig, updateProviderConfig, removeProviderConfig } = useAppSettings();

    addProviderConfig({
      id: "p1",
      label: "主模型",
      provider: "openai",
      apiKey: "sk-secret",
      baseUrl: "https://api.example.com",
      model: "gpt-4",
      enabled: true,
    });

    expect(providerConfigs.value).toHaveLength(1);

    updateProviderConfig({ ...providerConfigs.value[0], label: "主模型已更新" });
    expect(providerConfigs.value[0].label).toBe("主模型已更新");

    removeProviderConfig("p1");
    expect(providerConfigs.value).toHaveLength(0);
  });

  it("does not persist provider apiKey to storage", async () => {
    const storage = createFakeStorage();
    const { providerConfigs, addProviderConfig } = useAppSettings({ storage });

    addProviderConfig({
      id: "p1",
      label: "主模型",
      provider: "openai",
      apiKey: "sk-secret",
      enabled: true,
    });

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfigs[0]).not.toHaveProperty("apiKey");
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test apps/desktop/src/composables/useAppSettings.test.ts
```

预期：4 个测试全部通过。

**验收标准：**

- 设置恢复、Provider CRUD、API Key 过滤均被覆盖。

---

### Task 8：改造 `DependencyChecklist.vue` 以接收 `SidecarConfig` prop

**目标：** 让依赖检查组件根据用户在设置页填写的 sidecar 配置实时更新检查结果。

**允许修改文件：**

- 修改：`apps/desktop/src/components/DependencyChecklist.vue`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：重写组件**

把 `DependencyChecklist.vue` 替换为：

```vue
<script setup lang="ts">
import { computed } from "vue";
import { checkSidecarDependencies, createDefaultSidecarConfig, type SidecarConfig } from "@mirax/sidecar-manager";

const props = withDefaults(defineProps<{
  config?: SidecarConfig;
}>(), {
  config: () => createDefaultSidecarConfig(),
});

const results = computed(() =>
  checkSidecarDependencies({
    ffmpegPath: props.config.ffmpegPath,
    hasPlaywrightBrowser: props.config.hasPlaywrightBrowser,
    pythonServiceUrl: props.config.pythonServiceUrl,
    heygemServiceUrl: props.config.heygemServiceUrl,
    cosyVoiceServiceUrl: props.config.cosyVoiceServiceUrl,
  }),
);

const labelMap: Record<string, string> = {
  ffmpeg: "FFmpeg",
  playwright: "Playwright",
  python: "Python",
  heygem: "HeyGem",
  cosyvoice: "CosyVoice",
};
</script>

<template>
  <div class="dependency-list">
    <div
      v-for="result in results"
      :key="result.key"
      class="dependency-item"
      :class="{ ok: result.ok }"
    >
      <strong>{{ labelMap[result.key] ?? result.key }}</strong>
      <span>{{ result.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.dependency-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dependency-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--mx-surface-secondary);
  font-size: 13px;
}

.dependency-item.ok {
  color: var(--mx-success);
}

.dependency-item:not(.ok) {
  color: var(--mx-warning);
}
</style>
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无错误。

**验收标准：**

- `DependencyChecklist` 接受可选 `config` prop，未传时使用默认配置。
- 配置变化时计算属性自动重新检查。

---

### Task 9：创建 `SettingsView.vue`

**目标：** 提供设置页的 UI：通用设置、Provider 配置列表、sidecar 配置。

**允许修改文件：**

- 创建：`apps/desktop/src/views/SettingsView.vue`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入组件**

创建目录和文件：

```bash
mkdir -p apps/desktop/src/views
```

创建 `apps/desktop/src/views/SettingsView.vue`：

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  createApiKeyProviderConfig,
  validateProviderConfig,
  type ApiKeyProviderConfig,
  type ApiKeyProvider,
} from "@mirax/core";
import { testAiProviderConnection } from "@mirax/provider-ai";
import DependencyChecklist from "../components/DependencyChecklist.vue";
import { useAppSettings } from "../composables/useAppSettings.js";

const PROVIDER_OPTIONS: { value: ApiKeyProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "whisper", label: "Whisper" },
  { value: "cosyvoice", label: "CosyVoice" },
  { value: "heygem", label: "HeyGem" },
  { value: "custom", label: "自定义" },
];

const { appSettings, sidecarConfig, providerConfigs, saveStatus, addProviderConfig, updateProviderConfig, removeProviderConfig } =
  useAppSettings();

const editingConfig = ref<ApiKeyProviderConfig | null>(null);
const testMessages = ref<Record<string, string>>({});

function startAddProvider() {
  editingConfig.value = createApiKeyProviderConfig({
    id: crypto.randomUUID(),
    label: "",
    provider: "openai",
    apiKey: "",
  });
}

function startEditProvider(config: ApiKeyProviderConfig) {
  editingConfig.value = { ...config };
}

function cancelEditProvider() {
  editingConfig.value = null;
}

function saveProvider() {
  if (!editingConfig.value) return;

  const errors = validateProviderConfig(editingConfig.value);
  if (errors.length > 0) {
    window.alert(errors.join("\n"));
    return;
  }

  const existing = providerConfigs.value.find((config) => config.id === editingConfig.value!.id);
  if (existing) {
    updateProviderConfig(editingConfig.value);
  } else {
    addProviderConfig(editingConfig.value);
  }

  editingConfig.value = null;
}

async function testProvider(config: ApiKeyProviderConfig) {
  testMessages.value[config.id] = "检测中…";

  try {
    const input =
      config.provider === "openai"
        ? ({
            mode: "openai-compatible",
            baseUrl: config.baseUrl ?? "",
            apiKey: config.apiKey,
            model: config.model ?? "",
          } as const)
        : ({ mode: "mock" } as const);

    const result = await testAiProviderConnection(input);
    testMessages.value[config.id] = result.message;
  } catch (error) {
    testMessages.value[config.id] = error instanceof Error ? error.message : "连接测试失败";
  }
}

function toggleProviderEnabled(config: ApiKeyProviderConfig) {
  updateProviderConfig({ ...config, enabled: !config.enabled });
}
</script>

<template>
  <div class="settings-view">
    <header class="settings-header">
      <h1>设置</h1>
      <span class="save-status">{{ saveStatus }}</span>
    </header>

    <section class="settings-group">
      <h2>通用</h2>
      <label>
        <span>主题</span>
        <select v-model="appSettings.theme">
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </label>
      <label>
        <span>基础输出目录</span>
        <input v-model="appSettings.outputPaths.baseOutput" placeholder="/Users/Shared/MiraxAI" />
      </label>
    </section>

    <section class="settings-group">
      <h2>Provider 配置</h2>
      <div v-if="providerConfigs.length === 0" class="empty-state">暂无 Provider 配置</div>
      <ul class="provider-list">
        <li v-for="config in providerConfigs" :key="config.id" class="provider-item">
          <div class="provider-summary">
            <strong>{{ config.label || "未命名" }}</strong>
            <span>{{ config.provider }} · {{ config.enabled ? "启用" : "禁用" }}</span>
          </div>
          <div class="provider-actions">
            <button @click="toggleProviderEnabled(config)">{{ config.enabled ? "禁用" : "启用" }}</button>
            <button @click="startEditProvider(config)">编辑</button>
            <button @click="testProvider(config)">测试连接</button>
            <button @click="removeProviderConfig(config.id)">删除</button>
          </div>
          <div v-if="testMessages[config.id]" class="test-message">{{ testMessages[config.id] }}</div>
        </li>
      </ul>

      <button v-if="!editingConfig" class="primary" @click="startAddProvider">+ 添加 Provider 配置</button>

      <form v-if="editingConfig" class="provider-form" @submit.prevent="saveProvider">
        <h3>{{ providerConfigs.find((c) => c.id === editingConfig.id) ? "编辑" : "新增" }} Provider 配置</h3>
        <label>
          <span>名称</span>
          <input v-model="editingConfig.label" required />
        </label>
        <label>
          <span>类型</span>
          <select v-model="editingConfig.provider">
            <option v-for="option in PROVIDER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label>
          <span>Base URL</span>
          <input v-model="editingConfig.baseUrl" placeholder="https://api.openai.com/v1" />
        </label>
        <label>
          <span>模型</span>
          <input v-model="editingConfig.model" placeholder="gpt-4.1" />
        </label>
        <label>
          <span>API Key</span>
          <input v-model="editingConfig.apiKey" type="password" autocomplete="off" placeholder="用户本地填写" />
        </label>
        <div class="form-actions">
          <button type="submit" class="primary">保存</button>
          <button type="button" @click="cancelEditProvider">取消</button>
        </div>
      </form>
    </section>

    <section class="settings-group">
      <h2>本地依赖 / Sidecar</h2>
      <label>
        <span>FFmpeg 路径</span>
        <input v-model="sidecarConfig.ffmpegPath" placeholder="/usr/local/bin/ffmpeg" />
      </label>
      <label>
        <span>Python 服务地址</span>
        <input v-model="sidecarConfig.pythonServiceUrl" placeholder="http://localhost:8000" />
      </label>
      <label>
        <span>CosyVoice 服务地址</span>
        <input v-model="sidecarConfig.cosyVoiceServiceUrl" placeholder="http://localhost:8001" />
      </label>
      <label>
        <span>HeyGem 服务地址</span>
        <input v-model="sidecarConfig.heygemServiceUrl" placeholder="http://localhost:8002" />
      </label>
      <label class="checkbox-label">
        <input v-model="sidecarConfig.hasPlaywrightBrowser" type="checkbox" />
        <span>已安装 Playwright 浏览器</span>
      </label>

      <DependencyChecklist :config="sidecarConfig" />
    </section>
  </div>
</template>

<style scoped>
.settings-view {
  padding: 24px;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-header h1 {
  margin: 0;
  font-size: 22px;
}

.save-status {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.settings-group {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-group h2 {
  margin: 0 0 4px;
  font-size: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

label.checkbox-label {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

input,
select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid var(--mx-border-subtle);
  background: var(--mx-surface-secondary);
  color: var(--mx-text-primary);
}

.provider-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-item {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 8px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.provider-summary {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.provider-actions {
  display: flex;
  gap: 8px;
}

.test-message {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.provider-form {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-actions {
  display: flex;
  gap: 10px;
}

.empty-state {
  font-size: 13px;
  color: var(--mx-text-tertiary);
}
</style>
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无错误。

**验收标准：**

- `SettingsView.vue` 渲染三个分组。
- Provider 配置可新增、编辑、删除、启用/禁用、测试连接。
- sidecar 配置变更后 `DependencyChecklist` 实时更新。

---

### Task 10：在 `App.vue` 中集成 `SettingsView`

**目标：** 移除工作流卡片中的"密钥配置"卡片，点击左侧"设置"导航时在工作区显示 `SettingsView`。

**允许修改文件：**

- 修改：`apps/desktop/src/App.vue`

**禁止修改文件：**

- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：新增视图切换状态**

在 `App.vue` 的 `<script setup>` 中新增：

```typescript
import { ref } from "vue";
import SettingsView from "./views/SettingsView.vue";

const activeView = ref<"workbench" | "settings">("workbench");
```

- [x] **Step 2：修改导航按钮**

把 `WorkbenchShell.vue` 中的"设置"按钮改为切换视图：

```vue
<button class="nav-item" :class="{ active: activeView === 'settings' }" @click="emit('switchView', 'settings')">
  <Settings2 :size="18" /> 设置
</button>
```

把"首页"按钮改为：

```vue
<button class="nav-item" :class="{ active: activeView === 'workbench' }" @click="emit('switchView', 'workbench')">
  <WandSparkles :size="18" /> 首页
</button>
```

- [x] **Step 3：根据视图渲染内容**

在工作区内容区使用条件渲染：

```vue
<template v-if="activeView === 'workbench'">
  <!-- 原有 workflow 卡片 -->
</template>
<SettingsView v-else />
```

- [x] **Step 4：移除内嵌密钥配置卡片**

删除 `App.vue` 模板中原有的 `settings-card`（标题为"密钥配置"的 workflow-card）。

同时删除 `App.vue` script 中不再使用的 `providerConfig`、`providerErrors`、`connectionMessage`、`testConnection` 等定义。

- [x] **Step 5：运行类型检查与测试**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无错误。

**验收标准：**

- 工作区左侧"设置"导航可切换出 SettingsView。
- workflow-board 中不再出现"密钥配置"卡片。
- Provider 配置和 sidecar 配置在设置页独立管理。

---

### Task 11：全量验证

**目标：** 运行全部相关测试与类型检查，确认设置架构不引入回归。

**允许修改文件：**

- 无（只验证）。

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：运行新增 core 测试**

```bash
pnpm test packages/core/tests/appSettings.test.ts
```

预期：通过。

- [x] **Step 2：运行新增 sidecar-manager 测试**

```bash
pnpm test packages/sidecar-manager/tests/config.test.ts
```

预期：通过。

- [x] **Step 3：运行 local-store 测试**

```bash
pnpm test packages/local-store
```

预期：通过。

- [x] **Step 4：运行新增 desktop composable 测试**

```bash
pnpm test apps/desktop/src/composables/useAppSettings.test.ts
```

预期：通过。

- [x] **Step 5：运行桌面端既有测试**

```bash
pnpm test apps/desktop/src/runtime/desktopDraft.test.ts
pnpm test apps/desktop/src/features/task-center/taskHistory.test.ts
```

预期：通过。

- [x] **Step 6：运行全仓类型检查**

```bash
pnpm typecheck
```

预期：无错误。

- [x] **Step 7：运行 web 开发模式 smoke（可选）**

```bash
pnpm --filter @mirax/desktop dev:web
```

验证：
1. 工作台页面正常加载。
2. 点击左侧"设置"导航，显示设置页。
3. 在设置页添加一条 Provider 配置，刷新页面后配置仍存在。
4. 修改 sidecar 配置（如填写 FFmpeg 路径），依赖检查列表状态变为可用。

停止 dev server：`Control+C`。

**验收标准：**

- 所有新增和既有测试通过。
- 全仓类型检查通过。
- 设置页可独立访问、可持久化、可影响依赖检查。

---

## 自检与验收

### 规格覆盖检查

对照 `docs/product-architecture/ui-ux-and-phase-4-handoff.md` 的 P0 要求：

| 要求 | 覆盖任务 |
| --- | --- |
| 设置 / Provider / sidecar 配置 | Task 6-10 |
| Provider 配置管理 | Task 6、9 |
| sidecar 依赖配置 | Task 3、8、9 |
| 本地数据契约预留 | Task 5 |
| 与 `@mirax/core`、`@mirax/sidecar-manager`、`@mirax/local-store` 集成 | Task 1-5 |

### Placeholder 扫描

检查计划中是否包含以下禁用模式：

- [ ] 无 "TBD" / "TODO" / "implement later" / "fill in details"。
- [ ] 无 "Add appropriate error handling" 等模糊描述。
- [ ] 无 "Similar to Task N" 省略代码。
- [ ] 所有文件路径和命令均为绝对路径或相对仓库根路径。

### 类型一致性检查

- `SidecarConfig` 字段与 `checkSidecarDependencies` 输入字段名称一致：`ffmpegPath`、`hasPlaywrightBrowser`、`pythonServiceUrl`、`heygemServiceUrl`、`cosyVoiceServiceUrl`。
- `AppSettings.theme` 取值与模板中 `option value` 一致：`light` / `dark` / `system`。
- Provider 配置编辑表单使用 `validateProviderConfig` 校验。

---

## 风险与待确认问题

1. **API Key 存储安全**：P0 沿用 localStorage 并过滤 API Key，恢复时 API Key 为空。用户每次打开设置页需重新输入 API Key。后续应迁移到系统 keychain 或 Tauri 安全存储。
2. **SQLite 未接入**：`@mirax/local-store` 只扩展了 schema 和 repository 接口，P0 实际用 localStorage。后续真实数据库实现时需要把 `useAppSettings` 替换为 repository 调用。
3. **文件/目录选择器未实现**：输出目录和 FFmpeg 路径使用文本输入。P0 不引入 Tauri dialog API；后续设置计划再考虑接入。
4. **设置与 desktopDraft 的 Provider 配置双轨**：`desktopDraft`（工作台草稿）仍可能保存一份 Provider 配置。P0 暂时并存；后续统一为"设置页是配置库，工作台选择当前使用配置"。
5. **待确认：设置页是否需要在 P0 支持多 Provider 同时启用？** 当前 UI 只支持每条配置单独启用/禁用，但工作台尚未接入选择逻辑。P0 先实现列表管理，选择逻辑在后续计划处理。
6. **待确认：Playwright 浏览器安装检查是否需要在 P0 真实检测？** 不需要。P0 仅提供复选框由用户手动标记，真实 sidecar 健康检查后续实现。
