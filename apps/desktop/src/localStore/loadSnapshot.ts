import { createApiKeyProviderConfig, sanitizeBaseUrlForStorage, type ApiKeyProviderConfig, type AppSettings } from "@mirax/core";
import {
  createAppSettingsRepository,
  createProviderConfigRepository,
  createProviderSecretsRepository,
  createSidecarConfigRepository,
  type LocalStoreDb,
  type ProviderConfigRecord,
  type ProviderSecretsRecord,
} from "@mirax/local-store";
import type { AppSettingsSnapshot } from "../composables/useAppSettings.js";

function recordToProviderConfig(
  record: ProviderConfigRecord,
  secret?: ProviderSecretsRecord,
): ApiKeyProviderConfig {
  return createApiKeyProviderConfig({
    id: record.id,
    label: record.label,
    provider: record.provider as ApiKeyProviderConfig["provider"],
    apiKey: secret?.apiKey ?? "",
    baseUrl: sanitizeBaseUrlForStorage(record.baseUrl),
    model: record.model,
    enabled: record.enabled,
  });
}

export async function loadAppSettingsSnapshotFromDb(
  db: LocalStoreDb,
): Promise<Partial<AppSettingsSnapshot>> {
  const appSettingsRepo = createAppSettingsRepository(db);
  const sidecarConfigRepo = createSidecarConfigRepository(db);
  const providerConfigRepo = createProviderConfigRepository(db);
  const providerSecretsRepo = createProviderSecretsRepository(db);

  const appSettingsRecord = await appSettingsRepo.getById("default");
  const sidecarConfigRecord = await sidecarConfigRepo.getById("default");
  const providerConfigRecords = await providerConfigRepo.list();

  const snapshot: Partial<AppSettingsSnapshot> = {};

  if (appSettingsRecord) {
    try {
      snapshot.appSettings = {
        id: appSettingsRecord.id,
        theme: appSettingsRecord.theme as AppSettings["theme"],
        outputPaths: JSON.parse(appSettingsRecord.outputPathsJson) as AppSettings["outputPaths"],
      };
    } catch {
      // ignore corrupted output paths
    }
  }

  if (sidecarConfigRecord) {
    snapshot.sidecarConfig = {
      id: sidecarConfigRecord.id,
      ffmpegPath: sidecarConfigRecord.ffmpegPath,
      pythonServiceUrl: sidecarConfigRecord.pythonServiceUrl,
      cosyVoiceServiceUrl: sidecarConfigRecord.cosyVoiceServiceUrl,
      heygemServiceUrl: sidecarConfigRecord.heygemServiceUrl,
      hasPlaywrightBrowser: sidecarConfigRecord.hasPlaywrightBrowser,
    };
  }

  if (providerConfigRecords.length > 0) {
    const configs: ApiKeyProviderConfig[] = [];
    for (const record of providerConfigRecords) {
      const credentialRef = record.credentialRef ?? record.id;
      const secret = await providerSecretsRepo.getByCredentialRef(credentialRef);
      configs.push(recordToProviderConfig(record, secret));
    }
    snapshot.providerConfigs = configs as Array<Omit<ApiKeyProviderConfig, "apiKey">>;
  }

  return snapshot;
}
