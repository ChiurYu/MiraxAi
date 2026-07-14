import type { ApiKeyProviderConfig } from "@mirax/core";
import type { ProjectVoiceCloneRecord } from "@mirax/local-store";

export interface ResolveSpeechVoiceInput {
  projectId: string;
  providerConfigs: ApiKeyProviderConfig[];
  defaultProviderConfigId?: string;
  findActiveClone(projectId: string): Promise<ProjectVoiceCloneRecord | undefined>;
}

export class ResolveSpeechVoiceError extends Error {
  constructor(readonly code: "project-voice-unavailable", message: string) {
    super(message);
    this.name = "ResolveSpeechVoiceError";
  }
}

export async function resolveSpeechVoice(input: ResolveSpeechVoiceInput): Promise<{ providerConfig: ApiKeyProviderConfig; voiceId: string }> {
  const clone = await input.findActiveClone(input.projectId);
  if (clone) {
    const config = input.providerConfigs.find((candidate) => candidate.id === clone.providerConfigId);
    if (!isReadyCloneSpeechProvider(config) || !clone.remoteVoiceId?.trim()) {
      throw new ResolveSpeechVoiceError("project-voice-unavailable", "项目绑定的声音 provider 不可用。");
    }
    return { providerConfig: config, voiceId: clone.remoteVoiceId.trim() };
  }
  const config = input.providerConfigs.find((candidate) => candidate.id === input.defaultProviderConfigId);
  if (!isReadyDefaultElevenLabs(config) || !config.voiceId?.trim()) {
    throw new ResolveSpeechVoiceError("project-voice-unavailable", "默认 ElevenLabs Voice ID 不可用。");
  }
  return { providerConfig: config, voiceId: config.voiceId.trim() };
}

function isReadyCloneSpeechProvider(config: ApiKeyProviderConfig | undefined): config is ApiKeyProviderConfig {
  if (!config || !config.enabled || !config.apiKey.trim() || !config.model?.trim()) return false;
  if (config.provider === "elevenlabs-tts") return true;
  return (config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice") && Boolean(config.baseUrl?.trim());
}

function isReadyDefaultElevenLabs(config: ApiKeyProviderConfig | undefined): config is ApiKeyProviderConfig {
  return Boolean(config && config.provider === "elevenlabs-tts" && config.enabled && config.apiKey.trim() && config.model?.trim());
}
