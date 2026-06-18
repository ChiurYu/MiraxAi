import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
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
});
