<script setup lang="ts">
import GlobalNav from "./GlobalNav.vue";
import TopBar from "./TopBar.vue";
import type { AppView } from "../../app/navigation";

withDefaults(
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
  navigate: [view: AppView];
}>();
</script>

<template>
  <main class="app-shell" :data-theme="theme">
    <GlobalNav :active-view="activeView" @navigate="emit('navigate', $event)" />

    <section class="board-shell">
      <TopBar
        :project-name="projectName"
        :theme="theme"
        :active-view="activeView"
        @toggle-theme="emit('toggleTheme')"
      />
      <div class="app-content">
        <slot />
      </div>
    </section>
  </main>
</template>

<style scoped>
/* Layout tokens are defined globally in styles.css. */
</style>
