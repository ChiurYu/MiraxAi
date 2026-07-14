# 发布任务与历史 SQLite 优先迁移实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将发布任务与发布历史从 localStorage 优先迁移到 SQLite 优先，保持 localStorage fallback。

**Architecture:** 复用 `packages/local-store` 已有 `publish_tasks` 表并新增 `task_history` 表；`publishTaskStore` 与 `taskHistory` 通过模块级 `sharedDb` 优先读写 SQLite，无 db 时保持现有 localStorage 逻辑；`initLocalStore` 初始化成功后注入 db。

**Tech Stack:** TypeScript, Vue 3, Vitest, SQLite via `@tauri-apps/plugin-sql`, pnpm monorepo.

## Global Constraints

- 复用已有 `publish_tasks` 表，不修改其字段。
- 新增 `task_history` 表存储历史聚合项。
- 不修改账号系统、不接入真实平台 API、不伪造发布成功。
- `submitted` draft 仍然保持 `submitted`，不得写成 `success`。
- payload 中不包含 `apiKey` / `token` / `secret` / `password`。
- 浏览器 dev:web 无 Tauri SQL 时回退 localStorage。
- 不主动迁移历史 localStorage 数据。

---

## File Structure

| 文件 | 职责 |
|------|------|
| `packages/local-store/src/schema.ts` | 新增 `task_history` 表迁移 |
| `packages/local-store/src/repositories.ts` | 新增 `TaskHistoryRecord`、`TaskHistoryRepository`、`createTaskHistoryRepository`；复用已有 `createPublishTaskRepository` |
| `packages/local-store/tests/repositories.test.ts` | 新增 `createTaskHistoryRepository` 单元测试 |
| `apps/desktop/src/features/task-center/publishTaskStore.ts` | 注入 `db`，SQLite 优先，localStorage fallback |
| `apps/desktop/src/features/task-center/taskHistory.ts` | 注入 `db`，SQLite 优先，localStorage fallback |
| `apps/desktop/src/localStore/init.ts` | 初始化成功后调用 `setPublishTaskStoreDb(db)` 与 `setTaskHistoryDb(db)` |
| `apps/desktop/src/features/task-center/publishTaskStore.test.ts` | 新增 SQLite 优先/fallback/无 secret 测试 |
| `apps/desktop/src/features/task-center/taskHistory.test.ts` | 新增 SQLite 优先/fallback/submitted 状态保持测试 |

---

### Task 1: 新增 `task_history` 表

**Files:**
- Modify: `packages/local-store/src/schema.ts`

**Interfaces:**
- Consumes: 现有 `LOCAL_STORE_MIGRATIONS` 数组。
- Produces: 新增 `task_history` 建表语句；`LOCAL_STORE_SCHEMA_TABLES` 增加表名。

- [ ] **Step 1: 在 `LOCAL_STORE_SCHEMA_TABLES` 追加 `"task_history"`**

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
  "task_history",
] as const;
```

- [ ] **Step 2: 在 `LOCAL_STORE_MIGRATIONS` 末尾追加建表语句**

```typescript
  `CREATE TABLE IF NOT EXISTS task_history (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    task_ids_json TEXT NOT NULL,
    video_path TEXT NOT NULL,
    platforms_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
```

- [ ] **Step 3: 运行 schema 测试**

Run: `pnpm test packages/local-store/tests/schema.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/local-store/src/schema.ts
git commit -m "feat(local-store): add task_history table"
```

---

### Task 2: 实现 `TaskHistoryRepository`

**Files:**
- Modify: `packages/local-store/src/repositories.ts`

**Interfaces:**
- Consumes: `LocalStoreDb`。
- Produces: `TaskHistoryRecord`、`TaskHistoryRepository`、`createTaskHistoryRepository(db)`。

- [ ] **Step 1: 在文件上部接口区新增类型**

```typescript
export interface TaskHistoryRecord {
  id: string;
  projectId: string;
  title: string;
  taskIdsJson: string;
  videoPath: string;
  platformsJson: string;
  status: string;
  createdAt: string;
}

export interface TaskHistoryRepository {
  list(): Promise<TaskHistoryRecord[]>;
  save(record: TaskHistoryRecord): Promise<void>;
  deleteById(id: string): Promise<void>;
}
```

- [ ] **Step 2: 在 repository 工厂区新增 `createTaskHistoryRepository`**

```typescript
export function createTaskHistoryRepository(db: LocalStoreDb): TaskHistoryRepository {
  return {
    async list(): Promise<TaskHistoryRecord[]> {
      return db.select<TaskHistoryRecord>(
        `SELECT id, project_id as projectId, title, task_ids_json as taskIdsJson, video_path as videoPath, platforms_json as platformsJson, status, created_at as createdAt FROM task_history ORDER BY created_at DESC`,
      );
    },
    async save(record: TaskHistoryRecord): Promise<void> {
      const t = nowIso();
      await db.execute(
        `INSERT OR REPLACE INTO task_history (id, project_id, title, task_ids_json, video_path, platforms_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id,
          record.projectId,
          record.title,
          record.taskIdsJson,
          record.videoPath,
          record.platformsJson,
          record.status,
          record.createdAt ?? t,
        ],
      );
    },
    async deleteById(id: string): Promise<void> {
      await db.execute(`DELETE FROM task_history WHERE id = ?`, [id]);
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
git commit -m "feat(local-store): add TaskHistoryRepository"
```

---

### Task 3: 为 `TaskHistoryRepository` 写单元测试

**Files:**
- Modify: `packages/local-store/tests/repositories.test.ts`

**Interfaces:**
- Consumes: `FakeLocalStoreDb`、`createTaskHistoryRepository`。
- Produces: 通过测试验证 SQL 与字段映射。

- [ ] **Step 1: 在文件顶部 import 中追加 `createTaskHistoryRepository`**

```typescript
import {
  FakeLocalStoreDb,
  createAppSettingsRepository,
  createProviderConfigRepository,
  createProviderSecretsRepository,
  createSidecarConfigRepository,
  createWorkbenchDraftRepository,
  createTaskHistoryRepository,
} from "../src/index.js";
```

- [ ] **Step 2: 在文件末尾追加测试**

```typescript
describe("createTaskHistoryRepository", () => {
  it("saves history with correct SQL and bind parameters", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createTaskHistoryRepository(db);

    await repo.save({
      id: "h1",
      projectId: "p1",
      title: "发布任务 p1",
      taskIdsJson: JSON.stringify(["t1"]),
      videoPath: "/tmp/final.mp4",
      platformsJson: JSON.stringify(["douyin"]),
      status: "submitted",
      createdAt: "2026-01-01T00:00:00.000Z",
    });

    const call = db.calls[0];
    expect(call.sql).toContain("INSERT OR REPLACE INTO task_history");
    expect(call.bind).toContain("h1");
    expect(call.bind).toContain("submitted");
  });

  it("maps list rows to camelCase records", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, title, task_ids_json as taskIdsJson, video_path as videoPath, platforms_json as platformsJson, status, created_at as createdAt FROM task_history ORDER BY created_at DESC`,
      [
        {
          id: "h1",
          projectId: "p1",
          title: "发布任务 p1",
          taskIdsJson: JSON.stringify(["t1"]),
          videoPath: "/tmp/final.mp4",
          platformsJson: JSON.stringify(["douyin"]),
          status: "submitted",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    const repo = createTaskHistoryRepository(db);
    const records = await repo.list();

    expect(records[0]?.id).toBe("h1");
    expect(records[0]?.status).toBe("submitted");
  });

  it("deletes history by id", async () => {
    const db = new FakeLocalStoreDb();
    const repo = createTaskHistoryRepository(db);

    await repo.deleteById("h1");

    const call = db.calls[0];
    expect(call.sql).toContain("DELETE FROM task_history");
    expect(call.bind).toEqual(["h1"]);
  });
});
```

- [ ] **Step 3: 运行 repository 测试**

Run: `pnpm test packages/local-store/tests/repositories.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/local-store/tests/repositories.test.ts
git commit -m "test(local-store): cover TaskHistoryRepository"
```

---

### Task 4: 改造 `publishTaskStore` 支持 SQLite 优先

**Files:**
- Modify: `apps/desktop/src/features/task-center/publishTaskStore.ts`

**Interfaces:**
- Consumes: `LocalStoreDb`、`createPublishTaskRepository`。
- Produces: `setPublishTaskStoreDb(db)`、SQLite 优先 load/save/append。

- [ ] **Step 1: 修改 import 与新增 sharedDb**

```typescript
import type { PublishPlatform } from "@mirax/core";
import type { PublishTask } from "@mirax/provider-publish";
import { createPublishTaskRepository, type LocalStoreDb } from "@mirax/local-store";

export const PUBLISH_TASKS_STORAGE_KEY = "mirax-ai.publish-tasks.v1";

let sharedDb: LocalStoreDb | undefined;

export function setPublishTaskStoreDb(db: LocalStoreDb | undefined): void {
  sharedDb = db;
}

export function getPublishTaskStoreDb(): LocalStoreDb | undefined {
  return sharedDb;
}
```

- [ ] **Step 2: 新增 SQLite 读写辅助函数**

在文件上部，保持 `sanitizePublishTaskForStorage`、`normalizePublishTask` 与 `getStorage` 不变。

新增：

```typescript
function taskToRecord(task: PublishTask): PublishTaskRecord {
  return {
    id: task.id,
    projectId: task.projectId,
    platformId: task.platformId,
    accountId: task.accountId,
    status: task.status,
    videoPath: task.videoPath,
    title: task.title,
    description: task.description,
    tagsJson: JSON.stringify(task.tags),
    mode: task.mode,
    errorCode: task.errorCode,
    errorMessage: task.errorMessage,
    failedAt: task.failedAt,
    retryCount: task.retryCount ?? 0,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function recordToTask(record: PublishTaskRecord): PublishTask {
  return {
    id: record.id,
    projectId: record.projectId,
    platformId: record.platformId as PublishPlatform,
    accountId: record.accountId,
    status: record.status as PublishTask["status"],
    videoPath: record.videoPath,
    title: record.title,
    description: record.description,
    tags: JSON.parse(record.tagsJson) as string[],
    mode: record.mode as "direct" | "draft",
    errorCode: record.errorCode as PublishTask["errorCode"],
    errorMessage: record.errorMessage,
    failedAt: record.failedAt,
    retryCount: record.retryCount ?? 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function loadPublishTasksFromDb(db: LocalStoreDb): Promise<PublishTask[] | undefined> {
  try {
    const repo = createPublishTaskRepository(db);
    const records = await repo.list();
    return records.map(recordToTask);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 发布任务读取失败，回退 localStorage", error);
    return undefined;
  }
}

async function savePublishTasksToDb(db: LocalStoreDb, tasks: PublishTask[]): Promise<boolean> {
  try {
    const repo = createPublishTaskRepository(db);
    for (const task of tasks) {
      await repo.save(taskToRecord(sanitizePublishTaskForStorage(task)));
    }
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 发布任务保存失败，回退 localStorage", error);
    return false;
  }
}
```

- [ ] **Step 3: 修改 `loadPublishTasks` / `savePublishTasks` / `appendPublishTasks`**

```typescript
export async function loadPublishTasks(): Promise<PublishTask[]> {
  if (sharedDb) {
    const fromDb = await loadPublishTasksFromDb(sharedDb);
    if (fromDb !== undefined) {
      return fromDb;
    }
  }

  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(PUBLISH_TASKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizePublishTask).filter((t): t is PublishTask => t !== undefined);
  } catch {
    return [];
  }
}

export async function savePublishTasks(tasks: PublishTask[]): Promise<void> {
  if (sharedDb) {
    const saved = await savePublishTasksToDb(sharedDb, tasks);
    if (saved) return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PUBLISH_TASKS_STORAGE_KEY, JSON.stringify(tasks.map(sanitizePublishTaskForStorage)));
}

export async function appendPublishTask(task: PublishTask): Promise<void> {
  const tasks = await loadPublishTasks();
  tasks.unshift(task);
  await savePublishTasks(tasks);
}

export async function appendPublishTasks(tasks: PublishTask[]): Promise<void> {
  const existing = await loadPublishTasks();
  await savePublishTasks([...tasks, ...existing]);
}
```

- [ ] **Step 4: 运行既有 publishTaskStore 测试**

Run: `pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts`
Expected: 既有测试需要适配 async（会失败，下一步处理）

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/features/task-center/publishTaskStore.ts
git commit -m "feat(desktop): publishTaskStore prefers SQLite with localStorage fallback"
```

---

### Task 5: 改造 `taskHistory` 支持 SQLite 优先

**Files:**
- Modify: `apps/desktop/src/features/task-center/taskHistory.ts`

**Interfaces:**
- Consumes: `LocalStoreDb`、`createTaskHistoryRepository`。
- Produces: `setTaskHistoryDb(db)`、SQLite 优先 load/save/append。

- [ ] **Step 1: 修改 import 与新增 sharedDb**

```typescript
import type { PublishPlatform } from "@mirax/core";
import type { PublishTaskStatus } from "@mirax/provider-publish";
import { createTaskHistoryRepository, type LocalStoreDb } from "@mirax/local-store";

export const TASK_HISTORY_STORAGE_KEY = "mirax-ai.task-history.v1";

let sharedDb: LocalStoreDb | undefined;

export function setTaskHistoryDb(db: LocalStoreDb | undefined): void {
  sharedDb = db;
}

export function getTaskHistoryDb(): LocalStoreDb | undefined {
  return sharedDb;
}
```

- [ ] **Step 2: 新增 SQLite 读写辅助函数**

在 `createPublishHistoryItem` 之后、`listLatestHistoryItems` 之前新增：

```typescript
function historyItemToRecord(item: PublishHistoryItem): TaskHistoryRecord {
  return {
    id: item.id,
    projectId: item.projectId,
    title: item.title,
    taskIdsJson: JSON.stringify(item.taskIds),
    videoPath: item.videoPath,
    platformsJson: JSON.stringify(item.platforms),
    status: item.status,
    createdAt: item.createdAt,
  };
}

function recordToHistoryItem(record: TaskHistoryRecord): PublishHistoryItem {
  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    taskIds: JSON.parse(record.taskIdsJson) as string[],
    videoPath: record.videoPath,
    platforms: JSON.parse(record.platformsJson) as PublishPlatform[],
    status: record.status as PublishTaskStatus,
    createdAt: record.createdAt,
  };
}

async function loadTaskHistoryFromDb(db: LocalStoreDb): Promise<PublishHistoryItem[] | undefined> {
  try {
    const repo = createTaskHistoryRepository(db);
    const records = await repo.list();
    return records.map(recordToHistoryItem);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 任务历史读取失败，回退 localStorage", error);
    return undefined;
  }
}

async function saveTaskHistoryToDb(db: LocalStoreDb, items: PublishHistoryItem[]): Promise<boolean> {
  try {
    const repo = createTaskHistoryRepository(db);
    for (const item of items) {
      await repo.save(historyItemToRecord(item));
    }
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 任务历史保存失败，回退 localStorage", error);
    return false;
  }
}
```

- [ ] **Step 3: 修改 `loadTaskHistory` / `saveTaskHistory` / `appendPublishHistoryItem`**

```typescript
export async function loadTaskHistory(): Promise<PublishHistoryItem[]> {
  if (sharedDb) {
    const fromDb = await loadTaskHistoryFromDb(sharedDb);
    if (fromDb !== undefined) {
      return fromDb;
    }
  }

  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(TASK_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as PublishHistoryItem[];
  } catch {
    return [];
  }
}

export async function saveTaskHistory(items: PublishHistoryItem[]): Promise<void> {
  if (sharedDb) {
    const saved = await saveTaskHistoryToDb(sharedDb, items);
    if (saved) return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(items));
}

export async function appendPublishHistoryItem(item: PublishHistoryItem): Promise<void> {
  const history = await loadTaskHistory();
  history.unshift(item);
  await saveTaskHistory(history);
}
```

- [ ] **Step 4: 运行既有 taskHistory 测试**

Run: `pnpm test apps/desktop/src/features/task-center/taskHistory.test.ts`
Expected: 既有测试需要适配 async（会失败，下一步处理）

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/features/task-center/taskHistory.ts
git commit -m "feat(desktop): taskHistory prefers SQLite with localStorage fallback"
```

---

### Task 6: 在 `initLocalStore` 成功后注入 db

**Files:**
- Modify: `apps/desktop/src/localStore/init.ts`

**Interfaces:**
- Consumes: `setPublishTaskStoreDb`、`setTaskHistoryDb`。
- Produces: 初始化成功后将 db 共享给发布任务与历史模块。

- [ ] **Step 1: 在 init.ts 中 import db setter**

```typescript
import { setPublishTaskStoreDb } from "../features/task-center/publishTaskStore.js";
import { setTaskHistoryDb } from "../features/task-center/taskHistory.js";
```

- [ ] **Step 2: 在 `initLocalStore` 成功后调用 setter**

```typescript
    setAppSettingsLocalStoreDb(db);
    setWorkbenchDraftDb(db);
    setPublishTaskStoreDb(db);
    setTaskHistoryDb(db);
    return db;
```

- [ ] **Step 3: 运行 desktop 类型检查**

Run: `pnpm --filter @mirax/desktop typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/localStore/init.ts
git commit -m "feat(desktop): inject localStore db into publish stores"
```

---

### Task 7: 更新 `publishTaskStore` 测试

**Files:**
- Modify: `apps/desktop/src/features/task-center/publishTaskStore.test.ts`

**Interfaces:**
- Consumes: `FakeLocalStoreDb`、`createPublishTaskRepository`、`setPublishTaskStoreDb`。
- Produces: 覆盖 SQLite 优先、fallback、无 secret 的测试用例。

- [ ] **Step 1: 在文件顶部 import 中追加**

```typescript
import { FakeLocalStoreDb, createPublishTaskRepository } from "@mirax/local-store";
import { setPublishTaskStoreDb } from "./publishTaskStore.js";
```

- [ ] **Step 2: 在 `beforeEach` 中重置 sharedDb**

```typescript
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = createFakeStorage();
    setPublishTaskStoreDb(undefined);
  });
```

- [ ] **Step 3: 将现有测试改为 async（因为 load/save 现在返回 Promise）**

所有调用 `loadPublishTasks()` / `savePublishTasks()` / `appendPublishTask()` / `appendPublishTasks()` 的测试前加 `await`。

例如：

```typescript
  it("loads empty tasks when storage is empty", async () => {
    expect(await loadPublishTasks()).toEqual([]);
  });

  it("saves and loads tasks", async () => {
    const task = createPublishTask({ ... });

    await savePublishTasks([task]);

    expect(await loadPublishTasks()).toEqual([task]);
  });
```

类似地修改其余测试。

- [ ] **Step 4: 追加 SQLite 优先与 fallback 测试**

```typescript
  it("prefers SQLite over localStorage when db is available", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, platform_id as platformId, account_id as accountId, status, video_path as videoPath, title, description, tags_json as tagsJson, mode, error_code as errorCode, error_message as errorMessage, failed_at as failedAt, retry_count as retryCount, created_at as createdAt, updated_at as updatedAt FROM publish_tasks`,
      [
        {
          id: "sqlite-task",
          projectId: "p1",
          platformId: "douyin",
          accountId: "a1",
          status: "submitted",
          videoPath: "/tmp/sqlite.mp4",
          title: "SQLite Task",
          description: "D",
          tagsJson: JSON.stringify([]),
          mode: "draft",
          retryCount: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    globalThis.localStorage.setItem(
      PUBLISH_TASKS_STORAGE_KEY,
      JSON.stringify([
        createPublishTask({
          id: "local-task",
          projectId: "p1",
          platformId: "xiaohongshu",
          accountId: "a1",
          videoPath: "/tmp/local.mp4",
          title: "Local Task",
          description: "D",
          tags: [],
          mode: "draft",
        }),
      ]),
    );

    setPublishTaskStoreDb(db);

    const tasks = await loadPublishTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe("sqlite-task");
  });

  it("falls back to localStorage when SQLite is unavailable", async () => {
    const task = createPublishTask({
      id: "local-task",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/local.mp4",
      title: "Local Task",
      description: "D",
      tags: [],
      mode: "draft",
    });
    globalThis.localStorage.setItem(PUBLISH_TASKS_STORAGE_KEY, JSON.stringify([task]));

    const tasks = await loadPublishTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe("local-task");
  });

  it("persists tasks to SQLite when db is available", async () => {
    const db = new FakeLocalStoreDb();
    setPublishTaskStoreDb(db);

    const task = createPublishTask({
      id: "t1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      tags: [],
      mode: "draft",
    });

    await savePublishTasks([task]);

    const call = db.calls.find((c) => c.sql.includes("INSERT OR REPLACE INTO publish_tasks"));
    expect(call).toBeTruthy();
    expect(call?.bind).toContain("t1");
  });
```

- [ ] **Step 5: 运行 publishTaskStore 测试**

Run: `pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/features/task-center/publishTaskStore.test.ts
git commit -m "test(desktop): cover publishTaskStore SQLite priority and fallback"
```

---

### Task 8: 更新 `taskHistory` 测试

**Files:**
- Modify: `apps/desktop/src/features/task-center/taskHistory.test.ts`

**Interfaces:**
- Consumes: `FakeLocalStoreDb`、`createTaskHistoryRepository`、`setTaskHistoryDb`。
- Produces: 覆盖 SQLite 优先、fallback、submitted 状态保持的测试用例。

- [ ] **Step 1: 在文件顶部 import 中追加**

```typescript
import { FakeLocalStoreDb, createTaskHistoryRepository } from "@mirax/local-store";
import { setTaskHistoryDb } from "./taskHistory.js";
```

- [ ] **Step 2: 在 `beforeEach` 中重置 sharedDb**

```typescript
beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createFakeStorage();
  setTaskHistoryDb(undefined);
});
```

- [ ] **Step 3: 将现有测试改为 async**

所有调用 `loadTaskHistory()` / `saveTaskHistory()` / `appendPublishHistoryItem()` 的测试前加 `await`。

- [ ] **Step 4: 追加 SQLite 优先与 fallback 测试**

```typescript
  it("prefers SQLite over localStorage when db is available", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, title, task_ids_json as taskIdsJson, video_path as videoPath, platforms_json as platformsJson, status, created_at as createdAt FROM task_history ORDER BY created_at DESC`,
      [
        {
          id: "sqlite-history",
          projectId: "p1",
          title: "SQLite History",
          taskIdsJson: JSON.stringify(["t1"]),
          videoPath: "/tmp/sqlite.mp4",
          platformsJson: JSON.stringify(["douyin"]),
          status: "submitted",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    globalThis.localStorage.setItem(
      TASK_HISTORY_STORAGE_KEY,
      JSON.stringify([
        createPublishHistoryItem({
          projectId: "p2",
          taskIds: ["t2"],
          videoPath: "/tmp/local.mp4",
          platforms: ["xiaohongshu"],
        }),
      ]),
    );

    setTaskHistoryDb(db);

    const history = await loadTaskHistory();

    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe("sqlite-history");
    expect(history[0]?.status).toBe("submitted");
  });

  it("falls back to localStorage when SQLite is unavailable", async () => {
    const item = createPublishHistoryItem({
      projectId: "p1",
      taskIds: ["t1"],
      videoPath: "/tmp/local.mp4",
      platforms: ["douyin"],
    });
    globalThis.localStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify([item]));

    const history = await loadTaskHistory();

    expect(history).toHaveLength(1);
    expect(history[0]?.projectId).toBe("p1");
  });

  it("persists history to SQLite when db is available", async () => {
    const db = new FakeLocalStoreDb();
    setTaskHistoryDb(db);

    const item = createPublishHistoryItem({
      projectId: "p1",
      taskIds: ["t1"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin"],
    });

    await saveTaskHistory([item]);

    const call = db.calls.find((c) => c.sql.includes("INSERT OR REPLACE INTO task_history"));
    expect(call).toBeTruthy();
    expect(call?.bind).toContain(item.id);
  });
```

- [ ] **Step 5: 运行 taskHistory 测试**

Run: `pnpm test apps/desktop/src/features/task-center/taskHistory.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/features/task-center/taskHistory.test.ts
git commit -m "test(desktop): cover taskHistory SQLite priority and fallback"
```

---

### Task 9: 全局验证

**Files:**
- 无新增/修改，只运行验证命令。

- [ ] **Step 1: 运行 local-store repository 测试**

Run: `pnpm test packages/local-store/tests/repositories.test.ts`
Expected: PASS

- [ ] **Step 2: 运行 task-center 测试**

Run: `pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts apps/desktop/src/features/task-center/taskHistory.test.ts`
Expected: PASS

- [ ] **Step 3: 运行 desktop 类型检查**

Run: `pnpm --filter @mirax/desktop typecheck`
Expected: PASS

- [ ] **Step 4: 先构建 local-store 再构建 desktop web**

Run:
```bash
pnpm --filter @mirax/local-store build
pnpm --filter @mirax/desktop build:web
```
Expected: PASS

- [ ] **Step 5: 检查 diff 空白**

Run: `git diff --check`
Expected: 无输出

- [ ] **Step 6: Commit（可选）**

若验证后有未提交改动，按需提交。

---

## Spec Coverage 检查

| 需求 | 对应任务 |
|------|----------|
| 新增 `task_history` 表 | Task 1 |
| 新增 `TaskHistoryRepository` | Task 2 |
| repository 测试覆盖 | Task 3 |
| `publishTaskStore` SQLite 优先 | Task 4 |
| `taskHistory` SQLite 优先 | Task 5 |
| `initLocalStore` 注入 db | Task 6 |
| `publishTaskStore` 测试 | Task 7 |
| `taskHistory` 测试 | Task 8 |
| 验证命令 | Task 9 |

## Placeholder 检查

- 无 TBD/TODO。
- 所有步骤包含具体代码或命令。
- 无 "add appropriate error handling" 等模糊描述。
