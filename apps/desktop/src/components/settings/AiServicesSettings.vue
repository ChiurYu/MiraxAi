<script setup lang="ts">
import { AlertCircle, CheckCircle2, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import {
  createApiKeyProviderConfig,
  validateProviderConfig,
  type ApiKeyProvider,
  type ApiKeyProviderConfig,
} from "@mirax/core";
import { testAiProviderConnection, DEFAULT_PYTHON_PATH, type AiConnectionTestInput } from "@mirax/provider-ai";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import AppDrawer from "../../components/ui/AppDrawer.vue";
import { useAppSettings, getProviderReadiness, type ProviderReadiness } from "../../composables/useAppSettings.js";

const PROVIDER_OPTIONS: { value: ApiKeyProvider; label: string }[] = [
  { value: "openai", label: "OpenAI" },
  { value: "whisper", label: "Whisper (OpenAI API)" },
  { value: "local-whisper", label: "本地 Whisper (faster-whisper)" },
  { value: "cosyvoice", label: "CosyVoice" },
  { value: "elevenlabs-tts", label: "ElevenLabs TTS" },
  { value: "bailian-qwen-tts", label: "百炼 Qwen-TTS 声音复刻" },
  { value: "bailian-cosyvoice", label: "百炼 CosyVoice 声音复刻" },
  { value: "heygem", label: "HeyGem" },
  { value: "custom", label: "自定义" },
];

const ELEVENLABS_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "eleven_multilingual_v2", label: "eleven_multilingual_v2" },
];

const BAILIAN_QWEN_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "qwen3-tts-vc-2026-01-22", label: "qwen3-tts-vc-2026-01-22（中文声音复刻）" },
];

const BAILIAN_COSYVOICE_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "cosyvoice-v3.5-flash", label: "cosyvoice-v3.5-flash（快速验证）" },
  { value: "cosyvoice-v3.5-plus", label: "cosyvoice-v3.5-plus（更高质量）" },
];

const FILTER_OPTIONS: { value: "all" | "enabled" | "needs-config" | "failed"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "enabled", label: "已启用" },
  { value: "needs-config", label: "需要配置" },
  { value: "failed", label: "连接失败" },
];

const LOCAL_WHISPER_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "tiny", label: "tiny：速度快，适合快速 dogfood" },
  { value: "base", label: "base：中文质量更好，但 CPU 上明显变慢" },
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
  appSettings,
  providerConfigs,
  addProviderConfig,
  updateProviderConfig,
  removeProviderConfig,
  setRewriteProviderConfigId,
  markProviderVerified,
  clearProviderVerified,
  isProviderVerified,
  markProviderFailed,
  clearProviderFailed,
  isProviderFailed,
  persistNow,
} = useAppSettings();

const drawerOpen = ref(false);
const editingConfig = ref<ApiKeyProviderConfig | null>(null);
const editingApiKey = ref("");
const testMessages = ref<Record<string, string>>({});
const filter = ref<"all" | "enabled" | "needs-config" | "failed">("all");
const saving = ref(false);
const drawerError = ref("");

const apiKeyFieldName = computed(() =>
  editingConfig.value ? `mirax-provider-api-key-${editingConfig.value.id}` : "mirax-provider-api-key",
);

const originalConfig = computed(() =>
  editingConfig.value ? providerConfigs.value.find((c) => c.id === editingConfig.value!.id) : undefined,
);

const hasExistingApiKey = computed(() => Boolean(originalConfig.value?.apiKey?.trim()));

const isLocalWhisper = computed(() => editingConfig.value?.provider === "local-whisper");
const isElevenLabsTts = computed(() => editingConfig.value?.provider === "elevenlabs-tts");
const isBaiLianQwenTts = computed(() => editingConfig.value?.provider === "bailian-qwen-tts");
const isBaiLianCosyVoice = computed(() => editingConfig.value?.provider === "bailian-cosyvoice");
const isBaiLianTts = computed(() => isBaiLianQwenTts.value || isBaiLianCosyVoice.value);

watch(
  () => editingConfig.value?.provider,
  (provider) => {
    if (!editingConfig.value) return;
    if (provider === "local-whisper") {
      if (!editingConfig.value.model?.trim()) {
        editingConfig.value.model = "tiny";
      }
      if (!editingConfig.value.pythonPath?.trim()) {
        editingConfig.value.pythonPath = DEFAULT_PYTHON_PATH;
      }
    }
    if (provider === "elevenlabs-tts") {
      if (!editingConfig.value.voiceId?.trim()) {
        editingConfig.value.voiceId = "pNInz6obpgDQGcFmaJgB";
      }
      if (!editingConfig.value.model?.trim()) {
        editingConfig.value.model = "eleven_multilingual_v2";
      }
      editingConfig.value.baseUrl = undefined;
    }
    if (provider === "bailian-qwen-tts") {
      if (!editingConfig.value.model?.trim()) {
        editingConfig.value.model = "qwen3-tts-vc-2026-01-22";
      }
    }
    if (provider === "bailian-cosyvoice") {
      if (!editingConfig.value.model?.trim()) {
        editingConfig.value.model = "cosyvoice-v3.5-flash";
      }
    }
  },
);

function isRewriteProvider(config: ApiKeyProviderConfig): boolean {
  return config.provider === "openai" || config.provider === "custom";
}

function isActiveRewriteProvider(config: ApiKeyProviderConfig): boolean {
  return isRewriteProvider(config) && appSettings.rewriteProviderConfigId === config.id;
}

function isConnectionPassed(config: ApiKeyProviderConfig): boolean {
  return config.enabled && getProviderReadiness(config) === "ready" && isProviderVerified(config.id);
}

function isConnectionFailed(config: ApiKeyProviderConfig): boolean {
  return config.enabled && getProviderReadiness(config) === "ready" && isProviderFailed(config.id);
}

function statusMetaFor(config: ApiKeyProviderConfig) {
  if (isConnectionFailed(config)) return FAILED_META;
  if (isConnectionPassed(config)) return PASSED_META;
  if ((config.provider === "elevenlabs-tts" || config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice") && getProviderReadiness(config) === "ready") {
    return { label: "已就绪", icon: CheckCircle2, className: "ready" };
  }
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
  editingApiKey.value = "";
  drawerOpen.value = true;
}

function startEditProvider(config: ApiKeyProviderConfig) {
  editingConfig.value = { ...config };
  editingApiKey.value = "";
  drawerOpen.value = true;
}

function closeDrawer() {
  drawerOpen.value = false;
  editingConfig.value = null;
  editingApiKey.value = "";
  drawerError.value = "";
}

async function saveProvider() {
  if (!editingConfig.value || saving.value) return;

  const original = providerConfigs.value.find((c) => c.id === editingConfig.value!.id);
  const apiKey = editingApiKey.value.trim() || original?.apiKey || "";

  const configToSave = { ...editingConfig.value, apiKey };
  const errors = validateProviderConfig(configToSave);
  if (errors.length > 0) {
    window.alert(errors.join("\n"));
    return;
  }

  if (original) {
    updateProviderConfig(configToSave);
  } else {
    addProviderConfig(configToSave);
  }
  clearProviderVerified(editingConfig.value.id);
  clearProviderFailed(editingConfig.value.id);

  saving.value = true;
  drawerError.value = "";
  try {
    await persistNow();
    closeDrawer();
  } catch (error) {
    drawerError.value = error instanceof Error ? error.message : "本地保存失败，请重试";
  } finally {
    saving.value = false;
  }
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
  if (config.provider === "local-whisper") {
    return {
      mode: "local-whisper",
      pythonPath: config.pythonPath?.trim() || DEFAULT_PYTHON_PATH,
      model: config.model ?? "",
      probe: async (pythonPath) => {
        const result = await tauriInvoke("probe_local_whisper", { pythonPath });
        if (result !== true) {
          throw new Error("not-configured: 本地 Whisper 探测失败");
        }
      },
    };
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
          <button
            v-if="isRewriteProvider(config) && !isActiveRewriteProvider(config) && isConnectionPassed(config)"
            type="button"
            class="ghost-button"
            @click="setRewriteProviderConfigId(config.id)"
          >
            设为文案改写
          </button>
          <button
            v-else-if="isRewriteProvider(config) && !isActiveRewriteProvider(config) && getProviderReadiness(config) === 'ready' && !isProviderVerified(config.id)"
            type="button"
            class="ghost-button"
            disabled
          >
            先测试连接
          </button>
          <button
            v-else-if="isRewriteProvider(config) && !isActiveRewriteProvider(config) && getProviderReadiness(config) === 'needs-config'"
            type="button"
            class="ghost-button"
            disabled
          >
            需补全配置
          </button>
          <span
            v-if="isActiveRewriteProvider(config) && isConnectionPassed(config)"
            class="provider-status ready"
          >
            <CheckCircle2 :size="12" />
            文案改写使用中
          </span>
          <span
            v-else-if="isActiveRewriteProvider(config)"
            class="provider-status needs-config"
          >
            <AlertCircle :size="12" />
            文案改写未就绪
          </span>
          <button
            v-if="isActiveRewriteProvider(config)"
            type="button"
            class="ghost-button"
            @click="setRewriteProviderConfigId(undefined)"
          >
            停止文案改写
          </button>
          <button type="button" class="ghost-button" @click="toggleProviderEnabled(config)">
            {{ config.enabled ? "停用" : "启用" }}
          </button>
          <button type="button" class="secondary" @click="startEditProvider(config)">编辑</button>
          <button type="button" class="secondary" :disabled="config.provider === 'elevenlabs-tts' || config.provider === 'bailian-qwen-tts' || config.provider === 'bailian-cosyvoice'" @click="testProvider(config)">测试连接</button>
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
          <input
            v-if="!isLocalWhisper && !isElevenLabsTts"
            v-model="editingConfig.baseUrl"
            :placeholder="isBaiLianTts ? 'https://<业务空间ID>.cn-beijing.maas.aliyuncs.com/api/v1' : 'https://api.openai.com/v1'"
          />
          <input v-else-if="isLocalWhisper" disabled value="本地 faster-whisper，无需 Base URL" />
          <input v-else disabled value="ElevenLabs 官方 API，无需 Base URL" />
        </label>
        <label v-if="isElevenLabsTts" class="field"
        >
          <span class="field-label">Voice ID</span>
          <input v-model="editingConfig.voiceId" placeholder="pNInz6obpgDQGcFmaJgB" />
          <span class="field-hint">在 ElevenLabs 声音库中选择的 Voice ID。</span>
        </label>
        <label class="field"
        >
          <span class="field-label">默认模型</span>
          <select v-if="isLocalWhisper" v-model="editingConfig.model">
            <option v-for="option in LOCAL_WHISPER_MODEL_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <select v-else-if="isElevenLabsTts" v-model="editingConfig.model">
            <option v-for="option in ELEVENLABS_MODEL_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <select v-else-if="isBaiLianQwenTts" v-model="editingConfig.model">
            <option v-for="option in BAILIAN_QWEN_MODEL_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <select v-else-if="isBaiLianCosyVoice" v-model="editingConfig.model">
            <option v-for="option in BAILIAN_COSYVOICE_MODEL_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <input v-else v-model="editingConfig.model" placeholder="gpt-4.1" />
          <span v-if="isLocalWhisper" class="field-hint">
            tiny：速度快，适合快速 dogfood；base：中文质量更好，但在 CPU 上会明显变慢，适合短素材或离线验收。
          </span>
          <span v-else-if="isBaiLianQwenTts" class="field-hint">使用本地样本直接复刻；推荐 10–20 秒、单声道、24 kHz 以上的清晰人声。</span>
          <span v-else-if="isBaiLianCosyVoice" class="field-hint">克隆时需手工上传同一份样本到 OSS，并粘贴短期 HTTPS 签名 URL。</span>
        </label>
        <label v-if="isLocalWhisper" class="field"
        >
          <span class="field-label">Python 解释器路径</span>
          <input v-model="editingConfig.pythonPath" :placeholder="DEFAULT_PYTHON_PATH" />
          <span class="field-hint">自动加载默认本地环境路径，可手动覆盖；支持 ~ 表示用户主目录，留空则使用默认值。</span>
        </label>
        <label v-if="!isLocalWhisper" class="field"
        >
          <span class="field-label">API Key</span>
          <input
            v-model="editingApiKey"
            type="password"
            :name="apiKeyFieldName"
            autocomplete="new-password"
            :placeholder="hasExistingApiKey ? '已保存在本机，不会回显；留空将保留当前 Key' : '已保存在本机，可留空保留，输入新值则替换'"
          />
          <span class="field-hint">
            API Key 仅保存在本机 SQLite，不会进入 snapshot 或 localStorage。
          </span>
          <span v-if="hasExistingApiKey" class="field-hint preserved-key-hint">
            API Key 已保存在本机，不会回显；留空将保留当前 Key。
          </span>
        </label>
        <div v-else class="field">
          <span class="field-label">API Key</span>
          <span class="field-hint">本地 Whisper 不需要 API Key。</span>
        </div>
      </form>

      <template #actions>
        <div v-if="drawerError" class="drawer-error">{{ drawerError }}</div>
        <button
          v-if="editingConfig"
          type="button"
          class="primary"
          :disabled="saving"
          @click="saveProvider"
        >
          {{ saving ? "保存中…" : "保存" }}
        </button>
        <button type="button" class="ghost-button" :disabled="saving" @click="closeDrawer">取消</button>
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

.provider-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.field-hint {
  font-size: 11px;
  line-height: 1.5;
  color: var(--mx-text-tertiary);
}

.preserved-key-hint {
  color: var(--mx-info);
}

.drawer-error {
  width: 100%;
  padding: 8px 10px;
  border-radius: var(--mx-radius-md);
  background: var(--mx-error-bg);
  color: var(--mx-error);
  font-size: 12px;
  line-height: 1.5;
}
</style>
