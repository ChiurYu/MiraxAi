# SA-VOICE-AVATAR：声音与形象管理静态分析

## 身份信息

| 字段 | 值 |
| --- | --- |
| 分析 ID | SA-VOICE-AVATAR |
| 分析对象 | 旧版 App 声音克隆/语音合成、数字人形象训练/视频生成 |
| 来源路径或位置 | `/Users/yuzhenzhao/code/ai/轻语IP智能体-5.0.0-苹果芯片.dmg` 解包后的 ASAR（`electron/main/preload.js`、`electron/renderer/dist/static/js/*.js`） |
| 分析方法 | hdiutil 只读挂载 + asar 解包 + ripgrep 字符串搜索 + preload IPC 接口还原 |

## 证据

| 字段 | 值 |
| --- | --- |
| 证据 ID | EV-STATIC-100 |
| 最高证据等级 | E3 |
| 可信度 | medium |

## 发现

### 1. 声音管理 IPC 接口

来源：`electron/main/preload.js`。

| 命名空间 | 方法 / 通道 | 说明 |
| --- | --- | --- |
| `voice` | `init()` → `db:init` model=`voice` | 初始化声音表。 |
| `voice` | `create(data)` → `db:create` model=`voice` | 创建声音记录。 |
| `voice` | `find(id)` / `findByName(name)` / `list(options)` / `search(...)` | 查询声音。 |
| `voice` | `update(id, data)` / `delete(id)` / `reorder(orders)` / `stats()` | 更新、删除、排序、统计。 |
| `python.voiceClone` | `textToSpeech(mode, text, prompt_text, prompt_audio_path, output_path, speed=1, seed=42)` → `python:call-function` | 基础语音合成。 |
| `python.voiceClone` | `textToSpeechWithProgress(...)` → `python:call-function-with-progress` | 带进度语音合成。 |
| `python.voiceClone` | `textToSpeechV2(..., emotions, emotion_weight, emotion_text, emotion_ref_audio_path)` | V2 情感/风格控制。 |
| `python.voiceClone` | `textToSpeechWithProgressV2(..., high_performance)` | V2 带进度 + 高性能模式。 |

声音合成参数：

- `mode`：合成模式（待确认具体枚举值）。
- `text`：目标文案。
- `prompt_text` / `prompt_audio_path`：参考文本与参考音频路径。
- `output_path`：输出音频路径。
- `speed`：语速，默认 `1`。
- `seed`：随机种子，默认 `42`。
- `emotions` / `emotion_weight` / `emotion_text` / `emotion_ref_audio_path`：V2 情感控制字段。
- `high_performance`：V2 高性能开关。

### 2. 形象管理 IPC 接口

来源：`electron/main/preload.js`。

| 命名空间 | 方法 / 通道 | 说明 |
| --- | --- | --- |
| `digitalHuman` | `init()` → `db:init` model=`digitalHuman` | 初始化形象表。 |
| `digitalHuman` | `create(data)` / `find(id)` / `findByName(name)` / `list(options)` / `search(...)` | 查询形象。 |
| `digitalHuman` | `update(id, data)` / `delete(id)` / `reorder(orders)` / `stats()` | 更新、删除、排序、统计。 |
| `python.digitalHuman` | `generateVideo(audio_file, video_file, options={})` → `python:call-function` | 基础数字人视频生成。 |
| `python.digitalHuman` | `generateVideoWithProgress(...)` → `python:call-function-with-progress` | 带进度数字人视频生成。 |

数字人视频生成参数：

- `audio_file`：合成后的音频路径。
- `video_file`：形象参考视频路径。
- `watermark`：是否添加水印。
- `digital_auth`：数字人授权开关。
- `output_dir`：输出目录。
- `model_version`：`V1` 或 `V2`；V2 对应模块名为 `hdModule`，V1 为 `humanModule`。

### 3. 状态与 UI 文案

来源：`electron/renderer/dist/static/js/528.539333ff.js`（声音管理 bundle）、`749.40ab73e8.js` / `83.16c3336f.js`（形象相关 bundle）字符串搜索。

| 类型 | 值 | 说明 |
| --- | --- | --- |
| 声音状态 | `training` / `训练中` | 声音训练中 |
| 声音状态 | `训练完成` / `合成完成` | 训练或合成成功 |
| 声音状态 | `合成失败` | 合成失败 |
| 形象状态 | `active` / `status` | 通用状态字段 |
| 通用 | `Voice` / `Clone` / `Avatar` / `Digital` / `声音` / `形象` / `克隆` / `训练` / `合成` | UI 文案 |

### 4. 依赖模块

来源：`electron/main/preload.js` 与 `package.json`。

- 声音克隆/合成：`voiceCloneModule` / `soundClone`（Python sidecar，对应 CosyVoice）。
- 数字人：`humanModule` / `hdModule`（Python sidecar，对应 HeyGem）。
- 音视频处理：`sharp`、`ffmpeg`（通过 `python:call-function` 或 `video:*` 接口调用）。

## 关联记录

| 记录类型 | 路径或 ID |
| --- | --- |
| 页面巡检 | PAGE-VOICE-MANAGEMENT、PAGE-AVATAR-MANAGEMENT |
| 功能卡 | FC-ASSET-MANAGEMENT |
| 运行障碍 | RB-ASSET-001、RB-ASSET-002 |

## 证据影响

| 字段 | 值 |
| --- | --- |
| 可增强的证据等级 | EV-RUNTIME-100、EV-RUNTIME-110 可从 E1 补充 E3 级接口字段证据。 |
| 剩余不确定点 | 1. `voiceClone` 的 `mode` 具体枚举值未解出。<br>2. 声音/形象训练的具体 Python 函数名、模型路径、训练超参数在 `main.jsc` 中，未解出。<br>3. 声音试听播放器和形象封面提取的具体实现未确认。 |
| 对 Mirax AI 设计的影响 | 1. `@mirax/provider-ai` 可定义 `voiceClone(options)` 和 `textToSpeech(options)`，参数对齐旧版。<br>2. `@mirax/provider-ai` 可定义 `generateAvatarVideo(audioPath, avatarVideoPath, options)`，支持 `modelVersion: 'V1' \| 'V2'`。<br>3. `@mirax/local-store` 的 `voices` / `digitalHumans` 表可复用 `db:create/list/update/delete/reorder/stats` 语义。<br>4. 第一版用 mock 跑通训练/合成/生成状态流转；真实能力后续通过 `@mirax/sidecar-manager` 的 CosyVoice / HeyGem 替换。 |
