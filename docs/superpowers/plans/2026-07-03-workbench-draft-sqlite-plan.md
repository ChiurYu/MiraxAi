# Workbench 草稿 SQLite 优先迁移实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Workbench 单份草稿从 localStorage 优先迁移到 SQLite 优先，保持 localStorage fallback，并补充测试覆盖。

**Architecture:** 在 `packages/local-store` 新增 `workbench_drafts` 表与 `createWorkbenchDraftRepository`；`useWorkbenchDraft` 通过模块级 `sharedDb` 优先读写 SQLite，无 db 时保持现有 localStorage 逻辑；`initLocalStore` 初始化成功后注入 db。

**Tech Stack:** TypeScript, Vue 3, Vitest, SQLite via `@tauri-apps/plugin-sql`, pnpm monorepo.

## Global Constraints

- 只做 Workbench 当前草稿，不做多草稿、不做列表、不做切换、不做项目管理。
- 不改发布任务、账号、provider 配置相关表。
- 草稿固定 id 使用 `"default"`。
- payload 中不包含 `apiKey` / `token` / `secret` / `password`。
- 复用现有 `sanitizeDesktopDraftForStorage` / `restoreDesktopDraft`。
- 浏览器 dev:web 无 Tauri SQL 时回退 localStorage。
- 不主动迁移历史 localStorage 草稿；顺手时不写复杂迁移逻辑。

---

## File Structure

| 文件 | 职责 |
|------|------|
| `packages/local-store/src/schema.ts` | 新增 `workbench_drafts` 表迁移 |
| `packages/local-store/src/repositories.ts` | 新增 `WorkbenchDraftRecord`、`WorkbenchDraftRepository`、`createWorkbenchDraftRepository` |
| `packages/local-store/tests/repositories.test.ts` | 新增 repository 单元测试 |
| `apps/desktop/src/composables/useWorkbenchDraft.ts` | 注入 `db`，SQLite 优先，localStorage fallback |
| `apps/desktop/src/localStore/init.ts` | 初始化成功后调用 `setWorkbenchDraftDb(db)` |
| `apps/desktop/src/composables/useWorkbenchDraft.test.ts` | 新增 SQLite/fallback/无 secret/恢复字段测试 |

---

### Task 1: 新增 `workbench_drafts` 表

**Files:**
- Modify: `packages/local-store/src/schema.ts`

**Interfaces:**
- Consumes: 现有 `LOCAL_STORE_MIGRATIONS` 数组。
- Produces: 新增 `workbench_drafts` 建表语句；`LOCAL_STORE_SCHEMA_TABLES` 增加表名。

- [ ] **Step 1: 在 `LOCAL_STORE_SCHEMA_TABLES` 追加 `"workbench_drafts"`**

```typescript
export const LOCAL_STORE_SCHEMA_TABLES = [
  "provider_configs",
  "provider_secrets",
  "content_drafts",
  "video_projects",
  "publish_accounts",
  "workflow_tasks",
  "app_settings",
  "sidecar_configs",
  "publish_tasks",
  "workbench_drafts",
] as const;
```

- [ ] **Step 2: 在 `LOCAL_STORE_MIGRATIONS` 末尾追加建表语句**

```typescript
  `CREATE TABLE IF NOT EXISTS workbench_drafts (
    id TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
```

- [ ] **Step 3: 运行 schema 测试**

Run: `pnpm test packages/local-store/tests/schema.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/local-store/src/schema.ts
git commit -m "feat(local-store): add workbench_drafts table"
```

---

### Task 2: 实现 `WorkbenchDraftRepository`

**Files:**
- Modify: `packages/local-store/src/repositories.ts`

**Interfaces:**
- Consumes: `LocalStoreDb`。
- Produces: `WorkbenchDraftRecord`、`WorkbenchDraftRepository`、`createWorkbenchDraftRepository(db)`。

- [ ] **Step 1: 在文件上部接口区新增类型**

```typescript
export interface WorkbenchDraftRecord {
  id: string;
  payloadJson: string;
  updatedAt: string;
}

export interface WorkbenchDraftRepository {
  getById(id: string): Promise<WorkbenchDraftRecord | undefined>;
  save(record: WorkbenchDraftRecord): Promise<void>;
  deleteById(id: string): Promise<void>;
}
```

- [ ] **Step 2: 在 repository 工厂区新增 `createWorkbenchDraftRepository`**

```typescript
export function createWorkbenchDraftRepository(db: LocalStoreDb): WorkbenchDraftRepository {
  return {
    async getById(id: string): Promise<WorkbenchDraftRecord | undefined> {
      const rows = await db.select<WorkbenchDraftRecord>(
        `SELECT id, payload_json as payloadJson, updated_at as updatedAt FROM workbench_drafts WHERE id = ?`,
        [id],
      );
      return rows[0];
    },
    async save(record: WorkbenchDraftRecord): Promise<void> {
      const t = nowIso();
      await db.execute(
        `INSERT OR REPLACE INTO workbench_drafts (id, payload_json, updated_at) VALUES (?, ?, ?)`,
        [record.id, record.payloadJson, record.updatedAt ?? t],
      );
    },
    async deleteById(id: string): Promise<void> {
      await db.execute(`DELETE FROM workbench_drafts WHERE id = ?`, [id]);
    },
  };
}
```

- [ ] **Step 3: 运行 repository 测试**

Run: `pnpm test packages/local-store/tests/repositories.test.ts`
Expected: PASS（既有测试）

- [ ] **Step 4: Commit**

```bash
git add packages/local-store/src/repositories.ts
git commit -m "feat(local-store): add WorkbenchDraftRepository"
```

---

### Task 3: 为 `WorkbenchDraftRepository` 写单元测试

**Files:**
- Modify: `packages/local-store/tests/repositories.test.ts`

**Interfaces:**
- Consumes: `FakeLocalStoreDb`、`createWorkbenchDraftRepository`。
- Produces: 通过测试验证 SQL 与字段映射。

- [ ] **Step 1: 在文件顶部 import 中追加 `createWorkbenchDraftRepository`**

```typescript
import {
  FakeLocalStoreDb,
  createAppSettingsRepository,
  createProviderConfigRepository,
  createProviderSecretsRepository,
  createSidecarConfigRepository,
  createWorkbenchDraftRepository,
} from "../src/index.js";
```

- [ ] **Step 2: 在文件末尾追加测试**

```typescript
describe("createWorkbenchDraftRepository", () => {
  it("saves draft payload with correct SQL and bind parameters", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createWorkbenchDraftRepository(db);

    await repo.save({
      id: "default",
      payloadJson: JSON.stringify({ project: { name: "测试" } }),
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO workbench_drafts");
    expect(call.bind).toContain("default");
    expect(call.bind).toContain(JSON.stringify({ project: { name: "测试" } }));
  });

  it("maps select rows to camelCase record", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, payload_json as payloadJson, updated_at as updatedAt FROM workbench_drafts WHERE id = ?`,
      [
        {
          id: "default",
          payloadJson: "{}",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createWorkbenchDraftRepository(db);
    const record = await repo.getById("default");

    expect(record?.id).toBe("default");
    expect(record?.payloadJson).toBe("{}");
  });

  it("deletes draft by id", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createWorkbenchDraftRepository(db);

    await repo.deleteById("default");

    const call = db.calls[0];
    expect(call.sql).toContain("DELETE FROM workbench_drafts");
    expect(call.bind).toEqual(["default"]);
  });
});
```

- [ ] **Step 3: 运行 repository 测试**

Run: `pnpm test packages/local-store/tests/repositories.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/local-store/tests/repositories.test.ts
git commit -m "test(local-store): cover WorkbenchDraftRepository"
```

---

### Task 4: 改造 `useWorkbenchDraft` 支持 SQLite 优先

**Files:**
- Modify: `apps/desktop/src/composables/useWorkbenchDraft.ts`

**Interfaces:**
- Consumes: `LocalStoreDb`、`createWorkbenchDraftRepository`、`sanitizeDesktopDraftForStorage`、`restoreDesktopDraft`。
- Produces: `setWorkbenchDraftDb(db)`、`UseWorkbenchDraftOptions.db`、SQLite 优先 persist/restore。

- [ ] **Step 1: 修改 import 与 options**

```typescript
import { reactive, ref, watch } from "vue";
import { createWorkbenchDraftRepository, type LocalStoreDb } from "@mirax/local-store";
import {
  DESKTOP_DRAFT_STORAGE_KEY,
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
  type DesktopDraft,
} from "../runtime/desktopDraft.js";

export interface UseWorkbenchDraftOptions {
  storage?: Storage;
  db?: LocalStoreDb;
}

const WORKBENCH_DRAFT_ID = "default";

let sharedDb: LocalStoreDb | undefined;

export function setWorkbenchDraftDb(db: LocalStoreDb | undefined): void {
  sharedDb = db;
}

export function getWorkbenchDraftDb(): LocalStoreDb | undefined {
  return sharedDb;
}
```

- [ ] **Step 2: 修改 `useWorkbenchDraft` 主函数与 restore**

```typescript
export function useWorkbenchDraft(options: UseWorkbenchDraftOptions = {}) {
  const storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const db = options.db ?? sharedDb;
  const draft = reactive<DesktopDraft>(createDefaultDesktopDraft());
  const saveStatus = ref("未保存");

  async function restoreFromDb(): Promise<boolean> {
    if (!db) return false;
    try {
      const repo = createWorkbenchDraftRepository(db);
      const record = await repo.getById(WORKBENCH_DRAFT_ID);
      if (!record) return false;

      const saved = JSON.parse(record.payloadJson) as Partial<DesktopDraft>;
      const restored = restoreDesktopDraft(saved);
      Object.assign(draft.project, restored.project);
      Object.assign(draft.providerConfig, restored.providerConfig);
      draft.activeStageId = restored.activeStageId;
      draft.workflow = restored.workflow;
      draft.transcriptText = restored.transcriptText;
      saveStatus.value = "已恢复草稿";
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("SQLite 草稿恢复失败，尝试 localStorage", error);
      return false;
    }
  }

  function restoreFromStorage(): boolean {
    if (!storage) return false;
    try {
      const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
      if (!raw) return false;

      const saved = JSON.parse(raw) as Partial<DesktopDraft>;
      const restored = restoreDesktopDraft(saved);
      Object.assign(draft.project, restored.project);
      Object.assign(draft.providerConfig, restored.providerConfig);
      draft.activeStageId = restored.activeStageId;
      draft.workflow = restored.workflow;
      draft.transcriptText = restored.transcriptText;
      saveStatus.value = "已恢复草稿";
      return true;
    } catch {
      saveStatus.value = "草稿读取失败";
      return false;
    }
  }

  async function restore() {
    const restoredFromDb = await restoreFromDb();
    if (restoredFromDb) return;

    const restoredFromStorage = restoreFromStorage();
    if (!restoredFromStorage && !storage) {
      saveStatus.value = "无可用存储";
    }
  }
```

- [ ] **Step 3: 修改 persist**

```typescript
  async function persistToDb(): Promise<boolean> {
    if (!db) return false;
    try {
      const repo = createWorkbenchDraftRepository(db);
      const payload = sanitizeDesktopDraftForStorage(draft);
      await repo.save({
        id: WORKBENCH_DRAFT_ID,
        payloadJson: JSON.stringify(payload),
        updatedAt: new Date().toISOString(),
      });
      saveStatus.value = "草稿已保存";
      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("SQLite 草稿保存失败，回退 localStorage", error);
      return false;
    }
  }

  function persistToStorage(): boolean {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return false;
    }
    try {
      const payload = sanitizeDesktopDraftForStorage(draft);
      storage.setItem(DESKTOP_DRAFT_STORAGE_KEY, JSON.stringify(payload));
      saveStatus.value = "草稿已保存";
      return true;
    } catch {
      saveStatus.value = "草稿保存失败";
      return false;
    }
  }

  async function persist() {
    const persistedToDb = await persistToDb();
    if (persistedToDb) return;
    persistToStorage();
  }
```

- [ ] **Step 4: 修改 watch 调用以支持 async persist**

```typescript
  watch(
    [() => draft.project, () => draft.providerConfig, () => draft.activeStageId, () => draft.workflow, () => draft.transcriptText],
    () => {
      void persist();
    },
    { deep: true },
  );

  void restore();

  return {
    draft,
    saveStatus,
    restore,
    persist,
  };
}
```

- [ ] **Step 5: 运行既有 useWorkbenchDraft 测试**

Run: `pnpm test apps/desktop/src/composables/useWorkbenchDraft.test.ts`
Expected: 既有 localStorage 测试 PASS（因为默认无 db）

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/composables/useWorkbenchDraft.ts
git commit -m "feat(desktop): useWorkbenchDraft prefers SQLite with localStorage fallback"
```

---

### Task 5: 在 `initLocalStore` 成功后注入 db

**Files:**
- Modify: `apps/desktop/src/localStore/init.ts`

**Interfaces:**
- Consumes: `setWorkbenchDraftDb`。
- Produces: 初始化成功后将 db 共享给 `useWorkbenchDraft`。

- [ ] **Step 1: 在 init.ts 中 import `setWorkbenchDraftDb`**

```typescript
import { setWorkbenchDraftDb } from "../composables/useWorkbenchDraft.js";
```

- [ ] **Step 2: 在 `initLocalStore` 成功后调用 `setWorkbenchDraftDb(db)`**

```typescript
    setAppSettingsLocalStoreDb(db);
    setWorkbenchDraftDb(db);
    return db;
```

- [ ] **Step 3: 运行 desktop 类型检查**

Run: `pnpm --filter @mirax/desktop typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/localStore/init.ts
git commit -m "feat(desktop): inject localStore db into useWorkbenchDraft"
```

---

### Task 6: 补充 `useWorkbenchDraft` SQLite 与 fallback 测试

**Files:**
- Modify: `apps/desktop/src/composables/useWorkbenchDraft.test.ts`

**Interfaces:**
- Consumes: `FakeLocalStoreDb`、`createWorkbenchDraftRepository`、`setWorkbenchDraftDb`。
- Produces: 覆盖 SQLite 优先、fallback、无 secret、恢复字段的测试用例。

- [ ] **Step 1: 在文件顶部 import 中追加**

```typescript
import { FakeLocalStoreDb, createWorkbenchDraftRepository } from "@mirax/local-store";
import { setWorkbenchDraftDb } from "./useWorkbenchDraft.js";
```

- [ ] **Step 2: 在 `beforeEach` 中重置 sharedDb**

```typescript
  beforeEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = createFakeStorage();
    setWorkbenchDraftDb(undefined);
  });
```

- [ ] **Step 3: 追加 SQLite 优先测试**

```typescript
  it("prefers SQLite over localStorage when db is available", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createWorkbenchDraftRepository(db);
    await repo.save({
      id: "default",
      payloadJson: JSON.stringify({
        project: { name: "SQLite 项目", sourceVideoPath: "", voiceSamplePath: "", notes: "", targetPlatforms: ["douyin"] },
        providerConfig: { id: "main-ai", label: "主模型配置", provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1", enabled: true },
        activeStageId: "rewrite",
        transcriptText: "SQLite 文案",
      }),
      updatedAt: new Date().toISOString(),
    });

    const storage = createFakeStorage();
    storage.setItem(
      DESKTOP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        project: { name: "LocalStorage 项目", sourceVideoPath: "", voiceSamplePath: "", notes: "", targetPlatforms: ["douyin"] },
        providerConfig: { id: "main-ai", label: "主模型配置", provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1", enabled: true },
      }),
    );

    const { draft, saveStatus } = useWorkbenchDraft({ storage, db });
    await nextTick();

    expect(saveStatus.value).toBe("已恢复草稿");
    expect(draft.project.name).toBe("SQLite 项目");
    expect(draft.activeStageId).toBe("rewrite");
    expect(draft.transcriptText).toBe("SQLite 文案");
  });

  it("persists changes to SQLite when db is available", async () => {
    const db = new FakeLocalStoreDb();
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage, db });

    draft.project.name = "SQLite 新项目";
    await nextTick();

    const repo = createWorkbenchDraftRepository(db);
    const record = await repo.getById("default");
    expect(record).toBeTruthy();
    const parsed = JSON.parse(record!.payloadJson);
    expect(parsed.project.name).toBe("SQLite 新项目");
  });

  it("falls back to localStorage when SQLite is unavailable", async () => {
    const storage = createFakeStorage();
    storage.setItem(
      DESKTOP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        project: { name: "LocalStorage 项目", sourceVideoPath: "", voiceSamplePath: "", notes: "", targetPlatforms: ["douyin"] },
        providerConfig: { id: "main-ai", label: "主模型配置", provider: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1", enabled: true },
        activeStageId: "avatar",
        transcriptText: "LocalStorage 文案",
      }),
    );

    const { draft, saveStatus } = useWorkbenchDraft({ storage });

    expect(saveStatus.value).toBe("已恢复草稿");
    expect(draft.project.name).toBe("LocalStorage 项目");
    expect(draft.activeStageId).toBe("avatar");
    expect(draft.transcriptText).toBe("LocalStorage 文案");
  });

  it("does not persist apiKey to SQLite", async () => {
    const db = new FakeLocalStoreDb();
    const { draft } = useWorkbenchDraft({ db });

    draft.providerConfig.apiKey = "sk-secret";
    await nextTick();

    const repo = createWorkbenchDraftRepository(db);
    const record = await repo.getById("default");
    expect(record).toBeTruthy();
    const parsed = JSON.parse(record!.payloadJson);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });

  it("does not persist apiKey to localStorage when db is unavailable", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.providerConfig.apiKey = "sk-secret";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });
```

- [ ] **Step 4: 运行 useWorkbenchDraft 测试**

Run: `pnpm test apps/desktop/src/composables/useWorkbenchDraft.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/composables/useWorkbenchDraft.test.ts
git commit -m "test(desktop): cover useWorkbenchDraft SQLite priority and fallback"
```

---

### Task 7: 全局验证

**Files:**
- 无新增/修改，只运行验证命令。

- [ ] **Step 1: 运行 local-store repository 测试**

Run: `pnpm test packages/local-store/tests/repositories.test.ts`
Expected: PASS

- [ ] **Step 2: 运行 desktop 相关测试**

Run: `pnpm test apps/desktop/src/runtime/desktopDraft.test.ts apps/desktop/src/composables/useWorkbenchDraft.test.ts`
Expected: PASS

- [ ] **Step 3: 运行 desktop 类型检查**

Run: `pnpm --filter @mirax/desktop typecheck`
Expected: PASS

- [ ] **Step 4: 运行 desktop web 构建**

Run: `pnpm --filter @mirax/desktop build:web`
Expected: PASS

- [ ] **Step 5: 检查 diff 空白**

Run: `git diff --check`
Expected: 无输出（无空白错误）

- [ ] **Step 6: Commit（可选）**

若验证后有未提交改动，按需提交。

---

## Spec Coverage 检查

| 需求 | 对应任务 |
|------|----------|
| 新增 `workbench_drafts` 表 | Task 1 |
| 新增 `WorkbenchDraftRepository`（getById/save/deleteById） | Task 2 |
| repository 测试覆盖 | Task 3 |
| `useWorkbenchDraft` 优先 SQLite | Task 4 |
| `useWorkbenchDraft` fallback localStorage | Task 4 |
| 复用 sanitize/restore 逻辑 | Task 4 |
| payload 不含 secret | Task 4 + Task 6 |
| 恢复 activeStageId/workflow/transcriptText | Task 4 + Task 6 |
| `initLocalStore` 注入 db | Task 5 |
| 验证命令 | Task 7 |

## Placeholder 检查

- 无 TBD/TODO。
- 所有步骤包含具体代码或命令。
- 无 "add appropriate error handling" 等模糊描述。
