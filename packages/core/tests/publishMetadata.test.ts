import { describe, expect, it } from "vitest";
import {
  createDefaultPublishMetadata,
  validatePublishMetadata,
} from "../src/validation.js";

describe("PublishMetadata", () => {
  it("creates default metadata with draft mode", () => {
    const metadata = createDefaultPublishMetadata();

    expect(metadata.title).toBe("");
    expect(metadata.description).toBe("");
    expect(metadata.tags).toEqual([]);
    expect(metadata.mode).toBe("draft");
  });

  it("validates required fields", () => {
    const metadata = createDefaultPublishMetadata();

    const errors = validatePublishMetadata(metadata, []);

    expect(errors).toContain("请填写标题");
    expect(errors).toContain("请填写描述");
    expect(errors).toContain("至少选择一个发布平台");
  });

  it("accepts valid metadata", () => {
    const metadata = {
      title: "通勤包推荐",
      description: "大容量通勤包",
      tags: ["通勤", "包包"],
      mode: "draft" as const,
    };

    const errors = validatePublishMetadata(metadata, ["douyin"]);

    expect(errors).toHaveLength(0);
  });

  it("rejects invalid publish mode", () => {
    const metadata = {
      title: "通勤包推荐",
      description: "大容量通勤包",
      tags: [] as string[],
      mode: "invalid" as "direct" | "draft",
    };

    const errors = validatePublishMetadata(metadata, ["douyin"]);

    expect(errors).toContain("发布方式无效");
  });
});
