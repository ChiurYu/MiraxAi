<script setup lang="ts">
import {
  ClipboardCheck,
  FolderOpen,
  KeyRound,
  Settings2,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-vue-next";
import type { AppView } from "../../app/navigation";

withDefaults(
  defineProps<{
    activeView: AppView;
  }>(),
  {
    activeView: "workbench",
  },
);

const emit = defineEmits<{
  navigate: [view: AppView];
}>();

const items: { view: AppView; label: string; icon: unknown }[] = [
  { view: "workbench", label: "工作台", icon: WandSparkles },
  { view: "voices", label: "声音", icon: Volume2 },
  { view: "avatars", label: "形象", icon: UserRound },
  { view: "materials", label: "素材", icon: FolderOpen },
  { view: "tasks", label: "任务", icon: ClipboardCheck },
  { view: "accounts", label: "账号", icon: KeyRound },
  { view: "settings", label: "设置", icon: Settings2 },
];
</script>

<template>
  <aside class="nav-rail global-nav">
    <div class="brand">
      <div class="brand-mark">
        <WandSparkles :size="18" />
      </div>
    </div>
    <nav>
      <button
        v-for="item in items"
        :key="item.view"
        class="nav-item"
        :class="{ active: activeView === item.view }"
        type="button"
        @click="emit('navigate', item.view)"
      >
        <component :is="item.icon" :size="17" />
        <span>{{ item.label }}</span>
      </button>
    </nav>
  </aside>
</template>

<style scoped>
/* Global nav overrides live in styles.css under .nav-rail / .global-nav.
   Scoped styles below only handle component-specific stacking. */
</style>
