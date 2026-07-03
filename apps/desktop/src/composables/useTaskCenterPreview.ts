import { computed, ref } from "vue";
import type { PublishTask } from "@mirax/provider-publish";
import { loadPublishTasks } from "../features/task-center/publishTaskStore.js";
import {
  listLatestHistoryItems,
  loadTaskHistory,
  type PublishHistoryItem,
} from "../features/task-center/taskHistory.js";

export interface UseTaskCenterPreviewOptions {
  limit?: number;
}

export function useTaskCenterPreview(options: UseTaskCenterPreviewOptions = {}) {
  const limit = options.limit ?? 5;
  const items = ref<PublishHistoryItem[]>([]);
  const tasks = ref<PublishTask[]>([]);

  const latestItems = computed(() => listLatestHistoryItems(items.value).slice(0, limit));

  async function refresh() {
    items.value = await loadTaskHistory();
    tasks.value = await loadPublishTasks();
  }

  refresh();

  return {
    items,
    latestItems,
    tasks,
    refresh,
  };
}
