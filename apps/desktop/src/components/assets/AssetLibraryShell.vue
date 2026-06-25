<script setup lang="ts">
import {
  AlertCircle,
  CheckCircle2,
  Folder,
  Image,
  LayoutGrid,
  List,
  Loader2,
  Music,
  Plus,
  RefreshCw,
  Search,
  Upload,
  UserRound,
  Video,
  XCircle,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import EmptyState from "../../components/ui/EmptyState.vue";
import type {
  AssetCategoryGroup,
  AssetKind,
  AssetListItem,
  AssetSortKey,
  AssetStatus,
  MaterialCategory,
} from "../../features/assets/assetModels.js";
import AssetDetailDrawer from "./AssetDetailDrawer.vue";

const props = defineProps<{
  title: string;
  description: string;
  kind: AssetKind;
  items: AssetListItem[];
  categories?: AssetCategoryGroup[];
}>();

const emit = defineEmits<{
  select: [item: AssetListItem];
  import: [];
  create: [];
}>();

const searchQuery = ref("");
const statusFilter = ref<"all" | AssetStatus>("all");
const categoryFilter = ref<"all" | MaterialCategory>("all");
const sortKey = ref<AssetSortKey>("updatedAt");
const layoutMode = ref<"grid" | "list">("grid");
const selectedId = ref<string | null>(null);

const selectedItem = computed(() =>
  props.items.find((item) => item.id === selectedId.value),
);

const isMaterial = computed(() => props.kind === "material");
const statusOptions: { value: "all" | AssetStatus; label: string }[] = [
  { value: "all", label: "状态: 全部" },
  { value: "ready", label: "已就绪" },
  { value: "training", label: "训练中" },
  { value: "processing", label: "处理中" },
  { value: "failed", label: "失败" },
];

const sortOptions: { value: AssetSortKey; label: string }[] = [
  { value: "updatedAt", label: "最近更新" },
  { value: "name", label: "名称 A-Z" },
  { value: "duration", label: "时长倒序" },
];

function sortItems(list: AssetListItem[]): AssetListItem[] {
  return [...list].sort((a, b) => {
    switch (sortKey.value) {
      case "name":
        return a.name.localeCompare(b.name, "zh-CN");
      case "duration":
        return (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0);
      case "updatedAt":
      default: {
        const aTime =
          typeof a.updatedAt === "string" && a.updatedAt.includes("T")
            ? new Date(a.updatedAt).getTime()
            : 0;
        const bTime =
          typeof b.updatedAt === "string" && b.updatedAt.includes("T")
            ? new Date(b.updatedAt).getTime()
            : 0;
        return bTime - aTime;
      }
    }
  });
}

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  const filtered = props.items.filter((item) => {
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.description?.toLowerCase().includes(q) ?? false) ||
      (item.style?.toLowerCase().includes(q) ?? false) ||
      (item.categoryLabel?.toLowerCase().includes(q) ?? false);
    const matchesStatus =
      statusFilter.value === "all" || item.status === statusFilter.value;
    const matchesCategory =
      categoryFilter.value === "all" || item.category === categoryFilter.value;
    return matchesSearch && matchesStatus && matchesCategory;
  });
  return sortItems(filtered);
});

function selectItem(item: AssetListItem) {
  selectedId.value = item.id;
}

function handleUse(item: AssetListItem) {
  selectedId.value = null;
  emit("select", item);
}

function handleDelete(item: AssetListItem) {
  // UI/session-level only: close drawer and notify parent to remove from list.
  selectedId.value = null;
  // eslint-disable-next-line no-console
  console.log("Delete requested (session-only):", item.id);
}

function formatRelativeTime(value: string): string {
  if (!value.includes("T")) return value;
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} 小时前`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString("zh-CN");
}

function statusIcon(status: AssetStatus) {
  switch (status) {
    case "ready":
      return CheckCircle2;
    case "failed":
      return XCircle;
    case "training":
    case "processing":
      return Loader2;
    default:
      return AlertCircle;
  }
}

function statusClass(status: AssetStatus) {
  switch (status) {
    case "ready":
      return "is-ready";
    case "failed":
      return "is-failed";
    case "training":
    case "processing":
      return "is-processing";
    default:
      return "";
  }
}

function categoryIcon(id: MaterialCategory | "all") {
  switch (id) {
    case "video":
      return Video;
    case "image":
      return Image;
    case "audio":
    case "bgm":
      return Music;
    default:
      return Folder;
  }
}

function isGridLayout() {
  if (isMaterial.value) return layoutMode.value === "grid";
  return props.kind === "avatar";
}
</script>

<template>
  <div class="asset-library" :data-kind="kind">
    <div class="asset-library-header">
      <div class="asset-library-header-main">
        <h1>{{ title }}</h1>
        <p>{{ description }}</p>
      </div>
      <div class="asset-library-header-actions">
        <button
          type="button"
          class="secondary"
          title="暂不支持"
          disabled
          @click="emit('import')"
        >
          <Upload :size="16" />
          <span v-if="kind === 'voice'">导入声音</span>
          <span v-else-if="kind === 'avatar'">导入形象</span>
          <span v-else>导入素材</span>
        </button>
        <button
          type="button"
          class="primary"
          title="暂不支持"
          disabled
          @click="emit('create')"
        >
          <Plus :size="16" />
          <span v-if="kind === 'voice'">新建声音</span>
          <span v-else-if="kind === 'avatar'">新建形象</span>
          <span v-else>导入素材</span>
        </button>
        <div class="asset-library-actions-divider" />
        <button
          type="button"
          class="ghost-button icon-only"
          title="刷新"
          @click="searchQuery = ''"
        >
          <RefreshCw :size="18" />
        </button>
        <div
          v-if="isMaterial"
          class="asset-library-view-toggle"
        >
          <button
            type="button"
            class="icon-only"
            :class="{ selected: layoutMode === 'grid' }"
            title="网格"
            @click="layoutMode = 'grid'"
          >
            <LayoutGrid :size="18" />
          </button>
          <button
            type="button"
            class="icon-only"
            :class="{ selected: layoutMode === 'list' }"
            title="列表"
            @click="layoutMode = 'list'"
          >
            <List :size="18" />
          </button>
        </div>
      </div>
    </div>

    <div class="asset-library-filters">
      <div class="asset-library-search">
        <Search :size="16" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="
            kind === 'voice'
              ? '搜索声音名称、风格或语言...'
              : kind === 'avatar'
                ? '搜索形象名称、标签...'
                : '搜索素材名称、分类...'
          "
        />
      </div>

      <select v-model="statusFilter" class="asset-library-filter-select">
        <option
          v-for="option in statusOptions"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>

      <div class="asset-library-sort">
        <List :size="14" />
        <select v-model="sortKey">
          <option
            v-for="option in sortOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="asset-library-body">
      <aside
        v-if="isMaterial && categories && categories.length > 0"
        class="asset-library-category-panel"
      >
        <ul>
          <li
            v-for="cat in categories"
            :key="cat.id"
          >
            <button
              type="button"
              :class="{ active: categoryFilter === cat.id }"
              @click="categoryFilter = cat.id"
            >
              <span class="category-label">
                <component :is="categoryIcon(cat.id)" :size="16" />
                {{ cat.label }}
              </span>
              <span class="category-count">{{ cat.count }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <main class="asset-library-main">
        <div
          v-if="filteredItems.length === 0"
          class="asset-library-empty"
        >
          <EmptyState
            title="未找到匹配资产"
            :description="
              searchQuery
                ? '尝试更换搜索词或清除筛选条件'
                : '当前分类下暂无资产'
            "
          />
        </div>

        <!-- Voice list -->
        <div
          v-else-if="kind === 'voice'"
          class="asset-voice-list"
          role="list"
        >
          <div
            v-for="item in filteredItems"
            :key="item.id"
            role="listitem"
            class="asset-voice-row"
            :class="[
              statusClass(item.status),
              { selected: selectedId === item.id },
            ]"
            @click="selectItem(item)"
          >
            <button
              type="button"
              class="asset-voice-play"
              :disabled="item.status !== 'ready'"
              :title="item.status === 'ready' ? '试听' : '暂不可试听'"
              @click.stop
            >
              <Music :size="18" />
            </button>
            <div class="asset-voice-meta">
              <div class="asset-voice-name">
                <strong>{{ item.name }}</strong>
                <span class="asset-voice-style">{{ item.language }}</span>
                <span class="asset-voice-style light">{{ item.style }}</span>
              </div>
            </div>
            <div class="asset-voice-col">
              <span class="asset-voice-col-label">来源</span>
              <span class="asset-voice-col-value">{{ item.sourceLabel }}</span>
            </div>
            <div class="asset-voice-col">
              <span class="asset-voice-col-label">时长</span>
              <span class="asset-voice-col-value">{{ item.duration }}</span>
            </div>
            <div class="asset-voice-status">
              <component
                :is="statusIcon(item.status)"
                :size="14"
                :class="{ spin: item.status === 'training' || item.status === 'processing' }"
              />
              <span>{{ item.statusText }}</span>
              <span
                v-if="item.statusDetail"
                class="asset-voice-status-detail"
              >
                {{ item.statusDetail }}
              </span>
            </div>
            <div class="asset-voice-col align-right">
              <span class="asset-voice-col-label">更新于</span>
              <span class="asset-voice-col-value muted">
                {{ formatRelativeTime(item.updatedAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Avatar grid -->
        <div
          v-else-if="kind === 'avatar'"
          class="asset-avatar-grid"
          role="list"
        >
          <div
            v-for="item in filteredItems"
            :key="item.id"
            role="listitem"
            class="asset-avatar-card"
            :class="[
              statusClass(item.status),
              { selected: selectedId === item.id },
            ]"
            @click="selectItem(item)"
          >
            <div class="asset-avatar-thumb aspect-9-16">
              <img
                v-if="item.thumbnail"
                :src="item.thumbnail"
                :alt="item.name"
              />
              <div v-else class="asset-avatar-thumb-placeholder">
                <UserRound :size="24" />
              </div>
              <div class="asset-avatar-overlay" />
              <div class="asset-avatar-status-badge">
                <component
                  :is="statusIcon(item.status)"
                  :size="12"
                  :class="{ spin: item.status === 'training' || item.status === 'processing' }"
                />
                <span>{{ item.statusText }}</span>
              </div>
              <div
                v-if="item.status === 'training' || item.status === 'processing'"
                class="asset-avatar-processing"
              >
                <Loader2 :size="24" class="spin" />
                <span>训练中 ({{ item.metadata?.["训练进度"] ?? "0%" }})</span>
              </div>
            </div>
            <div class="asset-avatar-info">
              <div class="asset-avatar-name-row">
                <strong>{{ item.name }}</strong>
                <span class="asset-avatar-version">{{ item.version }}</span>
              </div>
              <div class="asset-avatar-scene">
                <Video :size="14" />
                <span>{{ item.style }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Material grid/list -->
        <div
          v-else
          class="asset-material-list"
          :class="[`is-${layoutMode}`]"
          role="list"
        >
          <div
            v-for="item in filteredItems"
            :key="item.id"
            role="listitem"
            class="asset-material-card"
            :class="[
              statusClass(item.status),
              { selected: selectedId === item.id },
            ]"
            @click="selectItem(item)"
          >
            <div class="asset-material-thumb">
              <img
                v-if="item.thumbnail"
                :src="item.thumbnail"
                :alt="item.name"
              />
              <div v-else class="asset-material-thumb-placeholder">
                <Music :size="24" />
              </div>
              <div class="asset-material-type-badge">
                <component
                  :is="categoryIcon(item.category ?? 'all')"
                  :size="12"
                />
                <span>{{ item.categoryLabel }}</span>
              </div>
              <span
                v-if="item.duration && item.duration !== '—'"
                class="asset-material-duration"
              >
                {{ item.duration }}
              </span>
            </div>
            <div class="asset-material-info">
              <strong>{{ item.name }}</strong>
              <div class="asset-material-meta">
                <span>{{ item.resolution || item.size || item.duration }}</span>
                <span>{{ item.categoryLabel }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <AssetDetailDrawer
      v-if="selectedItem"
      :open="Boolean(selectedItem)"
      :item="selectedItem"
      :kind="kind"
      @close="selectedId = null"
      @use="handleUse"
      @delete="handleDelete"
    />
  </div>
</template>

<style scoped>
.asset-library {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: var(--mx-bg-base);
}

.asset-library-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
}

.asset-library-header-main h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--mx-text-primary);
  line-height: 1.25;
}

.asset-library-header-main p {
  margin: 0;
  font-size: 13px;
  color: var(--mx-text-secondary);
  max-width: 640px;
}

.asset-library-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.asset-library-header-actions button:disabled {
  opacity: 0.55;
}

.asset-library-actions-divider {
  width: 1px;
  height: 24px;
  background: var(--mx-border-default);
  margin: 0 4px;
}

.asset-library-view-toggle {
  display: inline-flex;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  overflow: hidden;
}

.asset-library-view-toggle button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 0;
  color: var(--mx-text-secondary);
  background: transparent;
}

.asset-library-view-toggle button.selected {
  color: var(--mx-text-primary);
  background: var(--mx-bg-elevated);
}

.asset-library-header-actions .icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
}

.asset-library-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
}

.asset-library-search {
  position: relative;
  flex: 1 1 240px;
  max-width: 320px;
}

.asset-library-search svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--mx-text-tertiary);
  pointer-events: none;
}

.asset-library-search input {
  width: 100%;
  padding-left: 32px;
}

.asset-library-filter-select,
.asset-library-sort select {
  min-width: 120px;
}

.asset-library-sort {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--mx-text-secondary);
  font-size: 12px;
}

.asset-library-sort select {
  border: 0;
  padding-right: 20px;
  color: var(--mx-text-secondary);
  background-color: transparent;
  background-position: right 2px center;
}

.asset-library-sort select:focus {
  box-shadow: none;
}

.asset-library-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.asset-library-category-panel {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
  overflow-y: auto;
}

.asset-library-category-panel ul {
  margin: 0;
  padding: 8px;
  list-style: none;
}

.asset-library-category-panel li + li {
  margin-top: 2px;
}

.asset-library-category-panel button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: var(--mx-radius-md);
  color: var(--mx-text-secondary);
  background: transparent;
  font-size: 12px;
  text-align: left;
}

.asset-library-category-panel button:hover {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.asset-library-category-panel button.active {
  color: var(--mx-text-primary);
  background: var(--mx-accent-soft-bg);
}

.asset-library-category-panel .category-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.asset-library-category-panel .category-count {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.asset-library-main {
  flex: 1 1 auto;
  min-width: 0;
  padding: 20px 24px;
  overflow-y: auto;
  background: var(--mx-bg-base);
}

.asset-library-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
}

/* Voice list */
.asset-voice-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.asset-voice-row {
  display: grid;
  grid-template-columns: 44px 2fr 1fr 1fr 1.5fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-surface);
  color: var(--mx-text-secondary);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.asset-voice-row:hover {
  border-color: var(--mx-border-default);
  background: var(--mx-bg-elevated);
}

.asset-voice-row.selected {
  border-color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
  box-shadow: inset 3px 0 0 var(--mx-accent);
}

.asset-voice-row.is-failed:hover {
  border-color: rgba(248, 113, 113, 0.25);
  background: var(--mx-error-bg);
}

.asset-voice-play {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.asset-voice-play:disabled {
  color: var(--mx-text-tertiary);
  background: var(--mx-bg-elevated);
}

.asset-voice-meta {
  min-width: 0;
}

.asset-voice-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.asset-voice-name strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-voice-style {
  flex-shrink: 0;
  padding: 1px 5px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-sm);
  font-size: 11px;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.asset-voice-style.light {
  border: 0;
  background: transparent;
  padding: 0;
}

.asset-voice-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.asset-voice-col-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--mx-text-tertiary);
}

.asset-voice-col-value {
  font-size: 12px;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-voice-col-value.muted {
  color: var(--mx-text-secondary);
}

.asset-voice-col.align-right {
  align-items: flex-end;
  text-align: right;
}

.asset-voice-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.asset-voice-status .is-ready + span {
  color: var(--mx-success);
}

.asset-voice-status .is-failed + span {
  color: var(--mx-error);
}

.asset-voice-status .is-processing + span,
.asset-voice-status .is-processing {
  color: var(--mx-accent);
}

.asset-voice-status-detail {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Avatar grid */
.asset-avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
}

.asset-avatar-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.asset-avatar-card:hover {
  border-color: var(--mx-border-active);
}

.asset-avatar-card.selected {
  border-color: var(--mx-accent);
  box-shadow: 0 0 0 2px var(--mx-accent-soft-bg);
}

.asset-avatar-thumb {
  position: relative;
  background: var(--mx-bg-elevated);
  overflow: hidden;
}

.asset-avatar-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-avatar-thumb-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--mx-text-tertiary);
}

.asset-avatar-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.55) 0%, transparent 45%);
  pointer-events: none;
}

.asset-avatar-status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  border-radius: var(--mx-radius-sm);
  font-size: 10px;
  font-weight: 600;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.asset-avatar-processing {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.35);
  font-size: 11px;
}

.asset-avatar-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
}

.asset-avatar-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.asset-avatar-name-row strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-avatar-version {
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: var(--mx-radius-sm);
  font-size: 10px;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.asset-avatar-scene {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--mx-text-secondary);
}

/* Material list/grid */
.asset-material-list {
  display: grid;
  gap: 12px;
}

.asset-material-list.is-grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.asset-material-list.is-list {
  grid-template-columns: 1fr;
}

.asset-material-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-md);
  background: var(--mx-bg-surface);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 120ms ease;
}

.asset-material-list.is-list .asset-material-card {
  flex-direction: row;
  align-items: center;
}

.asset-material-card:hover {
  border-color: var(--mx-border-active);
}

.asset-material-card.selected {
  border-color: var(--mx-accent);
  box-shadow: 0 0 0 2px var(--mx-accent-soft-bg);
}

.asset-material-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: var(--mx-bg-elevated);
  overflow: hidden;
}

.asset-material-list.is-list .asset-material-thumb {
  width: 160px;
  flex-shrink: 0;
}

.asset-material-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.asset-material-thumb-placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: var(--mx-text-tertiary);
}

.asset-material-type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: var(--mx-radius-sm);
  font-size: 10px;
  color: var(--mx-text-primary);
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.asset-material-duration {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 1px 4px;
  border-radius: var(--mx-radius-sm);
  font-size: 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  color: #ffffff;
  background: rgba(0, 0, 0, 0.65);
}

.asset-material-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
}

.asset-material-info strong {
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.asset-material-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  color: var(--mx-text-tertiary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.aspect-9-16 {
  aspect-ratio: 9 / 16;
}

@media (max-width: 1180px) {
  .asset-library-header {
    flex-direction: column;
    gap: 12px;
  }

  .asset-library-header-actions {
    width: 100%;
  }

  .asset-voice-row {
    grid-template-columns: 44px 2fr 1fr 1fr;
  }

  .asset-voice-col.align-right,
  .asset-voice-col:nth-of-type(3) {
    display: none;
  }
}
</style>
