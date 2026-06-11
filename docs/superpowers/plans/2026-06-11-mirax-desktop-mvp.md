# Mirax Desktop MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first desktop MVP that reproduces the visible demo-video workflow from content import through script rewrite, avatar/voice selection, video preview, publish metadata, account selection, and publish handoff.

**Architecture:** Use a pnpm monorepo with a Tauri 2 + Vue 3 desktop app and TypeScript shared packages. Start with deterministic mock providers so the full workflow is usable immediately, then replace individual adapters with real AI, FFmpeg, local sidecar, and Playwright implementations.

**Tech Stack:** Tauri 2, Vue 3, TypeScript, pnpm workspaces, Vitest, SQLite-ready repository interfaces, FFmpeg sidecar abstraction, Playwright publish adapter abstraction.

---

## Scope

This plan implements the first rebuild milestone. It does not bundle Whisper, CosyVoice, HeyGem, or a full platform publishing bot yet. It creates the project foundation, UI workflow, core domain contracts, mockable execution pipeline, and adapter seams needed to replace mocks with real services.

Primary references:

- `docs/superpowers/specs/2026-06-11-mirax-desktop-rebuild-design.md`
- `docs/reverse-engineering/demo-video-timeline.md`

## Target File Structure

```text
apps/
  desktop/
    package.json
    index.html
    src/
      main.ts
      App.vue
      routes.ts
      styles/
        tokens.css
        app.css
      components/
        AppShell.vue
        WorkflowStepper.vue
        VideoPreview.vue
        StatusPill.vue
      features/
        workspace/
          WorkspaceView.vue
          ContentImportPanel.vue
          RewritePanel.vue
          VoiceAvatarPanel.vue
          VideoGenerationPanel.vue
          PublishMetadataPanel.vue
          PublishAccountsPanel.vue
        settings/
          ProviderSettingsView.vue
      stores/
        workflowStore.ts
        providerStore.ts
    src-tauri/
      Cargo.toml
      tauri.conf.json
      src/
        main.rs
packages/
  core/
    package.json
    src/
      index.ts
      domain.ts
      workflow.ts
      providers.ts
      fixtures.ts
      validation.ts
    tests/
      workflow.test.ts
      validation.test.ts
  provider-ai/
    package.json
    src/
      index.ts
      mockProvider.ts
      openAiCompatibleProvider.ts
    tests/
      mockProvider.test.ts
  media-pipeline/
    package.json
    src/
      index.ts
      ffmpegCommands.ts
      mockRenderer.ts
    tests/
      ffmpegCommands.test.ts
  provider-publish/
    package.json
    src/
      index.ts
      mockPublisher.ts
      platformProfiles.ts
    tests/
      mockPublisher.test.ts
package.json
pnpm-workspace.yaml
tsconfig.base.json
vitest.config.ts
README.md
```

## Validation Commands

Use these commands as the baseline verification suite once the scaffold exists:

```bash
pnpm install
pnpm lint
pnpm test
pnpm --filter @mirax/desktop tauri dev
pnpm --filter @mirax/desktop tauri build
```

If Tauri prerequisites are missing on the machine, record the blocker and still run:

```bash
pnpm test
pnpm --filter @mirax/desktop build
```

---

## Task 1: Monorepo Scaffold

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Create workspace package metadata**

Create `package.json`:

```json
{
  "name": "mirax-ai",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "lint": "pnpm -r lint",
    "test": "vitest run",
    "typecheck": "pnpm -r typecheck",
    "build": "pnpm -r build"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Create workspace layout**

Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 3: Create shared TypeScript config**

Create `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "paths": {
      "@mirax/core": ["packages/core/src/index.ts"],
      "@mirax/provider-ai": ["packages/provider-ai/src/index.ts"],
      "@mirax/media-pipeline": ["packages/media-pipeline/src/index.ts"],
      "@mirax/provider-publish": ["packages/provider-publish/src/index.ts"]
    }
  }
}
```

- [ ] **Step 4: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node"
  }
});
```

- [ ] **Step 5: Create project README**

Create `README.md` with:

```md
# Mirax AI

Mirax AI is a desktop-first rebuild of the original 轻语IP智能体 workflow.

The first milestone focuses on the visible demo-video workflow:

1. Import or extract benchmark content.
2. Rewrite scripts with user-configured AI providers.
3. Select voice and digital human assets.
4. Generate a vertical talking-head video preview.
5. Prepare title, cover, description, tags, and topics.
6. Select publish accounts and hand off to platform publishing.

Large reverse-engineering inputs such as DMG files, videos, extracted ASAR files, and generated frames are intentionally ignored by git.
```

- [ ] **Step 6: Verify scaffold metadata**

Run:

```bash
pnpm install
pnpm test
```

Expected:

- `pnpm install` completes.
- `pnpm test` reports no tests found or passes after package tests are added in later tasks.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json vitest.config.ts README.md .gitignore
git commit -m "chore: scaffold workspace"
```

---

## Task 2: Core Domain Package

**Files:**

- Create: `packages/core/package.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/domain.ts`
- Create: `packages/core/src/workflow.ts`
- Create: `packages/core/src/providers.ts`
- Create: `packages/core/src/fixtures.ts`
- Create: `packages/core/src/validation.ts`
- Create: `packages/core/tests/workflow.test.ts`
- Create: `packages/core/tests/validation.test.ts`

- [ ] **Step 1: Create package metadata**

Create `packages/core/package.json`:

```json
{
  "name": "@mirax/core",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

Create `packages/core/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 2: Define domain models**

Create `packages/core/src/domain.ts`:

```ts
export type ProviderKind = "ai" | "speech" | "avatar" | "publish";

export type PublishPlatform = "douyin" | "xiaohongshu" | "wechat_channels" | "kuaishou";

export type WorkflowStep =
  | "content_import"
  | "rewrite"
  | "voice_avatar"
  | "video_generation"
  | "publish_metadata"
  | "publish_accounts"
  | "publish_handoff";

export type TaskStatus = "idle" | "running" | "success" | "error";

export interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  vendor: string;
  displayName: string;
  model?: string;
  baseUrl?: string;
  enabled: boolean;
  credentialRef?: string;
}

export interface ContentDraft {
  id: string;
  sourceUrl: string;
  extractedText: string;
  rewrittenText: string;
  title: string;
  description: string;
  tags: string[];
  topics: string[];
}

export interface VoiceProfile {
  id: string;
  name: string;
  providerId: string;
  promptAudioPath?: string;
  speed: number;
  emotion?: string;
}

export interface DigitalHumanAsset {
  id: string;
  name: string;
  sourceVideoPath: string;
  coverPath?: string;
  providerId: string;
  modelVersion?: string;
}

export interface VideoProject {
  id: string;
  draftId: string;
  voiceId?: string;
  avatarId?: string;
  templateId?: string;
  generatedAudioPath?: string;
  generatedVideoPath?: string;
  coverPath?: string;
}

export interface PublishAccount {
  id: string;
  platform: PublishPlatform;
  accountName: string;
  displayName: string;
  status: "inactive" | "active" | "expired";
  lastLoginAt?: string;
}

export interface PublishTask {
  id: string;
  videoProjectId: string;
  accountIds: string[];
  mode: "direct" | "draft";
  autoCloseBrowser: boolean;
  status: TaskStatus;
}

export interface WorkflowState {
  currentStep: WorkflowStep;
  status: TaskStatus;
  draft: ContentDraft;
  videoProject: VideoProject;
  publishTask: PublishTask;
  logs: string[];
}
```

- [ ] **Step 3: Define provider contracts**

Create `packages/core/src/providers.ts`:

```ts
import type {
  ContentDraft,
  DigitalHumanAsset,
  ProviderConfig,
  PublishAccount,
  PublishTask,
  VideoProject,
  VoiceProfile
} from "./domain";

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface AiProvider {
  config: ProviderConfig;
  testConnection(): Promise<ConnectionTestResult>;
  rewrite(input: { sourceText: string; instruction?: string }): Promise<string>;
  generatePublishMetadata(input: { script: string }): Promise<{
    title: string;
    description: string;
    tags: string[];
    topics: string[];
  }>;
}

export interface SpeechProvider {
  synthesize(input: {
    text: string;
    voice: VoiceProfile;
    outputPath: string;
  }): Promise<{ audioPath: string }>;
}

export interface AvatarProvider {
  generate(input: {
    audioPath: string;
    avatar: DigitalHumanAsset;
    outputDir: string;
  }): Promise<{ videoPath: string }>;
}

export interface MediaRenderer {
  render(input: {
    draft: ContentDraft;
    project: VideoProject;
  }): Promise<{ videoPath: string; coverPath: string }>;
}

export interface PublishProvider {
  listAccounts(): Promise<PublishAccount[]>;
  publish(task: PublishTask): Promise<{ success: boolean; message: string }>;
}
```

- [ ] **Step 4: Implement workflow helpers**

Create `packages/core/src/workflow.ts`:

```ts
import type { TaskStatus, WorkflowState, WorkflowStep } from "./domain";

export const workflowSteps: WorkflowStep[] = [
  "content_import",
  "rewrite",
  "voice_avatar",
  "video_generation",
  "publish_metadata",
  "publish_accounts",
  "publish_handoff"
];

export function nextStep(current: WorkflowStep): WorkflowStep {
  const index = workflowSteps.indexOf(current);
  return workflowSteps[Math.min(index + 1, workflowSteps.length - 1)];
}

export function updateWorkflowStatus(state: WorkflowState, status: TaskStatus, log: string): WorkflowState {
  return {
    ...state,
    status,
    logs: [...state.logs, log]
  };
}
```

- [ ] **Step 5: Add fixtures and validation**

Create `packages/core/src/fixtures.ts` with deterministic sample draft, avatar, voice, accounts, and workflow state.

Create `packages/core/src/validation.ts`:

```ts
import type { ContentDraft, PublishTask } from "./domain";

export function validateSourceUrl(url: string): string | null {
  if (!url.trim()) return "请输入视频链接";
  if (!/^https?:\/\//.test(url)) return "视频链接必须以 http:// 或 https:// 开头";
  return null;
}

export function canRewrite(draft: ContentDraft): boolean {
  return draft.extractedText.trim().length > 0;
}

export function canPublish(task: PublishTask, videoPath?: string): boolean {
  return Boolean(videoPath) && task.accountIds.length > 0;
}
```

Create `packages/core/src/index.ts`:

```ts
export * from "./domain";
export * from "./providers";
export * from "./workflow";
export * from "./fixtures";
export * from "./validation";
```

- [ ] **Step 6: Add tests**

Create tests that verify:

- `nextStep("content_import")` returns `"rewrite"`.
- `nextStep("publish_handoff")` remains `"publish_handoff"`.
- invalid URLs return a Chinese validation message.
- publish requires both a video path and at least one account.

- [ ] **Step 7: Run tests**

```bash
pnpm test packages/core
```

Expected: core tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/core
git commit -m "feat: add core workflow domain"
```

---

## Task 3: Mock Providers

**Files:**

- Create: `packages/provider-ai/package.json`
- Create: `packages/provider-ai/src/index.ts`
- Create: `packages/provider-ai/src/mockProvider.ts`
- Create: `packages/provider-ai/src/openAiCompatibleProvider.ts`
- Create: `packages/provider-ai/tests/mockProvider.test.ts`
- Create: `packages/media-pipeline/package.json`
- Create: `packages/media-pipeline/src/index.ts`
- Create: `packages/media-pipeline/src/ffmpegCommands.ts`
- Create: `packages/media-pipeline/src/mockRenderer.ts`
- Create: `packages/media-pipeline/tests/ffmpegCommands.test.ts`
- Create: `packages/provider-publish/package.json`
- Create: `packages/provider-publish/src/index.ts`
- Create: `packages/provider-publish/src/mockPublisher.ts`
- Create: `packages/provider-publish/src/platformProfiles.ts`
- Create: `packages/provider-publish/tests/mockPublisher.test.ts`

- [ ] **Step 1: Implement mock AI provider**

`MockAiProvider.rewrite()` should prepend a deterministic prefix and preserve source meaning:

```ts
return `【仿写版本】${input.sourceText.slice(0, 280)}`;
```

`generatePublishMetadata()` should return title, description, tags, and topics.

- [ ] **Step 2: Add OpenAI-compatible unwired adapter**

Create an adapter class that accepts `baseUrl`, `apiKey`, and `model`, but throws this explicit error until the real integration branch wires it:

```ts
throw new Error("OpenAI-compatible provider is not wired yet. Use MockAiProvider in MVP.");
```

- [ ] **Step 3: Implement FFmpeg command builder**

Create pure functions:

```ts
export function buildExtractAudioCommand(inputPath: string, outputPath: string): string[];
export function buildVerticalComposeCommand(inputVideo: string, subtitleFile: string, outputPath: string): string[];
```

Tests should assert argument order and paths.

- [ ] **Step 4: Implement mock renderer**

`MockMediaRenderer.render()` should return stable fake output paths:

```ts
{
  videoPath: "/tmp/mirax/output/demo-video.mp4",
  coverPath: "/tmp/mirax/output/demo-cover.png"
}
```

- [ ] **Step 5: Implement platform profiles**

Create supported platform metadata for:

- Douyin
- Xiaohongshu
- WeChat Channels
- Kuaishou

Each profile includes `platform`, `displayName`, `color`, `loginUrl`, and `publishUrl`.

- [ ] **Step 6: Implement mock publisher**

`MockPublishProvider.publish()` should return success when account IDs exist and failure otherwise.

- [ ] **Step 7: Run tests**

```bash
pnpm test packages/provider-ai packages/media-pipeline packages/provider-publish
```

Expected: provider tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/provider-ai packages/media-pipeline packages/provider-publish
git commit -m "feat: add mock providers"
```

---

## Task 4: Desktop App Scaffold

**Files:**

- Create: `apps/desktop/package.json`
- Create: `apps/desktop/index.html`
- Create: `apps/desktop/src/main.ts`
- Create: `apps/desktop/src/App.vue`
- Create: `apps/desktop/src/routes.ts`
- Create: `apps/desktop/src/styles/tokens.css`
- Create: `apps/desktop/src/styles/app.css`
- Create: `apps/desktop/src-tauri/Cargo.toml`
- Create: `apps/desktop/src-tauri/tauri.conf.json`
- Create: `apps/desktop/src-tauri/src/main.rs`

- [ ] **Step 1: Create Vue/Tauri package metadata**

Use Vite Vue with local workspace dependencies:

```json
{
  "name": "@mirax/desktop",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "typecheck": "vue-tsc --noEmit",
    "lint": "vue-tsc --noEmit",
    "tauri": "tauri"
  },
  "dependencies": {
    "@mirax/core": "workspace:*",
    "@mirax/provider-ai": "workspace:*",
    "@mirax/media-pipeline": "workspace:*",
    "@mirax/provider-publish": "workspace:*",
    "@tauri-apps/api": "^2.2.0",
    "ant-design-vue": "^4.2.6",
    "pinia": "^2.3.0",
    "vue": "^3.5.13",
    "vue-router": "^4.5.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.2.0",
    "@vitejs/plugin-vue": "^5.2.1",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vue-tsc": "^2.2.0"
  }
}
```

- [ ] **Step 2: Create Tauri config**

Set product name `Mirax AI`, identifier `com.chiuryu.miraxai`, and dev URL `http://localhost:5173`.

- [ ] **Step 3: Create app shell**

`App.vue` should render:

- Dark sidebar navigation.
- Header with workflow title.
- Main workspace route.
- Settings route that renders `ProviderSettingsView.vue`.

- [ ] **Step 4: Create visual tokens**

Use a restrained dark operations palette with purple accents, but avoid a one-note purple UI by including slate, cyan, amber, and neutral surfaces.

- [ ] **Step 5: Run desktop build**

```bash
pnpm --filter @mirax/desktop build
```

Expected: Vue app builds.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop
git commit -m "feat: scaffold desktop app"
```

---

## Task 5: Workflow Store and Workspace UI

**Files:**

- Create: `apps/desktop/src/stores/workflowStore.ts`
- Create: `apps/desktop/src/stores/providerStore.ts`
- Create: `apps/desktop/src/components/AppShell.vue`
- Create: `apps/desktop/src/components/WorkflowStepper.vue`
- Create: `apps/desktop/src/components/VideoPreview.vue`
- Create: `apps/desktop/src/components/StatusPill.vue`
- Create: `apps/desktop/src/features/workspace/WorkspaceView.vue`
- Create: all workspace panel components listed in the target structure.

- [ ] **Step 1: Implement workflow store**

State includes:

- `sourceUrl`
- `extractedText`
- `rewrittenText`
- selected voice
- selected avatar
- selected template
- generated video path
- cover path
- publish metadata
- selected accounts
- current step
- status and logs

- [ ] **Step 2: Wire mock workflow actions**

Actions:

- `extractContent()`: validates URL and fills deterministic extracted text.
- `rewriteContent()`: calls `MockAiProvider`.
- `generateVideo()`: calls `MockMediaRenderer`.
- `generateMetadata()`: calls `MockAiProvider.generatePublishMetadata`.
- `publish()`: calls `MockPublishProvider`.

- [ ] **Step 3: Build workspace panels**

Panels must match the demo-video workflow:

- Content import panel.
- Rewrite panel.
- Voice/avatar panel.
- Video generation panel.
- Publish metadata panel.
- Publish accounts panel.

- [ ] **Step 4: Build preview rail**

Right-side preview area shows:

- Vertical video frame.
- Generated cover.
- Current output status.
- Selected template summary.

- [ ] **Step 5: Run app**

```bash
pnpm --filter @mirax/desktop dev
```

Expected:

- User can paste a URL.
- User can extract mock text.
- User can rewrite text.
- User can select voice/avatar/template.
- User can generate mock output paths.
- User can generate publish metadata.
- User can select accounts and run mock publish.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src
git commit -m "feat: build desktop workflow UI"
```

---

## Task 6: Provider Settings UI

**Files:**

- Create: `apps/desktop/src/features/settings/ProviderSettingsView.vue`
- Modify: `apps/desktop/src/stores/providerStore.ts`
- Modify: `apps/desktop/src/routes.ts`

- [ ] **Step 1: Add provider forms**

Create forms for:

- OpenAI
- DeepSeek
- Anthropic
- Gemini
- 通义千问 / 阿里云百炼
- 硅基流动
- 自定义 OpenAI 兼容

Each form has:

- Enabled switch.
- API Key field.
- Model field.
- Base URL field where applicable.
- Test connection button.

- [ ] **Step 2: Store provider configs locally in memory**

For MVP, store in Pinia only. Do not persist secrets until encrypted local-store is implemented.

- [ ] **Step 3: Add connection-test behavior**

Mock provider returns success. Unwired real providers show clear “未接入” state.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/features/settings apps/desktop/src/stores/providerStore.ts apps/desktop/src/routes.ts
git commit -m "feat: add provider settings UI"
```

---

## Task 7: Local Store Design Stub

**Files:**

- Create: `packages/local-store/package.json`
- Create: `packages/local-store/src/index.ts`
- Create: `packages/local-store/src/repositories.ts`
- Create: `packages/local-store/src/schema.ts`
- Create: `packages/local-store/tests/schema.test.ts`

- [ ] **Step 1: Define repository interfaces**

Interfaces:

- `ProviderConfigRepository`
- `ContentDraftRepository`
- `VideoProjectRepository`
- `PublishAccountRepository`
- `WorkflowTaskRepository`

- [ ] **Step 2: Define SQLite schema strings**

Export SQL migration strings for the core entities. Do not wire native SQLite yet.

- [ ] **Step 3: Test schema coverage**

Test that migration contains required table names:

- `provider_configs`
- `content_drafts`
- `video_projects`
- `publish_accounts`
- `workflow_tasks`

- [ ] **Step 4: Commit**

```bash
git add packages/local-store
git commit -m "feat: define local store schema"
```

---

## Task 8: Sidecar Manager Design Stub

**Files:**

- Create: `packages/sidecar-manager/package.json`
- Create: `packages/sidecar-manager/src/index.ts`
- Create: `packages/sidecar-manager/src/serviceStatus.ts`
- Create: `packages/sidecar-manager/src/dependencyChecks.ts`
- Create: `packages/sidecar-manager/tests/dependencyChecks.test.ts`

- [ ] **Step 1: Define service statuses**

Statuses:

- `missing`
- `stopped`
- `starting`
- `running`
- `error`

- [ ] **Step 2: Define dependency checks**

Checks for:

- FFmpeg path.
- Playwright browser availability.
- Python service URL.
- HeyGem service URL.
- CosyVoice service URL.

- [ ] **Step 3: Add pure tests**

Test that missing paths produce actionable Chinese messages.

- [ ] **Step 4: Commit**

```bash
git add packages/sidecar-manager
git commit -m "feat: define sidecar dependency checks"
```

---

## Task 9: Desktop Verification Pass

**Files:**

- Modify as needed based on failures.
- Create: `docs/reverse-engineering/demo-video-coverage.md`

- [ ] **Step 1: Run full checks**

```bash
pnpm lint
pnpm test
pnpm --filter @mirax/desktop build
```

Expected: all pass.

- [ ] **Step 2: Run desktop app**

```bash
pnpm --filter @mirax/desktop dev
```

Expected: app opens in browser dev mode and the mock workflow completes.

- [ ] **Step 3: Create coverage matrix**

Create `docs/reverse-engineering/demo-video-coverage.md` mapping each timeline row to the implemented UI panel or mock action.

- [ ] **Step 4: Commit**

```bash
git add docs/reverse-engineering/demo-video-coverage.md
git commit -m "docs: add demo coverage matrix"
```

---

## Task 10: Integration Decision Point

After Task 9 passes, choose the next implementation branch:

1. Real LLM provider and encrypted local settings.
2. Real FFmpeg render pipeline.
3. Real Playwright account login and publish handoff.
4. Python sidecar adapter for local Whisper/CosyVoice/HeyGem services.

Recommended next branch: real LLM provider and encrypted local settings. It unlocks real script rewrite and metadata generation without requiring heavy media dependencies.

## Plan Self-Review

Spec coverage:

- Demo workflow pages are covered by Tasks 4, 5, 6, and 9.
- Provider architecture is covered by Tasks 2, 3, 6, 7, and 8.
- Local service strategy is covered by Task 8.
- FFmpeg path begins with Task 3 and is ready for a later real adapter.
- Publish flow begins with Task 3 and Task 5, then awaits a real Playwright branch.

Known intentional gaps:

- Real Whisper, CosyVoice, HeyGem, and Playwright publishing are not implemented in this MVP plan.
- The first milestone uses mock outputs so UI and workflow can be validated quickly.
- Tauri build may require local Rust/Tauri prerequisites; if missing, document the blocker and continue with Vue build and package tests.
