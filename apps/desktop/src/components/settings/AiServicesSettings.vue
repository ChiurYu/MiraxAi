<script setup lang="ts">
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref } from "vue";
import {
  createApiKeyProviderConfig,
  validateProviderConfig,
  type ApiKeyProvider,
  type ApiKeyProviderConfig,
} from "@mirax/core";
import { testAiProviderConnection, type AiConnectionTestInput } from "@mirax/provider-ai";
import AppDrawer from "../../components/ui/AppDrawer.vue";
import { useAppSettings, getProviderReadiness, type ProviderReadiness } from "../../composables/useAppSettings.js";

const PROVIDER_OPTIONS: { value: ApiKeyProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "whisper", label: "Whisper" },
  { value: "cosyvoice", label: "CosyVoice" },
  { value: "heygem", label: "HeyGem" },
  { value: "custom", label: "自定义" },
];

const FILTER_OPTIONS: { value: "all" | "enabled" | "needs-config" | "failed"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "enabled", label: "已启用" },
  { value: "needs-config", label: "需要配置" },
  { value: "failed", label: "连接失败" },
];

const STATUS_META: Record<
  ProviderReadiness,
  { label: string; icon: typeof AlertCircle | typeof CheckCircle2; className: string }
> = {
  disabled: { label: "已停用", icon: AlertCircle, className: "disabled" },
  "needs-config": { label: "需要配置", icon: AlertCircle, className: "needs-config" },
  ready: { label: "待测试", icon: AlertCircle, className: "configured" },
};

const PASSED_META: { label: string; icon: typeof CheckCircle2; className: string } = {
  label: "连接正常",
  icon: CheckCircle2,
  className: "ready",
};

const FAILED_META: { label: string; icon: typeof AlertCircle; className: string } = {
  label: "连接失败",
  icon: AlertCircle,
  className: "failed",
};

const {
  providerConfigs,
  addProviderConfig,
  updateProviderConfig,
  removeProviderConfig,
  markProviderVerified,
  clearProviderVerified,
  isProviderVerified,
  markProviderFailed,
  clearProviderFailed,
  isProviderFailed,
} = useAppSettings();

const drawerOpen = ref(false);
const editingConfig = ref<ApiKeyProviderConfig | null>(null);
const testMessages = ref<Record<string, string>>({});
const filter = ref<"all" | "enabled" | "needs-config" | "failed">("all");

function isConnectionPassed(config: ApiKeyProviderConfig): boolean {
  return config.enabled && getProviderReadiness(config) === "ready" && isProviderVerified(config.id);
}

function isConnectionFailed(config: ApiKeyProviderConfig): boolean {
  return config.enabled && getProviderReadiness(config) === "ready" && isProviderFailed(config.id);
}

function statusMetaFor(config: ApiKeyProviderConfig) {
  if (isConnectionFailed(config)) return FAILED_META;
  if (isConnectionPassed(config)) return PASSED_META;
  return STATUS_META[getProviderReadiness(config)];
}

const filteredConfigs = computed(() => {
  if (filter.value === "all") return providerConfigs.value;
  if (filter.value === "enabled") return providerConfigs.value.filter((c) => c.enabled);
  if (filter.value === "needs-config")
    return providerConfigs.value.filter((c) => getProviderReadiness(c) === "needs-config");
  if (filter.value === "failed")
    return providerConfigs.value.filter((c) => isConnectionFailed(c));
  return providerConfigs.value;
});

function startAddProvider() {
  editingConfig.value = createApiKeyProviderConfig({
    id: crypto.randomUUID(),
    label: "",
    provider: "openai",
    apiKey: "",
  });
  drawerOpen.value = true;
}

function startEditProvider(config: ApiKeyProviderConfig) {
  editingConfig.value = { ...config };
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  editingConfig.value = null;
}

function saveProvider() {
  if (!editingConfig.value) return;

  const errors = validateProviderConfig(editingConfig.value);
  if (errors.length > 0) {
    window.alert(errors.join("\n"));
    return;
  }

  const existing = providerConfigs.value.find((c) => c.id === editingConfig.value!.id);
  if (existing) {
    updateProviderConfig(editingConfig.value);
  } else {
    addProviderConfig(editingConfig.value);
  }
  clearProviderVerified(editingConfig.value.id);
  clearProviderFailed(editingConfig.value.id);
  closeDrawer();
}

async function testProvider(config: ApiKeyProviderConfig) {
  testMessages.value[config.id] = "检测中…";

  try {
    const result = await testAiProviderConnection(connectionTestInputFor(config));
    testMessages.value[config.id] = result.ok ? "连接正常" : result.message;
    if (result.ok) {
      markProviderVerified(config.id);
      clearProviderFailed(config.id);
    } else {
      clearProviderVerified(config.id);
      markProviderFailed(config.id);
    }
  } catch (error) {
    testMessages.value[config.id] = error instanceof Error ? error.message : "连接测试失败";
    clearProviderVerified(config.id);
    markProviderFailed(config.id);
  }
}

function connectionTestInputFor(config: ApiKeyProviderConfig): AiConnectionTestInput {
  if (config.provider === "whisper") {
    return { mode: "whisper", baseUrl: config.baseUrl ?? "", apiKey: config.apiKey };
  }
  if (config.provider === "cosyvoice") {
    return { mode: "cosyvoice", baseUrl: config.baseUrl ?? "", apiKey: config.apiKey };
  }
  if (config.provider === "heygem") {
    return { mode: "heygem", baseUrl: config.baseUrl ?? "", apiKey: config.apiKey };
  }
  if (config.provider === "custom" && !config.baseUrl?.trim()) {
    throw new Error("Custom provider Base URL 不能为空。");
  }
  return {
    mode: "openai-compatible",
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model ?? "",
  };
}

function toggleProviderEnabled(config: ApiKeyProviderConfig) {
  clearProviderVerified(config.id);
  clearProviderFailed(config.id);
  updateProviderConfig({ ...config, enabled: !config.enabled });
}

function deleteProvider(id: string) {
  if (window.confirm("确定删除该 Provider 配置？本地保存的 API Key 也会被移除。")) {
    clearProviderVerified(id);
    clearProviderFailed(id);
    removeProviderConfig(id);
  }
}
</script>

<template>
  <div class="settings-section ai-services-settings">
    <div class="section-hero">
      <h2>AI 服务</h2>
      <p>管理大模型、语音识别、声音克隆和数字人服务的连接信息。API Key 仅保存在本地，不会被持久化到 snapshot。</p>
    </div>

    <div class="settings-toolbar">
      <div class="filter-tabs">
        <button
          v-for="option in FILTER_OPTIONS"
          :key="option.value"
          type="button"
          class="filter-tab"
          :class="{ active: filter === option.value }"
          @click="filter = option.value"
        >
          {{ option.label }}
        </button>
      </div>
      <button type="button" class="primary" @click="startAddProvider">
        <Plus :size="16" />
        添加 Provider
      </button>
    </div>

    <div v-if="providerConfigs.length === 0" class="settings-empty-state">
      <AlertCircle :size="20" />
      <span>暂无 Provider 配置。当前使用 mock provider 运行；真实能力接入后才会启用对应服务。</span>
    </div>

    <ul v-else class="provider-table">
      <li v-for="config in filteredConfigs" :key="config.id" class="provider-row">
        <div class="provider-cell provider-name">
          <strong>{{ config.label || "未命名" }}</strong>
          <span class="provider-type">{{ config.provider }}</span>
        </div>
        <div class="provider-cell">{{ config.model || "—" }}</div>
        <div class="provider-cell">
          <span
            class="provider-status"
            :class="statusMetaFor(config).className"
          >
            <component
              :is="statusMetaFor(config).icon"
              :size="12"
            />
            {{ statusMetaFor(config).label }}
          </span>
        </div>
        <div class="provider-cell provider-actions">
          <button type="button" class="ghost-button" @click="toggleProviderEnabled(config)">
            {{ config.enabled ? "停用" : "启用" }}
          </button>
          <button type="button" class="secondary" @click="startEditProvider(config)">编辑</button>
          <button type="button" class="secondary" @click="testProvider(config)">测试连接</button>
          <button type="button" class="ghost-button danger" @click="deleteProvider(config.id)">
            <Trash2 :size="14" />
          </button>
        </div>
        <div v-if="testMessages[config.id]" class="provider-test-message">{{ testMessages[config.id] }}</div>
      </li>
    </ul>

    <AppDrawer :open="drawerOpen" title="Provider 配置" @close="closeDrawer">
      <form v-if="editingConfig" class="provider-form" @submit.prevent="saveProvider">
        <label class="field"
        >
          <span class="field-label">名称</span>
          <input v-model="editingConfig.label" required />
        </label>
        <label class="field"
        >
          <span class="field-label">类型</span>
          <select v-model="editingConfig.provider">
            <option v-for="option in PROVIDER_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
        </label>
        <label class="field"
        >
          <span class="field-label">Base URL</span>
          <input v-model="editingConfig.baseUrl" placeholder="https://api.openai.com/v1" />
        </label>
        <label class="field"
        >
          <span class="field-label">默认模型</span>
          <input v-model="editingConfig.model" placeholder="gpt-4.1" />
        </label>
        <label class="field"
        >
          <span class="field-label">API Key</span>
          <input
            v-model="editingConfig.apiKey"
            type="password"
            autocomplete="off"
            placeholder="本地填写，不进入持久化 snapshot"
          />
        </label>
      </form>

      <template #actions>
        <button v-if="editingConfig" type="button" class="primary" @click="saveProvider">保存</button>
        <button type="button" class="ghost-button" @click="closeDrawer">取消</button>
      </template>
    </AppDrawer>
  </div>
</template>

<style scoped>
.ai-services-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 900px;
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

.settings-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tab {
  padding: 6px 10px;
  border: none;
  border-radius: var(--mx-radius-md);
  background: transparent;
  color: var(--mx-text-secondary);
  font-size: 12px;
  cursor: pointer;
}

.filter-tab:hover {
  background: var(--mx-bg-hover);
  color: var(--mx-text-primary);
}

.filter-tab.active {
  background: var(--mx-accent-soft-bg);
  color: var(--mx-accent);
  font-weight: 600;
}

.settings-empty-state {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border: 1px dashed var(--mx-border-active);
  border-radius: var(--mx-radius-lg);
  color: var(--mx-text-tertiary);
  font-size: 13px;
  background: var(--mx-bg-input);
}

.provider-table {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.provider-row {
  display: grid;
  grid-template-columns: 1fr 140px 100px auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
}

.provider-cell {
  font-size: 13px;
  color: var(--mx-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.provider-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-name strong {
  color: var(--mx-text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-type {
  padding: 2px 6px;
  border-radius: var(--mx-radius-sm);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
  flex-shrink: 0;
}

.provider-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: var(--mx-radius-pill);
  font-size: 11px;
  font-weight: 600;
  color: var(--mx-text-tertiary);
  background: var(--mx-bg-elevated);
}

.provider-status.ready {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.provider-status.needs-config {
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
}

.provider-status.failed {
  color: var(--mx-error);
  background: var(--mx-error-bg);
}

.provider-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.provider-actions button {
  min-height: 28px;
  padding: 0 10px;
  font-size: 12px;
}

.provider-test-message {
  grid-column: 1 / -1;
  font-size: 12px;
  color: var(--mx-text-tertiary);
  word-break: break-all;
}

.provider-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--mx-text-secondary);
}
</style>
