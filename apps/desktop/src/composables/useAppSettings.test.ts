import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import type { ApiKeyProviderConfig } from "@mirax/core";
import { FakeLocalStoreDb } from "@mirax/local-store";
import {
  findActiveRewriteProviderConfig,
  findEnabledAvatarProviderConfig,
  findEnabledRewriteProviderConfig,
  findEnabledSpeechProviderConfig,
  findEnabledTranscribeProviderConfig,
  findEnabledVoiceCloneProviderConfig,
  getProviderReadiness,
  probeFfmpegPath,
  setInitialAppSettingsSnapshot,
  setLocalStoreDb,
  useAppSettings,
} from "./useAppSettings.js";
import { loadAppSettingsSnapshotFromDb } from "../localStore/loadSnapshot.js";

function createFakeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = value;
    },
    removeItem(key: string) {
      delete store[key];
    },
    clear() {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    get length() {
      return Object.keys(store).length;
    },
  } as Storage;
}

describe("useAppSettings", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = createFakeStorage();
  });

  it("loads saved settings and sidecar config", () => {
    const storage = createFakeStorage();
    storage.setItem(
      "mirax-ai.app-settings.v1",
      JSON.stringify({
        appSettings: {
          id: "default",
          theme: "dark",
          outputPaths: { baseOutput: "/tmp/mirax" },
        },
        sidecarConfig: {
          id: "default",
          ffmpegPath: "/tmp/ffmpeg",
          hasPlaywrightBrowser: true,
        },
      }),
    );

    const { appSettings, sidecarConfig, saveStatus } = useAppSettings({ storage });

    expect(saveStatus.value).toBe("已恢复设置");
    expect(appSettings.theme).toBe("dark");
    expect(sidecarConfig.ffmpegPath).toBe("/tmp/ffmpeg");
    expect(sidecarConfig.hasPlaywrightBrowser).toBe(true);
    expect(appSettings.outputPaths.audioOutput).toContain("audio");
  });

  it("adds, updates and removes provider configs", () => {
    const { providerConfigs, addProviderConfig, updateProviderConfig, removeProviderConfig } = useAppSettings();

    addProviderConfig({
      id: "p1",
      label: "主模型",
      provider: "openai",
      apiKey: "sk-secret",
      baseUrl: "https://api.example.com",
      model: "gpt-4",
      enabled: true,
    });

    expect(providerConfigs.value).toHaveLength(1);

    updateProviderConfig({ ...providerConfigs.value[0], label: "主模型已更新" });
    expect(providerConfigs.value[0].label).toBe("主模型已更新");

    removeProviderConfig("p1");
    expect(providerConfigs.value).toHaveLength(0);
  });

  it("clears rewriteProviderConfigId when the active provider is removed", () => {
    const {
      appSettings,
      providerConfigs,
      addProviderConfig,
      removeProviderConfig,
      setRewriteProviderConfigId,
    } = useAppSettings();

    addProviderConfig({
      id: "p-active",
      label: "Active",
      provider: "openai",
      apiKey: "sk-active",
      model: "gpt-4",
      enabled: true,
    });

    setRewriteProviderConfigId("p-active");
    expect(appSettings.rewriteProviderConfigId).toBe("p-active");

    removeProviderConfig("p-active");
    expect(providerConfigs.value).toHaveLength(0);
    expect(appSettings.rewriteProviderConfigId).toBeUndefined();
  });

  it("clears rewriteProviderConfigId when set to undefined", () => {
    const { appSettings, setRewriteProviderConfigId } = useAppSettings();

    setRewriteProviderConfigId("p-active");
    expect(appSettings.rewriteProviderConfigId).toBe("p-active");

    setRewriteProviderConfigId(undefined);
    expect(appSettings.rewriteProviderConfigId).toBeUndefined();
  });

  it("does not persist provider apiKey to storage", async () => {
    const storage = createFakeStorage();
    const { providerConfigs, addProviderConfig } = useAppSettings({ storage });

    addProviderConfig({
      id: "p1",
      label: "主模型",
      provider: "openai",
      apiKey: "sk-secret",
      enabled: true,
    });

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfigs[0]).not.toHaveProperty("apiKey");
  });

  it("persists theme, output path and sidecar config changes", async () => {
    const storage = createFakeStorage();
    const { appSettings, sidecarConfig } = useAppSettings({ storage });

    appSettings.theme = "light";
    appSettings.outputPaths.baseOutput = "/tmp/mirax-output";
    sidecarConfig.ffmpegPath = "/opt/ffmpeg";
    sidecarConfig.hasPlaywrightBrowser = true;

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.appSettings.theme).toBe("light");
    expect(parsed.appSettings.outputPaths.baseOutput).toBe("/tmp/mirax-output");
    expect(parsed.sidecarConfig.ffmpegPath).toBe("/opt/ffmpeg");
    expect(parsed.sidecarConfig.hasPlaywrightBrowser).toBe(true);
  });

  it("keeps verifiedFfmpegPath as a session-only value and does not persist it", async () => {
    const storage = createFakeStorage();
    const { sidecarConfig, verifiedFfmpegPath } = useAppSettings({ storage });

    sidecarConfig.ffmpegPath = "/opt/ffmpeg";
    await nextTick();
    verifiedFfmpegPath.value = "/opt/ffmpeg";

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1")!;
    const parsed = JSON.parse(raw);
    expect(parsed).not.toHaveProperty("verifiedFfmpegPath");
    expect(raw).not.toContain("verifiedFfmpegPath");
  });

  it("clears verifiedFfmpegPath when ffmpegPath changes", async () => {
    const storage = createFakeStorage();
    const { sidecarConfig, verifiedFfmpegPath } = useAppSettings({ storage });

    sidecarConfig.ffmpegPath = "/opt/ffmpeg";
    await nextTick();
    verifiedFfmpegPath.value = "/opt/ffmpeg";
    expect(verifiedFfmpegPath.value).toBe("/opt/ffmpeg");

    sidecarConfig.ffmpegPath = "/usr/bin/ffmpeg";
    await nextTick();
    expect(verifiedFfmpegPath.value).toBe("");
  });

  it("tracks provider verification as session-only state", () => {
    const { markProviderVerified, clearProviderVerified, isProviderVerified } = useAppSettings();

    markProviderVerified("p1");
    expect(isProviderVerified("p1")).toBe(true);

    clearProviderVerified("p1");
    expect(isProviderVerified("p1")).toBe(false);
  });

  it("clears verified status when a provider config is updated or removed", () => {
    const {
      providerConfigs,
      addProviderConfig,
      updateProviderConfig,
      removeProviderConfig,
      markProviderVerified,
      isProviderVerified,
      markProviderFailed,
      isProviderFailed,
    } = useAppSettings();

    addProviderConfig({
      id: "p1",
      label: "A",
      provider: "openai",
      apiKey: "sk-test",
      model: "gpt-4",
      enabled: true,
    });

    markProviderVerified("p1");
    markProviderFailed("p1");
    expect(isProviderVerified("p1")).toBe(true);
    expect(isProviderFailed("p1")).toBe(true);

    updateProviderConfig({ ...providerConfigs.value[0], label: "A2" });
    expect(isProviderVerified("p1")).toBe(false);
    expect(isProviderFailed("p1")).toBe(false);

    markProviderVerified("p1");
    markProviderFailed("p1");
    removeProviderConfig("p1");
    expect(isProviderVerified("p1")).toBe(false);
    expect(isProviderFailed("p1")).toBe(false);
  });

  it("clears verified provider status when provider configs are restored", () => {
    const { restore, markProviderVerified, isProviderVerified, markProviderFailed, isProviderFailed } = useAppSettings();

    markProviderVerified("p1");
    markProviderFailed("p1");
    expect(isProviderVerified("p1")).toBe(true);
    expect(isProviderFailed("p1")).toBe(true);

    restore({
      providerConfigs: [
        {
          id: "p1",
          label: "Restored",
          provider: "openai",
          model: "gpt-4",
          enabled: true,
        },
      ],
    });

    expect(isProviderVerified("p1")).toBe(false);
    expect(isProviderFailed("p1")).toBe(false);
  });

  it("tracks failed provider status as session-only state", () => {
    const { markProviderFailed, clearProviderFailed, isProviderFailed } = useAppSettings();

    markProviderFailed("p1");
    expect(isProviderFailed("p1")).toBe(true);

    clearProviderFailed("p1");
    expect(isProviderFailed("p1")).toBe(false);
  });

  it("does not persist provider connection state to storage", async () => {
    const storage = createFakeStorage();
    storage.setItem("mirax-ai.app-settings.v1", JSON.stringify({}));
    const { markProviderVerified, markProviderFailed } = useAppSettings({ storage });

    markProviderVerified("p1");
    markProviderFailed("p2");
    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1")!;
    expect(raw).not.toContain("verifiedProviderIds");
    expect(raw).not.toContain("failedProviderIds");
  });

  it("persists provider metadata without apiKey", async () => {
    const storage = createFakeStorage();
    const { providerConfigs, addProviderConfig } = useAppSettings({ storage });

    addProviderConfig({
      id: "p-meta",
      label: "Whisper 本地",
      provider: "whisper",
      apiKey: "sk-secret",
      baseUrl: "http://localhost:9000",
      model: "whisper-v3",
      enabled: false,
    });

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    const meta = parsed.providerConfigs[0];
    expect(meta).toEqual({
      id: "p-meta",
      label: "Whisper 本地",
      provider: "whisper",
      baseUrl: "http://localhost:9000",
      model: "whisper-v3",
      enabled: false,
    });
  });

  it("persists the active settings section only when persistSection is true", async () => {
    const storage = createFakeStorage();
    const { settingsSection, setSettingsSection } = useAppSettings({ storage, persistSection: true });

    setSettingsSection("local-dependencies");

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.section).toBe("local-dependencies");
  });

  it("does not overwrite the stored active section from a non-owner instance", async () => {
    const storage = createFakeStorage();
    storage.setItem(
      "mirax-ai.app-settings.v1",
      JSON.stringify({
        appSettings: { id: "default", theme: "dark", outputPaths: { baseOutput: "/tmp/mirax" } },
        providerConfigs: [
          {
            id: "p1",
            label: "OpenAI 主模型",
            provider: "openai",
            baseUrl: "https://api.openai.com/v1",
            model: "gpt-4.1",
            enabled: true,
          },
        ],
        section: "ai-services",
      }),
    );

    const { providerConfigs, updateProviderConfig } = useAppSettings({ storage });

    updateProviderConfig({ ...providerConfigs.value[0], enabled: false });

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.section).toBe("ai-services");
    expect(parsed.providerConfigs[0].enabled).toBe(false);
  });

  it("does not leak apiKey, token, cookie or credential into the snapshot", async () => {
    const storage = createFakeStorage();
    const { addProviderConfig } = useAppSettings({ storage });

    addProviderConfig({
      id: "p-leak",
      label: "泄漏检查",
      provider: "custom",
      apiKey: "sk-abc123",
      baseUrl: "https://api.example.com",
      model: "gpt-4",
      enabled: true,
      // Deliberately add fields that must be stripped by createSnapshot
      token: "session-token-value",
      cookie: "auth-cookie-value",
      credential: "user-password-value",
    } as unknown as ApiKeyProviderConfig);

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1")!;
    const lower = raw.toLowerCase();
    expect(lower).not.toContain("sk-abc123");
    expect(lower).not.toContain("session-token-value");
    expect(lower).not.toContain("auth-cookie-value");
    expect(lower).not.toContain("user-password-value");
    expect(lower).not.toContain("apikey");
    expect(lower).not.toContain("\"token\"");
    expect(lower).not.toContain("\"cookie\"");
    expect(lower).not.toContain("\"credential\"");
  });

  it("strips URL credentials, query and hash from persisted baseUrl", async () => {
    const storage = createFakeStorage();
    const { addProviderConfig } = useAppSettings({ storage });

    addProviderConfig({
      id: "p-url-token",
      label: "URL Token",
      provider: "custom",
      apiKey: "sk-secret",
      baseUrl: "https://user:pass@api.example.com/v1?token=url-secret-token#/path",
      model: "gpt-4",
      enabled: true,
    });

    await nextTick();

    const raw = storage.getItem("mirax-ai.app-settings.v1")!;
    expect(raw).not.toContain("url-secret-token");
    expect(raw).not.toContain("user:pass");
    const parsed = JSON.parse(raw);
    expect(parsed.providerConfigs[0].baseUrl).toBe("https://api.example.com/v1");
  });
});

describe("findEnabledRewriteProviderConfig", () => {
  function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
    return {
      id: "test",
      label: "Test",
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4",
      enabled: true,
      ...overrides,
    };
  }

  it("returns the first enabled openai/custom config", () => {
    const configs = [
      makeConfig({ id: "w", provider: "whisper", enabled: true }),
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "c", provider: "custom", enabled: true }),
    ];
    const found = findEnabledRewriteProviderConfig(configs);
    expect(found).toBeDefined();
    expect(found!.id).toBe("o");
  });

  it("returns custom provider when it is the only match", () => {
    const configs = [
      makeConfig({ id: "w", provider: "whisper", enabled: true }),
      makeConfig({ id: "c", provider: "custom", enabled: true }),
    ];
    const found = findEnabledRewriteProviderConfig(configs);
    expect(found).toBeDefined();
    expect(found!.id).toBe("c");
  });

  it("returns undefined when no openai/custom provider is enabled", () => {
    const configs = [
      makeConfig({ id: "w", provider: "whisper", enabled: true }),
      makeConfig({ id: "h", provider: "heygem", enabled: true }),
    ];
    expect(findEnabledRewriteProviderConfig(configs)).toBeUndefined();
  });

  it("returns undefined when matching provider is disabled", () => {
    const configs = [makeConfig({ id: "o", provider: "openai", enabled: false })];
    expect(findEnabledRewriteProviderConfig(configs)).toBeUndefined();
  });

  it("returns the in-memory config as-is and leaves sanitization to persistence boundaries", () => {
    const configs = [
      makeConfig({
        id: "c",
        provider: "custom",
        apiKey: "sk-secret",
        baseUrl: "https://user:pass@api.example.com/v1?token=secret#/hash",
      }),
    ];
    const found = findEnabledRewriteProviderConfig(configs);
    expect(found).toBeDefined();
    expect(found!.apiKey).toBe("sk-secret");
    // The helper returns the in-memory config as-is; sanitization happens at persistence boundaries.
    // This assertion documents that the returned object still carries the in-memory apiKey,
    // which is acceptable because it never leaves the memory boundary.
    expect(found!.baseUrl).toBe("https://user:pass@api.example.com/v1?token=secret#/hash");
  });
});

describe("findActiveRewriteProviderConfig", () => {
  function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
    return {
      id: "test",
      label: "Test",
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4",
      enabled: true,
      ...overrides,
    };
  }

  it("returns the config when active id matches a ready openai provider", () => {
    const configs = [makeConfig({ id: "active" })];
    const found = findActiveRewriteProviderConfig(configs, "active");
    expect(found).toBeDefined();
    expect(found!.id).toBe("active");
  });

  it("returns the config when active id matches a ready custom provider", () => {
    const configs = [
      makeConfig({ id: "active", provider: "custom", baseUrl: "https://api.example.com/v1" }),
    ];
    const found = findActiveRewriteProviderConfig(configs, "active");
    expect(found).toBeDefined();
    expect(found!.id).toBe("active");
    expect(found!.provider).toBe("custom");
  });

  it("returns undefined when active id does not match any config", () => {
    const configs = [makeConfig({ id: "other" })];
    expect(findActiveRewriteProviderConfig(configs, "active")).toBeUndefined();
  });

  it("returns undefined when active id matches a disabled config", () => {
    const configs = [makeConfig({ id: "active", enabled: false })];
    expect(findActiveRewriteProviderConfig(configs, "active")).toBeUndefined();
  });

  it("returns undefined when active id matches a whisper provider", () => {
    const configs = [
      makeConfig({
        id: "active",
        provider: "whisper",
        baseUrl: "https://whisper.example.com",
        model: "whisper-v3",
      }),
    ];
    expect(findActiveRewriteProviderConfig(configs, "active")).toBeUndefined();
  });

  it("returns undefined when active id matches a config that is not ready", () => {
    const configs = [makeConfig({ id: "active", apiKey: "" })];
    expect(findActiveRewriteProviderConfig(configs, "active")).toBeUndefined();
  });

  it("returns undefined when active id is empty", () => {
    const configs = [makeConfig({ id: "active" })];
    expect(findActiveRewriteProviderConfig(configs, "")).toBeUndefined();
    expect(findActiveRewriteProviderConfig(configs, undefined)).toBeUndefined();
  });
});

describe("findEnabledTranscribeProviderConfig", () => {
  function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
    return {
      id: "test",
      label: "Test",
      provider: "whisper",
      apiKey: "whisper-token",
      baseUrl: "https://whisper.example.com",
      model: "whisper-v3",
      enabled: true,
      ...overrides,
    };
  }

  it("returns the first enabled whisper config", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "w", provider: "whisper", enabled: true }),
    ];

    const found = findEnabledTranscribeProviderConfig(configs);

    expect(found).toBeDefined();
    expect(found!.id).toBe("w");
  });

  it("returns undefined when only non-transcribe providers are enabled", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "c", provider: "cosyvoice", enabled: true }),
    ];

    expect(findEnabledTranscribeProviderConfig(configs)).toBeUndefined();
  });
});

describe("findEnabledSpeechProviderConfig", () => {
  function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
    return {
      id: "test",
      label: "Test",
      provider: "cosyvoice",
      apiKey: "tts-token",
      baseUrl: "https://cosyvoice.example.com",
      model: "cosyvoice-v1",
      enabled: true,
      ...overrides,
    };
  }

  it("returns the first enabled cosyvoice config", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "c", provider: "cosyvoice", enabled: true }),
      makeConfig({ id: "h", provider: "heygem", enabled: true }),
    ];

    const found = findEnabledSpeechProviderConfig(configs);

    expect(found).toBeDefined();
    expect(found!.id).toBe("c");
  });

  it("returns undefined when cosyvoice config is disabled", () => {
    const configs = [makeConfig({ id: "c", provider: "cosyvoice", enabled: false })];

    expect(findEnabledSpeechProviderConfig(configs)).toBeUndefined();
  });

  it("returns undefined when only non-speech providers are enabled", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "h", provider: "heygem", enabled: true }),
    ];

    expect(findEnabledSpeechProviderConfig(configs)).toBeUndefined();
  });
});

describe("findEnabledVoiceCloneProviderConfig", () => {
  function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
    return {
      id: "test",
      label: "Test",
      provider: "cosyvoice",
      apiKey: "voice-token",
      baseUrl: "https://cosyvoice.example.com",
      model: "cosyvoice-v1",
      enabled: true,
      ...overrides,
    };
  }

  it("returns the first enabled cosyvoice config", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "c", provider: "cosyvoice", enabled: true }),
    ];

    const found = findEnabledVoiceCloneProviderConfig(configs);

    expect(found).toBeDefined();
    expect(found!.id).toBe("c");
  });

  it("returns undefined when only non-voice-clone providers are enabled", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "h", provider: "heygem", enabled: true }),
    ];

    expect(findEnabledVoiceCloneProviderConfig(configs)).toBeUndefined();
  });
});

describe("findEnabledAvatarProviderConfig", () => {
  function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
    return {
      id: "test",
      label: "Test",
      provider: "heygem",
      apiKey: "avatar-token",
      baseUrl: "https://heygem.example.com",
      model: "heygem-v1",
      enabled: true,
      ...overrides,
    };
  }

  it("returns the first enabled heygem config", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "disabled", provider: "heygem", enabled: false }),
      makeConfig({ id: "h", provider: "heygem", enabled: true }),
    ];

    const found = findEnabledAvatarProviderConfig(configs);

    expect(found).toBeDefined();
    expect(found!.id).toBe("h");
  });

  it("returns undefined when only non-avatar providers are enabled", () => {
    const configs = [
      makeConfig({ id: "o", provider: "openai", enabled: true }),
      makeConfig({ id: "c", provider: "cosyvoice", enabled: true }),
    ];

    expect(findEnabledAvatarProviderConfig(configs)).toBeUndefined();
  });
});

describe("probeFfmpegPath", () => {
  it("returns true when probe_ffmpeg invoke succeeds", async () => {
    const result = await probeFfmpegPath("/opt/ffmpeg", async (command) => {
      expect(command).toBe("probe_ffmpeg");
      return true;
    });
    expect(result).toBe(true);
  });

  it("returns false when probe_ffmpeg invoke throws", async () => {
    const result = await probeFfmpegPath("/opt/ffmpeg", async () => {
      throw new Error("probe failed");
    });
    expect(result).toBe(false);
  });
});

describe("getProviderReadiness", () => {
  function makeConfig(overrides: Partial<ApiKeyProviderConfig> = {}): ApiKeyProviderConfig {
    return {
      id: "test",
      label: "Test",
      provider: "openai",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4",
      enabled: true,
      ...overrides,
    };
  }

  it("returns disabled when config is not enabled", () => {
    expect(getProviderReadiness(makeConfig({ enabled: false }))).toBe("disabled");
  });

  it("returns needs-config for openai when apiKey or model is empty", () => {
    expect(getProviderReadiness(makeConfig({ apiKey: "" }))).toBe("needs-config");
    expect(getProviderReadiness(makeConfig({ model: "" }))).toBe("needs-config");
    expect(getProviderReadiness(makeConfig({ apiKey: "  ", model: "  " }))).toBe("needs-config");
  });

  it("returns ready for openai with apiKey and model", () => {
    expect(getProviderReadiness(makeConfig())).toBe("ready");
  });

  it("returns needs-config for custom when baseUrl is missing", () => {
    expect(getProviderReadiness(makeConfig({ provider: "custom", baseUrl: "" }))).toBe("needs-config");
  });

  it("returns ready for custom with apiKey, model and baseUrl", () => {
    expect(getProviderReadiness(makeConfig({ provider: "custom" }))).toBe("ready");
  });

  it("returns needs-config for whisper when baseUrl or model is empty", () => {
    expect(getProviderReadiness(makeConfig({ provider: "whisper", baseUrl: "" }))).toBe("needs-config");
    expect(getProviderReadiness(makeConfig({ provider: "whisper", model: "" }))).toBe("needs-config");
  });

  it("returns ready for whisper with baseUrl and model", () => {
    expect(getProviderReadiness(makeConfig({ provider: "whisper" }))).toBe("ready");
  });

  it("returns needs-config for cosyvoice / heygem when baseUrl is empty", () => {
    expect(getProviderReadiness(makeConfig({ provider: "cosyvoice", baseUrl: "" }))).toBe("needs-config");
    expect(getProviderReadiness(makeConfig({ provider: "heygem", baseUrl: "" }))).toBe("needs-config");
  });

  it("returns ready for cosyvoice / heygem with baseUrl even when apiKey is empty", () => {
    expect(getProviderReadiness(makeConfig({ provider: "cosyvoice", apiKey: "" }))).toBe("ready");
    expect(getProviderReadiness(makeConfig({ provider: "heygem", apiKey: "" }))).toBe("ready");
  });
});

describe("useAppSettings SQLite persistence", () => {
  beforeEach(() => {
    setInitialAppSettingsSnapshot({});
  });

  function fakeDbWithProvider(): FakeLocalStoreDb {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, provider, label, base_url as baseUrl, model, enabled, credential_ref as credentialRef, created_at as createdAt, updated_at as updatedAt FROM provider_configs`,
      [
        {
          id: "p1",
          provider: "openai",
          label: "主模型",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4.1",
          enabled: 1,
          credentialRef: "p1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    db.whenSelect(
      `SELECT credential_ref as credentialRef, api_key as apiKey, created_at as createdAt, updated_at as updatedAt FROM provider_secrets WHERE credential_ref = ? LIMIT 1`,
      [
        {
          credentialRef: "p1",
          apiKey: "sk-from-sqlite",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    return db;
  }

  it("loads provider apiKey from SQLite snapshot", async () => {
    const db = fakeDbWithProvider();
    const snapshot = await loadAppSettingsSnapshotFromDb(db);
    setInitialAppSettingsSnapshot(snapshot);

    const { providerConfigs } = useAppSettings({ storage: createFakeStorage() });

    expect(providerConfigs.value).toHaveLength(1);
    expect(providerConfigs.value[0].apiKey).toBe("sk-from-sqlite");
  });

  it("persists provider metadata and secret to separate repositories", async () => {
    const db = new FakeLocalStoreDb();
    const { addProviderConfig } = useAppSettings({ storage: createFakeStorage(), db });

    addProviderConfig({
      id: "p1",
      label: "主模型",
      provider: "openai",
      apiKey: "sk-secret",
      model: "gpt-4",
      enabled: true,
    });

    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const sqls = db.calls.map((c) => c.sql);
    expect(sqls.some((sql) => sql.includes("INSERT OR REPLACE INTO provider_configs"))).toBe(true);
    expect(sqls.some((sql) => sql.includes("INSERT OR REPLACE INTO provider_secrets"))).toBe(true);

    const secretCall = db.calls.find((c) => c.sql.includes("provider_secrets"));
    expect(secretCall?.bind).toContain("sk-secret");
  });

  it("deletes provider metadata and secret when provider is removed", async () => {
    const db = new FakeLocalStoreDb();
    const { addProviderConfig, removeProviderConfig } = useAppSettings({ storage: createFakeStorage(), db });

    addProviderConfig({
      id: "p1",
      label: "主模型",
      provider: "openai",
      apiKey: "sk-secret",
      model: "gpt-4",
      enabled: true,
    });
    await nextTick();
    db.clear();

    removeProviderConfig("p1");
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const deleteConfigCall = db.calls.find((c) => c.sql.includes("DELETE FROM provider_configs"));
    const deleteSecretCall = db.calls.find((c) => c.sql.includes("DELETE FROM provider_secrets"));
    expect(deleteConfigCall?.bind).toEqual(["p1"]);
    expect(deleteSecretCall?.bind).toEqual(["p1"]);
  });

  it("does not persist provider apiKey to localStorage when db is provided", async () => {
    const storage = createFakeStorage();
    const db = new FakeLocalStoreDb();
    const { addProviderConfig } = useAppSettings({ storage, db });

    addProviderConfig({
      id: "p1",
      label: "主模型",
      provider: "openai",
      apiKey: "sk-secret",
      model: "gpt-4",
      enabled: true,
    });

    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const raw = storage.getItem("mirax-ai.app-settings.v1");
    expect(raw).toBeNull();
  });

  it("uses the shared SQLite db when useAppSettings is called without options", async () => {
    const db = new FakeLocalStoreDb();
    setLocalStoreDb(db);

    const { addProviderConfig } = useAppSettings();
    addProviderConfig({
      id: "p-shared",
      label: "共享 DB",
      provider: "openai",
      apiKey: "sk-secret",
      model: "gpt-4",
      enabled: true,
    });

    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(db.calls.some((c) => c.sql.includes("INSERT OR REPLACE INTO provider_configs"))).toBe(true);
    expect(db.calls.some((c) => c.sql.includes("INSERT OR REPLACE INTO provider_secrets"))).toBe(true);
  });
});
