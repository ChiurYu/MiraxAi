<script setup lang="ts">
import { AlertCircle, CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from "lucide-vue-next";
import type { PublishTask } from "@mirax/provider-publish";
import { savePublishTasks } from "../../features/task-center/publishTaskStore.js";
import { useTaskCenterPreview } from "../../composables/useTaskCenterPreview.js";

const props = withDefaults(
  defineProps<{
    limit?: number;
    showTitle?: boolean;
    compact?: boolean;
    showEmpty?: boolean;
  }>(),
  {
    limit: 10,
    showTitle: true,
    compact: false,
    showEmpty: false,
  },
);

const emit = defineEmits<{
  retry: [task: PublishTask];
}>();

const { tasks, refresh } = useTaskCenterPreview({ limit: props.limit });

const statusMap: Record<PublishTask["status"], { label: string; icon: typeof Clock }> = {
  pending: { label: "待提交", icon: Clock },
  processing: { label: "处理中", icon: Loader2 },
  completed: { label: "成功", icon: CheckCircle2 },
  failed: { label: "失败", icon: XCircle },
  cancelled: { label: "取消", icon: XCircle },
};

function retryTask(task: PublishTask) {
  const next = tasks.value.map((item) => (item.id === task.id ? { ...item, status: "pending" as const } : item));
  savePublishTasks(next);
  refresh();
  emit("retry", task);
}

defineExpose({ refresh });
</script>

<template>
  <section v-if="tasks.length > 0" class="task-preview" :class="{ compact: compact }">
    <h3 v-if="showTitle">发布任务队列</h3>
    <ul class="task-list">
      <li
        v-for="task in tasks.slice(0, limit)"
        :key="task.id"
        class="task-item"
        :data-status="task.status"
      >
        <div class="task-main">
          <span class="task-platform">{{ task.platformId }}</span>
          <span class="task-mode">{{ task.mode === "direct" ? "直接发布" : "草稿" }}</span>
          <span class="task-status" :class="task.status">
            <component :is="statusMap[task.status].icon" :size="12" />
            {{ statusMap[task.status].label }}
          </span>
        </div>
        <div class="task-detail">
          <span class="task-title">{{ task.title || "无标题" }}</span>
          <span class="task-video">{{ task.videoPath }}</span>
        </div>

        <div v-if="task.status === 'failed'" class="task-error">
          <AlertCircle :size="12" />
          <span>发布失败，请检查平台账号状态或重试。</span>
          <button class="ghost-button retry-button" @click="retryTask(task)">
            <RefreshCw :size="12" /> 重试
          </button>
        </div>
      </li>
    </ul>
  </section>
  <div v-else-if="showEmpty" class="task-empty">暂无发布任务</div>
</template>

<style scoped>
.task-preview {
  margin: 12px 13px 0;
}

.task-preview.compact {
  margin: 0;
}

.task-preview.compact h3 {
  margin-top: 0;
}

.task-empty {
  display: grid;
  place-items: center;
  min-height: 64px;
  color: var(--mx-text-tertiary);
  font-size: 12px;
  text-align: center;
}

.task-preview h3 {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 700;
  color: var(--mx-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.task-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-elevated);
}

.task-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-platform {
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-primary);
  text-transform: capitalize;
}

.task-mode {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-input);
}

.task-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--mx-text-tertiary);
  background: var(--mx-bg-input);
}

.task-status.pending {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.task-status.processing {
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.task-status.completed {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.task-status.failed,
.task-status.cancelled {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.task-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-title {
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.task-video {
  font-size: 10px;
  color: var(--mx-text-tertiary);
  word-break: break-all;
}

.task-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: var(--mx-radius-sm);
  font-size: 11px;
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.retry-button {
  margin-left: auto;
  min-height: 22px;
  padding: 0 8px;
  font-size: 11px;
  color: var(--mx-error);
}

.retry-button:hover:not(:disabled) {
  background: var(--mx-error-bg);
}
</style>
