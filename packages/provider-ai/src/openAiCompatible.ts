import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  OpenAiCompatibleProviderOptions,
  RewriteScriptInput,
  RewriteScriptResult,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscribeInput,
  TranscriptResult,
} from "./types.js";

const UNWIRED_ERROR = "OpenAI-compatible provider is not wired yet. Use MockAiProvider in MVP.";

/**
 * OpenAI-compatible provider 的占位实现。
 *
 * 边界说明：
 * - 构造函数接收 `apiKey`，但仅用于未来真实调用；当前所有方法都抛出诚实错误，不会把 key 发送到任何网络端点。
 * - 该类不打印、不持久化 `apiKey`；调用方应通过 `sanitizeProviderConfigForStorage` 等工具在 snapshot 中剔除 key。
 * - 真实接入时，每个方法需要把输入字段映射到对应 API，并保证错误信息不包含 key、完整响应体或 base URL 中的 token。
 */
export class OpenAiCompatibleProvider implements AiProvider {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;

  constructor(options: OpenAiCompatibleProviderOptions) {
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.model = options.model;
  }

  async transcribe(_input: TranscribeInput): Promise<TranscriptResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async rewriteScript(_input: RewriteScriptInput): Promise<RewriteScriptResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async cloneVoice(_input: CloneVoiceInput): Promise<CloneVoiceResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async synthesizeSpeech(_input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async generateAvatarVideo(_input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult> {
    throw new Error(UNWIRED_ERROR);
  }
}

export function createOpenAiCompatibleProvider(options: OpenAiCompatibleProviderOptions): AiProvider {
  return new OpenAiCompatibleProvider(options);
}
