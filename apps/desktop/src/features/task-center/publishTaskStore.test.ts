import { beforeEach, describe, expect, it } from "vitest";
import { createPublishTask } from "@mirax/provider-publish";
import {
  appendPublishTask,
  appendPublishTasks,
  loadPublishTasks,
  savePublishTasks,
} from "./publishTaskStore.js";

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

describe("publishTaskStore", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = createFakeStorage();
    savePublishTasks([]);
  });

  it("loads empty tasks when storage is empty", () => {
    expect(loadPublishTasks()).toEqual([]);
  });

  it("saves and loads tasks", () => {
    const task = createPublishTask({
      id: "t1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      tags: [],
      mode: "draft",
    });

    savePublishTasks([task]);

    expect(loadPublishTasks()).toEqual([task]);
  });

  it("appends a single task to the front", () => {
    const first = createPublishTask({
      id: "t1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/a.mp4",
      title: "A",
      description: "A",
      tags: [],
      mode: "draft",
    });
    const second = createPublishTask({
      id: "t2",
      projectId: "p2",
      platformId: "xiaohongshu",
      accountId: "a2",
      videoPath: "/tmp/b.mp4",
      title: "B",
      description: "B",
      tags: [],
      mode: "draft",
    });

    appendPublishTask(first);
    appendPublishTask(second);

    expect(loadPublishTasks().map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("returns empty array when storage data is invalid", () => {
    globalThis.localStorage.setItem("mirax-ai.publish-tasks.v1", "not-json");
    expect(loadPublishTasks()).toEqual([]);
  });

  it("defaults retryCount to 0 for legacy stored tasks", () => {
    const legacyTask = {
      id: "legacy",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      status: "failed",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      tags: [],
      mode: "draft",
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    globalThis.localStorage.setItem("mirax-ai.publish-tasks.v1", JSON.stringify([legacyTask]));

    const tasks = loadPublishTasks();
    expect(tasks[0]?.retryCount).toBe(0);
  });

  it("persists failure and retry fields", () => {
    const task = createPublishTask({
      id: "t1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      tags: [],
      mode: "draft",
      status: "retryable",
      errorCode: "network_error",
      errorMessage: "网络超时",
      failedAt: "2024-01-01T00:00:00.000Z",
      retryCount: 2,
    });

    savePublishTasks([task]);
    const loaded = loadPublishTasks()[0];

    expect(loaded?.status).toBe("retryable");
    expect(loaded?.errorCode).toBe("network_error");
    expect(loaded?.errorMessage).toBe("网络超时");
    expect(loaded?.failedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(loaded?.retryCount).toBe(2);
  });

  it("does not persist credentials in task payload", () => {
    const task = createPublishTask({
      id: "t1",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/final.mp4",
      title: "T",
      description: "D",
      tags: [],
      mode: "draft",
    });

    savePublishTasks([task]);
    const raw = globalThis.localStorage.getItem("mirax-ai.publish-tasks.v1") ?? "";

    expect(raw).not.toContain("credentialRef");
    expect(raw).not.toContain("cookie");
    expect(raw).not.toContain("token");
    expect(raw).not.toContain("password");
  });
});
