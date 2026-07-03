<script setup lang="ts">
import { Plus, Upload } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import {
  type ProjectDraft,
  type PublishPlatform,
  type WorkflowStageId,
  type WorkflowStageRuntimeMode,
} from "@mirax/core";
import { createMockMediaRenderer, MediaRendererError } from "@mirax/media-pipeline";
import { AiProviderError, createMockAiProvider } from "@mirax/provider-ai";
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
  findEnabledAvatarProviderConfig,
  findEnabledRewriteProviderConfig,
  findEnabledSpeechProviderConfig,
  findEnabledTranscribeProviderConfig,
  findEnabledVoiceCloneProviderConfig,
  getProviderReadiness,
  useAppSettings,
} from "./composables/useAppSettings.js";
import { useWorkbenchDraft } from "./composables/useWorkbenchDraft.js";
import { useWorkflowRuntime } from "./composables/useWorkflowRuntime.js";
import { buildAvatarOutputPath, selectAvatarProvider } from "./composables/useAvatarProvider.js";
import { selectComposeRenderer } from "./composables/useComposeRenderer.js";
import { selectRewriteProvider } from "./composables/useRewriteProvider.js";
import { buildSpeechOutputPath, selectSpeechProvider } from "./composables/useSpeechProvider.js";
import { selectTranscribeProvider } from "./composables/useTranscribeProvider.js";
import { selectVoiceCloneProvider } from "./composables/useVoiceCloneProvider.js";
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

const { draft, persist, ready: draftReady } = useWorkbenchDraft();
const { appSettings, providerConfigs, sidecarConfig, verifiedFfmpegPath, isProviderVerified } = useAppSettings();

const generatedVideoPath = ref("");
const generatedCoverPath = ref("");
const generatedAudioPath = ref("");
const generatedAudioDuration = ref(0);
const generatedAvatarPath = ref("");
const generatedAvatarDuration = ref(0);

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
const systemTheme = ref<"light" | "dark">("dark");
const navigation = reactive(createNavigationState());
const publishAccounts = ref<PublishAccount[]>([]);
const selectedPublishAccountId = ref("");
const showPublishDialog = ref(false);
const assetLimitedAction = ref<{ view: "voices" | "avatars" | "materials"; action: "import" | "create" } | null>(null);
const transcribeErrorMessage = ref("");
const rewriteErrorMessage = ref("");
const voiceCloneErrorMessage = ref("");
const speechErrorMessage = ref("");
const avatarErrorMessage = ref("");
const composeErrorMessage = ref("");

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
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
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
  const config = findEnabledRewriteProviderConfig(providerConfigs.value);
  return Boolean(config && getProviderReadiness(config) === "ready" && isProviderVerified(config.id));
}

function hasExecutableTranscribeProvider(): boolean {
  const config = findEnabledTranscribeProviderConfig(providerConfigs.value);
  return Boolean(config && getProviderReadiness(config) === "ready" && isProviderVerified(config.id));
}

function hasExecutableSpeechProvider(): boolean {
  const config = findEnabledSpeechProviderConfig(providerConfigs.value);
  return Boolean(config && getProviderReadiness(config) === "ready" && isProviderVerified(config.id));
}

function hasExecutableVoiceCloneProvider(): boolean {
  const config = findEnabledVoiceCloneProviderConfig(providerConfigs.value);
  return Boolean(config && getProviderReadiness(config) === "ready" && isProviderVerified(config.id));
}

function hasExecutableAvatarProvider(): boolean {
  const config = findEnabledAvatarProviderConfig(providerConfigs.value);
  return Boolean(config && getProviderReadiness(config) === "ready" && isProviderVerified(config.id));
}

const providerStageModes = computed<Record<WorkflowStageId, WorkflowStageRuntimeMode>>(() => {
  const trimmedFfmpegPath = sidecarConfig.ffmpegPath.trim();
  const composeMode: WorkflowStageRuntimeMode =
    verifiedFfmpegPath.value && verifiedFfmpegPath.value === trimmedFfmpegPath
      ? "real"
      : trimmedFfmpegPath
        ? "not-connected"
        : "mock";

  return {
    transcribe: hasExecutableTranscribeProvider() ? "real" : "mock",
    rewrite: hasExecutableRewriteProvider() ? "real" : "mock",
    "voice-clone": hasExecutableVoiceCloneProvider() ? "real" : "mock",
    speech: hasExecutableSpeechProvider() ? "real" : "mock",
    avatar: hasExecutableAvatarProvider() ? "real" : "mock",
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

syncRuntimeFromDraft();
void draftReady.then(syncRuntimeFromDraft);
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
          sourceVideoPath,
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
      // 安全边界：apiKey / baseUrl 仅在 selectRewriteProvider 内部作为内存构造参数使用；
      // 返回的 message、prep.updateMetadata 的 title/description 均来自 LLM 结果，不含凭证。
      const selection = selectRewriteProvider({
        stageMode: runtime.getStageMode("rewrite"),
        providerConfigs: providerConfigs.value,
        mockProvider: aiProvider,
      });
      if (!selection.ok) {
        rewriteErrorMessage.value = selection.error.message;
        throw selection.error;
      }
      try {
        const result = await selection.provider.rewriteScript({
          transcript: transcriptText.value,
          productName: project.value.name,
          sellingPoints: deriveRewriteSellingPoints(project.value),
        });
        project.value = { ...project.value, notes: result.script };
        prep.updateMetadata({
          title: result.titleSuggestions[0] ?? project.value.name,
          description: result.script.slice(0, 100),
        });
        return `生成 ${result.titleSuggestions.length} 个标题方向`;
      } catch (error) {
        if (error instanceof Error) {
          rewriteErrorMessage.value = error.message;
        }
        throw error;
      }
    }
    case "voice-clone": {
      const voiceCloneMode = runtime.getStageMode("voice-clone");
      voiceCloneErrorMessage.value = "";
      if (voiceCloneMode === "real") {
        selectedVoiceId.value = "";
        selectedVoiceName.value = "";
      }
      const samplePath = project.value.voiceSamplePath ?? "";
      if (!samplePath.trim()) {
        const error = new AiProviderError("not-configured", "请先选择声音样本文件。");
        voiceCloneErrorMessage.value = error.message;
        throw error;
      }
      const selection = selectVoiceCloneProvider({
        stageMode: voiceCloneMode,
        providerConfigs: providerConfigs.value,
        mockProvider: aiProvider,
      });
      if (!selection.ok) {
        voiceCloneErrorMessage.value = selection.error.message;
        throw selection.error;
      }
      try {
        const result = await selection.provider.cloneVoice({
          voiceSamplePath: samplePath,
          projectId: runtime.workflow.value.projectId,
        });
        selectedVoiceId.value = result.voiceId;
        selectedVoiceName.value = fileName(result.samplePath || samplePath);
        return `声音配置 ${result.voiceId} 已就绪`;
      } catch (error) {
        if (error instanceof Error) {
          voiceCloneErrorMessage.value = error.message;
        }
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
      const selection = selectSpeechProvider({
        stageMode: speechMode,
        providerConfigs: providerConfigs.value,
        mockProvider: aiProvider,
      });
      if (!selection.ok) {
        speechErrorMessage.value = selection.error.message;
        throw selection.error;
      }

      const script = speechMode === "real" ? (project.value.notes ?? "").trim() : project.value.notes ?? project.value.name;
      if (!script.trim()) {
        const error = new AiProviderError("not-configured", "请先完成文案改写，获取语音合成文案。");
        speechErrorMessage.value = error.message;
        throw error;
      }

      const voiceId = speechMode === "real" ? selectedVoiceId.value.trim() : selectedVoiceId.value || `mock-voice-${runtime.workflow.value.projectId}`;
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
              ? buildSpeechOutputPath(appSettings.outputPaths.audioOutput, runtime.workflow.value.projectId)
              : undefined,
        });
        generatedAudioPath.value = result.audioPath;
        generatedAudioDuration.value = result.durationSeconds;
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
    project.value = { ...project.value, voiceSamplePath: item.samplePath };
  }
  if (navigation.returnToStage) {
    returnToWorkbench(navigation);
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

function handleSaveDraft() {
  persist();
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
      @next="runtime.goToNextStage"
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
          :transcript-text="transcriptText"
          :running="runtime.running.value"
          :status="stage.status"
          :mode="rewriteMode"
          :error-message="rewriteErrorMessage"
          @update:transcript-text="transcriptText = $event"
          @run="runtime.runStage('rewrite')"
        />
        <VoiceCloningStage
          v-else-if="stage.id === 'voice-clone'"
          v-model="project"
          :script-text="project.notes ?? ''"
          :voice-id="selectedVoiceId"
          :voice-name="selectedVoiceName"
          :running="runtime.running.value"
          :status="stage.status"
          :mode="voiceCloneMode"
          :error-message="voiceCloneErrorMessage"
          @run="runtime.runStage('voice-clone')"
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
          :mode="speechMode"
          :error-message="speechErrorMessage"
          @run="runtime.runStage('speech')"
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
