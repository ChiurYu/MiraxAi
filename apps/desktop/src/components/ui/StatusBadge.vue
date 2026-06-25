<script setup lang="ts">
import { AlertCircle, CheckCircle2, Circle, Loader2, SkipForward, XCircle } from "lucide-vue-next";
import { computed } from "vue";
import type { WorkflowStageStatus } from "@mirax/core";

const props = defineProps<{
  status: WorkflowStageStatus | undefined;
}>();

const config = computed(() => {
  const s = props.status ?? "pending";
  switch (s) {
    case "running":
      return { label: "执行中", icon: Loader2, class: "is-running" };
    case "completed":
      return { label: "已完成", icon: CheckCircle2, class: "is-completed" };
    case "failed":
      return { label: "失败", icon: XCircle, class: "is-failed" };
    case "skipped":
      return { label: "已跳过", icon: SkipForward, class: "is-skipped" };
    default:
      return { label: "待执行", icon: Circle, class: "is-pending" };
  }
});
</script>

<template>
  <span class="mx-status-badge" :class="config.class">
    <component :is="config.icon" :size="12" class="spin" v-if="config.class === 'is-running'" />
    <component :is="config.icon" :size="12" v-else />
    <span>{{ config.label }}</span>
  </span>
</template>
