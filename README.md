# Mirax AI

Mirax AI 是一个本地优先的短视频创作桌面工作台，目标是串联「素材解析 → 文案改写 → 声音克隆 → 语音合成 → 数字人 → 视频合成 → 复核与发布」。

> 当前处于 dogfood 阶段，主要在 macOS 上开发和验证。素材转写、文案改写、百炼 Qwen 声音克隆与语音合成已经接入真实能力；数字人、完整视频合成和真实发布仍在开发中。

## 已实现能力

- 本地视频通过 FFmpeg 抽取音频，支持 OpenAI `whisper-1` 或本地 faster-whisper 转写。
- 支持 OpenAI Compatible Provider 完成文案改写，并显式选择当前使用的 Provider。
- 支持将已授权声音样本复制到用户选择的受管目录，不移动原始文件。
- 支持百炼 Qwen-TTS 中文声音克隆，并将 Voice ID 绑定到当前项目。
- 支持使用项目克隆声音进行真实语音合成、本地播放、重新合成、另存为和文件定位。
- 使用 SQLite 保存草稿、设置、Provider 密钥、样本记录、项目声音绑定和本地语音产物。
- 应用重启后可恢复项目、工作流状态、声音绑定和仍然存在的本地语音产物。

## 能力状态

| 工作流阶段 | 当前实现 | 状态 |
| --- | --- | --- |
| 素材解析 / 转写 | FFmpeg、OpenAI Whisper、本地 faster-whisper | 真实可用 |
| 文案改写 | OpenAI Compatible Provider | 真实可用 |
| 声音克隆 | 百炼 Qwen-TTS | 已完成真实 dogfood |
| 声音克隆 | ElevenLabs IVC、百炼 CosyVoice | 代码已接入，尚未完成真实验收 |
| 语音合成 | 百炼 Qwen-TTS、ElevenLabs 普通 TTS | 真实链路已接入 |
| 数字人生成 | HeyGem 页面与配置骨架 | 未完成 |
| 视频合成 | FFmpeg 基础能力 | 尚未完整验收 |
| 内容复核 / 发布 | 本地模拟流程 | Mock |

当前限制：

- 百炼 CosyVoice 第一版需要手工上传样本到 OSS，并填写短期 HTTPS 签名 URL；尚未完成真实 dogfood。
- ElevenLabs Instant Voice Cloning 需要订阅包含该能力的付费套餐。
- 语速、情绪、音调和停顿设置暂未传给当前真实 TTS Provider。
- OSS 自动上传、数字人、完整视频合成、OAuth 和真实平台发布尚未实现。

## 截图

### 百炼 Qwen 声音克隆

![百炼 Qwen 声音克隆完成页](docs/screenshots/voice-clone-completed.png)

### 语音合成

![百炼 Qwen 语音合成结果页](docs/screenshots/speech-synthesis-result.png)

### 本地转写与文案改写

![本地 Whisper 转写与文案改写](docs/screenshots/local-whisper-rewrite-dogfood.png)

## 快速开始

需要预先安装：

- Node.js
- pnpm
- Rust
- FFmpeg

```bash
pnpm install
pnpm --filter @mirax/desktop dev
```

仅运行 Web 调试界面：

```bash
pnpm --filter @mirax/desktop dev:web
```

Web 模式不具备 SQLite、本地文件导入和原生网络等完整桌面能力；真实声音链路请使用 Tauri 桌面模式。

## 基础配置

### FFmpeg

进入 `设置 → 本地依赖`，点击“检测本地环境”。FFmpeg 用于视频音频抽取和音频时长探测。

### 文案改写与转写

- 文案改写：在 `设置 → AI 服务` 添加 OpenAI Compatible Provider，并设为当前文案改写 Provider。
- 云端转写：添加 OpenAI Whisper Provider，模型使用 `whisper-1`。
- 本地转写：添加 faster-whisper Provider；`tiny` 速度更快，`base` 中文质量更好但 CPU 耗时明显增加。

### 百炼 Qwen 声音克隆与合成

1. 在 `设置 → 输出与存储` 选择声音样本存储目录。
2. 在 `设置 → AI 服务` 添加“百炼 Qwen-TTS 声音复刻”。
3. 填写 API Key 和业务空间 Base URL：`https://<业务空间ID>.cn-beijing.maas.aliyuncs.com/api/v1`。
4. 模型选择 `qwen3-tts-vc-2026-01-22` 并启用 Provider。
5. 在声音克隆阶段选择 10–20 秒、背景干净的中文人声，确认拥有使用授权后开始克隆。
6. 克隆成功后进入语音合成阶段，生成的音频会保存到本地音频输出目录。

声音样本必须来自本人或已获得明确授权的声音。

## 本地数据与安全边界

- API Key 仅写入 SQLite `provider_secrets`，不进入草稿、localStorage、browser snapshot 或普通日志。
- 原始声音样本不会被移动；应用只在用户选择的受管目录中保存副本。
- 样本绝对路径、百炼临时签名 URL 和完整远端响应不会写入浏览器存储。
- 百炼网络请求通过受限 Tauri 原生命令执行，只允许预期的百炼 API 和 DashScope 结果地址。
- 开源或分享截图前，请自行检查 `.env`、本地数据库、Voice ID、文件路径和素材授权。

## 技术栈

- Tauri 2、Vue 3、TypeScript、Rust
- SQLite、pnpm workspace、Vitest
- FFmpeg、OpenAI Compatible API、百炼 Qwen-TTS

## 项目结构

```text
apps/desktop/            Tauri 桌面应用
packages/core/           领域类型与工作流
packages/local-store/    SQLite schema 与仓储
packages/media-pipeline/ FFmpeg 媒体处理
packages/provider-ai/    AI Provider 适配
docs/codex/              当前项目状态与实施计划
docs/superpowers/        历史设计与计划档案
```

## 开发检查

```bash
pnpm test
pnpm typecheck
pnpm --filter @mirax/desktop build:web
cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml
```

项目坚持不把 Mock 写成真实能力。最新进度和下一步以 [`docs/codex/PROJECT-STATE.md`](docs/codex/PROJECT-STATE.md) 为准。

## License

MIT License. See [LICENSE](./LICENSE).
