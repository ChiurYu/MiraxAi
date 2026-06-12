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
  min-height: 22px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 12px;
  color: #cdd3e2;
  background: #30364b;
}
.running {
  color: #fff1d5;
  background: rgba(240, 162, 32, 0.2);
}
.completed {
  color: #ccffe7;
  background: rgba(47, 122, 93, 0.32);
}
.failed {
  color: #ffd4cf;
  background: rgba(177, 58, 42, 0.35);
}
.skipped {
  color: #c9d0dd;
}
</style>
