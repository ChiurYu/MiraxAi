# Mirax First Usable Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前第一版从“mock 流程能跑”推进到“用户打开后可以按旧版轻语 IP 工作流完成一次稳定试用，并清楚知道哪些是真实能力、哪些是 mock 占位”。

**Architecture:** 保持 Tauri 2 + Vue 3 + TypeScript monorepo，不引入重型 UI 框架。桌面端首页继续贴近旧版「轻语IP智能体」的深色 7 模块工作台；真实能力通过 provider 和 sidecar seam 逐步替换 mock，避免 UI 层耦合模型、FFmpeg、Playwright 或 Python 服务细节。

**Tech Stack:** Tauri 2, Vue 3, TypeScript, pnpm workspaces, Vitest, localStorage MVP draft persistence, SQLite-ready schema stubs, FFmpeg command builders, Playwright-ready publish provider seam.

---

## Current Progress Snapshot

更新时间：2026-06-12

- [x] Monorepo scaffold 已完成：`package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.config.ts`。
- [x] Core workflow domain 已完成：`packages/core/src/*`，覆盖 8 步 workflow、项目校验、provider 配置校验。
- [x] Mock AI provider 已完成：`packages/provider-ai/src/mock.ts`，覆盖文案提取、改写、声音、语音、数字人 mock 输出。
- [x] OpenAI-compatible 占位适配器已完成：`packages/provider-ai/src/openAiCompatible.ts`，真实接入前明确抛出未接入错误。
- [x] Mock media pipeline 已完成：`packages/media-pipeline/src/*`，覆盖 FFmpeg 命令构建和 mock render 输出。
- [x] Mock publish provider 已完成：`packages/provider-publish/src/*`，覆盖平台资料、账号列表、草稿发布任务。
- [x] Local store schema stub 已完成：`packages/local-store/src/*`，覆盖第一版核心表结构。
- [x] Sidecar dependency check stub 已完成：`packages/sidecar-manager/src/*`，覆盖 FFmpeg、Playwright、Python、HeyGem、CosyVoice 检查。
- [x] 桌面端可打包并启动：`desktop/src-tauri/target/release/bundle/macos/Mirax AI.app`。
- [x] 首页已改为旧版风格：左侧导航、顶部手动/自动/后台、7 个编号模块卡片。
- [x] 浏览器验收已跑通：`运行全部` 后进度 `100% / 8/8`，mock 发布任务生成。
- [x] 旧版界面差距清单已补齐：`docs/reverse-engineering/legacy-ui-gap-list.md`。
- [x] 桌面端草稿持久化已抽离：`desktop/src/runtime/desktopDraft.ts`，API Key 不进入 localStorage。
- [x] Task 3 每卡片状态与重试 UX 已完成：`desktop/src/components/StatusBadge.vue` + `desktop/src/App.vue`，7 个模块均显示 workflow stage 状态 badge 与单步/重试按钮。
- [x] 与旧版功能对齐的“可正常使用”收口已完成：真实试用状态提示、素材选择体验、Provider 连接测试、依赖检查面板、任务中心记录和发布前确认均通过浏览器验收。

## Target File Structure Changes

```text
desktop/src/
  App.vue                         继续作为第一版单页工作台，后续拆分前保持功能完整
  styles.css                      继续承载旧版风格布局和控件样式
  runtime/
    desktopDraft.ts               本地草稿读写、敏感字段过滤、版本迁移
    workflowRunner.ts             一步执行、全流程执行、失败中断、重试入口
  components/
    StatusBadge.vue               pending/running/completed/failed 状态标识
    PathPickerButton.vue          Tauri 文件选择可用时调用 dialog，不可用时 fallback prompt
    DependencyChecklist.vue       展示 FFmpeg / Playwright / Python / HeyGem / CosyVoice 状态
  features/
    task-center/
      taskHistory.ts              本地任务历史模型和 localStorage MVP 仓储
packages/provider-ai/src/
  connectionTest.ts               mock / unwired / OpenAI-compatible 连接测试结果
packages/provider-ai/tests/
  connection-test.test.ts
packages/sidecar-manager/src/
  browserChecks.ts                Playwright 浏览器检查的纯函数入口
packages/sidecar-manager/tests/
  browser-checks.test.ts
docs/reverse-engineering/
  legacy-ui-gap-list.md           旧版界面差距清单和完成进度
```

## Validation Commands

每个任务完成后至少运行相关局部命令；每个提交前运行完整命令：

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

桌面运行验收：

```bash
pnpm --filter @mirax/desktop dev:web
```

浏览器验收目标：

- 首页存在 7 个编号模块：`1. 学习对标` 到 `7. 视频发布`。
- 点击 `运行全部` 后顶部显示 `100% / 8/8`。
- 执行记录出现 `mock-publish-demo-project-douyin`。
- 修改项目名称、素材路径、卖点备注后刷新页面，草稿恢复。
- 依赖检查面板能显示 mock/未配置状态，不阻断 mock 流程。

打包验收：

```bash
pnpm build
"desktop/src-tauri/target/release/mirax-ai-desktop"
```

预期：二进制保持运行至少 3 秒，不出现 Tauri icon panic 或窗口初始化崩溃。

---

### Task 1: Legacy UI Gap Inventory

**Files:**
- Create: `docs/reverse-engineering/legacy-ui-gap-list.md`
- Modify: `docs/reverse-engineering/demo-video-coverage.md`

- [x] **Step 1: Write the legacy gap inventory**

Create `docs/reverse-engineering/legacy-ui-gap-list.md` with this structure:

```md
# 旧版轻语 IP 界面差距清单

## 已对齐

- 左侧导航：首页、声音管理、形象管理、素材管理、任务中心、账号管理、设置。
- 顶部模式：手动、自动、后台。
- 首页工作台：7 个编号模块。
- 一键跑通 mock 流程。

## 第一版必须补齐

| 旧版区域 | 当前问题 | 完成标准 | 状态 |
| --- | --- | --- | --- |
| 学习对标 | 粘贴按钮仍是 prompt fallback | Tauri 可用时打开系统文件/链接输入 fallback | 未开始 |
| 改写文案 | 改写结果没有明确状态标识 | 卡片显示 completed/failed badge 和可重试按钮 | 未开始 |
| 声音生成 | 上传声音只是路径输入 | 使用统一 PathPickerButton；展示音频路径和 mock 标识 | 未开始 |
| 视频生成 | 生成视频按钮与全流程按钮边界不清 | 单卡片按钮可执行对应步骤，失败时保留重试 | 未开始 |
| 一键成片 | 字幕/BGM/音量控件只展示，不参与 mock 输出 | mock render 日志包含字幕/BGM/音量设置摘要 | 未开始 |
| 标题封面 | 话题标签没有解析为数组 | 发布前把逗号分隔标签转为 `#tag` 预览 | 未开始 |
| 视频发布 | 没有发布前确认和任务历史 | 发布前展示账号/模式/视频路径，发布后写入任务中心 | 未开始 |
| 设置 | 密钥只校验字段，不显示连接测试 | Mock 连接成功，OpenAI-compatible 显示未接入 | 未开始 |
| 依赖 | sidecar 检查只在包内，UI 无入口 | UI 展示 FFmpeg/Playwright/Python/HeyGem/CosyVoice 状态 | 未开始 |
```

- [x] **Step 2: Update coverage matrix**

Modify `docs/reverse-engineering/demo-video-coverage.md` so every `部分覆盖` or `mock` item links to a row in `legacy-ui-gap-list.md`.

- [x] **Step 3: Verify docs**

Run:

```bash
rg "未开始|部分覆盖|mock" docs/reverse-engineering
```

Expected: output lists the planned gaps; no vague unfinished-marker wording remains.

- [x] **Step 4: Commit**

```bash
git add docs/reverse-engineering/legacy-ui-gap-list.md docs/reverse-engineering/demo-video-coverage.md
git commit -m "docs: add legacy ui gap inventory"
```

---

### Task 2: Draft Persistence Module

**Files:**
- Create: `desktop/src/runtime/desktopDraft.ts`
- Modify: `desktop/src/App.vue`
- Test: `desktop/src/runtime/desktopDraft.test.ts`

- [x] **Step 1: Write failing tests for draft persistence**

Create `desktop/src/runtime/desktopDraft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createDefaultDesktopDraft, sanitizeDesktopDraftForStorage, restoreDesktopDraft } from "./desktopDraft";

describe("desktop draft persistence", () => {
  it("does not persist API keys", () => {
    const draft = createDefaultDesktopDraft();
    draft.providerConfig.apiKey = "sk-secret";

    expect(sanitizeDesktopDraftForStorage(draft).providerConfig).not.toHaveProperty("apiKey");
  });

  it("restores a valid saved project and falls back to douyin when platforms are empty", () => {
    const restored = restoreDesktopDraft({
      project: {
        name: "测试项目",
        targetPlatforms: [],
        sourceVideoPath: "/tmp/source.mp4",
        voiceSamplePath: "/tmp/voice.wav",
        notes: "轻便",
      },
      providerConfig: {
        id: "main-ai",
        label: "主模型配置",
        provider: "openai",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4.1",
        enabled: true,
      },
    });

    expect(restored.project.name).toBe("测试项目");
    expect(restored.project.targetPlatforms).toEqual(["douyin"]);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm test -- desktop/src/runtime/desktopDraft.test.ts
```

Expected: FAIL because `desktopDraft.ts` does not exist.

- [x] **Step 3: Implement draft module**

Create `desktop/src/runtime/desktopDraft.ts`:

```ts
import {
  createApiKeyProviderConfig,
  createProjectDraft,
  type ApiKeyProviderConfig,
  type ProjectDraft,
  type PublishPlatform,
} from "@mirax/core";
import { SUPPORTED_PLATFORM_PROFILES } from "@mirax/provider-publish";

export const DESKTOP_DRAFT_STORAGE_KEY = "mirax-ai.desktop-draft.v1";

export interface DesktopDraft {
  project: ProjectDraft;
  providerConfig: ApiKeyProviderConfig;
}

export type PersistedDesktopDraft = {
  project: ProjectDraft;
  providerConfig: Omit<ApiKeyProviderConfig, "apiKey">;
};

export function createDefaultDesktopDraft(): DesktopDraft {
  return {
    project: createProjectDraft({
      name: "轻奢女包口播 0611",
      targetPlatforms: ["douyin", "xiaohongshu"],
      sourceVideoPath: "/素材/对标视频.mp4",
      voiceSamplePath: "/素材/声音样本.wav",
      notes: "强调通勤、大容量、上身质感。",
    }),
    providerConfig: createApiKeyProviderConfig({
      id: "main-ai",
      label: "主模型配置",
      provider: "openai",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4.1",
    }),
  };
}

export function sanitizeDesktopDraftForStorage(draft: DesktopDraft): PersistedDesktopDraft {
  return {
    project: {
      name: draft.project.name,
      sourceVideoPath: draft.project.sourceVideoPath,
      voiceSamplePath: draft.project.voiceSamplePath,
      targetPlatforms: draft.project.targetPlatforms,
      notes: draft.project.notes,
    },
    providerConfig: {
      id: draft.providerConfig.id,
      label: draft.providerConfig.label,
      provider: draft.providerConfig.provider,
      baseUrl: draft.providerConfig.baseUrl,
      model: draft.providerConfig.model,
      enabled: draft.providerConfig.enabled,
    },
  };
}

export function restoreDesktopDraft(saved: Partial<PersistedDesktopDraft> | undefined): DesktopDraft {
  const defaults = createDefaultDesktopDraft();

  if (!saved) {
    return defaults;
  }

  return {
    project: {
      ...defaults.project,
      ...saved.project,
      targetPlatforms: sanitizePlatforms(saved.project?.targetPlatforms),
    },
    providerConfig: {
      ...defaults.providerConfig,
      ...saved.providerConfig,
      apiKey: "",
    },
  };
}

function sanitizePlatforms(platforms: PublishPlatform[] | undefined): PublishPlatform[] {
  const allowed = new Set(SUPPORTED_PLATFORM_PROFILES.map((profile) => profile.id));
  const nextPlatforms = (platforms ?? []).filter((platform): platform is PublishPlatform => allowed.has(platform));
  return nextPlatforms.length > 0 ? nextPlatforms : ["douyin"];
}
```

- [x] **Step 4: Wire App.vue to module**

Modify `desktop/src/App.vue`:

```ts
import {
  DESKTOP_DRAFT_STORAGE_KEY,
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
} from "./runtime/desktopDraft";
```

Replace inline `STORAGE_KEY`, `SavedDesktopDraft`, `restoreDraft`, `persistDraft`, and `sanitizePlatforms` with calls to the module.

- [x] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm test -- desktop/src/runtime/desktopDraft.test.ts
pnpm typecheck
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add desktop/src/runtime/desktopDraft.ts desktop/src/runtime/desktopDraft.test.ts desktop/src/App.vue
git commit -m "refactor: extract desktop draft persistence"
```

---

### Task 3: Per-Card Status and Retry UX

**Files:**
- Create: `desktop/src/components/StatusBadge.vue`
- Modify: `desktop/src/App.vue`

- [x] **Step 1: Create status badge component**

Create `desktop/src/components/StatusBadge.vue`:

```vue
<script setup lang="ts">
import type { WorkflowStageStatus } from "@mirax/core";

const props = defineProps<{
  status: WorkflowStageStatus | undefined;
}>();

const labelMap: Record<WorkflowStageStatus, string> = {
  pending: "待执行",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
  skipped: "已跳过",
};
</script>

<template>
  <span class="status-badge" :class="props.status ?? 'pending'">
    {{ labelMap[props.status ?? "pending"] }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
  color: #cdd3e2;
  background: #30364b;
}
.running {
  color: #fff1d5;
  background: rgba(240, 162, 32, 0.2);
}
.completed {
  color: #ccffe7;
  background: rgba(47, 122, 93, 0.32);
}
.failed {
  color: #ffd4cf;
  background: rgba(177, 58, 42, 0.35);
}
.skipped {
  color: #c9d0dd;
}
</style>
```

- [x] **Step 2: Add badges to every card heading**

Modify `desktop/src/App.vue` so each numbered card heading includes:

```vue
<StatusBadge :status="stageStatus.transcribe" />
```

Use these mappings:

- `1. 学习对标` → `transcribe`
- `2. 改写文案` → `rewrite`
- `3. 声音生成` → `speech`
- `4. 视频生成` → `avatar`
- `5. 一键成片` → `compose`
- `6. 标题封面（用于发布）` → `review`
- `7. 视频发布` → `publish`

- [x] **Step 3: Add retry behavior**

Modify `processStage()` in `desktop/src/App.vue` so failed stages can be retried by setting that stage back to `pending` before processing:

```ts
function resetFailedStage(stageId: WorkflowStageId) {
  if (stageStatus.value[stageId] === "failed") {
    workflow.value = updateStageStatus(workflow.value, stageId, "pending");
  }
}
```

Call `resetFailedStage(stageId)` before setting `running`.

- [x] **Step 4: Browser verify**

Run:

```bash
pnpm --filter @mirax/desktop dev:web
```

Expected:

- Every card heading shows a status badge.
- Clicking `运行全部` updates badges to `已完成`.

- [x] **Step 5: Commit**

```bash
git add desktop/src/components/StatusBadge.vue desktop/src/App.vue
git commit -m "feat: add workflow status badges"
```

---

### Task 4: Path Picker and Tauri Fallback

**Files:**
- Create: `desktop/src/components/PathPickerButton.vue`
- Modify: `desktop/package.json`
- Modify: `desktop/src/App.vue`

- [x] **Step 1: Add dialog plugin dependency**

Run:

```bash
pnpm --filter @mirax/desktop add @tauri-apps/plugin-dialog
```

Expected: `desktop/package.json` includes `@tauri-apps/plugin-dialog`.

- [x] **Step 2: Create PathPickerButton**

Create `desktop/src/components/PathPickerButton.vue`:

```vue
<script setup lang="ts">
import { FolderOpen } from "lucide-vue-next";

const props = defineProps<{
  label: string;
  value?: string;
  filters?: { name: string; extensions: string[] }[];
}>();

const emit = defineEmits<{
  selected: [path: string];
}>();

async function pickPath() {
  try {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const selected = await dialog.open({
      multiple: false,
      filters: props.filters,
    });

    if (typeof selected === "string") {
      emit("selected", selected);
      return;
    }
  } catch {
    const fallback = window.prompt(props.label, props.value ?? "");
    if (fallback !== null) {
      emit("selected", fallback.trim());
    }
  }
}
</script>

<template>
  <button type="button" :aria-label="label" @click="pickPath">
    <FolderOpen :size="16" />
  </button>
</template>
```

- [x] **Step 3: Replace prompt-only buttons**

Modify `desktop/src/App.vue`:

```vue
<PathPickerButton
  label="选择对标视频"
  :value="project.sourceVideoPath"
  :filters="[{ name: 'Video', extensions: ['mp4', 'mov', 'm4v'] }]"
  @selected="project.sourceVideoPath = $event"
/>
```

Use a similar button for `voiceSamplePath` with `wav`, `mp3`, `m4a`.

- [x] **Step 4: Verify**

Run:

```bash
pnpm typecheck
pnpm --filter @mirax/desktop build
```

Expected: PASS. In browser dev mode, fallback prompt still works. In Tauri app, system picker opens.

- [x] **Step 5: Commit**

```bash
git add desktop/package.json pnpm-lock.yaml desktop/src/components/PathPickerButton.vue desktop/src/App.vue
git commit -m "feat: add desktop path picker"
```

---

### Task 5: Provider Connection Test

**Files:**
- Create: `packages/provider-ai/src/connectionTest.ts`
- Create: `packages/provider-ai/tests/connection-test.test.ts`
- Modify: `packages/provider-ai/src/index.ts`
- Modify: `desktop/src/App.vue`

- [x] **Step 1: Write connection tests**

Create `packages/provider-ai/tests/connection-test.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { testAiProviderConnection } from "../src/index";

describe("ai provider connection test", () => {
  it("returns success for mock mode", async () => {
    await expect(testAiProviderConnection({ mode: "mock" })).resolves.toEqual({
      ok: true,
      message: "Mock Provider 可用",
    });
  });

  it("returns unwired state for openai-compatible mode", async () => {
    await expect(
      testAiProviderConnection({
        mode: "openai-compatible",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-demo",
        model: "gpt-4.1",
      }),
    ).resolves.toEqual({
      ok: false,
      message: "OpenAI-compatible provider 尚未接入，MVP 请使用 Mock Provider。",
    });
  });
});
```

- [x] **Step 2: Implement connectionTest**

Create `packages/provider-ai/src/connectionTest.ts`:

```ts
export type AiConnectionTestInput =
  | { mode: "mock" }
  | {
      mode: "openai-compatible";
      baseUrl: string;
      apiKey: string;
      model: string;
    };

export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
}

export async function testAiProviderConnection(input: AiConnectionTestInput): Promise<AiConnectionTestResult> {
  if (input.mode === "mock") {
    return { ok: true, message: "Mock Provider 可用" };
  }

  return {
    ok: false,
    message: "OpenAI-compatible provider 尚未接入，MVP 请使用 Mock Provider。",
  };
}
```

- [x] **Step 3: Export function**

Modify `packages/provider-ai/src/index.ts`:

```ts
export * from "./connectionTest.js";
```

- [x] **Step 4: Wire UI button**

Modify `desktop/src/App.vue` settings card to include:

```vue
<button class="secondary" @click="testConnection">测试连接</button>
<span class="connection-message">{{ connectionMessage }}</span>
```

Add script:

```ts
const connectionMessage = ref("未测试");

async function testConnection() {
  connectionMessage.value = "检测中…";

  const input =
    providerConfig.provider === "openai"
      ? {
          mode: "openai-compatible" as const,
          baseUrl: providerConfig.baseUrl ?? "",
          apiKey: providerConfig.apiKey,
          model: providerConfig.model ?? "",
        }
      : ({ mode: "mock" } as const);

  const result = await testAiProviderConnection(input);
  connectionMessage.value = result.message;
}
```

- [x] **Step 5: Verify**

Run:

```bash
pnpm test -- packages/provider-ai/tests/connection-test.test.ts
pnpm typecheck
```

Expected: PASS.

- [x] **Step 6: Commit**

```bash
git add packages/provider-ai/src/connectionTest.ts packages/provider-ai/src/index.ts packages/provider-ai/tests/connection-test.test.ts desktop/src/App.vue
git commit -m "feat: add provider connection test"
```

---

### Task 6: Dependency Checklist Panel

**Files:**
- Create: `desktop/src/components/DependencyChecklist.vue`
- Modify: `desktop/src/App.vue`
- Modify: `docs/reverse-engineering/demo-video-coverage.md`

- [x] **Step 1: Create component**

Create `desktop/src/components/DependencyChecklist.vue`:

```vue
<script setup lang="ts">
import { checkSidecarDependencies } from "@mirax/sidecar-manager";

const results = checkSidecarDependencies({
  ffmpegPath: "",
  hasPlaywrightBrowser: false,
  pythonServiceUrl: "",
  heygemServiceUrl: "",
  cosyVoiceServiceUrl: "",
});
</script>

<template>
  <div class="dependency-list">
    <div v-for="result in results" :key="result.key" :class="{ ok: result.ok }">
      <strong>{{ result.key }}</strong>
      <span>{{ result.message }}</span>
    </div>
  </div>
</template>
```

- [x] **Step 2: Add component styles**

Add to `desktop/src/styles.css`:

```css
.dependency-list {
  display: grid;
  gap: 8px;
  padding: 0 12px 12px;
}
.dependency-list div {
  display: grid;
  gap: 4px;
  border: 1px solid #3b4258;
  border-radius: 6px;
  padding: 8px;
  background: #202536;
}
.dependency-list .ok {
  border-color: rgba(47, 122, 93, 0.72);
}
.dependency-list span {
  color: #aeb5c7;
  font-size: 12px;
}
```

- [x] **Step 3: Add to settings card**

Modify `desktop/src/App.vue` settings card:

```vue
<DependencyChecklist />
```

- [x] **Step 4: Verify**

Run:

```bash
pnpm typecheck
pnpm --filter @mirax/desktop build:web
```

Expected: PASS, settings card displays dependency messages.

- [x] **Step 5: Commit**

```bash
git add desktop/src/components/DependencyChecklist.vue desktop/src/App.vue desktop/src/styles.css docs/reverse-engineering/demo-video-coverage.md
git commit -m "feat: show dependency checklist"
```

---

### Task 7: Publish Confirmation and Task History

**Files:**
- Create: `desktop/src/features/task-center/taskHistory.ts`
- Create: `desktop/src/features/task-center/taskHistory.test.ts`
- Modify: `desktop/src/App.vue`

- [x] **Step 1: Write task history tests**

Create `desktop/src/features/task-center/taskHistory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createPublishHistoryItem, listLatestHistoryItems } from "./taskHistory";

describe("task history", () => {
  it("creates publish history item with stable task ids", () => {
    const item = createPublishHistoryItem({
      projectId: "demo-project",
      taskIds: ["mock-publish-demo-project-douyin"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin"],
    });

    expect(item.title).toBe("发布任务 demo-project");
    expect(item.status).toBe("success");
  });

  it("lists newest items first", () => {
    const first = createPublishHistoryItem({
      projectId: "a",
      taskIds: ["a-1"],
      videoPath: "/tmp/a.mp4",
      platforms: ["douyin"],
      createdAt: "2026-06-12T00:00:00.000Z",
    });
    const second = createPublishHistoryItem({
      projectId: "b",
      taskIds: ["b-1"],
      videoPath: "/tmp/b.mp4",
      platforms: ["xiaohongshu"],
      createdAt: "2026-06-12T01:00:00.000Z",
    });

    expect(listLatestHistoryItems([first, second])[0].projectId).toBe("b");
  });
});
```

- [x] **Step 2: Implement task history**

Create `desktop/src/features/task-center/taskHistory.ts`:

```ts
import type { PublishPlatform } from "@mirax/core";

export interface PublishHistoryItem {
  id: string;
  projectId: string;
  title: string;
  taskIds: string[];
  videoPath: string;
  platforms: PublishPlatform[];
  status: "success" | "failed";
  createdAt: string;
}

export function createPublishHistoryItem(input: {
  projectId: string;
  taskIds: string[];
  videoPath: string;
  platforms: PublishPlatform[];
  createdAt?: string;
}): PublishHistoryItem {
  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    id: `${input.projectId}-${createdAt}`,
    projectId: input.projectId,
    title: `发布任务 ${input.projectId}`,
    taskIds: input.taskIds,
    videoPath: input.videoPath,
    platforms: input.platforms,
    status: "success",
    createdAt,
  };
}

export function listLatestHistoryItems(items: PublishHistoryItem[]): PublishHistoryItem[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
```

- [x] **Step 3: Add publish confirmation**

Modify `desktop/src/App.vue` publish branch:

```ts
const confirmed = window.confirm(`确认创建 ${project.targetPlatforms.length} 个草稿发布任务？`);
if (!confirmed) {
  return "已取消发布";
}
```

When publish succeeds, push `createPublishHistoryItem(...)` into `taskHistory`.

- [x] **Step 4: Show task history card**

Modify `desktop/src/App.vue` log card to include latest 5 publish history items under execution logs.

- [x] **Step 5: Verify**

Run:

```bash
pnpm test -- desktop/src/features/task-center/taskHistory.test.ts
pnpm typecheck
```

Browser expected: clicking publish asks for confirmation; confirming creates a task history item.

- [x] **Step 6: Commit**

```bash
git add desktop/src/features/task-center/taskHistory.ts desktop/src/features/task-center/taskHistory.test.ts desktop/src/App.vue
git commit -m "feat: add publish confirmation and task history"
```

---

### Task 8: Final Release Verification and Progress Update

**Files:**
- Modify: `docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md`
- Modify: `docs/reverse-engineering/demo-video-coverage.md`

- [x] **Step 1: Run complete verification**

Run:

```bash
pnpm lint
pnpm test
pnpm typecheck
pnpm build
```

Expected:

- All commands exit code 0.
- Vitest reports all test files pass.
- Tauri outputs `Mirax AI.app`.

- [x] **Step 2: Run browser workflow verification**

Run:

```bash
pnpm --filter @mirax/desktop dev:web
```

In browser:

- Click `运行全部`.
- Verify progress `100% / 8/8`.
- Verify badges are all `已完成`.
- Verify task history contains the mock publish task.
- Verify dependency checklist displays five rows.
- Verify refreshing page restores draft fields.

- [x] **Step 3: Run release binary smoke test**

Run:

```bash
"desktop/src-tauri/target/release/mirax-ai-desktop"
```

Expected: process remains alive for at least 3 seconds and does not print a panic.

- [x] **Step 4: Update progress checkboxes**

Modify this plan so completed tasks use `[x]`. Keep unfinished future tasks as `[ ]`.

- [ ] **Step 5: Commit final progress**

```bash
git add docs/superpowers/plans/2026-06-12-mirax-first-usable-release.md docs/reverse-engineering/demo-video-coverage.md
git commit -m "docs: record first usable release progress"
```

---

## Self-Review

Spec coverage:

- 旧版首页 7 模块布局：covered by current implementation and Task 3.
- 用户可试用路径：covered by Tasks 2, 4, 7, and 8.
- Provider 配置和连接测试：covered by Task 5.
- 本地服务依赖提示：covered by Task 6.
- 发布准备和任务中心：covered by Task 7.
- 完整验收和进度记录：covered by Task 8.

Known gaps intentionally left for the next implementation plan:

- Real OpenAI-compatible provider request execution.
- Real FFmpeg media render.
- Real Playwright platform upload.
- Real SQLite encrypted credential persistence.
- Separate routes for声音管理、形象管理、素材管理、账号管理.
