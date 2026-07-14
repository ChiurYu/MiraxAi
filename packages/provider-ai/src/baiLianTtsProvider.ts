import { AiProviderError } from "./types.js";
import type {
  AiProvider,
  BaiLianTtsProviderOptions,
  CloneVoiceInput,
  CloneVoiceResult,
  FetchBinary,
  FetchJson,
  GenerateAvatarVideoInput,
  GenerateAvatarVideoResult,
  ReadAudioDuration,
  ReadAudioFile,
  RewriteScriptInput,
  RewriteScriptResult,
  SynthesizeSpeechInput,
  SynthesizeSpeechResult,
  TranscribeInput,
  TranscriptResult,
  WriteAudioFile,
} from "./types.js";

const UNWIRED_ERROR = "BaiLian TTS provider only supports voice clone and text-to-speech in this stage.";

export class BaiLianTtsProvider implements AiProvider {
  readonly kind: "qwen" | "cosyvoice";
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly model: string;
  private readonly readAudioFile?: ReadAudioFile;
  private readonly writeFile?: WriteAudioFile;
  private readonly readDuration?: ReadAudioDuration;
  private readonly fetchJson: FetchJson;
  private readonly fetchBinary: FetchBinary;

  constructor(options: BaiLianTtsProviderOptions) {
    this.kind = options.kind;
    this.apiKey = options.apiKey.trim();
    this.baseUrl = options.baseUrl.trim().replace(/\/+$/, "");
    this.model = options.model.trim();
    this.readAudioFile = options.readAudioFile;
    this.writeFile = options.writeFile;
    this.readDuration = options.readDuration;
    this.fetchJson = options.fetchJson ?? createDefaultFetchJson();
    this.fetchBinary = options.fetchBinary ?? createDefaultFetchBinary();
  }

  async transcribe(_input: TranscribeInput): Promise<TranscriptResult> { throw new Error(UNWIRED_ERROR); }
  async rewriteScript(_input: RewriteScriptInput): Promise<RewriteScriptResult> { throw new Error(UNWIRED_ERROR); }
  async generateAvatarVideo(_input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult> { throw new Error(UNWIRED_ERROR); }

  async cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult> {
    this.assertCloneConfiguration(input);
    const payload = await this.buildClonePayload(input);
    const response = await this.requestJson(`${this.baseUrl}/services/audio/tts/customization`, payload, "声音克隆");
    const voiceId = readString(response, this.kind === "qwen" ? ["output", "voice"] : ["output", "voice_id"]);
    if (!voiceId) throw new AiProviderError("clone-failed", "百炼声音克隆未返回 Voice ID。");
    return { voiceId, samplePath: input.voiceSamplePath };
  }

  async synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    if (!this.apiKey || !this.baseUrl || !this.model || !input.voiceId.trim() || !input.script.trim() || !input.outputPath?.trim() || !this.writeFile || !this.readDuration) {
      throw new AiProviderError("not-configured", "百炼语音合成参数未配置完整。");
    }
    const endpoint = this.kind === "qwen"
      ? `${this.baseUrl}/services/aigc/multimodal-generation/generation`
      : `${this.baseUrl}/services/audio/tts/SpeechSynthesizer`;
    const payload = this.kind === "qwen"
      ? { model: this.model, input: { text: input.script, voice: input.voiceId.trim() } }
      : { model: this.model, input: { text: input.script, voice: input.voiceId.trim(), format: "wav", sample_rate: 24000 } };
    const response = await this.requestJson(endpoint, payload, "语音合成");
    const audioUrl = readString(response, ["output", "audio", "url"]);
    if (!audioUrl || !isAllowedBaiLianAudioUrl(audioUrl)) throw new AiProviderError("synthesis-failed", "百炼语音合成未返回有效音频地址。");
    let bytes: Uint8Array;
    try {
      const download = await this.fetchBinary(audioUrl, { method: "GET", headers: {} });
      if (download.status < 200 || download.status >= 300) throw new Error("download-failed");
      bytes = new Uint8Array(await download.arrayBuffer());
    } catch (error) {
      throw new AiProviderError("network", "百炼合成音频下载失败。", { cause: error });
    }
    if (bytes.length === 0) throw new AiProviderError("synthesis-failed", "百炼返回的音频为空。");
    try {
      await this.writeFile(input.outputPath, bytes);
      const durationSeconds = await this.readDuration(input.outputPath);
      if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("invalid-duration");
      return { audioPath: input.outputPath, durationSeconds };
    } catch (error) {
      throw new AiProviderError("synthesis-failed", "百炼音频文件写入或时长读取失败。", { cause: error });
    }
  }

  private assertCloneConfiguration(input: CloneVoiceInput): void {
    if (!this.apiKey || !this.baseUrl || !this.model || !input.voiceName?.trim() || !input.voiceSamplePath.trim()) {
      throw new AiProviderError("not-configured", "百炼声音克隆参数未配置完整。");
    }
    if (this.kind === "qwen" && !this.readAudioFile) throw new AiProviderError("not-configured", "百炼 Qwen-TTS 声音样本读取能力未配置。");
    if (this.kind === "cosyvoice" && !isHttpsUrl(input.externalSampleUrl ?? "")) throw new AiProviderError("not-configured", "百炼 CosyVoice 需要有效的 HTTPS 样本地址。");
  }

  private async buildClonePayload(input: CloneVoiceInput): Promise<Record<string, unknown>> {
    if (this.kind === "cosyvoice") {
      return { model: "voice-enrollment", input: { action: "create_voice", target_model: this.model, prefix: safeCosyPrefix(input.voiceName!), url: input.externalSampleUrl } };
    }
    let bytes: Uint8Array;
    try {
      bytes = await this.readAudioFile!(input.voiceSamplePath);
    } catch (error) {
      throw new AiProviderError("clone-failed", "托管声音样本读取失败。", { cause: error });
    }
    if (bytes.length === 0) throw new AiProviderError("clone-failed", "托管声音样本为空。");
    return {
      model: "qwen-voice-enrollment",
      input: {
        action: "create",
        target_model: this.model,
        preferred_name: safeQwenPreferredName(input.voiceName!),
        audio: { data: `data:${mimeTypeFromPath(input.voiceSamplePath)};base64,${toBase64(bytes)}` },
      },
    };
  }

  private async requestJson(url: string, payload: Record<string, unknown>, operation: string): Promise<unknown> {
    let response: Awaited<ReturnType<FetchJson>>;
    try {
      response = await this.fetchJson(url, { method: "POST", headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    } catch (error) {
      throw new AiProviderError("network", `百炼${operation}请求网络异常。`, { cause: error });
    }
    if (response.status === 401 || response.status === 403) throw new AiProviderError("unauthorized", `百炼返回 ${response.status}，请检查 API Key 与地域。`);
    if (response.status < 200 || response.status >= 300) {
      throw new AiProviderError(
        operation === "声音克隆" ? "clone-failed" : "synthesis-failed",
        `百炼返回 HTTP ${response.status}${formatBaiLianDiagnostic(response.diagnostic)}，${operation}失败。`,
      );
    }
    try {
      return await response.json();
    } catch (error) {
      throw new AiProviderError("bad-response", `百炼${operation}响应无效。`, { cause: error });
    }
  }
}

export function createBaiLianTtsProvider(options: BaiLianTtsProviderOptions): AiProvider { return new BaiLianTtsProvider(options); }

function createDefaultFetchJson(): FetchJson {
  return async (url, init) => {
    const response = await fetch(url, { method: init.method, headers: init.headers, body: init.body });
    return { status: response.status, json: () => response.json() };
  };
}

function createDefaultFetchBinary(): FetchBinary {
  return async (url, init) => {
    const response = await fetch(url, { method: init.method, headers: init.headers });
    return { status: response.status, arrayBuffer: () => response.arrayBuffer() };
  };
}

function readString(value: unknown, path: string[]): string {
  let current: unknown = value;
  for (const key of path) current = current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined;
  return typeof current === "string" ? current.trim() : "";
}

function safeCosyPrefix(name: string): string {
  const normalized = name.trim().replace(/[^a-zA-Z0-9]+/g, "");
  return `mirax${normalized || "voice"}`.slice(0, 10);
}

function safeQwenPreferredName(name: string): string {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  return `mirax_${normalized || "voice"}`.slice(0, 16);
}
function isHttpsUrl(value: string): boolean { try { return new URL(value).protocol === "https:"; } catch { return false; } }
function isAllowedBaiLianAudioUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:")
      && !url.username
      && !url.password
      && !url.port
      && url.hostname.startsWith("dashscope-result-")
      && url.hostname.includes(".oss-")
      && url.hostname.endsWith(".aliyuncs.com");
  } catch {
    return false;
  }
}
function mimeTypeFromPath(path: string): string { const extension = path.split(".").pop()?.toLowerCase(); return extension === "wav" ? "audio/wav" : extension === "m4a" ? "audio/mp4" : "audio/mpeg"; }
function toBase64(bytes: Uint8Array): string { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary); }

function formatBaiLianDiagnostic(diagnostic: Awaited<ReturnType<FetchJson>>["diagnostic"]): string {
  const code = safeBaiLianIdentifier(diagnostic?.code);
  const requestId = safeBaiLianIdentifier(diagnostic?.requestId);
  const message = safeBaiLianMessage(diagnostic?.message);
  return `${code ? `（${code}）` : ""}${message ? `：${message}` : ""}${requestId ? `（请求 ID：${requestId}）` : ""}`;
}

function safeBaiLianIdentifier(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  return /^[A-Za-z0-9_.-]{1,128}$/.test(trimmed) ? trimmed : "";
}

function safeBaiLianMessage(value: string | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed.length > 240) return "";
  const lower = trimmed.toLowerCase();
  return ["data:", "://", "/", "\\", "?", "&", "bearer", "sk-", "signature"].some((marker) => lower.includes(marker))
    ? "服务端诊断包含敏感内容，已隐藏"
    : trimmed;
}
