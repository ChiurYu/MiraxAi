import { describe, expect, it } from "vitest";
import type { PublishMetadata, PublishPlatform } from "@mirax/core";
import { deriveContentReviewReadiness } from "./contentReviewReadiness.js";

const emptyMetadata: PublishMetadata = {
  title: "",
  description: "",
  tags: [],
  mode: "draft",
};

const platformLabels: Record<PublishPlatform, string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  kuaishou: "快手",
  shipinhao: "视频号",
  bilibili: "Bilibili",
};

describe("deriveContentReviewReadiness", () => {
  it("reports all required items missing for initial empty state", () => {
    const items = deriveContentReviewReadiness({
      metadata: emptyMetadata,
      videoPath: "",
      targetPlatforms: [],
      platformLabels,
    });

    expect(items.map((item) => item.id)).toEqual([
      "title",
      "description",
      "cover",
      "video",
      "platforms",
      "tags",
      "mode",
    ]);

    const readyIds = items.filter((item) => item.ok).map((item) => item.id);
    expect(readyIds).toEqual(["mode"]);

    expect(items.find((item) => item.id === "title")?.value).toBe("未填写");
    expect(items.find((item) => item.id === "description")?.value).toBe("未填写");
    expect(items.find((item) => item.id === "cover")?.value).toBe("未选择");
    expect(items.find((item) => item.id === "video")?.value).toBe("尚未生成");
    expect(items.find((item) => item.id === "platforms")?.value).toBe("未选择");
    expect(items.find((item) => item.id === "tags")?.value).toBe("未设置");
    expect(items.find((item) => item.id === "mode")?.value).toBe("存为草稿");
  });

  it("reports all items ready when required fields are filled", () => {
    const metadata: PublishMetadata = {
      title: "通勤包测评",
      description: "大容量通勤包推荐",
      tags: ["通勤", "测评"],
      coverPath: "/tmp/cover.jpg",
      mode: "direct",
    };

    const items = deriveContentReviewReadiness({
      metadata,
      videoPath: "/tmp/output.mp4",
      targetPlatforms: ["douyin", "xiaohongshu"],
      platformLabels,
    });

    expect(items.every((item) => item.ok)).toBe(true);
    expect(items.find((item) => item.id === "title")?.value).toBe("通勤包测评");
    expect(items.find((item) => item.id === "description")?.value).toBe("大容量通勤包推荐");
    expect(items.find((item) => item.id === "cover")?.value).toBe("cover.jpg");
    expect(items.find((item) => item.id === "video")?.value).toBe("output.mp4");
    expect(items.find((item) => item.id === "platforms")?.value).toBe("抖音、小红书");
    expect(items.find((item) => item.id === "tags")?.value).toBe("通勤、测评");
    expect(items.find((item) => item.id === "mode")?.value).toBe("直接发布");
  });

  it("does not include a fake account readiness item", () => {
    const items = deriveContentReviewReadiness({
      metadata: emptyMetadata,
      videoPath: "",
      targetPlatforms: ["douyin"],
      platformLabels,
    });

    expect(items.some((item) => item.id === "accounts")).toBe(false);
  });
});
