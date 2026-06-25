import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { PublishPlatform } from "@mirax/core";
import { createMockPublisher } from "@mirax/provider-publish";
import { usePublishPreparation } from "./usePublishPreparation.js";

describe("usePublishPreparation", () => {
  it("initializes with empty metadata", () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin"],
      publisher: createMockPublisher(),
    });

    expect(prep.metadata.value.title).toBe("");
    expect(prep.canPublish.value).toBe(false);
    expect(prep.errors.value).toContain("请填写标题");
  });

  it("updates metadata", () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin"],
      publisher: createMockPublisher(),
    });

    prep.updateMetadata({ title: "通勤包", description: "大容量" });

    expect(prep.metadata.value.title).toBe("通勤包");
    expect(prep.errors.value).toHaveLength(0);
    expect(prep.canPublish.value).toBe(true);
  });

  it("creates mock publish tasks for each platform", async () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin", "xiaohongshu"],
      publisher: createMockPublisher(),
    });

    prep.updateMetadata({ title: "T", description: "D", mode: "draft" });
    const tasks = await prep.publish("/tmp/final.mp4");

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.platformId)).toEqual(["douyin", "xiaohongshu"]);
    expect(tasks[0].status).toBe("pending");
  });

  it("does not publish when validation fails", async () => {
    const publisher = createMockPublisher();
    const publishSpy = vi.spyOn(publisher, "publish");
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: [],
      publisher,
    });

    const tasks = await prep.publish("/tmp/final.mp4");

    expect(tasks).toHaveLength(0);
    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("includes tags in created publish tasks", async () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin"],
      publisher: createMockPublisher(),
    });

    prep.updateMetadata({ title: "T", description: "D", tags: ["通勤", "测评"], mode: "draft" });
    const tasks = await prep.publish("/tmp/final.mp4");

    expect(tasks).toHaveLength(1);
    expect(tasks[0].tags).toEqual(["通勤", "测评"]);
  });

  it("creates direct mode tasks when mode is direct", async () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin"],
      publisher: createMockPublisher(),
    });

    prep.updateMetadata({ title: "T", description: "D", mode: "direct" });
    const tasks = await prep.publish("/tmp/final.mp4");

    expect(tasks[0].mode).toBe("direct");
  });

  it("does not include account credentials in tasks", async () => {
    const prep = usePublishPreparation({
      projectId: "p1",
      projectName: "项目",
      targetPlatforms: ["douyin"],
      publisher: createMockPublisher(),
    });

    prep.updateMetadata({ title: "T", description: "D", mode: "draft" });
    const tasks = await prep.publish("/tmp/final.mp4");

    expect(tasks[0]).not.toHaveProperty("apiKey");
    expect(tasks[0]).not.toHaveProperty("token");
    expect(tasks[0]).not.toHaveProperty("credential");
  });
});
