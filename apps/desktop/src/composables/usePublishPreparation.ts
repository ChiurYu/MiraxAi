import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import {
  createDefaultPublishMetadata,
  validatePublishMetadata,
  type PublishMetadata,
  type PublishPlatform,
} from "@mirax/core";
import {
  createPublishTask,
  type PublishAccount,
  type PublishTask,
  type Publisher,
} from "@mirax/provider-publish";

export interface UsePublishPreparationOptions {
  projectId: string;
  projectName: string;
  targetPlatforms: MaybeRefOrGetter<PublishPlatform[]>;
  publisher: Publisher;
}

export function usePublishPreparation(options: UsePublishPreparationOptions) {
  const metadata = ref<PublishMetadata>(createDefaultPublishMetadata());
  const tasks = ref<PublishTask[]>([]);
  const accounts = ref<PublishAccount[]>([]);
  const isPublishing = ref(false);

  const errors = computed(() => validatePublishMetadata(metadata.value, toValue(options.targetPlatforms)));
  const canPublish = computed(
    () => errors.value.length === 0 && toValue(options.targetPlatforms).length > 0 && !isPublishing.value,
  );

  function updateMetadata(partial: Partial<PublishMetadata>) {
    Object.assign(metadata.value, partial);
  }

  async function publish(videoPath: string): Promise<PublishTask[]> {
    if (!canPublish.value) {
      return [];
    }

    isPublishing.value = true;

    try {
      const platforms = toValue(options.targetPlatforms);
      accounts.value = await options.publisher.listAccounts();

      const result = await options.publisher.publish({
        projectId: options.projectId,
        videoPath,
        title: metadata.value.title,
        description: metadata.value.description,
        platformIds: platforms,
        mode: metadata.value.mode,
      });

      const created: PublishTask[] = platforms.map((platformId) => {
        const account = accounts.value.find((item) => item.platformId === platformId);
        const platformResult = result.platformResults.find((r) => r.platformId === platformId);
        const taskId = platformResult?.taskId ?? `mock-publish-${options.projectId}-${platformId}`;
        const failed = platformResult?.success === false;

        let status: PublishTask["status"] = failed ? "failed" : "submitted";
        if (failed && platformResult?.errorCode === "network_error") {
          status = "retryable";
        }

        return createPublishTask({
          id: taskId,
          projectId: options.projectId,
          platformId,
          accountId: account?.id ?? `mock-${platformId}`,
          videoPath,
          title: metadata.value.title,
          description: metadata.value.description,
          tags: metadata.value.tags,
          mode: metadata.value.mode,
          status,
          errorCode: platformResult?.errorCode,
          errorMessage: platformResult?.errorMessage,
          failedAt: failed ? new Date().toISOString() : undefined,
        });
      });

      tasks.value = created;
      return created;
    } finally {
      isPublishing.value = false;
    }
  }

  return {
    metadata,
    tasks,
    accounts,
    errors,
    canPublish,
    isPublishing,
    updateMetadata,
    publish,
  };
}
