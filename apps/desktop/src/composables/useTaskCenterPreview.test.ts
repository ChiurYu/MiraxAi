import { beforeEach, describe, expect, it } from "vitest";
import {
  appendPublishHistoryItem,
  createPublishHistoryItem,
  saveTaskHistory,
} from "../features/task-center/taskHistory.js";
import { useTaskCenterPreview } from "./useTaskCenterPreview.js";

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

describe("useTaskCenterPreview", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage?: Storage }).localStorage = createFakeStorage();
    saveTaskHistory([]);
  });

  it("loads latest items sorted by createdAt descending", () => {
    appendPublishHistoryItem(
      createPublishHistoryItem({
        projectId: "a",
        taskIds: ["a-1"],
        videoPath: "/tmp/a.mp4",
        platforms: ["douyin"],
        createdAt: "2026-06-12T00:00:00.000Z",
      }),
    );
    appendPublishHistoryItem(
      createPublishHistoryItem({
        projectId: "b",
        taskIds: ["b-1"],
        videoPath: "/tmp/b.mp4",
        platforms: ["xiaohongshu"],
        createdAt: "2026-06-12T01:00:00.000Z",
      }),
    );

    const { latestItems } = useTaskCenterPreview();

    expect(latestItems.value.map((item) => item.projectId)).toEqual(["b", "a"]);
  });

  it("respects the limit option", () => {
    for (let i = 0; i < 10; i++) {
      appendPublishHistoryItem(
        createPublishHistoryItem({
          projectId: String(i),
          taskIds: [`${i}-1`],
          videoPath: "/tmp/x.mp4",
          platforms: ["douyin"],
          createdAt: `2026-06-12T0${i}:00:00.000Z`,
        }),
      );
    }

    const { latestItems } = useTaskCenterPreview({ limit: 3 });

    expect(latestItems.value).toHaveLength(3);
  });

  it("refresh reloads history", () => {
    const { latestItems, refresh } = useTaskCenterPreview();
    expect(latestItems.value).toHaveLength(0);

    appendPublishHistoryItem(
      createPublishHistoryItem({
        projectId: "new",
        taskIds: ["new-1"],
        videoPath: "/tmp/new.mp4",
        platforms: ["douyin"],
      }),
    );
    refresh();

    expect(latestItems.value).toHaveLength(1);
  });
});
