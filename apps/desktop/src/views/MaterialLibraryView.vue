<script setup lang="ts">
import { computed } from "vue";
import AssetLibraryShell from "../components/assets/AssetLibraryShell.vue";
import {
  getMaterialCategories,
  materialAssets,
} from "../features/assets/mockAssets.js";
import type { AssetListItem } from "../features/assets/assetModels.js";

const emit = defineEmits<{
  select: [item: AssetListItem];
}>();

const categories = computed(() => getMaterialCategories());

function handleSelect(item: AssetListItem) {
  emit("select", item);
}
</script>

<template>
  <AssetLibraryShell
    title="素材库"
    description="管理本地视频、图片、音频、封面和背景音乐，为内容创作与视频合成提供可复用素材。"
    kind="material"
    :items="materialAssets"
    :categories="categories"
    @select="handleSelect"
  />
</template>
