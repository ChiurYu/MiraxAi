# Mirax AI 项目状态

## 当前口径

Mirax AI 目前处在 **first usable release / 真实能力逐步接入** 阶段。

当前产品判断口径：

- UI 主体已经完成。
- 今天已接入真实 AI 文本生成 / 文案改写能力。
- 本地 faster-whisper 转写已完成本机 dogfood 验证。
- 其它创作、媒体、发布能力先按 **mock / 未完整真实接入** 管理。
- 后续按创作链路从前往后接真实能力，不直接跳到发布。

## 已完成

- [x] **新版 UI 主体**
  - Workbench 8 个阶段页面已完成。
  - 声音库、形象库、素材库、任务中心、账号管理、设置页已完成基础 UI。
  - 资产库导入 / 新建入口当前为诚实「暂未接入」，不伪造资源。

- [x] **基础状态与本地存储**
  - Provider 设置、AppSettings、Workbench draft、发布任务、发布历史已支持 SQLite 优先与 localStorage fallback。
  - API Key / token 类敏感信息不进入普通 snapshot / 日志 / task payload。

- [x] **真实 AI 文本生成 / 文案改写**
  - 已支持显式选择「文案改写」Provider。
  - 多 Provider 不再 fallback 到第一条。
  - 改写目标、提示词模板、目标字数已传入真实 rewrite 调用。
  - 改写参数已持久化到 Workbench draft。
  - 重新生成时显示真实 provider / model 调用状态。
  - 改写请求运行中、完成、失败都有界面反馈，不再让用户误以为按钮无响应。
  - Provider 配置就绪后可直接用于改写，测试连接只作为主动检查，不再成为每次使用前的硬门槛。
  - active 但不可用的 provider 会显示未就绪，不再显示绿色“使用中”。

- [x] **视频 / 素材分析最小链路**
  - 本地视频 → FFmpeg 抽取 16kHz mono WAV（Task 1A）已完成。
  - OpenAI `/audio/transcriptions` 文件上传真实转写（Task 1B）已完成。
  - transcript 进入 rewrite/script 链路已打通。
  - 计划文档：`docs/superpowers/plans/2026-07-03-video-material-analysis-task1.md`。

- [x] **真实语音转写链路**
  - `WhisperProvider` 读取 Task 1A 生成的 `audioPath`，multipart POST 到 OpenAI `/audio/transcriptions`。
  - 解析 `verbose_json` 返回真实 text / segments。
  - apiKey 仅进入 Authorization header，不进入日志、错误、snapshot、测试 fixture。
  - 真实失败不 fallback 到 mock，不伪造 transcript。
  - Task 1B review fix 完成：模型限制为 whisper-1、language 归一化为 ISO-639-1、音频大小限制 25MB。
  - 本地 `local-whisper` Provider 已接入 faster-whisper，默认 venv 为 `~/.local/share/mirax-ai/asr-venv`（Rust 侧展开 `~` 到 `HOME`），默认 `tiny` / `cpu` / `int8`。
  - `local-whisper` 的 Python 解释器路径已支持在 Provider 配置中覆盖，并持久化到 SQLite；连接测试与真实转写使用同一路径。
  - 本地视频 → FFmpeg 抽音频 → faster-whisper 转写 → transcript → 文案改写链路已通过本机 dogfood。
  - 本地 ASR 中文输出已做简体归一化，避免工作台显示繁体转写结果。
  - 已完成 `tiny` / `base` 质量验收（60 秒 demo 素材，CPU / int8）：`tiny` 约 3.5 秒但繁体残留与错漏词多；`base` 约 5× 实时、质量明显更好；默认保持 `tiny`，`base` 作为手动质量选项。

- [x] **mock / 未接入能力的诚实标识**
  - Review 阶段显示「Mock 复核」。
  - Publish 阶段显示「Mock 发布」。
  - 任务中心显示「本地模拟任务」。
  - 账号管理显示「Mock 账号」。

- [x] **Workbench stage mode 诚实状态**
  - 配置了 provider 但未验证时，相关阶段显示 `not-connected`，不再静默回落到 mock。
  - 已覆盖 transcribe / speech / voice-clone / avatar 的误导状态修复。

## 当前仍是 mock / 未完整真实接入

- [ ] **声音生成 / 声音克隆**
  - 目前产品可用口径仍按 mock / 未完整真实接入处理。

- [ ] **数字人生成**
  - 目前产品可用口径仍按 mock / 未完整真实接入处理。

- [ ] **视频合成**
  - 当前不作为已完成真实产品能力管理；后续需要在前置素材、音频、数字人真实产物稳定后再验收。

- [ ] **Review / Publish / 任务中心 / 账号管理**
  - 已加 mock 标识。
  - 真实发布 API、OAuth / 凭证托管、平台任务状态回传尚未接入。
  - 发布属于后段能力，不作为当前下一步。

## 下一步

当前最新任务：**视频 / 素材分析 Task 1A / Task 1B / 本地 faster-whisper dogfood 均已完成**。

- Task 1A：本地视频 → FFmpeg 音频抽取产物 ✅
- Task 1B：真实转写端点（OpenAI Whisper 文件上传）✅
- 本地 faster-whisper：本机 venv、模型下载、转写、简体归一化、进入改写链路 ✅

计划文档：`docs/superpowers/plans/2026-07-03-video-material-analysis-task1.md`

优先顺序：

1. [x] 盘点当前素材导入入口与 Workbench material parsing / transcribe 阶段实际输入（已完成）。
2. [x] 设计最小真实链路：本地视频/音频文件 -> 可转写音频 -> transcript -> rewrite/script（已完成）。
3. [x] 实现 Task 1A：本地视频 → FFmpeg 音频抽取产物（已完成）。
4. [x] 实现 Task 1B：真实转写端点（OpenAI Whisper 文件上传）（已完成）。
5. [x] 接入并验证本地 faster-whisper Provider（已完成）。
6. [x] 同步本文件，把完成项移动到「已完成」（已完成）。

下一步候选：

- **本地 ASR 质量优化**：按真实素材质量评估 `tiny` 是否足够；如果质量明显不够，再切到 `base` 做本机验收。
- **真实脚本生成 / 改写增强**：在已有 rewrite 能力基础上，接入更多 prompt 模板、字数控制、风格变量。
- **真实 TTS / 声音克隆**：待脚本生成稳定后，再按创作链路顺序接入声音生成真实能力。

暂不做：

- 真实发布平台接入。
- 多平台 OAuth。
- 发布状态回传。
- 画面理解 / OCR / 高级视频分析的一次性大规划。

## 后续路线

建议按这个顺序推进：

1. 视频 / 素材分析
2. 真实语音转写链路
3. 真实脚本生成 / 改写增强
4. 真实 TTS / 声音克隆
5. 真实数字人生成
6. 真实视频合成验收
7. Review / Publish 真实能力规划
8. 真实平台发布

## 恢复入口

新会话先读：

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/superpowers/PROJECT-STATE.md`

相关参考：

- `docs/reverse-engineering/legacy-ui-gap-list.md`
- `docs/product-architecture/README.md`
- `docs/product-architecture/publish-automation-security-design.md`
- `docs/superpowers/plans/`

## 工作区注意事项

- 不要重复安排 SQLite、rewrite provider selection、mock 标识收敛。
- 不要把 mock 当成真实能力。
- 不要跳过视频 / 素材分析直接做发布。
- 不要提交未跟踪截图或临时 plans/specs，除非用户明确要求。
