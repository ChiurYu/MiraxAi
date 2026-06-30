import { sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type WorkflowStageRuntimeMode } from "@mirax/core";
import { AiProviderError, createCosyVoiceProvider, type AiProvider } from "@mirax/provider-ai";
import { findEnabledVoiceCloneProviderConfig } from "./useAppSettings.js";

export interface VoiceCloneProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  mockProvider: AiProvider;
}

export type VoiceCloneProviderSelectionResult =
  | { ok: true; provider: AiProvider }
  | { ok: false; error: AiProviderError };

export function selectVoiceCloneProvider(input: VoiceCloneProviderSelectionInput): VoiceCloneProviderSelectionResult {
  if (input.stageMode === "mock") {
    return { ok: true, provider: input.mockProvider };
  }

  if (input.stageMode === "not-connected") {
    return {
      ok: false,
      error: new AiProviderError("not-connected", "Voice-clone 真实声音克隆未连接。"),
    };
  }

  const config = findEnabledVoiceCloneProviderConfig(input.providerConfigs);
  if (!config) {
    const hasEnabled = input.providerConfigs.some((c) => c.enabled);
    return {
      ok: false,
      error: new AiProviderError(
        "not-configured",
        hasEnabled ? "当前启用的 provider 不适用于声音克隆，请启用 CosyVoice。" : "未启用任何声音克隆 provider。",
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
      error: new AiProviderError("not-configured", "创建声音克隆 provider 失败。"),
    };
  }
}
