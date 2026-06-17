import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { useWorkbenchDraft } from "./useWorkbenchDraft.js";

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

describe("useWorkbenchDraft", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = createFakeStorage();
  });

  it("restores saved project and provider config from storage", () => {
    const storage = createFakeStorage();
    storage.setItem(
      "mirax-ai.desktop-draft.v1",
      JSON.stringify({
        project: {
          name: "测试项目",
          sourceVideoPath: "/tmp/source.mp4",
          voiceSamplePath: "/tmp/voice.wav",
          notes: "轻便通勤",
          targetPlatforms: ["xiaohongshu"],
        },
        providerConfig: {
          id: "main-ai",
          label: "自定义模型",
          provider: "openai",
          baseUrl: "https://api.example.com/v1",
          model: "kimi-for-coding",
          enabled: true,
        },
      }),
    );

    const { draft, saveStatus } = useWorkbenchDraft({ storage });

    expect(saveStatus.value).toBe("已恢复草稿");
    expect(draft.project.name).toBe("测试项目");
    expect(draft.project.targetPlatforms).toEqual(["xiaohongshu"]);
    expect(draft.providerConfig.label).toBe("自定义模型");
    expect(draft.providerConfig.apiKey).toBe("");
  });

  it("does not persist apiKey to storage", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.providerConfig.apiKey = "sk-secret";
    await nextTick();

    const raw = storage.getItem("mirax-ai.desktop-draft.v1");
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });

  it("persists project changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.project.name = "新项目";
    await nextTick();

    const raw = storage.getItem("mirax-ai.desktop-draft.v1");
    const parsed = JSON.parse(raw!);
    expect(parsed.project.name).toBe("新项目");
  });

  it("handles invalid storage gracefully", () => {
    const storage = createFakeStorage();
    storage.setItem("mirax-ai.desktop-draft.v1", "not-json");

    const { saveStatus } = useWorkbenchDraft({ storage });

    expect(saveStatus.value).toBe("草稿读取失败");
  });
});
