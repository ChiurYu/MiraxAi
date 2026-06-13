<script setup lang="ts">
import { checkSidecarDependencies } from "@mirax/sidecar-manager";

const results = checkSidecarDependencies({
  ffmpegPath: "",
  hasPlaywrightBrowser: false,
  pythonServiceUrl: "",
  heygemServiceUrl: "",
  cosyVoiceServiceUrl: "",
});

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
    <div v-for="result in results" :key="result.key" :class="{ ok: result.ok }">
      <strong>{{ labelMap[result.key] ?? result.key }}</strong>
      <span>{{ result.message }}</span>
    </div>
  </div>
</template>
