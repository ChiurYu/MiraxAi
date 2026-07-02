<script setup lang="ts">
import { Cloud, Moon, Sun } from "lucide-vue-next";
import { computed } from "vue";
import type { AppView } from "../../app/navigation";

const props = withDefaults(
  defineProps<{
    projectName: string;
    theme: "light" | "dark";
    activeView: AppView;
  }>(),
  {
    projectName: "",
    theme: "dark",
    activeView: "workbench",
  },
);

const emit = defineEmits<{
  toggleTheme: [];
}>();

const isWorkbench = computed(() => props.activeView === "workbench");

const pageTitle = computed(() => {
  switch (props.activeView) {
    case "workbench":
      return props.projectName || "Mirax AI 项目";
    case "voices":
      return "声音库";
    case "avatars":
      return "形象库";
    case "materials":
      return "素材库";
    case "tasks":
      return "任务中心";
    case "accounts":
      return "账号管理";
    case "settings":
      return "设置";
    default:
      return props.projectName || "Mirax AI 项目";
  }
});
</script>

<template>
  <header class="window-bar">
    <span class="window-drag-strip" data-tauri-drag-region aria-hidden="true"></span>
    <div class="project-overview">
      <div class="project-title" :class="{ 'workbench-title': isWorkbench }">
        <strong>{{ pageTitle }}</strong>
      </div>
    </div>

    <div class="toolbar-actions">
      <template v-if="isWorkbench">
        <div class="autosaved-state">
          <Cloud :size="16" />
          <span>Autosaved</span>
        </div>
      </template>

      <slot name="actions" />

      <button
        class="topbar-icon"
        type="button"
        :aria-label="theme === 'dark' ? '切换到白天' : '切换到黑夜'"
        @click="emit('toggleTheme')"
      >
        <Sun v-if="theme === 'dark'" :size="18" />
        <Moon v-else :size="18" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.window-bar {
  background: var(--mx-bg-elevated);
}

.topbar-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: var(--mx-radius-md);
  background: transparent;
  color: var(--mx-text-secondary);
  cursor: default;
}

.project-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--mx-text-primary);
  line-height: 24px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-title.workbench-title {
  font-size: 20px;
  line-height: 28px;
  font-weight: 600;
}

.autosaved-state {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--mx-text-secondary);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

button.topbar-icon {
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}

button.topbar-icon:hover {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}
</style>
