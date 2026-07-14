# 声音克隆最小子项目设计文档

> 日期：2026-07-11
> 范围：仅 Workbench 第 3 阶段「声音克隆（voice-clone）」的真实能力方案决策；不混入 speech、avatar、compose、review、publish、OAuth、多平台账号管理或 UI 大重构。
> 状态：路线 A（ElevenLabs Instant Voice Clone）已选定；声音样本授权确认已选定；应用将样本复制到用户在设置中选择的目录、以 SQLite 记录并保留至用户手动删除，原文件不动；克隆 Voice ID 仅归属项目和样本记录，不覆盖 Provider 默认 Voice ID；**本文档本身不进入实现**。

---

## 1. 当前基线与已验证能力

- Workbench 8 个阶段 UI、状态机、本地存储骨架已完成。
- **ElevenLabs 普通 TTS 已接入 speech 阶段**（第 4 阶段）并通过桌面端人工验收：Provider 配置可持久化到 SQLite、API Key 仅进 `provider_secrets`、`speech.mp3` 产物可恢复播放、恢复时不重复调用 ElevenLabs。
- **voice-clone 阶段（第 3 阶段）仍为 mock / 未真实接入**。
- 设置页已存在 `cosyvoice` 与 `elevenlabs-tts` 两种 provider 类型，但当前只有 `cosyvoice` 被 `useVoiceCloneProvider.ts` 识别为声音克隆 provider。
- 当前 `CloneVoiceInput` / `CloneVoiceResult` 的接口契约、CosyVoice 的 `/voice-clone` 与 `/tts` endpoint 均为**项目自定义假设**，并非 CosyVoice 官方标准接口。

### 1.1 架构审阅后的实施约束

以下约束覆盖本文中较早的“speech 无需核心改动”或“直接复用 `provider_configs.voiceId`”表述：

1. **项目 ID 是前置条件**：当前 workflow / Workbench draft 仍可能使用固定 `demo-project` / `default`。实施前必须为 `ProjectDraft` 建立稳定 UUID，并在首次恢复旧草稿时生成后立即持久化；项目级记录一律使用该 ID，不得使用展示名称或固定字符串。
2. **项目级克隆记录是唯一事实来源**：每条记录至少包含 `projectId`、`providerConfigId`、provider 类型、远端 `voiceId`、托管样本记录 ID、状态和创建时间。克隆前由用户从可用 ElevenLabs Provider 中明确选择配置；不得按“第一个启用的 Provider”猜选。`provider_configs.voiceId` 只保留用户手动配置的默认音色，克隆流程不得写入或覆盖它。
3. **speech 必须使用唯一 resolver**：当当前项目存在有效克隆记录时，resolver 必须返回该记录绑定的 Provider 配置与远端 `voiceId`；若绑定配置被删除、禁用、缺少凭据或远端音色已不可用，则显示“该项目克隆音色不可用”，不得静默回退到 Provider 默认音色。只有项目没有克隆记录时，才允许使用现有默认音色路径。
4. **样本路径必须可恢复**：AppSettings 保存当前 `activeVoiceSampleStorageRootId`；`voice_sample_storage_roots` 保存用户选择目录的本地路径。声音样本记录保存 `storageRootId + relativePath`，不保存到 snapshot；用户改默认目录只影响新导入，旧记录继续绑定原根目录。目录迁移是单独、显式、可失败的动作，不得静默修改历史记录。
5. **授权在执行边界强制校验**：未勾选授权确认时，既不得复制文件，也不得读取、上传或创建远端 Voice。记录确认时间、确认文案/政策版本，并在勾选处明确告知样本会上传至 ElevenLabs 且可能消耗用户自己的额度。
6. **SQLite 是真实声音克隆的硬依赖**：本地数据库不可用时，voice-clone 必须显示 `local-store-unavailable` / `not-connected`；不得复制样本、上传 ElevenLabs、写入 localStorage 或伪造可恢复状态。
7. **第一版每个项目只允许一条 active 克隆绑定**：新的克隆成功后必须以原子操作将旧绑定标为 `replaced`，再写入唯一 `active` 记录。第一版不实现多音色列表或选择器。
8. **当前样本根目录也是前置条件**：没有有效的 `activeVoiceSampleStorageRootId`、根记录不存在或目标目录不可写时，必须显示 `voice-sample-storage-unavailable` / `not-configured`；不得创建样本记录、复制、读取或上传。设置页切换根目录只会改变新导入目标；仍被样本引用的旧根目录不得直接删除。
9. **远端调用不是本地事务的一部分**：克隆记录必须经历 `creating -> remote-created -> pending-verification | active | remote-cleanup-required | failed`。上传前先持久化非 active 的 `creating` 记录与 `request_started_at`；ElevenLabs 返回 `voiceId` 后、任何 active 替换前，必须先单独提交可恢复检查点：`remote_voice_id + remote_created_at + remote-created`（或 `pending-verification`）。只有该检查点已成功提交、远端无需验证且后续本地原子事务成功时，才替换旧 active 记录。active 替换失败时保留含 `remote_voice_id` 的可恢复记录并尝试清理；清理失败标为 `remote-cleanup-required`，明确告知用户该 Voice 可能仍存在于其 ElevenLabs 账户。
10. **诊断检查点写入失败时只允许诚实降级**：若远端已返回 `voiceId` 但连 `remote-created` 检查点也无法写入，应用只能在当前进程内按该 ID 最佳努力删除远端 Voice；不得显示“已保存”、不得替换旧 active、不得把 ID、样本路径、凭据或响应体写入日志/localStorage。删除失败或进程在检查点前崩溃时，现有带 `request_started_at` 的 `creating` 记录在重启后必须显示“远端结果未记录，可能需要到 Provider 账户核对”，不得伪称可自动定位、重试或删除该 Voice。
11. **第一版只接受一个托管样本文件**：一次克隆对应一个 `voice_samples` 记录和一个上传文件；多样本克隆、多个 active 音色、样本合并与应用内验证流程均不在本轮范围。若 ElevenLabs 响应 `requires_verification: true`，记录为 `pending-verification`，不得成为 active 或供 speech 使用；界面必须诚实提示需要在 Provider 侧完成所需验证，后续验证接入另行规划。
12. **路线 A 的 real voice-clone 只允许 ElevenLabs IVC**：设置中保留现有 `cosyvoice` 配置数据，但本轮 selector 只能接受用户明确选择、可用的 `elevenlabs-tts` 配置；只有 CosyVoice 或未选择 ElevenLabs 时返回 `not-configured`，不得创建 `CosyVoiceProvider`、不得请求其自定义 `/voice-clone` / `/tts`，也不得作为 fallback。CosyVoice 仅保留为后续独立路线 C 的规划输入。

---

## 2. 目标与非目标

### 2.1 目标

- 让 Workbench 第 3 阶段「voice-clone」在 `stageMode === "real"` 时，通过真实服务把用户上传的**声音样本**转换成下游 speech 可消费的 **voice identity**。
- 明确 voice-clone 与 speech 之间的数据契约、产物保存方、恢复策略。
- 真实失败不 fallback 到 mock，不伪造 `voiceId`、不伪造「已克隆」状态。
- API Key / 样本路径 / 完整响应体不进入日志、snapshot、draft、任务 payload 或测试 fixture。

### 2.2 非目标（明确排除）

- 数字人生成（avatar）、视频合成（compose）、review、publish。
- OAuth、多平台账号管理、发布任务状态回传。
- 声音库/形象库/素材库的完整导入、录音、资产管理。
- 在 UI 层直接耦合模型服务、FFmpeg、Playwright、Python 服务细节。
- 对现有 ElevenLabs 普通 TTS 行为做非必要改动。

---

## 3. 当前架构和数据流

### 3.1 关键文件与接口

| 层级 | 文件 | 当前职责 |
|---|---|---|
| Provider 接口 | `packages/provider-ai/src/types.ts` | `CloneVoiceInput = { voiceSamplePath, projectId }`；`CloneVoiceResult = { voiceId, samplePath }`。 |
| Provider 实现 | `packages/provider-ai/src/cosyVoiceProvider.ts` | `cloneVoice` 调 `POST /voice-clone`，期望返回 `{ voiceId, samplePath }`；`synthesizeSpeech` 调 `POST /tts`，期望返回 `{ audioPath, durationSeconds }`。 |
| Provider 实现 | `packages/provider-ai/src/elevenLabsTtsProvider.ts` | 仅实现 `synthesizeSpeech`；`cloneVoice` 抛出 `UNWIRED_ERROR`。 |
| Provider 选择器 | `apps/desktop/src/composables/useVoiceCloneProvider.ts` | real 模式只认 `provider === "cosyvoice"` 且 `baseUrl` 合法。 |
| Provider 选择器 | `apps/desktop/src/composables/useSpeechProvider.ts` | real 模式支持 `cosyvoice` 或 `elevenlabs-tts`；ElevenLabs 使用 `config.voiceId`。 |
| 阶段执行 | `apps/desktop/src/App.vue` `case "voice-clone"` | 读取 `project.voiceSamplePath`，调用 `cloneVoice`，结果写入 `selectedVoiceId` / `selectedVoiceName`（session-only ref）。 |
| 阶段执行 | `apps/desktop/src/App.vue` `case "speech"` | ElevenLabs 用 `speechConfig.voiceId`；CosyVoice 用 `selectedVoiceId.value`（必须前置 voice-clone real）。 |
| UI | `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue` | 提供 `voiceSamplePath` 文件选择器；显示 `voiceId` / 状态。 |
| UI | `apps/desktop/src/components/workbench/stages/SpeechSynthesisStage.vue` | 显示 `voiceName`，不直接消费 `voiceId`。 |
| 配置 | `apps/desktop/src/components/settings/AiServicesSettings.vue` | 可添加/编辑 `cosyvoice` 与 `elevenlabs-tts` provider；`elevenlabs-tts` 配置含 `voiceId`。 |

### 3.2 当前真实数据流

```
用户选择样本文件
  → VoiceCloningStage.voiceSamplePath
  → draft.project.voiceSamplePath（持久化到 SQLite / localStorage snapshot）
  → App.vue executeStage("voice-clone")
    → selectVoiceCloneProvider({ stageMode: real })
      → 仅当存在 enabled + ready 的 cosyvoice provider 时返回 CosyVoiceProvider
    → provider.cloneVoice({ voiceSamplePath, projectId })
      → POST {baseUrl}/voice-clone
      → 返回 { voiceId, samplePath }
    → selectedVoiceId.value = voiceId（仅内存，重启丢失）
    → selectedVoiceName.value = basename(samplePath)（仅内存）

  → 进入 speech 阶段
    → App.vue executeStage("speech")
      → 若 provider 为 elevenlabs-tts：使用 config.voiceId（与 voice-clone 阶段无关）
      → 若 provider 为 cosyvoice：使用 selectedVoiceId.value
      → provider.synthesizeSpeech({ voiceId, script, outputPath })
```

### 3.3 目标数据流（路线 A）

```
用户选择 ElevenLabs Provider 配置 + 原始样本文件 + 勾选授权确认
  → SQLite 不可用：停止并显示 local-store-unavailable，不复制、不上传
  → 没有可写的 activeVoiceSampleStorageRootId：停止并显示 voice-sample-storage-unavailable，不复制、不上传
  → 执行边界验证授权、普通文件、允许的 MIME / 大小与非符号链接
  → SQLite：创建非 active 的 voice_samples / project_voice_clones(creating) 记录
  → 原子复制到当前 storageRootId/<sample-id>/<safe-file-name>，失败时清理临时文件并标记 failed
  → 持久化 request_started_at，再由专用 multipart/JSON transport 调 ElevenLabs IVC
  → ElevenLabs 返回 voiceId：**先单独提交** remote_voice_id + remote_created_at + remote-created 检查点
  → 检查点提交失败：保持旧 active；当前进程最佳努力删除远端 Voice；失败/崩溃后仅能以“远端结果未记录”告知用户，不伪造可恢复记录
  → 需要验证：从已持久化检查点更新为 pending-verification，不切换项目当前音色
  → 成功且无需验证：单个 SQLite 事务将旧 active 标为 replaced，并将已检查点化的新记录设为唯一 active
  → active 替换失败：保留 remote-created 记录供重启后定位；尽力删除远端 Voice，清理成功转 failed，清理失败时转 remote-cleanup-required

speech 阶段
  → resolveSpeechVoice(projectId)
  → 有有效项目克隆记录：使用其 providerConfigId + remoteVoiceId
  → 无项目克隆记录：使用现有 Provider 默认 voiceId
  → 绑定配置不可用：项目克隆音色不可用；不 fallback
  → ElevenLabsTtsProvider 用 resolver 给出的 voiceId 调 TTS URL
```

### 3.4 目标 SQLite 数据模型

| 记录 | 必填字段 | 责任 |
|---|---|---|
| `ProjectDraft` | `id`（稳定 UUID） | 项目级克隆记录的唯一归属。旧 `default` 草稿首次恢复时生成并立即持久化 UUID。 |
| `voice_sample_storage_roots` | `id`, `path`, `created_at` | 用户从设置页选择过的每一个样本目录。路径仅留在本机 SQLite，不进入 snapshot 或日志。 |
| `voice_samples` | `id`, `storage_root_id`, `relative_path`, `original_file_name`, `mime_type`, `size_bytes`, `consented_at`, `consent_policy_version`, `state` | 一个托管副本、授权审计和文件可用性；第一版一次克隆只关联一个样本。 |
| `project_voice_clones` | `id`, `project_id`, `sample_id`, `provider_config_id`, `provider`, `remote_voice_id`, `request_started_at`, `remote_created_at`, `state`, `created_at` | 当前项目对远端 Voice 的绑定。`creating` + `request_started_at` 是“远端结果可能未知”的可恢复告警；一旦收到响应，必须先落 `remote_voice_id + remote_created_at + remote-created`。`remote_voice_id` 仅允许在远端尚未响应或结果未知的 `creating` / 纯本地 `failed` 状态为空。状态至少区分 `creating`、`remote-created`、`pending-verification`、`active`、`replaced`、`removed`、`remote-cleanup-required`、`failed`。Provider 默认音色不属于此表。 |

每项目最多一条 active 记录必须是**独立的 SQLite partial unique index**，不是 `CREATE TABLE` 内的 `UNIQUE` 约束；迁移在建表后幂等执行：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active
  ON project_voice_clones(project_id)
  WHERE state = 'active';
```

删除语义分为三个独立动作：

1. **删除本地样本副本**：删除托管文件、把样本标记为本地已删除；项目克隆记录继续保留远端 Voice ID，仍可合成。
2. **替换或移除项目克隆音色**：新克隆成功时原子地把旧 active 绑定标为 `replaced`；手动移除时标为 `removed`。此后 speech 回到该项目没有克隆记录的状态；两者都不删除远端 Voice。
3. **删除 ElevenLabs 远端 Voice**：单独的高风险操作，必须二次确认并明确说明不可逆影响；只有没有其它本地绑定引用同一 `provider_config_id + remote_voice_id` 时才允许执行。成功后同步移除受影响项目绑定；失败时保留本地绑定并显示真实失败。

### 3.5 当前缺口

1. **voice-clone 阶段无法使用 ElevenLabs**：`useVoiceCloneProvider` 只识别 `cosyvoice`，`elevenLabsTtsProvider.cloneVoice` 未实现。
2. **CosyVoice 契约是自定义假设**：`/voice-clone` 与 `/tts` 并非 CosyVoice 官方标准端点（官方为 `/inference_zero_shot`、`/inference_sft` 等）。
3. **克隆产物（voiceId）不持久化**：`selectedVoiceId` 是 App.vue 的 session-only ref，应用重启后丢失；draft 中只保存了 `voiceSamplePath`。
4. **voice-clone real 是 speech real 的前置阻塞项**：CosyVoice 路径下，speech 必须依赖 voice-clone 阶段先成功。
5. **ElevenLabs 路径下 voice-clone 与 speech 解耦**：ElevenLabs TTS 直接使用 provider 级 `voiceId`，voice-clone 阶段即使跳过也能 speech real；这与 CosyVoice 路径不一致。
6. **缺少零样本/单次克隆的选项**：没有「每次 speech 都上传同一份样本」或「样本直接传给 TTS」的能力。
7. **缺少稳定项目身份**：当前单草稿 / 固定 workflow ID 无法隔离项目级记录。
8. **缺少托管样本目录模型**：没有当前样本根目录配置、根目录记录、导入复制、目录迁移或安全删除语义。
9. **当前 TTS 不消费项目 Voice ID**：`ElevenLabsTtsProvider` 将构造参数 `voiceId` 固化在请求 URL，忽略 `SynthesizeSpeechInput.voiceId`；必须新增 resolver 集成。

---

## 4. 三条路线对比表

### 4.1 路线 A：ElevenLabs Voice Clone（Instant / Professional）

| 维度 | 说明 |
|---|---|
| **用户输入** | 第一版为一个干净音频样本文件、voice name、可选 description；Instant 的效果受样本质量、时长和语音覆盖度影响，产品不承诺固定质量或时长阈值。Professional 需要更长、更高质量的样本，但不在本轮范围。 |
| **API 契约** | `POST https://api.elevenlabs.io/v1/voices/add`，`multipart/form-data`，字段含 `name`、`files`、`description`、`remove_background_noise` 等；响应 `{ voice_id, requires_verification }`。待验证：Professional Voice Clone 是否支持纯 API 完成验证，或必须走 Web UI 语音 CAPTCHA。 |
| **产物** | 服务端返回的持久 `voice_id`，保存在 ElevenLabs 账户；下游 speech 用该 `voice_id` 调用 `/v1/text-to-speech/{voice_id}`。 |
| **由谁保存** | `voice_id` 写入项目级声音克隆记录，关联项目、托管样本和 Provider 配置；`provider_configs.voiceId` 仅保留用户手动设置的默认音色，不被克隆流程覆盖。 |
| **下游 speech 消费** | 复用 ElevenLabs TTS API，但必须新增项目音色 resolver，并让 Provider 使用本次解析得到的 `voiceId`；不能继续只读取构造时的默认音色。 |
| **新配置/凭据/本地依赖** | 复用现有 `elevenlabs-tts` provider 配置（API Key 已在 `provider_secrets`）。可能需要在 `ApiKeyProviderConfig` 中新增可选字段以区分「样本来源」或「克隆时间」，但最小实现可不新增。 |
| **隐私/授权/许可风险** | 必须取得声音主体明确授权；ElevenLabs Terms 要求用户有权克隆该声音；Professional 需要语音验证（防冒用）；付费计划才允许商业用途；Free 计划不可克隆。 |
| **失败时 honest state** | `cloneVoice` 失败返回 `clone-failed` / `unauthorized` / `network`；`selectedVoiceId` 保持空，voice-clone 阶段为 `failed`，speech 阶段因无 `voiceId` 返回 `voice-unavailable`；绝不 fallback 到 mock voiceId。 |
| **测试与 dogfood 难度** | 低。只需一个音频样本 + API Key 即可验证；Instant 处理秒级。但消耗 ElevenLabs credits，需付费计划。 |

### 4.2 路线 B：ElevenLabs Voice Design

| 维度 | 说明 |
|---|---|
| **用户输入** | 文本描述（20–1000 字符）描述想要的音色、年龄、性格、语速等；可选预览文本或 `auto_generate_text`。 |
| **API 契约** | 两步：① `POST /v1/text-to-voice/create-previews`（或 `/v1/text-to-voice/design`），传入 `voice_description`、`text`、`model_id` 等，返回多个 preview，每个含 `generated_voice_id` 与 base64 音频；② 用户选定后 `POST /v1/text-to-voice`，传入 `voice_name`、`voice_description`、`generated_voice_id`，返回持久 `voice_id`。 |
| **产物** | 服务端生成的合成 voice_id；下游 speech 用该 `voice_id` 调用 `/v1/text-to-speech/{voice_id}`。 |
| **由谁保存** | 同路线 A：`voice_id` 写入项目级声音记录，不覆盖 `ApiKeyProviderConfig.voiceId`。 |
| **下游 speech 消费** | 若未来接入，仍需使用项目音色 resolver；不能绕过 resolver 直接读取 Provider 默认 Voice ID。 |
| **新配置/凭据/本地依赖** | 复用 `elevenlabs-tts` provider。需新增 UI 让用户输入 voice description 并选择 preview；可临时用输入框 + 自动选第一个 preview 的最小方案。 |
| **隐私/授权/许可风险** | 不基于真实人声样本，冒用风险较低；但仍需遵守 ElevenLabs Terms，不得生成模仿特定真实人物的声音；付费计划才允许商业用途。 |
| **失败时 honest state** | 同路线 A；preview 生成失败或 create voice 失败均保持 `selectedVoiceId` 为空。 |
| **测试与 dogfood 难度** | 中。需要新增描述输入与 preview 选择交互；预览音频需播放；两步 API 调用，消耗 credits。 |
| **是否满足「克隆」定义** | **不满足**。Voice Design 是「用文字描述生成合成音色」，不是「用已有声音样本复制特定人声」。若产品需求明确为「克隆我的声音」，此路线不可作为替代方案。 |

### 4.3 路线 C：本地 CosyVoice 零样本 / 声音克隆

| 维度 | 说明 |
|---|---|
| **用户输入** | 一段 3–15 秒参考音频（`prompt_wav`），可选该音频对应的文本（`prompt_text`）。 |
| **API 契约** | 官方 CosyVoice FastAPI 提供 `/inference_zero_shot`（`GET`/`POST`，form-data，字段 `tts_text`、`prompt_text`、`prompt_wav`），返回音频流（非 JSON）；亦有 `/inference_sft`（按 `spk_id`）、`/inference_cross_lingual`、`/inference_instruct` 等。当前代码中的 `/voice-clone` + `/tts` 是**项目自定义 wrapper**，非官方。 |
| **产物** | 零样本模式下**没有中间 voice_id**，每次调用直接输出音频；若团队自建 wrapper，可返回自定义 `{ voiceId, samplePath }` 再调 `/tts`。 |
| **由谁保存** | 若走官方零样本：保存 `voiceSamplePath`，每次 speech 都需重新上传样本；若走自定义 wrapper：保存 wrapper 返回的 `voiceId`。 |
| **下游 speech 消费** | 官方零样本：speech 阶段需把 `voiceSamplePath` 作为 `prompt_wav` 再次调用 `/inference_zero_shot`；自定义 wrapper：复用现有 `CosyVoiceProvider` 的 `/tts` 路径。 |
| **新配置/凭据/本地依赖** | 复用现有 `cosyvoice` provider 配置（baseUrl、apiKey 可选、model）；需在本地运行 CosyVoice 服务：Python 环境、PyTorch、模型权重、足够 CPU/GPU。 |
| **隐私/授权/许可风险** | 完全本地，样本不上传第三方；CosyVoice 代码与模型权重为 Apache 2.0，可商业使用（需确认具体 checkpoint 的 license）。仍需用户确保样本有权使用。 |
| **失败时 honest state** | 服务未启动 → `not-connected`；调用失败 → `clone-failed` / `synthesis-failed`；不伪造 voiceId 或音频。 |
| **测试与 dogfood 难度** | 高。需要本地部署 CosyVoice、下载模型、解决依赖与硬件问题；官方 API 与当前自定义 skeleton 不兼容，可能需要重写 provider。 |

### 4.4 综合对比表

| 维度 | A. ElevenLabs Voice Clone | B. ElevenLabs Voice Design | C. 本地 CosyVoice |
|---|---|---|---|
| 是否真正「克隆」 | ✅ 是 | ❌ 否（合成音色） | ✅ 是 |
| 与现有 TTS 集成度 | 高（直接复用 elevenlabs-tts） | 高 | 中/低（需改 provider 或 wrapper） |
| 本地部署成本 | 无 | 无 | 高 |
| 第三方依赖/费用 | ElevenLabs API + 付费计划 | ElevenLabs API + 付费计划 | 无（仅硬件与电费） |
| 隐私保护 | 样本上传 ElevenLabs | 无样本 | 完全本地 |
| 商业授权复杂度 | 需遵守 ElevenLabs Terms | 需遵守 ElevenLabs Terms | Apache 2.0，相对简单 |
| dogfood 难度 | 低 | 中 | 高 |
| 对现有代码改动量 | 小 | 中（新增描述/preview UI） | 大（可能重写 CosyVoiceProvider） |
| 产物持久化 | 项目级克隆记录关联 voice_id | 项目级声音设计记录关联 voice_id | 样本路径进 draft，或 wrapper voiceId |
| 推荐优先级 | **首选** | 仅当明确要「合成新音色」 | 当本地部署为硬性约束时 |

---

## 5. 推荐方案与取舍

### 5.1 推荐路线

**推荐：路线 A — ElevenLabs Instant Voice Clone**，作为最小可验证子项目。

理由：

1. **与现有 TTS API 衔接清晰**：ElevenLabs 普通 TTS 已验收；本轮需要增加受项目记录约束的 Voice ID resolver，而不是重做 TTS API 调用。
2. **改动量可控**：不新增 provider 类型、不需要本地 GPU；但需要项目身份、SQLite 记录、样本目录设置与迁移。
3. **dogfood 最快**：有样本 + API Key 即可秒级验证，适合第一版可用 release。
4. **接口契约官方明确**：`POST /v1/voices/add` 为 ElevenLabs 官方公开端点，不需要团队维护 wrapper。
5. **产物可持久化**：`voice_id` 写入项目级 SQLite 记录，重启后当前项目的 speech 阶段可复用，且不会改变其它项目的默认音色。

### 5.2 不推荐的取舍

- **不选 B 作为「克隆」方案**：Voice Design 是文字生成音色，不满足用户/产品对「克隆我的声音」的语义。
- **不优先选 C**：本地 CosyVoice 虽然隐私最好，但当前代码中的 `/voice-clone` / `/tts` 是自定义假设，官方 API 与现有 skeleton 差距大；作为「最小可验证子项目」风险过高。

### 5.3 若用户坚持本地/隐私优先

则选择 **路线 C**，但必须同时决策：

- 是否接受重写 `CosyVoiceProvider` 以对接官方 `/inference_zero_shot`？
- 还是团队自行维护一个兼容现有 `/voice-clone` + `/tts` 的 wrapper 服务？
- 是否允许零样本模式不生成持久 voice_id，而由 speech 阶段每次上传同一份样本？

---

## 6. 用户必须确认的决策

1. **已决定：使用 ElevenLabs Instant Voice Clone（用户自配 API）。**
   - 本轮不接入本地 CosyVoice、不实现 Professional Voice Clone，也不把 Voice Design 作为声音克隆替代方案。

2. **已决定：只允许用户上传本人或已取得授权的声音样本。**
   - voice-clone 阶段必须提供未默认勾选的「我确认拥有该声音的使用与克隆授权」确认项；未勾选时不得发起 API 请求。

3. **已决定：ElevenLabs 克隆一次生成项目级 `voice_id`，在该项目内持久复用。**
   - `voice_id` 关联项目和托管样本记录，不覆盖 `ApiKeyProviderConfig.voiceId`。
   - Provider 配置中的 `voiceId` 仍是用户手动设置的默认音色，仅在当前项目没有克隆记录时作为 speech 的 fallback。

4. **样本文件的本地保存策略与删除策略？**
   - **已决定**：用户在设置中选择声音样本存储目录；应用在克隆前复制用户选中的文件到该托管目录，并把样本元数据与相对路径记录到 SQLite。
   - **已决定**：克隆成功后保留该托管副本，直到用户从声音库手动删除；删除副本仅标记样本本地不可用，项目级远端 Voice 绑定仍保留并可合成。
   - 应用不得自动删除或移动用户选择的原始文件。

5. **Professional Voice Clone 是否纳入范围？**
   - Instant Voice Clone 已足够第一版；Professional 需要更严格验证、更长音频、更高费用，建议后续迭代。

6. **Voice Design 是否作为独立功能保留？**
   - 若未来需要「用文字创造新角色声音」，可单独规划；本次不混入 voice-clone。

---

## 7. 选定路线后预计影响的文件与接口

假设选择 **路线 A（ElevenLabs Instant Voice Clone）**：

### 7.1 候选改动文件

| 文件 | 改动内容 |
|---|---|
| `packages/provider-ai/src/types.ts` | 可选：在 `CloneVoiceInput` 增加 `voiceName?: string`、`description?: string`；明确 `CloneVoiceResult.voiceId` 语义。 |
| `packages/provider-ai/src/elevenLabsTtsProvider.ts` | **主要改动**：实现 `cloneVoice(input)`；TTS 必须使用调用级解析出的 `voiceId`。IVC 上传使用专用 multipart/JSON transport，不复用只支持字符串 body / 二进制响应的 `FetchBinary`。 |
| `packages/provider-ai/src/types.ts` | 增加受限的样本读取抽象、multipart/JSON 上传抽象和 IVC 响应类型；声明大小、MIME、文件名与错误映射边界。 |
| `apps/desktop/src/composables/useVoiceCloneProvider.ts` | 路线 A 的 real 模式**只**识别用户明确选择的 `elevenlabs-tts`；仅有 `cosyvoice`、未选择或选中不可用 ElevenLabs 时返回 `not-configured`，不创建 CosyVoice provider、更不进行 fallback。 |
| `apps/desktop/src/composables/useSpeechProvider.ts` | 新增唯一 `resolveSpeechVoice(projectId)`：有效项目克隆记录优先；无记录才用默认音色；绑定 Provider 不可用时返回 `project-voice-unavailable`，不 fallback。 |
| `apps/desktop/src/App.vue` `case "voice-clone"` | 在授权、SQLite 和当前样本根目录校验都成功后，协调 `creating(request_started_at)`、样本复制、远端上传、`remote-created` 诊断检查点、验证状态、补偿删除和 active 原子替换；诊断检查点写入失败时只报告“远端结果未记录”，不伪造持久状态；speech 调用 resolver。 |
| `apps/desktop/src/runtime/desktopDraft.ts` / `composables/useWorkbenchDraft.ts` | 旧草稿首次恢复时生成并立即持久化稳定项目 UUID；SQLite 不可用时不得让 real voice-clone 进入 localStorage fallback。 |
| `packages/core/src/types.ts` / `validation.ts` | 为 `ProjectDraft` 添加稳定项目 ID；新增声音样本 / 项目克隆记录类型、状态和授权确认字段。 |
| `apps/desktop/src/composables/useAppSettings.ts` / `components/settings/OutputStorageSettings.vue` | 新增真实持久化的 `activeVoiceSampleStorageRootId` 与“声音样本存储目录”选择器；目录路径由 `voice_sample_storage_roots` 保存，而不是会话内预览。 |
| `packages/local-store/src/schema.ts` / `migrate.ts` / `repositories.ts` | 新增 `voice_sample_storage_roots`、`voice_samples`、包含 `request_started_at` / `remote_created_at` 的 `project_voice_clones`；建表后在 `migrate.ts` 幂等执行 `CREATE UNIQUE INDEX IF NOT EXISTS idx_project_voice_clones_one_active ON project_voice_clones(project_id) WHERE state = 'active'`，并提供“远端检查点”与原子替换 active 绑定的方法。迁移必须幂等、保留旧数据且不读写 `provider_secrets`。 |
| `apps/desktop/src-tauri/src/lib.rs` | 新增或复用受限 native 文件操作：只把托管副本写入选定根目录，拒绝目录穿越、符号链接、非普通文件、超大文件和部分复制残留；远端 Voice 删除必须与本地删除分离。 |
| `apps/desktop/src/components/workbench/stages/VoiceCloningStage.vue` | 增加 ElevenLabs Provider 选择、voice name、授权确认、上传/额度告知、样本目录状态和克隆状态；未授权或未选择可用 Provider 时按钮不可执行。 |
| `packages/provider-ai/tests/elevenlabs-tts-provider.test.ts` | 新增 `cloneVoice` 单元测试。 |
| `apps/desktop/src/composables/useVoiceCloneProvider.test.ts` | 若不存在则新增，覆盖选择器逻辑。 |
| `apps/desktop/src/App.provider-runtime.test.ts` | 新增 voice-clone executor 集成测试。 |

### 7.2 接口草案（ElevenLabs Voice Clone）

```ts
// packages/provider-ai/src/types.ts
export interface CloneVoiceInput {
  voiceSamplePath: string;
  projectId: string;
  sampleId: string;
  voiceName?: string;        // 新增：在 ElevenLabs 账户中显示的名称
  description?: string;      // 新增：可选描述
}

export interface CloneVoiceResult {
  voiceId: string;
  samplePath: string;
  requiresVerification?: boolean; // IVC 也可能要求验证
}

export type ReadAudioFile = (path: string) => Promise<{ bytes: Uint8Array; fileName: string; mimeType: string }>;

export type UploadVoiceSample = (input: {
  apiKey: string;
  name: string;
  description?: string;
  file: { bytes: Uint8Array; fileName: string; mimeType: string };
}) => Promise<{ status: number; voiceId?: string; requiresVerification?: boolean }>;

/** 用于用户明确删除或本地提交失败后的最佳努力补偿；不是 TTS 请求。 */
export type DeleteRemoteVoice = (input: { apiKey: string; voiceId: string }) => Promise<{ status: number }>;

// IVC 必须使用独立 multipart/JSON transport；现有 FetchBinary 仅服务 TTS 音频响应。
export interface ElevenLabsTtsProviderOptions {
  apiKey: string;
  model: string;
  writeFile: WriteAudioFile;
  readDuration: ReadAudioDuration;
  readAudioFile: ReadAudioFile;    // 读取经文件边界校验的托管样本
  uploadVoiceSample: UploadVoiceSample;
  deleteRemoteVoice: DeleteRemoteVoice;
  fetchBinary?: FetchBinary;
}
```

```ts
// packages/provider-ai/src/elevenLabsTtsProvider.ts
async cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult> {
  if (!this.apiKey) throw new AiProviderError("not-configured", "...");
  if (!input.voiceSamplePath.trim()) throw new AiProviderError("not-configured", "...");
  if (!input.voiceName?.trim()) throw new AiProviderError("not-configured", "...");

  const audioBytes = await this.readAudioFile(input.voiceSamplePath);
  // uploadVoiceSample 负责 multipart/form-data + JSON 响应解析；不得使用 FetchBinary。
  // 字段：name, files, description, remove_background_noise；响应：{ voice_id, requires_verification }
  // 错误映射：401/403 → unauthorized；非 2xx → clone-failed；网络 → network
}

async synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
  const voiceId = input.voiceId.trim();
  if (!voiceId) throw new AiProviderError("voice-unavailable", "本次合成没有可用音色。");

  // endpoint 必须使用 voiceId，而不是 this.voiceId：
  // /v1/text-to-speech/${encodeURIComponent(voiceId)}
  // resolver 已在调用前决定它来自项目克隆记录或 Provider 默认音色。
}
```

### 7.3 若选择路线 C（本地 CosyVoice）

此段只保留为未来独立方案；不得进入路线 A 的 selector、实现计划或 real fallback。

- 必须重写 `CosyVoiceProvider.synthesizeSpeech` 以支持官方 `/inference_zero_shot`。
- 可能取消 `cloneVoice` 的必要性：把 `voiceSamplePath` 直接传给 speech 阶段作为 `promptWav`。
- 需要新增 `promptText?: string` 字段到 `SynthesizeSpeechInput`。
- 产物为音频流，需前端写入文件并探测时长（复用 ElevenLabs 已有的 `writeFile` + `readDuration` 抽象）。

---

## 8. 安全 / 授权 / 数据保留边界

### 8.1 API Key 与凭据

- API Key 仅保存在 `provider_secrets`，不进入 `provider_configs`、draft、snapshot、日志、任务 payload、测试 fixture。
- 错误信息中不得包含 `xi-api-key`、完整响应体、baseUrl 中的 token、样本绝对路径。
- Provider 实现类接收的 `apiKey` 仅允许保存在内存。

### 8.2 声音样本

- 样本文件不上传到普通 snapshot；应用把托管副本保存到当前 `storageRootId` 对应目录，SQLite 保存 `storageRootId + relativePath`、文件名、MIME、大小、项目 ID 与创建时间。
- `voice_sample_storage_roots` 保存用户选定目录；改变默认目录只影响新导入。旧根目录不可达时，样本显示不可用，历史记录不被重写。
- 没有有效且可写的当前样本根目录时，real voice-clone 必须停止；不能为方便而回退到 `audioOutput`、临时目录或 localStorage。根目录仍被任何样本记录引用时只能停用，不能删除其记录。
- 若使用 ElevenLabs，授权确认旁必须明确告知样本会上传到 ElevenLabs、请求可能消耗用户自己的额度；授权通过后才可复制、读取与上传。
- 删除本地样本副本仅删除托管文件并标记样本不可用，不删除用户原文件，也**不会删除** ElevenLabs 账户中的远端 Voice；项目克隆记录仍可用于 TTS。移除项目绑定和删除远端 Voice 均是独立操作，后者必须单独解释影响并要求明确确认。
- 文件复制、读取和删除必须拒绝符号链接、非普通文件、超出限制的文件、目录穿越与复制失败残留；错误不得泄露样本绝对路径。

### 8.3 授权与合规

- 产品文案必须提示用户：只能克隆本人或已取得明确授权的声音。
- voice-clone 阶段必须增加未默认勾选的授权确认项；未勾选时不得复制、读取、上传、调用 API，也不得显示为已克隆。
- SQLite 记录 `consentedAt` 与 `consentPolicyVersion`，使后续审计能解释用户接受的是哪一版告知文案。
- ElevenLabs Professional Voice Clone 的验证步骤建议后续再接入；Instant Voice Clone 也需遵守 ElevenLabs Terms。

### 8.4 产物保留

- ElevenLabs 生成的 `voice_id` 保存在 ElevenLabs 账户，同时写入项目级克隆记录；不得覆盖 `provider_configs.voiceId`。
- `project_voice_clones.providerConfigId` 必须指向创建它的 Provider 配置。该配置被删除、禁用、缺失凭据或远端 Voice 无法访问时，项目进入 `project-voice-unavailable`，不得改用默认 Voice ID。
- `requiresVerification: true` 只会在已持久化 `remote_voice_id` 后产生 `pending-verification` 记录，绝不产生可合成的 active 记录。新克隆在变为 active 前失败时，旧 active 音色必须保持不变；active 事务失败时必须保留 `remote-created` 检查点、尝试远端补偿删除，并以 `remote-cleanup-required` 诚实报告无法清理的情况。
- 若连远端 ID 的检查点也写入失败，当前 UI 只可报告 `remote-outcome-unrecorded`：远端可能已创建但应用没有可靠本地记录；不得显示 Voice ID、不得写 localStorage/普通日志、不得承诺重启后可清理。重启时发现已有 `request_started_at` 但没有 `remote_voice_id` 的 `creating` 记录，必须显示同一风险提示且不自动重试上传或删除。
- 重启发现已记录 `remote-created` 但尚未完成 active 替换时，必须提供可定位的恢复状态；第一版只能让用户明确选择清理该远端 Voice，不能自动把它提升为 active 或再次上传样本。
- 应用重装或更换机器后，恢复对应项目的克隆记录、Provider 配置、凭据和托管样本目录后可继续合成；若 ElevenLabs 端删除 voice，则该项目 speech 失败。

---

## 9. TDD、集成测试、人工 dogfood 验收标准

### 9.1 TDD 单元测试（`packages/provider-ai`）

使用 fake transport / fake filesystem，不联网、不消耗额度。

#### ElevenLabs Voice Clone 测试

- 给定 fake `readAudioFile` 返回样本字节、fake `uploadVoiceSample` 返回 `{ status: 200, voiceId: "vc-123", requiresVerification: false }` → 断言 `cloneVoice` 返回 `voiceId === "vc-123"`。
- 缺少 `voiceSamplePath` → `not-configured`。
- 缺少 `voiceName` → `not-configured`（若实现该校验）。
- multipart upload 成功但 JSON 缺 `voice_id` → `clone-failed`；不得把音频二进制 transport 当作 JSON transport 使用。
- HTTP 401/403 → `unauthorized`，message 不含 API Key。
- HTTP 500 → `clone-failed`，message 不含响应体。
- 网络异常 → `network`。
- 响应缺少 `voice_id` → `clone-failed`。
- 错误 message 不含样本绝对路径、API Key、baseUrl token。

#### Provider 选择器测试

- real 模式下，存在 enabled + ready 的 `elevenlabs-tts` provider（apiKey 非空）→ 返回 `ElevenLabsTtsProvider`。
- real 模式下仅有 enabled + ready 的 `cosyvoice`，或用户未明确选择 ElevenLabs → 返回 `not-configured`；断言不创建 `CosyVoiceProvider`、不请求自定义端点。
- 用户明确选择的 ElevenLabs 被禁用、缺少凭据或不存在 → 返回 `not-configured`；不得改选其它 ElevenLabs 或 CosyVoice。

#### 项目音色 resolver 与 SQLite 迁移测试

- 当前项目有有效 `project_voice_clones` 记录 → ElevenLabs TTS 请求 URL 使用该记录的 `voiceId`。
- 当前项目没有克隆记录 → 仅此时使用 Provider 默认 `voiceId`。
- 克隆记录绑定的 Provider 被禁用、删除或凭据缺失 → 返回 `project-voice-unavailable`，断言不会请求默认 Voice ID。
- 存在多个启用 ElevenLabs Provider → 仅使用用户在克隆阶段明确选择并写入记录的 `providerConfigId`；不得按数组顺序选择。
- 同一项目再次克隆成功 → 原 active 记录变为 `replaced`，新记录唯一为 `active`；resolver 只能选择新记录。
- 没有当前样本根目录、根目录不可写或仍在引用的根目录被请求删除 → 返回明确存储错误，断言不发生样本复制、读取或网络上传。
- ElevenLabs 返回 `requiresVerification: true` → 只持久化 `pending-verification`，resolver 不得选择它，旧 active 记录保持不变。
- ElevenLabs 返回 voiceId 后、active 替换前 → 断言先独立提交 `remote_voice_id + remote_created_at + remote-created`；重启后可从该记录定位并继续清理，不得把检查点与 active 替换合并为同一事务。
- 远端 Voice 创建成功而本地 active 原子事务失败 → 检查点记录保持可恢复，绝不报告克隆成功或替换旧 active；断言执行一次最佳努力远端删除，删除失败时把该记录转为 `remote-cleanup-required`。
- 远端 Voice 创建成功但 `remote-created` 检查点写入失败 → 当前进程仍应最佳努力远端删除；若删除失败或模拟进程崩溃，断言没有 active/假成功/泄露标识符，重启后由带 `request_started_at` 的 `creating` 记录显示 `remote-outcome-unrecorded`，不自动上传、重试或删除。
- 旧 `default` Workbench draft 首次恢复 → 生成稳定项目 UUID 并立即持久化；再次恢复时 UUID 不变。
- 旧 SQLite 数据库迁移 → 新表及 `idx_project_voice_clones_one_active` partial unique index 创建成功；第二次迁移不重复建列/建索引；同一项目插入两条 `active` 记录会被该索引拒绝；已有 provider 配置和 `provider_secrets` 不被读取或改写。
- 改变当前样本目录后新样本进入新的 `storageRootId`，旧样本仍用原 `storageRootId` 解析；旧根目录不可达时显示样本不可用。
- 未授权 → 断言不发生文件复制、样本读取或网络上传。
- SQLite 不可用 → 返回 `local-store-unavailable` / `not-connected`，断言不发生文件复制、样本读取、网络上传或 localStorage 写入。

### 9.2 集成测试（`apps/desktop`）

- `App.provider-runtime.test.ts`：注入 fake voice-clone provider，断言成功时项目级克隆记录写入、当前项目的 speech resolver 取到该 Voice ID；失败时阶段状态为 `failed`、不伪造 voiceId。
- `useVoiceCloneProvider.test.ts`：覆盖选择器各种配置状态。

### 9.3 安全测试

- 断言错误 message 不含 `xi-api-key`、样本路径、完整响应体。
- 断言 snapshot/draft 不保存 API Key。
- 断言 `provider_secrets` 中 credentialRef 对应正确 API Key。

### 9.4 人工 dogfood 验收标准

- [ ] 在设置中添加/编辑 `elevenlabs-tts` provider，保存后 API Key 可恢复。
- [ ] 进入 voice-clone 阶段，选择本地 `.wav` / `.mp3` 样本文件，点击「开始克隆」。
- [ ] 未勾选授权确认时，开始克隆不可执行，且没有产生托管副本或网络请求；勾选处显示 ElevenLabs 上传和额度告知。
- [ ] 选择的样本被复制到设置中指定的声音样本目录；数据库记录使用根目录 ID 和相对路径，用户原文件未被移动或删除。
- [ ] 未选择或无法写入声音样本目录时，voice-clone 显示明确存储错误，不复制、不读取、不调用 ElevenLabs，也不回退到其它目录。
- [ ] 真实调用 ElevenLabs `/v1/voices/add` 后，界面显示生成的 Voice ID。
- [ ] 生成的 Voice ID 自动写入当前项目的克隆记录并持久化到 SQLite，不改变 Provider 默认 Voice ID。
- [ ] 进入 speech 阶段，使用项目克隆记录绑定的同一 Provider 配置和远端 Voice ID 成功合成；项目 B 不受项目 A 克隆影响。
- [ ] 重启应用后，speech 阶段可复用已保存的 Voice ID，不重复克隆。
- [ ] 禁用或删除绑定 Provider 后，项目显示“克隆音色不可用”，不会静默回退默认 Voice ID；删除本地样本不会删除远端 Voice。
- [ ] 同一项目再次克隆后，新克隆成为唯一 active 音色；旧项目绑定不会被 resolver 选中。
- [ ] ElevenLabs 要求验证时，界面显示“等待 Provider 验证”，该记录不能用于 speech，且原 active 音色不被替换。
- [ ] 远端创建成功后，先可在 SQLite 看到带 remote Voice ID 的 `remote-created` 检查点；随后模拟 active 替换失败时，界面不显示成功、不替换原音色，重启后仍可定位并清理该远端 Voice。
- [ ] 模拟远端返回成功但检查点写入失败或进程中断时，界面只显示“远端结果未记录、请到 Provider 账户核对”；不展示 ID、不伪称可恢复/清理、不写 localStorage 或普通日志。
- [ ] 模拟 SQLite 不可用时，voice-clone 显示本地存储不可用，且不复制样本、不调用 ElevenLabs、不写 localStorage。
- [ ] 若克隆失败（如 API Key 错误、样本格式不支持），阶段状态为 `failed`，错误信息不含 API Key / 样本路径 / 响应体，不 fallback 到 mock。
- [ ] 仅配置 CosyVoice、未选择 ElevenLabs 或选中 ElevenLabs 不可用时，路线 A 显示“需要配置 ElevenLabs”，不创建 CosyVoice provider、不请求任何 CosyVoice 自定义端点，也不 fallback。

---

## 10. 明确 BLOCKED 条件

以下条件任一未满足时，本设计不应进入实现：

1. **稳定项目 ID 与项目级记录模型未实现并测试**：没有可恢复的项目 ID、Provider 绑定和 resolver 时不得开始 voice-clone 实现。
2. **样本目录根记录、受限文件操作与目录变更恢复模型未实现并测试**：不得仅存绝对路径或静默重写历史记录。
3. **授权确认与执行边界未实现并测试**：未勾选时必须阻止复制、读取和网络上传。
4. **SQLite 硬依赖与唯一 active 项目绑定未实现并测试**：数据库不可用时不得降级到 localStorage；每项目必须始终只有一条 resolver 可选的 active 绑定。
5. **样本根目录、远端检查点与补偿状态未实现并测试**：没有可写 root 时不得开始；远端返回 ID 后必须先持久化 `remote-created` 检查点，再尝试 active 替换；`pending-verification` / `remote-created` / `remote-cleanup-required` 不得被 resolver 选中，也不得伪造成功。检查点本身写入失败时必须显示远端结果未记录，而非伪造可恢复状态。
6. **路线 A selector 未收紧并测试**：real voice-clone 必须只接受用户明确选择的 ElevenLabs；CosyVoice 配置只能保留数据、不得成为真实 fallback 或发起自定义端点请求。
7. **ElevenLabs API Key / 付费计划未就绪**：需要可用且有余额的 API Key；否则 dogfood 无法进行。

---

## 参考来源

- ElevenLabs Voice Clone API 概述：[ElevenLabs Docs — Voice cloning concepts](https://elevenlabs.io/docs/eleven-api/concepts/voice-cloning)
- ElevenLabs Professional Voice Cloning quickstart：[ElevenLabs Docs — Professional Voice Cloning](https://elevenlabs.io/docs/eleven-api/guides/how-to/voices/professional-voice-cloning)
- ElevenLabs Voice Design quickstart：[ElevenLabs Docs — Voice Design](https://elevenlabs.io/docs/eleven-api/guides/how-to/voices/voice-design)
- ElevenLabs Text-to-Voice API reference：[ElevenLabs Docs — Create a voice](https://elevenlabs.io/docs/api-reference/text-to-voice/create)
- CosyVoice REST API Server 说明：[DeepWiki — CosyVoice REST API Server](https://deepwiki.com/FunAudioLLM/CosyVoice/5.2-rest-api-server)
- CosyVoice 许可证讨论：[GitHub Issue #598](https://github.com/FunAudioLLM/CosyVoice/issues/598)
- 本项目上一版 TTS 方案：`docs/superpowers/plans/2026-07-10-real-tts-provider.md`
- 本项目状态：`docs/superpowers/PROJECT-STATE.md`
