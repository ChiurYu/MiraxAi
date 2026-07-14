import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig } from "@mirax/core";
import { ResolveSpeechVoiceError, resolveSpeechVoice } from "./resolveSpeechVoice.js";

const config = (overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig => ({
  id: "eleven", label: "ElevenLabs", provider: "elevenlabs-tts", apiKey: "el-secret", model: "eleven_multilingual_v2", voiceId: "default-voice", enabled: true, ...overrides,
});

describe("resolveSpeechVoice", () => {
  it("returns an active project clone's exact bound provider and remote Voice ID", async () => {
    await expect(resolveSpeechVoice({
      projectId: "project-1", providerConfigs: [config()], defaultProviderConfigId: "eleven",
      findActiveClone: async () => ({ id: "clone-1", projectId: "project-1", sampleId: "sample-1", providerConfigId: "eleven", provider: "elevenlabs-tts", remoteVoiceId: "project-voice", state: "active", createdAt: "now" }),
    })).resolves.toMatchObject({ providerConfig: config(), voiceId: "project-voice" });
  });

  it("does not fall back when an active clone's bound provider is disabled or missing credentials", async () => {
    const activeClone = async () => ({ id: "clone-1", projectId: "project-1", sampleId: "sample-1", providerConfigId: "eleven", provider: "elevenlabs-tts", remoteVoiceId: "project-voice", state: "active" as const, createdAt: "now" });
    for (const providerConfig of [config({ enabled: false }), config({ apiKey: "" }), config({ id: "other" })]) {
      await expect(resolveSpeechVoice({ projectId: "project-1", providerConfigs: [providerConfig], defaultProviderConfigId: "eleven", findActiveClone: activeClone }))
        .rejects.toBeInstanceOf(ResolveSpeechVoiceError);
    }
  });

  it("uses the default Voice ID only when no active clone exists", async () => {
    await expect(resolveSpeechVoice({ projectId: "project-1", providerConfigs: [config()], defaultProviderConfigId: "eleven", findActiveClone: async () => undefined }))
      .resolves.toMatchObject({ voiceId: "default-voice" });
  });

  it("returns an active BaiLian Qwen clone through its own ready provider configuration", async () => {
    const qwen = config({
      id: "qwen", provider: "bailian-qwen-tts", apiKey: "bailian-key", voiceId: undefined,
      baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1", model: "qwen3-tts-vc-2026-01-22",
    });
    await expect(resolveSpeechVoice({
      projectId: "project-1", providerConfigs: [qwen], defaultProviderConfigId: "qwen",
      findActiveClone: async () => ({ id: "clone-1", projectId: "project-1", sampleId: "sample-1", providerConfigId: "qwen", provider: "bailian-qwen-tts", remoteVoiceId: "qwen-voice", state: "active", createdAt: "now" }),
    })).resolves.toMatchObject({ providerConfig: qwen, voiceId: "qwen-voice" });
  });
});
