import { sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type WorkflowStageRuntimeMode } from "@mirax/core";
import { AiProviderError, createBaiLianTtsProvider, createElevenLabsTtsProvider, type AiProvider, type FetchJson, type ReadAudioFile } from "@mirax/provider-ai";

export interface VoiceCloneProviderSelectionInput {
  stageMode: WorkflowStageRuntimeMode;
  providerConfigs: ApiKeyProviderConfig[];
  selectedProviderConfigId?: string;
  mockProvider: AiProvider;
  readAudioFile?: ReadAudioFile;
  baiLianFetchJson?: FetchJson;
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

  const config = input.providerConfigs.find((candidate) => candidate.id === input.selectedProviderConfigId);
  if (!config || !config.enabled || !config.apiKey.trim() || !config.model?.trim()) {
    return { ok: false, error: new AiProviderError("not-configured", "请选择已启用且配置完整的声音克隆 provider。") };
  }

  try {
    if (config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice") {
      const baseUrl = config.baseUrl ? sanitizeBaseUrlForStorage(config.baseUrl) : undefined;
      if (!baseUrl || (config.provider === "bailian-qwen-tts" && !input.readAudioFile)) {
        return { ok: false, error: new AiProviderError("not-configured", "百炼 provider 需要 API Key、业务空间 Base URL、模型和本地样本读取能力。") };
      }
      return {
        ok: true,
        provider: createBaiLianTtsProvider({
          kind: config.provider === "bailian-qwen-tts" ? "qwen" : "cosyvoice",
          apiKey: config.apiKey,
          baseUrl,
          model: config.model,
          readAudioFile: input.readAudioFile,
          fetchJson: input.baiLianFetchJson,
        }),
      };
    }
    if (config.provider !== "elevenlabs-tts" || !input.readAudioFile) {
      return { ok: false, error: new AiProviderError("not-configured", "请选择已启用且配置完整的 ElevenLabs 或百炼声音克隆 provider。") };
    }
    return {
      ok: true,
      provider: createElevenLabsTtsProvider({
        apiKey: config.apiKey,
        voiceId: config.voiceId,
        model: config.model,
        readAudioFile: input.readAudioFile,
      }),
    };
  } catch (error) {
    if (error instanceof AiProviderError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new AiProviderError("not-configured", "创建 ElevenLabs 声音克隆 provider 失败。"),
    };
  }
}
