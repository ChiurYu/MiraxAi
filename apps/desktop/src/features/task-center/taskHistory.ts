import type { PublishPlatform } from "@mirax/core";
import { createTaskHistoryRepository, type LocalStoreDb, type TaskHistoryRecord } from "@mirax/local-store";
import type { PublishTaskStatus } from "@mirax/provider-publish";

export const TASK_HISTORY_STORAGE_KEY = "mirax-ai.task-history.v1";

let sharedDb: LocalStoreDb | undefined;

export function setTaskHistoryDb(db: LocalStoreDb | undefined): void {
  sharedDb = db;
}

export function getTaskHistoryDb(): LocalStoreDb | undefined {
  return sharedDb;
}

export interface PublishHistoryItem {
  id: string;
  projectId: string;
  title: string;
  taskIds: string[];
  videoPath: string;
  platforms: PublishPlatform[];
  status: PublishTaskStatus;
  createdAt: string;
}

export function createPublishHistoryItem(input: {
  projectId: string;
  taskIds: string[];
  videoPath: string;
  platforms: PublishPlatform[];
  taskStatuses?: PublishTaskStatus[];
  createdAt?: string;
}): PublishHistoryItem {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const status = historyStatusFromTaskStatuses(input.taskStatuses);

  return {
    id: `${input.projectId}-${createdAt}`,
    projectId: input.projectId,
    title: `发布任务 ${input.projectId}`,
    taskIds: input.taskIds,
    videoPath: input.videoPath,
    platforms: input.platforms,
    status,
    createdAt,
  };
}

function historyStatusFromTaskStatuses(statuses: PublishTaskStatus[] = []): PublishTaskStatus {
  if (statuses.length === 0) return "pending";
  if (statuses.some((status) => status === "failed")) return "failed";
  if (statuses.some((status) => status === "retryable")) return "retryable";
  if (statuses.every((status) => status === "completed")) return "completed";
  if (statuses.some((status) => status === "processing")) return "processing";
  if (statuses.some((status) => status === "submitted")) return "submitted";
  if (statuses.every((status) => status === "cancelled")) return "cancelled";
  return "pending";
}

export function listLatestHistoryItems(items: PublishHistoryItem[]): PublishHistoryItem[] {
  return [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function historyItemToRecord(item: PublishHistoryItem): TaskHistoryRecord {
  return {
    id: item.id,
    projectId: item.projectId,
    title: item.title,
    taskIdsJson: JSON.stringify(item.taskIds),
    videoPath: item.videoPath,
    platformsJson: JSON.stringify(item.platforms),
    status: item.status,
    createdAt: item.createdAt,
  };
}

function recordToHistoryItem(record: TaskHistoryRecord): PublishHistoryItem {
  return {
    id: record.id,
    projectId: record.projectId,
    title: record.title,
    taskIds: JSON.parse(record.taskIdsJson) as string[],
    videoPath: record.videoPath,
    platforms: JSON.parse(record.platformsJson) as PublishPlatform[],
    status: record.status as PublishTaskStatus,
    createdAt: record.createdAt,
  };
}

function getStorage(): Storage | undefined {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }

  return undefined;
}

async function loadTaskHistoryFromDb(db: LocalStoreDb): Promise<PublishHistoryItem[] | undefined> {
  try {
    const repo = createTaskHistoryRepository(db);
    const records = await repo.list();
    return records.map(recordToHistoryItem);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 任务历史读取失败，回退 localStorage", error);
    return undefined;
  }
}

async function saveTaskHistoryToDb(db: LocalStoreDb, items: PublishHistoryItem[]): Promise<boolean> {
  try {
    const repo = createTaskHistoryRepository(db);
    const nextIds = new Set(items.map((item) => item.id));
    for (const item of items) {
      await repo.save(historyItemToRecord(item));
    }
    for (const existing of await repo.list()) {
      if (!nextIds.has(existing.id)) {
        await repo.deleteById(existing.id);
      }
    }
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 任务历史保存失败，回退 localStorage", error);
    return false;
  }
}

export async function loadTaskHistory(): Promise<PublishHistoryItem[]> {
  if (sharedDb) {
    const fromDb = await loadTaskHistoryFromDb(sharedDb);
    if (fromDb !== undefined) {
      return fromDb;
    }
  }

  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(TASK_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as PublishHistoryItem[];
  } catch {
    return [];
  }
}

export async function saveTaskHistory(items: PublishHistoryItem[]): Promise<void> {
  if (sharedDb) {
    const saved = await saveTaskHistoryToDb(sharedDb, items);
    if (saved) return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(items));
}

export async function appendPublishHistoryItem(item: PublishHistoryItem): Promise<void> {
  const history = await loadTaskHistory();
  history.unshift(item);
  await saveTaskHistory(history);
}
