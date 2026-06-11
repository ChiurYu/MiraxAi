import { describe, expect, it } from "vitest";
import { SUPPORTED_PLATFORM_PROFILES, createMockPublisher } from "../src/index.js";

describe("platform profiles", () => {
  it("covers the desktop MVP publish platforms", () => {
    expect(SUPPORTED_PLATFORM_PROFILES.map((profile) => profile.id)).toEqual([
      "douyin",
      "xiaohongshu",
      "kuaishou",
      "shipinhao",
      "bilibili",
    ]);
  });
});

describe("mock publisher", () => {
  it("lists deterministic active accounts and creates publish handoff tasks", async () => {
    const publisher = createMockPublisher();
    const accounts = await publisher.listAccounts();
    const result = await publisher.publish({
      projectId: "project-1",
      videoPath: "/tmp/final.mp4",
      title: "通勤女包真实体验",
      description: "大容量通勤包",
      platformIds: ["douyin", "xiaohongshu"],
      mode: "draft",
    });

    expect(accounts).toHaveLength(5);
    expect(result.success).toBe(true);
    expect(result.taskIds).toEqual(["mock-publish-project-1-douyin", "mock-publish-project-1-xiaohongshu"]);
  });

  it("rejects publish handoff without a generated video", async () => {
    const publisher = createMockPublisher();

    await expect(
      publisher.publish({
        projectId: "project-1",
        videoPath: "",
        title: "通勤女包真实体验",
        description: "大容量通勤包",
        platformIds: ["douyin"],
        mode: "draft",
      }),
    ).rejects.toThrow("请先生成视频");
  });
});
