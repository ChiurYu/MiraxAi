export interface SidecarConfig {
  id: string;
  ffmpegPath: string;
  pythonServiceUrl: string;
  cosyVoiceServiceUrl: string;
  heygemServiceUrl: string;
  hasPlaywrightBrowser: boolean;
  /** CosyVoice 运行模式：local 为本地服务，remote 为远端 API。 */
  cosyVoiceMode?: "local" | "remote";
  /** HeyGem 运行模式：local 为本地服务，remote 为远端 API。 */
  heygemMode?: "local" | "remote";
  /** Python 本地服务运行模式。 */
  pythonServiceMode?: "local" | "remote";
  /** Playwright 使用的浏览器名称，如 chromium、firefox、webkit。 */
  playwrightBrowserName?: string;
}

export function createDefaultSidecarConfig(id = "default"): SidecarConfig {
  return {
    id,
    ffmpegPath: "",
    pythonServiceUrl: "",
    cosyVoiceServiceUrl: "",
    heygemServiceUrl: "",
    hasPlaywrightBrowser: false,
  };
}

export function validateSidecarConfig(config: SidecarConfig): string[] {
  const errors: string[] = [];

  if (!config.id.trim()) {
    errors.push("配置 ID 不能为空");
  }

  return errors;
}
