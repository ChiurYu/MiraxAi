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
