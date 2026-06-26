export type DependencyKey = "ffmpeg" | "playwright" | "python" | "heygem" | "cosyvoice";

export type DependencyState = "missing" | "configured" | "ready" | "unavailable";

export interface DependencyCheckInput {
  ffmpegPath?: string;
  hasPlaywrightBrowser?: boolean;
  pythonServiceUrl?: string;
  heygemServiceUrl?: string;
  cosyVoiceServiceUrl?: string;
}

export interface DependencyProbeOptions {
  /** 真实实现中用于验证 FFmpeg 可执行文件是否存在且可运行。MVP 不调用真实文件系统。 */
  ffmpegExists?: (path: string) => boolean;
  /** 真实实现中用于验证 HTTP 服务健康端点是否可达。MVP 不发送真实网络请求。 */
  serviceHealthy?: (url: string) => boolean;
}

export interface DependencyCheckResult {
  key: DependencyKey;
  /** true 表示已配置或已就绪；false 表示未配置或当前不可用。 */
  ok: boolean;
  state: DependencyState;
  message: string;
}

const DEPENDENCY_LABELS: Record<DependencyKey, string> = {
  ffmpeg: "FFmpeg",
  playwright: "Playwright 浏览器",
  python: "Python 本地服务",
  heygem: "HeyGem 服务",
  cosyvoice: "CosyVoice 服务",
};

export function detectFfmpeg(
  path: string | undefined,
  probe?: (path: string) => boolean,
): DependencyCheckResult {
  const trimmed = path?.trim();

  if (!trimmed) {
    return {
      key: "ffmpeg",
      ok: false,
      state: "missing",
      message: "请先配置 FFmpeg 可执行文件路径",
    };
  }

  if (probe) {
    return probe(trimmed)
      ? {
          key: "ffmpeg",
          ok: true,
          state: "ready",
          message: "FFmpeg 路径已配置且可访问",
        }
      : {
          key: "ffmpeg",
          ok: false,
          state: "unavailable",
          message: "FFmpeg 路径已配置但无法访问或不可执行",
        };
  }

  return {
    key: "ffmpeg",
    ok: true,
    state: "configured",
    message: "FFmpeg 路径已配置，尚未执行真实检测",
  };
}

export function detectPlaywright(installed: boolean | undefined): DependencyCheckResult {
  if (!installed) {
    return {
      key: "playwright",
      ok: false,
      state: "missing",
      message: "请先安装 Playwright 浏览器用于自动发布",
    };
  }

  return {
    key: "playwright",
    ok: true,
    state: "ready",
    message: "Playwright 浏览器已安装",
  };
}

export function detectService(
  key: Exclude<DependencyKey, "ffmpeg" | "playwright">,
  url: string | undefined,
  probe?: (url: string) => boolean,
): DependencyCheckResult {
  const trimmed = url?.trim();
  const label = DEPENDENCY_LABELS[key];

  if (!trimmed) {
    return {
      key,
      ok: false,
      state: "missing",
      message: `请配置 ${label} 地址`,
    };
  }

  let validUrl = false;
  try {
    const parsed = new URL(trimmed);
    validUrl = parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    validUrl = false;
  }

  if (!validUrl) {
    return {
      key,
      ok: false,
      state: "unavailable",
      message: `${label} 地址格式不正确`,
    };
  }

  if (probe) {
    return probe(trimmed)
      ? {
          key,
          ok: true,
          state: "ready",
          message: `${label} 地址格式正确且探测可用`,
        }
      : {
          key,
          ok: false,
          state: "unavailable",
          message: `${label} 地址不可达或未启动`,
        };
  }

  return {
    key,
    ok: true,
    state: "configured",
    message: `${label} 地址格式正确，尚未探测真实可用性`,
  };
}

/**
 * 检测 sidecar 本地依赖状态。
 *
 * 安全边界：
 * - 本函数不启动任何真实服务，也不调用 FFmpeg、Python、HeyGem、CosyVoice 或 Playwright。
 * - 默认只做配置存在性与 URL 格式校验；真实可访问性需要调用方传入 `probe` 函数，且调用方负责安全边界。
 * - 返回的 message 中不包含用户传入的具体路径或 URL，避免 snapshot / 日志泄漏本地目录结构。
 */
export function checkSidecarDependencies(
  input: DependencyCheckInput,
  probes?: DependencyProbeOptions,
): DependencyCheckResult[] {
  return [
    detectFfmpeg(input.ffmpegPath, probes?.ffmpegExists),
    detectPlaywright(input.hasPlaywrightBrowser),
    detectService("python", input.pythonServiceUrl, probes?.serviceHealthy),
    detectService("heygem", input.heygemServiceUrl, probes?.serviceHealthy),
    detectService("cosyvoice", input.cosyVoiceServiceUrl, probes?.serviceHealthy),
  ];
}

/** 启动某个 sidecar 依赖。MVP 阶段抛出诚实“尚未接入”错误，不执行真实启动。 */
export async function startSidecarDependency(key: DependencyKey): Promise<void> {
  throw new Error(`${DEPENDENCY_LABELS[key]} 启动尚未接入，请在本地手动准备该依赖。`);
}

/** 停止某个 sidecar 依赖。MVP 阶段抛出诚实“尚未接入”错误，不执行真实停止。 */
export async function stopSidecarDependency(key: DependencyKey): Promise<void> {
  throw new Error(`${DEPENDENCY_LABELS[key]} 停止尚未接入。`);
}
