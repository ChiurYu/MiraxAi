import { beforeEach, describe, expect, it } from "vitest";
import { createPublishTask } from "@mirax/provider-publish";
import { FakeLocalStoreDb } from "@mirax/local-store";
import {
  PUBLISH_TASKS_STORAGE_KEY,
  appendPublishTask,
  appendPublishTasks,
  loadPublishTasks,
  savePublishTasks,
  setPublishTaskStoreDb,
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
    setPublishTaskStoreDb(undefined);
  });

  it("loads empty tasks when storage is empty", async () => {
    expect(await loadPublishTasks()).toEqual([]);
  });

  it("saves and loads tasks", async () => {
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

    await savePublishTasks([task]);

    expect(await loadPublishTasks()).toEqual([task]);
  });

  it("appends a single task to the front", async () => {
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

    await appendPublishTask(first);
    await appendPublishTask(second);

    expect((await loadPublishTasks()).map((t) => t.id)).toEqual(["t2", "t1"]);
  });

  it("returns empty array when storage data is invalid", async () => {
    globalThis.localStorage.setItem("mirax-ai.publish-tasks.v1", "not-json");
    expect(await loadPublishTasks()).toEqual([]);
  });

  it("defaults retryCount to 0 for legacy stored tasks", async () => {
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

    const tasks = await loadPublishTasks();
    expect(tasks[0]?.retryCount).toBe(0);
  });

  it("persists failure and retry fields", async () => {
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

    await savePublishTasks([task]);
    const loaded = (await loadPublishTasks())[0];

    expect(loaded?.status).toBe("retryable");
    expect(loaded?.errorCode).toBe("network_error");
    expect(loaded?.errorMessage).toBe("网络超时");
    expect(loaded?.failedAt).toBe("2024-01-01T00:00:00.000Z");
    expect(loaded?.retryCount).toBe(2);
  });

  it("does not persist credentials in task payload", async () => {
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

    await savePublishTasks([task]);
    const raw = globalThis.localStorage.getItem("mirax-ai.publish-tasks.v1") ?? "";

    expect(raw).not.toContain("credentialRef");
    expect(raw).not.toContain("cookie");
    expect(raw).not.toContain("token");
    expect(raw).not.toContain("password");
  });

  it("prefers SQLite over localStorage when db is available", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, platform_id as platformId, account_id as accountId, status, video_path as videoPath, title, description, tags_json as tagsJson, mode, error_code as errorCode, error_message as errorMessage, failed_at as failedAt, retry_count as retryCount, created_at as createdAt, updated_at as updatedAt FROM publish_tasks`,
      [
        {
          id: "sqlite-task",
          projectId: "p1",
          platformId: "douyin",
          accountId: "a1",
          status: "submitted",
          videoPath: "/tmp/sqlite.mp4",
          title: "SQLite Task",
          description: "D",
          tagsJson: JSON.stringify([]),
          mode: "draft",
          retryCount: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );

    globalThis.localStorage.setItem(
      PUBLISH_TASKS_STORAGE_KEY,
      JSON.stringify([
        createPublishTask({
          id: "local-task",
          projectId: "p1",
          platformId: "xiaohongshu",
          accountId: "a1",
          videoPath: "/tmp/local.mp4",
          title: "Local Task",
          description: "D",
          tags: [],
          mode: "draft",
        }),
      ]),
    );

    setPublishTaskStoreDb(db);

    const tasks = await loadPublishTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe("sqlite-task");
  });

  it("falls back to localStorage when SQLite is unavailable", async () => {
    const task = createPublishTask({
      id: "local-task",
      projectId: "p1",
      platformId: "douyin",
      accountId: "a1",
      videoPath: "/tmp/local.mp4",
      title: "Local Task",
      description: "D",
      tags: [],
      mode: "draft",
    });
    globalThis.localStorage.setItem(PUBLISH_TASKS_STORAGE_KEY, JSON.stringify([task]));

    const tasks = await loadPublishTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe("local-task");
  });

  it("persists tasks to SQLite when db is available", async () => {
    const db = new FakeLocalStoreDb();
    setPublishTaskStoreDb(db);

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

    await savePublishTasks([task]);

    const call = db.calls.find((c) => c.sql.includes("INSERT OR REPLACE INTO publish_tasks"));
    expect(call).toBeTruthy();
    expect(call?.bind).toContain("t1");
  });

  it("removes stale SQLite tasks when saving a complete task list", async () => {
    const db = new FakeLocalStoreDb();
    db.whenSelect(
      `SELECT id, project_id as projectId, platform_id as platformId, account_id as accountId, status, video_path as videoPath, title, description, tags_json as tagsJson, mode, error_code as errorCode, error_message as errorMessage, failed_at as failedAt, retry_count as retryCount, created_at as createdAt, updated_at as updatedAt FROM publish_tasks`,
      [
        {
          id: "stale-task",
          projectId: "p1",
          platformId: "douyin",
          accountId: "a1",
          status: "submitted",
          videoPath: "/tmp/stale.mp4",
          title: "Stale",
          description: "D",
          tagsJson: JSON.stringify([]),
          mode: "draft",
          retryCount: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    );
    setPublishTaskStoreDb(db);

    await savePublishTasks([]);

    const deleteCall = db.calls.find((c) => c.sql.includes("DELETE FROM publish_tasks"));
    expect(deleteCall?.bind).toEqual(["stale-task"]);
  });
});
