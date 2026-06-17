# 阶段 4 P0：工作台 workflow 信息架构和状态拆分

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前 `App.vue` 中混合的 workflow 状态机、草稿持久化、任务历史和 UI 展示按信息架构拆分为独立 composables 与 components，使工作台具备可维护、可测试的骨架，并为后续 P1 声音/形象/素材/账号独立视图预留扩展点。

**Architecture:** 在 `apps/desktop` 中新增 `composables/` 与 `components/workbench/` 两层：
- `useWorkflowRuntime(executor)` 封装 8 阶段状态机、日志、运行控制，executor 由调用方注入以保持 UI 与 provider 调用的解耦。
- `useWorkbenchDraft()` 封装 `ProjectDraft` + `ApiKeyProviderConfig` 的恢复、变更和持久化，延续 `sanitizeDesktopDraftForStorage` 的密钥过滤规则。
- `useTaskCenterPreview()` 封装最近发布/任务历史的读取与刷新。
- `WorkflowStageCard.vue` 与 `WorkbenchShell.vue` 承担通用 UI 结构；`App.vue` 退化为 orchestrator，只负责注入 providers 和组合视图。
- `@mirax/core` 的 `Workflow` / `WorkflowStageId` / `updateStageStatus` 等类型与函数保持复用，不新增副作用。

**Tech Stack:** Vue 3 Composition API (`ref` / `reactive` / `computed` / `watch`), TypeScript, `@mirax/core`, Vitest, `lucide-vue-next`。

---

## Resume Here

**当前自动调度入口：** `docs/superpowers/plans/2026-06-17-mirax-workbench-workflow-architecture.md`

**当前阶段：** 阶段 4 P0。本文件是阶段 4 P0 源码 implementation plan。执行本计划时，工位可以按每个 Task 的允许修改文件修改源码；未列入允许范围的文件禁止修改。

**依赖阶段 3 文档：**
- `docs/product-architecture/workflow-and-release-chain.md`
- `docs/product-architecture/engineering-module-map.md`
- `docs/product-architecture/ui-ux-and-phase-4-handoff.md`

**当前源码起点：**
- `apps/desktop/src/App.vue`：当前承载全部 workflow 状态、provider 调用、草稿持久化、UI。
- `apps/desktop/src/runtime/desktopDraft.ts`：localStorage 草稿恢复/持久化，已过滤 API Key。
- `apps/desktop/src/features/task-center/taskHistory.ts`：最近任务历史 localStorage 读写。
- `packages/core/src/workflow.ts` / `types.ts`：`Workflow`、`WorkflowStageId`、`updateStageStatus` 等不可变状态转换。

**下一步：** Task 1/2/3/4/5/6/7/8/9/10 已全部完成。本 P0 工作台 workflow 信息架构和状态拆分计划已完成。后续按 `ui-ux-and-phase-4-handoff.md` 进入 P0「设置 / Provider / sidecar 配置」或「发布准备与 mock 发布任务」计划。

---

## 范围

**本计划覆盖：**

- `apps/desktop/src/composables/useWorkflowRuntime.ts` 及测试。
- `apps/desktop/src/composables/useWorkbenchDraft.ts` 及测试。
- `apps/desktop/src/composables/useTaskCenterPreview.ts` 及测试。
- `apps/desktop/src/components/workbench/WorkflowStageCard.vue`。
- `apps/desktop/src/components/workbench/WorkbenchShell.vue`。
- `apps/desktop/src/App.vue` 的拆分重构（状态迁移到 composables，UI 迁移到 components）。
- 拆分后的类型检查与单元测试验证。

**本计划不覆盖：**

- 不新增真实 AI / 媒体 / 发布能力（仍使用现有 mock providers）。
- 不修改 `@mirax/core`、`@mirax/provider-ai`、`@mirax/media-pipeline`、`@mirax/provider-publish` 的接口行为。
- 不实现声音管理、形象管理、素材管理、任务中心、账号管理、设置等独立视图（P1/P2 计划）。
- 不修改 `docs/reverse-engineering/legacy-ui-gap-list.md` 状态列。
- 不修改 `.codex/dispatch-state.json`。
- 不提交、不推送。

---

## 目标文件结构

```text
apps/desktop/src/
  composables/
    useWorkflowRuntime.ts
    useWorkflowRuntime.test.ts
    useWorkbenchDraft.ts
    useWorkbenchDraft.test.ts
    useTaskCenterPreview.ts
    useTaskCenterPreview.test.ts
  components/
    workbench/
      WorkflowStageCard.vue
      WorkbenchShell.vue
    DependencyChecklist.vue
    PathPickerButton.vue
    StatusBadge.vue
  features/
    task-center/
      taskHistory.ts
      taskHistory.test.ts
  runtime/
    desktopDraft.ts
    desktopDraft.test.ts
  App.vue
```

拆分后 `App.vue` 不再直接维护 `workflow`、`running`、`logs`、`saveStatus` 等状态，而是调用三个 composables 并把它们的结果绑定到模板。

---

## 全局验证命令

每个任务完成后至少运行对应验证命令。最终验收前运行：

```bash
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
pnpm test apps/desktop/src/composables/useWorkbenchDraft.test.ts
pnpm test apps/desktop/src/composables/useTaskCenterPreview.test.ts
pnpm test apps/desktop/src/runtime/desktopDraft.test.ts
pnpm test apps/desktop/src/features/task-center/taskHistory.test.ts
pnpm --filter @mirax/desktop typecheck
```

预期：所有新测试通过；`@mirax/desktop` 类型检查无错误；`App.vue` 能正常渲染原有 workflow 流程。

---

## 任务清单

### Task 1：创建 `useWorkflowRuntime` composable

**目标：** 把 `App.vue` 中的 workflow 状态机（`workflow`、`running`、`logs`、`runNextStage`、`runAllStages`、`runStage`、`resetWorkflow` 等）抽取为可测试 composable。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useWorkflowRuntime.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`
- `.codex/dispatch-state.json`
- `docs/reverse-engineering/legacy-ui-gap-list.md`

- [x] **Step 1：创建 composables 目录并写入 composable**

```bash
mkdir -p apps/desktop/src/composables
```

创建 `apps/desktop/src/composables/useWorkflowRuntime.ts`：

```typescript
import { computed, ref } from "vue";
import {
  createDefaultWorkflow,
  getNextStage,
  getStageProgress,
  updateStageStatus,
  type Workflow,
  type WorkflowStage,
  type WorkflowStageId,
  type WorkflowStageStatus,
} from "@mirax/core";

export interface WorkflowLogEntry {
  id: number;
  stage: string;
  message: string;
}

export interface UseWorkflowRuntimeOptions {
  projectId: string;
  executor: (stageId: WorkflowStageId, title: string) => Promise<string>;
}

export function useWorkflowRuntime(options: UseWorkflowRuntimeOptions) {
  const workflow = ref<Workflow>(createDefaultWorkflow(options.projectId));
  const activeStageId = ref<WorkflowStageId>("transcribe");
  const running = ref(false);
  const runningMode = ref<"single" | "all" | null>(null);
  const logs = ref<WorkflowLogEntry[]>([]);

  const progress = computed(() => getStageProgress(workflow.value));
  const nextStage = computed(() => getNextStage(workflow.value));
  const activeStage = computed(() => workflow.value.stages.find((stage) => stage.id === activeStageId.value));
  const stageStatus = computed(
    () => Object.fromEntries(workflow.value.stages.map((stage) => [stage.id, stage.status])) as Record<WorkflowStageId, WorkflowStageStatus>,
  );

  function addLog(stage: string, message: string) {
    logs.value.unshift({ id: Date.now() + logs.value.length, stage, message });
  }

  function resetFailedStage(stageId: WorkflowStageId) {
    if (stageStatus.value[stageId] === "failed") {
      workflow.value = updateStageStatus(workflow.value, stageId, "pending");
    }
  }

  async function processStage(stageId: WorkflowStageId, title: string): Promise<string> {
    resetFailedStage(stageId);
    activeStageId.value = stageId;
    workflow.value = updateStageStatus(workflow.value, stageId, "running");
    addLog(title, "开始执行");

    try {
      const message = await options.executor(stageId, title);
      workflow.value = updateStageStatus(workflow.value, stageId, "completed");
      addLog(title, message);
      return message;
    } catch (error) {
      if (error instanceof Error && error.message === "PUBLISH_CANCELLED") {
        workflow.value = updateStageStatus(workflow.value, stageId, "pending");
        addLog(title, "已取消发布");
        throw error;
      }

      const message = error instanceof Error ? error.message : "执行失败";
      workflow.value = updateStageStatus(workflow.value, stageId, "failed");
      addLog(title, message);
      throw error;
    }
  }

  async function runNextStage() {
    const stage = nextStage.value;
    if (!stage || running.value) {
      return;
    }

    running.value = true;
    runningMode.value = "single";

    try {
      await processStage(stage.id, stage.title);
    } finally {
      running.value = false;
      runningMode.value = null;
    }
  }

  async function runAllStages() {
    if (running.value) {
      return;
    }

    running.value = true;
    runningMode.value = "all";

    try {
      let stage = getNextStage(workflow.value);
      while (stage) {
        try {
          await processStage(stage.id, stage.title);
        } catch {
          break;
        }

        if (stageStatus.value[stage.id] !== "completed") {
          break;
        }

        stage = getNextStage(workflow.value);
      }
    } finally {
      running.value = false;
      runningMode.value = null;
    }
  }

  async function runStage(stageId: WorkflowStageId) {
    if (running.value) {
      return;
    }

    const status = stageStatus.value[stageId];
    if (status === "completed" || status === "running") {
      return;
    }

    const stage = workflow.value.stages.find((s) => s.id === stageId);
    if (!stage) {
      return;
    }

    running.value = true;
    runningMode.value = "single";

    try {
      await processStage(stageId, stage.title);
    } catch {
      // processStage already updates status and logs; swallow here to keep UX on card.
    } finally {
      running.value = false;
      runningMode.value = null;
    }
  }

  function resetWorkflow() {
    workflow.value = createDefaultWorkflow(options.projectId);
    activeStageId.value = "transcribe";
    logs.value = [];
  }

  return {
    workflow,
    activeStageId,
    running,
    runningMode,
    logs,
    progress,
    nextStage,
    activeStage,
    stageStatus,
    runNextStage,
    runAllStages,
    runStage,
    resetWorkflow,
    addLog,
  };
}
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无新增类型错误（此时 `App.vue` 尚未引用 composable，类型检查只校验新增文件）。

**验收标准：**

- `useWorkflowRuntime.ts` 存在且导出 `useWorkflowRuntime`。
- 状态机行为与 `App.vue` 原实现一致（pending → running → completed/failed，失败可重试，运行中不可重复启动）。
- executor 由调用方注入，composable 不依赖具体 provider。

---

### Task 2：为 `useWorkflowRuntime` 编写单元测试

**目标：** 用 Vitest 覆盖状态初始化、单步执行、全部执行、失败重试、日志追加，确保拆分不破坏行为。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useWorkflowRuntime.test.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入测试文件**

创建 `apps/desktop/src/composables/useWorkflowRuntime.test.ts`：

```typescript
import { describe, expect, it, vi } from "vitest";
import { useWorkflowRuntime } from "./useWorkflowRuntime.js";

describe("useWorkflowRuntime", () => {
  it("initializes with all pending stages", () => {
    const runtime = useWorkflowRuntime({ projectId: "demo", executor: vi.fn() });

    expect(runtime.workflow.value.projectId).toBe("demo");
    expect(runtime.workflow.value.stages).toHaveLength(8);
    expect(runtime.workflow.value.stages.every((stage) => stage.status === "pending")).toBe(true);
    expect(runtime.progress.value.percent).toBe(0);
  });

  it("runNextStage executes the first pending stage and marks it completed", async () => {
    const executor = vi.fn().mockResolvedValue("extracted 3 segments");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runNextStage();

    expect(executor).toHaveBeenCalledWith("transcribe", "对标视频文案提取");
    expect(runtime.workflow.value.stages[0].status).toBe("completed");
    expect(runtime.progress.value.completed).toBe(1);
    expect(runtime.logs.value[0].message).toBe("extracted 3 segments");
  });

  it("marks stage failed and stops runAllStages on executor error", async () => {
    const executor = vi.fn().mockRejectedValue(new Error("network error"));
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runAllStages();

    expect(runtime.workflow.value.stages[0].status).toBe("failed");
    expect(runtime.workflow.value.stages[1].status).toBe("pending");
    expect(runtime.logs.value[0].message).toContain("network error");
  });

  it("allows retrying a failed stage", async () => {
    const executor = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValueOnce("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runNextStage();
    expect(runtime.workflow.value.stages[0].status).toBe("failed");

    await runtime.runStage("transcribe");
    expect(runtime.workflow.value.stages[0].status).toBe("completed");
    expect(executor).toHaveBeenCalledTimes(2);
  });

  it("does not run a stage that is already running or completed", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runStage("transcribe");
    await runtime.runStage("transcribe");

    expect(executor).toHaveBeenCalledTimes(1);
  });

  it("resetWorkflow clears status and logs", async () => {
    const executor = vi.fn().mockResolvedValue("ok");
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await runtime.runNextStage();
    runtime.resetWorkflow();

    expect(runtime.workflow.value.stages.every((stage) => stage.status === "pending")).toBe(true);
    expect(runtime.logs.value).toHaveLength(0);
    expect(runtime.activeStageId.value).toBe("transcribe");
  });

  it("propagates PUBLISH_CANCELLED by resetting stage to pending", async () => {
    const executor = vi.fn().mockRejectedValue(new Error("PUBLISH_CANCELLED"));
    const runtime = useWorkflowRuntime({ projectId: "demo", executor });

    await expect(runtime.runStage("publish")).rejects.toThrow("PUBLISH_CANCELLED");
    expect(runtime.workflow.value.stages.find((s) => s.id === "publish")?.status).toBe("pending");
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
```

预期：7 个测试全部通过。

**验收标准：**

- 测试覆盖初始化、单步、全部、失败、重试、取消、重置。
- 不依赖真实 provider 或 localStorage。

---

### Task 3：创建 `useWorkbenchDraft` composable

**目标：** 把 `App.vue` 中的 `project` / `providerConfig` reactive 对象、草稿恢复/持久化、`saveStatus` 抽取为独立 composable。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useWorkbenchDraft.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：写入 composable**

创建 `apps/desktop/src/composables/useWorkbenchDraft.ts`：

```typescript
import { reactive, ref, watch } from "vue";
import {
  DESKTOP_DRAFT_STORAGE_KEY,
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
  type DesktopDraft,
} from "../runtime/desktopDraft.js";

export interface UseWorkbenchDraftOptions {
  storage?: Storage;
}

export function useWorkbenchDraft(options: UseWorkbenchDraftOptions = {}) {
  const storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const draft = reactive<DesktopDraft>(createDefaultDesktopDraft());
  const saveStatus = ref("未保存");

  function restore() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const saved = JSON.parse(raw) as Partial<DesktopDraft>;
      const restored = restoreDesktopDraft(saved);
      Object.assign(draft.project, restored.project);
      Object.assign(draft.providerConfig, restored.providerConfig);
      saveStatus.value = "已恢复草稿";
    } catch {
      saveStatus.value = "草稿读取失败";
    }
  }

  function persist() {
    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      const payload = sanitizeDesktopDraftForStorage(draft);
      storage.setItem(DESKTOP_DRAFT_STORAGE_KEY, JSON.stringify(payload));
      saveStatus.value = "草稿已保存";
    } catch {
      saveStatus.value = "草稿保存失败";
    }
  }

  watch(
    [() => draft.project, () => draft.providerConfig],
    () => {
      persist();
    },
    { deep: true },
  );

  return {
    draft,
    saveStatus,
    restore,
    persist,
  };
}
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无新增类型错误。

**验收标准：**

- `draft.project` 与 `draft.providerConfig` 保持 reactive。
- 恢复时 API Key 保持空字符串（由 `restoreDesktopDraft` 保证）。
- 持久化前自动过滤 API Key。

---

### Task 4：为 `useWorkbenchDraft` 编写单元测试

**目标：** 验证恢复、持久化和 API Key 过滤。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useWorkbenchDraft.test.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：创建 fake storage helper**

在测试文件顶部写入：

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { useWorkbenchDraft } from "./useWorkbenchDraft.js";

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
```

- [x] **Step 2：写入测试用例**

继续在同一文件追加：

```typescript
describe("useWorkbenchDraft", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = createFakeStorage();
  });

  it("restores saved project and provider config from storage", () => {
    const storage = createFakeStorage();
    storage.setItem(
      "mirax-ai.desktop-draft.v1",
      JSON.stringify({
        project: {
          name: "测试项目",
          sourceVideoPath: "/tmp/source.mp4",
          voiceSamplePath: "/tmp/voice.wav",
          notes: "轻便通勤",
          targetPlatforms: ["xiaohongshu"],
        },
        providerConfig: {
          id: "main-ai",
          label: "自定义模型",
          provider: "openai",
          baseUrl: "https://api.example.com/v1",
          model: "kimi-for-coding",
          enabled: true,
        },
      }),
    );

    const { draft, saveStatus } = useWorkbenchDraft({ storage });

    expect(saveStatus.value).toBe("已恢复草稿");
    expect(draft.project.name).toBe("测试项目");
    expect(draft.project.targetPlatforms).toEqual(["xiaohongshu"]);
    expect(draft.providerConfig.label).toBe("自定义模型");
    expect(draft.providerConfig.apiKey).toBe("");
  });

  it("does not persist apiKey to storage", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.providerConfig.apiKey = "sk-secret";
    await nextTick();

    const raw = storage.getItem("mirax-ai.desktop-draft.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });

  it("persists project changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.project.name = "新项目";
    await nextTick();

    const raw = storage.getItem("mirax-ai.desktop-draft.v1");
    const parsed = JSON.parse(raw!);
    expect(parsed.project.name).toBe("新项目");
  });

  it("handles invalid storage gracefully", () => {
    const storage = createFakeStorage();
    storage.setItem("mirax-ai.desktop-draft.v1", "not-json");

    const { saveStatus } = useWorkbenchDraft({ storage });

    expect(saveStatus.value).toBe("草稿读取失败");
  });
});
```

- [x] **Step 3：运行测试**

```bash
pnpm test apps/desktop/src/composables/useWorkbenchDraft.test.ts
```

预期：4 个测试全部通过。

**验收标准：**

- 恢复、持久化、API Key 过滤、异常存储均被覆盖。

---

### Task 5：创建 `useTaskCenterPreview` composable

**目标：** 把 `App.vue` 中对最近任务历史（`taskHistory` ref、`latestHistoryItems` computed）的读取封装为 composable，为后续任务中心视图提供复用入口。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useTaskCenterPreview.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：写入 composable**

创建 `apps/desktop/src/composables/useTaskCenterPreview.ts`：

```typescript
import { computed, ref } from "vue";
import {
  listLatestHistoryItems,
  loadTaskHistory,
  type PublishHistoryItem,
} from "../features/task-center/taskHistory.js";

export interface UseTaskCenterPreviewOptions {
  limit?: number;
}

export function useTaskCenterPreview(options: UseTaskCenterPreviewOptions = {}) {
  const limit = options.limit ?? 5;
  const items = ref<PublishHistoryItem[]>(loadTaskHistory());

  const latestItems = computed(() => listLatestHistoryItems(items.value).slice(0, limit));

  function refresh() {
    items.value = loadTaskHistory();
  }

  return {
    items,
    latestItems,
    refresh,
  };
}
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无新增类型错误。

**验收标准：**

- composable 导出 `latestItems` 和 `refresh`。
- 默认最多返回 5 条最近历史。

---

### Task 6：为 `useTaskCenterPreview` 编写单元测试

**目标：** 验证最近历史读取、排序和条数限制。

**允许修改文件：**

- 创建：`apps/desktop/src/composables/useTaskCenterPreview.test.ts`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入测试文件**

创建 `apps/desktop/src/composables/useTaskCenterPreview.test.ts`：

```typescript
import { beforeEach, describe, expect, it } from "vitest";
import {
  appendPublishHistoryItem,
  createPublishHistoryItem,
  saveTaskHistory,
} from "../features/task-center/taskHistory.js";
import { useTaskCenterPreview } from "./useTaskCenterPreview.js";

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

describe("useTaskCenterPreview", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = createFakeStorage();
    saveTaskHistory([]);
  });

  it("loads latest items sorted by createdAt descending", () => {
    appendPublishHistoryItem(
      createPublishHistoryItem({
        projectId: "a",
        taskIds: ["a-1"],
        videoPath: "/tmp/a.mp4",
        platforms: ["douyin"],
        createdAt: "2026-06-12T00:00:00.000Z",
      }),
    );
    appendPublishHistoryItem(
      createPublishHistoryItem({
        projectId: "b",
        taskIds: ["b-1"],
        videoPath: "/tmp/b.mp4",
        platforms: ["xiaohongshu"],
        createdAt: "2026-06-12T01:00:00.000Z",
      }),
    );

    const { latestItems } = useTaskCenterPreview();

    expect(latestItems.value.map((item) => item.projectId)).toEqual(["b", "a"]);
  });

  it("respects the limit option", () => {
    for (let i = 0; i < 10; i++) {
      appendPublishHistoryItem(
        createPublishHistoryItem({
          projectId: String(i),
          taskIds: [`${i}-1`],
          videoPath: "/tmp/x.mp4",
          platforms: ["douyin"],
          createdAt: `2026-06-12T0${i}:00:00.000Z`,
        }),
      );
    }

    const { latestItems } = useTaskCenterPreview({ limit: 3 });

    expect(latestItems.value).toHaveLength(3);
  });

  it("refresh reloads history", () => {
    const { latestItems, refresh } = useTaskCenterPreview();
    expect(latestItems.value).toHaveLength(0);

    appendPublishHistoryItem(
      createPublishHistoryItem({
        projectId: "new",
        taskIds: ["new-1"],
        videoPath: "/tmp/new.mp4",
        platforms: ["douyin"],
      }),
    );
    refresh();

    expect(latestItems.value).toHaveLength(1);
  });
});
```

- [x] **Step 2：运行测试**

```bash
pnpm test apps/desktop/src/composables/useTaskCenterPreview.test.ts
```

预期：3 个测试全部通过。

**验收标准：**

- 排序、限制、刷新均被覆盖。

---

### Task 7：创建 `WorkflowStageCard.vue` 通用阶段卡片

**目标：** 把当前 `App.vue` 中每个 workflow 卡片重复的「图标 + 标题 + StatusBadge + 内容 slot + 操作 slot」结构抽象为通用组件。

**允许修改文件：**

- 创建：`apps/desktop/src/components/workbench/WorkflowStageCard.vue`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入组件**

创建目录和文件：

```bash
mkdir -p apps/desktop/src/components/workbench
```

创建 `apps/desktop/src/components/workbench/WorkflowStageCard.vue`：

```vue
<script setup lang="ts">
import { computed } from "vue";
import type { WorkflowStage, WorkflowStageStatus } from "@mirax/core";
import StatusBadge from "../StatusBadge.vue";

const props = defineProps<{
  stage: WorkflowStage;
  status: WorkflowStageStatus;
}>();

const emit = defineEmits<{
  run: [stageId: WorkflowStage["id"]];
}>();

const isRunDisabled = computed(() => props.status === "running" || props.status === "completed");
</script>

<template>
  <section class="workflow-card" :data-stage="stage.id">
    <div class="card-heading">
      <span class="card-icon">
        <slot name="icon" />
      </span>
      <h2>{{ stage.title }}</h2>
      <StatusBadge :status="status" />
      <slot name="heading-extra" />
    </div>

    <div class="card-body">
      <slot />
    </div>

    <div class="card-actions">
      <slot name="actions">
        <button
          class="primary compact-button"
          :disabled="isRunDisabled"
          @click="emit('run', stage.id)"
        >
          执行 {{ stage.title }}
        </button>
      </slot>
    </div>
  </section>
</template>

<style scoped>
.workflow-card {
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-lg);
  padding: 16px;
  background: var(--mx-bg-panel);
}

.card-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
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

.card-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
</style>
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无新增类型错误。

**验收标准：**

- 组件接受 `stage` 和 `status` props。
- 默认提供可禁用的执行按钮，可通过 slot 覆盖。
- 不影响现有 `App.vue` 运行。

---

### Task 8：创建 `WorkbenchShell.vue` 工作台外壳

**目标：** 把 `App.vue` 中的导航 rail、顶栏、项目概览、主题切换、运行控制按钮提取为可复用的工作台外壳组件，使 `App.vue` 只负责内容区填充。

**允许修改文件：**

- 创建：`apps/desktop/src/components/workbench/WorkbenchShell.vue`

**禁止修改文件：**

- `apps/desktop/src/App.vue`
- `packages/`

- [x] **Step 1：写入组件**

创建 `apps/desktop/src/components/workbench/WorkbenchShell.vue`：

```vue
<script setup lang="ts">
import {
  Circle,
  CloudUpload,
  ClipboardCheck,
  FolderOpen,
  KeyRound,
  Loader2,
  Moon,
  Play,
  PlayCircle,
  RefreshCw,
  Settings2,
  Sun,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-vue-next";

defineProps<{
  projectName: string;
  activeStageTitle: string;
  progressPercent: number;
  progressCompleted: number;
  progressTotal: number;
  running: boolean;
  runningMode: "single" | "all" | null;
  canRun: boolean;
  theme: "light" | "dark";
}>();

const emit = defineEmits<{
  runNext: [];
  runAll: [];
  reset: [];
  toggleTheme: [];
}>();
</script>

<template>
  <main class="app-shell" :data-theme="theme">
    <aside class="nav-rail">
      <div class="brand">
        <div class="brand-mark">
          <PlayCircle :size="20" />
        </div>
        <div class="brand-text">
          <strong>Mirax AI</strong>
          <small>短视频工作台</small>
        </div>
      </div>
      <nav>
        <button class="nav-item active"><WandSparkles :size="18" /> 首页</button>
        <button class="nav-item"><Volume2 :size="18" /> 声音管理</button>
        <button class="nav-item"><UserRound :size="18" /> 形象管理</button>
        <button class="nav-item"><FolderOpen :size="18" /> 素材管理</button>
        <button class="nav-item"><ClipboardCheck :size="18" /> 任务中心</button>
        <button class="nav-item"><KeyRound :size="18" /> 账号管理</button>
        <button class="nav-item"><Settings2 :size="18" /> 设置</button>
      </nav>
    </aside>

    <section class="board-shell">
      <header class="window-bar">
        <div class="project-overview">
          <div class="project-title">
            <strong>{{ projectName || "Mirax AI 项目" }}</strong>
            <span>{{ activeStageTitle || "准备开始" }}</span>
          </div>
        </div>
        <div class="mode-switch">
          <button class="selected"><Play :size="15" /> 手动</button>
          <button><CloudUpload :size="15" /> 自动</button>
          <button><Circle :size="15" /> 后台</button>
        </div>
        <div class="toolbar-actions">
          <span class="progress-pill"><b>{{ progressPercent }}%</b> {{ progressCompleted }}/{{ progressTotal }}</span>
          <button class="theme-toggle" :aria-label="theme === 'dark' ? '切换到白天' : '切换到黑夜'" @click="emit('toggleTheme')">
            <Sun v-if="theme === 'dark'" :size="16" />
            <Moon v-else :size="16" />
          </button>
          <button class="ghost-button" @click="emit('reset')">
            <RefreshCw :size="16" />
            清空数据
          </button>
          <button class="secondary" :disabled="!canRun" @click="emit('runAll')">
            <Loader2 v-if="runningMode === 'all'" :size="17" class="spin" />
            <PlayCircle v-else :size="17" />
            {{ runningMode === 'all' ? '运行中' : '运行全部' }}
          </button>
          <button class="primary" :disabled="!canRun" @click="emit('runNext')">
            <Loader2 v-if="runningMode === 'single'" :size="17" class="spin" />
            <Play v-else :size="17" />
            {{ runningMode === 'single' ? '执行中' : '运行下一步' }}
          </button>
        </div>
      </header>

      <div class="workflow-board">
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
}

.nav-rail {
  width: 200px;
  border-right: 1px solid var(--mx-border-subtle);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.brand-text small {
  color: var(--mx-text-tertiary);
  font-size: 12px;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: var(--mx-text-secondary);
  cursor: pointer;
  text-align: left;
}

.nav-item.active {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.board-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.window-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--mx-border-subtle);
  gap: 16px;
}

.project-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-title span {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.mode-switch {
  display: flex;
  gap: 8px;
}

.mode-switch button {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--mx-border-subtle);
  background: transparent;
  color: var(--mx-text-secondary);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.mode-switch button.selected {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-pill {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--mx-bg-surface);
  font-size: 12px;
}

.workflow-board {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 20px;
  align-content: start;
}
</style>
```

- [x] **Step 2：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无新增类型错误。

**验收标准：**

- 组件导出工作台外壳结构和事件。
- 不依赖具体 stage 内容，只通过 slot 填充 workflow-board。

---

### Task 9：重构 `App.vue` 以使用 composables 与 components

**目标：** 删除 `App.vue` 中内嵌的状态与逻辑，改为调用 Task 1-8 的产物；保持现有模板功能与样式不变。

**允许修改文件：**

- 修改：`apps/desktop/src/App.vue`

**禁止修改文件：**

- `packages/`
- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：重写 `<script setup>`**

把 `App.vue` 的 `<script setup>` 替换为：

```vue
<script setup lang="ts">
import {
  CheckCircle2,
  Circle,
  CloudUpload,
  ClipboardCheck,
  FileVideo,
  FileText,
  FolderOpen,
  Image,
  KeyRound,
  Link2,
  Loader2,
  Moon,
  Music2,
  Play,
  PlayCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sun,
  Upload,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import {
  createApiKeyProviderConfig,
  validateProjectDraft,
  validateProviderConfig,
  type ProjectDraft,
  type PublishPlatform,
  type WorkflowStageId,
} from "@mirax/core";
import { createMockMediaRenderer } from "@mirax/media-pipeline";
import { createMockAiProvider, testAiProviderConnection } from "@mirax/provider-ai";
import { SUPPORTED_PLATFORM_PROFILES, createMockPublisher, type PublishAccount } from "@mirax/provider-publish";
import DependencyChecklist from "./components/DependencyChecklist.vue";
import PathPickerButton from "./components/PathPickerButton.vue";
import StatusBadge from "./components/StatusBadge.vue";
import WorkbenchShell from "./components/workbench/WorkbenchShell.vue";
import WorkflowStageCard from "./components/workbench/WorkflowStageCard.vue";
import { useTaskCenterPreview } from "./composables/useTaskCenterPreview.js";
import { useWorkbenchDraft } from "./composables/useWorkbenchDraft.js";
import { useWorkflowRuntime } from "./composables/useWorkflowRuntime.js";
import {
  appendPublishHistoryItem,
  createPublishHistoryItem,
} from "./features/task-center/taskHistory.js";

const aiProvider = createMockAiProvider({ artifactRoot: "/Users/Shared/MiraxAI" });
const mediaRenderer = createMockMediaRenderer({ artifactRoot: "/Users/Shared/MiraxAI" });
const publisher = createMockPublisher();

const { draft, saveStatus } = useWorkbenchDraft();
const { latestHistoryItems, refresh: refreshTaskHistory } = useTaskCenterPreview({ limit: 5 });

const publishAccounts = ref<PublishAccount[]>([]);
const generatedVideoPath = ref("");
const generatedCoverPath = ref("");
const generatedAudioPath = ref("");
const generatedAvatarPath = ref("");
const publishTitle = ref("");
const publishDescription = ref("");
const publishTags = ref("通勤包, 大容量, 质感");
const publishMode = ref<"direct" | "draft">("draft");
const connectionMessage = ref("未测试");
const theme = ref<"light" | "dark">("dark");

const runtime = useWorkflowRuntime({
  projectId: "demo-project",
  executor: executeStage,
});

const project = computed({
  get: () => draft.project,
  set: (value: ProjectDraft) => {
    Object.assign(draft.project, value);
  },
});

const providerConfig = computed({
  get: () => draft.providerConfig,
  set: (value) => {
    Object.assign(draft.providerConfig, value);
  },
});

const projectErrors = computed(() => validateProjectDraft(project.value));
const providerErrors = computed(() => validateProviderConfig(providerConfig.value));
const canRun = computed(() => !runtime.running.value && projectErrors.value.length === 0 && Boolean(runtime.nextStage.value));
const platformLabels = computed<Record<PublishPlatform, string>>(() =>
  Object.fromEntries(SUPPORTED_PLATFORM_PROFILES.map((profile) => [profile.id, profile.label])) as Record<
    PublishPlatform,
    string
  >,
);
const selectedAccountText = computed(() => {
  if (publishAccounts.value.length === 0) {
    return "选择账号";
  }

  return project.value.targetPlatforms
    .map((platformId) => publishAccounts.value.find((account) => account.platformId === platformId)?.displayName)
    .filter(Boolean)
    .join("、");
});

function getPlatformLabel(platform: PublishPlatform): string {
  return platformLabels.value[platform];
}

function resetWorkbench() {
  runtime.resetWorkflow();
  publishAccounts.value = [];
  generatedVideoPath.value = "";
  generatedCoverPath.value = "";
  generatedAudioPath.value = "";
  generatedAvatarPath.value = "";
  publishTitle.value = "";
  publishDescription.value = "";
}

async function executeStage(stageId: WorkflowStageId, title: string): Promise<string> {
  switch (stageId) {
    case "transcribe": {
      const result = await aiProvider.transcribe({
        sourceVideoPath: project.value.sourceVideoPath ?? "",
        language: "zh-CN",
      });
      return `已提取 ${result.segments.length} 段文案`;
    }
    case "rewrite": {
      const result = await aiProvider.rewriteScript({
        transcript: "模拟对标视频文案",
        productName: project.value.name,
        sellingPoints: ["通勤", "大容量", "质感"],
      });
      publishTitle.value = result.titleSuggestions[0] ?? project.value.name;
      publishDescription.value = result.script.slice(0, 100);
      return `生成 ${result.titleSuggestions.length} 个标题方向`;
    }
    case "voice-clone": {
      const result = await aiProvider.cloneVoice({
        voiceSamplePath: project.value.voiceSamplePath ?? "",
        projectId: runtime.workflow.value.projectId,
      });
      return `声音配置 ${result.voiceId} 已就绪`;
    }
    case "speech": {
      const result = await aiProvider.synthesizeSpeech({
        voiceId: "mock-voice-demo-project",
        script: project.value.notes ?? project.value.name,
        projectId: runtime.workflow.value.projectId,
      });
      generatedAudioPath.value = result.audioPath;
      return `音频已生成：${result.audioPath}`;
    }
    case "avatar": {
      const result = await aiProvider.generateAvatarVideo({
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        avatarId: "presenter-a",
        projectId: runtime.workflow.value.projectId,
      });
      generatedAvatarPath.value = result.videoPath;
      return `数字人片段已生成：${result.videoPath}`;
    }
    case "compose": {
      const result = await mediaRenderer.render({
        projectId: runtime.workflow.value.projectId,
        avatarVideoPath: generatedAvatarPath.value || "/Users/Shared/MiraxAI/demo-project/avatar.mp4",
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        subtitleText: project.value.notes ?? project.value.name,
        coverText: project.value.name,
      });
      generatedVideoPath.value = result.videoPath;
      generatedCoverPath.value = result.coverPath;
      return `成片已生成：${result.videoPath}`;
    }
    case "review":
      return "人工复核清单已通过";
    case "publish": {
      publishAccounts.value = await publisher.listAccounts();

      const platformText = project.value.targetPlatforms.map((platform) => platformLabels.value[platform]).join("、") || "未选择";
      const accountText = selectedAccountText.value || "选择账号";
      const modeText = publishMode.value === "direct" ? "直接发布" : "草稿";
      const videoPath = generatedVideoPath.value || "未生成";

      const confirmed = window.confirm(
        `确认创建 ${project.value.targetPlatforms.length} 个发布任务？\n\n账号：${accountText}\n平台：${platformText}\n发布模式：${modeText}\n视频路径：${videoPath}`,
      );

      if (!confirmed) {
        throw new Error("PUBLISH_CANCELLED");
      }

      const result = await publisher.publish({
        projectId: runtime.workflow.value.projectId,
        videoPath: generatedVideoPath.value,
        title: publishTitle.value || project.value.name,
        description: publishDescription.value || project.value.notes || "",
        platformIds: project.value.targetPlatforms,
        mode: publishMode.value,
      });

      const historyItem = createPublishHistoryItem({
        projectId: runtime.workflow.value.projectId,
        taskIds: result.taskIds,
        videoPath: generatedVideoPath.value,
        platforms: project.value.targetPlatforms,
      });
      appendPublishHistoryItem(historyItem);
      refreshTaskHistory();

      return `${result.message}：${result.taskIds.join("、")}`;
    }
  }
}

async function testConnection() {
  connectionMessage.value = "检测中…";

  try {
    const input =
      providerConfig.value.provider === "openai"
        ? ({
            mode: "openai-compatible",
            baseUrl: providerConfig.value.baseUrl ?? "",
            apiKey: providerConfig.value.apiKey,
            model: providerConfig.value.model ?? "",
          } as const)
        : ({ mode: "mock" } as const);

    const result = await testAiProviderConnection(input);
    connectionMessage.value = result.message;
  } catch (error) {
    connectionMessage.value = error instanceof Error ? error.message : "连接测试失败";
  }
}

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}
</script>
```

- [x] **Step 2：重写 `<template>` 根结构**

把 `App.vue` 的 `<template>` 替换为使用 `WorkbenchShell` 包裹原有卡片，同时保留每个卡片的原有内容。关键替换：

```vue
<template>
  <WorkbenchShell
    :project-name="project.name"
    :active-stage-title="runtime.activeStage.value?.title"
    :progress-percent="runtime.progress.value.percent"
    :progress-completed="runtime.progress.value.completed"
    :progress-total="runtime.progress.value.total"
    :running="runtime.running.value"
    :running-mode="runtime.runningMode.value"
    :can-run="canRun"
    :theme="theme"
    @run-next="runtime.runNextStage"
    @run-all="runtime.runAllStages"
    @reset="resetWorkbench"
    @toggle-theme="toggleTheme"
  >
    <!-- 原有 workflow-card 内容保持在这里，把状态引用从本地改为 composables -->
  </WorkbenchShell>
</template>
```

在每个 workflow 卡片内部：
- 把 `stageStatus.transcribe` 改为 `runtime.stageStatus.value.transcribe`。
- 把 `@click="runStage('transcribe')"` 改为 `@click="runtime.runStage('transcribe')"`。
- 把 `running` 改为 `runtime.running.value`。
- 保留原有样式 `<style scoped>` 不变。

- [x] **Step 3：运行类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无类型错误。如果出现 `project` computed setter 类型不匹配，调整 `Object.assign` 或显式类型断言。

**验收标准：**

- `App.vue` 不再直接声明 `workflow`、`running`、`logs`、`saveStatus` 等状态。
- 所有 workflow 控制通过 `runtime` composable 完成。
- 所有草稿读写通过 `draft` composable 完成。
- 最近历史通过 `useTaskCenterPreview` 读取。
- 原有 UI 功能（运行下一步、运行全部、单阶段执行、重置、草稿恢复、主题切换）保持可用。

---

### Task 10：全量验证

**目标：** 运行所有相关测试与类型检查，确认拆分不引入回归。

**允许修改文件：**

- 无（只验证）。

**禁止修改文件：**

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `.codex/dispatch-state.json`

- [x] **Step 1：运行核心包测试**

```bash
pnpm test packages/core
```

预期：通过。

- [x] **Step 2：运行桌面端新增测试**

```bash
pnpm test apps/desktop/src/composables/useWorkflowRuntime.test.ts
pnpm test apps/desktop/src/composables/useWorkbenchDraft.test.ts
pnpm test apps/desktop/src/composables/useTaskCenterPreview.test.ts
```

预期：全部通过。

- [x] **Step 3：运行桌面端既有测试**

```bash
pnpm test apps/desktop/src/runtime/desktopDraft.test.ts
pnpm test apps/desktop/src/features/task-center/taskHistory.test.ts
```

预期：全部通过。

- [x] **Step 4：运行桌面端类型检查**

```bash
pnpm --filter @mirax/desktop typecheck
```

预期：无错误。

- [x] **Step 5：运行 web 开发模式 smoke（可选）**

```bash
pnpm --filter @mirax/desktop dev:web
```

在浏览器打开终端输出的本地地址，确认工作台页面能加载、各阶段卡片显示正常、运行下一步和运行全部按钮可用。

停止 dev server：`Control+C`。

**验收标准：**

- 所有新增和既有测试通过。
- 桌面端类型检查通过。
- `App.vue` 渲染与行为与拆分前一致。

---

## 自检与验收

### 规格覆盖检查

对照 `docs/product-architecture/ui-ux-and-phase-4-handoff.md` 的 P0 要求：

| 要求 | 覆盖任务 |
| --- | --- |
| 工作台 workflow 信息架构 | Task 7-9（WorkbenchShell、WorkflowStageCard、App.vue 重构） |
| 状态拆分 | Task 1-6（useWorkflowRuntime、useWorkbenchDraft、useTaskCenterPreview） |
| 与 `@mirax/core` 集成 | Task 1（状态机复用 `createDefaultWorkflow` / `updateStageStatus`） |
| 可测试性 | Task 2、4、6、10 |

### Placeholder 扫描

检查计划中是否包含以下禁用模式：

- [ ] 无 "TBD" / "TODO" / "implement later" / "fill in details"。
- [ ] 无 "Add appropriate error handling" 等模糊描述。
- [ ] 无 "Similar to Task N" 省略代码。
- [ ] 所有文件路径和命令均为绝对路径或相对仓库根路径。

### 类型一致性检查

- `WorkflowStageId` / `WorkflowStageStatus` 全部来自 `@mirax/core`。
- `useWorkflowRuntime` 的 `executor` 签名在所有任务中保持一致：`(stageId: WorkflowStageId, title: string) => Promise<string>`。
- `ProjectDraft` / `ApiKeyProviderConfig` 通过 `useWorkbenchDraft` 的 `draft` 暴露，不重新声明。

---

## 风险与待确认问题

1. **App.vue 体积仍大**：本计划只拆分状态和外壳组件，没有把每个阶段卡片拆为独立组件。P1 声音/形象/素材视图创建时，再决定是否继续拆分阶段卡片。
2. **导航按钮目前仍是占位**：`WorkbenchShell.vue` 中的声音/形象/素材/任务/账号/设置导航按钮未绑定路由。P1 创建独立视图时再接入 Vue Router 或条件渲染。
3. **project computed setter 的 reactive 行为**：`project` 用 `computed({ get, set })` 包裹 `draft.project`，需确认表单输入仍能触发 `watch` 持久化。如 `v-model` 触发 setter 后 `watch` 未运行，改为在模板中直接使用 `draft.project.xxx`。
4. **执行器异常语义**：`executeStage` 对 `PUBLISH_CANCELLED` 的抛出与 `useWorkflowRuntime.processStage` 的捕获逻辑需保持一致；验收时验证取消后 publish 阶段回到 `pending`。
5. **待确认：是否需要在 P0 引入 Vue Router？** 结论：不需要。P0 只拆分工作台信息架构，路由在 P1 创建独立视图时引入。
6. **待确认：mock provider 的 artifactRoot 硬编码是否保留？** 当前保留 `/Users/Shared/MiraxAI`，P0 不改动；后续「设置 / Provider / sidecar 配置」计划再统一移入设置。
