import { AiProviderError } from "./types.js";
import { createDefaultOpenAiTransport } from "./openAiCompatible.js";
import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  OpenAiCompatibleTransport,
  ReadAudioFile,
  RewriteScriptInput,
  RewriteScriptResult,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscriptResult,
  TranscribeInput,
  WhisperProviderOptions,
} from "./types.js";

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const UNWIRED_ERROR = "Whisper provider only supports transcription in this stage.";

export class WhisperProvider implements AiProvider {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly model: string;
  private readonly transport: OpenAiCompatibleTransport;
  private readonly readAudioFile?: ReadAudioFile;

  constructor(options: WhisperProviderOptions, transport: OpenAiCompatibleTransport) {
    this.baseUrl = sanitizeBaseUrl(options.baseUrl) || DEFAULT_OPENAI_BASE_URL;
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.transport = transport;
    this.readAudioFile = options.readAudioFile;
  }

  async transcribe(input: TranscribeInput): Promise<TranscriptResult> {
    if (input.audioPath?.trim()) {
      return this.transcribeAudioFile(input.audioPath, input.language);
    }

    // 保留 sourceVideoPath 入口作为 sidecar/未来扩展的预留；
    // 当前真实方案要求 audioPath，缺失时明确失败，不回退到 JSON /transcribe。
    if (input.sourceVideoPath?.trim()) {
      throw new AiProviderError(
        "not-configured",
        "真实转写需要 audioPath；请先通过 FFmpeg 抽取音频。",
      );
    }

    throw new AiProviderError("not-configured", "Transcribe source path is empty.");
  }

  private async transcribeAudioFile(audioPath: string, language?: string): Promise<TranscriptResult> {
    if (!this.readAudioFile) {
      throw new AiProviderError("not-configured", "未注入音频文件读取器。");
    }

    let audioBytes: Uint8Array;
    try {
      audioBytes = await this.readAudioFile(audioPath);
    } catch {
      throw new AiProviderError("not-configured", "无法读取音频文件。");
    }

    if (audioBytes.byteLength > MAX_AUDIO_BYTES) {
      throw new AiProviderError("transcribe-failed", "音频文件超过 25MB，请裁剪视频或使用更短素材。");
    }

    const blob = new Blob([audioBytes.buffer.slice(audioBytes.byteOffset, audioBytes.byteOffset + audioBytes.byteLength) as ArrayBuffer], { type: "audio/wav" });
    const formData = new FormData();
    formData.append("file", blob, "audio.wav");
    formData.append("model", this.model);
    const normalizedLanguage = normalizeLanguage(language);
    if (normalizedLanguage) {
      formData.append("language", normalizedLanguage);
    }
    formData.append("response_format", "verbose_json");

    try {
      const response = await this.transport.request({
        endpoint: `${this.baseUrl}/audio/transcriptions`,
        method: "POST",
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        body: formData,
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
  if (options.model.trim() !== "whisper-1") {
    throw new AiProviderError("not-configured", "Whisper provider 当前仅支持 whisper-1 模型。");
  }
  if (!options.apiKey?.trim()) {
    throw new AiProviderError("not-configured", "Whisper provider apiKey is required for OpenAI audio/transcriptions.");
  }
}

function parseTranscriptResult(data: unknown): TranscriptResult {
  if (!isObject(data) || typeof data.text !== "string" || data.text.trim() === "") {
    throw new AiProviderError("transcribe-failed", "Whisper response missing transcript text.");
  }

  const segments = Array.isArray(data.segments)
    ? data.segments
        .map((segment: unknown) => {
          if (!isObject(segment)) return null;
          const startSeconds = typeof segment.start === "number" ? segment.start : undefined;
          const endSeconds = typeof segment.end === "number" ? segment.end : undefined;
          const text = typeof segment.text === "string" ? segment.text : undefined;
          if (startSeconds === undefined || endSeconds === undefined || !text?.trim()) {
            return null;
          }
          return { startSeconds, endSeconds, text: text.trim() };
        })
        .filter((s): s is TranscriptResult["segments"][number] => s !== null)
    : [];

  if (segments.length === 0) {
    segments.push({ startSeconds: 0, endSeconds: 0, text: data.text.trim() });
  }

  return {
    text: data.text.trim(),
    segments,
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

function normalizeLanguage(language?: string): string | undefined {
  if (!language) return undefined;
  const normalized = language.trim().split("-")[0].toLowerCase();
  return normalized || undefined;
}
