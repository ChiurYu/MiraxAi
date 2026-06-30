import { AiProviderError } from "./types.js";
import { createDefaultOpenAiTransport } from "./openAiCompatible.js";
import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  HeyGemProviderOptions,
  OpenAiCompatibleTransport,
  RewriteScriptInput,
  RewriteScriptResult,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscriptResult,
  TranscribeInput,
} from "./types.js";

const UNWIRED_ERROR = "HeyGem provider only supports avatar video generation in this stage.";

export class HeyGemProvider implements AiProvider {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model?: string;
  private readonly transport: OpenAiCompatibleTransport;

  constructor(options: HeyGemProviderOptions, transport: OpenAiCompatibleTransport) {
    this.baseUrl = sanitizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.transport = transport;
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

  async generateAvatarVideo(input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult> {
    if (!input.audioPath.trim()) {
      throw new AiProviderError("not-configured", "Avatar audioPath is empty.");
    }
    if (!input.avatarId.trim()) {
      throw new AiProviderError("not-configured", "Avatar id is empty.");
    }

    try {
      const response = await this.transport.request({
        endpoint: `${this.baseUrl}/avatar`,
        method: "POST",
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        body: {
          audioPath: input.audioPath,
          avatarId: input.avatarId,
          projectId: input.projectId,
          outputPath: input.outputPath,
          model: this.model,
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError("unauthorized", `Avatar provider returned ${response.status}. Check your API key.`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new AiProviderError("avatar-failed", `Avatar provider returned HTTP ${response.status}.`);
      }

      const data = await response.json();
      return parseAvatarResult(data);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new AiProviderError("bad-response", "Avatar response is not valid JSON.");
      }
      throw new AiProviderError("network", "Network error while contacting avatar provider.");
    }
  }
}

export function createHeyGemProvider(options: HeyGemProviderOptions): AiProvider {
  validateOptions(options);
  const transport = options.transport ?? createDefaultOpenAiTransport();
  return new HeyGemProvider(options, transport);
}

function validateOptions(options: HeyGemProviderOptions): void {
  if (!sanitizeBaseUrl(options.baseUrl)) {
    throw new AiProviderError("not-configured", "HeyGem provider baseUrl is required.");
  }
}

function parseAvatarResult(data: unknown): GenerateAvatarVideoResult {
  if (!isObject(data) || typeof data.videoPath !== "string" || data.videoPath.trim() === "") {
    throw new AiProviderError("avatar-failed", "Avatar response missing videoPath.");
  }
  if (typeof data.durationSeconds !== "number" || data.durationSeconds <= 0) {
    throw new AiProviderError("avatar-failed", "Avatar response missing trusted duration.");
  }

  return {
    videoPath: data.videoPath,
    durationSeconds: data.durationSeconds,
  };
}

function sanitizeBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    const pathname = url.pathname === "/" ? "" : url.pathname;
    return `${url.origin}${pathname}`.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
