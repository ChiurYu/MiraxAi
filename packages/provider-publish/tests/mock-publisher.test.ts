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

  it("flags platforms that do not support draft mode", () => {
    const shipinhao = SUPPORTED_PLATFORM_PROFILES.find((p) => p.id === "shipinhao");
    expect(shipinhao?.supportsDraftMode).toBe(false);
    expect(shipinhao?.supportsDirectMode).toBe(true);
  });

  it("documents authorization methods without storing secrets", () => {
    for (const profile of SUPPORTED_PLATFORM_PROFILES) {
      expect(["oauth", "qr", "cookie", "unknown"]).toContain(profile.authorization);
    }
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
    expect(result.platformResults).toHaveLength(2);
    expect(result.platformResults.every((r) => r.success)).toBe(true);
    expect(result.platformResults[0]?.taskId).toBeTruthy();
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

  it("returns unauthorized failure for accounts without credentialRef", async () => {
    const publisher = createMockPublisher();
    const result = await publisher.publish({
      projectId: "project-1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      platformIds: ["kuaishou"],
      mode: "draft",
    });

    expect(result.success).toBe(false);
    expect(result.platformResults[0]?.success).toBe(false);
    expect(result.platformResults[0]?.errorCode).toBe("account_unauthorized");
  });

  it("returns unsupported draft failure for platforms that only support direct publish", async () => {
    const publisher = createMockPublisher();
    const result = await publisher.publish({
      projectId: "project-1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      platformIds: ["shipinhao"],
      mode: "draft",
    });

    expect(result.success).toBe(false);
    expect(result.platformResults[0]?.success).toBe(false);
    expect(result.platformResults[0]?.errorCode).toBe("platform_unsupported_draft");
  });

  it("returns limit exceeded failure when title is too long for a platform", async () => {
    const publisher = createMockPublisher();
    const result = await publisher.publish({
      projectId: "project-1",
      videoPath: "/tmp/final.mp4",
      title: "这是一条远超小红书标题长度限制的标题文案内容",
      description: "D",
      platformIds: ["xiaohongshu"],
      mode: "draft",
    });

    expect(result.success).toBe(false);
    expect(result.platformResults[0]?.success).toBe(false);
    expect(result.platformResults[0]?.errorCode).toBe("platform_limit_exceeded");
  });

  it("does not include credentials in handoff input or results", async () => {
    const publisher = createMockPublisher();
    const result = await publisher.publish({
      projectId: "project-1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      platformIds: ["douyin"],
      mode: "draft",
    });

    const inputKeys = Object.keys(result);
    expect(inputKeys).not.toContain("credentialRef");
    expect(inputKeys).not.toContain("cookie");
    expect(inputKeys).not.toContain("token");
    expect(JSON.stringify(result)).not.toContain("credentialRef");
  });
});
