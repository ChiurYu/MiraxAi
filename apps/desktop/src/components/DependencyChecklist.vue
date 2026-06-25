<script setup lang="ts">
import { AlertCircle, CheckCircle2 } from "lucide-vue-next";
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
  python: "Python 服务",
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
      <div class="dependency-meta">
        <strong>{{ labelMap[result.key] ?? result.key }}</strong>
        <span>{{ result.message }}</span>
      </div>
      <span class="dependency-status" :class="{ ok: result.ok }">
        <CheckCircle2 v-if="result.ok" :size="16" />
        <AlertCircle v-else :size="16" />
        {{ result.ok ? "就绪" : "未就绪" }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.dependency-list {
  display: grid;
  gap: 8px;
}

.dependency-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-input);
}

.dependency-item.ok {
  border-color: rgba(52, 211, 153, 0.35);
  background: var(--mx-success-bg);
}

.dependency-meta {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.dependency-meta strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.dependency-meta span {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  overflow-wrap: anywhere;
}

.dependency-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-warning);
}

.dependency-status.ok {
  color: var(--mx-success);
}
</style>
