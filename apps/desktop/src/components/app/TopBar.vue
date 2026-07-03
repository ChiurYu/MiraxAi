<script setup lang="ts">
import { Cloud, Moon, Sun } from "lucide-vue-next";
import { computed } from "vue";
import type { AppView } from "../../app/navigation";

const props = withDefaults(
  defineProps<{
    projectName: string;
    theme: "light" | "dark";
    activeView: AppView;
    saveStatus?: string;
  }>(),
  {
    projectName: "",
    theme: "dark",
    activeView: "workbench",
    saveStatus: "Autosaved",
  },
);

const emit = defineEmits<{
  toggleTheme: [];
}>();

const isWorkbench = computed(() => props.activeView === "workbench");

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isInteractiveDragTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (["button", "input", "select", "textarea", "a"].includes(tag)) return true;
  return target.closest("button, input, select, textarea, a") !== null;
}

async function startDragging(event: PointerEvent) {
  // 只响应鼠标左键；交互元素不触发拖动；非 Tauri 环境跳过。
  if (event.button !== 0) return;
  if (isInteractiveDragTarget(event.target)) return;
  if (!isTauriAvailable()) return;

  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().startDragging();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("[mirax] 窗口拖动调用失败", error);
    }
  }
}

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
    <span class="window-drag-strip" data-tauri-drag-region aria-hidden="true" @pointerdown="startDragging"></span>
    <div class="project-overview" data-tauri-drag-region @pointerdown="startDragging">
      <div class="project-title" :class="{ 'workbench-title': isWorkbench }">
        <strong>{{ pageTitle }}</strong>
      </div>
    </div>

    <div class="toolbar-actions">
      <template v-if="isWorkbench">
        <div class="autosaved-state">
          <Cloud :size="16" />
          <span>{{ saveStatus }}</span>
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
