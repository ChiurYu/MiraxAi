export interface TranscribeInput {
  sourceVideoPath?: string;
  audioPath?: string;
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
  /** 改写目标，真实 LLM 调用时可作为提示词上下文（可选）。 */
  activeGoal?: string;
  /** 提示词模板标识，真实 LLM 调用时可作为提示词上下文（可选）。 */
  activePreset?: string;
  /** 目标字数，真实 LLM 调用时可作为提示词上下文（可选）。 */
  targetLength?: number;
}

export interface RewriteScriptResult {
  script: string;
  titleSuggestions: string[];
  coverTextSuggestions: string[];
}

export interface CloneVoiceInput {
  voiceSamplePath: string;
  projectId: string;
  sampleId?: string;
  voiceName?: string;
  description?: string;
  /** CosyVoice 手工 OSS 流程的单次 HTTPS 样本 URL；不得持久化。 */
  externalSampleUrl?: string;
}

export interface CloneVoiceResult {
  voiceId: string;
  samplePath: string;
  requiresVerification?: boolean;
}

export interface SynthesizeSpeechInput {
  voiceId: string;
  script: string;
  projectId: string;
  outputPath?: string;
  speed?: number;
  emotion?: string;
}

export interface SynthesizeSpeechResult {
  audioPath: string;
  durationSeconds: number;
}

export interface GenerateAvatarVideoInput {
  audioPath: string;
  avatarId: string;
  projectId: string;
  outputPath?: string;
}

export interface GenerateAvatarVideoResult {
  videoPath: string;
  durationSeconds: number;
}

/**
 * AI provider 结构化错误码。
 */
export type AiProviderErrorCode =
  | "not-configured"
  | "not-connected"
  | "unauthorized"
  | "network"
  | "bad-response"
  | "transcribe-failed"
  | "voice-unavailable"
  | "clone-failed"
  | "synthesis-failed"
  | "avatar-failed";

/**
 * AI provider 结构化错误。
 *
 * 安全边界：message 中不得包含 apiKey、baseUrl 中的 token、完整响应体。
 */
export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;

  constructor(code: AiProviderErrorCode, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.code = code;
    this.name = "AiProviderError";
  }
}

/**
 * AI provider 连接测试结果。失败时通过 `code` 给出结构化错误语义。
 *
 * `code` 为可选，mock mode 成功时可不带；openai-compatible 失败时应始终携带。
 */
export interface AiConnectionTestResult {
  ok: boolean;
  message: string;
  code?: AiProviderErrorCode;
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
 * OpenAI-compatible provider 的 HTTP transport 抽象。
 *
 * 默认实现基于全局 `fetch`，真实桌面端调用会走默认 transport。
 * 单测可注入 fake transport 避免联网。
 */
export interface OpenAiCompatibleTransportRequest {
  endpoint: string;
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: unknown;
}

export interface OpenAiCompatibleTransportResponse {
  status: number;
  json(): Promise<unknown>;
}

export interface OpenAiCompatibleTransport {
  request(req: OpenAiCompatibleTransportRequest): Promise<OpenAiCompatibleTransportResponse>;
}

/**
 * OpenAI-compatible provider 的内存配置。`apiKey` 为敏感字段，禁止持久化或打印。
 *
 * `baseUrl` 可选，缺省为官方 OpenAI endpoint；`custom` provider 必须由调用方传入合法 baseUrl。
 * `transport` 可选，缺省时使用基于 `fetch` 的默认 runtime transport。
 */
export interface OpenAiCompatibleProviderOptions {
  baseUrl?: string;
  apiKey: string;
  model: string;
  transport?: OpenAiCompatibleTransport;
}

/**
 * CosyVoice / TTS provider 的内存配置。`apiKey` 可选，本地服务可不需要鉴权。
 */
export interface CosyVoiceProviderOptions {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  transport?: OpenAiCompatibleTransport;
}

/**
 * 读取本地音频文件字节的抽象；桌面端注入 `@tauri-apps/plugin-fs.readFile`，单测注入 fake。
 */
export type ReadAudioFile = (path: string) => Promise<Uint8Array>;

/**
 * Whisper-compatible provider 的内存配置。`apiKey` 可选，本地服务可不需要鉴权。
 */
export interface WhisperProviderOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  transport?: OpenAiCompatibleTransport;
  readAudioFile?: ReadAudioFile;
}

/**
 * 本地 faster-whisper 转写调用输入。
 *
 * 安全边界：实现方不得将 audioPath / pythonPath 等完整本地路径写入日志或 snapshot。
 */
export interface RunLocalWhisperInput {
  pythonPath: string;
  model: string;
  device: string;
  computeType: string;
  audioPath: string;
  language?: string;
}

/**
 * 本地 faster-whisper 转写执行器；由桌面端注入 Tauri command 或测试 fake。
 */
export type RunLocalWhisper = (input: RunLocalWhisperInput) => Promise<string>;

/**
 * 本地 faster-whisper provider 的内存配置。
 *
 * 不依赖网络，不需要 apiKey / baseUrl；通过本机 venv Python 调用 faster-whisper。
 */
export interface LocalWhisperProviderOptions {
  pythonPath?: string;
  model?: string;
  device?: string;
  computeType?: string;
  runLocalWhisper: RunLocalWhisper;
}

/**
 * HeyGem-compatible provider 的内存配置。`apiKey` 可选，本地服务可不需要鉴权。
 */
export interface HeyGemProviderOptions {
  baseUrl: string;
  apiKey?: string;
  model?: string;
  transport?: OpenAiCompatibleTransport;
}

/**
 * 写入二进制音频文件字节的抽象；桌面端注入 Rust command，单测注入 fake。
 */
export type WriteAudioFile = (path: string, data: Uint8Array) => Promise<void>;

/**
 * 读取本地音频文件时长（秒）的抽象；桌面端注入 ffprobe Rust command，单测注入 fake。
 */
export type ReadAudioDuration = (path: string) => Promise<number>;

/**
 * 发起二进制 HTTP 请求的抽象；桌面端可注入受限原生下载器，单测注入 fake。
 */
export type FetchBinary = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ status: number; arrayBuffer(): Promise<ArrayBuffer> }>;

export type FetchJson = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{
  status: number;
  json(): Promise<unknown>;
  diagnostic?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}>;

export interface UploadVoiceSampleInput {
  apiKey: string;
  name: string;
  description?: string;
  fileName: string;
  data: Uint8Array;
}

export type UploadVoiceSample = (input: UploadVoiceSampleInput) => Promise<{ status: number; json(): Promise<unknown> }>;
export type DeleteRemoteVoice = (input: { apiKey: string; voiceId: string }) => Promise<{ status: number }>;

/**
 * ElevenLabs TTS provider 的内存配置。`apiKey` 为敏感字段，禁止持久化或打印。
 */
export interface ElevenLabsTtsProviderOptions {
  apiKey: string;
  voiceId?: string;
  model: string;
  writeFile?: WriteAudioFile;
  readDuration?: ReadAudioDuration;
  fetchBinary?: FetchBinary;
  readAudioFile?: ReadAudioFile;
  uploadVoiceSample?: UploadVoiceSample;
  deleteRemoteVoice?: DeleteRemoteVoice;
}

export interface BaiLianTtsProviderOptions {
  kind: "qwen" | "cosyvoice";
  apiKey: string;
  baseUrl: string;
  model: string;
  readAudioFile?: ReadAudioFile;
  writeFile?: WriteAudioFile;
  readDuration?: ReadAudioDuration;
  fetchJson?: FetchJson;
  fetchBinary?: FetchBinary;
}
