import { describe, expect, it, vi } from "vitest";
import {
  deleteManagedVoiceSample,
  importManagedVoiceSample,
  readManagedVoiceSample,
  type TauriVoiceSampleInvoke,
} from "./tauriVoiceSamples.js";

describe("tauriVoiceSamples", () => {
  it("imports through the constrained native command", async () => {
    const invoke = vi.fn<TauriVoiceSampleInvoke>().mockResolvedValue({
      relativePath: "sample-1/voice.wav",
      fileName: "voice.wav",
      mimeType: "audio/wav",
      sizeBytes: 12,
    });

    await expect(
      importManagedVoiceSample(
        { sourcePath: "/source/voice.wav", allowedRoot: "/managed", relativePath: "sample-1/voice.wav" },
        invoke,
      ),
    ).resolves.toMatchObject({ relativePath: "sample-1/voice.wav", sizeBytes: 12 });
    expect(invoke).toHaveBeenCalledWith("import_voice_sample", {
      sourcePath: "/source/voice.wav",
      allowedRoot: "/managed",
      relativePath: "sample-1/voice.wav",
    });
  });

  it("reads managed bytes through the managed-file command", async () => {
    const invoke = vi.fn<TauriVoiceSampleInvoke>().mockResolvedValue([1, 2, 3]);

    await expect(readManagedVoiceSample({ path: "/managed/sample-1/voice.wav", allowedRoot: "/managed" }, invoke)).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(invoke).toHaveBeenCalledWith("read_managed_voice_sample", {
      path: "/managed/sample-1/voice.wav",
      allowedRoot: "/managed",
    });
  });

  it("deletes only through the constrained native command", async () => {
    const invoke = vi.fn<TauriVoiceSampleInvoke>().mockResolvedValue(undefined);

    await deleteManagedVoiceSample({ path: "/managed/sample-1/voice.wav", allowedRoot: "/managed" }, invoke);
    expect(invoke).toHaveBeenCalledWith("delete_managed_voice_sample", {
      path: "/managed/sample-1/voice.wav",
      allowedRoot: "/managed",
    });
  });
});
