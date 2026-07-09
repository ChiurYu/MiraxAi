import { describe, expect, it } from "vitest";
import {
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
} from "./desktopDraft.js";

describe("createDefaultDesktopDraft", () => {
  it("does not pre-fill sourceVideoPath or voiceSamplePath", () => {
    const draft = createDefaultDesktopDraft();

    expect(draft.project.sourceVideoPath).toBe("");
    expect(draft.project.voiceSamplePath).toBe("");
  });

  it("uses neutral honest defaults without fake user-authored name or notes", () => {
    const draft = createDefaultDesktopDraft();

    // 全新草稿不应预填看起来像真实选题的项目名与备注
    expect(draft.project.name).not.toBe("轻奢女包口播 0611");
    expect(draft.project.notes).not.toBe("强调通勤、大容量、上身质感。");

    // 中性、诚实的默认值（非空 name 以避免触发校验噪音）
    expect(draft.project.name).toBe("未命名项目");
    expect(draft.project.notes).toBe("");
  });

  it("starts at the first workflow stage", () => {
    const draft = createDefaultDesktopDraft();

    expect(draft.activeStageId).toBe("transcribe");
  });

  it("initializes transcriptText to an empty string", () => {
    const draft = createDefaultDesktopDraft();

    expect(draft.transcriptText).toBe("");
  });
});

describe("desktopDraft persistence", () => {
  it("sanitizeDesktopDraftForStorage does not persist API Key", () => {
    const draft = createDefaultDesktopDraft();
    draft.providerConfig.apiKey = "sk-secret";

    const persisted = sanitizeDesktopDraftForStorage(draft);

    expect(persisted.providerConfig).not.toHaveProperty("apiKey");
  });

  it("sanitizeDesktopDraftForStorage strips URL credentials, query and hash from baseUrl", () => {
    const draft = createDefaultDesktopDraft();
    draft.providerConfig.baseUrl =
      "https://user:pass@api.example.com:8443/v1/chat?token=draft-secret#/hash";

    const persisted = sanitizeDesktopDraftForStorage(draft);

    expect(persisted.providerConfig.baseUrl).toBe("https://api.example.com:8443/v1/chat");
    expect(JSON.stringify(persisted)).not.toContain("draft-secret");
    expect(JSON.stringify(persisted)).not.toContain("user:pass");
  });

  it("sanitizeDesktopDraftForStorage persists activeStageId", () => {
    const draft = createDefaultDesktopDraft();
    draft.activeStageId = "voice-clone";

    const persisted = sanitizeDesktopDraftForStorage(draft);

    expect(persisted.activeStageId).toBe("voice-clone");
  });

  it("sanitizeDesktopDraftForStorage persists transcriptText", () => {
    const draft = createDefaultDesktopDraft();
    draft.transcriptText = "真实商品口播文案";

    const persisted = sanitizeDesktopDraftForStorage(draft);

    expect(persisted.transcriptText).toBe("真实商品口播文案");
  });

  it("sanitizeDesktopDraftForStorage persists rewrite options", () => {
    const draft = createDefaultDesktopDraft();
    draft.activeGoal = "更专业";
    draft.activePreset = "B站测评硬核风格";
    draft.targetLength = 80;

    const persisted = sanitizeDesktopDraftForStorage(draft);

    expect(persisted.activeGoal).toBe("更专业");
    expect(persisted.activePreset).toBe("B站测评硬核风格");
    expect(persisted.targetLength).toBe(80);
  });

  it("restoreDesktopDraft restores rewrite options and defaults when missing", () => {
    const withOptions = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: createDefaultDesktopDraft().providerConfig,
      activeGoal: "保持原意",
      activePreset: "高端奢侈品发布语调",
      targetLength: 20,
    });

    expect(withOptions.activeGoal).toBe("保持原意");
    expect(withOptions.activePreset).toBe("高端奢侈品发布语调");
    expect(withOptions.targetLength).toBe(20);

    const withoutOptions = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: createDefaultDesktopDraft().providerConfig,
    });

    expect(withoutOptions.activeGoal).toBe("更口语化");
    expect(withoutOptions.activePreset).toBe("小红书种草风格 (Emoji Enhanced)");
    expect(withoutOptions.targetLength).toBe(50);
  });

  it("restoreDesktopDraft restores transcriptText and defaults to empty when missing", () => {
    const withTranscript = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: createDefaultDesktopDraft().providerConfig,
      transcriptText: "手动输入的文案",
    });

    expect(withTranscript.transcriptText).toBe("手动输入的文案");

    const withoutTranscript = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: createDefaultDesktopDraft().providerConfig,
    });

    expect(withoutTranscript.transcriptText).toBe("");
  });

  it('restoreDesktopDraft restores saved values and falls back to ["douyin"] when saved platforms are empty', () => {
    const restored = restoreDesktopDraft({
      project: {
        ...createDefaultDesktopDraft().project,
        name: "测试项目",
        sourceVideoPath: "/tmp/source.mp4",
        voiceSamplePath: "/tmp/voice.wav",
        notes: "轻便通勤",
        targetPlatforms: [],
      },
      providerConfig: {
        id: "main-ai",
        label: "自定义模型",
        provider: "openai",
        baseUrl: "https://api.example.com/v1",
        model: "kimi-for-coding",
        enabled: true,
      },
      activeStageId: "speech",
    });

    expect(restored.project.name).toBe("测试项目");
    expect(restored.project.sourceVideoPath).toBe("/tmp/source.mp4");
    expect(restored.project.voiceSamplePath).toBe("/tmp/voice.wav");
    expect(restored.project.notes).toBe("轻便通勤");
    expect(restored.project.targetPlatforms).toEqual(["douyin"]);
    expect(restored.providerConfig.apiKey).toBe("");
    expect(restored.providerConfig.label).toBe("自定义模型");
    expect(restored.providerConfig.baseUrl).toBe("https://api.example.com/v1");
    expect(restored.providerConfig.model).toBe("kimi-for-coding");
    expect(restored.activeStageId).toBe("speech");
  });

  it("restoreDesktopDraft defaults activeStageId to transcribe when missing", () => {
    const restored = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: createDefaultDesktopDraft().providerConfig,
    });

    expect(restored.activeStageId).toBe("transcribe");
  });

  it("restoreDesktopDraft defaults activeStageId to transcribe when invalid", () => {
    const restored = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: createDefaultDesktopDraft().providerConfig,
      activeStageId: "not-a-stage" as unknown as "transcribe",
    });

    expect(restored.activeStageId).toBe("transcribe");
  });

  it("sanitizeDesktopDraftForStorage does not persist stale running workflow statuses", () => {
    const draft = createDefaultDesktopDraft();
    draft.workflow.stages[0].status = "completed";
    draft.workflow.stages[1].status = "completed";
    draft.workflow.stages[2].status = "running";

    const persisted = sanitizeDesktopDraftForStorage(draft);

    expect(persisted.workflow?.stages[0].status).toBe("completed");
    expect(persisted.workflow?.stages[2].status).toBe("pending");
  });

  it("restoreDesktopDraft restores saved workflow stage statuses without stale running", () => {
    const draft = createDefaultDesktopDraft();
    draft.workflow.stages[0].status = "completed";
    draft.workflow.stages[1].status = "completed";
    draft.workflow.stages[2].status = "running";

    const persisted = sanitizeDesktopDraftForStorage(draft);
    const restored = restoreDesktopDraft(persisted);

    expect(restored.workflow.stages[0].status).toBe("completed");
    expect(restored.workflow.stages[1].status).toBe("completed");
    expect(restored.workflow.stages[2].status).toBe("pending");
    expect(restored.workflow.stages[3].status).toBe("pending");
  });

  it("restoreDesktopDraft defaults workflow when missing or malformed", () => {
    const restored = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: createDefaultDesktopDraft().providerConfig,
    });

    expect(restored.workflow.stages.every((s) => s.status === "pending")).toBe(true);
    expect(restored.workflow.stages).toHaveLength(8);
  });

  it("restoreDesktopDraft defaults invalid stage statuses to pending", () => {
    const draft = createDefaultDesktopDraft();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (draft.workflow.stages[0] as any).status = "fake-status";

    const persisted = sanitizeDesktopDraftForStorage(draft);
    const restored = restoreDesktopDraft(persisted);

    expect(restored.workflow.stages[0].status).toBe("pending");
  });

  it("restoreDesktopDraft sanitizes baseUrl credentials, query and hash from legacy saved data", () => {
    const restored = restoreDesktopDraft({
      project: createDefaultDesktopDraft().project,
      providerConfig: {
        id: "legacy-ai",
        label: "Legacy",
        provider: "custom",
        baseUrl: "https://user:pass@legacy.example.com:8443/v1?token=legacy-secret#/hash",
        model: "gpt-4",
        enabled: true,
      },
    });

    expect(restored.providerConfig.apiKey).toBe("");
    expect(restored.providerConfig.baseUrl).toBe("https://legacy.example.com:8443/v1");
    expect(JSON.stringify(restored)).not.toContain("legacy-secret");
    expect(JSON.stringify(restored)).not.toContain("user:pass");
  });
});
