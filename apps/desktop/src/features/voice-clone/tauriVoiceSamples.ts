import { invoke as tauriInvoke } from "@tauri-apps/api/core";

export type TauriVoiceSampleInvoke = (command: string, args: Record<string, unknown>) => Promise<unknown>;

export interface ManagedVoiceSampleImportInput {
  sourcePath: string;
  allowedRoot: string;
  relativePath: string;
}

export interface ManagedVoiceSampleFileInput {
  path: string;
  allowedRoot: string;
}

export interface ManagedVoiceSampleMetadata {
  relativePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export async function importManagedVoiceSample(
  input: ManagedVoiceSampleImportInput,
  invoke: TauriVoiceSampleInvoke = tauriInvoke,
): Promise<ManagedVoiceSampleMetadata> {
  return (await invoke("import_voice_sample", { ...input })) as ManagedVoiceSampleMetadata;
}

export async function readManagedVoiceSample(
  input: ManagedVoiceSampleFileInput,
  invoke: TauriVoiceSampleInvoke = tauriInvoke,
): Promise<Uint8Array> {
  const bytes = (await invoke("read_managed_voice_sample", { ...input })) as number[];
  return new Uint8Array(bytes);
}

export async function deleteManagedVoiceSample(
  input: ManagedVoiceSampleFileInput,
  invoke: TauriVoiceSampleInvoke = tauriInvoke,
): Promise<void> {
  await invoke("delete_managed_voice_sample", { ...input });
}
