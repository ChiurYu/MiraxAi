import { computed, ref } from "vue";
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
  const items = ref<PublishHistoryItem[]>(loadTaskHistory());

  const latestItems = computed(() => listLatestHistoryItems(items.value).slice(0, limit));

  function refresh() {
    items.value = loadTaskHistory();
  }

  return {
    items,
    latestItems,
    refresh,
  };
}
