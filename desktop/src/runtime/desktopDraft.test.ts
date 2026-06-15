import { describe, expect, it } from "vitest";
import {
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
} from "./desktopDraft.js";

describe("desktopDraft persistence", () => {
  it("sanitizeDesktopDraftForStorage does not persist API Key", () => {
    const draft = createDefaultDesktopDraft();
    draft.providerConfig.apiKey = "sk-secret";

    const persisted = sanitizeDesktopDraftForStorage(draft);

    expect(persisted.providerConfig).not.toHaveProperty("apiKey");
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
  });
});
