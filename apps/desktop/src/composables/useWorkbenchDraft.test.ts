import { beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { FakeLocalStoreDb, createWorkbenchDraftRepository } from "@mirax/local-store";
import { useWorkbenchDraft, setWorkbenchDraftDb } from "./useWorkbenchDraft.js";
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
    setWorkbenchDraftDb(undefined);
  });

  it("restores saved project and provider config from storage", async () => {
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

    const { draft, saveStatus, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0 });
    await ready;

    expect(saveStatus.value).toBe("已恢复草稿");
    expect(draft.project.name).toBe("测试项目");
    expect(draft.project.targetPlatforms).toEqual(["xiaohongshu"]);
    expect(draft.providerConfig.label).toBe("自定义模型");
    expect(draft.providerConfig.apiKey).toBe("");
  });

  it("does not persist apiKey to storage", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage, persistDelayMs: 0 });

    draft.providerConfig.apiKey = "sk-secret";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });

  it("persists project changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage, persistDelayMs: 0 });

    draft.project.name = "新项目";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.project.name).toBe("新项目");
  });

  it("debounces automatic persistence", async () => {
    vi.useFakeTimers();
    try {
      const storage = createFakeStorage();
      const { draft } = useWorkbenchDraft({ storage, persistDelayMs: 50 });

      draft.project.name = "延迟保存项目";
      await nextTick();

      expect(storage.getItem(DESKTOP_DRAFT_STORAGE_KEY)).toBeNull();

      await vi.advanceTimersByTimeAsync(50);

      const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).project.name).toBe("延迟保存项目");
    } finally {
      vi.useRealTimers();
    }
  });

  it("handles invalid storage gracefully", async () => {
    const storage = createFakeStorage();
    storage.setItem(DESKTOP_DRAFT_STORAGE_KEY, "not-json");

    const { saveStatus, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0 });
    await ready;

    expect(saveStatus.value).toBe("草稿读取失败");
  });

  it("restores activeStageId from storage", async () => {
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

    const { draft, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0 });
    await ready;

    expect(draft.activeStageId).toBe("voice-clone");
  });

  it("persists activeStageId when it changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage, persistDelayMs: 0 });

    draft.activeStageId = "speech";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.activeStageId).toBe("speech");
  });

  it("restores workflow stage statuses from storage", async () => {
    const storage = createFakeStorage();
    const draft = useWorkbenchDraft({ storage, persistDelayMs: 0 }).draft;
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

    const { draft: restoredDraft, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0 });
    await ready;

    expect(restoredDraft.activeStageId).toBe("speech");
    expect(restoredDraft.workflow.stages[0].status).toBe("completed");
    expect(restoredDraft.workflow.stages[1].status).toBe("completed");
    expect(restoredDraft.workflow.stages[2].status).toBe("pending");
  });

  it("persists transcriptText changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage, persistDelayMs: 0 });

    draft.transcriptText = "手动输入的真实商品口播文案";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.transcriptText).toBe("手动输入的真实商品口播文案");
  });

  it("persists rewrite options changes", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage, persistDelayMs: 0 });

    draft.activeGoal = "更专业";
    draft.activePreset = "B站测评硬核风格";
    draft.targetLength = 80;
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.activeGoal).toBe("更专业");
    expect(parsed.activePreset).toBe("B站测评硬核风格");
    expect(parsed.targetLength).toBe(80);
  });

  it("restores transcriptText from storage", async () => {
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

    const { draft, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0 });
    await ready;

    expect(draft.transcriptText).toBe("恢复后的真实文案");
  });

  it("restores rewrite options from storage", async () => {
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
        activeGoal: "保持原意",
        activePreset: "高端奢侈品发布语调",
        targetLength: 20,
      }),
    );

    const { draft, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0 });
    await ready;

    expect(draft.activeGoal).toBe("保持原意");
    expect(draft.activePreset).toBe("高端奢侈品发布语调");
    expect(draft.targetLength).toBe(20);
  });

  it("prefers SQLite over localStorage when db is available", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, payload_json as payloadJson, updated_at as updatedAt FROM workbench_drafts WHERE id = ?`,
      [
        {
          id: "default",
          payloadJson: JSON.stringify({
            project: {
              name: "SQLite 项目",
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
            activeStageId: "rewrite",
            transcriptText: "SQLite 文案",
          }),
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    const storage = createFakeStorage();
    storage.setItem(
      DESKTOP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        project: {
          name: "LocalStorage 项目",
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
      }),
    );

    const { draft, saveStatus, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0, db });
    await ready;

    expect(saveStatus.value).toBe("已恢复草稿");
    expect(draft.project.name).toBe("SQLite 项目");
    expect(draft.activeStageId).toBe("rewrite");
    expect(draft.transcriptText).toBe("SQLite 文案");
  });

  it("persists changes to SQLite when db is available", async () => {
    const db = new FakeLocalStoreDb();
    const storage = createFakeStorage();
    const { draft, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0, db });
    await ready;
    db.clear();

    draft.project.name = "SQLite 新项目";
    await nextTick();

    const call = db.calls.find((c) => c.sql.includes("INSERT OR REPLACE INTO workbench_drafts"));
    expect(call).toBeTruthy();
    const payloadJson = call?.bind?.find((b) => typeof b === "string" && b.includes("SQLite 新项目"));
    expect(payloadJson).toBeTruthy();
  });

  it("falls back to localStorage when SQLite is unavailable", async () => {
    const storage = createFakeStorage();
    storage.setItem(
      DESKTOP_DRAFT_STORAGE_KEY,
      JSON.stringify({
        project: {
          name: "LocalStorage 项目",
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
        activeStageId: "avatar",
        transcriptText: "LocalStorage 文案",
      }),
    );

    const { draft, saveStatus, ready } = useWorkbenchDraft({ storage, persistDelayMs: 0 });
    await ready;

    expect(saveStatus.value).toBe("已恢复草稿");
    expect(draft.project.name).toBe("LocalStorage 项目");
    expect(draft.activeStageId).toBe("avatar");
    expect(draft.transcriptText).toBe("LocalStorage 文案");
  });

  it("does not persist apiKey to SQLite", async () => {
    const db = new FakeLocalStoreDb();
    const { draft, ready } = useWorkbenchDraft({ db, persistDelayMs: 0 });
    await ready;
    db.clear();

    draft.providerConfig.apiKey = "sk-secret";
    await nextTick();

    const call = db.calls.find((c) => c.sql.includes("INSERT OR REPLACE INTO workbench_drafts"));
    expect(call).toBeTruthy();
    const payloadJson = call?.bind?.find((b) => typeof b === "string" && b.startsWith("{"));
    expect(payloadJson).toBeTruthy();
    const parsed = JSON.parse(payloadJson as string);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });

  it("does not persist apiKey to localStorage when db is unavailable", async () => {
    const storage = createFakeStorage();
    const { draft } = useWorkbenchDraft({ storage, persistDelayMs: 0 });

    draft.providerConfig.apiKey = "sk-secret";
    await nextTick();

    const raw = storage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.providerConfig).not.toHaveProperty("apiKey");
  });
});
