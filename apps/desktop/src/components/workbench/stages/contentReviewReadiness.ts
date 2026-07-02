import type { PublishMetadata, PublishPlatform } from "@mirax/core";

export interface ReadinessItem {
  id: string;
  label: string;
  name: string;
  ok: boolean;
  value: string;
}

export interface DeriveContentReviewReadinessOptions {
  metadata: PublishMetadata;
  videoPath: string;
  targetPlatforms: PublishPlatform[];
  platformLabels: Record<PublishPlatform, string>;
}

function fileName(filePath: string): string {
  const trimmed = filePath.trim();
  if (!trimmed) return "";
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index >= 0 ? trimmed.slice(index + 1) : trimmed;
}

export { fileName };

export function deriveContentReviewReadiness(options: DeriveContentReviewReadinessOptions): ReadinessItem[] {
  const { metadata, videoPath, targetPlatforms, platformLabels } = options;

  const title = metadata.title.trim();
  const description = metadata.description.trim();

  return [
    {
      id: "title",
      label: "标题已填写",
      name: "标题",
      ok: title.length > 0,
      value: title || "未填写",
    },
    {
      id: "description",
      label: "描述已填写",
      name: "描述",
      ok: description.length > 0,
      value: description.length === 0
        ? "未填写"
        : `${description.slice(0, 80)}${metadata.description.length > 80 ? "…" : ""}`,
    },
    {
      id: "cover",
      label: "封面已选择",
      name: "封面",
      ok: Boolean(metadata.coverPath),
      value: metadata.coverPath ? fileName(metadata.coverPath) : "未选择",
    },
    {
      id: "video",
      label: "视频已生成",
      name: "视频",
      ok: Boolean(videoPath),
      value: videoPath ? fileName(videoPath) : "尚未生成",
    },
    {
      id: "platforms",
      label: "平台已选择",
      name: "平台",
      ok: targetPlatforms.length > 0,
      value: targetPlatforms.map((p) => platformLabels[p]).join("、") || "未选择",
    },
    {
      id: "tags",
      label: "话题标签已设置",
      name: "标签",
      ok: metadata.tags.length > 0,
      value: metadata.tags.length > 0 ? metadata.tags.join("、") : "未设置",
    },
    {
      id: "mode",
      label: "发布模式已选择",
      name: "模式",
      ok: Boolean(metadata.mode),
      value: metadata.mode === "direct" ? "直接发布" : metadata.mode === "draft" ? "存为草稿" : "未选择",
    },
  ];
}
