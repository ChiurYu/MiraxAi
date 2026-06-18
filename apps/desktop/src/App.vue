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
  Link2,
  Loader2,
  Mic,
  Moon,
  Music2,
  Play,
  PlayCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sun,
  Upload,
  UserRound,
  Volume2,
  WandSparkles,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import {
  validateProjectDraft,
  type ProjectDraft,
  type PublishPlatform,
  type WorkflowStage,
  type WorkflowStageId,
} from "@mirax/core";
import { createMockMediaRenderer } from "@mirax/media-pipeline";
import { createMockAiProvider } from "@mirax/provider-ai";
import { SUPPORTED_PLATFORM_PROFILES, createMockPublisher } from "@mirax/provider-publish";
import PathPickerButton from "./components/PathPickerButton.vue";
import StatusBadge from "./components/StatusBadge.vue";
import WorkbenchShell from "./components/workbench/WorkbenchShell.vue";
import WorkflowStageCard from "./components/workbench/WorkflowStageCard.vue";
import PublishPrepCard from "./components/workbench/PublishPrepCard.vue";
import PublishCard from "./components/workbench/PublishCard.vue";
import { usePublishPreparation } from "./composables/usePublishPreparation.js";
import { useTaskCenterPreview } from "./composables/useTaskCenterPreview.js";
import { useWorkbenchDraft } from "./composables/useWorkbenchDraft.js";
import { useWorkflowRuntime } from "./composables/useWorkflowRuntime.js";
import SettingsView from "./views/SettingsView.vue";
import TaskCenterPreview from "./components/task-center/TaskCenterPreview.vue";
import { appendPublishTasks } from "./features/task-center/publishTaskStore.js";
import {
  appendPublishHistoryItem,
  createPublishHistoryItem,
} from "./features/task-center/taskHistory.js";

const aiProvider = createMockAiProvider({ artifactRoot: "/Users/Shared/MiraxAI" });
const mediaRenderer = createMockMediaRenderer({ artifactRoot: "/Users/Shared/MiraxAI" });
const publisher = createMockPublisher();

const { draft, saveStatus } = useWorkbenchDraft();
const historyPreview = useTaskCenterPreview({ limit: 5 });
const { latestItems: latestHistoryItems, refresh: refreshHistory } = historyPreview;
const taskPreviewRef = ref<InstanceType<typeof TaskCenterPreview> | null>(null);

const generatedVideoPath = ref("");
const generatedCoverPath = ref("");
const generatedAudioPath = ref("");
const generatedAvatarPath = ref("");
const theme = ref<"light" | "dark">("dark");
const activeView = ref<"workbench" | "settings">("workbench");

const project = computed({
  get: () => draft.project,
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

const runtime = useWorkflowRuntime({
  projectId: "demo-project",
  executor: executeStage,
});

const projectErrors = computed(() => validateProjectDraft(project.value));
const canRun = computed(
  () => !runtime.running.value && projectErrors.value.length === 0 && Boolean(runtime.nextStage.value),
);
const platformLabels = computed<Record<PublishPlatform, string>>(() =>
  Object.fromEntries(SUPPORTED_PLATFORM_PROFILES.map((profile) => [profile.id, profile.label])) as Record<
    PublishPlatform,
    string
  >,
);

function getStage(stageId: WorkflowStageId): WorkflowStage {
  return runtime.workflow.value.stages.find((stage) => stage.id === stageId)!;
}

function getPlatformLabel(platform: PublishPlatform): string {
  return platformLabels.value[platform];
}

function resetWorkbench() {
  runtime.resetWorkflow();
  generatedVideoPath.value = "";
  generatedCoverPath.value = "";
  generatedAudioPath.value = "";
  generatedAvatarPath.value = "";
  prep.updateMetadata({ title: "", description: "", tags: [], coverPath: undefined, mode: "draft" });
}

async function executeStage(stageId: WorkflowStageId, title: string): Promise<string> {
  switch (stageId) {
    case "transcribe": {
      const result = await aiProvider.transcribe({
        sourceVideoPath: project.value.sourceVideoPath ?? "",
        language: "zh-CN",
      });
      return `已提取 ${result.segments.length} 段文案`;
    }
    case "rewrite": {
      const result = await aiProvider.rewriteScript({
        transcript: "模拟对标视频文案",
        productName: project.value.name,
        sellingPoints: ["通勤", "大容量", "质感"],
      });
      prep.updateMetadata({
        title: result.titleSuggestions[0] ?? project.value.name,
        description: result.script.slice(0, 100),
      });
      return `生成 ${result.titleSuggestions.length} 个标题方向`;
    }
    case "voice-clone": {
      const result = await aiProvider.cloneVoice({
        voiceSamplePath: project.value.voiceSamplePath ?? "",
        projectId: runtime.workflow.value.projectId,
      });
      return `声音配置 ${result.voiceId} 已就绪`;
    }
    case "speech": {
      const result = await aiProvider.synthesizeSpeech({
        voiceId: "mock-voice-demo-project",
        script: project.value.notes ?? project.value.name,
        projectId: runtime.workflow.value.projectId,
      });
      generatedAudioPath.value = result.audioPath;
      return `音频已生成：${result.audioPath}`;
    }
    case "avatar": {
      const result = await aiProvider.generateAvatarVideo({
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        avatarId: "presenter-a",
        projectId: runtime.workflow.value.projectId,
      });
      generatedAvatarPath.value = result.videoPath;
      return `数字人片段已生成：${result.videoPath}`;
    }
    case "compose": {
      const result = await mediaRenderer.render({
        projectId: runtime.workflow.value.projectId,
        avatarVideoPath: generatedAvatarPath.value || "/Users/Shared/MiraxAI/demo-project/avatar.mp4",
        audioPath: generatedAudioPath.value || "/Users/Shared/MiraxAI/demo-project/speech.wav",
        subtitleText: project.value.notes ?? project.value.name,
        coverText: project.value.name,
      });
      generatedVideoPath.value = result.videoPath;
      generatedCoverPath.value = result.coverPath;
      return `成片已生成：${result.videoPath}`;
    }
    case "review":
      return "人工复核清单已通过";
    case "publish": {
      const videoPath = generatedVideoPath.value;
      if (!videoPath) {
        throw new Error("视频尚未生成，无法发布");
      }

      if (!prep.canPublish.value) {
        const reasons = prep.errors.value.join("、") || "发布条件不满足";
        throw new Error(reasons);
      }

      const platforms = project.value.targetPlatforms;
      const platformText = platforms.map((platform) => platformLabels.value[platform]).join("、") || "未选择";
      const modeText = prep.metadata.value.mode === "direct" ? "直接发布" : "草稿";
      const coverText = prep.metadata.value.coverPath ? "已生成" : "未设置";
      const accountText = "未登录（mock 账号）";
      const titleText = prep.metadata.value.title || "未填写";
      const descText = prep.metadata.value.description.slice(0, 80) || "未填写";

      const confirmed = window.confirm(
        `确认创建 ${platforms.length} 个发布任务？\n\n` +
          `标题：${titleText}\n` +
          `描述：${descText}${prep.metadata.value.description.length > 80 ? "…" : ""}\n` +
          `封面：${coverText}\n` +
          `平台：${platformText}\n` +
          `账号：${accountText}\n` +
          `发布模式：${modeText}\n` +
          `视频路径：${videoPath}`,
      );

      if (!confirmed) {
        throw new Error("PUBLISH_CANCELLED");
      }

      const tasks = await prep.publish(videoPath);
      if (tasks.length === 0) {
        throw new Error("发布校验失败，未创建任务");
      }

      appendPublishTasks(tasks);
      appendPublishHistoryItem(
        createPublishHistoryItem({
          projectId: runtime.workflow.value.projectId,
          taskIds: tasks.map((task) => task.id),
          videoPath,
          platforms,
        }),
      );
      taskPreviewRef.value?.refresh();
      refreshHistory();

      return `已创建 ${tasks.length} 个发布任务`;
    }
  }
}

async function handlePublish() {
  await runtime.runStage("publish");
}

function toggleTheme() {
  theme.value = theme.value === "dark" ? "light" : "dark";
}
</script>

<template>
  <WorkbenchShell
    :project-name="project.name"
    :active-stage-title="runtime.activeStage.value?.title || '准备开始'"
    :progress-percent="runtime.progress.value.percent"
    :progress-completed="runtime.progress.value.completed"
    :progress-total="runtime.progress.value.total"
    :running="runtime.running.value"
    :running-mode="runtime.runningMode.value"
    :can-run="canRun"
    :theme="theme"
    :active-view="activeView"
    @run-next="runtime.runNextStage"
    @run-all="runtime.runAllStages"
    @reset="resetWorkbench"
    @toggle-theme="toggleTheme"
    @switch-view="activeView = $event"
  >
    <template v-if="activeView === 'workbench'">
    <WorkflowStageCard
      class="learn-card"
      :stage="getStage('transcribe')"
      :status="runtime.stageStatus.value.transcribe"
      @run="runtime.runStage('transcribe')"
    >
      <template #icon><Link2 :size="19" /></template>
      <template #heading-extra><small>{{ saveStatus }}</small></template>
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
        <PathPickerButton
          v-model="project.sourceVideoPath"
          label="选择对标视频"
          placeholder="请输入视频链接或本地路径"
          :filters="[{ name: 'Video', extensions: ['mp4', 'mov', 'm4v'] }]"
        />
      </label>
      <label>
        <span>原文案 / 卖点备注</span>
        <textarea v-model="project.notes" placeholder="提取的文案将显示在这里..." />
      </label>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.transcribe === 'completed'"
          @click="runtime.runStage('transcribe')"
        >
          <Link2 :size="16" /> 提取文案
        </button>
      </template>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="rewrite-card"
      :stage="getStage('rewrite')"
      :status="runtime.stageStatus.value.rewrite"
      @run="runtime.runStage('rewrite')"
    >
      <template #icon><WandSparkles :size="19" /></template>
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
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.rewrite === 'completed'"
          @click="runtime.runStage('rewrite')"
        >
          <WandSparkles :size="16" /> 改写文案
        </button>
        <button class="legal-button"><ShieldCheck :size="16" /> AI法务</button>
      </template>
      <label>
        <span>改写内容</span>
        <textarea :value="prep.metadata.value.description" placeholder="改写的文案将显示在这里..." @input="prep.updateMetadata({ description: ($event.target as HTMLTextAreaElement).value })" />
      </label>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="voice-clone-card"
      :stage="getStage('voice-clone')"
      :status="runtime.stageStatus.value['voice-clone']"
      @run="runtime.runStage('voice-clone')"
    >
      <template #icon><Mic :size="19" /></template>
      <label>
        <span>声音样本</span>
        <PathPickerButton
          v-model="project.voiceSamplePath"
          label="选择声音样本"
          placeholder="请选择或输入声音样本路径"
          :filters="[{ name: 'Audio', extensions: ['wav', 'mp3', 'm4a'] }]"
        />
      </label>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value['voice-clone'] === 'completed'"
          @click="runtime.runStage('voice-clone')"
        >
          <Mic :size="16" /> 克隆声音
        </button>
      </template>
      <div class="artifact-box">
        <Mic :size="32" />
        <strong>{{ runtime.stageStatus.value['voice-clone'] === 'completed' ? '声音配置已就绪' : '克隆的声音配置将在这里显示' }}</strong>
        <span>完成克隆后，下一步语音合成将使用项目专属声音</span>
      </div>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="voice-card"
      :stage="getStage('speech')"
      :status="runtime.stageStatus.value.speech"
      @run="runtime.runStage('speech')"
    >
      <template #icon><Volume2 :size="19" /></template>
      <label>
        <span>选择声音</span>
        <select>
          <option>项目克隆声音</option>
          <option>女-带货</option>
          <option>男-讲解</option>
        </select>
      </label>
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.speech === 'completed'"
          @click="runtime.runStage('speech')"
        >
          <Volume2 :size="16" /> 生成音频
        </button>
      </template>
      <div class="artifact-box">
        <Volume2 :size="32" />
        <strong>{{ generatedAudioPath ? "音频已生成" : "合成的音频将在这里显示" }}</strong>
        <span>{{ generatedAudioPath || "完成合成后可在此处播放预览" }}</span>
      </div>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="avatar-card"
      :stage="getStage('avatar')"
      :status="runtime.stageStatus.value.avatar"
      @run="runtime.runStage('avatar')"
    >
      <template #icon><UserRound :size="19" /></template>
      <template #heading-extra><button class="link-button">上传形象</button></template>
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
      <template #actions>
        <button
          class="primary compact-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.avatar === 'completed'"
          @click="runtime.runStage('avatar')"
        >
          <UserRound :size="16" /> 生成视频
        </button>
      </template>
      <div class="artifact-box preview-box">
        <UserRound :size="44" />
        <strong>{{ generatedAvatarPath ? "视频生成完成" : "暂无预览视频" }}</strong>
        <span>{{ generatedAvatarPath || "生成视频后将在此处显示预览" }}</span>
      </div>
    </WorkflowStageCard>

    <WorkflowStageCard
      class="compose-card"
      :stage="getStage('compose')"
      :status="runtime.stageStatus.value.compose"
      @run="runtime.runStage('compose')"
    >
      <template #icon><FileVideo :size="19" /></template>
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
        </div>
        <div class="video-preview">
          <FileVideo :size="52" />
          <strong>{{ generatedVideoPath ? "成片已生成" : "暂无预览视频" }}</strong>
          <span>{{ generatedVideoPath || "生成视频后将在此处显示预览" }}</span>
        </div>
      </div>
      <template #actions>
        <button
          class="primary wide-button"
          :disabled="runtime.running.value || runtime.stageStatus.value.compose === 'completed'"
          @click="runtime.runStage('compose')"
        >
          <FileVideo :size="16" /> 剪辑视频
        </button>
      </template>
    </WorkflowStageCard>

    <PublishPrepCard
      :metadata="prep.metadata.value"
      :status="runtime.stageStatus.value.review"
      :disabled="runtime.running.value || runtime.stageStatus.value.review === 'completed'"
      @update="prep.updateMetadata"
      @review="runtime.runStage('review')"
    />

    <PublishCard
      :project-id="runtime.workflow.value.projectId"
      :project-name="project.name"
      :video-path="generatedVideoPath"
      :target-platforms="project.targetPlatforms"
      :mode="prep.metadata.value.mode"
      :status="runtime.stageStatus.value.publish"
      :disabled="runtime.running.value || runtime.stageStatus.value.publish === 'completed'"
      :is-publishing="prep.isPublishing.value"
      @update-mode="prep.updateMetadata({ mode: $event })"
      @update-platforms="project.targetPlatforms = $event"
      @publish="handlePublish"
    />

    <section class="workflow-card log-card">
      <div class="card-heading">
        <span class="card-icon"><ClipboardCheck :size="19" /></span>
        <h2>执行记录</h2>
      </div>
      <div v-if="runtime.logs.value.length === 0" class="empty-log">等待启动第一步流程</div>
      <ul v-else class="log-list">
        <li v-for="log in runtime.logs.value.slice(0, 8)" :key="log.id">
          <strong>{{ log.stage }}</strong>
          <span>{{ log.message }}</span>
        </li>
      </ul>
      <div v-if="latestHistoryItems.length > 0" class="history-section">
        <h3>最近任务历史</h3>
        <ul class="history-list">
          <li v-for="item in latestHistoryItems" :key="item.id">
            <strong>{{ item.title }}</strong>
            <span>{{ item.platforms.map((p) => getPlatformLabel(p)).join("、") }} · {{ item.createdAt }}</span>
            <span class="history-video">视频：{{ item.videoPath }}</span>
            <span class="history-tasks">任务：{{ item.taskIds.join("、") }}</span>
          </li>
        </ul>
      </div>
      <TaskCenterPreview ref="taskPreviewRef" />
    </section>
    </template>
    <SettingsView v-else />
  </WorkbenchShell>
</template>

<style scoped>
.history-section h3 {
  margin: 12px 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--mx-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.history-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-bottom: 1px solid var(--mx-border-subtle);
}

.history-list li:last-child {
  border-bottom: none;
}

.history-video,
.history-tasks {
  font-size: 11px;
  color: var(--mx-text-tertiary);
  word-break: break-all;
}

.history-tasks {
  color: var(--mx-cyan);
}
</style>
