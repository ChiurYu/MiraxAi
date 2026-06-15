import { beforeEach, describe, expect, it } from "vitest";
import {
  appendPublishHistoryItem,
  createPublishHistoryItem,
  listLatestHistoryItems,
  loadTaskHistory,
  saveTaskHistory,
} from "./taskHistory.js";

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

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = createFakeStorage();
});

describe("task history", () => {
  it("creates publish history item with stable task ids", () => {
    const item = createPublishHistoryItem({
      projectId: "demo-project",
      taskIds: ["mock-publish-demo-project-douyin"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin"],
    });

    expect(item.title).toBe("发布任务 demo-project");
    expect(item.status).toBe("success");
    expect(item.taskIds).toEqual(["mock-publish-demo-project-douyin"]);
  });

  it("lists newest items first", () => {
    const first = createPublishHistoryItem({
      projectId: "a",
      taskIds: ["a-1"],
      videoPath: "/tmp/a.mp4",
      platforms: ["douyin"],
      createdAt: "2026-06-12T00:00:00.000Z",
    });
    const second = createPublishHistoryItem({
      projectId: "b",
      taskIds: ["b-1"],
      videoPath: "/tmp/b.mp4",
      platforms: ["xiaohongshu"],
      createdAt: "2026-06-12T01:00:00.000Z",
    });

    expect(listLatestHistoryItems([first, second])[0].projectId).toBe("b");
  });

  it("loads empty history when localStorage is empty", () => {
    expect(loadTaskHistory()).toEqual([]);
  });

  it("saves and loads history items", () => {
    const item = createPublishHistoryItem({
      projectId: "demo-project",
      taskIds: ["mock-publish-demo-project-douyin"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin"],
    });

    saveTaskHistory([item]);

    expect(loadTaskHistory()).toEqual([item]);
  });

  it("appends newest item to the front of history", () => {
    const first = createPublishHistoryItem({
      projectId: "a",
      taskIds: ["a-1"],
      videoPath: "/tmp/a.mp4",
      platforms: ["douyin"],
      createdAt: "2026-06-12T00:00:00.000Z",
    });
    appendPublishHistoryItem(first);

    const second = createPublishHistoryItem({
      projectId: "b",
      taskIds: ["b-1"],
      videoPath: "/tmp/b.mp4",
      platforms: ["xiaohongshu"],
      createdAt: "2026-06-12T01:00:00.000Z",
    });
    appendPublishHistoryItem(second);

    const items = loadTaskHistory();
    expect(items.map((item) => item.projectId)).toEqual(["b", "a"]);
  });

  it("returns empty array when localStorage data is invalid", () => {
    globalThis.localStorage.setItem("mirax-ai.task-history.v1", "not-json");
    expect(loadTaskHistory()).toEqual([]);
  });
});
