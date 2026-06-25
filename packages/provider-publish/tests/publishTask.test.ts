import { describe, expect, it } from "vitest";
import { createPublishTask } from "../src/mockPublisher.js";

describe("createPublishTask", () => {
  it("creates a pending publish task with all fields", () => {
    const task = createPublishTask({
      id: "task-1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "account-douyin",
      videoPath: "/tmp/final.mp4",
      title: "通勤包",
      description: "大容量",
      tags: ["通勤"],
      mode: "draft",
    });

    expect(task.status).toBe("pending");
    expect(task.platformId).toBe("douyin");
    expect(task.tags).toEqual(["通勤"]);
    expect(task.createdAt).toBeTruthy();
  });

  it("does not share the tags array reference", () => {
    const tags = ["通勤"];
    const task = createPublishTask({
      id: "task-1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      tags,
      mode: "draft",
    });

    tags.push("包包");
    expect(task.tags).toEqual(["通勤"]);
  });
});
