# 百炼原生 HTTP 桥接实施计划

> **执行方式：** 当前 Codex 会话内按测试先行执行；不提交、不推送。

**Goal:** 让桌面端的百炼声音克隆请求通过 Tauri 原生网络层发出，避免 WebView CORS 预检失败。

**Architecture:** 保留 `BaiLianTtsProvider` 的现有请求与错误语义，在 desktop 层注入一个 `FetchJson` 适配器。适配器通过受限的 Tauri command 将 JSON POST 交给 Rust `reqwest`，Rust 仅允许北京业务空间的 HTTPS 百炼 API 路径，且不记录 API Key、请求体或响应体。

**Tech Stack:** Vue 3、TypeScript、Tauri 2、Rust、reqwest、Vitest、cargo test。

## Global Constraints

- 只修复百炼 JSON 声音克隆/合成请求的 CORS 边界，不实现 OSS 自动上传或改变现有 Provider 配置。
- API Key 只在内存和原生请求 Authorization header 中流转；不得写入日志、SQLite、测试输出或用户可见错误。
- Rust command 只接受 `https://*.cn-beijing.maas.aliyuncs.com/api/v1/services/...`。
- 保留 `AiProviderError` 的安全错误文案；远端响应体不得直接回显。
- 不暂存、提交或推送既有工作区改动。

---

### Task 1: Desktop transport adapter and Qwen clone wiring

**Files:**

- Create: `apps/desktop/src/runtime/tauriBaiLianHttp.ts`
- Create: `apps/desktop/src/runtime/tauriBaiLianHttp.test.ts`
- Modify: `apps/desktop/src/composables/useVoiceCloneProvider.ts`
- Modify: `apps/desktop/src/composables/useVoiceCloneProvider.test.ts`
- Modify: `apps/desktop/src/App.vue`

**Interfaces:**

- Consumes: `FetchJson` from `@mirax/provider-ai` and Tauri `invoke`.
- Produces: `createTauriBaiLianFetchJson(invoke)` returning a `FetchJson` that calls `bailian_json_post`.

- [x] Write a failing adapter test that expects the command name, URL, Bearer API Key and JSON body to be forwarded without parsing a response in the browser.
- [x] Run the adapter test and confirm it fails because the adapter does not exist.
- [x] Add the minimal adapter and inject it into the BaiLian voice-clone provider path.
- [x] Re-run the focused adapter and provider-selection tests.

### Task 2: Restricted native POST command

**Files:**

- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/src/lib.rs`

**Interfaces:**

- Consumes: `url`, `apiKey`, and JSON `body` from `bailian_json_post`.
- Produces: `{ status, body }`, where body is JSON text and HTTP error responses remain opaque to the UI.

- [x] Write a failing Rust test for accepting only the HTTPS Beijing workspace API route and rejecting a non-BaiLian host.
- [x] Run the single Rust test and confirm it fails because the validator/command is absent.
- [x] Add the minimum `reqwest` command, route validation, non-logging error mapping, and invoke registration.
- [x] Re-run the Rust test.

### Task 3: Regression verification and state update

**Files:**

- Modify: `docs/codex/PROJECT-STATE.md`
- Modify: this plan

- [x] Run focused TypeScript tests, `cargo test`, `pnpm typecheck`, desktop web build, and `git diff --check`.
- [x] Mark completed plan steps and record the code-verified/manual-dogfood distinction in the active project state.

### Task 4: Safe HTTP diagnostics and provider-name compatibility

**Files:**

- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `packages/provider-ai/src/types.ts`
- Modify: `packages/provider-ai/src/baiLianTtsProvider.ts`
- Modify: `apps/desktop/src/runtime/tauriBaiLianHttp.ts`
- Modify: `apps/desktop/src/App.vue`
- Modify: `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue`

- [x] Preserve only redacted `code` / `message` / `request_id` from a non-2xx native response; never return the raw response, API key, data URI, source path, or signed URL.
- [x] Show at most ten clearable, in-memory voice-clone diagnostics; do not write them to SQLite or browser storage.
- [x] Correct provider-specific generated names: Qwen `preferred_name` uses only letters, digits, underscores and at most 16 characters; CosyVoice `prefix` uses only letters/digits and at most 10 characters.
- [x] Verify focused frontend tests (47), Rust tests (22), workspace typecheck, desktop web build, and `git diff --check`.

### Task 5: Voice-clone outcome visibility

- [x] Keep a completed voice clone on its own stage instead of auto-advancing before the user can see its Voice ID and ready state.
- [x] Treat a failed workflow status as a visible failure even if a dependency throws a non-`Error` value; add one safe fallback diagnostic.
- [x] Verify focused frontend/provider tests (49), workspace typecheck, and `git diff --check`.

### Task 6: Non-Error diagnostic extraction

- [x] Safely extract a string or object `message` from a voice-clone failure before using the fallback; reject diagnostics containing paths, URLs, data URIs, signatures, or credentials.
- [x] Verify App/runtime and voice-clone UI tests (42), workspace typecheck, and `git diff --check`.

### Task 7: SQLite pooled-connection lock root fix

- [x] Confirm the root cause: Tauri SQL uses a SQLite connection pool, while the old `BEGIN IMMEDIATE -> UPDATE -> UPDATE -> COMMIT` sequence used separate plugin calls. The transaction could begin on one pooled connection and the updates could execute on another, so the first connection held the write lock while the second failed with SQLite code 5.
- [x] Replace the cross-call transaction with one `UPDATE ... RETURNING` statement. A SQLite trigger replaces the previous active clone inside that same statement, so activation and verification stay on one connection and remain atomic.
- [x] Remove the earlier `busy_timeout` workaround; it only delayed the pooled-connection conflict and did not fix ownership of the transaction.
- [x] Add a regression backed by two alternating real SQLite connections, plus real SQLite trigger and missing-target coverage.

### Task 8: Recover a paid remote result after local activation failure

- [x] Before calling the remote provider again, find the latest `remote-created` clone for the same project and provider configuration and activate it locally.
- [x] Exclude `remote-cleanup-required` records from recovery because they belong to the cleanup path.
- [x] Verify focused repository, migration, lifecycle and App runtime tests (94), workspace typecheck, and desktop web build.

### Task 9: Completed clone result visibility

- [x] Derive the remote lifecycle label from the completed Voice ID instead of always displaying “尚未创建远端声音”.
- [x] Show an explicit success banner, change the action to a disabled “克隆已完成”, and prevent duplicate paid clone submissions.
- [x] Keep destructive local-sample and project-binding actions inside a collapsed native details section; do not show the ElevenLabs-only remote action for Qwen.
- [x] Restore the active project clone from SQLite on startup using only Voice ID, Provider ID and the safe original file name; do not restore the absolute sample path.
- [x] Verify focused UI, App, lifecycle, repository and schema tests (90), workspace typecheck, desktop web build, and `git diff --check`.

### Task 10: Qwen-TTS signed result audio download

- [x] Confirm the real response contract: a successful Qwen-TTS response may leave `output.audio.data` empty and return a signed `http://dashscope-result-*.oss-*.aliyuncs.com/...` URL in `output.audio.url`; do not reject that official result merely because it is not HTTPS.
- [x] Accept only HTTP/HTTPS URLs on the dedicated DashScope result OSS hostname pattern; reject credentials, custom ports, localhost and suffix-spoofed hosts.
- [x] Download the signed result through a dedicated Tauri Rust command with redirects disabled and a 50 MiB cap, then feed the bytes into the existing restricted local audio-output writer.
- [x] Verify focused frontend tests (69), workspace typecheck, desktop web build, Rust tests (23), and `git diff --check`.
- [x] Restart the desktop application and complete one real Qwen-TTS synthesis/playback dogfood; the user confirmed hearing the generated voice on 2026-07-14.

### Task 11: Speech result actions

- [x] Keep manual and repeated synthesis on the speech stage instead of auto-advancing immediately, so the running and result states remain visible.
- [x] Replace the WebView Blob download with a native save dialog that copies only an existing artifact inside the configured audio output root.
- [x] Replace the disabled “show in folder” placeholder with a root-restricted native Finder/Explorer/file-manager reveal action.
- [x] Show concise success, cancellation or failure feedback for file actions and for restoring default settings.
- [x] Verify focused frontend tests (60), Rust tests (23), workspace typecheck, desktop web build, and `git diff --check`.
- [ ] Restart the desktop application and manually verify edit script, change voice, reset settings, resynthesize, save-as and show-in-folder actions.
