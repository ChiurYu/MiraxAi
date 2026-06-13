<script setup lang="ts">
import type { WorkflowStageStatus } from "@mirax/core";

const props = defineProps<{
  status: WorkflowStageStatus | undefined;
}>();

const labelMap: Record<WorkflowStageStatus, string> = {
  pending: "待执行",
  running: "执行中",
  completed: "已完成",
  failed: "失败",
  skipped: "已跳过",
};
</script>

<template>
  <span class="status-badge" :class="props.status ?? 'pending'">
    {{ labelMap[props.status ?? "pending"] }}
  </span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  border-radius: 999px;
  padding: 0 7px;
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-text-secondary, #9aa0ad);
  background: var(--mx-bg-hover, #252931);
  border: 1px solid transparent;
  flex-shrink: 0;
}

.running {
  color: var(--mx-accent-text, #ffffff);
  background: var(--mx-accent, #5b8def);
}

.completed {
  color: var(--mx-success, #34d399);
  background: var(--mx-success-bg, rgba(52, 211, 153, 0.11));
  border-color: rgba(52, 211, 153, 0.25);
}

.failed {
  color: var(--mx-error, #f87171);
  background: var(--mx-error-bg, rgba(248, 113, 113, 0.12));
  border-color: rgba(248, 113, 113, 0.2);
}

.skipped {
  color: var(--mx-text-tertiary, #6b7280);
}
</style>
