import { AiProviderError } from "./types.js";
import { createDefaultOpenAiTransport } from "./openAiCompatible.js";
import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  OpenAiCompatibleTransport,
  RewriteScriptInput,
  RewriteScriptResult,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscriptResult,
  TranscribeInput,
  WhisperProviderOptions,
} from "./types.js";

const UNWIRED_ERROR = "Whisper provider only supports transcription in this stage.";

export class WhisperProvider implements AiProvider {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model: string;
  private readonly transport: OpenAiCompatibleTransport;

  constructor(options: WhisperProviderOptions, transport: OpenAiCompatibleTransport) {
    this.baseUrl = sanitizeBaseUrl(options.baseUrl);
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.transport = transport;
  }

  async transcribe(input: TranscribeInput): Promise<TranscriptResult> {
    if (!input.sourceVideoPath.trim()) {
      throw new AiProviderError("not-configured", "Transcribe source path is empty.");
    }

    try {
      const response = await this.transport.request({
        endpoint: `${this.baseUrl}/transcribe`,
        method: "POST",
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        body: {
          sourceVideoPath: input.sourceVideoPath,
          language: input.language,
          model: this.model,
        },
      });

      if (response.status === 401 || response.status === 403) {
        throw new AiProviderError("unauthorized", `Whisper provider returned ${response.status}. Check your API key.`);
      }
      if (response.status < 200 || response.status >= 300) {
        throw new AiProviderError("transcribe-failed", `Whisper provider returned HTTP ${response.status}.`);
      }

      const data = await response.json();
      return parseTranscriptResult(data);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        throw new AiProviderError("bad-response", "Whisper response is not valid JSON.");
      }
      throw new AiProviderError("network", "Network error while contacting Whisper provider.");
    }
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

export function createWhisperProvider(options: WhisperProviderOptions): AiProvider {
  validateOptions(options);
  const transport = options.transport ?? createDefaultOpenAiTransport();
  return new WhisperProvider(options, transport);
}

function validateOptions(options: WhisperProviderOptions): void {
  if (!sanitizeBaseUrl(options.baseUrl)) {
    throw new AiProviderError("not-configured", "Whisper provider baseUrl is required.");
  }
  if (!options.model.trim()) {
    throw new AiProviderError("not-configured", "Whisper provider model is required.");
  }
}

function parseTranscriptResult(data: unknown): TranscriptResult {
  if (!isObject(data) || typeof data.text !== "string" || data.text.trim() === "") {
    throw new AiProviderError("transcribe-failed", "Whisper response missing transcript text.");
  }
  if (!Array.isArray(data.segments) || !data.segments.every(isTranscriptSegment)) {
    throw new AiProviderError("transcribe-failed", "Whisper response missing trusted segments.");
  }

  return {
    text: data.text,
    segments: data.segments,
  };
}

function isTranscriptSegment(value: unknown): value is TranscriptResult["segments"][number] {
  return (
    isObject(value) &&
    typeof value.startSeconds === "number" &&
    typeof value.endSeconds === "number" &&
    value.endSeconds >= value.startSeconds &&
    typeof value.text === "string" &&
    value.text.trim() !== ""
  );
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
