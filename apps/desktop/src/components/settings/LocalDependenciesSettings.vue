<script setup lang="ts">
import { AlertCircle, CheckCircle2, Download, Play, RefreshCw, Wrench } from "lucide-vue-next";
import { computed, ref } from "vue";
import {
  checkSidecarDependencies,
  createDefaultSidecarConfig,
  type DependencyCheckResult,
  type SidecarConfig,
} from "@mirax/sidecar-manager";
import { useAppSettings, probeFfmpegPath } from "../../composables/useAppSettings.js";

type DependencyKey = "ffmpeg" | "python" | "cosyvoice" | "heygem" | "playwright";

interface DependencyItem {
  key: DependencyKey;
  label: string;
  purpose: string;
  installNote: string;
}

const DEPENDENCIES: DependencyItem[] = [
  {
    key: "ffmpeg",
    label: "FFmpeg",
    purpose: "视频抽帧、合成、转码与封面生成",
    installNote: "请从 ffmpeg.org 下载静态构建，或等待后续一键安装脚本。",
  },
  {
    key: "python",
    label: "Python 服务",
    purpose: "本地 AI 推理与媒体处理代理",
    installNote: "Python 服务端尚未打包；接入后会自动检测进程端口。",
  },
  {
    key: "cosyvoice",
    label: "CosyVoice",
    purpose: "声音克隆与语音合成",
    installNote: "CosyVoice 服务需自行部署；启动后填写服务地址即可检测。",
  },
  {
    key: "heygem",
    label: "HeyGem",
    purpose: "数字人形象与口型生成",
    installNote: "HeyGem 本地服务需独立安装；当前仅做地址格式校验。",
  },
  {
    key: "playwright",
    label: "Playwright 浏览器",
    purpose: "平台发布与网页自动化",
    installNote: "运行 `playwright install` 安装浏览器，或等待后续向导。",
  },
];

const FILTER_OPTIONS: { value: "all" | "ok" | "needs-config" | "not-ready"; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "ok", label: "已就绪" },
  { value: "needs-config", label: "需配置" },
  { value: "not-ready", label: "未就绪" },
];

const { sidecarConfig, verifiedFfmpegPath } = useAppSettings();

const filter = ref<"all" | "ok" | "needs-config" | "not-ready">("all");
const expandedKey = ref<DependencyKey | null>("heygem");
const actionMessages = ref<Record<string, string>>({});

const defaultSidecar = createDefaultSidecarConfig();

const dependencyResults = computed<DependencyCheckResult[]>(() => {
  const trimmedFfmpegPath = sidecarConfig.ffmpegPath.trim();
  const results = checkSidecarDependencies({
    ffmpegPath: sidecarConfig.ffmpegPath,
    hasPlaywrightBrowser: sidecarConfig.hasPlaywrightBrowser,
    pythonServiceUrl: sidecarConfig.pythonServiceUrl,
    heygemServiceUrl: sidecarConfig.heygemServiceUrl,
    cosyVoiceServiceUrl: sidecarConfig.cosyVoiceServiceUrl,
  });

  return results.map((result) => {
    if (result.key !== "ffmpeg") {
      return result;
    }

    if (verifiedFfmpegPath.value && verifiedFfmpegPath.value === trimmedFfmpegPath) {
      return {
        key: "ffmpeg",
        ok: true,
        state: "ready",
        message: "FFmpeg 路径已验证为可执行",
      };
    }

    return result;
  });
});

const resultByKey = computed(() =>
  Object.fromEntries(dependencyResults.value.map((result) => [result.key, result])) as Record<
    DependencyKey,
    DependencyCheckResult
  >,
);

function configFieldFor(key: DependencyKey): "ffmpegPath" | "pythonServiceUrl" | "cosyVoiceServiceUrl" | "heygemServiceUrl" | "hasPlaywrightBrowser" {
  switch (key) {
    case "ffmpeg":
      return "ffmpegPath";
    case "python":
      return "pythonServiceUrl";
    case "cosyvoice":
      return "cosyVoiceServiceUrl";
    case "heygem":
      return "heygemServiceUrl";
    case "playwright":
      return "hasPlaywrightBrowser";
  }
}

function currentValue(key: DependencyKey): string | boolean {
  return sidecarConfig[configFieldFor(key)];
}

function setValue(key: DependencyKey, value: string | boolean) {
  (sidecarConfig as Record<string, unknown>)[configFieldFor(key)] = value;
}

function dependencyStatusLabel(key: DependencyKey): string {
  const state = resultByKey.value[key]?.state ?? "missing";
  if (state === "ready") return "已就绪";
  if (state === "missing") return "需配置";
  return "未就绪";
}

function dependencyOk(key: DependencyKey): boolean {
  const state = resultByKey.value[key]?.state ?? "missing";
  return state === "ready";
}

async function runLimitedAction(key: DependencyKey, name: string) {
  if (key === "ffmpeg") {
    const trimmed = sidecarConfig.ffmpegPath.trim();
    if (!trimmed) {
      verifiedFfmpegPath.value = "";
      actionMessages.value[key] = "请先配置 FFmpeg 可执行文件路径";
      return;
    }

    const ok = await probeFfmpegPath(trimmed);
    if (ok) {
      verifiedFfmpegPath.value = trimmed;
      actionMessages.value[key] = "FFmpeg 路径已验证为可执行";
    } else {
      verifiedFfmpegPath.value = "";
      actionMessages.value[key] = "FFmpeg 路径无法执行，请检查路径是否正确";
    }
    return;
  }

  const dep = DEPENDENCIES.find((d) => d.key === key);
  const result = resultByKey.value[key];
  actionMessages.value[key] = `${name}：${result?.message ?? ""} ${dep?.installNote ?? "该服务尚未接入，无法执行真实操作。"}`;
}

const filteredDependencies = computed(() => {
  if (filter.value === "all") return DEPENDENCIES;
  return DEPENDENCIES.filter((d) => {
    const state = resultByKey.value[d.key]?.state ?? "missing";
    if (filter.value === "ok") return state === "ready";
    if (filter.value === "needs-config") return state === "missing";
    return state === "configured" || state === "unavailable";
  });
});
</script>

<template>
  <div class="settings-section local-dependencies-settings">
    <div class="section-hero">
      <h2>本地依赖</h2>
      <p>配置 FFmpeg、Python 本地服务、HeyGem、CosyVoice 和 Playwright 浏览器。检测状态会随输入实时更新；安装与启动按钮因服务尚未接入而被禁用。</p>
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
    </div>

    <div class="dependency-cards">
      <div
        v-for="dep in filteredDependencies"
        :key="dep.key"
        class="dependency-card"
        :class="{ expanded: expandedKey === dep.key }"
      >
        <button type="button" class="dependency-card-header" @click="expandedKey = expandedKey === dep.key ? null : dep.key">
          <div class="dependency-title">
            <Wrench :size="16" />
            <strong>{{ dep.label }}</strong>
            <span class="dependency-purpose">{{ dep.purpose }}</span>
          </div>
          <span class="dependency-status-pill" :class="{ ok: dependencyOk(dep.key) }">
            <CheckCircle2 v-if="dependencyOk(dep.key)" :size="15" />
            <AlertCircle v-else :size="15" />
            {{ dependencyStatusLabel(dep.key) }}
          </span>
        </button>

        <div v-if="expandedKey === dep.key" class="dependency-card-body">
          <label v-if="dep.key === 'playwright'" class="toggle-row"
          >
            <input
              :checked="Boolean(currentValue(dep.key))"
              type="checkbox"
              @change="setValue(dep.key, ($event.target as HTMLInputElement).checked)"
            />
            <span>已安装 Playwright 浏览器</span>
          </label>
          <label v-else class="field"
          >
            <span class="field-label">{{ dep.key === 'ffmpeg' ? '可执行文件路径' : '服务地址' }}</span>
            <input
              :value="currentValue(dep.key)"
              :placeholder="defaultSidecar[configFieldFor(dep.key)]?.toString() || ''"
              @input="setValue(dep.key, ($event.target as HTMLInputElement).value)"
            />
          </label>

          <div class="dependency-actions"
          >
            <button
              type="button"
              class="secondary"
              disabled
              :title="dep.installNote"
            >
              <Download :size="14" />
              安装
            </button>
            <button
              type="button"
              class="secondary"
              disabled
              :title="dep.installNote"
            >
              <Play :size="14" />
              启动
            </button>
            <button
              type="button"
              class="ghost-button"
              @click="runLimitedAction(dep.key, '重新检测')"
            >
              <RefreshCw :size="14" />
              重新检测
            </button>
          </div>
          <p v-if="actionMessages[dep.key]" class="dependency-note">{{ actionMessages[dep.key] }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.local-dependencies-settings {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 860px;
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

.dependency-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dependency-card {
  border: 1px solid var(--mx-border-subtle);
  border-radius: var(--mx-radius-lg);
  background: var(--mx-bg-panel);
  overflow: hidden;
}

.dependency-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.dependency-card-header:hover {
  background: var(--mx-bg-hover);
}

.dependency-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.dependency-title strong {
  font-size: 13px;
  color: var(--mx-text-primary);
  white-space: nowrap;
}

.dependency-purpose {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dependency-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  min-width: 70px;
  justify-content: center;
  padding: 4px 8px;
  border-radius: var(--mx-radius-pill);
  color: var(--mx-warning);
  background: var(--mx-warning-bg);
  font-size: 11px;
  font-weight: 700;
}

.dependency-status-pill.ok {
  color: var(--mx-success);
  background: var(--mx-success-bg);
}

.dependency-card-body {
  padding: 14px;
  border-top: 1px solid var(--mx-border-subtle);
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.dependency-actions {
  display: flex;
  gap: 8px;
}

.dependency-actions button {
  min-height: 30px;
}

.dependency-note {
  margin: 0;
  padding: 10px 12px;
  border-radius: var(--mx-radius-md);
  font-size: 12px;
  line-height: 1.5;
  color: var(--mx-text-secondary);
  background: var(--mx-bg-elevated);
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--mx-text-primary);
  cursor: pointer;
}
</style>
