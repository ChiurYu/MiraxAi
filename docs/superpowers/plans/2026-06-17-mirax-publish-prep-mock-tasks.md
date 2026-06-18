# 阶段 4 P0：发布准备与 mock 发布任务

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 `App.vue` 中内嵌的"标题封面"和"视频发布"卡片，拆分为可校验的 `PublishMetadata` 模型、`usePublishPreparation` composable 与独立的 `PublishPrepCard.vue` / `PublishCard.vue` 组件；并通过 `@mirax/provider-publish` 和 `@mirax/local-store` 建立 mock 发布任务的数据契约与本地存储。

**Architecture:**
- `@mirax/core` 新增 `PublishMetadata` 类型与 `validatePublishMetadata`，统一发布元数据（标题、描述、话题、封面、发布方式）。
- `@mirax/provider-publish` 新增 `PublishTask` 类型与 `createPublishTask` 工厂，使 mock 发布结果能映射为可追踪的任务记录。
- `@mirax/local-store` 扩展 schema 与 repository 接口，新增 `publish_tasks` 表，为后续 SQLite 接入预留。
- `apps/desktop` 新增 `features/task-center/publishTaskStore.ts`（P0 用 localStorage 持久化发布任务）和 `composables/usePublishPreparation.ts`。
- `apps/desktop/src/components/workbench/PublishPrepCard.vue` 承载标题、描述、话题、封面和复核通过操作。
- `apps/desktop/src/components/workbench/PublishCard.vue` 承载平台选择、账号选择、发布方式、创建 mock 发布任务。
- `App.vue` 移除原有"标题封面"和"视频发布"卡片的内嵌实现，改用上述组件。

**Tech Stack:** Vue 3 Composition API, TypeScript, `@mirax/core`, `@mirax/provider-publish`, `@mirax/local-store`, Vitest.

---

## Resume Here

**当前自动调度入口：** `docs/superpowers/plans/2026-06-17-mirax-publish-prep-mock-tasks.md`

**当前阶段：** 阶段 4 P0。本文件是阶段 4 P0 源码 implementation plan，Task 1 → Task 12 已全部完成并通过验收，不要重复执行。

**依赖阶段 3 文档：**
- `docs/product-architecture/workflow-and-release-chain.md`
- `docs/product-architecture/data-provider-sidecar-contracts.md`
- `docs/product-architecture/ui-ux-and-phase-4-handoff.md`

**当前源码状态：**
- `apps/desktop/src/App.vue`：已移除内嵌"标题封面"和"视频发布"表单，改用 `PublishPrepCard.vue` 与 `PublishCard.vue`。
- `executeStage("publish")`：已统一承接发布确认、校验、`prep.publish()`、`appendPublishTasks()` 和 runtime 阶段状态更新；不再出现未创建任务却标记 completed 的空跑路径。
- `usePublishPreparation()`：已通过 getter / `MaybeRefOrGetter` 动态读取最新 `targetPlatforms`，避免平台选择变更后使用旧数组。
- `packages/provider-publish`、`packages/core`、`packages/local-store`：已补齐发布元数据、发布任务和 `publish_tasks` 本地数据契约。
- `apps/desktop/src/features/task-center/publishTaskStore.ts`：P0 使用 localStorage 持久化 mock 发布任务。

**下一步：** 本 P0 计划已完成。本计划是阶段 4 P0 最后一个源码计划；后续进入 P0.5 UI/UX polish 或 P1 计划（声音/形象/素材/任务中心/账号管理）。

---

## 范围

**本计划覆盖：**

- `@mirax/core` 的 `PublishMetadata` 类型、默认值、校验函数及测试。
- `@mirax/provider-publish` 的 `PublishTask` 类型、`createPublishTask` 工厂及测试。
- `@mirax/local-store` 的 `publish_tasks` schema 扩展与 repository 接口扩展。
- `apps/desktop/src/features/task-center/publishTaskStore.ts` 及测试。
- `apps/desktop/src/composables/usePublishPreparation.ts` 及测试。
- `apps/desktop/src/components/workbench/PublishPrepCard.vue`。
- `apps/desktop/src/components/workbench/PublishCard.vue`。
- `apps/desktop/src/App.vue` 重构（移除内嵌发布卡片，使用新组件）。
- 类型检查与测试验证。

**本计划不覆盖：**

- 不实现真实平台发布（P0 仍为 mock publisher）。
- 不实现真实账号授权（沿用 `createMockPublisher` 返回的 mock 账号）。
- 不接入真实 SQLite 数据库（P0 用 localStorage 持久化 `publish_tasks`，保留 schema 给后续迁移）。
- 不实现完整任务中心 UI（P1 计划）。
- 不修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列。
- 不修改 `.codex/dispatch-state.json`。
- 不提交、不推送。

---

## 目标文件结构

```text
packages/core/src/
  types.ts              # 追加 PublishMetadata 类型
  validation.ts         # 追加 createDefaultPublishMetadata / validatePublishMetadata
  ...
packages/provider-publish/src/
  types.ts              # 追加 PublishTask 类型
  mockPublisher.ts      # 追加 createPublishTask 工厂
  index.ts              # 自动重新导出
packages/local-store/src/
  schema.ts             # 追加 publish_tasks 建表语句
  repositories.ts       # 追加 PublishTaskRecord / repository 类型
apps/desktop/src/
  features/task-center/
    taskHistory.ts
    taskHistory.test.ts
    publishTaskStore.ts         # 新增
    publishTaskStore.test.ts    # 新增
  composables/
    usePublishPreparation.ts
    usePublishPreparation.test.ts
  components/workbench/
    PublishPrepCard.vue
    PublishCard.vue
  App.vue
```

---

## 全局验证命令

每个任务完成后至少运行对应验证命令。最终验收前运行：

```bash
pnpm test packages/core
pnpm test packages/provider-publish
pnpm test packages/local-store
pnpm test apps/desktop/src/composables/usePublishPreparation.test.ts
pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts
pnpm --filter @mirax/desktop typecheck
```

预期：所有测试通过；桌面端类型检查无错误；发布准备卡片和发布卡片在 App.vue 中正常渲染；创建 mock 发布任务后任务被持久化到 localStorage。

---

## 任务清单

### Task 1：在 `@mirax/core` 增加 `PublishMetadata` 类型与校验

**目标：** 为发布元数据（标题、描述、话题、封面、发布方式）提供领域类型和校验函数。

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
export interface PublishMetadata {
  title: string;
  description: string;
  tags: string[];
  coverPath?: string;
  mode: "direct" | "draft";
}
```

- [x] **Step 2：追加校验函数到 `validation.ts`**

在 `packages/core/src/validation.ts` 中追加：

```typescript
import type { PublishMetadata, PublishPlatform } from "./types.js";

export function createDefaultPublishMetadata(): PublishMetadata {
  return {
    title: "",
    description: "",
    tags: [],
    mode: "draft",
  };
}

export function validatePublishMetadata(metadata: PublishMetadata, platforms: PublishPlatform[]): string[] {
  const errors: string[] = [];

  if (!metadata.title.trim()) {
    errors.push("请填写标题");
  }

  if (!metadata.description.trim()) {
    errors.push("请填写描述");
  }

  if (platforms.length === 0) {
    errors.push("至少选择一个发布平台");
  }

  if (metadata.mode !== "direct" && metadata.mode !== "draft") {
    errors.push("发布方式无效");
  }

  return errors;
}
```

- [x] **Step 3：运行 core 测试**

```bash
pnpm test packages/core
```

预期：通过。

**验收标准：**

- `PublishMetadata` 类型被导出。
- `createDefaultPublishMetadata()` 返回空标题/描述、空标签、draft 模式。
- `validatePublishMetadata()` 校验标题、描述、平台、模式。

---

### Task 2：为 `@mirax/core` 的 `PublishMetadata` 编写测试

**目标：** 覆盖默认值与校验规则。

**允许修改文件：**

- 创建：`packages/core/tests/publishMetadata.test.ts`

**禁止修改文件：**

- `apps/`
- `packages/core/src/` 以外的 `packages/`

- [x] **Step 1：写入测试文件**

创建 `packages/core/tests/publishMetadata.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import {
  createDefaultPublishMetadata,
  validatePublishMetadata,
} from "../src/validation.js";

describe("PublishMetadata", () => {
  it("creates default metadata with draft mode", () => {
    const metadata = createDefaultPublishMetadata();

    expect(metadata.title).toBe("");
    expect(metadata.description).toBe("");
    expect(metadata.tags).toEqual([]);
    expect(metadata.mode).toBe("draft");
  });

  it("validates required fields", () => {
    const metadata = createDefaultPublishMetadata();

    const errors = validatePublishMetadata(metadata, []);

    expect(errors).toContain("请填写标题");
    expect(errors).toContain("请填写描述");
    expect(errors).toContain("至少选择一个发布平台");
  });

  it("accepts valid metadata", () => {
    const metadata = {
      title: "通勤包推荐",
      description: "大容量通勤包",
      tags: ["通勤", "包包"],
      mode: "draft" as const,
    };

    const errors = validatePublishMetadata(metadata, ["douyin"]);

    expect(errors).toHaveLength(0);
  });

  it("rejects invalid publish mode", () => {
    const metadata = {
      title: "通勤包推荐",
      description: "大容量通勤包",
      tags: [] as string[],
      mode: "invalid" as "direct" | "draft",
    };

    const errors = validatePublishMetadata(metadata, ["douyin"]);

    expect(errors).toContain("发布方式无效");
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test packages/core/tests/publishMetadata.test.ts
```

预期：4 个测试全部通过。

**验收标准：**

- 默认值、必填校验、有效数据、非法模式均被覆盖。

---

### Task 3：在 `@mirax/provider-publish` 增加 `PublishTask` 类型与工厂

**目标：** 让 mock 发布结果能映射为带状态、平台、账号、元数据的任务记录。

**允许修改文件：**

- 修改：`packages/provider-publish/src/types.ts`
- 修改：`packages/provider-publish/src/mockPublisher.ts`

**禁止修改文件：**

- `apps/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：追加类型到 `types.ts`**

在 `packages/provider-publish/src/types.ts` 的 `Publisher` 接口之后追加：

```typescript
export type PublishTaskStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

export interface PublishTask {
  id: string;
  projectId: string;
  platformId: PublishPlatform;
  accountId: string;
  status: PublishTaskStatus;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  mode: "direct" | "draft";
  createdAt: string;
  updatedAt: string;
}
```

- [x] **Step 2：追加工厂函数到 `mockPublisher.ts`**

在 `packages/provider-publish/src/mockPublisher.ts` 的 `createMockPublisher` 之后追加：

```typescript
export function createPublishTask(input: {
  id: string;
  projectId: string;
  platformId: PublishPlatform;
  accountId: string;
  videoPath: string;
  title: string;
  description: string;
  tags: string[];
  mode: "direct" | "draft";
  createdAt?: string;
  status?: PublishTaskStatus;
}): PublishTask {
  const now = input.createdAt ?? new Date().toISOString();

  return {
    id: input.id,
    projectId: input.projectId,
    platformId: input.platformId,
    accountId: input.accountId,
    status: input.status ?? "pending",
    videoPath: input.videoPath,
    title: input.title,
    description: input.description,
    tags: [...input.tags],
    mode: input.mode,
    createdAt: now,
    updatedAt: now,
  };
}
```

- [x] **Step 3：运行 provider-publish 类型检查**

```bash
pnpm --filter @mirax/provider-publish typecheck
```

预期：无错误。

**验收标准：**

- `PublishTask`、`PublishTaskStatus` 被导出。
- `createPublishTask()` 返回不可变 tags 副本和默认 `pending` 状态。

---

### Task 4：为 `@mirax/provider-publish` 的 `PublishTask` 编写测试

**目标：** 覆盖 `createPublishTask` 默认值和字段复制。

**允许修改文件：**

- 创建：`packages/provider-publish/tests/publishTask.test.ts`

**禁止修改文件：**

- `apps/`
- `packages/provider-publish/src/` 以外的 `packages/`

- [x] **Step 1：写入测试文件**

创建 `packages/provider-publish/tests/publishTask.test.ts`：

```typescript
import { describe, expect, it } from "vitest";
import { createPublishTask } from "../src/mockPublisher.js";

describe("createPublishTask", () => {
  it("creates a pending publish task with all fields", () => {
    const task = createPublishTask({
      id: "task-1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "account-douyin",
      videoPath: "/tmp/final.mp4",
      title: "通勤包",
      description: "大容量",
      tags: ["通勤"],
      mode: "draft",
    });

    expect(task.status).toBe("pending");
    expect(task.platformId).toBe("douyin");
    expect(task.tags).toEqual(["通勤"]);
    expect(task.createdAt).toBeTruthy();
  });

  it("does not share the tags array reference", () => {
    const tags = ["通勤"];
    const task = createPublishTask({
      id: "task-1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      tags,
      mode: "draft",
    });

    tags.push("包包");
    expect(task.tags).toEqual(["通勤"]);
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test packages/provider-publish/tests/publishTask.test.ts
```

预期：2 个测试全部通过。

**验收标准：**

- 默认状态为 `pending`。
- `tags` 被复制而非共享引用。

---

### Task 5：扩展 `@mirax/local-store` 的 schema 与 repository 接口

**目标：** 把 `publish_tasks` 纳入本地数据契约，为后续真实 SQLite 实现保留结构。

**允许修改文件：**

- 修改：`packages/local-store/src/schema.ts`
- 修改：`packages/local-store/src/repositories.ts`

**禁止修改文件：**

- `apps/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：扩展 `schema.ts`**

在 `packages/local-store/src/schema.ts` 的 `LOCAL_STORE_MIGRATIONS` 数组中，在 `workflow_tasks` 之后追加：

```typescript
  `CREATE TABLE IF NOT EXISTS publish_tasks (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    platform_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    status TEXT NOT NULL,
    video_path TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    mode TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
```

- [x] **Step 2：扩展 `repositories.ts`**

在 `packages/local-store/src/repositories.ts` 中追加记录类型和 repository 类型：

```typescript
export interface PublishTaskRecord {
  id: string;
  projectId: string;
  platformId: string;
  accountId: string;
  status: string;
  videoPath: string;
  title: string;
  description: string;
  tagsJson: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
}

export type PublishTaskRepository = Repository<PublishTaskRecord>;
```

- [x] **Step 3：更新 `LOCAL_STORE_SCHEMA_TABLES`**

在 `packages/local-store/src/schema.ts` 中把 `publish_tasks` 加入 `LOCAL_STORE_SCHEMA_TABLES`：

```typescript
export const LOCAL_STORE_SCHEMA_TABLES = [
  "provider_configs",
  "content_drafts",
  "video_projects",
  "publish_accounts",
  "workflow_tasks",
  "app_settings",
  "sidecar_configs",
  "publish_tasks",
] as const;
```

- [x] **Step 4：运行 local-store 类型检查**

```bash
pnpm --filter @mirax/local-store typecheck
```

预期：无错误。

**验收标准：**

- `publish_tasks` 出现在 schema 表列表中。
- repository 接口包含 `PublishTaskRepository`。

---

### Task 6：创建桌面端 `publishTaskStore`

**目标：** 在桌面端用 localStorage 持久化发布任务，为 P0 mock 发布任务提供读写能力。

**允许修改文件：**

- 创建：`apps/desktop/src/features/task-center/publishTaskStore.ts`
- 创建：`apps/desktop/src/features/task-center/publishTaskStore.test.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：写入 store**

创建 `apps/desktop/src/features/task-center/publishTaskStore.ts`：

```typescript
import type { PublishTask } from "@mirax/provider-publish";

export const PUBLISH_TASKS_STORAGE_KEY = "mirax-ai.publish-tasks.v1";

function getStorage(): Storage | undefined {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }

  return undefined;
}

export function loadPublishTasks(): PublishTask[] {
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

    return parsed as PublishTask[];
  } catch {
    return [];
  }
}

export function savePublishTasks(tasks: PublishTask[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PUBLISH_TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

export function appendPublishTask(task: PublishTask): void {
  const tasks = loadPublishTasks();
  tasks.unshift(task);
  savePublishTasks(tasks);
}

export function appendPublishTasks(tasks: PublishTask[]): void {
  const existing = loadPublishTasks();
  savePublishTasks([...tasks, ...existing]);
}
```

- [x] **Step 2：写入测试**

创建 `apps/desktop/src/features/task-center/publishTaskStore.test.ts`：

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { createPublishTask } from "@mirax/provider-publish";
import {
  appendPublishTask,
  appendPublishTasks,
  loadPublishTasks,
  savePublishTasks,
} from "./publishTaskStore.js";

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

describe("publishTaskStore", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = createFakeStorage();
    savePublishTasks([]);
  });

  it("loads empty tasks when storage is empty", () => {
    expect(loadPublishTasks()).toEqual([]);
  });

  it("saves and loads tasks", () => {
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

    savePublishTasks([task]);

    expect(loadPublishTasks()).toEqual([task]);
  });

  it("appends a single task to the front", () => {
    const first = createPublishTask({
      id: "t1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/a.mp4",
      title: "A",
      description: "A",
      tags: [],
      mode: "draft",
    });
    const second = createPublishTask({
      id: "t2",
      projectId: "p2",
      platformId: "xiaohongshu",
      accountId: "a2",
      videoPath: "/tmp/b.mp4",
      title: "B",
      description: "B",
      tags: [],
      mode: "draft",
    });

    appendPublishTask(first);
    appendPublishTask(second);

    expect(loadPublishTasks().map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("returns empty array when storage data is invalid", () => {
    globalThis.localStorage.setItem("mirax-ai.publish-tasks.v1", "not-json");
    expect(loadPublishTasks()).toEqual([]);
  });
});
```

- [x] **Step 3：运行测试**

```bash
pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts
```

预期：4 个测试全部通过。

**验收标准：**

- 空存储、保存/加载、追加、异常数据均被覆盖。

---

### Task 7：创建 `usePublishPreparation` composable

**目标：** 把发布准备状态（metadata）和 mock 发布任务创建封装为可复用 composable。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/usePublishPreparation.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：写入 composable**

创建 `apps/desktop/src/composables/usePublishPreparation.ts`：

```typescript
import { computed, ref } from "vue";
import {
  createDefaultPublishMetadata,
  validatePublishMetadata,
  type ProjectDraft,
  type PublishMetadata,
  type PublishPlatform,
} from "@mirax/core";
import {
  createPublishTask,
  type PublishAccount,
  type PublishTask,
  type Publisher,
} from "@mirax/provider-publish";

export interface UsePublishPreparationOptions {
  projectId: string;
  projectName: string;
  targetPlatforms: PublishPlatform[];
  publisher: Publisher;
}

export function usePublishPreparation(options: UsePublishPreparationOptions) {
  const metadata = ref<PublishMetadata>(createDefaultPublishMetadata());
  const tasks = ref<PublishTask[]>([]);
  const accounts = ref<PublishAccount[]>([]);
  const isPublishing = ref(false);

  const errors = computed(() => validatePublishMetadata(metadata.value, options.targetPlatforms));
  const canPublish = computed(
    () => errors.value.length === 0 && options.targetPlatforms.length > 0 && !isPublishing.value,
  );

  function updateMetadata(partial: Partial<PublishMetadata>) {
    Object.assign(metadata.value, partial);
  }

  async function publish(videoPath: string): Promise<PublishTask[]> {
    if (!canPublish.value) {
      return [];
    }

    isPublishing.value = true;

    try {
      accounts.value = await options.publisher.listAccounts();

      const result = await options.publisher.publish({
        projectId: options.projectId,
        videoPath,
        title: metadata.value.title,
        description: metadata.value.description,
        platformIds: options.targetPlatforms,
        mode: metadata.value.mode,
      });

      const created: PublishTask[] = options.targetPlatforms.map((platformId, index) => {
        const account = accounts.value.find((item) => item.platformId === platformId);
        return createPublishTask({
          id: result.taskIds[index] ?? `mock-publish-${options.projectId}-${platformId}`,
          projectId: options.projectId,
          platformId,
          accountId: account?.id ?? `mock-${platformId}`,
          videoPath,
          title: metadata.value.title,
          description: metadata.value.description,
          tags: metadata.value.tags,
          mode: metadata.value.mode,
        });
      });

      tasks.value = created;
      return created;
    } finally {
      isPublishing.value = false;
    }
  }

  return {
    metadata,
    tasks,
    accounts,
    errors,
    canPublish,
    isPublishing,
    updateMetadata,
    publish,
  };
}
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无新增错误。

**验收标准：**

- `usePublishPreparation` 导出 metadata、校验错误、发布状态和 `publish` 方法。
- `publish()` 调用 `publisher.publish()` 并把结果转换为 `PublishTask[]`。

---

### Task 8：为 `usePublishPreparation` 编写单元测试

**目标：** 验证元数据更新、校验和 mock 发布任务创建。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/usePublishPreparation.test.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入测试文件**

创建 `apps/desktop/src/composables/usePublishPreparation.test.ts`：

```typescript
import { describe, expect, it, vi } from "vitest";
import { createMockPublisher } from "@mirax/provider-publish";
import { usePublishPreparation } from "./usePublishPreparation.js";

describe("usePublishPreparation", () => {
  it("initializes with empty metadata", () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin"],
      publisher: createMockPublisher(),
    });

    expect(prep.metadata.value.title).toBe("");
    expect(prep.canPublish.value).toBe(false);
    expect(prep.errors.value).toContain("请填写标题");
  });

  it("updates metadata", () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin"],
      publisher: createMockPublisher(),
    });

    prep.updateMetadata({ title: "通勤包", description: "大容量" });

    expect(prep.metadata.value.title).toBe("通勤包");
    expect(prep.errors.value).toHaveLength(0);
    expect(prep.canPublish.value).toBe(true);
  });

  it("creates mock publish tasks for each platform", async () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin", "xiaohongshu"],
      publisher: createMockPublisher(),
    });

    prep.updateMetadata({ title: "T", description: "D", mode: "draft" });
    const tasks = await prep.publish("/tmp/final.mp4");

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.platformId)).toEqual(["douyin", "xiaohongshu"]);
    expect(tasks[0].status).toBe("pending");
  });

  it("does not publish when validation fails", async () => {
    const publisher = createMockPublisher();
    const publishSpy = vi.spyOn(publisher, "publish");
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: [],
      publisher,
    });

    const tasks = await prep.publish("/tmp/final.mp4");

    expect(tasks).toHaveLength(0);
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test apps/desktop/src/composables/usePublishPreparation.test.ts
```

预期：4 个测试全部通过。

**验收标准：**

- 初始化、元数据更新、mock 发布、校验失败均被覆盖。

---

### Task 9：创建 `PublishPrepCard.vue`

**目标：** 把"标题封面"卡片抽为独立组件，管理发布元数据编辑和复核通过操作。

**允许修改文件：**

- 创建：`apps/desktop/src/components/workbench/PublishPrepCard.vue`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入组件**

创建 `apps/desktop/src/components/workbench/PublishPrepCard.vue`：

```vue
<script setup lang="ts">
import { ClipboardCheck, Image } from "lucide-vue-next";
import type { PublishMetadata } from "@mirax/core";
import StatusBadge from "../StatusBadge.vue";

const props = defineProps<{
  metadata: PublishMetadata;
  status: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  update: [metadata: Partial<PublishMetadata>];
  review: [];
}>();

function updateTitle(value: string) {
  emit("update", { title: value });
}

function updateDescription(value: string) {
  emit("update", { description: value });
}

function updateTags(value: string) {
  emit("update", { tags: value.split(",").map((tag) => tag.trim()).filter(Boolean) });
}

function updateMode(value: "direct" | "draft") {
  emit("update", { mode: value });
}

const tagsText = computed(() => props.metadata.tags.join(", "));
</script>

<template>
  <section class="workflow-card publish-prep-card">
    <div class="card-heading">
      <span class="card-icon"><ClipboardCheck :size="19" /></span>
      <h2>6. 标题封面（用于发布）</h2>
      <StatusBadge :status="status" />
    </div>

    <label>
      <span>标题</span>
      <div class="action-input">
        <input :value="metadata.title" placeholder="输入视频标题" @input="updateTitle(($event.target as HTMLInputElement).value)" />
        <button @click="emit('update', { title: '' })">一键生成</button>
      </div>
    </label>

    <label>
      <span>描述</span>
      <textarea
        :value="metadata.description"
        placeholder="输入视频描述..."
        @input="updateDescription(($event.target as HTMLTextAreaElement).value)"
      />
    </label>

    <label>
      <span>话题标签</span>
      <input :value="tagsText" placeholder="输入标签后回车，发布时自动拼接 #tag" @input="updateTags(($event.target as HTMLInputElement).value)" />
    </label>

    <div class="cover-row">
      <div class="cover-preview">
        <Image :size="26" />
        <span>{{ metadata.coverPath ? '封面已生成' : '暂无封面' }}</span>
      </div>
      <div class="cover-actions">
        <button>封面设计</button>
        <button :disabled="!metadata.coverPath">打开封面</button>
        <button :disabled="!metadata.coverPath">导出封面</button>
      </div>
    </div>

    <div class="mode-row">
      <label>
        <input
          type="radio"
          value="direct"
          :checked="metadata.mode === 'direct'"
          @change="updateMode('direct')"
        />
        直接发布
      </label>
      <label>
        <input
          type="radio"
          value="draft"
          :checked="metadata.mode === 'draft'"
          @change="updateMode('draft')"
        />
        草稿
      </label>
    </div>

    <div class="button-row">
      <button class="primary compact-button" :disabled="disabled" @click="emit('review')">
        <ClipboardCheck :size="16" /> 复核通过
      </button>
    </div>
  </section>
</template>

<style scoped>
.workflow-card {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 12px;
  padding: 16px;
  background: var(--mx-surface-primary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.card-heading h2 {
  margin: 0;
  font-size: 16px;
  flex: 1;
}

.card-icon {
  display: inline-flex;
  color: var(--mx-text-secondary);
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.action-input {
  display: flex;
  gap: 8px;
}

.action-input input {
  flex: 1;
}

textarea {
  min-height: 80px;
  resize: vertical;
}

.cover-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.cover-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  background: var(--mx-surface-secondary);
  color: var(--mx-text-secondary);
}

.cover-actions {
  display: flex;
  gap: 8px;
}

.mode-row {
  display: flex;
  gap: 16px;
}

.mode-row label {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.button-row {
  margin-top: 4px;
}
</style>
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无错误。

**验收标准：**

- 组件接受 `metadata`、`status`、`disabled` props。
- 标题、描述、标签、模式变更通过 `update` 事件发出。
- 复核通过通过 `review` 事件发出。

---

### Task 10：创建 `PublishCard.vue`

**目标：** 把"视频发布"卡片抽为独立组件，管理账号加载、平台选择、发布方式选择和 mock 发布任务创建。

**允许修改文件：**

- 创建：`apps/desktop/src/components/workbench/PublishCard.vue`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入组件**

创建 `apps/desktop/src/components/workbench/PublishCard.vue`：

```vue
<script setup lang="ts">
import { CloudUpload, FileVideo, FolderOpen } from "lucide-vue-next";
import { computed } from "vue";
import type { PublishPlatform } from "@mirax/core";
import { SUPPORTED_PLATFORM_PROFILES, type PublishAccount, type PublishTask } from "@mirax/provider-publish";
import StatusBadge from "../StatusBadge.vue";

const props = defineProps<{
  projectId: string;
  projectName: string;
  videoPath: string;
  targetPlatforms: PublishPlatform[];
  mode: "direct" | "draft";
  status: string;
  disabled?: boolean;
  isPublishing?: boolean;
}>();

const emit = defineEmits<{
  publish: [];
  updateMode: [mode: "direct" | "draft"];
  updatePlatforms: [platforms: PublishPlatform[]];
}>();

const platformOptions = computed(() =>
  SUPPORTED_PLATFORM_PROFILES.map((profile) => ({
    id: profile.id,
    label: profile.label,
  })),
);

const accountDisplayText = computed(() => {
  if (props.targetPlatforms.length === 0) {
    return "选择账号";
  }
  return props.targetPlatforms.map((platformId) => {
    const profile = SUPPORTED_PLATFORM_PROFILES.find((p) => p.id === platformId);
    return profile?.label ?? platformId;
  }).join("、");
});

function togglePlatform(platformId: PublishPlatform, checked: boolean) {
  const next = new Set(props.targetPlatforms);
  if (checked) {
    next.add(platformId);
  } else {
    next.delete(platformId);
  }
  emit("updatePlatforms", Array.from(next));
}

function publish() {
  const confirmed = window.confirm(
    `确认创建 ${props.targetPlatforms.length} 个发布任务？\n\n平台：${accountDisplayText.value}\n发布模式：${props.mode === "direct" ? "直接发布" : "草稿"}\n视频路径：${props.videoPath || "未生成"}`,
  );

  if (!confirmed) {
    return;
  }

  emit("publish");
}
</script>

<template>
  <section class="workflow-card publish-card">
    <div class="card-heading">
      <span class="card-icon"><CloudUpload :size="19" /></span>
      <h2>7. 视频发布</h2>
      <StatusBadge :status="status" />
    </div>

    <label>
      <span>视频地址</span>
      <div class="action-input">
        <input :value="videoPath || '自动使用上一步视频，或手动选择'" readonly />
        <button><FolderOpen :size="16" /></button>
      </div>
    </label>

    <label>
      <span>发布账号</span>
      <select disabled>
        <option>{{ accountDisplayText }}</option>
      </select>
    </label>

    <div class="platforms compact-platforms">
      <label v-for="platform in platformOptions" :key="platform.id">
        <input
          type="checkbox"
          :value="platform.id"
          :checked="targetPlatforms.includes(platform.id)"
          @change="togglePlatform(platform.id, ($event.target as HTMLInputElement).checked)"
        />
        {{ platform.label }}
      </label>
    </div>

    <div class="radio-row">
      <label>
        <input
          type="radio"
          value="direct"
          :checked="mode === 'direct'"
          @change="emit('updateMode', 'direct')"
        />
        直接发布
      </label>
      <label>
        <input
          type="radio"
          value="draft"
          :checked="mode === 'draft'"
          @change="emit('updateMode', 'draft')"
        />
        草稿
      </label>
    </div>

    <button
      class="primary wide-button"
      :disabled="disabled || targetPlatforms.length === 0 || !videoPath"
      @click="publish"
    >
      <CloudUpload :size="16" />
      {{ isPublishing ? '发布中...' : '立即发布' }}
    </button>
  </section>
</template>

<style scoped>
.workflow-card {
  border: 1px solid var(--mx-border-subtle);
  border-radius: 12px;
  padding: 16px;
  background: var(--mx-surface-primary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.card-heading h2 {
  margin: 0;
  font-size: 16px;
  flex: 1;
}

.card-icon {
  display: inline-flex;
  color: var(--mx-text-secondary);
}

label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}

.action-input {
  display: flex;
  gap: 8px;
}

.action-input input {
  flex: 1;
}

.platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.platforms label {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.radio-row {
  display: flex;
  gap: 16px;
}

.radio-row label {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.wide-button {
  width: 100%;
  justify-content: center;
}
</style>
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无错误。

**验收标准：**

- 组件接受发布相关 props， emits 发布、模式变更、平台变更事件。
- 发布按钮在未选平台或无视频路径时禁用。

---

### Task 11：在 `App.vue` 中集成 `PublishPrepCard` 与 `PublishCard`

**目标：** 移除原有"标题封面"和"视频发布"内嵌卡片，改用新组件，并把发布任务追加到本地存储。

**允许修改文件：**

- 修改：`apps/desktop/src/App.vue`

**禁止修改文件：**

- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：导入组件与 store**

在 `App.vue` 的 `<script setup>` 中新增：

```typescript
import PublishPrepCard from "./components/workbench/PublishPrepCard.vue";
import PublishCard from "./components/workbench/PublishCard.vue";
import { usePublishPreparation } from "./composables/usePublishPreparation.js";
import { appendPublishTasks } from "./features/task-center/publishTaskStore.js";
```

- [x] **Step 2：替换发布相关 refs**

移除：
- `publishTitle`
- `publishDescription`
- `publishTags`
- `publishMode`
- `publishAccounts`

新增：

```typescript
const prep = usePublishPreparation({
  projectId: runtime.workflow.value.projectId,
  projectName: project.value.name,
  targetPlatforms: () => project.value.targetPlatforms,
  publisher,
});
```

> 注：如果已执行 P0「工作台 workflow 信息架构和状态拆分」计划，`runtime` 来自 `useWorkflowRuntime`。若单独执行本计划，则直接在 `App.vue` 中保留原有 workflow 状态并传入 `projectId`。

`usePublishPreparation` 通过 getter 动态读取 `targetPlatforms`，因此发布前在工作台修改平台选择时，`prep.publish()` 会使用最新平台列表。

- [x] **Step 3：替换模板中的发布卡片**

把原有 `publish-meta-card` 替换为：

```vue
<PublishPrepCard
  :metadata="prep.metadata.value"
  :status="runtime.stageStatus.value.review"
  :disabled="runtime.running.value || runtime.stageStatus.value.review === 'completed'"
  @update="prep.updateMetadata"
  @review="runtime.runStage('review')"
/>
```

把原有 `publish-card` 替换为：

```vue
<PublishCard
  :project-id="runtime.workflow.value.projectId"
  :project-name="project.value.name"
  :video-path="generatedVideoPath"
  :target-platforms="project.value.targetPlatforms"
  :mode="prep.metadata.value.mode"
  :status="runtime.stageStatus.value.publish"
  :disabled="runtime.running.value || runtime.stageStatus.value.publish === 'completed'"
  :is-publishing="prep.isPublishing.value"
  @update-mode="prep.updateMetadata({ mode: $event })"
  @update-platforms="project.value.targetPlatforms = $event"
  @publish="handlePublish"
/>
```

- [x] **Step 4：实现发布动作收口**

在 `App.vue` 的 `executeStage("publish")` 中承接发布动作：

```typescript
case "publish": {
  const videoPath = generatedVideoPath.value;
  if (!videoPath) {
    throw new Error("视频尚未生成，无法发布");
  }

  if (!prep.canPublish.value) {
    const reasons = prep.errors.value.join("、") || "发布条件不满足";
    throw new Error(reasons);
  }

  const platforms = project.value.targetPlatforms;
  const platformText = platforms.map((platform) => platformLabels.value[platform]).join("、") || "未选择";
  const modeText = prep.metadata.value.mode === "direct" ? "直接发布" : "草稿";

  const confirmed = window.confirm(
    `确认创建 ${platforms.length} 个发布任务？\n\n平台：${platformText}\n发布模式：${modeText}\n视频路径：${videoPath}`,
  );

  if (!confirmed) {
    throw new Error("PUBLISH_CANCELLED");
  }

  const tasks = await prep.publish(videoPath);
  if (tasks.length === 0) {
    throw new Error("发布校验失败，未创建任务");
  }

  appendPublishTasks(tasks);
  return `已创建 ${tasks.length} 个发布任务`;
}
```

`handlePublish()` 只负责通过 runtime 触发发布阶段：

```typescript
async function handlePublish() {
  await runtime.runStage("publish");
}
```

- [x] **Step 5：清理不再使用的变量和函数**

删除 `App.vue` 中已移除的 `publishTitle`、`publishDescription`、`publishTags`、`publishMode`、`publishAccounts`、`selectedAccountText`（如已移除）、发布卡片相关内联函数。

- [x] **Step 6：运行类型检查与测试**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无错误。

**验收标准：**

- `App.vue` 中不再内嵌"标题封面"和"视频发布"卡片的完整实现。
- 发布元数据通过 `PublishPrepCard` 编辑。
- 发布操作通过 `PublishCard` 触发，创建的任务被追加到 `publishTaskStore`。

---

### Task 12：全量验证

**目标：** 运行全部相关测试与类型检查，确认发布准备与 mock 发布任务不引入回归。

**允许修改文件：**

- 无（只验证）。

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：运行 core 测试**

```bash
pnpm test packages/core
```

预期：通过。

- [x] **Step 2：运行 provider-publish 测试**

```bash
pnpm test packages/provider-publish
```

预期：通过。

- [x] **Step 3：运行 local-store 测试**

```bash
pnpm test packages/local-store
```

预期：通过。

- [x] **Step 4：运行桌面端新增测试**

```bash
pnpm test apps/desktop/src/composables/usePublishPreparation.test.ts
pnpm test apps/desktop/src/features/task-center/publishTaskStore.test.ts
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
2. 视频合成后修改发布平台选择，点击“立即发布”确认对话框中平台与当前选择一致。
3. 通过“运行全部”或“运行下一步”进入发布阶段时，实际创建 PublishTask 后才标记 completed。
4. 控制台无 error，无 Vite overlay。
5. 发布后 localStorage 的 `mirax-ai.publish-tasks.v1` 出现新增任务记录。

停止 dev server：`Control+C`。

**验收标准：**

- 所有新增和既有测试通过。
- 全仓类型检查通过。
- mock 发布任务被创建并持久化。

---

## 自检与验收

### 规格覆盖检查

对照 `docs/product-architecture/ui-ux-and-phase-4-handoff.md` 的 P0 要求：

| 要求 | 覆盖任务 |
| --- | --- |
| 发布准备与 mock 发布任务 | Task 6-12 |
| PublishMetadata 模型 | Task 1-2 |
| 发布任务数据契约 | Task 3-5 |
| 与 `@mirax/provider-publish`、`@mirax/local-store` 集成 | Task 3-6 |

### Placeholder 扫描

检查计划中是否包含以下禁用模式：

- [ ] 无 "TBD" / "TODO" / "implement later" / "fill in details"。
- [ ] 无 "Add appropriate error handling" 等模糊描述。
- [ ] 无 "Similar to Task N" 省略代码。
- [ ] 所有文件路径和命令均为绝对路径或相对仓库根路径。

### 类型一致性检查

- `PublishMetadata.mode` 取值与模板 radio value 一致：`direct` / `draft`。
- `PublishTask.status` 取值与 `PublishTaskStatus` 一致：`pending` / `processing` / `completed` / `failed` / `cancelled`。
- `usePublishPreparation.publish()` 返回 `PublishTask[]`。
- `publishTaskStore` 的 storage key 为 `mirax-ai.publish-tasks.v1`。

---

## 风险与待确认问题

1. **发布确认形态**：当前仍使用 `window.confirm`；如果后续需要更复杂的发布确认页，需替换为独立确认组件或路由层页面。
2. **目标平台同步**：`usePublishPreparation` 通过 getter / `MaybeRefOrGetter` 动态读取最新 `targetPlatforms`，避免工作台替换数组后发布任务仍使用旧平台。
3. **发布任务与发布历史双轨**：`publishTaskStore` 保存详细任务记录，`taskHistory` 保存发布 handoff 摘要。P1 任务中心设计时需要决定如何合并展示。
4. **mock publisher 返回的 taskIds 顺序**：`createPublishTask` 按 `targetPlatforms` 顺序取 `result.taskIds[index]`，需保证 mock publisher 的 taskIds 顺序与输入 platformIds 一致（当前实现已满足）。
5. **待确认：P0 是否需要把发布任务展示在任务历史预览中？** 当前计划只把任务持久化到 `publishTaskStore`，工作台仍通过 `taskHistory` 展示发布 handoff 摘要。P1 任务中心再统一展示所有任务。
6. **待确认：发布准备卡片中的"一键生成标题"按钮是否需要接入 AI？** P0 保留按钮占位，点击后清空标题；真实生成由后续 Provider 配置和 AI 调用计划处理。
