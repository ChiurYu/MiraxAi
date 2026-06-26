export interface TranscribeInput {
  sourceVideoPath: string;
  language?: string;
}

export interface TranscriptResult {
  text: string;
  segments: TranscriptSegment[];
}

export interface TranscriptSegment {
  startSeconds: number;
  endSeconds: number;
  text: string;
}

export interface RewriteScriptInput {
  transcript: string;
  productName: string;
  sellingPoints: string[];
}

export interface RewriteScriptResult {
  script: string;
  titleSuggestions: string[];
  coverTextSuggestions: string[];
}

export interface CloneVoiceInput {
  voiceSamplePath: string;
  projectId: string;
}

export interface CloneVoiceResult {
  voiceId: string;
  samplePath: string;
}

export interface SynthesizeSpeechInput {
  voiceId: string;
  script: string;
  projectId: string;
}

export interface SynthesizeSpeechResult {
  audioPath: string;
  durationSeconds: number;
}

export interface GenerateAvatarVideoInput {
  audioPath: string;
  avatarId: string;
  projectId: string;
}

export interface GenerateAvatarVideoResult {
  videoPath: string;
  durationSeconds: number;
}

/**
 * `AiProvider` 定义了 Workbench 八个阶段中需要 AI / 语音 / 数字人能力的调用契约。
 *
 * 安全边界：
 * - 实现类接收的 `apiKey` 仅允许保存在内存，禁止写入 snapshot、日志、任务 payload 或测试 fixture。
 * - 失败时统一抛出异常或返回拒绝的 Promise；错误信息中不得包含 `apiKey`、完整响应体或 base URL 中的 token。
 *
 * 阶段映射：
 * - `transcribe`：对标视频 → 口播文案
 * - `rewriteScript`：文案 → 改写后的口播脚本 + 标题/封面建议
 * - `cloneVoice`：声音样本 → voiceId
 * - `synthesizeSpeech`：脚本 + voiceId → 音频文件
 * - `generateAvatarVideo`：音频 + 形象 → 数字人视频
 */
export interface AiProvider {
  transcribe(input: TranscribeInput): Promise<TranscriptResult>;
  rewriteScript(input: RewriteScriptInput): Promise<RewriteScriptResult>;
  cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult>;
  synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult>;
  generateAvatarVideo(input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult>;
}

/**
 * Mock provider 选项。`artifactRoot` 只用于生成模拟产物路径，不触发真实网络或 FFmpeg 调用。
 */
export interface MockAiProviderOptions {
  artifactRoot?: string;
}

/**
 * OpenAI-compatible provider 的内存配置。`apiKey` 为敏感字段，禁止持久化或打印。
 * MVP 阶段 `createOpenAiCompatibleProvider` 会抛出“尚未接入”的诚实错误，不执行真实调用。
 */
export interface OpenAiCompatibleProviderOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}
