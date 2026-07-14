import { describe, expect, it } from "vitest";
import type { ApiKeyProviderConfig } from "@mirax/core";
import type { ProjectVoiceCloneRecord, VoiceSampleRecord, VoiceSampleStorageRootRecord } from "@mirax/local-store";
import { VoiceCloneLifecycleError, runVoiceClone, type VoiceCloneLifecycleDeps } from "./voiceCloneLifecycle.js";

const config: ApiKeyProviderConfig = {
  id: "eleven", label: "ElevenLabs", provider: "elevenlabs-tts", apiKey: "el-secret", model: "eleven_multilingual_v2", enabled: true,
};
const root: VoiceSampleStorageRootRecord = { id: "root-1", path: "/managed", createdAt: "2026-07-13T00:00:00.000Z" };

function makeDeps(overrides: Partial<VoiceCloneLifecycleDeps> = {}) {
  const events: string[] = [];
  const samples: VoiceSampleRecord[] = [];
  const clones: ProjectVoiceCloneRecord[] = [];
  const deps: VoiceCloneLifecycleDeps = {
    requireDb: async () => { events.push("require-db"); return {}; },
    requireActiveWritableRoot: async () => { events.push("require-root"); return root; },
    providerConfig: config,
    provider: {
      cloneVoice: async () => { events.push("upload"); return { voiceId: "remote-1", samplePath: "/managed/sample-1/voice.wav" }; },
      deleteRemoteVoice: async () => { events.push("delete-remote"); },
    },
    validateSource: async () => true,
    createId: () => "sample-1",
    now: () => "2026-07-13T00:00:00.000Z",
    saveSample: async (record) => { samples.push(record); },
    saveClone: async (record) => { clones.push(record); },
    importManagedVoiceSample: async () => {
      events.push("import-managed-copy");
      return { relativePath: "sample-1/voice.wav", fileName: "voice.wav", mimeType: "audio/wav", sizeBytes: 3 };
    },
    readManagedVoiceSample: async () => { events.push("read-managed-copy"); return new Uint8Array([1, 2, 3]); },
    replaceActiveProjectVoiceClone: async () => { events.push("replace-active"); },
    ...overrides,
  };
  return { deps, events, samples, clones };
}

const input = {
  projectId: "project-1", providerConfigId: "eleven", sourcePath: "/original/voice.wav", voiceName: "我的授权音色",
  consent: { accepted: true as const, policyVersion: "v1", acceptedAt: "2026-07-13T00:00:00.000Z" },
};

describe("runVoiceClone", () => {
  it("persists the remote checkpoint before atomically activating the clone", async () => {
    const { deps, events, clones } = makeDeps({
      saveClone: async (record) => {
        clones.push(record);
        if (record.state === "creating" && !record.requestStartedAt) events.push("create-creating");
        if (record.state === "creating" && record.requestStartedAt) events.push("mark-request-started");
        if (record.state === "remote-created") events.push("mark-remote-created");
      },
    });

    const result = await runVoiceClone(input, deps);

    expect(result.state).toBe("active");
    expect(events).toEqual([
      "require-db", "require-root", "create-creating", "import-managed-copy", "mark-request-started",
      "read-managed-copy", "upload", "mark-remote-created", "replace-active",
    ]);
    expect(clones.some((clone) => clone.state === "remote-created" && clone.remoteVoiceId === "remote-1")).toBe(true);
  });

  it("does not touch a source or provider when consent, root, source, or selected provider is invalid", async () => {
    for (const overrides of [
      { requireActiveWritableRoot: async () => { throw new Error("no root"); } },
      { validateSource: async () => false },
      { providerConfig: { ...config, enabled: false } },
    ]) {
      const { deps, events } = makeDeps(overrides);
      await expect(runVoiceClone(input, deps)).rejects.toBeInstanceOf(VoiceCloneLifecycleError);
      expect(events).not.toContain("import-managed-copy");
      expect(events).not.toContain("read-managed-copy");
      expect(events).not.toContain("upload");
    }
    const { deps, events } = makeDeps();
    await expect(runVoiceClone({ ...input, consent: { ...input.consent, accepted: false } } as never, deps)).rejects.toMatchObject({ code: "consent-required" });
    expect(events).not.toContain("import-managed-copy");
  });

  it("keeps the old active clone unchanged when ElevenLabs requires verification", async () => {
    const { deps, events } = makeDeps({
      provider: { cloneVoice: async () => ({ voiceId: "remote-1", samplePath: "/managed/a.wav", requiresVerification: true }) },
    });
    const result = await runVoiceClone(input, deps);
    expect(result.state).toBe("pending-verification");
    expect(events).not.toContain("replace-active");
  });

  it("retains the checkpoint and records cleanup-required when activation and remote cleanup fail", async () => {
    const { deps, clones, events } = makeDeps({
      replaceActiveProjectVoiceClone: async () => { throw new Error("activation failed"); },
      provider: {
        cloneVoice: async () => ({ voiceId: "remote-1", samplePath: "/managed/a.wav" }),
        deleteRemoteVoice: async () => { events.push("delete-remote"); throw new Error("delete failed"); },
      },
    });
    await expect(runVoiceClone(input, deps)).rejects.toMatchObject({ code: "activation-failed" });
    expect(events.filter((event) => event === "delete-remote")).toHaveLength(1);
    expect(clones.at(-1)?.state).toBe("remote-cleanup-required");
    expect(clones.some((clone) => clone.state === "remote-created" && clone.remoteVoiceId === "remote-1")).toBe(true);
  });

  it("never activates when persisting the remote checkpoint fails", async () => {
    const { deps, events } = makeDeps({
      saveClone: async (record) => {
        if (record.state === "remote-created") throw new Error("checkpoint failed");
      },
      provider: {
        cloneVoice: async () => ({ voiceId: "remote-1", samplePath: "/managed/a.wav" }),
        deleteRemoteVoice: async () => { events.push("delete-remote"); },
      },
    });
    await expect(runVoiceClone(input, deps)).rejects.toMatchObject({ code: "remote-outcome-unrecorded" });
    expect(events).not.toContain("replace-active");
    expect(events.filter((event) => event === "delete-remote")).toHaveLength(1);
  });

  it("records the actual BaiLian Qwen provider on the project clone", async () => {
    const qwenConfig: ApiKeyProviderConfig = {
      id: "qwen", label: "百炼 Qwen", provider: "bailian-qwen-tts", apiKey: "bailian-key",
      baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1", model: "qwen3-tts-vc-2026-01-22", enabled: true,
    };
    const { deps, clones } = makeDeps({ providerConfig: qwenConfig });

    await runVoiceClone({ ...input, providerConfigId: "qwen" }, deps);

    expect(clones[0]).toMatchObject({ provider: "bailian-qwen-tts", providerConfigId: "qwen" });
  });

  it("passes the one-shot CosyVoice OSS URL to the provider without storing it in sample or clone records", async () => {
    const cosyConfig: ApiKeyProviderConfig = {
      id: "cosy", label: "百炼 CosyVoice", provider: "bailian-cosyvoice", apiKey: "bailian-key",
      baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1", model: "cosyvoice-v3.5-flash", enabled: true,
    };
    const ossUrl = "https://bucket.oss.example.com/sample.wav?signature=temporary";
    let providerInput: unknown;
    const { deps, samples, clones } = makeDeps({
      providerConfig: cosyConfig,
      provider: { cloneVoice: async (cloneInput) => {
        providerInput = cloneInput;
        return { voiceId: "cosy-remote-1", samplePath: "/managed/sample-1/voice.wav" };
      } },
    });

    await runVoiceClone({ ...input, providerConfigId: "cosy", externalSampleUrl: ossUrl }, deps);

    expect(providerInput).toMatchObject({ externalSampleUrl: ossUrl });
    expect(JSON.stringify(samples)).not.toContain(ossUrl);
    expect(JSON.stringify(clones)).not.toContain(ossUrl);
  });

  it("does not touch local samples or the provider when CosyVoice lacks its required HTTPS URL", async () => {
    const cosyConfig: ApiKeyProviderConfig = {
      id: "cosy", label: "百炼 CosyVoice", provider: "bailian-cosyvoice", apiKey: "bailian-key",
      baseUrl: "https://workspace.cn-beijing.maas.aliyuncs.com/api/v1", model: "cosyvoice-v3.5-flash", enabled: true,
    };
    const { deps, events } = makeDeps({ providerConfig: cosyConfig });

    await expect(runVoiceClone({ ...input, providerConfigId: "cosy" }, deps)).rejects.toMatchObject({ code: "not-configured" });
    expect(events).not.toContain("import-managed-copy");
    expect(events).not.toContain("upload");
  });
});
