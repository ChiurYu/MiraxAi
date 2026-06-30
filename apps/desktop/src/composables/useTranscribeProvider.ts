import { sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type WorkflowStageRuntimeMode } from "@mirax/core";
import { AiProviderError, createWhisperProvider, type AiProvider } from "@mirax/provider-ai";
import { findEnabledTranscribeProviderConfig } from "./useAppSettings.js";

export interface TranscribeProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  mockProvider: AiProvider;
}

export type TranscribeProviderSelectionResult =
  | { ok: true; provider: AiProvider }
  | { ok: false; error: AiProviderError };

export function selectTranscribeProvider(input: TranscribeProviderSelectionInput): TranscribeProviderSelectionResult {
  if (input.stageMode === "mock") {
    return { ok: true, provider: input.mockProvider };
  }

  if (input.stageMode === "not-connected") {
    return {
      ok: false,
      error: new AiProviderError("not-connected", "Transcribe 真实转写未连接。"),
    };
  }

  const config = findEnabledTranscribeProviderConfig(input.providerConfigs);
  if (!config) {
    const hasEnabled = input.providerConfigs.some((c) => c.enabled);
    return {
      ok: false,
      error: new AiProviderError(
        "not-configured",
        hasEnabled ? "当前启用的 provider 不适用于素材转写，请启用 Whisper。" : "未启用任何转写 provider。",
      ),
    };
  }

  const sanitizedBaseUrl = config.baseUrl ? sanitizeBaseUrlForStorage(config.baseUrl.trim()) : undefined;
  if (!sanitizedBaseUrl) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "Whisper provider 必须提供合法 baseUrl。"),
    };
  }

  if (!config.model?.trim()) {
    return {
      ok: false,
      error: new AiProviderError("not-configured", "Whisper provider model 为空。"),
    };
  }

  try {
    return {
      ok: true,
      provider: createWhisperProvider({
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
      error: new AiProviderError("not-configured", "创建转写 provider 失败。"),
    };
  }
}
