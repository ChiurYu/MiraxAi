<script setup lang="ts">
import {
  Bot,
  Database,
  HardDrive,
  HelpCircle,
  FileText,
  Settings,
  SlidersHorizontal,
  Wrench,
} from "lucide-vue-next";
import type { SettingsSection } from "../../app/navigation.js";

interface SectionConfig {
  id: SettingsSection;
  label: string;
  icon: unknown;
}

const SECTIONS: SectionConfig[] = [
  { id: "general", label: "通用", icon: SlidersHorizontal },
  { id: "ai-services", label: "AI 服务", icon: Bot },
  { id: "local-dependencies", label: "本地依赖", icon: Wrench },
  { id: "output-storage", label: "输出与存储", icon: HardDrive },
  { id: "prompt-templates", label: "提示词", icon: FileText },
  { id: "data", label: "数据", icon: Database },
  { id: "updates-support", label: "更新与支持", icon: HelpCircle },
];

const props = defineProps<{
  section: SettingsSection;
  saveStatus: string;
}>();

const emit = defineEmits<{
  "update:section": [section: SettingsSection];
}>();
</script>

<template>
  <div class="settings-shell">
    <nav class="settings-nav" aria-label="设置分类">
      <div class="settings-nav-header">
        <Settings :size="18" />
        <span>设置</span>
      </div>

      <ul class="settings-nav-list" role="tablist">
        <li v-for="item in SECTIONS" :key="item.id">
          <button
            type="button"
            class="settings-nav-item"
            :class="{ active: props.section === item.id }"
            role="tab"
            :aria-selected="props.section === item.id"
            @click="emit('update:section', item.id)"
          >
            <component :is="item.icon" :size="16" />
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>

      <div class="settings-nav-footer">
        <p class="settings-privacy-note">
          API Key、Token 等凭据仅保存在本地，不会进入源码、日志或云端同步。
        </p>
        <span class="settings-save-status" :class="{ error: saveStatus.includes('失败') }">{{ saveStatus }}</span>
      </div>
    </nav>

    <main class="settings-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.settings-shell {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--mx-bg-base);
}

.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 12px;
  border-right: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
  overflow-y: auto;
}

.settings-nav-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  color: var(--mx-text-primary);
  font-size: 14px;
  font-weight: 700;
}

.settings-nav-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  border-radius: var(--mx-radius-md);
  background: transparent;
  color: var(--mx-text-secondary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.settings-nav-item:hover {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.settings-nav-item.active {
  background: var(--mx-accent-soft-bg);
  color: var(--mx-accent);
  font-weight: 600;
}

.settings-nav-item:focus-visible {
  outline: none;
  box-shadow: var(--mx-focus-ring);
}

.settings-nav-footer {
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--mx-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-privacy-note {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
}

.settings-save-status {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.settings-save-status.error {
  color: var(--mx-error);
}

.settings-main {
  min-width: 0;
  overflow-y: auto;
  padding: 24px 32px 48px;
}
</style>
