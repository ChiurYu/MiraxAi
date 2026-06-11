import { describe, expect, it } from "vitest";
import {
  createApiKeyProviderConfig,
  createProjectDraft,
  validateProviderConfig,
  validateProjectDraft,
} from "../src/index.js";

describe("validation domain", () => {
  it("requires the user-owned API key provider fields used by the rebuilt desktop app", () => {
    const config = createApiKeyProviderConfig({
      id: "openai-main",
      label: "OpenAI 主账号",
      provider: "openai",
      apiKey: "sk-demo",
      baseUrl: "https://api.openai.com/v1",
    });

    expect(validateProviderConfig(config)).toEqual([]);
    expect(validateProviderConfig({ ...config, apiKey: "" })).toContain("请填写 API Key");
    expect(validateProviderConfig({ ...config, baseUrl: "not-a-url" })).toContain("Base URL 格式不正确");
  });

  it("validates the minimum project information required before generation starts", () => {
    const draft = createProjectDraft({
      name: "女装口播 0611",
      targetPlatforms: ["douyin", "xiaohongshu"],
      sourceVideoPath: "/tmp/source.mp4",
      voiceSamplePath: "/tmp/voice.wav",
    });

    expect(validateProjectDraft(draft)).toEqual([]);
    expect(validateProjectDraft({ ...draft, name: "" })).toContain("请填写项目名称");
    expect(validateProjectDraft({ ...draft, targetPlatforms: [] })).toContain("至少选择一个发布平台");
  });
});
