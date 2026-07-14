import { sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type WorkflowStageRuntimeMode } from "@mirax/core";
import { AiProviderError, createBaiLianTtsProvider, createCosyVoiceProvider, createElevenLabsTtsProvider, type AiProvider, type FetchBinary, type FetchJson } from "@mirax/provider-ai";
import { findEnabledSpeechProviderConfig } from "./useAppSettings.js";
import type { ReadAudioDuration, WriteAudioFile } from "@mirax/provider-ai";

export interface SpeechProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  selectedProviderConfigId?: string;
  mockProvider: AiProvider;
  writeFile?: WriteAudioFile;
  readDuration?: ReadAudioDuration;
  baiLianFetchJson?: FetchJson;
  baiLianFetchBinary?: FetchBinary;
}

export type SpeechProviderSelectionResult =
  | { ok: true; provider: AiProvider }
  | { ok: false; error: AiProviderError };

export function selectSpeechProvider(input: SpeechProviderSelectionInput): SpeechProviderSelectionResult {
  if (input.stageMode === "mock") {
    return { ok: true, provider: input.mockProvider };
  }

  if (input.stageMode === "not-connected") {
    return {
      ok: false,
      error: new AiProviderError("not-connected", "Speech 真实 TTS 未连接。"),
    };
  }

  const config = input.selectedProviderConfigId
    ? input.providerConfigs.find((candidate) => candidate.id === input.selectedProviderConfigId && isSpeechProvider(candidate))
    : findEnabledSpeechProviderConfig(input.providerConfigs);
  if (!config) {
    const hasEnabled = input.providerConfigs.some((c) => c.enabled);
    return {
      ok: false,
      error: new AiProviderError(
        "not-configured",
        hasEnabled ? "当前启用的 provider 不适用于语音合成，请启用 CosyVoice、百炼或 ElevenLabs TTS。" : "未启用任何 TTS provider。",
      ),
    };
  }

  if (config.provider === "elevenlabs-tts") {
    if (!input.writeFile || !input.readDuration) {
      return {
        ok: false,
        error: new AiProviderError("not-configured", "ElevenLabs TTS 运行依赖未注入。"),
      };
    }
    if (!config.apiKey.trim()) {
      return { ok: false, error: new AiProviderError("not-configured", "ElevenLabs API Key 未配置。") };
    }
    if (!config.model?.trim()) {
      return { ok: false, error: new AiProviderError("not-configured", "ElevenLabs model 未配置。") };
    }

    try {
      return {
        ok: true,
        provider: createElevenLabsTtsProvider({
          apiKey: config.apiKey,
          voiceId: config.voiceId,
          model: config.model,
          writeFile: input.writeFile,
          readDuration: input.readDuration,
        }),
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        return { ok: false, error };
      }
      return { ok: false, error: new AiProviderError("not-configured", "创建 ElevenLabs TTS provider 失败。") };
    }
  }

  if (config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice") {
    if (!input.writeFile || !input.readDuration) {
      return { ok: false, error: new AiProviderError("not-configured", "百炼 TTS 运行依赖未注入。") };
    }
    if (!config.apiKey.trim() || !config.model?.trim()) {
      return { ok: false, error: new AiProviderError("not-configured", "百炼 API Key 或模型未配置。") };
    }
    const baseUrl = config.baseUrl ? sanitizeBaseUrlForStorage(config.baseUrl.trim()) : undefined;
    if (!baseUrl) {
      return { ok: false, error: new AiProviderError("not-configured", "百炼 provider 必须提供合法业务空间 Base URL。") };
    }
    return {
      ok: true,
      provider: createBaiLianTtsProvider({
        kind: config.provider === "bailian-qwen-tts" ? "qwen" : "cosyvoice",
        apiKey: config.apiKey,
        baseUrl,
        model: config.model,
        writeFile: input.writeFile,
        readDuration: input.readDuration,
        fetchJson: input.baiLianFetchJson,
        fetchBinary: input.baiLianFetchBinary,
      }),
    };
  }

  const sanitizedBaseUrl = config.baseUrl ? sanitizeBaseUrlForStorage(config.baseUrl.trim()) : undefined;
  if (!sanitizedBaseUrl) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "CosyVoice provider 必须提供合法 baseUrl。"),
    };
  }

  try {
    return {
      ok: true,
      provider: createCosyVoiceProvider({
        baseUrl: sanitizedBaseUrl,
        apiKey: config.apiKey,
        model: config.model,
      }),
    };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new AiProviderError("not-configured", "创建 TTS provider 失败。"),
    };
  }
}

function isSpeechProvider(config: ApiKeyProviderConfig): boolean {
  return config.enabled && (config.provider === "cosyvoice" || config.provider === "elevenlabs-tts" || config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice");
}

export function buildSpeechOutputPath(audioOutputRoot: string, projectId: string, provider?: string): string {
  const fileName = provider === "elevenlabs-tts" ? "speech.mp3" : "speech.wav";
  return joinPath(audioOutputRoot, projectId, "speech", fileName);
}

export type TauriInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

/**
 * 基于 Tauri `write_binary_file` command 创建二进制音频文件写入器。
 */
export function createTauriAudioFileWriter(invoke: TauriInvoke, allowedRoot: string): WriteAudioFile {
  return async (path, data) => {
    await invoke("write_binary_file", { path, data: Array.from(data), allowedRoot });
  };
}

/**
 * 基于 Tauri `probe_audio_duration` command 创建音频时长读取器。
 */
export function createTauriAudioDurationProber(invoke: TauriInvoke, allowedRoot: string, ffmpegPath: string): ReadAudioDuration {
  return async (path) => {
    const result = await invoke("probe_audio_duration", { path, allowedRoot, ffmpegPath: ffmpegPath.trim() });
    if (typeof result !== "number") {
      throw new Error("probe_audio_duration returned non-number");
    }
    return result;
  };
}

function joinPath(...segments: string[]): string {
  return segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
    .replace(/^/, segments[0]?.startsWith("/") ? "/" : "");
}
