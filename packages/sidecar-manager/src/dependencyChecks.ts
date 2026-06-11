export interface DependencyCheckInput {
  ffmpegPath?: string;
  hasPlaywrightBrowser?: boolean;
  pythonServiceUrl?: string;
  heygemServiceUrl?: string;
  cosyVoiceServiceUrl?: string;
}

export interface DependencyCheckResult {
  key: "ffmpeg" | "playwright" | "python" | "heygem" | "cosyvoice";
  ok: boolean;
  message: string;
}

export function checkSidecarDependencies(input: DependencyCheckInput): DependencyCheckResult[] {
  return [
    {
      key: "ffmpeg",
      ok: Boolean(input.ffmpegPath?.trim()),
      message: input.ffmpegPath?.trim() ? "FFmpeg 路径已配置" : "请先配置 FFmpeg 可执行文件路径",
    },
    {
      key: "playwright",
      ok: input.hasPlaywrightBrowser === true,
      message: input.hasPlaywrightBrowser ? "Playwright 浏览器可用" : "请先安装 Playwright 浏览器用于自动发布",
    },
    createUrlCheck("python", input.pythonServiceUrl, "请配置 Python 本地服务地址"),
    createUrlCheck("heygem", input.heygemServiceUrl, "请配置 HeyGem 服务地址"),
    createUrlCheck("cosyvoice", input.cosyVoiceServiceUrl, "请配置 CosyVoice 服务地址"),
  ];
}

function createUrlCheck(
  key: DependencyCheckResult["key"],
  value: string | undefined,
  missingMessage: string,
): DependencyCheckResult {
  if (!value?.trim()) {
    return { key, ok: false, message: missingMessage };
  }

  try {
    const url = new URL(value);
    const ok = url.protocol === "http:" || url.protocol === "https:";
    return { key, ok, message: ok ? "服务地址格式正确" : "服务地址必须以 http:// 或 https:// 开头" };
  } catch {
    return { key, ok: false, message: "服务地址格式不正确" };
  }
}
