import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import type { ApiKeyProviderConfig } from "@mirax/core";
import { useAppSettings } from "./useAppSettings.js";

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
