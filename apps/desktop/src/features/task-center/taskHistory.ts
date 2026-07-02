import type { PublishPlatform } from "@mirax/core";
import type { PublishTaskStatus } from "@mirax/provider-publish";

export const TASK_HISTORY_STORAGE_KEY = "mirax-ai.task-history.v1";

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

function getStorage(): Storage | undefined {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }

  if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }

  return undefined;
}

export function loadTaskHistory(): PublishHistoryItem[] {
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

export function saveTaskHistory(items: PublishHistoryItem[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(items));
}

export function appendPublishHistoryItem(item: PublishHistoryItem): void {
  const history = loadTaskHistory();
  history.unshift(item);
  saveTaskHistory(history);
}
