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
});
