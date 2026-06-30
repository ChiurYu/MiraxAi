import { AiProviderError } from "./types.js";
import { createDefaultOpenAiTransport } from "./openAiCompatible.js";
import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  CosyVoiceProviderOptions,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  OpenAiCompatibleTransport,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscribeInput,
  TranscriptResult,
  RewriteScriptInput,
  RewriteScriptResult,
} from "./types.js";

const UNWIRED_ERROR = "CosyVoice provider only supports voice cloning and speech synthesis in this stage.";

export class CosyVoiceProvider implements AiProvider {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model?: string;
  private readonly transport: OpenAiCompatibleTransport;

  constructor(options: CosyVoiceProviderOptions, transport: OpenAiCompatibleTransport) {
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

  async cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult> {
    if (!input.voiceSamplePath.trim()) {
      throw new AiProviderError("not-configured", "Voice sample path is empty.");
    }

    try {
      const response = await this.transport.request({
        endpoint: `${this.baseUrl}/voice-clone`,
        method: "POST",
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        body: {
          samplePath: input.voiceSamplePath,
          projectId: input.projectId,
          model: this.model,
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError("unauthorized", `Voice clone provider returned ${response.status}. Check your API key.`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new AiProviderError("clone-failed", `Voice clone provider returned HTTP ${response.status}.`);
      }

      const data = await response.json();
      return parseCloneVoiceResult(data);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new AiProviderError("bad-response", "Voice clone response is not valid JSON.");
      }
      throw new AiProviderError("network", "Network error while contacting voice clone provider.");
    }
  }

  async synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    if (!input.voiceId.trim()) {
      throw new AiProviderError("voice-unavailable", "TTS voiceId is empty.");
    }
    if (!input.script.trim()) {
      throw new AiProviderError("not-configured", "TTS script is empty.");
    }

    try {
      const response = await this.transport.request({
        endpoint: `${this.baseUrl}/tts`,
        method: "POST",
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        body: {
          voiceId: input.voiceId,
          text: input.script,
          projectId: input.projectId,
          outputPath: input.outputPath,
          model: this.model,
          speed: input.speed,
          emotion: input.emotion,
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError("unauthorized", `TTS provider returned ${response.status}. Check your API key.`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new AiProviderError("synthesis-failed", `TTS provider returned HTTP ${response.status}.`);
      }

      const data = await response.json();
      return parseSpeechResult(data);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new AiProviderError("bad-response", "TTS response is not valid JSON.");
      }
      throw new AiProviderError("network", "Network error while contacting TTS provider.");
    }
  }

  async generateAvatarVideo(_input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult> {
    throw new Error(UNWIRED_ERROR);
  }
}

export function createCosyVoiceProvider(options: CosyVoiceProviderOptions): AiProvider {
  validateOptions(options);
  const transport = options.transport ?? createDefaultOpenAiTransport();
  return new CosyVoiceProvider(options, transport);
}

function validateOptions(options: CosyVoiceProviderOptions): void {
  if (!sanitizeBaseUrl(options.baseUrl)) {
    throw new AiProviderError("not-configured", "CosyVoice provider baseUrl is required.");
  }
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

function parseSpeechResult(data: unknown): SynthesizeSpeechResult {
  if (!isObject(data) || typeof data.audioPath !== "string" || data.audioPath.trim() === "") {
    throw new AiProviderError("synthesis-failed", "TTS response missing audioPath.");
  }
  if (typeof data.durationSeconds !== "number" || data.durationSeconds <= 0) {
    throw new AiProviderError("synthesis-failed", "TTS response missing trusted duration.");
  }

  return {
    audioPath: data.audioPath,
    durationSeconds: data.durationSeconds,
  };
}

function parseCloneVoiceResult(data: unknown): CloneVoiceResult {
  if (!isObject(data) || typeof data.voiceId !== "string" || data.voiceId.trim() === "") {
    throw new AiProviderError("clone-failed", "Voice clone response missing voiceId.");
  }
  if (typeof data.samplePath !== "string" || data.samplePath.trim() === "") {
    throw new AiProviderError("clone-failed", "Voice clone response missing samplePath.");
  }

  return {
    voiceId: data.voiceId,
    samplePath: data.samplePath,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
