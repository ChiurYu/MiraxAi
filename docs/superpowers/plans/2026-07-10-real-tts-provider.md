# 真实 TTS 最小接入方案（speech 阶段）

> 日期：2026-07-10
> 范围：仅实现 Workbench 第 4 阶段「语音合成（speech）」的真实能力，不混入 voice-clone、avatar、compose、publish。
> 状态：已按用户确认决策完成实现，进入 dogfood 验证。

## 已确认决策

1. **TTS 服务选型**：采用 **ElevenLabs 官方 TTS API** 作为 dogfood 路径，而非本地 CosyVoice。
2. **Voice Identity 来源**：使用 **provider 级 Voice ID**，在 `ApiKeyProviderConfig` 新增 `voiceId` 字段，持久化到 SQLite `provider_configs`。
3. **音频交付方式**：**Client-write**。ElevenLabs 返回音频 bytes，前端通过新增 Rust command `write_binary_file` 写入本地；时长通过 `probe_audio_duration`（ffprobe）读取。
4. **输出音频格式**：ElevenLabs 固定输出 `speech.mp3`；CosyVoice 与 mock 保持原有产物行为，不把 MP3 伪装成 WAV。
5. **连接测试**：不实现 `GET /v1/voices/{voiceId}` 连接测试，也不把连接测试作为使用前置条件；配置完整并启用后可直接生成语音。
6. **FFmpeg 门槛**：FFmpeg 路径验证仅用于生成后的 ffprobe 时长探测，不作为 ElevenLabs provider 的就绪门槛。
7. **API Key 持久化**：复用现有 SQLite `provider_secrets`，与 OpenAI/Whisper 等 provider 一致；不进入 localStorage snapshot、draft、日志、错误、测试 fixture 或 git。

## 1. 目标

让 speech 阶段在 `stageMode === "real"` 时，通过真实 TTS 服务把 `project.notes` 合成为本地音频文件，输出可被下游 avatar/compose 消费的 `audioPath` 与 `durationSeconds`。

- 真实失败不 fallback 到 mock，不伪造音频文件、时长、波形或成功状态。
- API Key / token / Base URL 不进入日志、snapshot、draft、任务 payload 或测试 fixture。
- 只改动 speech 链路；voice-clone、avatar、compose、publish 保持现有逻辑。

## 2. 现状盘点

| 层级 | 文件 | 当前状态 |
|---|---|---|
| Provider 接口 | `packages/provider-ai/src/types.ts` | `SynthesizeSpeechInput` 含 `voiceId/script/projectId/outputPath/speed/emotion`；`SynthesizeSpeechResult` 含 `audioPath/durationSeconds`。 |
| Provider 实现 | `packages/provider-ai/src/cosyVoiceProvider.ts` | `synthesizeSpeech` 为骨架：POST `/tts`，期望 JSON 返回 `{ audioPath, durationSeconds }`。 |
| Provider 选择 | `apps/desktop/src/composables/useSpeechProvider.ts` | real 模式构造 `CosyVoiceProvider`，要求启用 `provider === "cosyvoice"` 且 `baseUrl` 合法。 |
| 阶段执行 | `apps/desktop/src/App.vue` `case "speech"` | 已清空旧产物、校验 script/voiceId、调用 `synthesizeSpeech`、写入 `generatedAudioPath/generatedAudioDuration`。 |
| UI | `apps/desktop/src/components/workbench/stages/SpeechSynthesisStage.vue` | speed/emotion 为组件内部状态，未 emit，mock/real 均未消费。 |
| 产物路径 | `packages/media-pipeline/src/artifactPaths.ts` + `useSpeechProvider.ts` | `buildSpeechOutputPath(root, projectId)` → `<root>/<projectId>/speech/speech.wav`。 |
| 连接测试 | `packages/provider-ai/src/connectionTest.ts` | CosyVoice 通过 `/health` 做 readiness 探测。 |
| 本地文件 | `apps/desktop/src-tauri/src/lib.rs` / `capabilities/default.json` | 已加载 `tauri-plugin-fs`，有 `fs:allow-read`，但**无** `fs:allow-write`。 |

## 3. 推荐路径

基于现有代码，`CosyVoiceProvider` 是**最小改动路径**：配置、选择器、连接测试、executor 接线都已存在，只需把 `synthesizeSpeech` 骨架填实，并在产物边界上做出明确约定。

但现有骨架对服务端契约做了两个强假设：

1. 服务端 endpoint 为 `/tts`；
2. 服务端返回 JSON `{ audioPath, durationSeconds }`，且音频文件已由服务端写入本地路径。

这两个假设不一定与真实 CosyVoice 服务（或团队实际部署的 TTS 服务）兼容，因此**必须先由用户确认服务契约**，再进入实现。

## 4. 待用户确认的决策

### 4.1 TTS 服务选型

| 选项 | 说明 | 对代码的影响 |
|---|---|---|
| **A. 本地/远程 CosyVoice HTTP 服务（与现有 `/tts` JSON 兼容）** | 复用 `CosyVoiceProvider`，只需实现请求/响应解析与错误映射。 | 最小。 |
| **B. 官方 CosyVoice / 阿里达摩院等标准接口** | 可能使用 `/inference/sft`、`/inference/zero-shot`、`/inference/cross-lingual` 等 endpoint，返回音频 bytes 或 URL。 | 需要重写 `CosyVoiceProvider.synthesizeSpeech`，可能新增字段。 |
| **C. OpenAI TTS API (`/audio/speech`)** | 返回音频 binary，需要新 Provider。 | 需新增 `OpenAiTtsProvider`，扩展 `ApiKeyProvider` 类型，并在设置 UI 增加 provider 选项。 |
| **D. 其他（ElevenLabs、Azure、火山等）** | 各自 endpoint/鉴权/返回格式不同。 | 需要新 Provider 与配置 UI。 |

**推荐：A**（若团队已准备 CosyVoice sidecar）；否则建议评估 **C**（OpenAI TTS）作为 dogfood 稳定路径。

### 4.2 Voice Identity 来源

当前 `SynthesizeSpeechInput.voiceId` 来自 voice-clone 阶段。真实 voice-clone 尚未接入，mock voice-clone 生成的 `mock-voice-<projectId>` 对真实 TTS 无意义。

| 选项 | 说明 | 对代码的影响 |
|---|---|---|
| **A. 要求先完成真实 voice-clone** | speech real 必须在 voice-clone real 之后执行。 | 本计划不实现 voice-clone，真实 TTS 的 dogfood 会依赖另一个未完成任务。 |
| **B. speech 直接接收 `voiceSamplePath`（零样本/参考音频）** | 在 `SynthesizeSpeechInput` 增加可选 `voiceSamplePath`，App.vue speech executor 传入 `project.value.voiceSamplePath`。 | 可让 speech 阶段独立 dogfood，但会触及 voice-clone 上游的样本选择逻辑。 |
| **C. 使用 provider 级默认音色** | 不传递 voice/sample，由服务端固定音色。 | 最简单，但用户无法在工作台选择声音。 |

**推荐：B**，因为 Mirax AI 产品形态需要用户选择/导入声音；若服务只支持服务端固定音色，则退化为 C。

### 4.3 音频交付方式

| 选项 | 说明 | 对代码的影响 |
|---|---|---|
| **Server-write** | 服务把音频写到 `outputPath`，返回 `{ audioPath, durationSeconds }`。 | 与现有骨架一致；要求服务能访问本地文件系统。 |
| **Client-write** | 服务返回音频 bytes 或预签名 URL，前端写入 `outputPath`。 | 需要在 `CosyVoiceProvider` 注入文件写入抽象（如 Tauri fs plugin 或 Rust command），并在 `capabilities/default.json` 增加 `fs:allow-write`。 |

**推荐：Server-write** 用于本地 CosyVoice sidecar；**Client-write** 用于云端 TTS。两者错误处理相同：写入失败/文件不存在时抛出 `synthesis-failed`。

### 4.4 Speed / Emotion 是否生效

`SpeechSynthesisStage.vue` 当前有 speed/emotion 本地状态，但未 emit。若所选服务支持这些参数：

- 需要把 speed/emotion 从 UI 传入 executor（通过 `run` emit 参数或 draft 字段）。
- 在 `SynthesizeSpeechInput` 中已有 `speed`/`emotion` 字段，可复用。

**推荐：先按服务端能力映射**；若 CosyVoice 服务不支持，则 UI 保持诚实提示「当前 provider 忽略语速/语气」。

### 4.5 输出音频格式

下游 avatar/compose 目前只读取路径，不校验格式。但真实数字人服务通常需要：

- WAV / PCM 16kHz mono，或
- MP3 等被服务接受的格式。

**需要确认**：真实 TTS 输出什么格式？若与下游要求不一致，是否由 speech 阶段负责重采样（FFmpeg）？

## 5. 实现边界（待决策后执行）

### 5.1 允许修改的文件

- `packages/provider-ai/src/cosyVoiceProvider.ts`：填实 `synthesizeSpeech`。
- `packages/provider-ai/src/types.ts`（仅当需要时）：增加 `voiceSamplePath?: string` 到 `SynthesizeSpeechInput`。
- `packages/provider-ai/tests/cosyvoice-provider.test.ts`：新增 fake-transport 测试。
- `apps/desktop/src/composables/useSpeechProvider.ts`：如需调整 readiness 校验或输出路径构建。
- `apps/desktop/src/App.vue` 中 `case "speech"`：传入 `voiceSamplePath` 等参数（若决策 B）。
- `apps/desktop/src/components/workbench/stages/SpeechSynthesisStage.vue`：emit speed/emotion（若决策 4.4 生效）。
- `apps/desktop/src-tauri/capabilities/default.json`：若 client-write，增加 `fs:allow-write`。
- `apps/desktop/src-tauri/src/lib.rs`（可选）：若 client-write 且 Tauri fs plugin 不够，新增 Rust command 写二进制音频。

### 5.2 禁止修改的文件

- `packages/core/`（除非仅新增可选类型字段，且经用户确认）。
- `packages/media-pipeline/`（speech 不调用 FFmpeg）。
- `packages/provider-ai/src/mock.ts`（保持 mock 行为不变，不伪造真实产物）。
- 设置页之外的 UI、SQLite schema、发布/账号逻辑。
- 未跟踪截图与旧 plans/specs 草稿。

## 6. 错误映射

| 场景 | 错误码 | 说明 |
|---|---|---|
| 未启用 cosyvoice provider / baseUrl 缺失 | `not-configured` | 保持 `selectSpeechProvider` 现有行为。 |
| `stageMode === "not-connected"` | `not-connected` | 保持现有行为。 |
| `voiceId` 为空且未启用 `voiceSamplePath` | `voice-unavailable` | 在 executor 或 provider 中前置校验。 |
| `script` 为空 | `not-configured` | 在 executor 中前置校验。 |
| HTTP 401/403 | `unauthorized` | 不暴露 API key。 |
| HTTP 非 2xx（非 401/403） | `synthesis-failed` | message 仅含状态码，不含响应体或 baseUrl token。 |
| 响应 JSON 解析失败 / 缺 audioPath / 缺 durationSeconds | `bad-response` 或 `synthesis-failed` | 不暴露完整响应体。 |
| 网络/transport 失败 | `network` | 不暴露 baseUrl。 |
| 写入失败或写入后文件不存在 | `synthesis-failed` | 不伪造成功。 |

## 7. 产物与本地文件边界

1. `outputPath` 由 `buildSpeechOutputPath(appSettings.outputPaths.audioOutput, projectId)` 生成，统一为 `<audioOutput>/<projectId>/speech/speech.wav`。
2. 若 Server-write：provider 把 `outputPath` 发给服务，返回后**必须验证文件存在**（通过 Tauri fs `exists` 或 Rust command），否则抛 `synthesis-failed`。
3. 若 Client-write：provider 接收音频 bytes，调用文件写入抽象；写入后验证文件存在。
4. `durationSeconds` 必须由服务返回或本地测量；不得估算/mock。
5. 绝对路径不进入日志、snapshot、任务 payload；UI 仅显示文件名。

## 8. 测试策略

所有测试使用 fake，不调用真实 TTS。

- `packages/provider-ai/tests/cosyvoice-provider.test.ts`
  - fake transport 返回 `{ audioPath, durationSeconds }` → 断言 `synthesizeSpeech` 成功。
  - fake transport 返回 401 → 断言 `unauthorized`。
  - fake transport 返回 500 → 断言 `synthesis-failed`。
  - 缺少 `voiceId` → 断言 `voice-unavailable`。
  - 缺少 `script` → 断言 `not-configured`。
  - 响应缺 `audioPath` 或 `durationSeconds` ≤ 0 → 断言 `synthesis-failed`。
  - 若 Client-write：注入 fake writeFile，断言 bytes 被写入指定路径；断言写入失败时抛 `synthesis-failed`。
  - 若 Server-write：断言请求 body 含 `outputPath/voiceId/script/speed/emotion/model`。

- `apps/desktop/src/composables/useSpeechProvider.test.ts`
  - real 模式无启用 cosyvoice → 返回 `not-configured`。
  - real 模式 baseUrl 无效 → 返回 `not-configured`。
  - real 模式配置就绪 → 返回 `CosyVoiceProvider` 实例。

- `apps/desktop/src/App.provider-runtime.test.ts`
  - 使用 fake provider 注入 speech executor，断言成功时 `generatedAudioPath`/`generatedAudioDuration` 更新。
  - fake provider 抛 `synthesis-failed`，断言 `speechErrorMessage` 更新且 `generatedAudioPath` 为空。

- 安全测试：
  - 断言错误 message 不含 `sk-`、baseUrl 路径中的 token、完整响应体。
  - 断言 snapshot/draft 不保存 API key。

## 9. Task 列表（实现阶段）

1. **确认服务契约**（用户决策）
   - 选择 TTS 服务（CosyVoice `/tts` / 标准 CosyVoice / OpenAI TTS / 其他）。
   - 选择 voice identity 来源（voiceId / voiceSamplePath / 默认音色）。
   - 选择音频交付方式（server-write / client-write）。
   - 确认输出音频格式与是否需要重采样。

2. **补实 Provider 实现**
   - 文件：`packages/provider-ai/src/cosyVoiceProvider.ts`（或新建 `OpenAiTtsProvider.ts`）。
   - 实现请求构造、响应解析、错误映射、产物验证。
   - 若需 client-write，注入文件写入抽象。

3. **调整类型与 executor（仅当决策需要时）**
   - 文件：`packages/provider-ai/src/types.ts`、`apps/desktop/src/App.vue`、`useSpeechProvider.ts`。
   - 传入 `voiceSamplePath`、speed、emotion 等参数。

4. **调整本地文件权限（client-write 时）**
   - 文件：`apps/desktop/src-tauri/capabilities/default.json`。
   - 增加 `fs:allow-write` 与合适的 scope（如 `$APPDATA/**`、`$HOME/MiraxAI/**` 或用户配置的 outputPaths）。

5. **补充测试**
   - 文件：`packages/provider-ai/tests/cosyvoice-provider.test.ts`、`useSpeechProvider.test.ts`、`App.provider-runtime.test.ts`。
   - 全部使用 fake transport / fake filesystem / fake invoke。

6. **验证**
   - `pnpm --filter @mirax/provider-ai test`
   - `pnpm test`
   - `pnpm typecheck`
   - `git diff --check`
   - 手动 dogfood：配置 local/remote CosyVoice → speech real → 检查 `<audioOutput>/<projectId>/speech/speech.wav` 存在并可播放。

## 10. 验收标准

- [ ] speech 阶段在 real 模式下调用真实 TTS，不 fallback mock。
- [ ] 真实失败时阶段状态为 `failed`，`generatedAudioPath` 为空，错误信息不含 API key/baseUrl token/响应体。
- [ ] 成功时 `generatedAudioPath` 指向实际存在的本地音频文件，`generatedAudioDuration > 0`。
- [ ] 设置页现有 cosyvoice provider 配置可直接用于 speech（无需新增 schema/UI）。
- [ ] 全部新增/修改测试使用 fake transport / fake filesystem / fake invoke，不联网。
- [ ] `pnpm test` 与 `pnpm typecheck` 通过。

## 11. 风险提示

- **voice-clone 未真实接入**：若选择依赖 `voiceId`，speech real 阶段会被 voice-clone real 阻塞；建议 dogfood 阶段使用 `voiceSamplePath` 零样本方案。
- **CosyVoice 服务端点未确定**：`/tts` 是代码中的假设，不是 CosyVoice 官方标准接口；实现前必须确认服务实际契约。
- **Client-write 需要 Tauri 写权限**：若服务返回音频 bytes，必须更新 `capabilities/default.json`，否则会在 release build 中失败。
- **绝对路径安全**：`outputPath` 由 `appSettings.outputPaths.audioOutput` 与 `projectId` 拼接，需确保 `projectId` 已做目录遍历清洗（当前 `buildArtifactPath` 已处理）。

## 12. 不纳入本次计划

- voice-clone 真实实现。
- avatar / compose / publish 真实能力。
- 设置页 UI 重构。
- SQLite schema 变更（除非用户决策 C/D 需要新 provider 类型）。
- 多平台发布。
