<script setup lang="ts">
import { AlertTriangle, Database, Download, Trash2, Upload } from "lucide-vue-next";
import { ref } from "vue";
import AppDialog from "../../components/ui/AppDialog.vue";

const confirmResetDialogOpen = ref(false);
const resetConfirmText = ref("");
const actionMessage = ref("");

const storageOverview = ref({
  database: 12,
  projects: 86,
  cache: 124,
  logs: 8,
  total: 230,
  diskAvailable: 45_200,
});

const cacheCategories = ref([
  { key: "preview", label: "预览缓存", size: 64, selected: true },
  { key: "download", label: "下载缓存", size: 32, selected: false },
  { key: "log", label: "运行日志", size: 8, selected: true },
  { key: "temp", label: "临时产物", size: 20, selected: false },
]);

function formatMb(mb: number): string {
  return `${mb} MB`;
}

function simulateBackup() {
  actionMessage.value = "数据备份功能将在本地存储模块接入后启用；当前不会生成任何文件。";
}

function simulateRestore() {
  actionMessage.value = "数据恢复功能将在本地存储模块接入后启用；当前不会读取任何文件。";
}

function simulateClearCache() {
  const selected = cacheCategories.value.filter((c) => c.selected);
  if (selected.length === 0) {
    actionMessage.value = "请至少选择一个缓存类别。";
    return;
  }
  const total = selected.reduce((sum, c) => sum + c.size, 0);
  actionMessage.value = `已标记清理 ${selected.map((c) => c.label).join("、")}，约 ${total} MB。真实清理将在本地存储模块接入后执行。`;
}

function openResetDialog() {
  confirmResetDialogOpen.value = true;
  resetConfirmText.value = "";
}

function closeResetDialog() {
  confirmResetDialogOpen.value = false;
  resetConfirmText.value = "";
}

function confirmReset() {
  if (resetConfirmText.value !== "RESET") {
    actionMessage.value = "请输入 RESET 以确认重置操作。";
    return;
  }
  actionMessage.value = "重置操作已记录；真实清除将在本地存储模块接入后执行。";
  closeResetDialog();
}
</script>

<template>
  <div class="settings-section data-settings">
    <div class="section-hero">
      <h2>数据</h2>
      <p>本地数据库、缓存与危险操作。备份、恢复、清理和重置目前仅记录交互状态，不会实际读写文件或删除数据。</p>
    </div>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>本地数据库</h3>
      </div>
      <div class="settings-card-body">
        <div class="database-row">
          <Database :size="18" />
          <div class="database-info">
            <strong>mirax-local.db</strong>
            <span>类型：SQLite · 状态：未接入 · 上次检查：—</span>
          </div>
        </div>
        <div class="database-actions">
          <button type="button" class="secondary" disabled title="本地存储模块尚未接入">
            <Download :size="14" />
            导出数据库
          </button>
          <button type="button" class="secondary" disabled title="本地存储模块尚未接入">
            <Upload :size="14" />
            验证完整性
          </button>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>存储概览</h3>
      </div>
      <div class="settings-card-body">
        <div class="storage-bars">
          <div v-for="item in [
            { key: 'database', label: '数据库', value: storageOverview.database },
            { key: 'projects', label: '项目产物', value: storageOverview.projects },
            { key: 'cache', label: '缓存', value: storageOverview.cache },
            { key: 'logs', label: '日志', value: storageOverview.logs },
          ]" :key="item.key" class="storage-bar-row">
            <span class="storage-label">{{ item.label }}</span>
            <div class="storage-bar">
              <div
                class="storage-bar-fill"
                :style="{ width: `${Math.min((item.value / storageOverview.total) * 100, 100)}%` }"
              />
            </div>
            <span class="storage-value">{{ formatMb(item.value) }}</span>
          </div>
        </div>
        <div class="storage-summary">
          <span>总计：{{ formatMb(storageOverview.total) }}</span>
          <span>磁盘可用：{{ formatMb(storageOverview.diskAvailable) }}</span>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>数据备份</h3>
      </div>
      <div class="settings-card-body">
        <div class="backup-status">
          <span>最近备份：无</span>
          <span>文件：—</span>
          <span>大小：—</span>
        </div>
        <div class="backup-actions">
          <button type="button" class="secondary" @click="simulateBackup">立即备份</button>
          <button type="button" class="ghost-button" @click="simulateRestore">从备份恢复</button>
        </div>
      </div>
    </section>

    <section class="settings-card">
      <div class="settings-card-header">
        <h3>缓存管理</h3>
      </div>
      <div class="settings-card-body">
        <label v-for="category in cacheCategories" :key="category.key" class="toggle-row">
          <input v-model="category.selected" type="checkbox" />
          <span>{{ category.label }}（{{ formatMb(category.size) }}）</span>
        </label>
        <button type="button" class="ghost-button danger" @click="simulateClearCache">
          <Trash2 :size="14" />
          清理选中缓存
        </button>
      </div>
    </section>

    <section class="settings-card is-danger">
      <div class="settings-card-header">
        <h3>危险操作</h3>
      </div>
      <div class="settings-card-body">
        <p class="danger-text">
          <AlertTriangle :size="14" />
          重置将清除所有本地设置、草稿和任务历史。此操作不会实际执行，直到本地存储模块接入。
        </p>
        <button type="button" class="primary danger" @click="openResetDialog">重置所有本地数据</button>
      </div>
    </section>

    <p v-if="actionMessage" class="action-message">{{ actionMessage }}</p>

    <AppDialog
      :open="confirmResetDialogOpen"
      title="确认重置所有本地数据"
      @close="closeResetDialog"
    >
      <p>请输入 RESET 以确认。此操作不会立即删除任何真实文件。</p>
      <input v-model="resetConfirmText" type="text" placeholder="RESET" class="reset-input" />
      <template #actions>
        <button type="button" class="primary danger" @click="confirmReset">确认重置</button>
        <button type="button" class="ghost-button" @click="closeResetDialog">取消</button>
      </template>
    </AppDialog>
  </div>
</template>

<style scoped>
.data-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
}

.section-hero h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
}

.section-hero p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--mx-text-tertiary);
}

.settings-card {
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
  overflow: hidden;
}

.settings-card.is-danger {
  border-color: rgba(248, 113, 113, 0.35);
}

.settings-card-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-elevated);
}

.settings-card-header h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--mx-text-primary);
}

.settings-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.database-row {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--mx-text-secondary);
}

.database-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.database-info strong {
  color: var(--mx-text-primary);
  font-size: 13px;
}

.database-info span {
  font-size: 12px;
}

.database-actions,
.backup-actions {
  display: flex;
  gap: 10px;
}

.storage-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.storage-bar-row {
  display: grid;
  grid-template-columns: 80px 1fr 70px;
  align-items: center;
  gap: 10px;
}

.storage-label {
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.storage-bar {
  height: 6px;
  border-radius: var(--mx-radius-pill);
  background: var(--mx-bg-input);
  overflow: hidden;
}

.storage-bar-fill {
  height: 100%;
  border-radius: var(--mx-radius-pill);
  background: var(--mx-accent);
}

.storage-value {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  text-align: right;
}

.storage-summary {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--mx-text-tertiary);
}

.backup-status {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: var(--mx-text-secondary);
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--mx-text-primary);
  cursor: pointer;
}

.danger-text {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-error);
}

.action-message {
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--mx-radius-md);
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.reset-input {
  width: 100%;
  margin-top: 12px;
  padding: 8px 10px;
  border-radius: var(--mx-radius-md);
  border: 1px solid var(--mx-border-subtle);
  background: var(--mx-bg-input);
  color: var(--mx-text-primary);
  font-size: 13px;
}

.reset-input:focus {
  outline: none;
  border-color: var(--mx-error);
  box-shadow: 0 0 0 3px var(--mx-error-bg);
}
</style>
