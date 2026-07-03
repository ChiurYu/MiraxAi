import { beforeEach, describe, expect, it } from "vitest";
import { FakeLocalStoreDb } from "@mirax/local-store";
import {
  TASK_HISTORY_STORAGE_KEY,
  appendPublishHistoryItem,
  createPublishHistoryItem,
  listLatestHistoryItems,
  loadTaskHistory,
  saveTaskHistory,
  setTaskHistoryDb,
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
  setTaskHistoryDb(undefined);
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
    expect(item.status).toBe("pending");
    expect(item.taskIds).toEqual(["mock-publish-demo-project-douyin"]);
  });

  it("does not mark submitted draft publish tasks as success", () => {
    const item = createPublishHistoryItem({
      projectId: "demo-project",
      taskIds: ["mock-publish-demo-project-douyin", "mock-publish-demo-project-xhs"],
      taskStatuses: ["submitted", "submitted"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin", "xiaohongshu"],
    });

    expect(item.status).toBe("submitted");
  });

  it("marks history completed only when all publish tasks complete", () => {
    const item = createPublishHistoryItem({
      projectId: "demo-project",
      taskIds: ["mock-publish-demo-project-douyin"],
      taskStatuses: ["completed"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin"],
    });

    expect(item.status).toBe("completed");
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

  it("loads empty history when localStorage is empty", async () => {
    expect(await loadTaskHistory()).toEqual([]);
  });

  it("saves and loads history items", async () => {
    const item = createPublishHistoryItem({
      projectId: "demo-project",
      taskIds: ["mock-publish-demo-project-douyin"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin"],
    });

    await saveTaskHistory([item]);

    expect(await loadTaskHistory()).toEqual([item]);
  });

  it("appends newest item to the front of history", async () => {
    const first = createPublishHistoryItem({
      projectId: "a",
      taskIds: ["a-1"],
      videoPath: "/tmp/a.mp4",
      platforms: ["douyin"],
      createdAt: "2026-06-12T00:00:00.000Z",
    });
    await appendPublishHistoryItem(first);

    const second = createPublishHistoryItem({
      projectId: "b",
      taskIds: ["b-1"],
      videoPath: "/tmp/b.mp4",
      platforms: ["xiaohongshu"],
      createdAt: "2026-06-12T01:00:00.000Z",
    });
    await appendPublishHistoryItem(second);

    const items = await loadTaskHistory();
    expect(items.map((item) => item.projectId)).toEqual(["b", "a"]);
  });

  it("returns empty array when localStorage data is invalid", async () => {
    globalThis.localStorage.setItem("mirax-ai.task-history.v1", "not-json");
    expect(await loadTaskHistory()).toEqual([]);
  });

  it("prefers SQLite over localStorage when db is available", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, title, task_ids_json as taskIdsJson, video_path as videoPath, platforms_json as platformsJson, status, created_at as createdAt FROM task_history ORDER BY created_at DESC`,
      [
        {
          id: "sqlite-history",
          projectId: "p1",
          title: "SQLite History",
          taskIdsJson: JSON.stringify(["t1"]),
          videoPath: "/tmp/sqlite.mp4",
          platformsJson: JSON.stringify(["douyin"]),
          status: "submitted",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    globalThis.localStorage.setItem(
      TASK_HISTORY_STORAGE_KEY,
      JSON.stringify([
        createPublishHistoryItem({
          projectId: "p2",
          taskIds: ["t2"],
          videoPath: "/tmp/local.mp4",
          platforms: ["xiaohongshu"],
        }),
      ]),
    );

    setTaskHistoryDb(db);

    const history = await loadTaskHistory();

    expect(history).toHaveLength(1);
    expect(history[0]?.id).toBe("sqlite-history");
    expect(history[0]?.status).toBe("submitted");
  });

  it("falls back to localStorage when SQLite is unavailable", async () => {
    const item = createPublishHistoryItem({
      projectId: "p1",
      taskIds: ["t1"],
      videoPath: "/tmp/local.mp4",
      platforms: ["douyin"],
    });
    globalThis.localStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify([item]));

    const history = await loadTaskHistory();

    expect(history).toHaveLength(1);
    expect(history[0]?.projectId).toBe("p1");
  });

  it("persists history to SQLite when db is available", async () => {
    const db = new FakeLocalStoreDb();
    setTaskHistoryDb(db);

    const item = createPublishHistoryItem({
      projectId: "p1",
      taskIds: ["t1"],
      videoPath: "/tmp/final.mp4",
      platforms: ["douyin"],
    });

    await saveTaskHistory([item]);

    const call = db.calls.find((c) => c.sql.includes("INSERT OR REPLACE INTO task_history"));
    expect(call).toBeTruthy();
    expect(call?.bind).toContain(item.id);
  });

  it("removes stale SQLite history when saving a complete history list", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, title, task_ids_json as taskIdsJson, video_path as videoPath, platforms_json as platformsJson, status, created_at as createdAt FROM task_history ORDER BY created_at DESC`,
      [
        {
          id: "stale-history",
          projectId: "p1",
          title: "Stale",
          taskIdsJson: JSON.stringify(["t1"]),
          videoPath: "/tmp/stale.mp4",
          platformsJson: JSON.stringify(["douyin"]),
          status: "submitted",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    setTaskHistoryDb(db);

    await saveTaskHistory([]);

    const deleteCall = db.calls.find((c) => c.sql.includes("DELETE FROM task_history"));
    expect(deleteCall?.bind).toEqual(["stale-history"]);
  });
});
