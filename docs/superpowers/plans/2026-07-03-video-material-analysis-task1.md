# 视频 / 素材分析 Task 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Workbench `transcribe` 阶段在 real 模式下，先把本地视频抽取成音频产物，再把音频路径（Task 1B 中升级为音频文件上传）送入真实转写链路，最终让 transcript 进入 rewrite/script。

**Architecture:** Task 1A 在 Rust 侧新增 `extract_audio` command，桌面端新增 `useAudioExtractor` 选择器，在 `App.vue` 的 transcribe executor 中先抽音频再调 provider；Task 1B 扩展 `TranscribeInput` 与 `WhisperProvider`，让真实转写端点改为 OpenAI `/audio/transcriptions` multipart 文件上传，并用 `response_format=verbose_json` 取回 transcript 与 segments。

**Tech Stack:** Tauri 2, Rust, Vue 3, TypeScript, pnpm workspaces, Vitest, `@tauri-apps/plugin-fs`, FFmpeg, OpenAI Whisper API。

## Global Constraints

- 不跳到发布能力；不做视频链接下载；不做画面理解 / OCR / 字幕提取 / 元信息分析。
- 只接一种真实转写方案（OpenAI `/audio/transcriptions`）；不把 mock 当真实能力。
- 真实失败不 fallback 到 mock，不伪造 transcript、segments、时长或文件大小。
- `apiKey` / token / `baseUrl` 中的 token 不进入日志、snapshot、任务 payload、测试 fixture 或错误详情。
- 产物路径中的 token / 敏感目录不进入日志或错误 message。
- 不 commit、不 push，由总控 review 后再决定。
- 默认 mock 路径行为保持不变。

---

## 背景

当前 Workbench `transcribe` 阶段在 real 模式下只是构造 `WhisperProvider`，把 `sourceVideoPath` 作为 JSON 字段 POST 到外部 `/transcribe` 端点。仓库里没有这个服务端实现，也没有客户端音频抽取、文件上传或本地 sidecar。因此「视频/素材分析」还没有真实产品能力。

本计划把它拆成两个可独立验收的最小任务：

- **Task 1A：本地视频 → FFmpeg 音频抽取产物**。让 real 模式在调用 provider 之前，先用已验证的 FFmpeg 从本地视频抽出 16kHz mono WAV，生成可追踪的 `audioPath` 产物。
- **Task 1B：真实转写端点（OpenAI Whisper 文件上传）**。让 `WhisperProvider` 真正消费 `audioPath`：读取音频文件，通过 multipart POST 上传到 OpenAI `/audio/transcriptions`，解析 `verbose_json` 返回的 text 与 segments。

拆分的理由：Task 1A 不依赖外部 AI 服务即可验证；Task 1B 的真实联网部分可以独立测试、独立失败，避免「抽音频失败」和「转写失败」混在一起。

## 当前代码流

1. 用户在 `MaterialParsingStage.vue` 选择本地视频或粘贴路径，结果写入 `ProjectDraft.sourceVideoPath`（`apps/desktop/src/components/workbench/stages/MaterialParsingStage.vue:33-37`）。
2. `App.vue executeStage("transcribe")`（`apps/desktop/src/App.vue:451-489`）读取 `sourceVideoPath`，调用 `selectTranscribeProvider`，再调用 `provider.transcribe({ sourceVideoPath, language: "zh-CN" })`。
3. `WhisperProvider.transcribe`（`packages/provider-ai/src/whisperProvider.ts:34-68`）把 `sourceVideoPath` 作为 JSON POST 到 `${baseUrl}/transcribe`。
4. 成功后将 `result.text` 写入 `transcriptText`，再作为 `rewriteScript({ transcript: transcriptText.value, ... })` 输入（`App.vue:527-534`）。
5. `packages/media-pipeline/src/ffmpegCommands.ts:9-32` 已有 `buildExtractAudioCommand`，但未被任何流程调用。
6. Rust 侧只有 `render_compose` / `probe_ffmpeg`（`apps/desktop/src-tauri/src/lib.rs:4-103`）。

## 非目标

- 不实现视频链接下载/抓取。
- 不实现画面理解、OCR、字幕提取、视频元信息分析。
- 不接多个转写方案（如同时接本地 Whisper sidecar 和 OpenAI Whisper）。
- 不把改写/语音/数字人/合成等后续阶段改为真实。
- 不修改 mock 默认行为。
- 不引入 keychain / OS 安全存储。

---

## File Structure

- `apps/desktop/src-tauri/src/lib.rs` — 新增 `extract_audio` command，复用现有 `create_parent_dir` / `run_ffmpeg`。
- `apps/desktop/src/composables/useAudioExtractor.ts` — 新增音频抽取选择器与 Tauri extractor。
- `apps/desktop/src/composables/useAudioExtractor.test.ts` — 选择器单测。
- `packages/provider-ai/src/types.ts` — 扩展 `TranscribeInput` 与 `WhisperProviderOptions`。
- `packages/provider-ai/src/openAiCompatible.ts` — 默认 transport 支持 `FormData` body。
- `packages/provider-ai/src/whisperProvider.ts` — 实现 `audioPath` 读取与 OpenAI audio/transcriptions 上传。
- `packages/provider-ai/src/connectionTest.ts` — Whisper 连接测试改为探测 OpenAI `/models`。
- `apps/desktop/src/composables/useAppSettings.ts` — `getProviderReadiness("whisper")` 要求非空 `apiKey`。
- `apps/desktop/src/App.vue` — real transcribe 分支先抽音频，再把 `audioPath` 传给 provider。
- `apps/desktop/src/App.provider-runtime.test.ts` — 增加 real transcribe 使用 audio extraction 的静态接线检查。
- `packages/provider-ai/tests/whisper-provider.test.ts` — 覆盖 audioPath 上传、401、坏响应、不泄漏 token。
- `apps/desktop/package.json` / `apps/desktop/src-tauri/Cargo.toml` / `apps/desktop/src-tauri/capabilities/default.json` — 添加 `@tauri-apps/plugin-fs` 与读取权限。

---

## Task 1A：本地视频 → FFmpeg 音频抽取产物

**Files:**
- Create: `apps/desktop/src/composables/useAudioExtractor.ts`
- Create: `apps/desktop/src/composables/useAudioExtractor.test.ts`
- Modify: `apps/desktop/src-tauri/src/lib.rs`
- Modify: `apps/desktop/src/App.vue:451-489`
- Modify: `apps/desktop/src/App.provider-runtime.test.ts`
- Test: `apps/desktop/src/composables/useAudioExtractor.test.ts`

**Interfaces:**
- Consumes: `sidecarConfig.ffmpegPath`, `verifiedFfmpegPath`, `appSettings.outputPaths.audioOutput`, `runtime.workflow.value.projectId`, `sourceVideoPath`.
- Produces: `AudioExtractor.extract({ sourceVideoPath, projectId }) => Promise<{ audioPath: string }>`.

### Step 1：写失败测试

```ts
// apps/desktop/src/composables/useAudioExtractor.test.ts
import { describe, expect, it } from "vitest";
import { selectAudioExtractor } from "./useAudioExtractor.js";

describe("selectAudioExtractor", () => {
  it("returns not-connected when ffmpeg path is not verified", () => {
    const result = selectAudioExtractor({
      stageMode: "real",
      ffmpegPath: "/usr/local/bin/ffmpeg",
      verifiedFfmpegPath: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("not-connected");
    }
  });

  it("extracts audio via Tauri invoke when verified", async () => {
    const invocations: unknown[] = [];
    const result = selectAudioExtractor({
      stageMode: "real",
      ffmpegPath: "/usr/local/bin/ffmpeg",
      verifiedFfmpegPath: "/usr/local/bin/ffmpeg",
      artifactRoot: "/Users/Shared/MiraxAI/audio",
      invoke: async (command, args) => {
        invocations.push({ command, args });
        return undefined;
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      const extractResult = await result.extractor.extract({
        sourceVideoPath: "/tmp/source.mp4",
        projectId: "demo-project",
      });
      expect(extractResult.audioPath).toBe(
        "/Users/Shared/MiraxAI/audio/demo-project/transcribe/extracted-audio.wav",
      );
      expect(invocations).toHaveLength(1);
      const call = invocations[0] as { command: string; args: Record<string, unknown> };
      expect(call.command).toBe("extract_audio");
      expect(call.args.ffmpegPath).toBe("/usr/local/bin/ffmpeg");
      expect(call.args.inputPath).toBe("/tmp/source.mp4");
      expect(call.args.outputPath).toMatch(/extracted-audio\.wav$/);
    }
  });
});
```

### Step 2：运行测试确认失败

```bash
pnpm test apps/desktop/src/composables/useAudioExtractor.test.ts
```

Expected: FAIL（`selectAudioExtractor` 未定义）。

### Step 3：实现 `useAudioExtractor`

```ts
// apps/desktop/src/composables/useAudioExtractor.ts
import { buildArtifactPath, MediaRendererError } from "@mirax/media-pipeline";
import type { WorkflowStageRuntimeMode } from "@mirax/core";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type AudioExtractorInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;

export interface AudioExtractorSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  ffmpegPath: string;
  verifiedFfmpegPath?: string;
  artifactRoot?: string;
  invoke?: AudioExtractorInvoke;
}

export interface AudioExtractor {
  extract(input: { sourceVideoPath: string; projectId: string }): Promise<{ audioPath: string }>;
}

export type AudioExtractorSelectionResult =
  | { ok: true; extractor: AudioExtractor }
  | { ok: false; error: MediaRendererError };

export function selectAudioExtractor(input: AudioExtractorSelectionInput): AudioExtractorSelectionResult {
  if (input.stageMode !== "real") {
    return {
      ok: false,
      error: new MediaRendererError("not-connected", "音频抽取仅在 real 模式下可用。", "transcribe"),
    };
  }

  const trimmedFfmpegPath = input.ffmpegPath.trim();
  if (!trimmedFfmpegPath || input.verifiedFfmpegPath !== trimmedFfmpegPath) {
    return {
      ok: false,
      error: new MediaRendererError("not-connected", "FFmpeg 未验证，无法抽取音频。", "transcribe"),
    };
  }

  return {
    ok: true,
    extractor: createTauriAudioExtractor({
      ffmpegPath: trimmedFfmpegPath,
      artifactRoot: input.artifactRoot,
      invoke: input.invoke,
    }),
  };
}

interface TauriAudioExtractorOptions {
  ffmpegPath: string;
  artifactRoot?: string;
  invoke?: AudioExtractorInvoke;
}

function createTauriAudioExtractor(options: TauriAudioExtractorOptions): AudioExtractor {
  const artifactRoot = options.artifactRoot ?? "/Users/Shared/MiraxAI/audio";
  const invoke = options.invoke ?? tauriInvoke;

  return {
    async extract(input: { sourceVideoPath: string; projectId: string }): Promise<{ audioPath: string }> {
      if (!input.sourceVideoPath.trim()) {
        throw new MediaRendererError("missing-input", "缺少源视频路径，无法抽取音频。", "transcribe");
      }

      const audioPath = buildArtifactPath(artifactRoot, input.projectId, "transcribe", "extracted-audio.wav");

      try {
        await invoke("extract_audio", {
          ffmpegPath: options.ffmpegPath,
          inputPath: input.sourceVideoPath,
          outputPath: audioPath,
        });
        return { audioPath };
      } catch (error) {
        if (error instanceof MediaRendererError) {
          throw error;
        }
        throw new MediaRendererError("extract-failed", "FFmpeg 音频抽取失败。", "transcribe");
      }
    },
  };
}
```

### Step 4：Rust 侧新增 `extract_audio` command

```rust
// apps/desktop/src-tauri/src/lib.rs
#[tauri::command]
fn extract_audio(ffmpeg_path: String, input_path: String, output_path: String) -> Result<(), String> {
    if ffmpeg_path.trim().is_empty()
        || input_path.trim().is_empty()
        || output_path.trim().is_empty()
    {
        return Err("FFmpeg 音频抽取参数不完整".into());
    }

    create_parent_dir(&output_path)?;

    run_ffmpeg(
        &ffmpeg_path,
        &[
            "-y",
            "-i",
            &input_path,
            "-vn",
            "-acodec",
            "pcm_s16le",
            "-ar",
            "16000",
            "-ac",
            "1",
            &output_path,
        ],
    )?;

    Ok(())
}
```

Register it:

```rust
.invoke_handler(tauri::generate_handler![render_compose, probe_ffmpeg, extract_audio])
```

### Step 5：在 `App.vue` transcribe 分支中先抽音频

Import at top:

```ts
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { selectAudioExtractor } from "./composables/useAudioExtractor.js";
```

Modify the `transcribe` case:

```ts
case "transcribe": {
  const transcribeMode = runtime.getStageMode("transcribe");
  transcribeErrorMessage.value = "";
  if (transcribeMode === "real") {
    transcriptText.value = "";
  }
  const sourceVideoPath = project.value.sourceVideoPath ?? "";
  if (!sourceVideoPath.trim()) {
    const error = new AiProviderError("not-configured", "请先选择或粘贴源素材。");
    transcribeErrorMessage.value = error.message;
    throw error;
  }

  let audioPath = "";
  if (transcribeMode === "real") {
    const audioSelection = selectAudioExtractor({
      stageMode: "real",
      ffmpegPath: sidecarConfig.ffmpegPath,
      verifiedFfmpegPath: verifiedFfmpegPath.value,
      artifactRoot: appSettings.outputPaths.audioOutput,
      invoke: tauriInvoke,
    });
    if (!audioSelection.ok) {
      transcribeErrorMessage.value = audioSelection.error.message;
      throw audioSelection.error;
    }
    const extractResult = await audioSelection.extractor.extract({
      sourceVideoPath,
      projectId: runtime.workflow.value.projectId,
    });
    audioPath = extractResult.audioPath;
  }

  const selection = selectTranscribeProvider({
    stageMode: transcribeMode,
    providerConfigs: providerConfigs.value,
    mockProvider: aiProvider,
  });
  if (!selection.ok) {
    transcribeErrorMessage.value = selection.error.message;
    throw selection.error;
  }
  if (transcribeMode === "mock") {
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  try {
    const result = await selection.provider.transcribe({
      ...(transcribeMode === "real" ? { audioPath } : { sourceVideoPath }),
      language: "zh-CN",
    });
    transcriptText.value = result.text;
    return `已提取 ${result.segments.length} 段文案`;
  } catch (error) {
    if (error instanceof Error) {
      transcribeErrorMessage.value = error.message;
    }
    throw error;
  }
}
```

### Step 6：补充 `App.provider-runtime.test.ts` 静态检查

```ts
it("extracts audio before real transcribe when sourceVideoPath is present", () => {
  expect(source).toContain("selectAudioExtractor");
  expect(source).toContain("extract_audio");
  expect(source).toContain("audioPath");
});
```

### Step 7：运行 Task 1A 验证

```bash
pnpm test apps/desktop/src/composables/useAudioExtractor.test.ts
pnpm test apps/desktop/src/App.provider-runtime.test.ts
pnpm typecheck
pnpm --filter @mirax/desktop build:web
```

Expected: PASS（Task 1A 不涉及真实网络调用）。

### Task 1A 验收标准

- [x] real 模式下选择本地视频后，`extract_audio` 被调用，产物路径为 `<audioOutput>/<projectId>/transcribe/extracted-audio.wav`。
- [x] FFmpeg 路径未验证时，阶段显示/抛出 `not-connected`，不进入 provider 调用。
- [x] 抽取失败时阶段标记 `failed`，`transcriptText` 不被写入。
- [x] mock 模式行为不变。
- [x] 错误 message 不包含完整本地目录、apiKey、token。

---

## Task 1B：真实转写端点（OpenAI Whisper 文件上传）

**Files:**
- Modify: `packages/provider-ai/src/types.ts`
- Modify: `packages/provider-ai/src/openAiCompatible.ts`
- Modify: `packages/provider-ai/src/whisperProvider.ts`
- Modify: `packages/provider-ai/src/connectionTest.ts`
- Modify: `apps/desktop/src/composables/useAppSettings.ts:186-225`
- Modify: `apps/desktop/src/composables/useTranscribeProvider.ts:15-72`
- Modify: `apps/desktop/src/App.vue:451-489`
- Modify: `packages/provider-ai/tests/whisper-provider.test.ts`
- Modify: `apps/desktop/package.json`
- Modify: `apps/desktop/src-tauri/Cargo.toml`
- Modify: `apps/desktop/src-tauri/capabilities/default.json`
- Test: `packages/provider-ai/tests/whisper-provider.test.ts`
- Test: `apps/desktop/src/composables/useTranscribeProvider.test.ts`

**Interfaces:**
- Consumes: `audioPath` from Task 1A, `WhisperProviderConfig` (baseUrl, apiKey, model), `readAudioFile(path) => Promise<Uint8Array>`.
- Produces: `TranscriptResult` with real text/segments from OpenAI Whisper API.

### Step 1：添加 Tauri fs plugin 依赖与权限

`apps/desktop/package.json` dependencies:

```json
"@tauri-apps/plugin-fs": "^2.0.0"
```

Install:

```bash
pnpm --filter @mirax/desktop add @tauri-apps/plugin-fs@^2.0.0
```

`apps/desktop/src-tauri/Cargo.toml` dependencies:

```toml
tauri-plugin-fs = "2"
```

`apps/desktop/src-tauri/capabilities/default.json` permissions (保持最小可用范围，音频产物通常落在用户目录下)：

```json
[
  "core:default",
  "dialog:default",
  "core:window:allow-set-theme",
  "core:window:allow-start-dragging",
  "sql:default",
  "sql:allow-execute",
  "sql:allow-select",
  "fs:default",
  "fs:allow-read"
]
```

### Step 2：扩展类型契约

```ts
// packages/provider-ai/src/types.ts
export interface TranscribeInput {
  sourceVideoPath?: string;
  audioPath?: string;
  language?: string;
}

export type ReadAudioFile = (path: string) => Promise<Uint8Array>;

export interface WhisperProviderOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  transport?: OpenAiCompatibleTransport;
  readAudioFile?: ReadAudioFile;
}
```

### Step 3：默认 transport 支持 FormData

```ts
// packages/provider-ai/src/openAiCompatible.ts
export function createDefaultOpenAiTransport(): OpenAiCompatibleTransport {
  return {
    async request(req: OpenAiCompatibleTransportRequest): Promise<OpenAiCompatibleTransportResponse> {
      const isFormData = typeof FormData !== "undefined" && req.body instanceof FormData;
      const response = await fetch(req.endpoint, {
        method: req.method,
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...req.headers,
        },
        body: isFormData ? (req.body as FormData) : req.body ? JSON.stringify(req.body) : undefined,
      });

      return {
        status: response.status,
        json: () => response.json(),
      };
    },
  };
}
```

### Step 4：实现 `WhisperProvider` audioPath 上传

```ts
// packages/provider-ai/src/whisperProvider.ts
import { readFile } from "@tauri-apps/plugin-fs";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const UNWIRED_ERROR = "Whisper provider only supports transcription in this stage.";

export class WhisperProvider implements AiProvider {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model: string;
  private readonly transport: OpenAiCompatibleTransport;
  private readonly readAudioFile: ReadAudioFile;

  constructor(options: WhisperProviderOptions, transport: OpenAiCompatibleTransport) {
    this.baseUrl = sanitizeBaseUrl(options.baseUrl) || DEFAULT_OPENAI_BASE_URL;
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.transport = transport;
    this.readAudioFile = options.readAudioFile ?? defaultReadAudioFile;
  }

  async transcribe(input: TranscribeInput): Promise<TranscriptResult> {
    if (input.audioPath?.trim()) {
      return this.transcribeAudioFile(input.audioPath, input.language);
    }

    // 保留 sourceVideoPath JSON 路径，仅作为 sidecar/未来扩展的预留入口；
    // 当前 Task 1B 真实方案要求 audioPath。
    if (input.sourceVideoPath?.trim()) {
      throw new AiProviderError(
        "not-configured",
        "真实转写需要 audioPath；请先通过 FFmpeg 抽取音频。",
      );
    }

    throw new AiProviderError("not-configured", "Transcribe source path is empty.");
  }

  private async transcribeAudioFile(audioPath: string, language?: string): Promise<TranscriptResult> {
    let audioBytes: Uint8Array;
    try {
      audioBytes = await this.readAudioFile(audioPath);
    } catch {
      throw new AiProviderError("not-configured", "无法读取音频文件。");
    }

    const blob = new Blob([audioBytes], { type: "audio/wav" });
    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", this.model);
    if (language) {
      formData.append("language", language);
    }
    formData.append("response_format", "verbose_json");

    try {
      const response = await this.transport.request({
        endpoint: `${this.baseUrl}/audio/transcriptions`,
        method: "POST",
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError("unauthorized", `Whisper provider returned ${response.status}. Check your API key.`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new AiProviderError("transcribe-failed", `Whisper provider returned HTTP ${response.status}.`);
      }

      const data = await response.json();
      return parseTranscriptResult(data);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new AiProviderError("bad-response", "Whisper response is not valid JSON.");
      }
      throw new AiProviderError("network", "Network error while contacting Whisper provider.");
    }
  }

  // ... rewriteScript / cloneVoice / synthesizeSpeech / generateAvatarVideo 保持 UNWIRED_ERROR
}

async function defaultReadAudioFile(path: string): Promise<Uint8Array> {
  return readFile(path);
}
```

Update `parseTranscriptResult` to accept OpenAI `verbose_json`:

```ts
function parseTranscriptResult(data: unknown): TranscriptResult {
  if (!isObject(data) || typeof data.text !== "string" || data.text.trim() === "") {
    throw new AiProviderError("transcribe-failed", "Whisper response missing transcript text.");
  }

  const segments = Array.isArray(data.segments)
    ? data.segments
        .map((segment: unknown) => {
          if (!isObject(segment)) return null;
          const startSeconds = typeof segment.start === "number" ? segment.start : undefined;
          const endSeconds = typeof segment.end === "number" ? segment.end : undefined;
          const text = typeof segment.text === "string" ? segment.text : undefined;
          if (startSeconds === undefined || endSeconds === undefined || !text?.trim()) {
            return null;
          }
          return { startSeconds, endSeconds, text: text.trim() };
        })
        .filter((s): s is TranscriptResult["segments"][number] => s !== null)
    : [];

  if (segments.length === 0) {
    // OpenAI  verbose_json 至少有整段；这里兜底生成一段。
    segments.push({ startSeconds: 0, endSeconds: 0, text: data.text.trim() });
  }

  return {
    text: data.text.trim(),
    segments,
  };
}
```

Update `validateOptions`:

```ts
function validateOptions(options: WhisperProviderOptions): void {
  if (!sanitizeBaseUrl(options.baseUrl)) {
    throw new AiProviderError("not-configured", "Whisper provider baseUrl is required.");
  }
  if (!options.model.trim()) {
    throw new AiProviderError("not-configured", "Whisper provider model is required.");
  }
  if (!options.apiKey?.trim()) {
    throw new AiProviderError("not-configured", "Whisper provider apiKey is required for OpenAI audio/transcriptions.");
  }
}
```

### Step 5：更新 Whisper 连接测试

```ts
// packages/provider-ai/src/connectionTest.ts
async function testWhisperConnection(input: Extract<AiConnectionTestInput, { mode: "whisper" }>): Promise<AiConnectionTestResult> {
  if (!input.baseUrl.trim()) {
    return { ok: false, code: "not-configured", message: "Whisper Base URL 不能为空。" };
  }
  if (!input.apiKey?.trim()) {
    return { ok: false, code: "not-configured", message: "Whisper provider 需要 API Key。" };
  }

  const baseUrl = sanitizeBaseUrl(input.baseUrl);
  if (!baseUrl) {
    return { ok: false, code: "not-configured", message: "Whisper Base URL 格式不正确。" };
  }

  let transport: OpenAiCompatibleTransport;
  try {
    transport = input.transport ?? createDefaultOpenAiTransport();
  } catch {
    return { ok: false, code: "not-connected", message: "无法初始化 Whisper 连接。" };
  }

  try {
    const response = await transport.request({
      endpoint: `${baseUrl}/models`,
      method: "GET",
      headers: input.apiKey ? { Authorization: `Bearer ${input.apiKey}` } : {},
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, code: "unauthorized", message: "Whisper 凭证无效或权限不足，请检查 API key。" };
    }
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, code: "bad-response", message: `Whisper 返回 HTTP ${response.status}，连接测试失败。` };
    }

    await response.json();
    return { ok: true, message: "Whisper provider 连接正常。" };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, code: error.code, message: error.message };
    }
    if (error instanceof SyntaxError) {
      return { ok: false, code: "bad-response", message: "Whisper 响应无法解析为 JSON。" };
    }
    return { ok: false, code: "network", message: "无法连接到 Whisper provider，请检查网络与 baseUrl。" };
  }
}
```

### Step 6：更新 `useAppSettings.ts` 中 Whisper 就绪判断

```ts
case "whisper": {
  if (!trimmedApiKey || !trimmedBaseUrl || !trimmedModel) {
    return "needs-config";
  }
  return "ready";
}
```

### Step 7：在桌面端注入 `readAudioFile`

```ts
// apps/desktop/src/composables/useTranscribeProvider.ts
import { readFile } from "@tauri-apps/plugin-fs";

export function selectTranscribeProvider(input: TranscribeProviderSelectionInput): TranscribeProviderSelectionResult {
  // ... mock / not-connected handling unchanged

  try {
    return {
      ok: true,
      provider: createWhisperProvider({
        baseUrl: sanitizedBaseUrl,
        apiKey: config.apiKey,
        model: config.model,
        readAudioFile: (path) => readFile(path),
      }),
    };
  } catch (error) {
    // ... unchanged
  }
}
```

### Step 8：更新测试

`packages/provider-ai/tests/whisper-provider.test.ts` 重写为 audioPath 方案：

```ts
import { describe, expect, it } from "vitest";
import { AiProviderError, createWhisperProvider } from "../src/index.js";
import type { OpenAiCompatibleTransport } from "../src/index.js";

function createFakeTransport(scenarios: Array<{ response: { status: number; body: unknown } }>): OpenAiCompatibleTransport {
  let index = 0;
  return {
    async request() {
      const scenario = scenarios[index++];
      if (!scenario) {
        throw new Error("Unexpected request");
      }
      return {
        status: scenario.response.status,
        json: async () => scenario.response.body,
      };
    },
  };
}

describe("whisper provider", () => {
  it("transcribes audio file via OpenAI audio/transcriptions", async () => {
    let requestBody: unknown;
    const transport: OpenAiCompatibleTransport = {
      async request(req) {
        expect(req.method).toBe("POST");
        expect(req.endpoint).toContain("/audio/transcriptions");
        requestBody = req.body;
        return {
          status: 200,
          json: async () => ({
            text: "真实转写文案",
            segments: [{ start: 0, end: 3, text: "真实转写文案" }],
          }),
        };
      },
    };

    const readAudioFile = async () => new Uint8Array([1, 2, 3]);

    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport,
      readAudioFile,
    });

    const result = await provider.transcribe({
      audioPath: "/tmp/extracted-audio.wav",
      language: "zh-CN",
    });

    expect(result.text).toBe("真实转写文案");
    expect(result.segments).toEqual([{ startSeconds: 0, endSeconds: 3, text: "真实转写文案" }]);
    expect(requestBody).toBeInstanceOf(FormData);
  });

  it("rejects sourceVideoPath-only input in real mode", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: { async request() { throw new Error("should not be called"); } },
      readAudioFile: async () => new Uint8Array([]),
    });

    await expect(provider.transcribe({ sourceVideoPath: "/tmp/source.mp4" })).rejects.toMatchObject({
      code: "not-configured",
    });
  });

  it("returns unauthorized on 401", async () => {
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: createFakeTransport([{ response: { status: 401, body: { error: "bad token" } } }]),
      readAudioFile: async () => new Uint8Array([1]),
    });

    await expect(provider.transcribe({ audioPath: "/tmp/audio.wav" })).rejects.toMatchObject({
      code: "unauthorized",
    });
  });

  it("does not leak token or baseUrl token in errors", async () => {
    let requestedEndpoint = "";
    const provider = createWhisperProvider({
      baseUrl: "https://api.openai.com/v1?token=url-secret",
      apiKey: "secret-token",
      model: "whisper-1",
      transport: {
        async request(req) {
          requestedEndpoint = req.endpoint;
          return { status: 500, json: async () => ({ error: "server exploded" }) };
        },
      },
      readAudioFile: async () => new Uint8Array([1]),
    });

    let caught: unknown;
    try {
      await provider.transcribe({ audioPath: "/tmp/audio.wav" });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AiProviderError);
    expect(requestedEndpoint).not.toContain("url-secret");
    expect((caught as Error).message).not.toContain("secret-token");
    expect((caught as Error).message).not.toContain("url-secret");
  });
});
```

Update `useTranscribeProvider.test.ts` to expect apiKey requirement:

```ts
it("returns not-configured when apiKey is empty", () => {
  const result = select("real", [makeConfig({ apiKey: "" })]);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe("not-configured");
  }
});
```

### Step 9：运行 Task 1B 验证

```bash
pnpm test packages/provider-ai/tests/whisper-provider.test.ts
pnpm test apps/desktop/src/composables/useTranscribeProvider.test.ts
pnpm test apps/desktop/src/composables/useAudioExtractor.test.ts
pnpm test apps/desktop/src/App.provider-runtime.test.ts
pnpm typecheck
pnpm --filter @mirax/desktop build:web
```

Expected: PASS。

### Task 1B 验收标准

- [x] real 模式下 `WhisperProvider` 读取 `audioPath` 音频文件，multipart POST 到 `${baseUrl}/audio/transcriptions`。
- [x] 请求携带 `Authorization: Bearer <apiKey>`、`model`、`language=zh-CN`、`response_format=verbose_json`。
- [x] 返回的 `text` 与 `segments` 被正确解析为 `TranscriptResult`。
- [x] 401/403 返回 `unauthorized`；非 2xx 返回 `transcribe-failed`；JSON 解析失败返回 `bad-response`。
- [x] 只传 `sourceVideoPath` 时真实 provider 拒绝并提示需要 `audioPath`。
- [x] 连接测试调用 `/models` 并校验 apiKey。
- [x] mock 模式仍使用 `sourceVideoPath` 走 mock provider，行为不变。
- [x] 错误 message 不包含 apiKey、token、完整 baseUrl 中的 token、音频绝对路径。

---

## 安全边界

- `apiKey` 仅作为内存配置传入 `WhisperProvider`，不写入日志、snapshot、任务 payload、测试 fixture。
- `baseUrl` 在构造 provider 前经过 `sanitizeBaseUrl`，剔除 username/password/query/hash。
- 错误 message 中不携带 `sourceVideoPath`、`audioPath`、apiKey、完整响应体。
- `readAudioFile` 只读取本次生成的 `extracted-audio.wav`；不遍历用户目录。
- 真实失败不 fallback 到 mock，不伪造 transcript。

## 端到端验证命令

```bash
# 1. 全仓类型检查
pnpm typecheck

# 2. 相关单测
pnpm test packages/provider-ai/tests/whisper-provider.test.ts
pnpm test apps/desktop/src/composables/useTranscribeProvider.test.ts
pnpm test apps/desktop/src/composables/useAudioExtractor.test.ts
pnpm test apps/desktop/src/App.provider-runtime.test.ts

# 3. 桌面 web 构建
pnpm --filter @mirax/desktop build:web

# 4. Tauri 侧编译检查（需要 Rust 工具链）
cd apps/desktop/src-tauri && cargo check
```

## 完成后的状态同步

- 完成 Task 1A 与 Task 1B 并通过上述验证后，更新 `docs/superpowers/PROJECT-STATE.md`：
  - 将「视频 / 素材分析」从「当前仍是 mock / 未完整真实接入」移到「已完成」。
  - 将「语音转写」标记为真实链路已接入（仍受 OpenAI API 限制，但代码路径真实）。
  - 下一步指向「真实 TTS / 声音克隆」或「真实脚本生成 / 改写增强」，由总控决定。

## 后续候选（不作为本 Task）

- 视频链接下载/抓取。
- 画面理解 / OCR / 字幕提取 / 元信息分析。
- 本地 Whisper sidecar（替代 OpenAI 上传，如果后续需要离线方案）。
- 真实 TTS / 声音克隆 / 数字人 / 视频合成 / 发布。
