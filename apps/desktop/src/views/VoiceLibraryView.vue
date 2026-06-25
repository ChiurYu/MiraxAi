<script setup lang="ts">
import AssetLibraryShell from "../components/assets/AssetLibraryShell.vue";
import { voiceAssets } from "../features/assets/mockAssets.js";
import type { AssetListItem } from "../features/assets/assetModels.js";

const emit = defineEmits<{
  select: [item: AssetListItem];
}>();

function handleSelect(item: AssetListItem) {
  emit("select", item);
}
</script>

<template>
  <AssetLibraryShell
    title="声音库"
    description="创建、试听和管理可复用的声音资产，为文案配音和视频工作流提供声音来源。"
    kind="voice"
    :items="voiceAssets"
    :header-actions="false"
    @select="handleSelect"
  />
</template>
