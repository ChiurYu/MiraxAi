<script setup lang="ts">
import { computed } from "vue";
import { checkSidecarDependencies, createDefaultSidecarConfig, type SidecarConfig } from "@mirax/sidecar-manager";

const props = withDefaults(defineProps<{
  config?: SidecarConfig;
}>(), {
  config: () => createDefaultSidecarConfig(),
});

const results = computed(() =>
  checkSidecarDependencies({
    ffmpegPath: props.config.ffmpegPath,
    hasPlaywrightBrowser: props.config.hasPlaywrightBrowser,
    pythonServiceUrl: props.config.pythonServiceUrl,
    heygemServiceUrl: props.config.heygemServiceUrl,
    cosyVoiceServiceUrl: props.config.cosyVoiceServiceUrl,
  }),
);

const labelMap: Record<string, string> = {
  ffmpeg: "FFmpeg",
  playwright: "Playwright",
  python: "Python",
  heygem: "HeyGem",
  cosyvoice: "CosyVoice",
};
</script>

<template>
  <div class="dependency-list">
    <div
      v-for="result in results"
      :key="result.key"
      class="dependency-item"
      :class="{ ok: result.ok }"
    >
      <strong>{{ labelMap[result.key] ?? result.key }}</strong>
      <span>{{ result.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.dependency-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dependency-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--mx-surface-secondary);
  font-size: 13px;
}

.dependency-item.ok {
  color: var(--mx-success);
}

.dependency-item:not(.ok) {
  color: var(--mx-warning);
}
</style>
