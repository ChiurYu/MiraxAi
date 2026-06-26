import type { PublishTask } from "@mirax/provider-publish";

export const PUBLISH_TASKS_STORAGE_KEY = "mirax-ai.publish-tasks.v1";

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
 * 安全过滤：确保写入 localStorage 的任务对象不包含任何凭证字段。
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

export function loadPublishTasks(): PublishTask[] {
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

export function savePublishTasks(tasks: PublishTask[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PUBLISH_TASKS_STORAGE_KEY, JSON.stringify(tasks.map(sanitizePublishTaskForStorage)));
}

export function appendPublishTask(task: PublishTask): void {
  const tasks = loadPublishTasks();
  tasks.unshift(task);
  savePublishTasks(tasks);
}

export function appendPublishTasks(tasks: PublishTask[]): void {
  const existing = loadPublishTasks();
  savePublishTasks([...tasks, ...existing]);
}
