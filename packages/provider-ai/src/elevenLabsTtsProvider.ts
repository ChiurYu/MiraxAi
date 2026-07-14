import { AiProviderError } from "./types.js";
import type {
  AiProvider,
  CloneVoiceInput,
  CloneVoiceResult,
  DeleteRemoteVoice,
  ElevenLabsTtsProviderOptions,
  FetchBinary,
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
  UploadVoiceSample,
} from "./types.js";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";
const UNWIRED_ERROR = "ElevenLabs TTS provider only supports text-to-speech in this stage.";

export class ElevenLabsTtsProvider implements AiProvider {
  readonly apiKey: string;
  readonly voiceId: string;
  readonly model: string;
  private readonly writeFile?: WriteAudioFile;
  private readonly readDuration?: ReadAudioDuration;
  private readonly fetchBinary: FetchBinary;
  private readonly readAudioFile?: ReadAudioFile;
  private readonly uploadVoiceSample: UploadVoiceSample;
  private readonly deleteVoice: DeleteRemoteVoice;

  constructor(options: ElevenLabsTtsProviderOptions) {
    this.apiKey = options.apiKey.trim();
    this.voiceId = options.voiceId?.trim() ?? "";
    this.model = options.model.trim();
    this.writeFile = options.writeFile;
    this.readDuration = options.readDuration;
    this.fetchBinary = options.fetchBinary ?? createDefaultFetchBinary();
    this.readAudioFile = options.readAudioFile;
    this.uploadVoiceSample = options.uploadVoiceSample ?? createDefaultUploadVoiceSample();
    this.deleteVoice = options.deleteRemoteVoice ?? createDefaultDeleteRemoteVoice();
  }

  async transcribe(_input: TranscribeInput): Promise<TranscriptResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async rewriteScript(_input: RewriteScriptInput): Promise<RewriteScriptResult> {
    throw new Error(UNWIRED_ERROR);
  }

  async cloneVoice(input: CloneVoiceInput): Promise<CloneVoiceResult> {
    if (!this.apiKey || !this.model || !input.sampleId?.trim() || !input.voiceName?.trim() || !input.voiceSamplePath.trim()) {
      throw new AiProviderError("not-configured", "ElevenLabs 声音克隆参数未配置完整。");
    }
    if (!this.readAudioFile) {
      throw new AiProviderError("not-configured", "ElevenLabs 声音样本读取能力未配置。");
    }

    let data: Uint8Array;
    try {
      data = await this.readAudioFile(input.voiceSamplePath);
    } catch (error) {
      throw new AiProviderError("clone-failed", "托管声音样本读取失败。", { cause: error });
    }
    if (data.length === 0) {
      throw new AiProviderError("clone-failed", "托管声音样本为空。");
    }

    let response: { status: number; json(): Promise<unknown> };
    try {
      response = await this.uploadVoiceSample({
        apiKey: this.apiKey,
        name: input.voiceName.trim(),
        description: input.description?.trim() || undefined,
        fileName: fileNameFromPath(input.voiceSamplePath),
        data,
      });
    } catch (error) {
      throw new AiProviderError("network", "ElevenLabs 声音克隆请求网络异常。", { cause: error });
    }
    if (response.status === 401 || response.status === 403) {
      throw new AiProviderError("unauthorized", `ElevenLabs 返回 ${response.status}，请检查 API Key。`);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new AiProviderError("clone-failed", await formatVoiceCloneFailure(response, [this.apiKey, input.voiceSamplePath]));
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new AiProviderError("clone-failed", "ElevenLabs 声音克隆响应无效。", { cause: error });
    }
    const voiceId = payload && typeof payload === "object" && typeof (payload as { voice_id?: unknown }).voice_id === "string"
      ? (payload as { voice_id: string }).voice_id.trim()
      : "";
    if (!voiceId) {
      throw new AiProviderError("clone-failed", "ElevenLabs 声音克隆未返回 Voice ID。");
    }
    const requiresVerification = Boolean(
      payload
      && typeof payload === "object"
      && (payload as { requires_verification?: unknown }).requires_verification === true,
    );
    return {
      voiceId,
      samplePath: input.voiceSamplePath,
      requiresVerification,
    };
  }

  async deleteRemoteVoice(voiceId: string): Promise<void> {
    if (!this.apiKey || !voiceId.trim()) {
      throw new AiProviderError("not-configured", "ElevenLabs 远端声音删除参数未配置完整。");
    }
    let response: { status: number };
    try {
      response = await this.deleteVoice({ apiKey: this.apiKey, voiceId: voiceId.trim() });
    } catch (error) {
      throw new AiProviderError("network", "ElevenLabs 远端声音删除网络异常。", { cause: error });
    }
    if (response.status === 401 || response.status === 403) {
      throw new AiProviderError("unauthorized", `ElevenLabs 返回 ${response.status}，请检查 API Key。`);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new AiProviderError("clone-failed", `ElevenLabs 返回 HTTP ${response.status}，远端声音删除失败。`);
    }
  }

  async synthesizeSpeech(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    if (!this.apiKey) {
      throw new AiProviderError("not-configured", "ElevenLabs API Key 未配置。");
    }
    const voiceId = input.voiceId.trim();
    if (!voiceId) {
      throw new AiProviderError("voice-unavailable", "ElevenLabs Voice ID 未配置。");
    }
    if (!this.model) {
      throw new AiProviderError("not-configured", "ElevenLabs model 未配置。");
    }
    if (!input.script.trim()) {
      throw new AiProviderError("not-configured", "TTS script 为空。");
    }
    if (!input.outputPath?.trim() || !this.writeFile || !this.readDuration) {
      throw new AiProviderError("not-configured", "TTS output path 为空。");
    }

    const endpoint = `${ELEVENLABS_API_BASE}/v1/text-to-speech/${encodeURIComponent(voiceId)}`;

    let response: { status: number; arrayBuffer(): Promise<ArrayBuffer> };
    try {
      response = await this.fetchBinary(endpoint, {
        method: "POST",
        headers: {
          "xi-api-key": this.apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: input.script,
          model_id: this.model,
        }),
      });
    } catch (error) {
      throw new AiProviderError("network", "ElevenLabs TTS 请求网络异常。", { cause: error });
    }

    if (response.status === 401 || response.status === 403) {
      throw new AiProviderError("unauthorized", `ElevenLabs 返回 ${response.status}，请检查 API Key。`);
    }
    if (response.status < 200 || response.status >= 300) {
      throw new AiProviderError("synthesis-failed", `ElevenLabs 返回 HTTP ${response.status}，语音合成失败。`);
    }

    let audioBytes: Uint8Array;
    try {
      const buffer = await response.arrayBuffer();
      audioBytes = new Uint8Array(buffer);
    } catch (error) {
      throw new AiProviderError("bad-response", "ElevenLabs 音频响应读取失败。", { cause: error });
    }

    if (audioBytes.length === 0) {
      throw new AiProviderError("synthesis-failed", "ElevenLabs 返回的音频为空。");
    }

    try {
      await this.writeFile(input.outputPath, audioBytes);
    } catch (error) {
      throw new AiProviderError("synthesis-failed", "语音文件写入失败。", { cause: error });
    }

    let durationSeconds: number;
    try {
      durationSeconds = await this.readDuration(input.outputPath);
    } catch (error) {
      throw new AiProviderError("synthesis-failed", "语音文件时长读取失败。", { cause: error });
    }

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new AiProviderError("synthesis-failed", "无法从生成文件中解析有效音频时长。");
    }

    return {
      audioPath: input.outputPath,
      durationSeconds,
    };
  }

  async generateAvatarVideo(_input: GenerateAvatarVideoInput): Promise<GenerateAvatarVideoResult> {
    throw new Error(UNWIRED_ERROR);
  }
}

export function createElevenLabsTtsProvider(options: ElevenLabsTtsProviderOptions): AiProvider {
  return new ElevenLabsTtsProvider(options);
}

function createDefaultFetchBinary(): FetchBinary {
  return async (url, init) => {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
    return {
      status: response.status,
      arrayBuffer: () => response.arrayBuffer(),
    };
  };
}

function createDefaultUploadVoiceSample(): UploadVoiceSample {
  return async (input) => {
    const form = new FormData();
    form.set("name", input.name);
    if (input.description) form.set("description", input.description);
    const bytes = new Uint8Array(input.data);
    form.append("files[]", new Blob([bytes.buffer]), input.fileName);
    const response = await fetch(`${ELEVENLABS_API_BASE}/v1/voices/add`, {
      method: "POST",
      headers: { "xi-api-key": input.apiKey },
      body: form,
    });
    return { status: response.status, json: () => response.json() };
  };
}

function createDefaultDeleteRemoteVoice(): DeleteRemoteVoice {
  return async ({ apiKey, voiceId }) => {
    const response = await fetch(`${ELEVENLABS_API_BASE}/v1/voices/${encodeURIComponent(voiceId)}`, {
      method: "DELETE",
      headers: { "xi-api-key": apiKey },
    });
    return { status: response.status };
  };
}

function fileNameFromPath(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() || "sample";
}

async function formatVoiceCloneFailure(response: { status: number; json(): Promise<unknown> }, sensitiveValues: string[]): Promise<string> {
  const fallback = `ElevenLabs 返回 HTTP ${response.status}，声音克隆失败。`;
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return fallback;
  }
  const detail = payload
    && typeof payload === "object"
    && "detail" in payload
    ? (payload as { detail?: unknown }).detail
    : undefined;
  const code = detail && typeof detail === "object" && typeof (detail as { code?: unknown }).code === "string"
    ? (detail as { code: string }).code
    : "";
  const diagnostic = voiceCloneDiagnosticFor(code);
  if (diagnostic) return `ElevenLabs 返回 HTTP ${response.status}：${diagnostic}。`;
  const message = detail && typeof detail === "object" && typeof (detail as { message?: unknown }).message === "string"
    ? redactRemoteMessage((detail as { message: string }).message, sensitiveValues)
    : undefined;
  return message ? `ElevenLabs 返回 HTTP ${response.status}：服务端说明：${message}` : fallback;
}

function redactRemoteMessage(message: string, sensitiveValues: string[]): string | undefined {
  const redacted = sensitiveValues.reduce(
    (result, value) => value.trim() ? result.replaceAll(value, "[已隐藏]") : result,
    message,
  ).replace(/\s+/g, " ").trim().slice(0, 240);
  return redacted || undefined;
}

function voiceCloneDiagnosticFor(code: string): string | undefined {
  return {
    invalid_audio: "样本音频无效或已损坏",
    invalid_audio_format: "样本音频格式不受支持",
    invalid_file_type: "样本文件类型不受支持",
    audio_too_long: "样本音频时长超过限制",
    audio_too_short: "样本音频时长不足",
    request_too_large: "样本文件超过大小限制",
    missing_required_field: "请求缺少必填字段",
    invalid_parameters: "请求参数不合法",
    invalid_content_type: "上传请求格式不正确",
    bad_request: "上传请求无效",
  }[code];
}
