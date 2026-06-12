<script setup lang="ts">
import {
  CheckCircle2,
  Circle,
  CloudUpload,
  ClipboardCheck,
  FileVideo,
  FileText,
  FolderOpen,
  Image,
  KeyRound,
  Link2,
  Loader2,
  Music2,
  Play,
  PlayCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Upload,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-vue-next";
import { computed, reactive, ref, watch } from "vue";
import {
  createDefaultWorkflow,
  getNextStage,
  getStageProgress,
  updateStageStatus,
  validateProjectDraft,
  validateProviderConfig,
  type ApiKeyProviderConfig,
  type ProjectDraft,
  type WorkflowStageId,
} from "@mirax/core";
import { createMockMediaRenderer } from "@mirax/media-pipeline";
import { createMockAiProvider } from "@mirax/provider-ai";
import { SUPPORTED_PLATFORM_PROFILES, createMockPublisher, type PublishAccount } from "@mirax/provider-publish";
import {
  DESKTOP_DRAFT_STORAGE_KEY,
  createDefaultDesktopDraft,
  restoreDesktopDraft,
  sanitizeDesktopDraftForStorage,
  type PersistedDesktopDraft,
} from "./runtime/desktopDraft.js";
import PathPickerButton from "./components/PathPickerButton.vue";
import StatusBadge from "./components/StatusBadge.vue";

type LogEntry = {
  id: number;
  stage: string;
  message: string;
};

const aiProvider = createMockAiProvider({ artifactRoot: "/Users/Shared/MiraxAI" });
const mediaRenderer = createMockMediaRenderer({ artifactRoot: "/Users/Shared/MiraxAI" });
const publisher = createMockPublisher();
const workflow = ref(createDefaultWorkflow("demo-project"));
const activeStageId = ref<WorkflowStageId>("transcribe");
const running = ref(false);
const runningMode = ref<"single" | "all" | null>(null);
const logs = ref<LogEntry[]>([]);
const publishAccounts = ref<PublishAccount[]>([]);
const generatedVideoPath = ref("");
const generatedCoverPath = ref("");
const generatedAudioPath = ref("");
const generatedAvatarPath = ref("");
const publishTitle = ref("");
const publishDescription = ref("");
const publishTags = ref("通勤包, 大容量, 质感");

const defaultDraft = createDefaultDesktopDraft();

const project = reactive<ProjectDraft>(defaultDraft.project);

const providerConfig = reactive<ApiKeyProviderConfig>(defaultDraft.providerConfig);
const saveStatus = ref("未保存");

restoreDraft();

const progress = computed(() => getStageProgress(workflow.value));
const nextStage = computed(() => getNextStage(workflow.value));
const activeStage = computed(() => workflow.value.stages.find((stage) => stage.id === activeStageId.value));
const projectErrors = computed(() => validateProjectDraft(project));
const providerErrors = computed(() => validateProviderConfig(providerConfig));
const canRunNext = computed(() => !running.value && projectErrors.value.length === 0 && Boolean(nextStage.value));
const canRunAll = computed(() => !running.value && projectErrors.value.length === 0 && Boolean(nextStage.value));
const platformLabels = computed(() =>
  Object.fromEntries(SUPPORTED_PLATFORM_PROFILES.map((profile) => [profile.id, profile.label])),
);
const stageStatus = computed(() =>
  Object.fromEntries(workflow.value.stages.map((stage) => [stage.id, stage.status])),
);
const selectedAccountText = computed(() => {
  if (publishAccounts.value.length === 0) {
    return "选择账号";
  }

  return project.targetPlatforms
    .map((platformId) => publishAccounts.value.find((account) => account.platformId === platformId)?.displayName)
    .filter(Boolean)
    .join("、");
});

watch(
  [project, providerConfig],
  () => {
    persistDraft();
  },
  { deep: true },
);

async function runNextStage() {
  const stage = nextStage.value;
  if (!stage || running.value) {
    return;
  }

  running.value = true;
  runningMode.value = "single";

  try {
    await processStage(stage.id, stage.title);
  } finally {
    running.value = false;
    runningMode.value = null;
  }
}

async function runAllStages() {
  if (running.value || projectErrors.value.length > 0) {
    return;
  }

  running.value = true;
  runningMode.value = "all";

  try {
    let stage = getNextStage(workflow.value);
    while (stage) {
      await processStage(stage.id, stage.title);
      stage = getNextStage(workflow.value);
    }
  } finally {
    running.value = false;
    runningMode.value = null;
  }
}

async function runStage(stageId: WorkflowStageId) {
  if (running.value) {
    return;
  }

  const status = stageStatus.value[stageId];
  if (status === "completed" || status === "running") {
    return;
  }

  const stage = workflow.value.stages.find((s) => s.id === stageId);
  if (!stage) {
    return;
  }

  running.value = true;
  runningMode.value = "single";

  try {
    await processStage(stageId, stage.title);
  } catch {
    // processStage already updates status and logs; swallow here to keep UX on card.
  } finally {
    running.value = false;
    runningMode.value = null;
  }
}

function resetWorkflow() {
  workflow.value = createDefaultWorkflow("demo-project");
  activeStageId.value = "transcribe";
  logs.value = [];
  generatedVideoPath.value = "";
  generatedCoverPath.value = "";
  generatedAudioPath.value = "";
  generatedAvatarPath.value = "";
  publishAccounts.value = [];
  publishTitle.value = "";
  publishDescription.value = "";
}

async function processStage(stageId: WorkflowStageId, title: string) {
  resetFailedStage(stageId);
  activeStageId.value = stageId;
  workflow.value = updateStageStatus(workflow.value, stageId, "running");
  addLog(title, "开始执行");

  try {
    const message = await executeStage(stageId);
    workflow.value = updateStageStatus(workflow.value, stageId, "completed");
    addLog(title, message);
  } catch (error) {
    workflow.value = updateStageStatus(workflow.value, stageId, "failed");
    addLog(title, error instanceof Error ? error.message : "执行失败");
    throw error;
  }
}

function resetFailedStage(stageId: WorkflowStageId) {
  if (stageStatus.value[stageId] === "failed") {
    workflow.value = updateStageStatus(workflow.value, stageId, "pending");
  }
}

async function executeStage(stageId: WorkflowStageId): Promise<string> {
  switch (stageId) {
    case "transcribe": {
      const result = await aiProvider.transcribe({
        sourceVideoPath: project.sourceVideoPath ?? "",
        language: "zh-CN",
      });
      return `已提取 ${result.segments.length} 段文案`;
    }
    case "rewrite": {
      const result = await aiProvider.rewriteScript({
        transcript: "模拟对标视频文案",
        productName: project.name,
        sellingPoints: ["通勤", "大容量", "质感"],
      });
      publishTitle.value = result.titleSuggestions[0] ?? project.name;
      publishDescription.value = result.script.slice(0, 100);
      return `生成 ${result.titleSuggestions.length} 个标题方向`;
    }
    case "voice-clone": {
      const result = await aiProvider.cloneVoice({
        voiceSamplePath: project.voiceSamplePath ?? "",
        projectId: workflow.value.projectId,
      });
      return `声音配置 ${result.voiceId} 已就绪`;
    }
    case "speech": {
      const result = await aiProvider.synthesizeSpeech({
        voiceId: "mock-voice-demo-project",
        script: project.notes ?? project.name,
        projectId: workflow.value.projectId,
      });
      generatedAudioPath.value = result.audioPath;
      return `音频已生成：${result.audioPath}`;
    }
    case "avatar": {
      const result = await aiProvider.generateAvatarVideo({
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        avatarId: "presenter-a",
        projectId: workflow.value.projectId,
      });
      generatedAvatarPath.value = result.videoPath;
      return `数字人片段已生成：${result.videoPath}`;
    }
    case "compose": {
      const result = await mediaRenderer.render({
        projectId: workflow.value.projectId,
        avatarVideoPath: generatedAvatarPath.value || "/Users/Shared/MiraxAI/demo-project/avatar.mp4",
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        subtitleText: project.notes ?? project.name,
        coverText: project.name,
      });
      generatedVideoPath.value = result.videoPath;
      generatedCoverPath.value = result.coverPath;
      return `成片已生成：${result.videoPath}`;
    }
    case "review":
      return "人工复核清单已通过";
    case "publish": {
      publishAccounts.value = await publisher.listAccounts();
      const result = await publisher.publish({
        projectId: workflow.value.projectId,
        videoPath: generatedVideoPath.value,
        title: publishTitle.value || project.name,
        description: publishDescription.value || project.notes || "",
        platformIds: project.targetPlatforms,
        mode: "draft",
      });
      return `${result.message}：${result.taskIds.join("、")}`;
    }
  }
}

function addLog(stage: string, message: string) {
  logs.value.unshift({
    id: Date.now() + logs.value.length,
    stage,
    message,
  });
}

function restoreDraft() {
  try {
    const raw = window.localStorage.getItem(DESKTOP_DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const saved = JSON.parse(raw) as Partial<PersistedDesktopDraft>;
    const restored = restoreDesktopDraft(saved);
    Object.assign(project, restored.project);
    Object.assign(providerConfig, restored.providerConfig);
    saveStatus.value = "已恢复草稿";
  } catch {
    saveStatus.value = "草稿读取失败";
  }
}

function persistDraft() {
  const payload = sanitizeDesktopDraftForStorage({ project, providerConfig });

  try {
    window.localStorage.setItem(DESKTOP_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    saveStatus.value = "草稿已保存";
  } catch {
    saveStatus.value = "草稿保存失败";
  }
}
</script>

<template>
  <main class="app-shell">
    <aside class="nav-rail">
      <div class="brand">
        <div class="brand-mark">
          <PlayCircle :size="21" />
        </div>
        <strong>Mirax AI</strong>
      </div>
      <nav>
        <button class="nav-item active"><WandSparkles :size="18" /> 首页</button>
        <button class="nav-item"><Volume2 :size="18" /> 声音管理</button>
        <button class="nav-item"><UserRound :size="18" /> 形象管理</button>
        <button class="nav-item"><FolderOpen :size="18" /> 素材管理</button>
        <button class="nav-item"><ClipboardCheck :size="18" /> 任务中心</button>
        <button class="nav-item"><KeyRound :size="18" /> 账号管理</button>
        <button class="nav-item"><Settings2 :size="18" /> 设置</button>
      </nav>
    </aside>

    <section class="board-shell">
      <header class="window-bar">
        <div class="mode-switch">
          <button class="selected"><Play :size="15" /> 手动</button>
          <button><CloudUpload :size="15" /> 自动</button>
          <button><Circle :size="15" /> 后台</button>
        </div>
        <div class="toolbar-actions">
          <span>{{ progress.percent }}% / {{ progress.completed }}/{{ progress.total }}</span>
          <button class="ghost-button" @click="resetWorkflow">
            <RefreshCw :size="16" />
            清空数据
          </button>
          <button class="secondary" :disabled="!canRunAll" @click="runAllStages">
            <Loader2 v-if="runningMode === 'all'" :size="17" class="spin" />
            <PlayCircle v-else :size="17" />
            {{ runningMode === "all" ? "运行中" : "运行全部" }}
          </button>
          <button class="primary" :disabled="!canRunNext" @click="runNextStage">
            <Loader2 v-if="runningMode === 'single'" :size="17" class="spin" />
            <Play v-else :size="17" />
            {{ runningMode === "single" ? "执行中" : "运行下一步" }}
          </button>
        </div>
      </header>

      <div class="workflow-board">
        <section class="workflow-card learn-card">
          <div class="card-heading">
            <span class="card-icon"><Link2 :size="19" /></span>
            <h2>1. 学习对标</h2>
            <StatusBadge :status="stageStatus.transcribe" />
            <small>{{ saveStatus }}</small>
          </div>
          <div class="tabs">
            <span class="active">提取文案</span>
            <span>IP大脑</span>
            <span>爆款选题</span>
            <span>营销文案</span>
          </div>
          <label>
            <span>项目名称</span>
            <input v-model="project.name" />
          </label>
          <label>
            <span>视频链接</span>
            <div class="action-input">
              <input v-model="project.sourceVideoPath" placeholder="请输入视频链接或本地路径" />
              <PathPickerButton
                label="选择对标视频"
                :value="project.sourceVideoPath"
                :filters="[{ name: 'Video', extensions: ['mp4', 'mov', 'm4v'] }]"
                @selected="project.sourceVideoPath = $event"
              />
            </div>
          </label>
          <label>
            <span>原文案 / 卖点备注</span>
            <textarea v-model="project.notes" placeholder="提取的文案将显示在这里..." />
          </label>
          <div class="button-row">
            <button
              class="primary compact-button"
              :disabled="running || stageStatus.transcribe === 'completed'"
              @click="runStage('transcribe')"
            >
              <Link2 :size="16" /> 提取文案
            </button>
          </div>
        </section>

        <section class="workflow-card rewrite-card">
          <div class="card-heading">
            <span class="card-icon"><WandSparkles :size="19" /></span>
            <h2>2. 改写文案</h2>
            <StatusBadge :status="stageStatus.rewrite" />
          </div>
          <div class="two-columns">
            <label>
              <span>写作提示词</span>
              <select>
                <option>默认文案写作提示词</option>
              </select>
            </label>
            <label>
              <span>字数</span>
              <select>
                <option>300字</option>
              </select>
            </label>
          </div>
          <div class="button-row">
            <button
              class="primary compact-button"
              :disabled="running || stageStatus.rewrite === 'completed'"
              @click="runStage('rewrite')"
            >
              <WandSparkles :size="16" /> 改写文案
            </button>
            <button class="legal-button"><ShieldCheck :size="16" /> AI法务</button>
          </div>
          <label>
            <span>改写内容</span>
            <textarea v-model="publishDescription" placeholder="改写的文案将显示在这里..." />
          </label>
        </section>

        <section class="workflow-card voice-card">
          <div class="card-heading">
            <span class="card-icon"><Volume2 :size="19" /></span>
            <h2>3. 声音生成</h2>
            <StatusBadge :status="stageStatus.speech" />
            <PathPickerButton
              class="link-button"
              label="选择声音样本"
              :value="project.voiceSamplePath"
              :filters="[{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a'] }]"
              @selected="project.voiceSamplePath = $event"
            />
          </div>
          <label>
            <span>选择声音</span>
            <select>
              <option>女-带货</option>
              <option>男-讲解</option>
            </select>
          </label>
          <div class="button-row">
            <button
              class="primary compact-button"
              :disabled="running || stageStatus.speech === 'completed'"
              @click="runStage('speech')"
            >
              <Volume2 :size="16" /> 生成音频
            </button>
          </div>
          <div class="artifact-box">
            <Volume2 :size="32" />
            <strong>{{ generatedAudioPath ? "克隆结果已生成" : "克隆的音频将在这里显示" }}</strong>
            <span>{{ generatedAudioPath || "完成克隆后可在此处播放预览" }}</span>
          </div>
        </section>

        <section class="workflow-card avatar-card">
          <div class="card-heading">
            <span class="card-icon"><UserRound :size="19" /></span>
            <h2>4. 视频生成</h2>
            <StatusBadge :status="stageStatus.avatar" />
            <button class="link-button">上传形象</button>
          </div>
          <div class="segmented">
            <button class="selected">单形象</button>
            <button>多镜头</button>
          </div>
          <label>
            <span>选择形象</span>
            <select>
              <option>示例1-绿幕</option>
            </select>
          </label>
          <label>
            <span>模型版本</span>
            <select>
              <option>高清模型V2</option>
            </select>
          </label>
          <div class="button-row">
            <button
              class="primary compact-button"
              :disabled="running || stageStatus.avatar === 'completed'"
              @click="runStage('avatar')"
            >
              <UserRound :size="16" /> 生成视频
            </button>
          </div>
          <div class="artifact-box preview-box">
            <UserRound :size="44" />
            <strong>{{ generatedAvatarPath ? "视频生成完成" : "暂无预览视频" }}</strong>
            <span>{{ generatedAvatarPath || "生成视频后将在此处显示预览" }}</span>
          </div>
        </section>

        <section class="workflow-card compose-card">
          <div class="card-heading">
            <span class="card-icon"><FileVideo :size="19" /></span>
            <h2>5. 一键成片</h2>
            <StatusBadge :status="stageStatus.compose" />
          </div>
          <div class="compose-grid">
            <div class="compose-controls">
              <label>
                <span>视频源</span>
                <input :value="generatedAvatarPath || '自动使用上一步数字人视频，或手动选择'" readonly />
              </label>
              <div class="toggle-row"><input type="checkbox" checked /> 启用字幕 <button>字幕设置</button></div>
              <label>
                <span>混剪（画中画）素材</span>
                <select><option>不混剪</option></select>
              </label>
              <label>
                <span>背景音乐</span>
                <div class="action-input">
                  <input placeholder="选择背景音乐" />
                  <button><Music2 :size="16" /></button>
                </div>
              </label>
              <div class="slider-row">
                <span>人声音量</span>
                <input type="range" min="0" max="1" step="0.1" value="1" />
                <b>1</b>
              </div>
              <div class="slider-row">
                <span>BGM音量</span>
                <input type="range" min="0" max="1" step="0.1" value="0.3" />
                <b>0.3</b>
              </div>
              <button
                class="primary wide-button"
                :disabled="running || stageStatus.compose === 'completed'"
                @click="runStage('compose')"
              >
                <FileVideo :size="16" /> 剪辑视频
              </button>
            </div>
            <div class="video-preview">
              <FileVideo :size="52" />
              <strong>{{ generatedVideoPath ? "成片已生成" : "暂无预览视频" }}</strong>
              <span>{{ generatedVideoPath || "生成视频后将在此处显示预览" }}</span>
            </div>
          </div>
        </section>

        <section class="workflow-card publish-meta-card">
          <div class="card-heading">
            <span class="card-icon"><FileText :size="19" /></span>
            <h2>6. 标题封面（用于发布）</h2>
            <StatusBadge :status="stageStatus.review" />
          </div>
          <label>
            <span>标题</span>
            <div class="action-input">
              <input v-model="publishTitle" placeholder="输入视频标题" />
              <button @click="publishTitle = project.name">一键生成</button>
            </div>
          </label>
          <label>
            <span>描述</span>
            <textarea v-model="publishDescription" placeholder="输入视频描述..." />
          </label>
          <label>
            <span>话题标签</span>
            <input v-model="publishTags" placeholder="输入标签后回车，发布时自动拼接 #tag" />
          </label>
          <div class="cover-row">
            <div class="cover-preview">
              <Image :size="26" />
              <span>{{ generatedCoverPath ? "封面已生成" : "暂无封面" }}</span>
            </div>
            <div class="cover-actions">
              <button>封面设计</button>
              <button :disabled="!generatedCoverPath">打开封面</button>
              <button :disabled="!generatedCoverPath">导出封面</button>
            </div>
            <div class="button-row">
              <button
                class="primary compact-button"
                :disabled="running || stageStatus.review === 'completed'"
                @click="runStage('review')"
              >
                <ClipboardCheck :size="16" /> 复核通过
              </button>
            </div>
          </div>
        </section>

        <section class="workflow-card publish-card">
          <div class="card-heading">
            <span class="card-icon"><CloudUpload :size="19" /></span>
            <h2>7. 视频发布</h2>
            <StatusBadge :status="stageStatus.publish" />
          </div>
          <label>
            <span>视频地址</span>
            <div class="action-input">
              <input :value="generatedVideoPath || '自动使用上一步视频，或手动选择'" readonly />
              <button><FolderOpen :size="16" /></button>
            </div>
          </label>
          <label>
            <span>发布账号</span>
            <select>
              <option>{{ selectedAccountText }}</option>
            </select>
          </label>
          <div class="platforms compact-platforms">
            <label><input v-model="project.targetPlatforms" type="checkbox" value="douyin" /> 抖音</label>
            <label><input v-model="project.targetPlatforms" type="checkbox" value="xiaohongshu" /> 小红书</label>
            <label><input v-model="project.targetPlatforms" type="checkbox" value="kuaishou" /> 快手</label>
            <label><input v-model="project.targetPlatforms" type="checkbox" value="shipinhao" /> 视频号</label>
          </div>
          <div class="radio-row">
            <label><input type="radio" name="publish-mode" /> 直接发布</label>
            <label><input type="radio" name="publish-mode" checked /> 草稿</label>
          </div>
          <button
            class="primary wide-button"
            :disabled="running || stageStatus.publish === 'completed'"
            @click="runStage('publish')"
          >
            <CloudUpload :size="16" /> 立即发布
          </button>
        </section>

        <section class="workflow-card settings-card">
          <div class="card-heading">
            <span class="card-icon"><KeyRound :size="19" /></span>
            <h2>密钥配置</h2>
          </div>
          <div class="two-columns">
            <label><span>配置名称</span><input v-model="providerConfig.label" /></label>
            <label><span>模型</span><input v-model="providerConfig.model" /></label>
          </div>
          <label><span>Base URL</span><input v-model="providerConfig.baseUrl" /></label>
          <label><span>API Key</span><input v-model="providerConfig.apiKey" type="password" placeholder="用户本地填写" autocomplete="off" /></label>
          <div class="warning-list">
            <p v-for="error in providerErrors" :key="error">{{ error }}</p>
            <p v-for="error in projectErrors" :key="error">{{ error }}</p>
          </div>
        </section>

        <section class="workflow-card log-card">
          <div class="card-heading">
            <span class="card-icon"><ClipboardCheck :size="19" /></span>
            <h2>执行记录</h2>
          </div>
          <div v-if="logs.length === 0" class="empty-log">等待启动第一步流程</div>
          <ul v-else class="log-list">
            <li v-for="log in logs.slice(0, 8)" :key="log.id">
              <strong>{{ log.stage }}</strong>
              <span>{{ log.message }}</span>
            </li>
          </ul>
        </section>
      </div>
    </section>
  </main>
</template>
