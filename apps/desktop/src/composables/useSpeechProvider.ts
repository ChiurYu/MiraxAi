import { sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type WorkflowStageRuntimeMode } from "@mirax/core";
import { AiProviderError, createCosyVoiceProvider, type AiProvider } from "@mirax/provider-ai";
import { findEnabledSpeechProviderConfig } from "./useAppSettings.js";

export interface SpeechProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  mockProvider: AiProvider;
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

  const config = findEnabledSpeechProviderConfig(input.providerConfigs);
  if (!config) {
    const hasEnabled = input.providerConfigs.some((c) => c.enabled);
    return {
      ok: false,
      error: new AiProviderError(
        "not-configured",
        hasEnabled ? "当前启用的 provider 不适用于语音合成，请启用 CosyVoice。" : "未启用任何 TTS provider。",
      ),
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

export function buildSpeechOutputPath(audioOutputRoot: string, projectId: string): string {
  return joinPath(audioOutputRoot, projectId, "speech", "speech.wav");
}

function joinPath(...segments: string[]): string {
  return segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/")
    .replace(/^/, segments[0]?.startsWith("/") ? "/" : "");
}
