<script setup lang="ts">
import { Plus, Upload } from "lucide-vue-next";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  updateStageStatus,
  type ProjectDraft,
  type PublishPlatform,
  type WorkflowStageId,
  type WorkflowStageRuntimeMode,
} from "@mirax/core";
import { createMockMediaRenderer, MediaRendererError } from "@mirax/media-pipeline";
import { AiProviderError, createMockAiProvider } from "@mirax/provider-ai";
import { createProjectVoiceCloneRepository, createVoiceSampleRepository, createVoiceSampleStorageRootRepository, replaceActiveProjectVoiceClone } from "@mirax/local-store";
import { SUPPORTED_PLATFORM_PROFILES, createMockPublisher, type PublishAccount } from "@mirax/provider-publish";
import {
  createNavigationState,
  navigateTo,
  openSettingsSection,
  returnToWorkbench,
  type AppView,
  type SettingsSection,
} from "./app/navigation.js";
import AppShell from "./components/app/AppShell.vue";
import AppDialog from "./components/ui/AppDialog.vue";
import WorkbenchView from "./components/workbench/WorkbenchView.vue";
import WorkbenchPreviewPlaceholder from "./components/workbench/WorkbenchPreviewPlaceholder.vue";
import AvatarGenerationStage from "./components/workbench/stages/AvatarGenerationStage.vue";
import ContentReviewStage from "./components/workbench/stages/ContentReviewStage.vue";
import MaterialParsingPreview from "./components/workbench/stages/MaterialParsingPreview.vue";
import MaterialParsingStage from "./components/workbench/stages/MaterialParsingStage.vue";
import PublishStage from "./components/workbench/stages/PublishStage.vue";
import ScriptRewritingStage from "./components/workbench/stages/ScriptRewritingStage.vue";
import SpeechSynthesisStage from "./components/workbench/stages/SpeechSynthesisStage.vue";
import VideoCompositionStage from "./components/workbench/stages/VideoCompositionStage.vue";
import VoiceCloningStage from "./components/workbench/stages/VoiceCloningStage.vue";
import WorkbenchStagePlaceholder from "./components/workbench/stages/WorkbenchStagePlaceholder.vue";
import { usePublishPreparation } from "./composables/usePublishPreparation.js";
import {
  findActiveRewriteProviderConfig,
  findEnabledAvatarProviderConfig,
  findEnabledSpeechProviderConfig,
  findEnabledTranscribeProviderConfig,
  getLocalStoreDb,
  getProviderReadiness,
  useAppSettings,
} from "./composables/useAppSettings.js";
import { useWorkbenchDraft } from "./composables/useWorkbenchDraft.js";
import { useWorkflowRuntime } from "./composables/useWorkflowRuntime.js";
import { buildAvatarOutputPath, selectAvatarProvider } from "./composables/useAvatarProvider.js";
import { selectComposeRenderer } from "./composables/useComposeRenderer.js";
import { selectAudioExtractor } from "./composables/useAudioExtractor.js";
import { selectRewriteProvider } from "./composables/useRewriteProvider.js";
import {
  buildSpeechOutputPath,
  createTauriAudioDurationProber,
  createTauriAudioFileWriter,
  selectSpeechProvider,
} from "./composables/useSpeechProvider.js";
import { selectTranscribeProvider } from "./composables/useTranscribeProvider.js";
import { selectVoiceCloneProvider } from "./composables/useVoiceCloneProvider.js";
import { createTauriBaiLianFetchBinary, createTauriBaiLianFetchJson } from "./runtime/tauriBaiLianHttp.js";
import { runVoiceClone } from "./features/voice-clone/voiceCloneLifecycle.js";
import { resolveSpeechVoice } from "./features/voice-clone/resolveSpeechVoice.js";
import { importManagedVoiceSample, readManagedVoiceSample } from "./features/voice-clone/tauriVoiceSamples.js";
import { useVoiceSampleStorage } from "./features/voice-clone/useVoiceSampleStorage.js";
import type { AssetListItem } from "./features/assets/assetModels.js";
import { mockAccounts } from "./features/accounts/mockAccounts.js";
import AccountManagementView from "./views/AccountManagementView.vue";
import SettingsView from "./views/SettingsView.vue";
import TaskCenterView from "./views/TaskCenterView.vue";
import VoiceLibraryView from "./views/VoiceLibraryView.vue";
import AvatarLibraryView from "./views/AvatarLibraryView.vue";
import MaterialLibraryView from "./views/MaterialLibraryView.vue";
import { appendPublishTasks } from "./features/task-center/publishTaskStore.js";
import {
  appendPublishHistoryItem,
  createPublishHistoryItem,
} from "./features/task-center/taskHistory.js";

const aiProvider = createMockAiProvider({ artifactRoot: "/Users/Shared/MiraxAI" });
const mediaRenderer = createMockMediaRenderer({ artifactRoot: "/Users/Shared/MiraxAI" });
const publisher = createMockPublisher();

const { draft, persist, saveStatus, ready: draftReady } = useWorkbenchDraft();
const { appSettings, providerConfigs, sidecarConfig, verifiedFfmpegPath, isProviderVerified } = useAppSettings();

const generatedVideoPath = ref("");
const generatedCoverPath = ref("");
const generatedAudioPath = ref("");
const generatedAudioDuration = ref(0);
const generatedAvatarPath = ref("");
const generatedAvatarDuration = ref(0);

function getAudioFormat(path: string): "mp3" | "wav" {
  return path.toLowerCase().endsWith(".wav") ? "wav" : "mp3";
}

function toRelativeAudioPath(root: string, absolutePath: string): string {
  const normalizedRoot = root.replace(/[/\\]+$/, "");
  const normalizedPath = absolutePath.replace(/[/\\]+$/, "");
  const sep = normalizedPath.startsWith(normalizedRoot + "/") || normalizedPath.startsWith(normalizedRoot + "\\");
  if (!sep) return "";
  return normalizedPath.slice(normalizedRoot.length).replace(/^[/\\]/, "");
}

function joinAudioRoot(root: string, relativePath: string): string {
  const normalizedRoot = root.replace(/[/\\]+$/, "");
  const normalizedRelative = relativePath.replace(/^[/\\]+/, "");
  return `${normalizedRoot}/${normalizedRelative}`;
}

function recordSpeechArtifact(absolutePath: string, durationSeconds: number) {
  const relativePath = toRelativeAudioPath(appSettings.outputPaths.audioOutput, absolutePath);
  if (!relativePath) return;
  draft.speechArtifact = {
    relativePath,
    durationSeconds,
    format: getAudioFormat(absolutePath),
  };
}

async function restoreSpeechArtifact() {
  const artifact = draft.speechArtifact;
  if (!artifact) return;

  const absolutePath = joinAudioRoot(appSettings.outputPaths.audioOutput, artifact.relativePath);
  try {
    const ok = await tauriInvoke<boolean>("check_audio_file", {
      path: absolutePath,
      allowedRoot: appSettings.outputPaths.audioOutput,
    });
    if (!ok) {
      throw new Error("语音合成产物文件不存在，请重新合成。");
    }
    generatedAudioPath.value = absolutePath;
    generatedAudioDuration.value = artifact.durationSeconds;
    if (runtime.stageStatus.value.speech !== "completed") {
      runtime.workflow.value = updateStageStatus(runtime.workflow.value, "speech", "completed");
    }
    speechErrorMessage.value = "";
  } catch (error) {
    draft.speechArtifact = undefined;
    generatedAudioPath.value = "";
    generatedAudioDuration.value = 0;
    runtime.workflow.value = updateStageStatus(runtime.workflow.value, "speech", "pending");
    speechErrorMessage.value = error instanceof Error ? error.message : "语音合成产物恢复失败";
  }
}

// WB-08 内容复核的封面候选使用本地 Stitch 示例媒体，避免依赖外部热链。
const stitchCoverCandidates = [
  new URL("./assets/stitch/avatars/qinghe-studio-v2.jpg", import.meta.url).href,
  new URL("./assets/stitch/avatars/xialan-greenscreen.jpg", import.meta.url).href,
  new URL("./assets/stitch/avatars/chenyu-office.jpg", import.meta.url).href,
];

// 形象选择为 session-only 状态，不进入持久化 draft。
const selectedAvatarId = ref("presenter-a");
// 原始文案默认来自 mock/real 转写；用户可在文案改写阶段手动编辑，编辑结果写入持久化 draft。
const transcriptText = computed({
  get: () => draft.transcriptText ?? "",
  set: (value: string) => {
    draft.transcriptText = value;
  },
});
// 声音选择：voiceId 与 voiceName 必须来自真实的 voice-clone executor 结果或样本文件名。
const selectedVoiceId = ref("");
const selectedVoiceName = ref("");
// 原始样本路径仅在当前 App session 中短暂保留，绝不写入 ProjectDraft。
const pendingVoiceSamplePath = ref("");
const pendingVoiceSampleName = ref("");
const pendingVoiceName = ref("");
// 仅供当前百炼 CosyVoice 克隆请求使用；不得写入 draft、SQLite 或浏览器存储。
const pendingVoiceExternalSampleUrl = ref("");
const voiceCloneConsentAccepted = ref(false);
const managedSampleAvailable = ref(false);
const projectCloneBound = ref(false);
const remoteVoiceDeletable = ref(false);
const remoteVoiceDeleteBlockedMessage = ref("");
const selectedVoiceCloneProviderConfigId = ref("");
const voiceCloneProviderOptions = computed(() => providerConfigs.value
  .filter((config) => config.enabled && (config.provider === "elevenlabs-tts" || config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice"))
  .map((config) => ({ id: config.id, label: config.label.trim() || config.provider })));
const selectedVoiceCloneProvider = computed(() => providerConfigs.value.find(
  (config) => config.id === selectedVoiceCloneProviderConfigId.value && (config.provider === "elevenlabs-tts" || config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice"),
));
const voiceCloneRequiresExternalSampleUrl = computed(() => selectedVoiceCloneProvider.value?.provider === "bailian-cosyvoice");

watch(selectedVoiceCloneProviderConfigId, () => {
  pendingVoiceExternalSampleUrl.value = "";
  voiceCloneConsentAccepted.value = false;
});
const systemTheme = ref<"light" | "dark">("dark");
const navigation = reactive(createNavigationState());
const publishAccounts = ref<PublishAccount[]>([]);
const selectedPublishAccountId = ref("");
const showPublishDialog = ref(false);
const assetLimitedAction = ref<{ view: "voices" | "avatars" | "materials"; action: "import" | "create" } | null>(null);
const transcribeErrorMessage = ref("");
const rewriteErrorMessage = ref("");
const rewriteRunMessage = ref("");
const voiceCloneErrorMessage = ref("");
const voiceCloneDiagnosticLogs = ref<Array<{ id: number; timestamp: string; message: string }>>([]);
let voiceCloneDiagnosticSequence = 0;
const speechErrorMessage = ref("");
const avatarErrorMessage = ref("");
const composeErrorMessage = ref("");

function appendVoiceCloneDiagnostic(message: string) {
  const trimmed = message.trim();
  if (!trimmed) return;
  voiceCloneDiagnosticLogs.value = [
    {
      id: voiceCloneDiagnosticSequence += 1,
      timestamp: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
      message: trimmed,
    },
    ...voiceCloneDiagnosticLogs.value,
  ].slice(0, 10);
}

function clearVoiceCloneDiagnosticLogs() {
  voiceCloneDiagnosticLogs.value = [];
}

function readSafeVoiceCloneError(error: unknown): string {
  const value = error instanceof Error
    ? error.message
    : typeof error === "string"
      ? error
      : error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : "";
  const message = value.trim();
  if (!message) return "声音克隆失败，未返回可读错误。请查看本次会话诊断日志后重试。";
  const lower = message.toLowerCase();
  if (message.length > 320 || ["data:", "://", "/", "\\", "?", "&", "bearer", "sk-", "signature"].some((marker) => lower.includes(marker))) {
    return "声音克隆失败，诊断包含敏感内容，已隐藏。请查看本次会话诊断日志后重试。";
  }
  return message;
}

const voiceSampleRootReady = computed(() => Boolean(appSettings.activeVoiceSampleStorageRootId));

const platformLabels = computed<Record<PublishPlatform, string>>(() =>
  Object.fromEntries(SUPPORTED_PLATFORM_PROFILES.map((profile) => [profile.id, profile.label])) as Record<
    PublishPlatform,
    string
  >,
);

const selectedPublishAccount = computed(() =>
  publishAccounts.value.find((a) => a.id === selectedPublishAccountId.value),
);

const allAccounts = computed(() => mockAccounts);
const topbarAssetView = computed(() =>
  navigation.view === "voices" || navigation.view === "avatars" || navigation.view === "materials"
    ? navigation.view
    : null,
);
const theme = computed<"light" | "dark">(() =>
  appSettings.theme === "system" ? systemTheme.value : appSettings.theme,
);
let systemThemeQuery: MediaQueryList | undefined;

function syncSystemTheme() {
  systemTheme.value = systemThemeQuery?.matches ? "dark" : "light";
  // 当应用跟随系统主题时，显式通知 Tauri 原生窗口当前外观，确保 WKWebView 的
  // prefers-color-scheme 与 macOS 系统外观保持同步（尤其在 release .app 中）。
  if (appSettings.theme === "system") {
    void syncNativeWindowTheme(systemTheme.value);
  }
}

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

// 让 macOS/Tauri 原生标题栏跟随应用内 resolved theme；浏览器 dev:web 等非 Tauri 环境直接跳过。
async function syncNativeWindowTheme(next: "light" | "dark") {
  if (!isTauriAvailable()) return;
  try {
    await getCurrentWindow().setTheme(next);
  } catch (error) {
    // setTheme 失败不致命：原生标题栏浅色化的主修复来自 Overlay 标题栏 + CSS 主题背景覆盖，
    // 此调用仅作辅助（同步系统外观提示）。dev 下打印诊断，避免吞掉有用信息。
    if (import.meta.env.DEV) {
      console.warn("[mirax] 原生窗口 setTheme 调用失败（非致命）", error);
    }
  }
}

// immediate 确保应用启动时立即同步一次，避免浅色主题下原生标题栏仍为黑色。
watch(theme, (next) => void syncNativeWindowTheme(next), { immediate: true });

const publishModeText = computed(() => (prep.metadata.value.mode === "direct" ? "直接发布" : "存为草稿"));

const publishSummary = computed(() => {
  const metadata = prep.metadata.value;
  const platforms = project.value.targetPlatforms;
  return {
    title: metadata.title || "未填写",
    description: metadata.description.slice(0, 80) || "未填写",
    descriptionLong: metadata.description.length > 80,
    coverText: metadata.coverPath ? "已生成" : "未设置",
    platformText: platforms.map((platform) => platformLabels.value[platform]).join("、") || "未选择",
    accountText: selectedPublishAccount.value?.displayName || "未选择账号",
    modeText: publishModeText.value,
    videoFile: generatedVideoPath.value ? fileName(generatedVideoPath.value) : "视频尚未生成",
  };
});
const assetLimitedActionTitle = computed(() => {
  const value = assetLimitedAction.value;
  if (!value) return "能力暂未接入";
  if (value.action === "create") return value.view === "voices" ? "新建声音暂未接入" : "新建形象暂未接入";
  if (value.view === "voices") return "导入声音暂未接入";
  if (value.view === "avatars") return "导入形象暂未接入";
  return "导入素材暂未接入";
});

// 这些阶段在 preview 全宽栏内自带左右分栏，frame 的窄 controls 栏由 styles.css 隐藏。
const fullWidthStages: WorkflowStageId[] = ["rewrite", "voice-clone", "speech", "avatar", "compose", "review", "publish"];

function handleNavigate(view: AppView) {
  const assetViews: AppView[] = ["voices", "avatars", "materials"];
  if (assetViews.includes(view) && navigation.view === "workbench") {
    navigateTo(navigation, view, runtime.activeStage.value?.id);
  } else if (view === "workbench") {
    returnToWorkbench(navigation);
  } else {
    navigateTo(navigation, view);
  }
}

function openAssetLimitedAction(action: "import" | "create") {
  if (!topbarAssetView.value) return;
  assetLimitedAction.value = { view: topbarAssetView.value, action };
}

const project = computed({
  get: (): ProjectDraft => draft.project,
  set: (value: ProjectDraft) => {
    Object.assign(draft.project, value);
  },
});

const prep = usePublishPreparation({
  projectId: "demo-project",
  projectName: project.value.name,
  targetPlatforms: () => project.value.targetPlatforms,
  publisher,
});

function hasExecutableRewriteProvider(): boolean {
  const config = findActiveRewriteProviderConfig(
    providerConfigs.value,
    appSettings.rewriteProviderConfigId,
  );
  return Boolean(config);
}

function hasExecutableTranscribeProvider(): boolean {
  const config = findEnabledTranscribeProviderConfig(providerConfigs.value);
  if (!config || getProviderReadiness(config) !== "ready") {
    return false;
  }
  if (config.provider === "local-whisper") {
    return true;
  }
  return isProviderVerified(config.id);
}

function hasExecutableSpeechProvider(): boolean {
  const config = findEnabledSpeechProviderConfig(providerConfigs.value);
  if (!config || getProviderReadiness(config) !== "ready") {
    return false;
  }
  // 这些云端 TTS 没有稳定、无计费副作用的健康检查；凭据与业务空间配置完整即可执行。
  if (config.provider === "elevenlabs-tts") {
    return true;
  }
  if (config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice") {
    return true;
  }
  return isProviderVerified(config.id);
}

function hasExecutableVoiceCloneProvider(): boolean {
  return providerConfigs.value.some((config) => config.enabled
    && (config.provider === "elevenlabs-tts" || config.provider === "bailian-qwen-tts" || config.provider === "bailian-cosyvoice")
    && Boolean(config.apiKey.trim())
    && Boolean(config.model?.trim())
    && (config.provider === "elevenlabs-tts" || Boolean(config.baseUrl?.trim())));
}

function hasExecutableAvatarProvider(): boolean {
  const config = findEnabledAvatarProviderConfig(providerConfigs.value);
  return Boolean(config && getProviderReadiness(config) === "ready" && isProviderVerified(config.id));
}

function hasEnabledTranscribeProvider(): boolean {
  return providerConfigs.value.some((c) => c.enabled && (c.provider === "whisper" || c.provider === "local-whisper"));
}

function hasEnabledSpeechProvider(): boolean {
  return providerConfigs.value.some((c) => c.enabled && (c.provider === "cosyvoice" || c.provider === "elevenlabs-tts" || c.provider === "bailian-qwen-tts" || c.provider === "bailian-cosyvoice"));
}

function hasEnabledVoiceCloneProvider(): boolean {
  return providerConfigs.value.some((c) => c.enabled && (c.provider === "elevenlabs-tts" || c.provider === "bailian-qwen-tts" || c.provider === "bailian-cosyvoice"));
}

function hasEnabledAvatarProvider(): boolean {
  return providerConfigs.value.some((c) => c.enabled && c.provider === "heygem");
}

const providerStageModes = computed<Record<WorkflowStageId, WorkflowStageRuntimeMode>>(() => {
  const trimmedFfmpegPath = sidecarConfig.ffmpegPath.trim();
  const composeMode: WorkflowStageRuntimeMode =
    verifiedFfmpegPath.value && verifiedFfmpegPath.value === trimmedFfmpegPath
      ? "real"
      : trimmedFfmpegPath
        ? "not-connected"
        : "mock";
  const hasEnabledRewrite = providerConfigs.value.some(
    (c) => c.enabled && (c.provider === "openai" || c.provider === "custom"),
  );
  const rewriteMode: WorkflowStageRuntimeMode = hasExecutableRewriteProvider()
    ? "real"
    : hasEnabledRewrite || appSettings.rewriteProviderConfigId
      ? "not-connected"
      : "mock";

  return {
    transcribe: hasExecutableTranscribeProvider()
      ? "real"
      : hasEnabledTranscribeProvider()
        ? "not-connected"
        : "mock",
    rewrite: rewriteMode,
    "voice-clone": hasExecutableVoiceCloneProvider()
      ? "real"
      : hasEnabledVoiceCloneProvider()
        ? "not-connected"
        : "mock",
    speech: hasExecutableSpeechProvider()
      ? "real"
      : hasEnabledSpeechProvider()
        ? "not-connected"
        : "mock",
    avatar: hasExecutableAvatarProvider()
      ? "real"
      : hasEnabledAvatarProvider()
        ? "not-connected"
        : "mock",
    compose: composeMode,
    review: "mock",
    publish: "mock",
  };
});

const runtime = useWorkflowRuntime({
  projectId: "demo-project",
  executor: executeStage,
  stageModes: providerStageModes.value,
});

// 恢复草稿中保存的 workflow 状态与当前阶段，使刷新后仍停留在原阶段。
function syncRuntimeFromDraft() {
  runtime.workflow.value = draft.workflow;
  runtime.activeStageId.value = draft.activeStageId ?? "transcribe";
}

async function restoreActiveProjectVoiceClone() {
  const db = getLocalStoreDb();
  if (!db) return;

  try {
    const clone = await createProjectVoiceCloneRepository(db).findActiveByProjectId(project.value.id);
    if (!clone?.remoteVoiceId) return;

    const sample = await createVoiceSampleRepository(db).getById(clone.sampleId);
    const restoredVoiceName = sample?.originalFileName || "项目克隆声音";
    selectedVoiceId.value = clone.remoteVoiceId;
    selectedVoiceName.value = restoredVoiceName;
    pendingVoiceName.value = restoredVoiceName;
    pendingVoiceSampleName.value = sample?.originalFileName ?? "";
    selectedVoiceCloneProviderConfigId.value = clone.providerConfigId;
    managedSampleAvailable.value = sample?.state === "managed";
    projectCloneBound.value = true;
    remoteVoiceDeletable.value = clone.provider === "elevenlabs-tts";
    remoteVoiceDeleteBlockedMessage.value = "";
    voiceCloneErrorMessage.value = "";
    if (runtime.stageStatus.value["voice-clone"] !== "completed") {
      runtime.workflow.value = updateStageStatus(runtime.workflow.value, "voice-clone", "completed");
    }
  } catch {
    voiceCloneErrorMessage.value = "项目声音状态恢复失败，请重新进入声音克隆页面。";
  }
}

syncRuntimeFromDraft();
void draftReady.then(() => {
  syncRuntimeFromDraft();
  return Promise.all([restoreSpeechArtifact(), restoreActiveProjectVoiceClone()]);
});
watch(
  () => runtime.activeStageId.value,
  (stageId) => {
    draft.activeStageId = stageId;
  },
);
watch(
  () => runtime.workflow.value,
  (workflow) => {
    draft.workflow = workflow;
  },
  { deep: true },
);

watch(providerStageModes, (modes) => {
  runtime.stageModes.value = modes;
});

const transcribeMode = computed(() => runtime.getStageMode("transcribe"));
const rewriteMode = computed(() => runtime.getStageMode("rewrite"));
const voiceCloneMode = computed(() => runtime.getStageMode("voice-clone"));
const speechMode = computed(() => runtime.getStageMode("speech"));
const avatarMode = computed(() => runtime.getStageMode("avatar"));
const composeMode = computed(() => runtime.getStageMode("compose"));

const rewriteProviderHint = computed(() => {
  const activeId = appSettings.rewriteProviderConfigId;
  if (!activeId) {
    const hasEnabledRewrite = providerConfigs.value.some(
      (c) => c.enabled && (c.provider === "openai" || c.provider === "custom"),
    );
    return hasEnabledRewrite
      ? "未选择文案改写 Provider，请前往设置 → AI 服务选择。"
      : "真实 LLM 未连接。请在设置中配置并启用 OpenAI-compatible provider 后再试。";
  }
  const config = providerConfigs.value.find((c) => c.id === activeId);
  if (!config || !config.enabled) {
    return "选中的文案改写 Provider 已停用或被删除，请重新选择。";
  }
  if (getProviderReadiness(config) !== "ready") {
    return "选中的文案改写 Provider 配置不完整，请检查 API Key、模型与 Base URL。";
  }
  if (!isProviderVerified(config.id)) {
    return "选中的文案改写 Provider 尚未通过连接测试，请先测试连接。";
  }
  return "";
});

onMounted(async () => {
  // Tauri 原生窗口标记：启用 CSS 标题栏安全内边距（Overlay 标题栏下移品牌/顶栏内容）。
  // 浏览器 dev:web 不加此 class，--mx-titlebar-inset 保持 0，布局与原来一致。
  if (isTauriAvailable()) {
    document.documentElement.classList.add("is-tauri");
  }

  // dev 模式下支持通过 URL hash #theme=light|dark 预设主题，便于真实 Tauri 验收时
  // 在不依赖 UI 点击的情况下切换 light/dark/light 三态。生产构建不会携带 devUrl hash。
  if (import.meta.env.DEV) {
    const hashTheme = window.location.hash.match(/theme=(light|dark)/)?.[1] as "light" | "dark" | undefined;
    if (hashTheme) {
      appSettings.theme = hashTheme;
      history.replaceState(null, "", window.location.href.split("#")[0]);
    }
  }

  systemThemeQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
  syncSystemTheme();
  systemThemeQuery?.addEventListener("change", syncSystemTheme);

  publishAccounts.value = await publisher.listAccounts();
  if (!selectedPublishAccountId.value && publishAccounts.value.length > 0) {
    selectedPublishAccountId.value = publishAccounts.value[0].id;
  }

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__miraxQA = {
      runtime,
      navigation,
      theme,
      draft,
      prep,
      generatedVideoPath,
      generatedCoverPath,
      generatedAudioPath,
      generatedAvatarPath,
      transcriptText,
      selectedVoiceId,
      selectedVoiceName,
      selectedAvatarId,
      selectedPublishAccountId,
      setStage: (stageId: WorkflowStageId) => runtime.goToStage(stageId),
      setTheme: (value: "light" | "dark") => {
        appSettings.theme = value;
      },
      setView: (view: AppView) => {
        navigateTo(navigation, view);
      },
      setSettingsSection: (section: SettingsSection) => {
        openSettingsSection(navigation, section);
      },
      setDraftProject: (patch: Partial<ProjectDraft>) => {
        Object.assign(draft.project, patch);
      },
      setGeneratedPaths: (paths: {
        video?: string;
        cover?: string;
        audio?: string;
        avatar?: string;
      }) => {
        if (paths.video !== undefined) generatedVideoPath.value = paths.video;
        if (paths.cover !== undefined) generatedCoverPath.value = paths.cover;
        if (paths.audio !== undefined) generatedAudioPath.value = paths.audio;
        if (paths.avatar !== undefined) generatedAvatarPath.value = paths.avatar;
      },
    };
  }
});

onUnmounted(() => systemThemeQuery?.removeEventListener("change", syncSystemTheme));

const platformProfiles = computed(() => SUPPORTED_PLATFORM_PROFILES);

async function executeStage(stageId: WorkflowStageId, title: string): Promise<string> {
  switch (stageId) {
    case "transcribe": {
      const transcribeMode = runtime.getStageMode("transcribe");
      transcribeErrorMessage.value = "";
      if (transcribeMode === "real") {
        transcriptText.value = "";
      }
      const sourceVideoPath = project.value.sourceVideoPath ?? "";
      if (!sourceVideoPath.trim()) {
        const error = new AiProviderError("not-configured", "请先选择或粘贴源素材。");
        transcribeErrorMessage.value = error.message;
        throw error;
      }

      let audioPath = "";
      if (transcribeMode === "real") {
        // 真实转写前通过 Tauri extract_audio command 抽取音频。
        const audioSelection = selectAudioExtractor({
          stageMode: "real",
          ffmpegPath: sidecarConfig.ffmpegPath,
          verifiedFfmpegPath: verifiedFfmpegPath.value,
          artifactRoot: appSettings.outputPaths.audioOutput,
          invoke: tauriInvoke,
        });
        if (!audioSelection.ok) {
          transcribeErrorMessage.value = audioSelection.error.message;
          throw audioSelection.error;
        }
        const extractResult = await audioSelection.extractor.extract({
          sourceVideoPath,
          projectId: runtime.workflow.value.projectId,
        });
        audioPath = extractResult.audioPath;
      }

      const selection = selectTranscribeProvider({
        stageMode: transcribeMode,
        providerConfigs: providerConfigs.value,
        mockProvider: aiProvider,
      });
      if (!selection.ok) {
        transcribeErrorMessage.value = selection.error.message;
        throw selection.error;
      }
      if (transcribeMode === "mock") {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      try {
        const result = await selection.provider.transcribe({
          ...(transcribeMode === "real" ? { audioPath } : { sourceVideoPath }),
          language: "zh-CN",
        });
        transcriptText.value = result.text;
        return `已提取 ${result.segments.length} 段文案`;
      } catch (error) {
        if (error instanceof Error) {
          transcribeErrorMessage.value = error.message;
        }
        throw error;
      }
    }
    case "rewrite": {
      if (!transcriptText.value.trim()) {
        throw new Error("请先完成素材解析，获取原始文案");
      }
      rewriteErrorMessage.value = "";
      const rewriteMode = runtime.getStageMode("rewrite");
      const activeRewriteConfig = findActiveRewriteProviderConfig(
        providerConfigs.value,
        appSettings.rewriteProviderConfigId,
      );

      if (rewriteMode === "mock") {
        rewriteRunMessage.value = "正在使用 Mock 生成文案...";
      } else if (activeRewriteConfig) {
        const providerLabel = activeRewriteConfig.label.trim() || (activeRewriteConfig.provider === "custom" ? "Custom LLM" : "OpenAI");
        const modelLabel = activeRewriteConfig.model?.trim();
        rewriteRunMessage.value = modelLabel
          ? `正在调用 ${providerLabel} / ${modelLabel} 生成文案...`
          : `正在调用 ${providerLabel} 生成文案...`;
      } else {
        rewriteRunMessage.value = "正在准备真实 LLM 调用...";
      }

      // 安全边界：apiKey / baseUrl 仅在 selectRewriteProvider 内部作为内存构造参数使用；
      // 返回的 message、prep.updateMetadata 的 title/description 均来自 LLM 结果，不含凭证。
      const selection = selectRewriteProvider({
        stageMode: rewriteMode,
        providerConfigs: providerConfigs.value,
        mockProvider: aiProvider,
        rewriteProviderConfigId: appSettings.rewriteProviderConfigId,
      });
      if (!selection.ok) {
        rewriteErrorMessage.value = selection.error.message;
        rewriteRunMessage.value = `生成失败：${selection.error.message}`;
        throw selection.error;
      }
      try {
        const result = await selection.provider.rewriteScript({
          transcript: transcriptText.value,
          productName: project.value.name,
          sellingPoints: deriveRewriteSellingPoints(project.value),
          activeGoal: draft.activeGoal,
          activePreset: draft.activePreset,
          targetLength: draft.targetLength,
        });
        project.value = { ...project.value, notes: result.script };
        prep.updateMetadata({
          title: result.titleSuggestions[0] ?? project.value.name,
          description: result.script.slice(0, 100),
        });
        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        const adoptHint = "请检查并点击「采用此文案」进入下一步。";
        if (rewriteMode === "mock") {
          rewriteRunMessage.value = `文案已重新生成：Mock · ${timeLabel}。${adoptHint}`;
        } else {
          const providerLabel = activeRewriteConfig?.label.trim() || (activeRewriteConfig?.provider === "custom" ? "Custom LLM" : "OpenAI");
          const modelLabel = activeRewriteConfig?.model?.trim();
          rewriteRunMessage.value = modelLabel
            ? `文案已重新生成：${providerLabel} / ${modelLabel} · ${timeLabel}。${adoptHint}`
            : `文案已重新生成：${providerLabel} · ${timeLabel}。${adoptHint}`;
        }
        return `生成 ${result.titleSuggestions.length} 个标题方向`;
      } catch (error) {
        if (error instanceof Error) {
          rewriteErrorMessage.value = error.message;
          rewriteRunMessage.value = `文案生成失败：${error.message}`;
        } else {
          rewriteRunMessage.value = "文案生成失败：未知错误";
        }
        throw error;
      }
    }
    case "voice-clone": {
      const voiceCloneMode = runtime.getStageMode("voice-clone");
      voiceCloneErrorMessage.value = "";
      const samplePath = pendingVoiceSamplePath.value;
      if (!samplePath.trim()) {
        const error = new AiProviderError("not-configured", "请先选择声音样本文件。");
        voiceCloneErrorMessage.value = error.message;
        throw error;
      }
      const selection = selectVoiceCloneProvider({
        stageMode: voiceCloneMode,
        providerConfigs: providerConfigs.value,
        selectedProviderConfigId: selectedVoiceCloneProviderConfigId.value,
        mockProvider: aiProvider,
        readAudioFile: async (path) => readManagedVoiceSample({ path, allowedRoot: (await useVoiceSampleStorage({ db: getLocalStoreDb() }).requireActiveWritableRoot()).path }),
        baiLianFetchJson: createTauriBaiLianFetchJson(),
      });
      if (!selection.ok) {
        voiceCloneErrorMessage.value = selection.error.message;
        throw selection.error;
      }
      try {
        if (voiceCloneMode === "mock") {
          const result = await selection.provider.cloneVoice({ voiceSamplePath: samplePath, projectId: project.value.id });
          selectedVoiceId.value = result.voiceId;
          selectedVoiceName.value = fileName(samplePath);
          return `声音配置 ${result.voiceId} 已就绪`;
        }
        const db = getLocalStoreDb();
        if (!db || !selectedVoiceCloneProvider.value) throw new AiProviderError("not-configured", "本地 SQLite 或声音克隆 Provider 配置不可用。");
        const storage = useVoiceSampleStorage({ db });
        const cloneRepository = createProjectVoiceCloneRepository(db);
        const recoverableClone = await cloneRepository.findLatestRecoverable(project.value.id, selectedVoiceCloneProvider.value.id);
        const clone = recoverableClone
          ? await replaceActiveProjectVoiceClone(db, project.value.id, recoverableClone.id).then(() => ({ ...recoverableClone, state: "active" as const }))
          : await runVoiceClone({
            projectId: project.value.id,
            providerConfigId: selectedVoiceCloneProvider.value.id,
            sourcePath: samplePath,
            voiceName: pendingVoiceName.value,
            externalSampleUrl: voiceCloneRequiresExternalSampleUrl.value ? pendingVoiceExternalSampleUrl.value : undefined,
            consent: {
              accepted: true,
              policyVersion: selectedVoiceCloneProvider.value.provider === "bailian-cosyvoice" ? "bailian-cosyvoice-manual-oss-v1" : selectedVoiceCloneProvider.value.provider === "bailian-qwen-tts" ? "bailian-qwen-tts-v1" : "elevenlabs-ivc-v1",
              acceptedAt: new Date().toISOString(),
            },
          }, {
            requireDb: async () => db, requireActiveWritableRoot: storage.requireActiveWritableRoot,
            providerConfig: selectedVoiceCloneProvider.value, provider: selection.provider,
            validateSource: async (path) => /\.(wav|mp3|m4a|flac|aac)$/i.test(path), createId: () => crypto.randomUUID(), now: () => new Date().toISOString(),
            saveSample: createVoiceSampleRepository(db).save, saveClone: cloneRepository.save,
            importManagedVoiceSample, readManagedVoiceSample,
            replaceActiveProjectVoiceClone: (localDb, projectId, cloneId) => replaceActiveProjectVoiceClone(localDb as typeof db, projectId, cloneId),
          });
        selectedVoiceId.value = clone.remoteVoiceId ?? "";
        selectedVoiceName.value = pendingVoiceName.value;
        managedSampleAvailable.value = true;
        projectCloneBound.value = clone.state === "active";
        remoteVoiceDeletable.value = clone.state === "active" && selectedVoiceCloneProvider.value.provider === "elevenlabs-tts";
        remoteVoiceDeleteBlockedMessage.value = "";
        pendingVoiceExternalSampleUrl.value = "";
        return clone.state === "pending-verification" ? "声音等待服务端验证" : "声音克隆已就绪";
      } catch (error) {
        pendingVoiceExternalSampleUrl.value = "";
        const message = readSafeVoiceCloneError(error);
        voiceCloneErrorMessage.value = message;
        appendVoiceCloneDiagnostic(message);
        throw error;
      }
    }
    case "speech": {
      const speechMode = runtime.getStageMode("speech");
      speechErrorMessage.value = "";
      if (speechMode === "real") {
        generatedAudioPath.value = "";
        generatedAudioDuration.value = 0;
      }

      const script = speechMode === "real" ? (project.value.notes ?? "").trim() : project.value.notes ?? project.value.name;
      if (!script.trim()) {
        const error = new AiProviderError("not-configured", "请先完成文案改写，获取语音合成文案。");
        speechErrorMessage.value = error.message;
        throw error;
      }

      let speechConfig = findEnabledSpeechProviderConfig(providerConfigs.value);
      let voiceId = selectedVoiceId.value || `mock-voice-${runtime.workflow.value.projectId}`;
      if (speechMode === "real") {
        const db = getLocalStoreDb();
        const activeClone = db ? await createProjectVoiceCloneRepository(db).findActiveByProjectId(project.value.id) : undefined;
        const shouldResolveProjectVoice = Boolean(activeClone) || speechConfig?.provider === "elevenlabs-tts" || speechConfig?.provider === "bailian-qwen-tts" || speechConfig?.provider === "bailian-cosyvoice";
        if (shouldResolveProjectVoice) {
          if (!db) throw new AiProviderError("voice-unavailable", "本地 SQLite 不可用，无法解析项目声音。");
          const resolved = await resolveSpeechVoice({
            projectId: project.value.id,
            providerConfigs: providerConfigs.value,
            defaultProviderConfigId: speechConfig?.id,
            findActiveClone: createProjectVoiceCloneRepository(db).findActiveByProjectId,
          });
          speechConfig = resolved.providerConfig;
          voiceId = resolved.voiceId;
        } else {
          voiceId = selectedVoiceId.value.trim();
        }
      }
      const speechProvider = speechConfig?.provider;
      const usesDownloadedAudio = speechProvider === "elevenlabs-tts" || speechProvider === "bailian-qwen-tts" || speechProvider === "bailian-cosyvoice";
      const writer = usesDownloadedAudio ? createTauriAudioFileWriter(tauriInvoke, appSettings.outputPaths.audioOutput) : undefined;
      const prober = usesDownloadedAudio ? createTauriAudioDurationProber(tauriInvoke, appSettings.outputPaths.audioOutput, sidecarConfig.ffmpegPath) : undefined;
      const selection = selectSpeechProvider({
        stageMode: speechMode,
        providerConfigs: providerConfigs.value,
        selectedProviderConfigId: speechMode === "real" ? speechConfig?.id : undefined,
        mockProvider: aiProvider,
        writeFile: writer,
        readDuration: prober,
        baiLianFetchJson: createTauriBaiLianFetchJson(),
        baiLianFetchBinary: createTauriBaiLianFetchBinary(),
      });
      if (!selection.ok) {
        speechErrorMessage.value = selection.error.message;
        throw selection.error;
      }
      if (!voiceId.trim()) {
        const error = new AiProviderError("voice-unavailable", "请先选择可用于 TTS 的声音。");
        speechErrorMessage.value = error.message;
        throw error;
      }

      try {
        const result = await selection.provider.synthesizeSpeech({
          voiceId,
          script,
          projectId: runtime.workflow.value.projectId,
          outputPath:
            speechMode === "real"
              ? buildSpeechOutputPath(appSettings.outputPaths.audioOutput, runtime.workflow.value.projectId, speechProvider)
              : undefined,
        });
        generatedAudioPath.value = result.audioPath;
        generatedAudioDuration.value = result.durationSeconds;
        if (speechMode === "real") {
          recordSpeechArtifact(result.audioPath, result.durationSeconds);
          await persist();
        } else {
          draft.speechArtifact = undefined;
        }
        return `音频已生成：${result.audioPath}`;
      } catch (error) {
        if (error instanceof Error) {
          speechErrorMessage.value = error.message;
        }
        throw error;
      }
    }
    case "avatar": {
      const avatarMode = runtime.getStageMode("avatar");
      avatarErrorMessage.value = "";
      if (avatarMode === "real") {
        generatedAvatarPath.value = "";
        generatedAvatarDuration.value = 0;
      }
      if (!generatedAudioPath.value.trim()) {
        const error = new AiProviderError("not-configured", "请先完成语音合成，获取驱动音频。");
        avatarErrorMessage.value = error.message;
        throw error;
      }
      if (avatarMode === "real" && selectedAvatarId.value === "presenter-a") {
        const error = new AiProviderError("not-configured", "请选择 HeyGem provider 可识别的真实形象。");
        avatarErrorMessage.value = error.message;
        throw error;
      }
      const selection = selectAvatarProvider({
        stageMode: avatarMode,
        providerConfigs: providerConfigs.value,
        mockProvider: aiProvider,
      });
      if (!selection.ok) {
        avatarErrorMessage.value = selection.error.message;
        throw selection.error;
      }
      try {
        const result = await selection.provider.generateAvatarVideo({
          audioPath: generatedAudioPath.value,
          avatarId: selectedAvatarId.value || "presenter-a",
          projectId: runtime.workflow.value.projectId,
          outputPath:
            avatarMode === "real"
              ? buildAvatarOutputPath(appSettings.outputPaths.videoOutput, runtime.workflow.value.projectId)
              : undefined,
        });
        generatedAvatarPath.value = result.videoPath;
        generatedAvatarDuration.value = result.durationSeconds;
        return `数字人片段已生成：${result.videoPath}`;
      } catch (error) {
        if (error instanceof Error) {
          avatarErrorMessage.value = error.message;
        }
        throw error;
      }
    }
    case "compose": {
      const composeMode = runtime.getStageMode("compose");
      composeErrorMessage.value = "";
      if (composeMode === "real") {
        generatedVideoPath.value = "";
        generatedCoverPath.value = "";
      }
      if (!generatedAvatarPath.value.trim()) {
        const error = new MediaRendererError("missing-prerequisite", "请先完成形象生成，获取数字人视频。", "compose");
        composeErrorMessage.value = error.message;
        throw error;
      }
      if (!generatedAudioPath.value.trim()) {
        const error = new MediaRendererError("missing-prerequisite", "请先完成语音合成，获取音频。", "compose");
        composeErrorMessage.value = error.message;
        throw error;
      }
      const selection = selectComposeRenderer({
        stageMode: composeMode,
        ffmpegPath: sidecarConfig.ffmpegPath,
        mockRenderer: mediaRenderer,
        artifactRoot: appSettings.outputPaths.videoOutput,
      });
      if (!selection.ok) {
        composeErrorMessage.value = selection.error.message;
        throw selection.error;
      }
      try {
        const result = await selection.renderer.render({
          projectId: runtime.workflow.value.projectId,
          avatarVideoPath: generatedAvatarPath.value,
          audioPath: generatedAudioPath.value,
          subtitleText: project.value.notes ?? project.value.name,
          coverText: project.value.name,
        });
        generatedVideoPath.value = result.videoPath;
        generatedCoverPath.value = result.coverPath;
        return `成片已生成：${result.videoPath}`;
      } catch (error) {
        if (error instanceof Error) {
          composeErrorMessage.value = error.message;
        }
        throw error;
      }
    }
    case "review": {
      const videoPath = generatedVideoPath.value;
      if (!videoPath) {
        throw new Error("视频尚未生成，无法复核");
      }
      if (!prep.canPublish.value) {
        const reasons = prep.errors.value.join("、") || "发布条件不满足";
        throw new Error(reasons);
      }
      return "内容复核完成";
    }
    case "publish": {
      const videoPath = generatedVideoPath.value;
      if (!videoPath) {
        throw new Error("视频尚未生成，无法发布");
      }

      if (!prep.canPublish.value) {
        const reasons = prep.errors.value.join("、") || "发布条件不满足";
        throw new Error(reasons);
      }

      const tasks = await prep.publish(videoPath);
      if (tasks.length === 0) {
        throw new Error("发布校验失败，未创建任务");
      }

      await appendPublishTasks(tasks);
      await appendPublishHistoryItem(
        createPublishHistoryItem({
          projectId: runtime.workflow.value.projectId,
          taskIds: tasks.map((task) => task.id),
          taskStatuses: tasks.map((task) => task.status),
          videoPath,
          platforms: project.value.targetPlatforms,
        }),
      );

      return `已创建 ${tasks.length} 个发布任务`;
    }
  }
}

async function handlePublish() {
  openPublishDialog();
}

function openPublishDialog() {
  if (runtime.running.value || !prep.canPublish.value || !generatedVideoPath.value) return;
  showPublishDialog.value = true;
}

function closePublishDialog() {
  showPublishDialog.value = false;
}

function cancelPublish() {
  closePublishDialog();
}

async function confirmPublish() {
  closePublishDialog();
  await runtime.runStage("publish");
}

function handleOpenVideo() {
  const path = generatedVideoPath.value;
  if (path) {
    console.log("Open video:", path);
  }
}

function handleVoiceSelect(item: AssetListItem) {
  selectedVoiceId.value = item.id;
  selectedVoiceName.value = item.name;
  if (item.samplePath) {
    pendingVoiceSamplePath.value = item.samplePath;
    pendingVoiceSampleName.value = fileName(item.samplePath);
    voiceCloneConsentAccepted.value = false;
  }
  if (navigation.returnToStage) {
    returnToWorkbench(navigation);
  }
}

async function deleteManagedVoiceSampleForProject() {
  const db = getLocalStoreDb();
  if (!db) return;
  const clone = await createProjectVoiceCloneRepository(db).findActiveByProjectId(project.value.id);
  if (!clone) return;
  const sample = await createVoiceSampleRepository(db).getById(clone.sampleId);
  if (!sample) return;
  const root = await createVoiceSampleStorageRootRepository(db).getById(sample.storageRootId);
  if (!root) return;
  await tauriInvoke("delete_managed_voice_sample", { path: `${root.path}/${sample.relativePath}`, allowedRoot: root.path });
  await createVoiceSampleRepository(db).save({ ...sample, state: "local-deleted" });
  managedSampleAvailable.value = false;
}

async function removeProjectVoiceBinding() {
  const db = getLocalStoreDb();
  if (!db) return;
  const repo = createProjectVoiceCloneRepository(db);
  const clone = await repo.findActiveByProjectId(project.value.id);
  if (!clone) return;
  await repo.save({ ...clone, state: "removed" });
  projectCloneBound.value = false;
}

async function deleteRemoteVoiceForProject() {
  const db = getLocalStoreDb();
  if (!db) return;
  const repo = createProjectVoiceCloneRepository(db);
  const clone = await repo.findActiveByProjectId(project.value.id);
  if (!clone?.remoteVoiceId) return;
  const references = (await repo.list()).filter((item) => item.providerConfigId === clone.providerConfigId && item.remoteVoiceId === clone.remoteVoiceId && item.state !== "removed");
  if (references.length > 1) {
    remoteVoiceDeletable.value = false;
    remoteVoiceDeleteBlockedMessage.value = "该远端声音仍被其它本地项目引用，无法删除。";
    return;
  }
  const config = providerConfigs.value.find((item) => item.id === clone.providerConfigId);
  if (!config) return;
  const selection = selectVoiceCloneProvider({
    stageMode: "real", providerConfigs: providerConfigs.value, selectedProviderConfigId: config.id, mockProvider: aiProvider,
    readAudioFile: async (path) => readManagedVoiceSample({ path, allowedRoot: (await useVoiceSampleStorage({ db }).requireActiveWritableRoot()).path }),
  });
  if (!selection.ok || !("deleteRemoteVoice" in selection.provider)) return;
  await (selection.provider as { deleteRemoteVoice(voiceId: string): Promise<void> }).deleteRemoteVoice(clone.remoteVoiceId);
  await repo.save({ ...clone, state: "removed" });
  projectCloneBound.value = false;
}

async function choosePendingVoiceSample() {
  try {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const selected = await dialog.open({
      multiple: false,
      directory: false,
      filters: [{ name: "音频文件", extensions: ["wav", "mp3", "m4a", "flac", "aac"] }],
    });
    if (typeof selected !== "string") return;
    pendingVoiceSamplePath.value = selected;
    pendingVoiceSampleName.value = fileName(selected);
    pendingVoiceExternalSampleUrl.value = "";
    voiceCloneConsentAccepted.value = false;
  } catch {
    voiceCloneErrorMessage.value = "无法选择声音样本。";
  }
}

function handleAvatarSelect(item: AssetListItem) {
  selectedAvatarId.value = item.id;
  if (navigation.returnToStage) {
    returnToWorkbench(navigation);
  }
}

function handleMaterialSelect(item: AssetListItem) {
  // 素材选择当前不直接写入 draft，仅在工作台跳转来源存在时返回。
  void item;
  if (navigation.returnToStage) {
    returnToWorkbench(navigation);
  }
}

function handleReturnToStage(stageId: WorkflowStageId) {
  navigateTo(navigation, "workbench");
  runtime.goToStage(stageId);
}

function runRewriteStage() {
  rewriteErrorMessage.value = "";
  rewriteRunMessage.value = "已提交改写请求，正在准备调用 LLM...";
  void runtime.runStage("rewrite", { autoAdvance: false });
}

function handleAdoptScript() {
  rewriteRunMessage.value = "已采用当前改写文案，进入下一步。";
  runtime.goToNextStage();
}

function handleNextStage() {
  const currentStageId = runtime.activeStageId.value;
  if (
    currentStageId === "rewrite" &&
    runtime.stageStatus.value.rewrite === "completed" &&
    (project.value.notes ?? "").trim().length > 0
  ) {
    handleAdoptScript();
  } else {
    runtime.goToNextStage();
  }
}

function fileName(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) return "";
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

function deriveRewriteSellingPoints(draft: ProjectDraft): string[] {
  // 优先从 draft 已有文本提取候选卖点；UI 尚未传入明确卖点时，退化为安全默认。
  const combined = [draft.name, draft.notes].filter(Boolean).join(" ");
  const tokens = combined
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (tokens.length > 0) {
    return tokens.slice(0, 3);
  }
  return ["通勤", "大容量", "质感"];
}

async function handleSaveDraft() {
  await persist();
}

function handleViewTasks() {
  navigateTo(navigation, "tasks");
}

function toggleTheme() {
  appSettings.theme = theme.value === "dark" ? "light" : "dark";
}

function stagePreviewLabel(stageId: WorkflowStageId): string {
  const labels: Record<WorkflowStageId, string> = {
    transcribe: "素材解析预览",
    rewrite: "改写结果预览",
    "voice-clone": "声音样本预览",
    speech: "音频预览",
    avatar: "数字人预览",
    compose: "成片预览",
    review: "内容复核预览",
    publish: "发布预览",
  };
  return labels[stageId];
}
</script>

<template>
  <AppShell
    :project-name="project.name"
    :theme="theme"
    :active-view="navigation.view"
    :save-status="saveStatus"
    @toggle-theme="toggleTheme"
    @navigate="handleNavigate"
  >
    <template #topbar-actions>
      <template v-if="topbarAssetView">
        <button
          type="button"
          class="secondary"
          @click="openAssetLimitedAction('import')"
        >
          <Upload :size="16" />
          <span v-if="topbarAssetView === 'voices'">导入声音</span>
          <span v-else-if="topbarAssetView === 'avatars'">导入形象</span>
          <span v-else>导入素材</span>
        </button>
        <button
          v-if="topbarAssetView !== 'materials'"
          type="button"
          class="primary"
          @click="openAssetLimitedAction('create')"
        >
          <Plus :size="16" />
          <span v-if="topbarAssetView === 'voices'">新建声音</span>
          <span v-else>新建形象</span>
        </button>
      </template>
    </template>

    <WorkbenchView
      v-if="navigation.view === 'workbench'"
      :stages="runtime.workflow.value.stages"
      :active-stage-id="runtime.activeStageId.value"
      :running="runtime.running.value"
      @select-stage="runtime.goToStage"
      @previous="runtime.goToPreviousStage"
      @next="handleNextStage"
      @save="handleSaveDraft"
    >
      <template #stage-controls="{ stage }">
        <MaterialParsingStage
          v-if="stage.id === 'transcribe'"
          v-model="project"
          :running="runtime.running.value"
          :status="stage.status"
          :mode="transcribeMode"
          :error-message="transcribeErrorMessage"
          @run="runtime.runStage('transcribe')"
          @view-tasks="handleViewTasks"
        />
        <WorkbenchStagePlaceholder
          v-else-if="!fullWidthStages.includes(stage.id)"
          :stage="stage"
        />
      </template>
      <template #stage-preview="{ stage }">
        <MaterialParsingPreview
          v-if="stage.id === 'transcribe'"
          :running="runtime.running.value"
          :status="stage.status"
        />
        <ScriptRewritingStage
          v-else-if="stage.id === 'rewrite'"
          v-model="project"
          v-model:active-goal="draft.activeGoal"
          v-model:active-preset="draft.activePreset"
          v-model:target-length="draft.targetLength"
          :transcript-text="transcriptText"
          :running="runtime.running.value"
          :status="stage.status"
          :mode="rewriteMode"
          :error-message="rewriteErrorMessage || rewriteProviderHint"
          :status-message="rewriteRunMessage"
          @update:transcript-text="transcriptText = $event"
          @run="runRewriteStage"
          @adopt="handleAdoptScript"
        />
        <VoiceCloningStage
          v-else-if="stage.id === 'voice-clone'"
          :script-text="project.notes ?? ''"
          :voice-id="selectedVoiceId"
          :voice-name="pendingVoiceName"
          :pending-sample-path="pendingVoiceSamplePath"
          :pending-sample-name="pendingVoiceSampleName"
          :selected-provider-config-id="selectedVoiceCloneProviderConfigId"
          :selected-provider-label="selectedVoiceCloneProvider?.label ?? ''"
          :provider-options="voiceCloneProviderOptions"
          :external-sample-url="pendingVoiceExternalSampleUrl"
          :requires-external-sample-url="voiceCloneRequiresExternalSampleUrl"
          :consent-accepted="voiceCloneConsentAccepted"
          :root-ready="voiceSampleRootReady"
          lifecycle-state=""
          :managed-sample-available="managedSampleAvailable"
          :project-clone-bound="projectCloneBound"
          :remote-voice-deletable="remoteVoiceDeletable"
          :remote-voice-delete-blocked-message="remoteVoiceDeleteBlockedMessage"
          :running="runtime.running.value"
          :status="stage.status"
          :mode="voiceCloneMode"
          :error-message="voiceCloneErrorMessage"
          :diagnostic-logs="voiceCloneDiagnosticLogs"
          @update:voice-name="pendingVoiceName = $event"
          @update:consent-accepted="voiceCloneConsentAccepted = $event"
          @update:selected-provider-config-id="selectedVoiceCloneProviderConfigId = $event"
          @update:external-sample-url="pendingVoiceExternalSampleUrl = $event"
          @choose-sample="choosePendingVoiceSample"
          @delete-managed-sample="deleteManagedVoiceSampleForProject"
          @remove-project-binding="removeProjectVoiceBinding"
          @delete-remote-voice="deleteRemoteVoiceForProject"
          @clear-diagnostic-logs="clearVoiceCloneDiagnosticLogs"
          @run="runtime.runStage('voice-clone', { autoAdvance: false })"
          @create-voice="handleNavigate('voices')"
        />
        <SpeechSynthesisStage
          v-else-if="stage.id === 'speech'"
          :model-value="project"
          :voice-name="selectedVoiceName"
          :running="runtime.running.value"
          :status="stage.status"
          :audio-path="generatedAudioPath"
          :audio-duration="generatedAudioDuration"
          :audio-output-root="appSettings.outputPaths.audioOutput"
          :mode="speechMode"
          :error-message="speechErrorMessage"
          @run="runtime.runStage('speech', { autoAdvance: false })"
          @edit-script="runtime.goToStage('rewrite')"
          @change-voice="runtime.goToStage('voice-clone')"
        />
        <AvatarGenerationStage
          v-else-if="stage.id === 'avatar'"
          :model-value="project"
          :audio-path="generatedAudioPath"
          :audio-duration="generatedAudioDuration"
          :voice-name="selectedVoiceName"
          :running="runtime.running.value"
          :status="stage.status"
          :selected-avatar-id="selectedAvatarId"
          :avatar-path="generatedAvatarPath"
          :avatar-duration="generatedAvatarDuration"
          :mode="avatarMode"
          :error-message="avatarErrorMessage"
          @run="runtime.runStage('avatar')"
          @update:selected-avatar-id="selectedAvatarId = $event"
          @create-avatar="handleNavigate('avatars')"
          @change-audio="runtime.goToStage('speech')"
        />
        <VideoCompositionStage
          v-else-if="stage.id === 'compose'"
          :model-value="project"
          :avatar-path="generatedAvatarPath"
          :audio-path="generatedAudioPath"
          :audio-duration="generatedAudioDuration"
          :avatar-name="selectedAvatarId"
          :running="runtime.running.value"
          :status="stage.status"
          :video-path="generatedVideoPath"
          :cover-path="generatedCoverPath"
          :mode="composeMode"
          :error-message="composeErrorMessage"
          @run="runtime.runStage('compose')"
          @edit-script="runtime.goToStage('rewrite')"
          @edit-avatar="runtime.goToStage('avatar')"
        />
        <ContentReviewStage
          v-else-if="stage.id === 'review'"
          :metadata="prep.metadata.value"
          :video-path="generatedVideoPath"
          :cover-path="generatedCoverPath"
          :cover-candidates="stitchCoverCandidates"
          :target-platforms="project.targetPlatforms"
          :platform-profiles="platformProfiles"
          :running="runtime.running.value"
          :status="stage.status"
          @update:metadata="prep.updateMetadata"
          @confirm="runtime.runStage('review')"
          @open-video="handleOpenVideo"
          @return-to-compose="runtime.goToStage('compose')"
        />
        <PublishStage
          v-else-if="stage.id === 'publish'"
          :metadata="prep.metadata.value"
          :target-platforms="project.targetPlatforms"
          :accounts="publishAccounts"
          :selected-account-id="selectedPublishAccountId"
          :platform-profiles="platformProfiles"
          :can-publish="prep.canPublish.value"
          :running="runtime.running.value"
          :status="stage.status"
          :video-path="generatedVideoPath"
          @update:selected-account-id="selectedPublishAccountId = $event"
          @update:metadata="prep.updateMetadata"
          @create-tasks="openPublishDialog"
        />
        <WorkbenchPreviewPlaceholder v-else :label="stagePreviewLabel(stage.id)" />
      </template>
    </WorkbenchView>

    <SettingsView v-else-if="navigation.view === 'settings'" />
    <TaskCenterView
      v-else-if="navigation.view === 'tasks'"
      @return-to-stage="handleReturnToStage"
    />
    <AccountManagementView
      v-else-if="navigation.view === 'accounts'"
      :accounts="allAccounts"
      :platform-profiles="platformProfiles"
    />
    <VoiceLibraryView
      v-else-if="navigation.view === 'voices'"
      @select="handleVoiceSelect"
    />
    <AvatarLibraryView
      v-else-if="navigation.view === 'avatars'"
      @select="handleAvatarSelect"
    />
    <MaterialLibraryView
      v-else-if="navigation.view === 'materials'"
      @select="handleMaterialSelect"
    />
    <div v-else class="placeholder-view">
      <h1>{{ navigation.view }}</h1>
      <p>该页面正在实现中，将在后续 Task 中完成。</p>
    </div>

    <AppDialog
      :open="assetLimitedAction !== null"
      :title="assetLimitedActionTitle"
      @close="assetLimitedAction = null"
    >
      <p class="limited-action-copy">
        真实导入/创建能力暂未接入；当前不会创建资源，也不会写入资产库。后续接入上传、录音或生成能力后，会从这里继续。
      </p>
      <template #actions>
        <button type="button" class="primary" @click="assetLimitedAction = null">知道了</button>
      </template>
    </AppDialog>

    <AppDialog
      :open="showPublishDialog"
      title="确认创建发布任务"
      data-testid="publish-dialog"
      @close="cancelPublish"
    >
      <div class="publish-dialog-summary">
        <div class="publish-dialog-row">
          <span class="publish-dialog-label">标题</span>
          <span class="publish-dialog-value">{{ publishSummary.title }}</span>
        </div>
        <div class="publish-dialog-row">
          <span class="publish-dialog-label">描述</span>
          <span class="publish-dialog-value">
            {{ publishSummary.description }}{{ publishSummary.descriptionLong ? '…' : '' }}
          </span>
        </div>
        <div class="publish-dialog-row">
          <span class="publish-dialog-label">封面</span>
          <span class="publish-dialog-value">{{ publishSummary.coverText }}</span>
        </div>
        <div class="publish-dialog-row">
          <span class="publish-dialog-label">平台</span>
          <span class="publish-dialog-value">{{ publishSummary.platformText }}</span>
        </div>
        <div class="publish-dialog-row">
          <span class="publish-dialog-label">账号</span>
          <span class="publish-dialog-value">{{ publishSummary.accountText }}</span>
        </div>
        <div class="publish-dialog-row">
          <span class="publish-dialog-label">发布模式</span>
          <span class="publish-dialog-value">{{ publishSummary.modeText }}</span>
        </div>
        <div class="publish-dialog-row">
          <span class="publish-dialog-label">视频文件</span>
          <span class="publish-dialog-value">{{ publishSummary.videoFile }}</span>
        </div>
      </div>
      <template #actions>
        <button
          type="button"
          class="secondary"
          data-testid="publish-dialog-cancel"
          @click="cancelPublish"
        >
          取消
        </button>
        <button
          type="button"
          class="primary"
          data-testid="publish-dialog-confirm"
          :disabled="runtime.running.value || !prep.canPublish.value || !generatedVideoPath"
          @click="confirmPublish"
        >
          确认创建任务
        </button>
      </template>
    </AppDialog>
  </AppShell>
</template>

<style scoped>
.placeholder-view {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  padding: 24px;
  color: var(--mx-text-secondary);
  text-align: center;
}

.placeholder-view h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  text-transform: capitalize;
  color: var(--mx-text-primary);
}

.placeholder-view p {
  margin: 0;
  font-size: 13px;
}

.publish-dialog-summary {
  display: grid;
  gap: 12px;
  padding: 8px 0;
}

.publish-dialog-row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 12px;
  align-items: baseline;
  font-size: 13px;
  line-height: 1.5;
}

.publish-dialog-label {
  color: var(--mx-text-secondary);
}

.publish-dialog-value {
  color: var(--mx-text-primary);
  word-break: break-word;
}

.limited-action-copy {
  margin: 0;
  color: var(--mx-text-secondary);
  font-size: 13px;
  line-height: 1.6;
}
</style>
