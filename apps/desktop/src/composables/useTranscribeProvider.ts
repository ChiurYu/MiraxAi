import { readFile } from "@tauri-apps/plugin-fs";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type WorkflowStageRuntimeMode } from "@mirax/core";
import {
  AiProviderError,
  createLocalWhisperProvider,
  createWhisperProvider,
  type AiProvider,
  type RunLocalWhisperInput,
} from "@mirax/provider-ai";
import { findEnabledTranscribeProviderConfig } from "./useAppSettings.js";

export interface TranscribeProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  mockProvider: AiProvider;
  invoke?: (command: string, args: Record<string, unknown>) => Promise<unknown>;
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
        hasEnabled ? "当前启用的 provider 不适用于素材转写，请启用 Whisper / 本地 Whisper。" : "未启用任何转写 provider。",
      ),
    };
  }

  if (config.provider === "local-whisper") {
    if (!config.model?.trim()) {
      return {
        ok: false,
        error: new AiProviderError("not-configured", "本地 Whisper provider model 为空。"),
      };
    }

    try {
      const invoke = input.invoke ?? tauriInvoke;
      return {
        ok: true,
        provider: createLocalWhisperProvider({
          pythonPath: config.pythonPath,
          model: config.model,
          runLocalWhisper: createTauriLocalWhisperRunner(invoke),
        }),
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        return { ok: false, error };
      }
      return {
        ok: false,
        error: new AiProviderError("not-configured", "创建本地转写 provider 失败。"),
      };
    }
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
        readAudioFile: (path) => readFile(path),
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

function createTauriLocalWhisperRunner(
  invoke: (command: string, args: Record<string, unknown>) => Promise<unknown>,
): (input: RunLocalWhisperInput) => Promise<string> {
  return async (input: RunLocalWhisperInput) => {
    try {
      const result = await invoke("run_local_whisper", {
        pythonPath: input.pythonPath,
        model: input.model,
        device: input.device,
        computeType: input.computeType,
        audioPath: input.audioPath,
        language: input.language,
      });
      if (typeof result !== "string") {
        throw new AiProviderError("transcribe-failed", "本地 Whisper 返回格式异常。");
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.startsWith("not-configured:")) {
        throw new AiProviderError("not-configured", message.slice("not-configured:".length).trim());
      }
      if (message.startsWith("transcribe-failed:")) {
        throw new AiProviderError("transcribe-failed", message.slice("transcribe-failed:".length).trim());
      }
      if (error instanceof AiProviderError) {
        throw error;
      }
      throw new AiProviderError("transcribe-failed", "本地 Whisper 调用失败。");
    }
  };
}
