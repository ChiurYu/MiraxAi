<script setup lang="ts">
import {
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileVideo,
  KeyRound,
  Loader2,
  Play,
  PlayCircle,
  RefreshCw,
  Settings2,
  Upload,
  WandSparkles,
} from "lucide-vue-next";
import { computed, reactive, ref } from "vue";
import {
  createApiKeyProviderConfig,
  createDefaultWorkflow,
  createProjectDraft,
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

const project = reactive<ProjectDraft>(
  createProjectDraft({
    name: "轻奢女包口播 0611",
    targetPlatforms: ["douyin", "xiaohongshu"],
    sourceVideoPath: "/素材/对标视频.mp4",
    voiceSamplePath: "/素材/声音样本.wav",
    notes: "强调通勤、大容量、上身质感。",
  }),
);

const providerConfig = reactive<ApiKeyProviderConfig>(
  createApiKeyProviderConfig({
    id: "main-ai",
    label: "主模型配置",
    provider: "openai",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4.1",
  }),
);

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

function resetWorkflow() {
  workflow.value = createDefaultWorkflow("demo-project");
  activeStageId.value = "transcribe";
  logs.value = [];
  generatedVideoPath.value = "";
  generatedCoverPath.value = "";
  generatedAudioPath.value = "";
  generatedAvatarPath.value = "";
  publishAccounts.value = [];
}

async function processStage(stageId: WorkflowStageId, title: string) {
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
        title: project.name,
        description: project.notes ?? "",
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
</script>

<template>
  <main class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">M</div>
        <div>
          <h1>Mirax AI</h1>
          <p>短视频智能生产工作台</p>
        </div>
      </div>

      <section class="panel compact">
        <div class="panel-title">
          <FileVideo :size="18" />
          <span>项目素材</span>
        </div>
        <label>
          <span>项目名称</span>
          <input v-model="project.name" />
        </label>
        <label>
          <span>对标视频</span>
          <div class="path-row">
            <input v-model="project.sourceVideoPath" />
            <button aria-label="选择对标视频" title="选择对标视频">
              <Upload :size="17" />
            </button>
          </div>
        </label>
        <label>
          <span>声音样本</span>
          <div class="path-row">
            <input v-model="project.voiceSamplePath" />
            <button aria-label="选择声音样本" title="选择声音样本">
              <Upload :size="17" />
            </button>
          </div>
        </label>
      </section>

      <section class="panel compact">
        <div class="panel-title">
          <Settings2 :size="18" />
          <span>发布平台</span>
        </div>
        <div class="platforms">
          <label><input v-model="project.targetPlatforms" type="checkbox" value="douyin" /> 抖音</label>
          <label><input v-model="project.targetPlatforms" type="checkbox" value="xiaohongshu" /> 小红书</label>
          <label><input v-model="project.targetPlatforms" type="checkbox" value="kuaishou" /> 快手</label>
          <label><input v-model="project.targetPlatforms" type="checkbox" value="shipinhao" /> 视频号</label>
        </div>
      </section>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">生产流程</p>
          <h2>{{ activeStage?.title }}</h2>
        </div>
        <div class="actions">
          <button class="icon-button" title="重置流程" aria-label="重置流程" @click="resetWorkflow">
            <RefreshCw :size="18" />
          </button>
          <button class="secondary" :disabled="!canRunAll" @click="runAllStages">
            <Loader2 v-if="runningMode === 'all'" :size="18" class="spin" />
            <PlayCircle v-else :size="18" />
            <span>{{ runningMode === "all" ? "运行中" : "运行全部" }}</span>
          </button>
          <button class="primary" :disabled="!canRunNext" @click="runNextStage">
            <Loader2 v-if="runningMode === 'single'" :size="18" class="spin" />
            <Play v-else :size="18" />
            <span>{{ runningMode === "single" ? "执行中" : "运行下一步" }}</span>
          </button>
        </div>
      </header>

      <div class="progress-strip">
        <div>
          <strong>{{ progress.percent }}%</strong>
          <span>{{ progress.completed }}/{{ progress.total }} 已完成</span>
        </div>
        <div class="bar"><i :style="{ width: `${progress.percent}%` }" /></div>
      </div>

      <div class="stage-grid">
        <button
          v-for="stage in workflow.stages"
          :key="stage.id"
          class="stage"
          :class="[stage.status, { active: activeStageId === stage.id }]"
          @click="activeStageId = stage.id"
        >
          <CheckCircle2 v-if="stage.status === 'completed'" :size="22" />
          <Loader2 v-else-if="stage.status === 'running'" :size="22" class="spin" />
          <Circle v-else :size="22" />
          <span>{{ stage.title }}</span>
          <small>{{ stage.description }}</small>
        </button>
      </div>

      <section class="run-log">
        <div class="panel-title">
          <ClipboardCheck :size="18" />
          <span>执行记录</span>
        </div>
        <div v-if="logs.length === 0" class="empty">等待启动第一步流程</div>
        <ul v-else>
          <li v-for="log in logs" :key="log.id">
            <strong>{{ log.stage }}</strong>
            <span>{{ log.message }}</span>
          </li>
        </ul>
      </section>
    </section>

    <aside class="inspector">
      <section class="panel">
        <div class="panel-title">
          <KeyRound :size="18" />
          <span>密钥配置</span>
        </div>
        <label>
          <span>配置名称</span>
          <input v-model="providerConfig.label" />
        </label>
        <label>
          <span>Base URL</span>
          <input v-model="providerConfig.baseUrl" />
        </label>
        <label>
          <span>API Key</span>
          <input v-model="providerConfig.apiKey" type="password" placeholder="用户本地填写" autocomplete="off" />
        </label>
        <label>
          <span>模型</span>
          <input v-model="providerConfig.model" />
        </label>
        <div class="warning-list">
          <p v-for="error in providerErrors" :key="error">{{ error }}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <WandSparkles :size="18" />
          <span>当前步骤</span>
        </div>
        <h3>{{ activeStage?.title }}</h3>
        <p class="muted">{{ activeStage?.description }}</p>
        <div class="warning-list">
          <p v-for="error in projectErrors" :key="error">{{ error }}</p>
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">
          <FileVideo :size="18" />
          <span>生成产物</span>
        </div>
        <dl class="artifact-list">
          <div>
            <dt>音频</dt>
            <dd>{{ generatedAudioPath || "等待语音合成" }}</dd>
          </div>
          <div>
            <dt>数字人</dt>
            <dd>{{ generatedAvatarPath || "等待数字人口播" }}</dd>
          </div>
          <div>
            <dt>成片</dt>
            <dd>{{ generatedVideoPath || "等待视频合成" }}</dd>
          </div>
          <div>
            <dt>封面</dt>
            <dd>{{ generatedCoverPath || "等待视频合成" }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <div class="panel-title">
          <Settings2 :size="18" />
          <span>发布账号</span>
        </div>
        <div class="account-list">
          <div v-for="platformId in project.targetPlatforms" :key="platformId">
            <strong>{{ platformLabels[platformId] }}</strong>
            <span>
              {{
                publishAccounts.find((account) => account.platformId === platformId)?.displayName ||
                "发布时自动检查账号"
              }}
            </span>
          </div>
        </div>
      </section>
    </aside>
  </main>
</template>
