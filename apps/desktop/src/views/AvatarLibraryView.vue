<script setup lang="ts">
import AssetLibraryShell from "../components/assets/AssetLibraryShell.vue";
import { avatarAssets } from "../features/assets/mockAssets.js";
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
    title="形象库"
    description="创建、预览和管理可复用的数字人形象，为口播视频生成提供人物素材。"
    kind="avatar"
    :items="avatarAssets"
    @select="handleSelect"
  />
</template>
