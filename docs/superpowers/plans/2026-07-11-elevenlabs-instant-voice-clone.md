# ElevenLabs Instant Voice Clone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Workbench 第 3 阶段以用户自配 ElevenLabs API 安全创建项目级 Instant Voice Clone，并让第 4 阶段稳定复用该项目 Voice ID。

**Architecture:** 原始样本只在当前会话中保留到被原生层安全复制进用户选择的托管根目录；SQLite 保存根目录、托管样本、项目克隆状态和远端 Voice ID。克隆生命周期由一个桌面端协调器维护，先创建本地记录、再创建远端 Voice、先持久化远端检查点、最后原子替换项目 active 绑定。speech 只能经 resolver 取得项目克隆 Voice 或该项目无克隆记录时的 Provider 默认 Voice。

**Tech Stack:** pnpm monorepo、TypeScript、Vue 3、Vitest、Tauri 2/Rust、`@tauri-apps/plugin-sql`、ElevenLabs REST API。

## Global Constraints

- 范围仅为 ElevenLabs Instant Voice Clone（路线 A）；`cosyvoice` 配置数据保留，但不得成为 real voice-clone fallback 或发起其自定义 endpoint 请求。
- 只允许用户克隆本人或取得明确授权的声音；授权复选框默认不选中。未授权时不得复制、读取、上传或创建远端 Voice。
- API Key 仅通过既有 `provider_secrets` 加载到内存；不得写入 draft、snapshot、日志、任务 payload、fixture 或错误 message。
- 原始样本绝对路径不得进入 `ProjectDraft`、desktop snapshot、localStorage、SQLite 样本记录或错误 message；SQLite 只保存 `storage_root_id + relative_path`。
- real voice-clone 是 SQLite 硬依赖。数据库、当前根目录或根目录可写性不可用时，停止操作；不得回退 localStorage、`audioOutput`、临时目录或 mock。
- 一个项目最多一条 `active` 克隆记录。必须以 `CREATE UNIQUE INDEX IF NOT EXISTS ... WHERE state = 'active'` 实现，并以同一 SQLite 事务先将旧记录设为 `replaced`，再将新记录设为 `active`。
- 远端响应 Voice ID 后，必须先单独持久化 `remote-created` 检查点，再尝试 active 替换。检查点失败时只做当前进程的最佳努力远端删除，并显示 `remote-outcome-unrecorded`；不得伪造可恢复状态。
- `pending-verification`、`remote-created`、`remote-cleanup-required`、`failed`、`replaced`、`removed` 均不得被 speech resolver 选中。
- IVC 使用 `POST https://api.elevenlabs.io/v1/voices/add` 的 multipart 请求，成功响应读取 `voice_id` 和 `requires_verification`；补偿/用户明确删除使用 `DELETE /v1/voices/{voice_id}`。发送请求时不得手动覆盖 multipart boundary 的 `Content-Type`。以官方文档为准：[Create IVC voice](https://elevenlabs.io/docs/api-reference/voices/ivc/create)、[Delete voice](https://elevenlabs.io/docs/api-reference/voices/delete)。
- 首版一次克隆仅上传一个托管样本，允许扩展名为 `wav`、`mp3`、`m4a`、`flac`、`aac`，上限为 25 MiB；原生层拒绝符号链接、非普通文件、目录穿越和部分复制残留。
- 不删除、重置或覆盖用户现有数据库；迁移不得读取、写入或打印 `provider_secrets` / API Key。
- 不执行 `git commit`、`git push`、`git reset` 或破坏性 Git 命令。保留并避开工作区无关改动。

---

## File Structure

| 文件 | 责任 |
|---|---|
| `packages/core/src/types.ts`、`validation.ts` | 稳定项目 ID 与新增设置字段的纯类型/恢复校验。 |
| `packages/local-store/src/schema.ts`、`migrate.ts`、`repositories.ts` | 样本根、样本、项目克隆记录、部分唯一索引、检查点与原子 active 替换。 |
| `packages/local-store/src/db.ts`、`fakeDb.ts` | 可验证的 SQLite 事务辅助与失败模拟。 |
| `apps/desktop/src/localStore/*`、`runtime/desktopDraft.ts`、`composables/useWorkbenchDraft.ts` | SQLite 初始化、旧草稿的稳定项目 ID 回填，以及禁止把原始样本路径持久化。 |
| `apps/desktop/src-tauri/src/lib.rs` | 受限导入、读取、删除托管声音样本的原生命令。 |
| `apps/desktop/src/features/voice-clone/*` | 样本根访问、原生命令适配、克隆生命周期、项目 Voice resolver。 |
| `packages/provider-ai/src/types.ts`、`elevenLabsTtsProvider.ts` | multipart IVC、远端删除、调用级 TTS Voice ID。 |
| `apps/desktop/src/composables/useVoiceCloneProvider.ts`、`useSpeechProvider.ts` | 用户明确选择 ElevenLabs、没有项目克隆才使用 Provider 默认 Voice。 |
| `apps/desktop/src/components/settings/OutputStorageSettings.vue` | 用户选择并持久化声音样本目录。 |
| `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue`、`App.vue` | 授权、Provider 选择、生命周期状态和 speech resolver 接入。 |

## Task 1: Core identity, local-store schema, repositories, and migrations

**Files:**

- Modify: `packages/core/src/types.ts`, `packages/core/src/validation.ts`, `packages/core/tests/validation.test.ts`
- Modify: `packages/local-store/src/schema.ts`, `packages/local-store/src/migrate.ts`, `packages/local-store/src/repositories.ts`, `packages/local-store/src/db.ts`, `packages/local-store/src/fakeDb.ts`, `packages/local-store/src/index.ts`
- Modify: `packages/local-store/tests/schema.test.ts`, `packages/local-store/tests/db.test.ts`, `packages/local-store/tests/repositories.test.ts`

**Interfaces:**

- Produce `ProjectDraft.id: string` and `AppSettings.activeVoiceSampleStorageRootId?: string`.
- Produce `VoiceSampleStorageRootRecord`, `VoiceSampleRecord`, `ProjectVoiceCloneRecord`, and repository factories exported from `@mirax/local-store`.
- Produce `ProjectVoiceCloneState = "creating" | "remote-created" | "pending-verification" | "active" | "replaced" | "removed" | "remote-cleanup-required" | "failed"`.
- Produce `replaceActiveProjectVoiceClone(db, projectId, cloneId)` that commits or rolls back as one transaction.

- [ ] **Step 1: Write failing core and migration tests**

Add tests that prove all of the following before implementation:

```ts
it("creates a stable project id when callers omit one", () => {
  const project = createProjectDraft({ name: "新项目", targetPlatforms: ["douyin"] });
  expect(project.id).toMatch(/^[0-9a-f-]{36}$/i);
});

it("creates voice clone tables and the active partial index idempotently", async () => {
  const db = new FakeLocalStoreDb();
  await migrateLocalStore(db);
  db.clear();
  await migrateLocalStore(db);
  expect(db.calls.some((call) => /ALTER TABLE/i.test(call.sql))).toBe(false);
  expect(db.calls.some((call) => /CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active/i.test(call.sql))).toBe(true);
});
```

Add repository tests for `creating -> remote-created -> active`, `pending-verification` not being returned by `findActiveByProjectId`, replacement of the old active record, and a simulated failure that emits `ROLLBACK` and preserves the old active row.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run:

```bash
pnpm test packages/core/tests/validation.test.ts packages/local-store/tests/schema.test.ts packages/local-store/tests/db.test.ts packages/local-store/tests/repositories.test.ts
```

Expected: failure because the types, tables, index, records and repository methods do not exist yet.

- [ ] **Step 3: Implement the minimal data model**

Add the stable UUID at `ProjectDraft.id`; make `createProjectDraft` accept an optional input ID and generate one when callers omit it. Desktop restoration and workflow-ID synchronization belong to Task 2. Add only these voice-clone columns:

```sql
CREATE TABLE IF NOT EXISTS voice_sample_storage_roots (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS voice_samples (
  id TEXT PRIMARY KEY,
  storage_root_id TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  consented_at TEXT NOT NULL,
  consent_policy_version TEXT NOT NULL,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS project_voice_clones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  sample_id TEXT NOT NULL,
  provider_config_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  remote_voice_id TEXT,
  request_started_at TEXT,
  remote_created_at TEXT,
  state TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

In `migrate.ts`, create all tables first, use `PRAGMA table_info` before each new `ALTER TABLE`, and then execute this separately from table DDL:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active
  ON project_voice_clones(project_id)
  WHERE state = 'active';
```

Add `active_voice_sample_storage_root_id` to `app_settings` by the same PRAGMA-driven migration pattern. Do not query `provider_secrets` anywhere in migration code.

Use a repository-local transaction helper that issues `BEGIN IMMEDIATE`, runs the replacement SQL, then `COMMIT`; on any error it issues `ROLLBACK` and rethrows. The helper must operate on the same `LocalStoreDb` connection. If the Tauri SQL adapter cannot preserve a transaction across `execute` calls, stop `BLOCKED` and report that fact rather than pretending replacement is atomic.

- [ ] **Step 4: Extend the fake DB only as needed**

Make `FakeLocalStoreDb` record `BEGIN IMMEDIATE`, `COMMIT`, `ROLLBACK`, `CREATE UNIQUE INDEX`, and deterministic failure injection for the activation update. It must continue to preserve schema across `clear()` and never parse or expose secret values.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
pnpm test packages/core/tests/validation.test.ts packages/local-store/tests/schema.test.ts packages/local-store/tests/db.test.ts packages/local-store/tests/repositories.test.ts
pnpm typecheck
git diff --check
```

Expected: all focused tests and typecheck pass; `git diff --check` is silent.

## Task 2: Persist project identity and voice-sample-root setting without localStorage fallback

**Files:**

- Modify: `apps/desktop/src/runtime/desktopDraft.ts`, `apps/desktop/src/runtime/desktopDraft.test.ts`
- Modify: `apps/desktop/src/composables/useWorkbenchDraft.ts`, `apps/desktop/src/composables/useWorkbenchDraft.test.ts`
- Modify: `apps/desktop/src/composables/useAppSettings.ts`, `apps/desktop/src/composables/useAppSettings.test.ts`
- Modify: `apps/desktop/src/localStore/loadSnapshot.ts`, `apps/desktop/src/localStore/adapter.ts`
- Modify: `apps/desktop/src/components/PathPickerButton.vue`, `apps/desktop/src/components/settings/OutputStorageSettings.vue`
- Create: `apps/desktop/src/features/voice-clone/useVoiceSampleStorage.ts`
- Test: `apps/desktop/src/features/voice-clone/useVoiceSampleStorage.test.ts`

**Interfaces:**

- Produce `useVoiceSampleStorage()` with `roots`, `activeRoot`, `selectRoot(path)`, `requireActiveWritableRoot()` and `removeRoot(id)`.
- `selectRoot` must require the SQLite DB and return a safe error instead of using app settings localStorage.
- `DesktopDraft` keeps its stable `project.id`, but `sanitizeDesktopDraftForStorage` must omit the original `project.voiceSamplePath`.

- [ ] **Step 1: Write failing persistence tests**

Cover old draft restoration, immediate SQLite persistence of a newly generated project ID, a snapshot that omits an original voice-sample path, root selection saved in `voice_sample_storage_roots`, and database absence:

```ts
await expect(useVoiceSampleStorage({ db: undefined }).selectRoot("/tmp/samples"))
  .rejects.toMatchObject({ code: "local-store-unavailable" });

expect(JSON.parse(storage.getItem(DESKTOP_DRAFT_STORAGE_KEY)!).project).not.toHaveProperty("voiceSamplePath");
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm test apps/desktop/src/runtime/desktopDraft.test.ts apps/desktop/src/composables/useWorkbenchDraft.test.ts apps/desktop/src/composables/useAppSettings.test.ts apps/desktop/src/features/voice-clone/useVoiceSampleStorage.test.ts
```

Expected: failure because the root repository wiring and source-path sanitization are absent.

- [ ] **Step 3: Implement SQLite-only root persistence**

Keep `activeVoiceSampleStorageRootId` in the SQLite `app_settings` record and load it through `loadAppSettingsSnapshotFromDb`. Do not put root paths or the active root ID into the browser-only app-settings snapshot. `useVoiceSampleStorage.selectRoot` creates a UUID root record for a newly selected path and persists the active root ID; changing roots affects only later imports. Reject deletion when a sample record references that root.

Extend `PathPickerButton` with an optional `directory` prop and pass it as `directory: true` to the Tauri dialog. In `OutputStorageSettings.vue`, add a dedicated “声音样本存储目录” card. It may show the selected folder name, but must not fall back to a browser prompt or a session-only preview when Tauri/SQLite is unavailable.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm test apps/desktop/src/runtime/desktopDraft.test.ts apps/desktop/src/composables/useWorkbenchDraft.test.ts apps/desktop/src/composables/useAppSettings.test.ts apps/desktop/src/features/voice-clone/useVoiceSampleStorage.test.ts
pnpm typecheck
```

Expected: all pass. Confirm test fixtures contain no real sample path or API Key.

## Task 3: Add constrained native managed-sample file operations

**Files:**

- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Create: `apps/desktop/src/features/voice-clone/tauriVoiceSamples.ts`
- Test: `apps/desktop/src/features/voice-clone/tauriVoiceSamples.test.ts`
- Modify: `apps/desktop/src-tauri/src/lib.rs` test module

**Interfaces:**

- Produce `import_voice_sample(source_path, allowed_root, relative_path) -> { relative_path, file_name, mime_type, size_bytes }`.
- Produce `delete_managed_voice_sample(path, allowed_root) -> ()`.
- Produce TypeScript wrappers `importManagedVoiceSample(...)`, `readManagedVoiceSample(...)`, `deleteManagedVoiceSample(...)`.

- [ ] **Step 1: Write failing Rust and wrapper tests**

Test that import accepts a regular `.wav` under 25 MiB, copies it to `allowed_root/<sample-id>/<safe-name>`, rejects an outside traversal target, rejects a symlink source, rejects a directory, rejects an unsupported extension and rejects a 25 MiB+1 byte file. Test deletion rejects symlink escapes and removes only the managed copy.

- [ ] **Step 2: Run the Rust test target and confirm failure**

Run:

```bash
cd apps/desktop/src-tauri && cargo test
```

Expected: failure because the managed-sample commands do not exist.

- [ ] **Step 3: Implement the commands without weakening existing TTS path checks**

Use `symlink_metadata` for the source and reject symlinks before reading. Reuse `resolve_within_root` for the destination, create a unique temporary destination inside the selected root, copy bytes, then rename atomically. On error, remove only that temporary file. Derive MIME from the allowlisted extension only; never return the source absolute path in an error. Register both commands in `generate_handler!`.

Do not change `write_binary_file`, `read_binary_file`, `check_audio_file`, or `probe_audio_duration` behavior used by ordinary TTS except to factor a shared safe helper with identical tests.

- [ ] **Step 4: Run verification**

Run:

```bash
cd apps/desktop/src-tauri && cargo test
cd apps/desktop/src-tauri && cargo check
pnpm test apps/desktop/src/features/voice-clone/tauriVoiceSamples.test.ts
```

Expected: all pass; errors contain neither the source path nor a credential.

## Task 4: Implement ElevenLabs IVC transport and call-level speech Voice ID

**Files:**

- Modify: `packages/provider-ai/src/types.ts`, `packages/provider-ai/src/elevenLabsTtsProvider.ts`
- Modify: `packages/provider-ai/tests/elevenlabs-tts-provider.test.ts`
- Modify: `apps/desktop/src/composables/useVoiceCloneProvider.ts`, `apps/desktop/src/composables/useVoiceCloneProvider.test.ts`
- Modify: `apps/desktop/src/composables/useSpeechProvider.ts`, `apps/desktop/src/composables/useSpeechProvider.test.ts`

**Interfaces:**

- Extend `CloneVoiceInput` with `sampleId`, `voiceName`, and optional `description`.
- Add `ReadAudioFile`, `UploadVoiceSample`, and `DeleteRemoteVoice` abstractions.
- Make `ElevenLabsTtsProvider.synthesizeSpeech(input)` use `input.voiceId.trim()` in `/v1/text-to-speech/{voiceId}`; `ElevenLabsTtsProviderOptions.voiceId` becomes optional legacy default only.
- Make `selectVoiceCloneProvider` require `selectedProviderConfigId` and select only that ready `elevenlabs-tts` configuration.

- [ ] **Step 1: Add failing provider tests**

Add fakes for `readAudioFile`, multipart upload, and remote deletion. Cover:

```ts
expect(upload.calls[0].name).toBe("我的授权音色");
await expect(provider.cloneVoice({ voiceSamplePath: "/managed/a.wav", projectId: "p", sampleId: "s", voiceName: "" }))
  .rejects.toMatchObject({ code: "not-configured" });
```

Also assert IVC maps 401/403 to `unauthorized`, other non-2xx to `clone-failed`, network exceptions to `network`, a missing `voice_id` to `clone-failed`, and all messages omit API keys, source paths and response bodies. Add a speech test proving a project voice ID in `SynthesizeSpeechInput` changes the TTS endpoint even when the constructor default differs.

Add selector tests proving only the explicitly selected ready ElevenLabs ID succeeds; only CosyVoice, an absent selection, a disabled selected config, or a missing selected credential return `not-configured` without constructing `CosyVoiceProvider`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm test packages/provider-ai/tests/elevenlabs-tts-provider.test.ts apps/desktop/src/composables/useVoiceCloneProvider.test.ts apps/desktop/src/composables/useSpeechProvider.test.ts
```

Expected: failure because IVC transport and call-level TTS selection are absent.

- [ ] **Step 3: Implement only the documented provider behavior**

Create a multipart `FormData` request with `xi-api-key`, `name`, one `files[]` entry, optional `description`, and no manually set multipart `Content-Type`. Parse only `{ voice_id, requires_verification }`. Implement remote delete with the official DELETE endpoint for explicit deletion and best-effort compensation. `FetchBinary` remains only for TTS audio responses.

Provider selection must not silently choose the first enabled configuration. Speech selection must validate API Key/model, while the resolver in Task 5 decides whether a default Voice ID is required for the particular project.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
pnpm test packages/provider-ai/tests/elevenlabs-tts-provider.test.ts apps/desktop/src/composables/useVoiceCloneProvider.test.ts apps/desktop/src/composables/useSpeechProvider.test.ts
pnpm typecheck
```

Expected: all pass; no test performs a real HTTP request or uses a real key.

## Task 5: Build the project clone lifecycle and speech resolver

**Files:**

- Create: `apps/desktop/src/features/voice-clone/voiceCloneLifecycle.ts`
- Create: `apps/desktop/src/features/voice-clone/voiceCloneLifecycle.test.ts`
- Create: `apps/desktop/src/features/voice-clone/resolveSpeechVoice.ts`
- Create: `apps/desktop/src/features/voice-clone/resolveSpeechVoice.test.ts`
- Modify: `apps/desktop/src/localStore/adapter.ts` only if Task 1 transaction probe requires it

**Interfaces:**

```ts
export type RunVoiceCloneInput = {
  projectId: string;
  providerConfigId: string;
  sourcePath: string;
  voiceName: string;
  consent: { accepted: true; policyVersion: string; acceptedAt: string };
};

export async function runVoiceClone(input: RunVoiceCloneInput, deps: VoiceCloneLifecycleDeps): Promise<ProjectVoiceCloneRecord>;
export async function resolveSpeechVoice(input: ResolveSpeechVoiceInput): Promise<{ providerConfig: ApiKeyProviderConfig; voiceId: string }>;
```

- [ ] **Step 1: Write lifecycle tests before implementation**

Use fakes for all filesystem and provider calls. Cover this required order:

```ts
expect(events).toEqual([
  "require-db", "require-root", "create-creating", "import-managed-copy",
  "mark-request-started", "upload", "mark-remote-created", "replace-active",
]);
```

Add tests proving:

- absent DB/root, denied consent, bad source, or invalid selected provider causes no copy/read/upload;
- `requiresVerification: true` ends at `pending-verification` and leaves the old active clone unchanged;
- active replacement failure preserves `remote-created`, calls delete once, then records `remote-cleanup-required` if deletion fails;
- remote-checkpoint write failure never activates a clone and reports `remote-outcome-unrecorded` without persisting the remote ID to localStorage or logs;
- resolver returns the active clone's exact bound config and ID; disabled/deleted/missing-credential provider returns `project-voice-unavailable`; only no clone record permits the default Provider Voice ID.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm test apps/desktop/src/features/voice-clone/voiceCloneLifecycle.test.ts apps/desktop/src/features/voice-clone/resolveSpeechVoice.test.ts
```

Expected: failure because neither lifecycle nor resolver exists.

- [ ] **Step 3: Implement the explicit state machine**

`runVoiceClone` must perform this exact sequence:

1. Require SQLite and active writable root before touching the source.
2. Require consent, voice name, selected ready ElevenLabs configuration and one allowed source file.
3. Create `voice_samples` plus `project_voice_clones(state="creating")`; import the managed copy.
4. Persist `request_started_at`, read only the managed copy, and call IVC.
5. Persist `remote_voice_id`, `remote_created_at`, `state="remote-created"` before activation.
6. If verification is required, mark `pending-verification` and return it.
7. Otherwise call the atomic repository replacement.
8. On activation failure, retain the remote-created row and attempt remote DELETE. Mark `failed` after successful cleanup or `remote-cleanup-required` after failed cleanup.

Never let this service read/write `provider_secrets`; it receives the selected in-memory provider from Task 4. It must not call an API after any failed precondition.

- [ ] **Step 4: Run lifecycle tests and typecheck**

Run:

```bash
pnpm test apps/desktop/src/features/voice-clone/voiceCloneLifecycle.test.ts apps/desktop/src/features/voice-clone/resolveSpeechVoice.test.ts
pnpm typecheck
```

Expected: all required terminal states are covered without network access.

## Task 6: Integrate the settings, Workbench UI, App executor, and deletion actions

**Files:**

- Modify: `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue`, `apps/desktop/src/components/workbench/stages/VoiceCloningStage.test.ts`
- Modify: `apps/desktop/src/App.vue`, `apps/desktop/src/App.provider-runtime.test.ts`
- Modify: `apps/desktop/src/components/settings/OutputStorageSettings.vue`
- Modify: `apps/desktop/src/features/voice-clone/voiceCloneLifecycle.ts`, `resolveSpeechVoice.ts`

**Interfaces:**

- Keep pending original sample path in an App-level session ref; do not bind it to `ProjectDraft`.
- `VoiceCloningStage` receives a safe display name, selected ElevenLabs ID, safe provider labels, `voiceName`, consent state, root status, lifecycle state and safe error text.
- Produce explicit actions: delete local managed sample, remove project binding, and delete remote Voice only after a second confirmation and a repository reference-count check.

- [ ] **Step 1: Write UI/runtime contract tests**

Update the source-level UI tests to assert the authorization checkbox is unchecked by default, contains the ElevenLabs upload/credit notice, and disables clone until sample + selected provider + voice name + consent + writable root are all present. Assert the template contains no `apiKey`, `xi-api-key`, `token`, source absolute path or raw response body.

Add App runtime tests that assert the real voice-clone path invokes `runVoiceClone`, passes `draft.project.id`, never writes the original sample path to `draft.project`, and speech calls `resolveSpeechVoice` before `synthesizeSpeech`.

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
pnpm test apps/desktop/src/components/workbench/stages/VoiceCloningStage.test.ts apps/desktop/src/App.provider-runtime.test.ts
```

Expected: failure because the current UI is CosyVoice-oriented and persists `voiceSamplePath` in the draft.

- [ ] **Step 3: Wire UI and executor without fallback**

In real mode, remove the existing `selectedVoiceId` session-only success path. Feed clone success and restored state from SQLite project-clone records. On app start, use the stable `draft.project.id` to resolve speech; do not re-upload an existing active clone. If an active clone has an invalid bound Provider, show `project-voice-unavailable` and do not use a default Voice ID.

For local sample deletion, delete only the managed copy then mark the sample locally unavailable; leave the remote Voice and binding usable. For binding removal, mark the clone `removed` and let a future speech call use the default Voice only because the project now has no active clone. For remote deletion, require second confirmation and reject it while another local record references the same `(provider_config_id, remote_voice_id)`.

- [ ] **Step 4: Run desktop focused tests and build**

Run:

```bash
pnpm test apps/desktop/src/components/workbench/stages/VoiceCloningStage.test.ts apps/desktop/src/App.provider-runtime.test.ts apps/desktop/src/composables/useWorkbenchDraft.test.ts
pnpm --filter @mirax/desktop build:web
pnpm typecheck
```

Expected: tests/build/typecheck pass; the UI is honest when SQLite or ElevenLabs configuration is unavailable.

## Task 7: Full regression verification and manual dogfood

**Files:**

- Modify: `docs/superpowers/PROJECT-STATE.md`
- Modify: `docs/reverse-engineering/legacy-ui-gap-list.md` only if an existing row has direct, verified acceptance evidence

- [ ] **Step 1: Run all automated checks**

Run:

```bash
pnpm test
pnpm typecheck
pnpm --filter @mirax/desktop build:web
cd apps/desktop/src-tauri && cargo check
git diff --check
```

Expected: all commands pass and `git diff --check` is silent.

- [ ] **Step 2: Run manual desktop dogfood with a user-provided key**

Do not print, log or inspect the API Key. In `pnpm --filter @mirax/desktop dev`:

1. Set a writable sample directory in Settings.
2. Configure and enable one ElevenLabs TTS provider, then choose it explicitly in voice-clone.
3. Choose one allowed sample and grant consent; verify a managed copy and SQLite relative-path record are created.
4. Clone once and verify speech uses the project Voice ID.
5. Restart; verify the same project uses the persisted Voice ID without a second IVC request.
6. Disable the bound Provider; verify no fallback to default Voice occurs.
7. Delete the managed local sample; verify the project clone remains usable.
8. Exercise `requires_verification`, checkpoint failure and SQLite unavailable fakes; verify no false success, no fallback and no leaked sensitive text.

- [ ] **Step 3: Update state with only verified evidence**

Move voice clone from “mock / 未完整真实接入” only after all automated checks and manual dogfood succeed. If the real IVC request cannot run because the user has no usable/credited key, leave it as unverified and record the exact remaining manual check; do not claim completion.

## Self-review

- Spec coverage: Tasks 1–2 cover stable ID, SQLite-only root storage and draft privacy; Task 3 covers restricted file operations; Task 4 covers current ElevenLabs API and call-level TTS voice; Task 5 covers the persisted state machine and resolver; Task 6 covers consent/UI/deletion; Task 7 covers regression and dogfood.
- 占位项扫描：未发现未定项、泛化错误处理描述或隐式回退指令。
- Type consistency: all later tasks consume `ProjectVoiceCloneRecord`, `runVoiceClone`, and `resolveSpeechVoice` produced earlier; raw sample source remains outside `ProjectDraft`.
