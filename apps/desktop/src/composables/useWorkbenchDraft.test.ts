import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { useWorkbenchDraft } from "./useWorkbenchDraft.js";
import { DESKTOP_DRAFT_STORAGE_KEY } from "../runtime/desktopDraft.js";

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
      DESKTOP_DRAFT_STORAGE_KEY,
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

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });

  it("persists project changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.project.name = "新项目";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.project.name).toBe("新项目");
  });

  it("handles invalid storage gracefully", () => {
    const storage = createFakeStorage();
    storage.setItem(DESKTOP_DRAFT_STORAGE_KEY, "not-json");

    const { saveStatus } = useWorkbenchDraft({ storage });

    expect(saveStatus.value).toBe("草稿读取失败");
  });

  it("restores activeStageId from storage", () => {
    const storage = createFakeStorage();
    storage.setItem(
      DESKTOP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        project: {
          name: "测试项目",
          sourceVideoPath: "",
          voiceSamplePath: "",
          notes: "",
          targetPlatforms: ["douyin"],
        },
        providerConfig: {
          id: "main-ai",
          label: "主模型配置",
          provider: "openai",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4.1",
          enabled: true,
        },
        activeStageId: "voice-clone",
      }),
    );

    const { draft } = useWorkbenchDraft({ storage });

    expect(draft.activeStageId).toBe("voice-clone");
  });

  it("persists activeStageId when it changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.activeStageId = "speech";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.activeStageId).toBe("speech");
  });

  it("restores workflow stage statuses from storage", () => {
    const storage = createFakeStorage();
    const draft = useWorkbenchDraft({ storage }).draft;
    draft.workflow.stages[0].status = "completed";
    draft.workflow.stages[1].status = "completed";
    const persistedWorkflow = JSON.parse(JSON.stringify(draft.workflow));

    storage.setItem(
      DESKTOP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        project: {
          name: "测试项目",
          sourceVideoPath: "",
          voiceSamplePath: "",
          notes: "",
          targetPlatforms: ["douyin"],
        },
        providerConfig: {
          id: "main-ai",
          label: "主模型配置",
          provider: "openai",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4.1",
          enabled: true,
        },
        activeStageId: "speech",
        workflow: persistedWorkflow,
      }),
    );

    const { draft: restoredDraft } = useWorkbenchDraft({ storage });

    expect(restoredDraft.activeStageId).toBe("speech");
    expect(restoredDraft.workflow.stages[0].status).toBe("completed");
    expect(restoredDraft.workflow.stages[1].status).toBe("completed");
    expect(restoredDraft.workflow.stages[2].status).toBe("pending");
  });

  it("persists transcriptText changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage });

    draft.transcriptText = "手动输入的真实商品口播文案";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.transcriptText).toBe("手动输入的真实商品口播文案");
  });

  it("restores transcriptText from storage", () => {
    const storage = createFakeStorage();
    storage.setItem(
      DESKTOP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        project: {
          name: "测试项目",
          sourceVideoPath: "",
          voiceSamplePath: "",
          notes: "",
          targetPlatforms: ["douyin"],
        },
        providerConfig: {
          id: "main-ai",
          label: "主模型配置",
          provider: "openai",
          baseUrl: "https://api.openai.com/v1",
          model: "gpt-4.1",
          enabled: true,
        },
        transcriptText: "恢复后的真实文案",
      }),
    );

    const { draft } = useWorkbenchDraft({ storage });

    expect(draft.transcriptText).toBe("恢复后的真实文案");
  });
});
