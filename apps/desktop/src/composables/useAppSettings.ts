import { reactive, ref, watch } from "vue";
import {
  createApiKeyProviderConfig,
  createDefaultAppSettings,
  sanitizeBaseUrlForStorage,
  sanitizeProviderConfigForStorage,
  type ApiKeyProviderConfig,
  type AppSettings,
} from "@mirax/core";
import { createDefaultSidecarConfig, type SidecarConfig } from "@mirax/sidecar-manager";
import {
  createAppSettingsRepository,
  createProviderConfigRepository,
  createProviderSecretsRepository,
  createSidecarConfigRepository,
  type LocalStoreDb,
} from "@mirax/local-store";
import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { SettingsSection } from "../app/navigation.js";

let sharedDb: LocalStoreDb | undefined;
let initialSnapshot: Partial<AppSettingsSnapshot> | undefined;

export function setLocalStoreDb(db: LocalStoreDb): void {
  sharedDb = db;
}

export function getLocalStoreDb(): LocalStoreDb | undefined {
  return sharedDb;
}

export function setInitialAppSettingsSnapshot(snapshot: Partial<AppSettingsSnapshot>): void {
  initialSnapshot = snapshot;
}

export const APP_SETTINGS_STORAGE_KEY = "mirax-ai.app-settings.v1";

export const SETTINGS_SECTIONS: SettingsSection[] = [
  "general",
  "ai-services",
  "local-dependencies",
  "output-storage",
  "prompt-templates",
  "data",
  "updates-support",
];

export interface AppSettingsSnapshot {
  appSettings?: Partial<AppSettings>;
  sidecarConfig?: Partial<SidecarConfig>;
  providerConfigs?: Array<Omit<ApiKeyProviderConfig, "apiKey">>;
  section?: SettingsSection;
}

export interface UseAppSettingsOptions {
  storage?: Storage;
  persistSection?: boolean;
  db?: LocalStoreDb;
}

/**
 * 从 provider 配置数组中选出当前可用于 rewrite 真实 LLM 的配置。
 *
 * 规则：
 * - 必须 `enabled === true`；
 * - `provider` 必须是 `"openai"` 或 `"custom"`；
 * - 返回第一个匹配项，若没有则返回 `undefined`。
 *
 * 注意：本函数只负责选择，不校验 `apiKey` / `model` / `baseUrl` 是否合法；
 * 后续构造真实 provider 前仍需校验，并在缺省时返回 `not-configured`。
 */
export function findEnabledRewriteProviderConfig(
  configs: ApiKeyProviderConfig[],
): ApiKeyProviderConfig | undefined {
  return configs.find((c) => c.enabled && (c.provider === "openai" || c.provider === "custom"));
}

/**
 * 根据显式选中的 active id 返回对应 rewrite provider 配置。
 *
 * 规则：
 * - `activeId` 必须存在且命中某一配置；
 * - 该配置必须 `enabled === true`；
 * - `provider` 必须是 `"openai"` 或 `"custom"`；
 * - `getProviderReadiness(config)` 必须返回 `"ready"`；
 * - 任一条件不满足即返回 `undefined`，不降级到其他 provider。
 */
export function findActiveRewriteProviderConfig(
  configs: ApiKeyProviderConfig[],
  activeId: string | undefined,
): ApiKeyProviderConfig | undefined {
  if (!activeId) return undefined;
  const config = configs.find((c) => c.id === activeId);
  if (!config) return undefined;
  if (!config.enabled) return undefined;
  if (config.provider !== "openai" && config.provider !== "custom") return undefined;
  if (getProviderReadiness(config) !== "ready") return undefined;
  return config;
}

/**
 * 从 provider 配置数组中选出当前可用于 transcribe 真实转写的配置。
 */
export function findEnabledTranscribeProviderConfig(
  configs: ApiKeyProviderConfig[],
): ApiKeyProviderConfig | undefined {
  return configs.find((c) => c.enabled && c.provider === "whisper");
}

/**
 * 从 provider 配置数组中选出当前可用于 speech 真实 TTS 的配置。
 */
export function findEnabledSpeechProviderConfig(
  configs: ApiKeyProviderConfig[],
): ApiKeyProviderConfig | undefined {
  return configs.find((c) => c.enabled && c.provider === "cosyvoice");
}

/**
 * 从 provider 配置数组中选出当前可用于 voice-clone 真实声音克隆的配置。
 */
export function findEnabledVoiceCloneProviderConfig(
  configs: ApiKeyProviderConfig[],
): ApiKeyProviderConfig | undefined {
  return findEnabledSpeechProviderConfig(configs);
}

/**
 * 从 provider 配置数组中选出当前可用于 avatar 真实数字人的配置。
 */
export function findEnabledAvatarProviderConfig(
  configs: ApiKeyProviderConfig[],
): ApiKeyProviderConfig | undefined {
  return configs.find((c) => c.enabled && c.provider === "heygem");
}

function createState() {
  return {
    appSettings: reactive<AppSettings>(createDefaultAppSettings()),
    sidecarConfig: reactive<SidecarConfig>(createDefaultSidecarConfig()),
    providerConfigs: ref<ApiKeyProviderConfig[]>([]),
    settingsSection: ref<SettingsSection>("general"),
    saveStatus: ref("未保存"),
    verifiedFfmpegPath: ref(""),
    // 当前 session 内测试连接成功的 provider id 集合；不进入持久化 snapshot。
    verifiedProviderIds: ref<Set<string>>(new Set()),
    // 当前 session 内测试连接失败的 provider id 集合；不进入持久化 snapshot。
    failedProviderIds: ref<Set<string>>(new Set()),
    loaded: false,
  };
}

export type ProbeFfmpegInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;

export async function probeFfmpegPath(ffmpegPath: string, invoke?: ProbeFfmpegInvoke): Promise<boolean> {
  const trimmed = ffmpegPath.trim();
  if (!trimmed) {
    return false;
  }

  const doInvoke = invoke ?? tauriInvoke;
  try {
    const payload = await doInvoke("probe_ffmpeg", { ffmpegPath: trimmed });
    if (payload === true) {
      return true;
    }
    if (payload && typeof payload === "object" && "ok" in payload) {
      return Boolean((payload as { ok?: boolean }).ok);
    }
    return false;
  } catch {
    return false;
  }
}

export type ProviderReadiness = "disabled" | "needs-config" | "ready";

/**
 * 判断单个 provider 配置是否已可执行。
 *
 * 规则与 Workbench real 路由保持一致：
 * - openai / custom rewrite：enabled + 非空 apiKey + 非空 model；custom 还需非空 baseUrl。
 * - whisper：enabled + 非空 baseUrl + 非空 model。
 * - cosyvoice / heygem：enabled + 非空 baseUrl；apiKey 可选。
 */
export function getProviderReadiness(config: ApiKeyProviderConfig): ProviderReadiness {
  if (!config.enabled) {
    return "disabled";
  }

  const trimmedApiKey = config.apiKey?.trim() ?? "";
  const trimmedBaseUrl = config.baseUrl?.trim() ?? "";
  const trimmedModel = config.model?.trim() ?? "";

  switch (config.provider) {
    case "openai": {
      if (!trimmedApiKey || !trimmedModel) {
        return "needs-config";
      }
      return "ready";
    }
    case "custom": {
      if (!trimmedApiKey || !trimmedModel || !trimmedBaseUrl) {
        return "needs-config";
      }
      return "ready";
    }
    case "whisper": {
      if (!trimmedBaseUrl || !trimmedModel) {
        return "needs-config";
      }
      return "ready";
    }
    case "cosyvoice":
    case "heygem": {
      if (!trimmedBaseUrl) {
        return "needs-config";
      }
      return "ready";
    }
    default: {
      return "needs-config";
    }
  }
}

const sharedState = createState();

export function useAppSettings(options: UseAppSettingsOptions = {}) {
  const storage = options.storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
  const persistSection = options.persistSection ?? false;
  const db = options.db ?? sharedDb;
  const state = options.storage ? createState() : sharedState;

  const { appSettings, sidecarConfig, providerConfigs, settingsSection, saveStatus, verifiedFfmpegPath, verifiedProviderIds, failedProviderIds } = state;

  if (!state.loaded) {
    load();
    state.loaded = true;
  }

  function resolveSectionForSnapshot(): SettingsSection {
    if (persistSection) {
      return settingsSection.value;
    }

    // Non-owner instances should not overwrite the active section stored by the owner.
    if (!storage) {
      return settingsSection.value;
    }

    try {
      const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettingsSnapshot>;
        if (parsed.section && SETTINGS_SECTIONS.includes(parsed.section)) {
          return parsed.section;
        }
      }
    } catch {
      // fall through to current value
    }

    return settingsSection.value;
  }

  function createSnapshot(): AppSettingsSnapshot {
    return {
      appSettings: { ...appSettings },
      sidecarConfig: { ...sidecarConfig },
      providerConfigs: providerConfigs.value.map((config) => sanitizeProviderConfigForStorage(config)),
      section: resolveSectionForSnapshot(),
    };
  }

  function restore(snapshot: Partial<AppSettingsSnapshot>) {
    if (snapshot.appSettings) {
      Object.assign(appSettings, {
        ...createDefaultAppSettings(),
        ...snapshot.appSettings,
        outputPaths: {
          ...createDefaultAppSettings().outputPaths,
          ...(snapshot.appSettings.outputPaths ?? {}),
        },
      });
    }

    if (snapshot.sidecarConfig) {
      Object.assign(sidecarConfig, {
        ...createDefaultSidecarConfig(),
        ...snapshot.sidecarConfig,
      });
    }

    if (Array.isArray(snapshot.providerConfigs)) {
      verifiedProviderIds.value = new Set();
      failedProviderIds.value = new Set();
      providerConfigs.value = snapshot.providerConfigs.map((config) =>
        createApiKeyProviderConfig({
          id: config.id ?? crypto.randomUUID(),
          label: config.label ?? "未命名配置",
          provider: config.provider ?? "openai",
          apiKey: (config as Partial<ApiKeyProviderConfig>).apiKey ?? "",
          baseUrl: sanitizeBaseUrlForStorage(config.baseUrl),
          model: config.model,
          enabled: config.enabled ?? true,
        }),
      );
    }

    if (snapshot.section && SETTINGS_SECTIONS.includes(snapshot.section)) {
      settingsSection.value = snapshot.section;
    }
  }

  function load() {
    if (initialSnapshot) {
      restore(initialSnapshot);
      initialSnapshot = undefined;
      saveStatus.value = "已恢复设置";
      return;
    }

    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      const raw = storage.getItem(APP_SETTINGS_STORAGE_KEY);
      if (raw) {
        restore(JSON.parse(raw) as Partial<AppSettingsSnapshot>);
      }
      saveStatus.value = "已恢复设置";
    } catch {
      saveStatus.value = "设置读取失败";
    }
  }

  async function persistToDb() {
    if (!db) return;

    try {
      const appSettingsRepo = createAppSettingsRepository(db);
      const sidecarConfigRepo = createSidecarConfigRepository(db);
      const providerConfigRepo = createProviderConfigRepository(db);
      const providerSecretsRepo = createProviderSecretsRepository(db);
      const now = new Date().toISOString();

      await appSettingsRepo.save({
        id: "default",
        theme: appSettings.theme,
        outputPathsJson: JSON.stringify(appSettings.outputPaths),
        rewriteProviderConfigId: appSettings.rewriteProviderConfigId,
        createdAt: now,
        updatedAt: now,
      });

      await sidecarConfigRepo.save({
        id: "default",
        ffmpegPath: sidecarConfig.ffmpegPath,
        pythonServiceUrl: sidecarConfig.pythonServiceUrl,
        cosyVoiceServiceUrl: sidecarConfig.cosyVoiceServiceUrl,
        heygemServiceUrl: sidecarConfig.heygemServiceUrl,
        hasPlaywrightBrowser: sidecarConfig.hasPlaywrightBrowser,
        createdAt: now,
        updatedAt: now,
      });

      for (const config of providerConfigs.value) {
        const credentialRef = config.id;
        await providerConfigRepo.save({
          id: config.id,
          provider: config.provider,
          label: config.label,
          baseUrl: sanitizeBaseUrlForStorage(config.baseUrl),
          model: config.model,
          enabled: config.enabled,
          credentialRef,
          createdAt: now,
          updatedAt: now,
        });

        const trimmedApiKey = config.apiKey?.trim() ?? "";
        if (trimmedApiKey) {
          await providerSecretsRepo.save({
            credentialRef,
            apiKey: trimmedApiKey,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      saveStatus.value = "设置已保存";
    } catch {
      saveStatus.value = "设置保存失败";
    }
  }

  function persist() {
    if (db) {
      void persistToDb();
      return;
    }

    if (!storage) {
      saveStatus.value = "无可用存储";
      return;
    }

    try {
      storage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(createSnapshot()));
      saveStatus.value = "设置已保存";
    } catch {
      saveStatus.value = "设置保存失败";
    }
  }

  function addProviderConfig(config: ApiKeyProviderConfig) {
    providerConfigs.value.push(config);
  }

  function updateProviderConfig(config: ApiKeyProviderConfig) {
    const index = providerConfigs.value.findIndex((item) => item.id === config.id);
    if (index >= 0) {
      providerConfigs.value[index] = config;
      // 配置被修改后需要重新检测，清除当前 session 的连接状态。
      clearProviderVerified(config.id);
      clearProviderFailed(config.id);
    }
  }

  function removeProviderConfig(id: string) {
    providerConfigs.value = providerConfigs.value.filter((config) => config.id !== id);
    clearProviderVerified(id);
    clearProviderFailed(id);

    if (appSettings.rewriteProviderConfigId === id) {
      appSettings.rewriteProviderConfigId = undefined;
    }

    if (db) {
      const providerRepo = createProviderConfigRepository(db);
      const secretsRepo = createProviderSecretsRepository(db);
      void Promise.all([providerRepo.deleteById(id), secretsRepo.deleteByCredentialRef(id)]).catch(() => {
        // ignore cleanup errors
      });
    }
  }

  function markProviderVerified(id: string) {
    verifiedProviderIds.value = new Set([...verifiedProviderIds.value, id]);
  }

  function clearProviderVerified(id: string) {
    const next = new Set(verifiedProviderIds.value);
    next.delete(id);
    verifiedProviderIds.value = next;
  }

  function isProviderVerified(id: string): boolean {
    return verifiedProviderIds.value.has(id);
  }

  function markProviderFailed(id: string) {
    failedProviderIds.value = new Set([...failedProviderIds.value, id]);
  }

  function clearProviderFailed(id: string) {
    const next = new Set(failedProviderIds.value);
    next.delete(id);
    failedProviderIds.value = next;
  }

  function isProviderFailed(id: string): boolean {
    return failedProviderIds.value.has(id);
  }

  function setSettingsSection(section: SettingsSection) {
    settingsSection.value = section;
  }

  function setRewriteProviderConfigId(id: string | undefined) {
    appSettings.rewriteProviderConfigId = id;
  }

  watch(
    () => sidecarConfig.ffmpegPath,
    () => {
      verifiedFfmpegPath.value = "";
    },
  );

  watch(
    [() => ({ ...appSettings }), () => ({ ...sidecarConfig }), providerConfigs, settingsSection],
    persist,
    { deep: true },
  );

  return {
    appSettings,
    sidecarConfig,
    providerConfigs,
    settingsSection,
    saveStatus,
    verifiedFfmpegPath,
    verifiedProviderIds,
    failedProviderIds,
    load,
    persist,
    restore,
    addProviderConfig,
    updateProviderConfig,
    removeProviderConfig,
    setSettingsSection,
    setRewriteProviderConfigId,
    markProviderVerified,
    clearProviderVerified,
    isProviderVerified,
    markProviderFailed,
    clearProviderFailed,
    isProviderFailed,
  };
}
