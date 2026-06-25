import type { ApiKeyProvider } from "@mirax/core";

export type PromptTemplateCategory =
  | "rewrite"
  | "title"
  | "review"
  | "voice-clone"
  | "speech"
  | "avatar"
  | "general";

export interface PromptTemplateVariable {
  name: string;
  label: string;
  required: boolean;
  example?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptTemplateCategory;
  source: "system" | "custom";
  content: string;
  variables: PromptTemplateVariable[];
  rules: string[];
}

export const PROMPT_TEMPLATE_CATEGORIES: { value: PromptTemplateCategory; label: string }[] = [
  { value: "rewrite", label: "文案改写" },
  { value: "title", label: "标题与发布文案" },
  { value: "review", label: "内容复核" },
  { value: "voice-clone", label: "声音克隆" },
  { value: "speech", label: "语音合成" },
  { value: "avatar", label: "形象生成" },
  { value: "general", label: "通用" },
];

export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "system-rewrite-1",
    name: "短视频口播改写",
    category: "rewrite",
    source: "system",
    content:
      "你是一位擅长短视频口播文案的编辑。请根据以下原始文案，改写为适合数字人口播的脚本：\n\n原始内容：{{source}}\n目标时长：{{duration}}秒\n风格：{{style}}\n\n要求：\n1. 保留原始关键信息与卖点。\n2. 使用口语化、有节奏感的短句。\n3. 适当加入过渡词和情绪词。\n4. 输出一份可以直接朗读的口播稿。",
    variables: [
      { name: "source", label: "原始文案", required: true, example: "这款包容量很大..." },
      { name: "duration", label: "目标时长（秒）", required: true, example: "30" },
      { name: "style", label: "风格", required: false, example: "轻松自然" },
    ],
    rules: ["不使用绝对化用语", "符合平台社区规范"],
  },
  {
    id: "system-title-1",
    name: "爆款标题建议",
    category: "title",
    source: "system",
    content:
      "根据以下内容生成 5 个适合短视频平台的标题，要求：\n\n内容摘要：{{summary}}\n目标平台：{{platform}}\n\n要求：\n1. 前 10 个字抓住注意力。\n2. 突出一个具体场景或结果。\n3. 避免夸张和违规诱导。",
    variables: [
      { name: "summary", label: "内容摘要", required: true },
      { name: "platform", label: "目标平台", required: true, example: "抖音" },
    ],
    rules: ["标题长度控制在 15-25 字", "优先使用具体数字或场景"],
  },
  {
    id: "system-review-1",
    name: "发布前内容复核",
    category: "review",
    source: "system",
    content:
      "请复核以下短视频发布文案，输出风险点和优化建议：\n\n标题：{{title}}\n描述：{{description}}\n标签：{{tags}}\n\n检查项：\n1. 是否存在违规或敏感表述。\n2. 是否有事实夸大。\n3. 标题与内容是否一致。\n4. 标签是否相关。",
    variables: [
      { name: "title", label: "标题", required: true },
      { name: "description", label: "描述", required: true },
      { name: "tags", label: "标签", required: false, example: "通勤, 托特包" },
    ],
    rules: ["仅做提示，不替代人工最终确认"],
  },
];

export function createCustomPromptTemplate(input: {
  name: string;
  category: PromptTemplateCategory;
  content: string;
}): PromptTemplate {
  return {
    id: `custom-${crypto.randomUUID()}`,
    name: input.name,
    category: input.category,
    source: "custom",
    content: input.content,
    variables: [],
    rules: [],
  };
}

export function listTemplatesByCategory(
  templates: PromptTemplate[],
  category?: PromptTemplateCategory,
): PromptTemplate[] {
  if (!category || category === "general") {
    return templates;
  }
  return templates.filter((t) => t.category === category);
}
