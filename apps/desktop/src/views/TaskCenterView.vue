<script setup lang="ts">
import {
  AlertCircle,
  ArrowLeft,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  FileVideo,
  Loader2,
  RefreshCw,
  Search,
  Tag,
  XCircle,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import { SUPPORTED_PLATFORM_PROFILES } from "@mirax/provider-publish";
import type { PublishTask } from "@mirax/provider-publish";
import AppDrawer from "../components/ui/AppDrawer.vue";
import EmptyState from "../components/ui/EmptyState.vue";
import { useTaskCenterPreview } from "../composables/useTaskCenterPreview.js";

const emit = defineEmits<{
  "return-to-stage": [stageId: "publish"];
}>();

const { tasks, refresh } = useTaskCenterPreview();

const platformLabels = computed<Record<string, string>>(() =>
  Object.fromEntries(SUPPORTED_PLATFORM_PROFILES.map((p) => [p.id, p.label])),
);

const statusTabs: { key: "all" | PublishTask["status"]; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待提交" },
  { key: "processing", label: "处理中" },
  { key: "completed", label: "成功" },
  { key: "failed", label: "失败" },
  { key: "cancelled", label: "已取消" },
];

const activeStatus = ref<"all" | PublishTask["status"]>("all");
const searchQuery = ref("");
const selectedTask = ref<PublishTask | null>(null);

const statusMeta: Record<
  PublishTask["status"],
  { label: string; icon: typeof Clock; className: string }
> = {
  pending: { label: "待提交", icon: Clock, className: "is-pending" },
  processing: { label: "处理中", icon: Loader2, className: "is-processing" },
  completed: { label: "成功", icon: CheckCircle2, className: "is-completed" },
  failed: { label: "失败", icon: XCircle, className: "is-failed" },
  cancelled: { label: "已取消", icon: Ban, className: "is-cancelled" },
};

const filteredTasks = computed(() => {
  let list = tasks.value;
  if (activeStatus.value !== "all") {
    list = list.filter((t) => t.status === activeStatus.value);
  }
  const q = searchQuery.value.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.platformId.toLowerCase().includes(q) ||
        platformLabels.value[t.platformId]?.toLowerCase().includes(q),
    );
  }
  return [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
});

const statusCounts = computed(() => {
  const counts: Record<"all" | PublishTask["status"], number> = {
    all: tasks.value.length,
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  };
  for (const task of tasks.value) {
    counts[task.status] += 1;
  }
  return counts;
});

function selectTask(task: PublishTask) {
  selectedTask.value = task;
}

function closeDrawer() {
  selectedTask.value = null;
}

function handleReturnToPublish() {
  const task = selectedTask.value;
  selectedTask.value = null;
  if (task) {
    emit("return-to-stage", "publish");
  }
}

function fileName(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return "";
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function taskErrorMessage(task: PublishTask): string {
  if (task.status === "failed") {
    return "平台返回发布失败，请检查账号状态、网络或视频内容后重试。";
  }
  if (task.status === "cancelled") {
    return "任务已被取消，不会继续提交到平台。";
  }
  return "";
}
</script>

<template>
  <div class="task-center">
    <div class="task-center-header">
      <div class="task-center-header-main">
        <h1>任务中心</h1>
        <p>查看和管理已创建的发布任务，追踪每个任务在各平台上的提交状态。</p>
      </div>
      <div class="task-center-header-actions">
        <button type="button" class="ghost-button icon-only" title="刷新" @click="refresh">
          <RefreshCw :size="18" />
        </button>
      </div>
    </div>

    <div class="task-center-filters">
      <div class="task-center-search">
        <Search :size="16" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索任务标题或平台..."
        />
      </div>
      <div class="task-status-tabs" role="tablist">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :aria-selected="activeStatus === tab.key"
          :class="['task-status-tab', { active: activeStatus === tab.key }]"
          @click="activeStatus = tab.key"
        >
          {{ tab.label }}
          <span class="task-status-count">{{ statusCounts[tab.key] }}</span>
        </button>
      </div>
    </div>

    <main class="task-center-main">
      <div v-if="filteredTasks.length === 0" class="task-center-empty">
        <EmptyState
          title="暂无任务"
          description="在发布阶段创建任务后，它们会出现在这里。"
        />
      </div>

      <ul v-else class="task-list" role="list">
        <li
          v-for="task in filteredTasks"
          :key="task.id"
          class="task-row"
          :data-status="task.status"
          @click="selectTask(task)"
        >
          <div class="task-row-main">
            <span class="task-platform">{{ platformLabels[task.platformId] ?? task.platformId }}</span>
            <span class="task-mode">{{ task.mode === "direct" ? "直接发布" : "存为草稿" }}</span>
            <span class="task-status-badge" :class="statusMeta[task.status].className">
              <component
                :is="statusMeta[task.status].icon"
                :size="12"
                :class="{ spin: task.status === 'processing' }"
              />
              {{ statusMeta[task.status].label }}
            </span>
          </div>
          <div class="task-row-detail">
            <span class="task-title">{{ task.title || "无标题" }}</span>
            <span class="task-video">{{ fileName(task.videoPath) }}</span>
          </div>
          <div class="task-row-meta">
            <span>ID: {{ task.id }}</span>
            <span>更新于 {{ formatTime(task.updatedAt) }}</span>
          </div>
        </li>
      </ul>
    </main>

    <AppDrawer
      v-if="selectedTask"
      :open="Boolean(selectedTask)"
      title="任务详情"
      @close="closeDrawer"
    >
      <div class="task-detail">
        <div class="task-detail-section">
          <div
            class="task-detail-status"
            :class="statusMeta[selectedTask.status].className"
          >
            <component
              :is="statusMeta[selectedTask.status].icon"
              :size="18"
              :class="{ spin: selectedTask.status === 'processing' }"
            />
            <span>{{ statusMeta[selectedTask.status].label }}</span>
          </div>
          <dl class="task-detail-info">
            <div>
              <dt>平台</dt>
              <dd>{{ platformLabels[selectedTask.platformId] ?? selectedTask.platformId }}</dd>
            </div>
            <div>
              <dt>发布模式</dt>
              <dd>{{ selectedTask.mode === "direct" ? "直接发布" : "存为草稿" }}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ formatTime(selectedTask.createdAt) }}</dd>
            </div>
            <div>
              <dt>更新时间</dt>
              <dd>{{ formatTime(selectedTask.updatedAt) }}</dd>
            </div>
          </dl>
        </div>

        <div class="task-detail-section">
          <h3><FileVideo :size="14" /> 输入</h3>
          <div class="task-detail-input">
            <div class="task-detail-field">
              <span class="task-detail-label">标题</span>
              <span class="task-detail-value">{{ selectedTask.title || "无标题" }}</span>
            </div>
            <div class="task-detail-field">
              <span class="task-detail-label">描述</span>
              <span class="task-detail-value">{{ selectedTask.description || "无描述" }}</span>
            </div>
            <div v-if="selectedTask.tags.length > 0" class="task-detail-field">
              <span class="task-detail-label">话题</span>
              <span class="task-detail-tags">
                <span v-for="tag in selectedTask.tags" :key="tag" class="task-tag">
                  <Tag :size="10" /> {{ tag }}
                </span>
              </span>
            </div>
            <div class="task-detail-field">
              <span class="task-detail-label">视频</span>
              <span class="task-detail-value mono">{{ selectedTask.videoPath }}</span>
            </div>
          </div>
        </div>

        <div class="task-detail-section">
          <h3><Calendar :size="14" /> 输出</h3>
          <div class="task-detail-field">
            <span class="task-detail-label">任务 ID</span>
            <span class="task-detail-value mono">{{ selectedTask.id }}</span>
          </div>
        </div>

        <div v-if="selectedTask.status === 'failed' || selectedTask.status === 'cancelled'" class="task-detail-section is-error">
          <h3><AlertCircle :size="14" /> 错误 / 说明</h3>
          <p class="task-detail-error">{{ taskErrorMessage(selectedTask) }}</p>
        </div>
      </div>

      <template #actions>
        <button type="button" class="secondary" @click="closeDrawer">关闭</button>
        <button type="button" class="primary" @click="handleReturnToPublish">
          <ArrowLeft :size="14" />
          返回发布阶段
        </button>
      </template>
    </AppDrawer>
  </div>
</template>

<style scoped>
.task-center {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: var(--mx-bg-base);
}

.task-center-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
}

.task-center-header h1 {
  margin: 0 0 6px;
  font-size: 24px;
  font-weight: 700;
  color: var(--mx-text-primary);
  line-height: 1.25;
}

.task-center-header p {
  margin: 0;
  font-size: 13px;
  color: var(--mx-text-secondary);
  max-width: 640px;
}

.task-center-header-actions .icon-only {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
}

.task-center-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-surface);
}

.task-center-search {
  position: relative;
  flex: 1 1 240px;
  max-width: 320px;
}

.task-center-search svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--mx-text-tertiary);
  pointer-events: none;
}

.task-center-search input {
  width: 100%;
  padding-left: 32px;
}

.task-status-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-status-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-pill);
  color: var(--mx-text-secondary);
  background: transparent;
  font-size: 12px;
  font-weight: 500;
}

.task-status-tab:hover:not(:disabled) {
  border-color: var(--mx-border-active);
  color: var(--mx-text-primary);
}

.task-status-tab.active {
  border-color: var(--mx-accent);
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.task-status-count {
  padding: 1px 5px;
  border-radius: var(--mx-radius-pill);
  font-size: 10px;
  font-weight: 700;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-input);
}

.task-status-tab.active .task-status-count {
  color: var(--mx-accent);
  background: var(--mx-bg-base);
}

.task-center-main {
  flex: 1 1 auto;
  min-width: 0;
  padding: 20px 24px;
  overflow-y: auto;
}

.task-center-empty {
  display: grid;
  place-items: center;
  min-height: 240px;
}

.task-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.task-row {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--mx-border-default);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-elevated);
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.task-row:hover {
  border-color: var(--mx-border-active);
  background: var(--mx-bg-hover);
}

.task-row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.task-platform {
  font-size: 13px;
  font-weight: 700;
  color: var(--mx-text-primary);
}

.task-mode {
  padding: 1px 6px;
  border-radius: var(--mx-radius-pill);
  font-size: 10px;
  font-weight: 600;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-input);
}

.task-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  font-weight: 700;
}

.task-status-badge.is-pending {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.task-status-badge.is-processing {
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.task-status-badge.is-completed {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.task-status-badge.is-failed,
.task-status-badge.is-cancelled {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.task-row-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.task-video {
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.task-row-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.task-detail {
  display: grid;
  gap: 18px;
}

.task-detail-section {
  display: grid;
  gap: 12px;
}

.task-detail-section h3 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--mx-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.task-detail-section.is-error {
  padding: 12px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-error-bg);
}

.task-detail-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 12px;
  border-radius: var(--mx-radius-pill);
  font-size: 14px;
  font-weight: 700;
}

.task-detail-status.is-pending {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.task-detail-status.is-processing {
  color: var(--mx-accent);
  background: var(--mx-accent-soft-bg);
}

.task-detail-status.is-completed {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.task-detail-status.is-failed,
.task-detail-status.is-cancelled {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.task-detail-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px 16px;
  margin: 0;
}

.task-detail-info dt {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.task-detail-info dd {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--mx-text-primary);
}

.task-detail-input {
  display: grid;
  gap: 10px;
}

.task-detail-field {
  display: grid;
  gap: 4px;
}

.task-detail-label {
  font-size: 11px;
  color: var(--mx-text-tertiary);
}

.task-detail-value {
  font-size: 13px;
  color: var(--mx-text-primary);
  word-break: break-word;
}

.task-detail-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  color: var(--mx-text-secondary);
}

.task-detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.task-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-input);
}

.task-detail-error {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--mx-error);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
