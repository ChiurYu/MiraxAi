# 百炼 Qwen-TTS 与 CosyVoice 声音复刻设计

> 日期：2026-07-13
> 状态：待用户确认后实施
> 范围：在保留 ElevenLabs 的前提下，为 Workbench 的声音克隆与语音合成增加两个真实阿里云百炼 Provider：Qwen-TTS 与 CosyVoice。

## 1. 已确认的产品决策

1. 优先接入中国模型能力，保留已有 ElevenLabs 配置和项目级克隆记录，不迁移、不覆盖既有数据。
2. 本轮接入两个百炼 Provider：
   - `bailian-qwen-tts`：`qwen3-tts-vc-2026-01-22`，本地受管样本直接以 data URI 上传百炼并创建音色。
   - `bailian-cosyvoice`：默认 `cosyvoice-v3.5-flash`，由用户先手工上传同一份样本到 OSS，并在声音克隆页粘贴一个临时 HTTPS 访问 URL。
3. 本轮**不**接入 OSS 上传、Bucket 配置、AccessKey/STS、对象列表或对象删除；这些是验证通过后的独立任务。
4. MiniMax 不在本轮范围：它同样要求音频 URL，且首次使用复刻音色合成有额外解锁成本。

## 2. 用户流程

### 2.1 Qwen-TTS

```text
设置：添加“百炼 Qwen-TTS” → API Key + 业务空间 API Base URL
  → 工作台：选择该 Provider、本地样本、声音名称、授权确认
  → 复制样本到本地受管目录并写入 SQLite 审计记录
  → 百炼创建 Qwen 音色（data URI）→ 保存 voice ID → 原子激活项目克隆
  → speech 阶段解析同一 providerConfigId + voice ID，下载百炼 24 小时音频 URL 到本地产物
```

### 2.2 CosyVoice（手工 OSS URL）

```text
用户手工将“所选本地样本的同一文件”上传到自己的 OSS
  → 生成短期 HTTPS 签名 URL
  → 设置：添加“百炼 CosyVoice” → API Key + 业务空间 API Base URL
  → 工作台：选择该 Provider、本地样本、粘贴 OSS URL、声音名称、授权确认
  → 仍复制本地样本到受管目录，仅用于本地审计与恢复
  → 百炼用临时 OSS URL 创建 CosyVoice 音色 → 保存 voice ID → 原子激活项目克隆
  → speech 阶段使用同一 providerConfigId + voice ID，下载百炼音频 URL 到本地产物
```

本地样本和 OSS URL 必须都提供：前者保证既有本地审计/授权/项目绑定不被破坏；后者满足 CosyVoice API 的可访问 URL 要求。应用无法验证两者是否同一文件，因此 UI 必须明确要求用户上传所选样本的同一份副本。

## 3. API 与配置契约

### 3.1 配置

新增 provider 类型 `bailian-qwen-tts`、`bailian-cosyvoice`。两者复用现有安全配置存储：

- `apiKey` 仅从 `provider_secrets` 加载到运行内存，且只作为请求 Authorization header 使用。
- `baseUrl` 是业务空间 API 根路径，例如 `https://<WorkspaceId>.cn-beijing.maas.aliyuncs.com/api/v1`；保存与运行前都移除用户名、密码、query 和 hash。
- `model` 是创建音色与合成必须一致的模型。设置页为两类 provider 提供限定的模型选择，避免用户误填不兼容模型。
- Qwen 与 CosyVoice 均需 `enabled + apiKey + baseUrl + model` 才显示“已就绪”。没有稳定、无计费副作用的官方 health endpoint，因此本轮不新增“测试连接”请求。

### 3.2 Qwen-TTS

- 创建：`POST {baseUrl}/services/audio/tts/customization`，模型固定为 `qwen-voice-enrollment`，`target_model` 为配置模型，音频为 `data:<mime>;base64,...`，从 `output.voice` 取 voice ID。
- 合成：`POST {baseUrl}/services/aigc/multimodal-generation/generation`，模型为配置模型，传 `input.text` 和 `input.voice`；读取 `output.audio.url`，立即下载到既有受限本地 audioOutput 目录。
- 只接受 Qwen 官方样本要求范围内的文件；原生层现有安全导入约束继续生效。UI 额外提示推荐 10–20 秒、单声道、24 kHz 以上、无背景音乐。

### 3.3 CosyVoice

- 创建：`POST {baseUrl}/services/audio/tts/customization`，模型 `voice-enrollment`，`action: create_voice`，`target_model` 为配置模型，提交安全派生的 `prefix` 与用户本轮粘贴的 HTTPS URL。
- 合成：`POST {baseUrl}/services/audio/tts/SpeechSynthesizer`，传 `model`、`input.text`、`input.voice`、`format: wav`、`sample_rate: 24000`；读取返回的 24 小时音频 URL，立即下载到既有受限本地 audioOutput 目录。
- 本轮只允许 `https:` URL；URL 必须仅存在于当前 Vue 运行会话与单次请求体，**绝不**写入 SQLite、draft、localStorage、测试快照、错误消息或日志。请求结束、切换 provider 或离开阶段后清空输入。
- OSS 签名 URL 的 query 是访问授权的一部分，因此不可在真正请求前调用通用 Base URL 清洗；取而代之，禁止它进入任何持久化/展示错误路径。

## 4. 生命周期、解析与失败语义

保留现有 `creating → remote-created → active` 检查点和原子替换约束：新的百炼克隆仅在远端 voice ID 已落 SQLite 后才能替换旧 active。clone 记录的 `provider` 保存实际 provider 类型，speech resolver 只使用同一个 `providerConfigId` 的 active clone；禁用、删除或失配配置时显示真实不可用，不回退到其他 Provider 默认声音。

远端创建失败、音频 URL 下载失败、响应字段缺失、鉴权失败、网络失败均返回已清理的 `AiProviderError`。错误不得包含 API Key、完整 OSS URL、样本本地路径、Authorization header 或原始响应体。

百炼不在当前远端删除补偿范围内：本轮 provider 不暴露删除 API；本地写入失败后保留 `remote-cleanup-required`，提示用户到百炼控制台核对/删除，不能谎称已清理。

## 5. 实施范围与测试验收

### 实施范围

- core provider union、配置校验、设置页模型预设和 readiness；
- 新的 `BaiLianTtsProvider`，以注入 transport / downloader / writer 完成可测的 Qwen 与 CosyVoice创建、合成、音频落盘；
- voice-clone provider selector、生命周期配置校验、项目 voice resolver 和 speech selector；
- 声音克隆 UI 的百炼 Provider 提示、CosyVoice 临时 OSS URL 输入与授权文案；
- 不改变 ElevenLabs 的既有成功路径。

### 必须先写的失败测试

1. 配置的 API Key、base URL、model 缺失时不能进入 real 路径；浏览器快照没有 API Key。
2. Qwen clone 发出 data URI、解析 `output.voice`，合成下载 `output.audio.url` 并写到受限输出目录。
3. CosyVoice clone 仅在提供 HTTPS URL 时发请求；URL 不出现在持久化 payload、UI 错误或失败诊断；CosyVoice 合成使用官方 SpeechSynthesizer endpoint。
4. provider selector 只接受用户明确选定且 ready 的百炼配置；不把百炼失败回退到 ElevenLabs、mock 或旧自定义 CosyVoice endpoint。
5. lifecycle 为 Qwen / CosyVoice 写入正确 provider 类型并保持 `remote-created` 检查点与 active 原子替换；CosyVoice URL 不写入克隆/样本记录。
6. speech resolver 仅以 active clone 的 provider config + voice ID 合成；返回的临时音频 URL 不作为项目草稿产物保存，最终只保存本地受限产物路径。

### 验收标准

- 可在设置中分别添加、保存、重启恢复 Qwen-TTS 与 CosyVoice 百炼配置，密钥不进入浏览器快照。
- Qwen 用本地受管样本完成真实创建；CosyVoice 用用户粘贴的临时 OSS URL 完成真实创建。
- 两种 voice ID 均能在对应项目的 speech 阶段实际生成可播放的本地音频。
- focused tests、`pnpm typecheck`、desktop web build 与 `git diff --check` 通过；手动测试前不声称远端百炼调用已验证。

## 6. 后续独立任务

验证通过后再接入 OSS：由用户选择 Bucket/Region，使用 STS 临时凭证上传私有对象，生成短效签名 URL，克隆完成后按用户选择保留或删除对象。该任务需要单独设计凭证保存、对象生命周期和数据删除语义，不能与本轮手动 URL 输入混合。
