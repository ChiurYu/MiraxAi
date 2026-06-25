<script setup lang="ts">
import {
  CheckCircle2,
  ClipboardCheck,
  FileVideo,
  Image,
  Loader2,
  UserRound,
  Volume2,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import type { WorkflowStage, WorkflowStageStatus } from "@mirax/core";
import StageProgress from "./StageProgress.vue";
import TaskCenterPreview from "../task-center/TaskCenterPreview.vue";

const props = defineProps<{
  stages: WorkflowStage[];
  stageStatus: Record<WorkflowStage["id"], WorkflowStageStatus>;
  activeStageId: WorkflowStage["id"];
  logs: { id: number; stage: string; message: string }[];
  videoPath?: string;
  coverPath?: string;
  audioPath?: string;
  avatarPath?: string;
}>();

const emit = defineEmits<{
  scrollToStage: [stageId: WorkflowStage["id"]];
}>();

const taskPreviewRef = ref<InstanceType<typeof TaskCenterPreview> | null>(null);

function refreshTasks() {
  taskPreviewRef.value?.refresh();
}

defineExpose({ refreshTasks });

const artifacts = computed(() => {
  const list: Array<{ label: string; path: string; icon: typeof FileVideo }> = [];
  if (props.videoPath) list.push({ label: "成片", path: props.videoPath, icon: FileVideo });
  if (props.avatarPath) list.push({ label: "数字人", path: props.avatarPath, icon: UserRound });
  if (props.audioPath) list.push({ label: "音频", path: props.audioPath, icon: Volume2 });
  if (props.coverPath) list.push({ label: "封面", path: props.coverPath, icon: Image });
  return list;
});

const hasArtifacts = computed(() => artifacts.value.length > 0);

function getLogStatus(stageTitle: string): WorkflowStageStatus {
  const stage = props.stages.find((s) => s.title === stageTitle);
  return stage?.status ?? "pending";
}
</script>

<template>
  <section class="side-panel-section">
      <div class="section-heading">
        <CheckCircle2 :size="14" /> 阶段轨迹
      </div>
      <div class="section-body">
        <StageProgress
          :stages="stages"
          :stage-status="stageStatus"
          :active-stage-id="activeStageId"
          direction="vertical"
          @select="emit('scrollToStage', $event)"
        />
      </div>
    </section>

    <section class="side-panel-section">
      <div class="section-heading">
        <FileVideo :size="14" /> 当前产物
      </div>
      <div class="section-body">
        <div v-if="!hasArtifacts" class="side-empty">完成阶段后将在此显示产物</div>
        <ul v-else class="artifact-list">
          <li v-for="artifact in artifacts" :key="artifact.label">
            <component :is="artifact.icon" :size="14" />
            <div>
              <span class="artifact-label">{{ artifact.label }}</span>
              <span class="artifact-path">{{ artifact.path }}</span>
            </div>
          </li>
        </ul>
      </div>
    </section>

    <section class="side-panel-section">
      <div class="section-heading">
        <Loader2 :size="14" /> 执行记录
      </div>
      <div class="section-body">
        <div v-if="logs.length === 0" class="side-empty">等待启动第一步流程</div>
        <ul v-else class="side-log-list">
          <li
            v-for="log in logs.slice(0, 10)"
            :key="log.id"
            :data-status="getLogStatus(log.stage)"
          >
            <strong>{{ log.stage }}</strong>
            <span>{{ log.message }}</span>
          </li>
        </ul>
      </div>
    </section>

    <section class="side-panel-section">
      <div class="section-heading">
        <ClipboardCheck :size="14" /> 发布队列
      </div>
      <div class="section-body">
        <TaskCenterPreview ref="taskPreviewRef" :show-title="false" compact show-empty />
      </div>
    </section>
</template>

<style scoped>
/* Chrome and layout tokens are defined globally in styles.css. */
</style>
