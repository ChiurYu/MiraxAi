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

    return parsed as PublishTask[];
  } catch {
    return [];
  }
}

export function savePublishTasks(tasks: PublishTask[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PUBLISH_TASKS_STORAGE_KEY, JSON.stringify(tasks));
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
