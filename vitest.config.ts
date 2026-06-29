import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@mirax/core": fileURLToPath(new URL("packages/core/src/index.ts", import.meta.url)),
      "@mirax/provider-ai": fileURLToPath(new URL("packages/provider-ai/src/index.ts", import.meta.url)),
      "@mirax/media-pipeline": fileURLToPath(new URL("packages/media-pipeline/src/index.ts", import.meta.url)),
      "@mirax/provider-publish": fileURLToPath(new URL("packages/provider-publish/src/index.ts", import.meta.url)),
      "@mirax/local-store": fileURLToPath(new URL("packages/local-store/src/index.ts", import.meta.url)),
      "@mirax/sidecar-manager": fileURLToPath(new URL("packages/sidecar-manager/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts"],
    environment: "node"
  }
});
