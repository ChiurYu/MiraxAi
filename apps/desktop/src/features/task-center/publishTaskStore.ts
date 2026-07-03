import type { PublishPlatform } from "@mirax/core";
import { createPublishTaskRepository, type LocalStoreDb, type PublishTaskRecord } from "@mirax/local-store";
import type { PublishTask } from "@mirax/provider-publish";

export const PUBLISH_TASKS_STORAGE_KEY = "mirax-ai.publish-tasks.v1";

let sharedDb: LocalStoreDb | undefined;

export function setPublishTaskStoreDb(db: LocalStoreDb | undefined): void {
  sharedDb = db;
}

export function getPublishTaskStoreDb(): LocalStoreDb | undefined {
  return sharedDb;
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

/**
 * 安全过滤：确保写入存储的任务对象不包含任何凭证字段。
 * PublishTask 类型本身不含凭证，但此处做防御性剔除，防止未来误传。
 */
function sanitizePublishTaskForStorage(task: PublishTask): PublishTask {
  const sanitized: PublishTask = {
    ...task,
    retryCount: task.retryCount ?? 0,
  };

  const credentialKeys = ["credentialRef", "cookie", "token", "password", "apiKey", "secret"] as const;
  for (const key of credentialKeys) {
    if (key in sanitized) {
      delete (sanitized as unknown as Record<typeof credentialKeys[number], unknown>)[key];
    }
  }

  return sanitized;
}

function taskToRecord(task: PublishTask): PublishTaskRecord {
  return {
    id: task.id,
    projectId: task.projectId,
    platformId: task.platformId,
    accountId: task.accountId,
    status: task.status,
    videoPath: task.videoPath,
    title: task.title,
    description: task.description,
    tagsJson: JSON.stringify(task.tags),
    mode: task.mode,
    errorCode: task.errorCode,
    errorMessage: task.errorMessage,
    failedAt: task.failedAt,
    retryCount: task.retryCount ?? 0,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

function recordToTask(record: PublishTaskRecord): PublishTask {
  return {
    id: record.id,
    projectId: record.projectId,
    platformId: record.platformId as PublishPlatform,
    accountId: record.accountId,
    status: record.status as PublishTask["status"],
    videoPath: record.videoPath,
    title: record.title,
    description: record.description,
    tags: JSON.parse(record.tagsJson) as string[],
    mode: record.mode as "direct" | "draft",
    errorCode: record.errorCode as PublishTask["errorCode"],
    errorMessage: record.errorMessage,
    failedAt: record.failedAt,
    retryCount: record.retryCount ?? 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function normalizePublishTask(raw: unknown): PublishTask | undefined {
  if (typeof raw !== "object" || raw === null) {
    return undefined;
  }

  const task = raw as Partial<PublishTask>;

  if (
    !task.id ||
    !task.projectId ||
    !task.platformId ||
    !task.accountId ||
    !task.status ||
    !task.videoPath ||
    !task.title ||
    !task.description ||
    !task.tags ||
    !task.mode ||
    !task.createdAt ||
    !task.updatedAt
  ) {
    return undefined;
  }

  return {
    id: task.id,
    projectId: task.projectId,
    platformId: task.platformId,
    accountId: task.accountId,
    status: task.status,
    videoPath: task.videoPath,
    title: task.title,
    description: task.description,
    tags: task.tags,
    mode: task.mode,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    errorCode: task.errorCode,
    errorMessage: task.errorMessage,
    failedAt: task.failedAt,
    retryCount: task.retryCount ?? 0,
  } as PublishTask;
}

async function loadPublishTasksFromDb(db: LocalStoreDb): Promise<PublishTask[] | undefined> {
  try {
    const repo = createPublishTaskRepository(db);
    const records = await repo.list();
    return records.map(recordToTask);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 发布任务读取失败，回退 localStorage", error);
    return undefined;
  }
}

async function savePublishTasksToDb(db: LocalStoreDb, tasks: PublishTask[]): Promise<boolean> {
  try {
    const repo = createPublishTaskRepository(db);
    const nextIds = new Set(tasks.map((task) => task.id));
    for (const task of tasks) {
      await repo.save(taskToRecord(sanitizePublishTaskForStorage(task)));
    }
    for (const existing of await repo.list()) {
      if (!nextIds.has(existing.id)) {
        await repo.deleteById(existing.id);
      }
    }
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("SQLite 发布任务保存失败，回退 localStorage", error);
    return false;
  }
}

export async function loadPublishTasks(): Promise<PublishTask[]> {
  if (sharedDb) {
    const fromDb = await loadPublishTasksFromDb(sharedDb);
    if (fromDb !== undefined) {
      return fromDb;
    }
  }

  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(PUBLISH_TASKS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizePublishTask).filter((t): t is PublishTask => t !== undefined);
  } catch {
    return [];
  }
}

export async function savePublishTasks(tasks: PublishTask[]): Promise<void> {
  if (sharedDb) {
    const saved = await savePublishTasksToDb(sharedDb, tasks);
    if (saved) return;
  }

  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PUBLISH_TASKS_STORAGE_KEY, JSON.stringify(tasks.map(sanitizePublishTaskForStorage)));
}

export async function appendPublishTask(task: PublishTask): Promise<void> {
  const tasks = await loadPublishTasks();
  tasks.unshift(task);
  await savePublishTasks(tasks);
}

export async function appendPublishTasks(tasks: PublishTask[]): Promise<void> {
  const existing = await loadPublishTasks();
  await savePublishTasks([...tasks, ...existing]);
}
